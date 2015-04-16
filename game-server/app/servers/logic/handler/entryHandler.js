"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var crypto = require('crypto')
var ErrorUtils = require("../../../utils/errorUtils")
var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.env = app.get("env")
	this.logService = app.get("logService")
	this.sessionService = app.get("sessionService")
	this.dataService = app.get("dataService")
	this.logicServerId = app.get("logicServerId")
	this.chatServerId = app.get("chatServerId")
	this.eventServerId = app.get("eventServerId")
	this.logicServers = _.find(app.getServersByType("logic"), function(server){
		return _.isEqual(server.usedFor, app.get("cacheServerId"))
	})
	this.playerApiService = app.get("playerApiService")
	this.maxReturnMailSize = 10
	this.maxReturnReportSize = 10
}
var pro = Handler.prototype

var BindPlayerSession = function(session, deviceId, playerDoc, callback){
	session.bind(playerDoc._id)
	session.set("serverId", playerDoc.serverId)
	session.set("deviceId", deviceId)
	session.set("logicServerId", playerDoc.logicServerId)
	session.set("chatServerId", this.chatServerId)
	session.set("name", playerDoc.basicInfo.name)
	session.set("icon", playerDoc.basicInfo.icon)
	session.set("vipExp", playerDoc.basicInfo.vipExp)
	session.on("closed", PlayerLeave.bind(this))
	session.pushAll(function(err){
		process.nextTick(function(){
			callback(err)
		})
	})
}

var PlayerLeave = function(session, reason){
	this.logService.onEvent("logic.entryHandler.playerLeave", {playerId:session.uid, reason:reason})
	var self = this
	var removePlayerFromChatChannelAsync = Promisify(RemovePlayerFromChatChannel, this)
	var removePlayerFromEventAllianceChannelAsync = Promisify(RemovePlayerFromEventAllianceChannel, this)
	var removePlayerFromLogicAllianceChannelAsync = Promisify(RemovePlayerFromLogicAllianceChannel, this)
	var playerDoc = null
	this.playerApiService.playerLogoutAsync(session.uid).then(function(doc){
		playerDoc = doc
		var funcs = []
		funcs.push(removePlayerFromChatChannelAsync(playerDoc._id))
		if(_.isObject(playerDoc.alliance)){
			funcs.push(removePlayerFromEventAllianceChannelAsync(playerDoc._id, playerDoc.alliance.id))
			_.each(self.logicServers, function(server){
				funcs.push(removePlayerFromLogicAllianceChannelAsync(server.id, playerDoc._id, playerDoc.alliance.id))
			})
		}
		return Promise.all(funcs)
	}).catch(function(e){
		self.logService.onEventError("logic.entryHandler.playerLeave", {playerId:playerDoc._id}, e.stack)
	})
}


var AddPlayerToChatChannel = function(playerId, callback){
	this.app.rpc.chat.chatRemote.addToChatChannel.toServer(this.chatServerId, playerId, this.logicServerId, callback)
}

var RemovePlayerFromChatChannel = function(playerId, callback){
	this.app.rpc.chat.chatRemote.removeFromChatChannel.toServer(this.chatServerId, playerId, this.logicServerId, callback)
}

var AddPlayerToEventAllianceChannel = function(allianceId, playerId, callback){
	this.app.rpc.chat.eventRemote.addToChatChannel.toServer(this.eventServerId, allianceId, playerId, this.logicServerId, callback)
}

var RemovePlayerFromEventAllianceChannel = function(allianceId, playerId, callback){
	this.app.rpc.chat.eventRemote.removeFromChatChannel.toServer(this.eventServerId, allianceId, playerId, this.logicServerId, callback)
}

var AddPlayerToLogicAllianceChannel = function(logicServerId, allianceId, playerId, callback){
	this.app.rpc.chat.logicRemote.addToChatChannel.toServer(logicServerId, allianceId, playerId, this.logicServerId, callback)
}

var RemovePlayerFromLogicAllianceChannel = function(logicServerId, allianceId, playerId, callback){
	this.app.rpc.chat.logicRemote.removeFromChatChannel.toServer(logicServerId, allianceId, playerId, this.logicServerId, callback)
}


