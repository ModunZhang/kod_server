"use strict"

/**
 * Created by modun on 14-10-8.
 */

var _ = require("underscore")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

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
 * @param logicServerId
 * @param finishTime
 * @param now
 * @param callback
 */
pro.addTimeEvent = function(key, logicServerId, finishTime, now, callback){
	var id = setTimeout(ExcuteTimeEvent.bind(this), finishTime - now, key, finishTime)
	var callbacks = this.callbacks[key]
	if(_.isEmpty(callbacks)){
		callbacks = {}
		this.callbacks[key] = callbacks
	}
	var callbackObj = {
		id:id,
		logicServerId:logicServerId
	}
	callbacks[finishTime] = callbackObj
	callback()
}

/**
 * 移除时间回调
 * @param key
 * @param finishTime
 * @param callback
 */
pro.removeTimeEvent = function(key, finishTime, callback){
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[finishTime]
	if(_.isObject(callbackObj)){
		clearTimeout(callbackObj.id)
	}
	delete callbacks[finishTime]
	if(_.isEmpty(callbacks)){
		delete this.callbacks[key]
	}
	callback()
}

/**
 * 更新时间回调
 * @param key
 * @param oldFinishTime
 * @param newFinishTime
 * @param now
 * @param callback
 */
pro.updateTimeEvent = function(key, oldFinishTime, newFinishTime, now, callback){
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[oldFinishTime]
	if(_.isObject(callbackObj)){
		clearTimeout(callbackObj.id)
	}
	delete callbacks[oldFinishTime]

	var id = setTimeout(ExcuteTimeEvent.bind(this), newFinishTime - now, key, newFinishTime)
	callbackObj.id = id
	callbacks[newFinishTime] = callbackObj
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
 * @param finishTime
 */
var ExcuteTimeEvent = function(key, finishTime){
	var callbacks = this.callbacks[key]
	var callbackObj = callbacks[finishTime]
	delete callbacks[finishTime]
	if(_.isEmpty(callbacks)){
		delete this.callbacks[key]
	}

	this.app.rpc.logic.logicRemote.onTimeEvent.toServer(callbackObj.logicServerId, key, finishTime, function(e){
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