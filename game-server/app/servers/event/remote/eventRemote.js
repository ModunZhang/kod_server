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
	this.logService = app.get("logService")
	this.channelService = app.get("channelService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.allianceTimeEventService = app.get("allianceTimeEventService")
	this.timeouts = {}
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
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId)
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
	this.logService.onEvent("event.eventRemote.addTimeEvent", {
		key:key,
		eventType:eventType,
		eventId:eventId,
		timeInterval:timeInterval
	})
	var timeout = setTimeout(this.triggerTimeEvent.bind(this), timeInterval, key, eventType, eventId)
	var timeouts = this.timeouts[key]
	if(_.isEmpty(timeouts)){
		timeouts = {}
		this.timeouts[key] = timeouts
	}
	timeouts[eventId] = timeout
	callback()
}

/**
 * 移除时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(key, eventType, eventId, callback){
	this.logService.onEvent("event.eventRemote.removeTimeEvent", {key:key, eventType:eventType, eventId:eventId})
	var timeouts = this.timeouts[key]
	var timeout = timeouts[eventId]
	clearTimeout(timeout)
	delete timeouts[eventId]
	if(_.isEmpty(timeouts)){
		delete this.timeouts[key]
	}
	callback()
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
	this.logService.onEvent("event.eventRemote.updateTimeEvent", {
		key:key,
		eventType:eventType,
		eventId:eventId,
		timeInterval:timeInterval
	})
	var timeouts = this.timeouts[key]
	var timeout = timeouts[eventId]
	clearTimeout(timeout)

	timeout = setTimeout(this.triggerTimeEvent.bind(this), timeInterval, key, eventType, eventId)
	timeouts[eventId] = timeout
	callback()
}

/**
 * 清除指定Key所有的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEventsByKey = function(key, callback){
	this.logService.onEvent("event.eventRemote.clearTimeEventsByKey", {key:key})
	var timeouts = this.timeouts[key]
	_.each(timeouts, function(timeout){
		clearTimeout(timeout)
	})
	delete this.timeouts[key]
	callback()
}

/**
 * 触发事件回调
 * @param key
 * @param eventType
 * @param eventId
 */
pro.triggerTimeEvent = function(key, eventType, eventId){
	var self = this
	this.logService.onEvent("event.eventRemote.triggerTimeEvent", {key:key, eventType:eventType, eventId:eventId})
	var timeouts = this.timeouts[key]
	delete timeouts[eventId]
	if(_.isEmpty(timeouts)){
		delete this.timeouts[key]
	}
	this.excuteTimeEvent(key, eventType, eventId, function(e){
		if(_.isObject(e)){
			self.logService.onEventError("event.eventRemote.triggerTimeEvent finished with error", {
				key:key,
				eventType:eventType,
				eventId:eventId
			}, e.stack)
		}else{
			self.logService.onEvent("event.eventRemote.triggerTimeEvent finished", {
				key:key,
				eventType:eventType,
				eventId:eventId
			})
		}
	})
}

/**
 * 执行事件回调
 * @param key
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.excuteTimeEvent = function(key, eventType, eventId, callback){
	var params = key.split(":")
	var targetType = params[0]
	var id = params[1]
	if(_.isEqual(Consts.TimeEventType.Player, targetType)){
		this.playerTimeEventService.onTimeEvent(id, eventType, eventId, callback)
	}else if(_.isEqual(Consts.TimeEventType.Alliance, targetType)){
		this.allianceTimeEventService.onTimeEvent(id, eventType, eventId, callback)
	}else if(_.isEqual(Consts.TimeEventType.AllianceFight, targetType)){
		var ids = eventId.split(":")
		this.allianceTimeEventService.onFightTimeEvent(ids[0], ids[1], callback)
	}else{
		callback(new Error("未知的事件类型"))
	}
}