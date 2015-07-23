"use strict"

/**
 * Created by modun on 15/3/19.
 */


var _ = require("underscore")
var Promise = require("bluebird")
var apn = require("apn")
var path = require("path")
var sprintf = require("sprintf")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")
var LogicUtils = require("../utils/logicUtils")
var DataUtils = require("../utils/dataUtils")

var ApnService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.apnProductionMode = app.get('serverConfig').apnProductionMode;
	this.apnPushCert = path.join(__dirname, '../../config/' + app.get('serverConfig').apnPushCert);
	this.apnService = null
}
module.exports = ApnService
var pro = ApnService.prototype

/**
 * 获取ApnService
 * @returns {null|*}
 */
pro.getApnService = function(){
	var self = this
	if(!_.isObject(this.apnService)){
		var service = new apn.Connection({
			production:self.apnProductionMode,
			pfx:self.apnPushCert,
			passphrase:"aisinile",
			cacheLength:"200"
		})
		service.on("connected", function(){

		})
		service.on("transmitted", function(notification, device){

		})

		service.on("transmissionError", function(errCode, notification, device){
			self.logService.onEventError("apnService.transmissionError", {
				errCode:errCode,
				device:device,
				notification:notification
			})
		})

		service.on("timeout", function(){
			self.apnService = null
		})

		service.on("disconnected", function(){
			self.apnService = null
		})

		service.on("socketError", function(e){
			self.apnService = null
			self.logService.onEventError("apnService.socketError", {}, e.stack)
		})

		this.apnService = service
	}
	return this.apnService
}

/**
 * 推送消息到离线玩家
 * @param apnIds
 * @param message
 */
pro.pushApnMessage = function(apnIds, message){
	if(apnIds.length == 0) callback()
	var note = new apn.Notification()
	note.alert = message
	note.sound = "default"
	this.getApnService().pushNotification(note, apnIds)
}

/**
 * 联盟战进入准备期推送通知
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 */
pro.onAllianceFightPrepare = function(attackAllianceDoc, defenceAllianceDoc){
	var self = this
	var messageKey = DataUtils.getLocalizationConfig("alliance", "AttackAlliancePrepare");
	var messageArgs = [];
	var members = {}

	_.each(attackAllianceDoc.members, function(member){
		(function(){
			if(!member.online && !_.isEmpty(member.apnId) && _.isObject(member.apnStatus) && !!member.apnStatus.onAllianceFightPrepare){
				if(!_.isArray(members[member.language])) members[member.language] = []
				members[member.language].push(member.apnId)
			}
		})();
	})
	_.each(members, function(apnIds, language){
		(function(){
			var message = messageKey[language]
			if(!_.isString(message)) message = messageKey.en;
			if(messageArgs.length > 0){
				message = sprintf.vsprintf(message, messageArgs)
			}
			self.pushApnMessage(apnIds, message)
		})();
	})

	messageKey = DataUtils.getLocalizationConfig("alliance", "AllianceBeAttackedPrepare");
	messageArgs = [attackAllianceDoc.basicInfo.name];
	members = {}
	_.each(defenceAllianceDoc.members, function(member){
		(function(){
			if(!member.online && !_.isEmpty(member.apnId) && _.isObject(member.apnStatus) && !!member.apnStatus.onAllianceFightPrepare){
				if(!_.isArray(members[member.language])) members[member.language] = []
				members[member.language].push(member.apnId)
			}
		})();
	})
	_.each(members, function(apnIds, language){
		(function(){
			var message = messageKey[language]
			if(!_.isString(message)) message = messageKey.en;
			if(messageArgs.length > 0){
				message = sprintf.vsprintf(message, messageArgs)
			}
			self.pushApnMessage(apnIds, message)
		})();
	})
}

/**
 * 联盟战进入战争期推送通知
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 */
pro.onAllianceFightStart = function(attackAllianceDoc, defenceAllianceDoc){
	var self = this
	var messageKey = DataUtils.getLocalizationConfig("alliance", "AttackAllianceStart");
	var messageArgs = [defenceAllianceDoc.basicInfo.name];
	var members = {}
	_.each(attackAllianceDoc.members, function(member){
		(function(){
			if(!member.online && !_.isEmpty(member.apnId) && _.isObject(member.apnStatus)  && !!member.apnStatus.onAllianceFightStart){
				if(!_.isArray(members[member.language])) members[member.language] = []
				members[member.language].push(member.apnId)
			}
		})();
	})
	_.each(members, function(apnIds, language){
		(function(){
			var message = messageKey[language]
			if(!_.isString(message)) message = messageKey.en;
			if(messageArgs.length > 0){
				message = sprintf.vsprintf(message, messageArgs)
			}
			self.pushApnMessage(apnIds, message)
		})();
	})

	messageKey = DataUtils.getLocalizationConfig("alliance", "AllianceBeAttackedStart");
	messageArgs = [attackAllianceDoc.basicInfo.name];
	members = {}
	_.each(defenceAllianceDoc.members, function(member){
		(function(){
			if(!member.online && !_.isEmpty(member.apnId) && _.isObject(member.apnStatus)  && !!member.apnStatus.onAllianceFightStart){
				if(!_.isArray(members[member.language])) members[member.language] = []
				members[member.language].push(member.apnId)
			}
		})();
	})
	_.each(members, function(apnIds, language){
		(function(){
			var message = messageKey[language]
			if(!_.isString(message)) message = messageKey.en;
			if(messageArgs.length > 0){
				message = sprintf.vsprintf(message, messageArgs)
			}
			self.pushApnMessage(apnIds, message)
		})();
	})
}

/**
 * 圣地战激活推送通知
 * @param allianceDoc
 */
pro.onAllianceShrineEventStart = function(allianceDoc){
	var self = this
	var messageKey = DataUtils.getLocalizationConfig("alliance", "AllianceShrineEventStart");
	var messageArgs = [];
	var members = {}
	_.each(allianceDoc.members, function(member){
		(function(){
			if(!member.online && !_.isEmpty(member.apnId) && _.isObject(member.apnStatus)  && !!member.apnStatus.onAllianceShrineEventStart){
				if(!_.isArray(members[member.language])) members[member.language] = []
				members[member.language].push(member.apnId)
			}
		})();
	})
	_.each(members, function(apnIds, language){
		(function(){
			var message = messageKey[language]
			if(!_.isString(message)) message = messageKey.en;
			if(messageArgs.length > 0){
				message = sprintf.vsprintf(message, messageArgs)
			}
			self.pushApnMessage(apnIds, message)
		})();
	})
}

/**
 * 玩家城市即将被攻打推送通知
 * @param playerDoc
 */
pro.onCityBeAttacked = function(playerDoc){
	var self = this
	var messageKey = DataUtils.getLocalizationConfig("alliance", "CityBeAttacked");
	var messageArgs = [];
	if(_.isEmpty(playerDoc.logicServerId) && !_.isEmpty(playerDoc.apnId) && !!playerDoc.apnStatus.onCityBeAttacked){
		var message = messageKey[playerDoc.basicInfo.language];
		if(!_.isString(message)) message = messageKey.en;
		if(messageArgs.length > 0){
			message = sprintf.vsprintf(message, messageArgs);
		}
		self.pushApnMessage([playerDoc.apnId], message);
	}
}