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
var ErrorUtils = require("../../../utils/errorUtils")
var Consts = require("../../../consts/consts")

var GameDatas = require("../../../datas/GameDatas")
var Errors = GameDatas.Errors.errors

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.env = app.get("env")
	this.serverId = app.getServerId()
	this.redis = app.get("redis")
	this.scripto = app.get("scripto")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
	this.playerApiService = app.get("playerApiService")
	this.globalChannelService = app.get("globalChannelService")
	this.sessionService = app.get("sessionService")
	this.Device = app.get("Device")
	this.User = app.get("User")
	this.maxReturnMailSize = 10
	this.maxReturnReportSize = 10
}
var pro = Handler.prototype

/**
 * 玩家登陆
 * @param msg
 * @param session
 * @param next
 */
pro.login = function(msg, session, next){
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

	var bindPlayerSession = Promisify(BindPlayerSession, this)
	var addPlayerToChatChannel = Promisify(AddPlayerToChatChannel, this)

	var playerDoc = null
	var allianceDoc = null
	this.playerApiService.isAccountExistAsync(deviceId).then(function(isExist){
		if(!isExist){
			return self.playerApiService.createAccountAsync(deviceId)
		}
		return Promise.resolve()
	}).then(function(){
		return self.playerApiService.playerLoginAsync(deviceId, self.serverId)
	}).spread(function(doc_1, doc_2){
		playerDoc = doc_1
		allianceDoc = doc_2
		var funcs = []
		funcs.push(bindPlayerSession(session, playerDoc))
		funcs.push(addPlayerToChatChannel(session))
		if(_.isObject(playerDoc.alliance)){
			funcs.push(self.globalChannelService.addAsync(Consts.AllianceChannelPrefix + playerDoc.alliance.id, playerDoc._id, self.serverId))
		}
		return Promise.all(funcs)
	}).then(function(){
		next(null, {code:200, playerData:FilterPlayerDoc.call(self, playerDoc), allianceData:allianceDoc})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
		self.sessionService.kickBySessionId(session.id)
	})
}

var BindPlayerSession = function(session, playerDoc, callback){
	session.bind(playerDoc._id)
	session.set("logicServerId", playerDoc.logicServerId)
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
	console.log("user [" + session.uid + "] logout with reason [" + reason + "]")
	var removePlayerFromChatChannel = Promisify(RemovePlayerFromChatChannel, this)
	this.playerApiService.playerLogoutAsync(session.uid).then(function(playerDoc){
		var funcs = []
		funcs.push(removePlayerFromChatChannel(session))
		if(_.isObject(playerDoc.alliance)){
			funcs.push(self.globalChannelService.leaveAsync(Consts.AllianceChannelPrefix + playerDoc.alliance.id, playerDoc._id, self.serverId))
		}
		return Promise.all(funcs)
	}).catch(function(e){
		errorLogger.error("handle entryHandler:playerLogout Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle entryHandler:playerLogout Error -----------------------------")
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

var FilterPlayerDoc = function(playerDoc){
	var data = _.omit(playerDoc, "mails", "sendMails", "reports")
	if(!_.isObject(data.alliance) || _.isEmpty(data.alliance.id)){
		data.alliance = {}
	}
	data.mails = []
	data.reports = []
	for(var i = playerDoc.mails.length - 1; i >= 0; i--){
		data.mails.push(playerDoc.mails[i])
	}
	for(i = playerDoc.reports.length - 1; i >= 0; i--){
		data.reports.push(playerDoc.reports[i])
	}
	data.sendMails = []
	for(i = playerDoc.sendMails.length - 1; i >= 0; i--){
		data.sendMails.push(playerDoc.sendMails[i])
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