"use strict"

/**
 * Created by modun on 14-8-7.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")
var LogicUtils = require("../utils/logicUtils")

var PushService = function(app){
	this.app = app
	this.channelService = app.get("channelService")
}
module.exports = PushService
var pro = PushService.prototype

/**
 * 推送消息给单个玩家
 * @param playerDoc
 * @param eventName
 * @param data
 * @param callback
 */
pro.pushToPlayer = function(playerDoc, eventName, data, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback()
		return
	}
	this.channelService.pushMessageByUids(eventName, data, [{uid:playerDoc._id, sid:playerDoc.logicServerId}], callback)
}

/**
 * 推送玩家数据给玩家
 * @param playerDoc
 * @param data
 * @param callback
 */
pro.onPlayerDataChanged = function(playerDoc, data, callback){
	this.pushToPlayer(playerDoc, Events.player.onPlayerDataChanged, data, callback)
}

/**
 * 成功获取联盟完整数据
 * @param playerDoc
 * @param allianceDoc
 * @param callback
 */
pro.onGetAllianceDataSuccess = function(playerDoc, allianceDoc, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetAllianceDataSuccess, allianceDoc, callback)
}

/**
 * 推送联盟数据给玩家
 * @param allianceId
 * @param data
 * @param callback
 */
pro.onAllianceDataChanged = function(allianceId, data, callback){
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + "_" + allianceId
	this.channelService.getChannel(channelName).pushMessage(eventName, data, callback)
}

/**
 * 敌方联盟数据改变
 * @param allianceId
 * @param data
 * @param callback
 */
pro.onEnemyAllianceDataChanged = function(allianceId, data, callback){
	var eventName = Events.alliance.onEnemyAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + "_" + allianceId
	this.channelService.getChannel(channelName).pushMessage(eventName, data, callback)
}

/**
 * 联盟战开始或者结束
 * @param allianceId
 * @param allianceData
 * @param enemyAllianceData
 * @param callback
 */
pro.onAllianceFight = function(allianceId, allianceData, enemyAllianceData, callback){
	var eventName = Events.alliance.onAllianceFight
	var channelName = Consts.AllianceChannelPrefix + "_" + allianceId
	this.channelService.getChannel(channelName).pushMessage(eventName, {
		allianceData:allianceData,
		enemyAllianceData:enemyAllianceData
	}, callback)

}

/**
 * 推送给联盟除指定玩家之外的其他玩家
 * @param allianceId
 * @param data
 * @param memberId
 * @param callback
 */
pro.onAllianceDataChangedExceptMemberId = function(allianceId, data, memberId, callback){
	var self = this
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + "_" + allianceId
	var uids = []
	_.filter(this.channelService.getChannel(channelName).getMembers, function(uid){
		return !_.isEqual(uid, memberId)
	})
	if(uids.length > 0){
		self.channelService.pushMessageByUids(eventName, data, uids, callback)
	}else{
		callback()
	}

}