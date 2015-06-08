"use strict"

/**
 * Created by modun on 15/3/19.
 */


var _ = require("underscore")
var Promise = require("bluebird")
var apn = require("apn")
var fs = require("fs")
var path = require("path")
var sprintf = require("sprintf")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")
var LogicUtils = require("../utils/logicUtils")

var ApnService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.serverId = app.getServerId()
	this.serverType = app.getServerType()
	this.apnPushCert = fs.readFileSync(path.resolve("./config/" + app.get('serverConfig').apnPushCert))
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
			production:false,
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
 * 推送消息到离线
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
 * 给联盟玩家推送APN
 * @param allianceDoc
 * @param messageKey
 * @param messageArgs
 */
pro.pushApnMessageToAllianceMembers = function(allianceDoc, messageKey, messageArgs){
	var self = this
	var members = {}
	_.each(allianceDoc.members, function(member){
		if(!member.online && !_.isEmpty(member.apnId)){
			if(!_.isArray(members[member.language])) members[member.language] = []
			members[member.language].push(member.apnId)
		}
	})
	_.each(members, function(apnIds, language){
		var message = messageKey[language]
		if(!_.isString(message)){
			message = messageKey.en
		}
		if(messageArgs.length > 0){
			message = sprintf.vsprintf(message, messageArgs)
		}
		self.pushApnMessage(apnIds, message)
	})
}