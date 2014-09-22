"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var crypto = require('crypto')

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.serverId = this.app.getServerId()
	this.playerService = app.get("playerService")
	this.globalChannelService = Promise.promisifyAll(this.app.get("globalChannelService"))
	this.sessionService = this.app.get("sessionService")
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

	var bindPlayerSession = Promisify(BindPlayerSession, this)
	var addPlayerToChatChannel = Promisify(AddPlayerToChatChannel, this)
	var kickPlayerFromLogicServer = Promisify(KickPlayerFromLogicServer, this)

	this.playerService.getPlayerByIndexAsync("countInfo.deviceId", deviceId).then(function(doc){
		if(!_.isObject(doc)){
			return self.playerService.createPlayerAsync(deviceId)
		}else if(!_.isEmpty(doc.logicServerId)){
			return kickPlayerFromLogicServer(doc)
		}else{
			return Promise.resolve(doc)
		}
	}).then(function(doc){
		return bindPlayerSession(session, doc)
	}).then(function(){
		return addPlayerToChatChannel(session)
	}).then(function(){
		return self.globalChannelService.addAsync(Consts.LogicChannelName, session.uid, self.serverId)
	}).then(function(){
		return self.playerService.playerLoginAsync(session.uid, self.serverId)
	}).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

var BindPlayerSession = function(session, doc, callback){
	session.bind(doc._id)
	session.set("logicServerId", this.serverId)
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
	var removePlayerFromChatChannel = Promisify(RemovePlayerFromChatChannel, this)

	this.playerService.playerLogoutAsync(session.uid, this.serverId).then(function(){
		return removePlayerFromChatChannel(session)
	}).then(function(){
		return self.globalChannelService.leaveAsync(Consts.LogicChannelName, session.uid, self.serverId)
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
	this.app.rpc.chat.chatRemote.add(session, session.uid, this.serverId, callback)
}

var RemovePlayerFromChatChannel = function(session, callback){
	this.app.rpc.chat.chatRemote.leave(session, session.uid, this.serverId, callback)
}

var KickPlayerFromLogicServer = function(playerDoc, callback){
	this.app.rpc.logic.logicRemote.kickPlayer.toServer(playerDoc.logicServerId, playerDoc._id, function(err){
		callback(err, playerDoc)
	})
}