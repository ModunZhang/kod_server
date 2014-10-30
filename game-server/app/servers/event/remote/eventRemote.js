"use strict"

/**
 * Created by modun on 14-10-8.
 */

var _ = require("underscore")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var logicLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic", __filename)

var Dispatcher = require('../../../utils/dispatcher')
var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new EventRemote(app)
}

var EventRemote = function(app){
	this.app = app
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
	var id = setTimeout(ExcuteTimeEvent.bind(this), timeInterval, key, eventId)
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
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(key, eventId, callback){
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
 * @param eventId
 * @param timeInterval
 * @param callback
 */
pro.updateTimeEvent = function(key, eventId, timeInterval, callback){
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[eventId]
	if(_.isObject(callbackObj)){
		clearTimeout(callbackObj.id)
	}
	delete callbacks[eventId]

	var id = setTimeout(ExcuteTimeEvent.bind(this), timeInterval, key, eventId)
	callbackObj.id = id
	callbacks[eventId] = callbackObj
	callback()
}

/**
 * 清除指定Key所有的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEventsByKey = function(key, callback){
	var callbacks = this.callbacks[key]
	_.each(callbacks, function(callbackObj){
		clearTimeout(callbackObj.id)
	})
	delete this.callbacks[key]
	callback()
}

/**
 * 执行事件回调
 * @param key
 * @param eventId
 */
var ExcuteTimeEvent = function(key, eventId){
	var self = this
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[eventId]
	delete callbacks[eventId]
	if(_.isEmpty(callbacks)){
		delete this.callbacks[key]
	}
	var logicServers = this.app.getServersByType('logic')
	var logicServerId = Dispatcher.dispatch(logicServers).id
	var eventType = callbackObj.eventType
	logicLogger.info("trigger timeEvent key:%s, eventType:%s, eventId:%s", key, eventType, eventId)
	this.app.rpc.logic.logicRemote.onTimeEvent.toServer(logicServerId, key, eventType, eventId, function(e){
		if(_.isObject(e)){
			errorLogger.error("handle eventRemote:ExcuteTimeEvent Error -----------------------------")
			errorLogger.error(e.stack)
			if(_.isEqual("production", self.app.get("env"))){
				errorMailLogger.error("handle eventRemote:ExcuteTimeEvent Error -----------------------------")
				errorMailLogger.error(e.stack)
			}
		}
	})
}