var FilterPlayerDoc = function(playerDoc){
	var data = _.omit(playerDoc, "mails", "sendMails", "reports")
	if(!_.isObject(data.alliance) || _.isEmpty(data.alliance.id)){
		data.alliance = {}
	}
	data.mails = []
	data.reports = []
	var self = this
	for(var i = playerDoc.mails.length - 1; i >= 0; i--){
		var mail = playerDoc.mails[i]
		mail.index = i
		data.mails.push(mail)
	}
	for(i = playerDoc.reports.length - 1; i >= 0; i--){
		var report = playerDoc.reports[i]
		report.index = i
		data.reports.push(report)
	}
	data.sendMails = []
	for(i = playerDoc.sendMails.length - 1; i >= 0; i--){
		var sendMail = playerDoc.sendMails[i]
		sendMail.index = i
		data.sendMails.push(sendMail)
	}
	data.savedMails = []
	data.savedReports = []
	var unreadMails = 0
	var unreadReports = 0
	_.each(data.mails, function(mail){
		if(!mail.isRead){
			unreadMails++
		}
		if(!!mail.isSaved && data.savedMails.length < self.maxReturnMailSize){
			data.savedMails.push(mail)
		}
	})
	_.each(data.reports, function(report){
		if(!report.isRead){
			unreadReports++
		}
		if(!!report.isSaved && data.savedReports.length < self.maxReturnReportSize){
			data.savedReports.push(report)
		}
	})
	data.mails = data.mails.slice(0, this.maxReturnMailSize)
	data.reports = data.reports.slice(0, this.maxReturnReportSize)
	data.sendMails = data.sendMails.slice(0, this.maxReturnMailSize)

	data.mailStatus = {
		unreadMails:unreadMails,
		unreadReports:unreadReports
	}

	data.countInfo.serverVersion = this.serverVersion
	data.serverTime = Date.now()

	return data
}


/**
 * 玩家登陆
 * @param msg
 * @param session
 * @param next
 */
pro.login = function(msg, session, next){
	this.logService.onRequest("logic.entryHandler.login", msg)
	var e = null
	if(!this.app.get("isReady")){
		e = ErrorUtils.serverUnderMaintain()
		next(e, ErrorUtils.getError(e))
		return
	}

	var self = this
	var deviceId = msg.deviceId
	if(!_.isString(deviceId)){
		e = new Error("deviceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	var bindPlayerSessionAsync = Promisify(BindPlayerSession, this)
	var addPlayerToChatChannelAsync = Promisify(AddPlayerToChatChannel, this)
	var addPlayerToEventAllianceChannelAsync = Promisify(AddPlayerToEventAllianceChannel, this)
	var addPlayerToLogicAllianceChannelAsync = Promisify(AddPlayerToLogicAllianceChannel, this)

	var playerDoc = null
	var allianceDoc = null
	var enemyAllianceDoc = null

	this.playerApiService.playerLoginAsync(deviceId, self.serverId).spread(function(doc_1, doc_2, doc_3){
		playerDoc = doc_1
		allianceDoc = doc_2
		enemyAllianceDoc = doc_3
		return bindPlayerSessionAsync(session, deviceId, playerDoc)
	}).then(function(){
		var funcs = []
		funcs.push(addPlayerToChatChannelAsync(playerDoc._id))
		if(_.isObject(playerDoc.alliance)){
			funcs.push(addPlayerToEventAllianceChannelAsync(playerDoc._id, playerDoc.alliance.id))
			_.each(self.logicServers, function(server){
				funcs.push(addPlayerToLogicAllianceChannelAsync(server.id, playerDoc._id, playerDoc.alliance.id))
			})
		}
		return Promise.all(funcs)
	}).then(function(){
		self.logService.onEvent("logic.entryHandler.playerLogin", {playerId:session.uid})
		next(null, {code:200, playerData:FilterPlayerDoc.call(self, playerDoc), allianceData:allianceDoc, enemyAllianceData:enemyAllianceDoc})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
		if(!_.isEqual(e.code, ErrorUtils.reLoginNeeded(deviceId).code)){
			self.sessionService.kickBySessionId(session.id)
		}
	})
}