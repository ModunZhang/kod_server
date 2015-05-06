"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
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
	this.playerApiService = app.get("playerApiService")
	this.maxReturnMailSize = 10
	this.maxReturnReportSize = 10
}
var pro = Handler.prototype

var FilterPlayerDoc = function(playerDoc){
	var self = this
	var mails = playerDoc.mails
	var reports = playerDoc.reports
	var sendMails = playerDoc.sendMails

	playerDoc.mails = []
	for(var i = mails.length - 1; i >= 0; i--){
		var mail = mails[i]
		mail.index = i
		playerDoc.mails.push(mail)
	}
	playerDoc.reports = []
	for(i = reports.length - 1; i >= 0; i--){
		var report = reports[i]
		report.index = i
		playerDoc.reports.push(report)
	}
	playerDoc.sendMails = []
	for(i = sendMails.length - 1; i >= 0; i--){
		var sendMail = sendMails[i]
		sendMail.index = i
		playerDoc.sendMails.push(sendMail)
	}

	playerDoc.savedMails = []
	playerDoc.savedReports = []
	var unreadMails = 0
	var unreadReports = 0
	_.each(playerDoc.mails, function(mail){
		if(!mail.isRead){
			unreadMails++
		}
		if(!!mail.isSaved && playerDoc.savedMails.length < self.maxReturnMailSize){
			playerDoc.savedMails.push(mail)
		}
	})
	_.each(playerDoc.reports, function(report){
		if(!report.isRead){
			unreadReports++
		}
		if(!!report.isSaved && playerDoc.savedReports.length < self.maxReturnReportSize){
			playerDoc.savedReports.push(report)
		}
	})
	playerDoc.mails = playerDoc.mails.slice(0, this.maxReturnMailSize)
	playerDoc.reports = playerDoc.reports.slice(0, this.maxReturnReportSize)
	playerDoc.sendMails = playerDoc.sendMails.slice(0, this.maxReturnMailSize)

	playerDoc.mailStatus = {
		unreadMails:unreadMails,
		unreadReports:unreadReports
	}

	playerDoc.serverTime = Date.now()
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
	if(!_.isEqual(this.app.get("serverStatus"), Consts.ServerStatus.On)){
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

	var playerDoc = null
	var allianceDoc = null
	var enemyAllianceDoc = null
	this.playerApiService.playerLoginAsync(session, deviceId).spread(function(doc_1, doc_2, doc_3){
		playerDoc = doc_1
		allianceDoc = doc_2
		enemyAllianceDoc = doc_3
	}).then(function(){
		FilterPlayerDoc.call(self, playerDoc)
		next(null, {
			code:200,
			playerData:playerDoc,
			allianceData:allianceDoc,
			enemyAllianceData:enemyAllianceDoc
		})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}