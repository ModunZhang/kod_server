"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var EventService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.channelService = app.get("channelService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.allianceTimeEventService = app.get("allianceTimeEventService")
	this.dataService = app.get("dataService")
	this.timeouts = {}
}
module.exports = EventService
var pro = EventService.prototype

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
	this.excuteTimeEventAsync(key, eventType, eventId).then(function(){
		self.logService.onEvent("event.eventRemote.triggerTimeEvent finished", {
			key:key,
			eventType:eventType,
			eventId:eventId
		})
	}).catch(function(e){
		self.logService.onEventError("event.eventRemote.triggerTimeEvent finished with error", {
			key:key,
			eventType:eventType,
			eventId:eventId
		}, e.stack)
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

/**
 * 恢复玩家事件
 * @param playerDoc
 * @param callback
 */
pro.restorePlayerTimeEvents = function(playerDoc, callback){
	
}