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
}
var pro = Handler.prototype

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
		playerDoc.mails = []
		playerDoc.sendMails = []
		playerDoc.reports = []
		allianceDoc = doc_2
		if(_.isObject(allianceDoc)){
			allianceDoc.joinRequestEvents = []
			allianceDoc.shrineReports = []
			allianceDoc.allianceFightReports = []
			allianceDoc.itemLogs = []
		}
		enemyAllianceDoc = doc_3
	}).then(function(){
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