"use strict"

/**
 * Created by modun on 14-10-8.
 */

var _ = require("underscore")

var Dispatcher = require('../../../utils/dispatcher')
var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new EventRemote(app)
}

var EventRemote = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.callbacks = {}
}
var pro = EventRemote.prototype

/**
 * 添加时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 */
pro.addTimeEvent = function(key, eventType, eventId, timeInterval, callback){
	this.logService.onEvent("event.eventRemote.addTimeEvent", {key:key, eventType:eventType, eventId:eventId, timeInterval:timeInterval})
	var id = setTimeout(this.triggerTimeEvent.bind(this), timeInterval, key, eventId)
	var callbacks = this.callbacks[key]
	if(_.isEmpty(callbacks)){
		callbacks = {}
		this.callbacks[key] = callbacks
	}
	var callbackObj = {
		id:id,
		eventType:eventType
	}
	callbacks[eventId] = callbackObj
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
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[eventId]
	if(_.isObject(callbackObj)){
		clearTimeout(callbackObj.id)
	}
	delete callbacks[eventId]
	if(_.isEmpty(callbacks)){
		delete this.callbacks[key]
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
	this.logService.onEvent("event.eventRemote.updateTimeEvent", {key:key, eventType:eventType, eventId:eventId, timeInterval:timeInterval})
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[eventId]
	clearTimeout(callbackObj.id)

	var id = setTimeout(this.triggerTimeEvent.bind(this), timeInterval, key, eventId)
	callbackObj.id = id
	callback()
}

/**
 * 清除指定Key所有的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEventsByKey = function(key, callback){
	this.logService.onEvent("event.eventRemote.clearTimeEventsByKey", {key:key})
	var callbacks = this.callbacks[key]
	_.each(callbacks, function(callbackObj){
		clearTimeout(callbackObj.id)
	})
	delete this.callbacks[key]
	callback()
}

/**
 * 触发事件回调
 * @param key
 * @param eventId
 */
pro.triggerTimeEvent = function(key, eventId){
	var self = this
	this.logService.onEvent("event.eventRemote.triggerTimeEvent", {key:key, eventId:eventId})
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[eventId]
	var eventType = callbackObj.eventType
	delete callbacks[eventId]
	if(_.isEmpty(callbacks)){
		delete this.callbacks[key]
	}
	this.excuteTimeEvent(key, eventType, eventId, function(e){
		if(_.isObject(e)){
			self.logService.onEventError("event.eventRemote.triggerTimeEvent finished with error", {key:key, eventId:eventId}, e.stack)
		}else{
			self.logService.onEvent("event.eventRemote.triggerTimeEvent finished", {key:key, eventId:eventId})
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
	var logicServers = this.app.getServersByType('logic')
	var logicServerId = Dispatcher.dispatch(logicServers).id
	this.app.rpc.logic.logicRemote.onTimeEvent.toServer(logicServerId, key, eventType, eventId, callback)
}