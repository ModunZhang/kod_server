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
	this.request = app.get('request');
	this.logicServerId = app.get('logicServerId')
	this.chatServerId = app.get('chatServerId')
	this.rankServerId = app.get('rankServerId')
	this.cacheServerId = app.get('cacheServerId');
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
	var requestTime = msg.requestTime
	if(!_.isString(deviceId)){
		e = new Error("deviceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(requestTime) || requestTime <= 0){
		e = new Error("requestTime 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var enemyAllianceDoc = null
	this.request('login', [deviceId, requestTime, this.logicServerId]).spread(function(doc_1, doc_2, doc_3){
		playerDoc = doc_1
		allianceDoc = doc_2
		enemyAllianceDoc = doc_3
	}).then(function(){
		return new Promise(function(resolve, reject){
			BindPlayerSession.call(self, session, deviceId, playerDoc, allianceDoc, function(e){
				if(_.isObject(e)) reject(e)
				else resolve()
			})
		})
	}).then(function(){
		self.logService.onRequest("logic.entryHandler.login success", {
			deviceId:deviceId,
			playerId:playerDoc._id,
			logicServerId:self.logicServerId
		})
		next(null, {code:200, playerData:playerDoc, allianceData:allianceDoc, enemyAllianceData:enemyAllianceDoc})
	}).catch(function(e){
		self.logService.onRequestError("logic.entryHandler.login failed", {
			deviceId:deviceId,
			playerId:_.isObject(playerDoc) ? playerDoc._id : null,
			logicServerId:self.logicServerId
		}, e.stack)
		next(null, ErrorUtils.getError(e))
	})
}

var BindPlayerSession = function(session, deviceId, playerDoc, allianceDoc, callback){
	var self = this
	session.bind(playerDoc._id)
	session.set("deviceId", deviceId)
	session.set("logicServerId", this.logicServerId)
	session.set("chatServerId", this.chatServerId)
	session.set("rankServerId", this.rankServerId)
	session.set("cacheServerId", this.cacheServerId)
	session.set("name", playerDoc.basicInfo.name)
	session.set("icon", playerDoc.basicInfo.icon)
	session.set("allianceId", _.isObject(allianceDoc) ? allianceDoc._id : "")
	session.set("allianceTag", _.isObject(allianceDoc) ? allianceDoc.basicInfo.tag : "")
	session.set("vipExp", playerDoc.basicInfo.vipExp)
	session.set("isVipActive", playerDoc.vipEvents.length > 0)
	session.on("closed", OnSessionClose.bind(this));
	session.pushAll(function(err){
		if(_.isObject(err)){
			session.uid = playerDoc._id;
			OnSessionClose.call(self, session, err.message)
			callback(err);
		}else{
			process.nextTick(function(){
				callback(err)
			})
		}
	})
}

var OnSessionClose = function(session, reason){
	var self = this;
	self.logService.onRequest("logic.entryHandler.logout", {
		playerId:session.uid,
		logicServerId:self.logicServerId,
		reason:reason
	})
	self.request('logout', [session.uid, self.logicServerId, reason]).then(function(){
		self.logService.onRequest("logic.entryHandler.logout success", {
			playerId:session.uid,
			logicServerId:self.logicServerId,
			reason:reason
		})
		self.app.set("loginedCount", self.app.get("loginedCount") - 1)
	}).catch(function(e){
		self.logService.onRequestError("logic.entryHandler.logout failed", {
			playerId:session.uid,
			logicServerId:self.logicServerId,
			reason:reason
		}, e.stack)
		self.app.set("loginedCount", self.app.get("loginedCount") - 1)
	})
}