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

var dispatcher = require('../../../utils/dispatcher')
var Consts = require("../../../consts/consts")

var AllianceDao = require("../../../dao/allianceDao")
var PlayerDao = require("../../../dao/playerDao")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.env = app.get("env")
	this.serverId = this.app.getServerId()
	this.redis = app.get("redis")
	this.scripto = app.get("scripto")
	this.allianceDao = Promise.promisifyAll(new AllianceDao(this.redis, this.scripto, this.env))
	this.playerDao = Promise.promisifyAll(new PlayerDao(this.redis, this.scripto, this.env))
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

	var playerDoc = null
	this.playerDao.findByIndexAsync("countInfo.deviceId", deviceId).then(function(doc){
		if(!_.isObject(doc)){
			return self.playerService.createPlayerAsync(deviceId).then(function(doc){
				playerDoc = doc
				return Promise.resolve()
			}).catch(function(e){
				return Promise.reject(e)
			})
		}else if(!_.isEmpty(doc.logicServerId)){
			playerDoc = doc
			return self.playerDao.removeLockByIdAsync(doc._id).then(function(){
				return kickPlayerFromLogicServer(playerDoc)
			}).then(function(doc){
				playerDoc = doc
				return Promise.resolve()
			}).catch(function(e){
				return Promise.reject(e)
			})
		}else{
			playerDoc = doc
			return Promise.resolve(doc)
		}
	}).then(function(){
		return bindPlayerSession(session, playerDoc)
	}).then(function(){
		return addPlayerToChatChannel(session)
	}).then(function(){
		var funcs = []
		funcs.push(self.globalChannelService.addAsync(Consts.LogicChannelName, session.uid, self.serverId))
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			funcs.push(self.globalChannelService.addAsync(Consts.AllianceChannelPrefix + playerDoc.alliance.id, playerDoc._id, self.serverId))
		}
		return Promise.all(funcs)
	}).then(function(){
		playerDoc.logicServerId = self.serverId
		var eventServers = self.app.getServersByType('event')
		var eventServer = dispatcher.dispatch(eventServers)
		playerDoc.eventServerId = eventServer.id
		return  self.playerService.playerLoginAsync(playerDoc)
	}).then(function(){
		return self.playerDao.updateAsync(playerDoc)
	}).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

var BindPlayerSession = function(session, playerDoc, callback){
	session.bind(playerDoc._id)
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
	var tryTimes = 2
	var func = function(){
		var removePlayerFromChatChannel = Promisify(RemovePlayerFromChatChannel, self)
		var playerDoc = null
		self.playerDao.findByIdAsync(session.uid).then(function(doc){
			if(!_.isObject(doc)){
				return Promise.reject(new Error("玩家不存在"))
			}
			playerDoc = doc
			return self.playerService.playerLogoutAsync(playerDoc)
		}).then(function(){
			var funcs = []
			funcs.push(removePlayerFromChatChannel(session))
			funcs.push(self.globalChannelService.leaveAsync(Consts.LogicChannelName, playerDoc._id, self.serverId))
			if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
				funcs.push(self.globalChannelService.leaveAsync(Consts.AllianceChannelPrefix + playerDoc.alliance.id, playerDoc._id, self.serverId))
			}
			return Promise.all(funcs)
		}).then(function(){
			playerDoc.logicServerId = null
			playerDoc.eventServerId = null
			return self.playerDao.updateAsync(playerDoc)
		}).catch(function(e){
			errorLogger.error("handle entryHandler:playerLogout Error -----------------------------")
			errorLogger.error(e.stack)
			if(_.isEqual("production", self.app.get("env"))){
				errorMailLogger.error("handle entryHandler:playerLogout Error -----------------------------")
				errorMailLogger.error(e.stack)
			}
			tryTimes --
			if(tryTimes >= 0){
				setTimeout(func.bind(self), 2000)
			}else{
				errorLogger.error("entryHandler:trying to save player data failed -----------------------------")
				if(_.isEqual("production", self.app.get("env"))){
					errorMailLogger.error("entryHandler:trying to save player data failed -----------------------------")
				}
			}
		})
	}

	func()
}


var AddPlayerToChatChannel = function(session, callback){
	this.app.rpc.chat.chatRemote.add(session, session.uid, this.serverId, callback)
}

var RemovePlayerFromChatChannel = function(session, callback){
	this.app.rpc.chat.chatRemote.leave(session, session.uid, this.serverId, callback)
}

var KickPlayerFromLogicServer = function(playerDoc, callback){
	var self = this
	this.app.rpc.logic.logicRemote.kickPlayer.toServer(playerDoc.logicServerId, playerDoc._id, function(err){
		if(_.isObject(err)){
			callback(err)
			return
		}
		setTimeout(function(){
			self.playerDao.findByIdAsync(playerDoc._id).then(function(doc){
				if(!_.isObject(doc)){
					callback(new Error("将玩家踢出服务器失败,玩家不存在"))
					return
				}
				if(!_.isEmpty(doc.logicServerId)){
					callback(new Error("将玩家踢出服务器失败,玩家logicServerId不为空"))
					return
				}
				callback(null, doc)
			}).catch(function(e){
				callback(e)
			})
		}, 2000)
	})
}