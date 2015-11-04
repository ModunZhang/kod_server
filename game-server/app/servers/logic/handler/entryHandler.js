"use strict"

/**
 * Created by modun on 14-7-22.
 */

var crypto = require('crypto')
var Promise = require("bluebird")
var _ = require("underscore")
var ErrorUtils = require("../../../utils/errorUtils")
var Consts = require("../../../consts/consts")

var HandShakeType = {
	TYPE_HANDSHAKE:1,
	TYPE_HANDSHAKE_ACK:2
}

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
 * 加密初始化
 * @param msg
 * @param session
 * @param next
 */
pro.handShake = function(msg, session, next){
	var type = msg.type;
	var value = msg.value;
	var e = null
	if(!type || !_.contains(_.values(HandShakeType), type)){
		e = new Error('type 不合法');
		return next(e, ErrorUtils.getError(e))
	}
	if(!value || !_.isString(value) || value.trim().length === 0){
		e = new Error('value 不合法');
		return next(e, ErrorUtils.getError(e))
	}

	if(type === HandShakeType.TYPE_HANDSHAKE){
		var clientKey = value;
		var challenge = crypto.randomBytes(8).toString('base64');
		var serverDiff = crypto.getDiffieHellman('modp5');
		serverDiff.generateKeys();
		var serverKey = serverDiff.getPublicKey('base64');
		var serverSecret = serverDiff.computeSecret(clientKey, 'base64', 'base64');
		session.set('serverSecret', serverSecret);
		session.set('challenge', challenge);
		session.pushAll(function(e){
			if(!!e) return next(e);
			process.nextTick(function(){
				next(null, {code:200, data:{serverKey:serverKey, challenge:challenge}});
			})
		})
	}else{
		if(!session.get('serverSecret') || !session.get('challenge')){
			e = new Error('还未进行第一步验证');
			return next(e, ErrorUtils.getError(e))
		}
		var cipher = crypto.createCipher('aes-128-cbc-hmac-sha1', session.get('serverSecret'));
		var hmac = cipher.update(session.get('challenge'), 'utf8', 'base64');
		hmac += cipher.final('base64');
		if(hmac !== value){
			e = new Error('challenge 验证失败');
			return next(e, ErrorUtils.getError(e))
		}
		next(null, {code:200});
	}
}

/**
 * 玩家登陆
 * @param msg
 * @param session
 * @param next
 */
pro.login = function(msg, session, next){
	var e = null
	if(!_.isEqual(this.app.get("serverStatus"), Consts.ServerStatus.On)){
		e = ErrorUtils.serverUnderMaintain()
		next(e, ErrorUtils.getError(e))
		return
	}

	var deviceId = msg.deviceId;
	var requestTime = msg.requestTime;
	var needMapData = msg.needMapData;
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
	if(!_.isBoolean(needMapData)){
		e = new Error("needMapData 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var mapData = null
	var mapIndexData = null;
	this.request('login', [deviceId, requestTime, needMapData, this.logicServerId]).spread(function(doc_1, doc_2, doc_3, doc_4){
		playerDoc = doc_1
		allianceDoc = doc_2
		mapData = doc_3;
		mapIndexData = doc_4;
	}).then(function(){
		return new Promise(function(resolve, reject){
			BindPlayerSession.call(self, session, deviceId, playerDoc, allianceDoc, function(e){
				if(_.isObject(e)) reject(e)
				else resolve()
			})
		})
	}).then(function(){
		next(null, {code:200, playerData:playerDoc, allianceData:allianceDoc, mapData:mapData, mapIndexData:mapIndexData});
	}).catch(function(e){
		self.logService.onWarning("logic.entryHandler.login failed", {
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
	session.set('inited', playerDoc.basicInfo.terrain !== Consts.None);
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
	session.set('muteTime', playerDoc.countInfo.muteTime);
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
	self.logService.onEvent("logic.entryHandler.logout", {
		playerId:session.uid,
		logicServerId:self.logicServerId,
		reason:reason
	})
	self.request('logout', [session.uid, self.logicServerId, reason]).then(function(){
		self.logService.onEvent("logic.entryHandler.logout success", {
			playerId:session.uid,
			logicServerId:self.logicServerId,
			reason:reason
		})
		self.app.set("loginedCount", self.app.get("loginedCount") - 1)
	}).catch(function(e){
		self.logService.onError("logic.entryHandler.logout failed", {
			playerId:session.uid,
			logicServerId:self.logicServerId,
			reason:reason
		}, e.stack)
		self.app.set("loginedCount", self.app.get("loginedCount") - 1)
	})
}