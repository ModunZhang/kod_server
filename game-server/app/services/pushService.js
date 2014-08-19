/**
 * Created by modun on 14-8-7.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")

var PushService = function(app){
	this.app = app
	this.globalChannelService = this.app.get("globalChannelService")
	this.globalChannelName = Consts.GlobalChannelName
	this.globalChannel = this.globalChannelService
	this.channelService = this.app.get("channelService")
	this.serverId = this.app.getServerId()
}

module.exports = PushService
var pro = PushService.prototype

/**
 * 推送消息给单个玩家
 * @param eventName
 * @param data
 * @param playerId
 */
pro.pushToPlayer = function(eventName, data, playerId){
	if(_.isEqual(Events.player.onPlayerDataChanged, eventName)){
		data = Utils.filter(data)
	}
	this.channelService.pushMessageByUids(eventName, data, [
		{uid:playerId, sid:this.app.getServerId()}
	])
}

/**
 * 建筑升级成功事件推送
 * @param buildingType
 * @param level
 */
pro.pushBuildingLevelUpEvent = function(buildingType, buildingSubType, level, playerId){
	var data = {
		buildingType:buildingType,
		level:level
	}
	if(_.isString(buildingSubType)){
		data.buildingSubType = buildingSubType
	}
	this.pushToPlayer(Events.player.onBuildingLevelUp, data, [
		{uid:playerId, sid:this.app.getServerId()}
	])
}