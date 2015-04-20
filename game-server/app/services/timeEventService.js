"use strict"

/**
 * Created by modun on 14-10-28.
 */

var _ = require("underscore")
var Consts = require("../consts/consts")


var TimeEventService = function(app){
	this.app = app
	this.eventServerId = app.get("eventServerId")
	this.isEventServer = _.isEqual(this.eventServerId, app.getServerId())
	this.logService = app.get("logService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.allianceTimeEventService = app.get("allianceTimeEventService")
	this.timeouts = {}
}
module.exports = TimeEventService
var pro = TimeEventService.prototype



/**
 * 添加时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 */
pro.addTimeEvent = function(key, eventType, eventId, timeInterval, callback){
	if(this.isEventServer){
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
	}else{

	}
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
 * 添加玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param interval
 * @param callback
 * @returns {*}
 */
pro.addPlayerTimeEvent = function(playerDoc, eventType, eventId, interval, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.addTimeEvent(key, eventType, eventId, interval, callback)
}

/**
 * 移除玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removePlayerTimeEvent = function(playerDoc, eventType, eventId, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.removeTimeEvent(key, eventType, eventId, callback)
}

/**
 * 更新玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param interval
 * @param callback
 * @returns {*}
 */
pro.updatePlayerTimeEvent = function(playerDoc, eventType, eventId, interval, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.updateTimeEvent(key, eventType, eventId, interval, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param playerDoc
 * @param callback
 * @returns {*}
 */
pro.clearPlayerTimeEvents = function(playerDoc, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.clearTimeEvents(key, callback)
}

/**
 * 添加联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param interval
 * @param callback
 * @returns {*}
 */
pro.addAllianceTimeEvent = function(allianceDoc, eventType, eventId, interval, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.addTimeEvent(key, eventType, eventId, interval, callback)
}

/**
 * 移除联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removeAllianceTimeEvent = function(allianceDoc, eventType, eventId, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.removeTimeEvent(key, eventType, eventId, callback)
}

/**
 * 更新联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param interval
 * @param callback
 * @returns {*}
 */
pro.updateAllianceTimeEvent = function(allianceDoc, eventType, eventId, interval, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.updateTimeEvent(key, eventType, eventId, interval, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param allianceDoc
 * @param callback
 * @returns {*}
 */
pro.clearAllianceTimeEvents = function(allianceDoc, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.clearTimeEvents(key, callback)
}

/**
 * 添加联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param interval
 * @param callback
 */
pro.addAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, interval, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.addTimeEvent(key, eventType, eventId, interval, callback)
}

/**
 * 更新联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param interval
 * @param callback
 */
pro.updateAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, interval, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.updateTimeEvent(key, eventType, eventId, interval, callback)
}

/**
 * 移除联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param callback
 */
pro.removeAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.removeTimeEvent(key, eventType, eventId, callback)
}


/**
 * 恢复玩家事件
 * @param playerDoc
 * @param callback
 */
pro.restorePlayerTimeEvents = function(playerDoc, callback){

}