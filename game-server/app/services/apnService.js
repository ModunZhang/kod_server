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
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var logicLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic", __filename)

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")
var LogicUtils = require("../utils/logicUtils")

var ApnService = function(app){
	this.app = app
	this.globalChannelService = app.get("globalChannelService")
	this.serverId = app.getServerId()
	this.serverType = app.getServerType()
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
			pfx:fs.readFileSync(path.resolve("./config/aps_development.p12")),
			passphrase:"aisinile",
			cacheLength:"200"
		})
		service.on("connected", function(){

		})
		service.on("transmitted", function(notification, device){

		})

		service.on("transmissionError", function(errCode, notification, device){
			errorLogger.error("handle apnService:transmissionError -----------------------------")
			errorLogger.error("Notification caused error: " + errCode + " for device ", device, notification)
			if("production" == self.app.get("env")){
				errorMailLogger.error("handle apnService:transmissionError -----------------------------")
				errorMailLogger.error("Notification caused error: " + errCode + " for device ", device, notification)
			}
		})

		service.on("timeout", function(){
			self.apnService = null
		})

		service.on("disconnected", function(){
			self.apnService = null
		})

		service.on("socketError", function(e){
			self.apnService = null
			errorLogger.error("handle apnService:socketError -----------------------------")
			errorLogger.error(e.stack)
			if("production" == self.app.get("env")){
				errorMailLogger.error("handle apnService:socketError -----------------------------")
				errorMailLogger.error(e.stack)
			}
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
	var channelName = Consts.AllianceChannelPrefix + allianceDoc._id
	this.globalChannelService.getMembersByChannelName(this.serverType, channelName, function(err, memberIds){
		if(_.isObject(err)){
			callback(err)
			return
		}
		_.each(allianceDoc.members, function(theMember){
			if(!_.contains(memberIds, theMember.id) && !_.isEmpty(theMember.apnId)){
				if(!_.isArray(members[theMember.language])) members[theMember.language] = []
				members[theMember.language].push(theMember.apnId)
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
	})
}