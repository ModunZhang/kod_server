"use strict"

/**
 * Created by modun on 14-10-8.
 */

var _ = require("underscore")

var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new EventRemote(app)
}

var EventRemote = function(app){
	this.app = app
	this.dataService = app.get("dataService")
	this.channelService = app.get("channelService")
	this.timeEventService = app.get("timeEventService")
}
var pro = EventRemote.prototype

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.addToAllianceChannel = function(allianceId, uid, logicServerId, callback){
	console.log(this.app.get("eventServerId"), "111111111111")
	this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, true).add(uid, logicServerId)
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.removeFromAllianceChannel = function(allianceId, uid, logicServerId, callback){
	console.log(this.app.get("eventServerId"), "2222222222222")
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	channel.leave(uid, logicServerId)
	if(channel.getMembers.length == 0) channel.destroy()
	callback()
}

/**
 * 添加时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 */
pro.addTimeEvent = function(key, eventType, eventId, timeInterval, callback){
	this.timeEventService.addTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 移除时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(key, eventType, eventId, callback){
	this.timeEventService.removeTimeEvent(key, eventType, eventId, callback)
}

/**
 * 更新时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 */
pro.updateTimeEvent = function(key, eventType, eventId, timeInterval, callback){
	this.timeEventService.updateTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 清除指定Key所有的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEventsByKey = function(key, callback){
	this.timeEventService.clearTimeEventsByKey(key, callback)
}