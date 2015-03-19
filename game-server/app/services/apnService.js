"use strict"

/**
 * Created by modun on 15/3/19.
 */


var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")
var LogicUtils = require("../utils/logicUtils")

var ApnService = function(app){
	this.app = app
	this.globalChannelService = app.get("globalChannelService")
	this.serverId = app.getServerId()
	this.serverType = app.getServerType()
}
module.exports = ApnService
var pro = ApnService.prototype



/**
 * 推送消息到离线
 * @param apnIds
 * @param message
 * @param callback
 */
pro.pushApnMessage = function(apnIds, message, callback){

}

/**
 * 给联盟玩家推送APN
 * @param allianceDoc
 * @param message
 * @param callback
 */
pro.pushApnMessageToAllianceMembers = function(allianceDoc, message, callback){
	var self = this
	var channelName = Consts.AllianceChannelPrefix + allianceId
	this.globalChannelService.getMembersByChannelName(this.serverType, channelName, function(err, memberIds){
		if(_.isObject(err)){
			callback(err)
			return
		}

		var apnIds = []
		_.each(allianceDoc, function(doc){
			if(!_.contains(memberIds, doc._id) && !_.isEmpty(doc.apnId)) apnIds.push(doc.apnId)
		})
		if(apnIds.length > 0){
			self.pushApnMessage(apnIds, message, callback)
		}else{
			callback()
		}
	})
}