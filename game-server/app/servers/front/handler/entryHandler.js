"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var utils = require("../../../utils/utils")
var crypto = require('crypto')

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var PlayerDao = require("../../../dao/playerDao")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.playerDao = Promise.promisifyAll(new PlayerDao())
	this.serverId = this.app.getServerId()
}

var pro = Handler.prototype

/**
 * 玩家登陆
 * @param msg
 * @param session
 * @param next
 */
pro.login = function(msg, session, next){
	var self = this
	var deviceId = msg.deviceId
	if(!_.isString(deviceId)){
		next(new Error("deviceId 不能为空"))
		return
	}

	var createPlayer = Promisify(CreatePlayer, this)
	var bindPlayerSession = Promisify(BindPlayerSession, this)
	var addPlayerToChatChannel = Promisify(AddPlayerToChatChannel, this)
	var loginToLogicServer = Promisify(LoginToLogicServer, this)

	this.playerDao.findAsync({"countInfo.deviceId":deviceId}).then(function(doc){
		if(!_.isObject(doc)){
			var server = self.app.getServersByType("logic")[0]
			return createPlayer(deviceId, server.id)
		}else{
			return Promise.resolve(doc)
		}
	}).then(function(doc){
		return bindPlayerSession(session, doc)
	}).then(function(){
		return addPlayerToChatChannel(session)
	}).then(function(){
		return loginToLogicServer(session)
	}).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

var BindPlayerSession = function(session, doc, callback){
	session.bind(doc._id)
	session.set("frontServerId", this.serverId)
	session.set("logicServerId", doc.countInfo.logicServerId)
	session.on("closed", PlayerLeave.bind(this))
	session.pushAll(function(err){
		process.nextTick(function(){
			callback(err)
		})
	})
}

var PlayerLeave = function(session, reason){
	console.log("user [" + session.uid + "] logout with reason [" + reason + "]")

	var self = this
	var logoutFromLogicServer = Promisify(LogoutFromLogicServer, this)
	var removePlayerFromChatChannel = Promisify(RemovePlayerFromChatChannel, this)

	logoutFromLogicServer(session).then(function(){
		return removePlayerFromChatChannel(session)
	}).catch(function(e){
		errorLogger.error("handle playerLogout Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle playerLogout Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}


var AddPlayerToChatChannel = function(session, callback){
	var frontServerId = session.get("frontServerId")
	var logicServerId = session.get("logicServerId")
	this.app.rpc.chat.chatRemote.add(session, session.uid, frontServerId, logicServerId, callback)
}
var RemovePlayerFromChatChannel = function(session, callback){
	var frontServerId = session.get("frontServerId")
	var logicServerId = session.get("logicServerId")
	this.app.rpc.chat.chatRemote.leave(session, session.uid, frontServerId, logicServerId, callback)
}

var LoginToLogicServer = function(session, callback){
	this.app.rpc.logic.logicRemote.login(session, session.uid, session.get("frontServerId"), callback)
}

var LogoutFromLogicServer = function(session, callback){
	this.app.rpc.logic.logicRemote.logout(session, session.uid, session.get("frontServerId"), callback)
}

var CreatePlayer = function(deviceId, logicServerId, callback){
	var self = this
	Promisify(crypto.randomBytes)(4).then(function(buf){
		var token = buf.toString("hex")
		var doc = {
			countInfo:{
				logicServerId:logicServerId,
				deviceId:deviceId
			},
			basicInfo:{
				name:"player_" + token,
				cityName:"city_" + token
			}
		}

		return self.playerDao.addAsync(doc)
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}