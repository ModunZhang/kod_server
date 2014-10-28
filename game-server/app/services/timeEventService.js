"use strict"

/**
 * Created by modun on 14-10-28.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var TimeEventService = function(app){
	this.app = app
	this.eventServerId = "event-server-1"
}

module.exports = TimeEventService
var pro = TimeEventService.prototype


/**
 * 添加时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 */
pro.addTimeEvent = function(key, eventType, eventId, finishTime, callback){
	this.app.rpc.event.eventRemote.addTimeEvent.toServer(key, eventType, eventId, finishTime - Date.now(), callback)
}

/**
 * 移除时间回调
 * @param eventServerId
 * @param key
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(eventServerId, key, eventId, callback){
	this.app.rpc.event.eventRemote.removeTimeEvent.toServer(eventServerId, key, eventId, callback)
}

/**
 * 更新时间回调
 * @param key
 * @param eventServerId
 * @param eventId
 * @param newFinishTime
 * @param callback
 */
pro.updateTimeEvent = function(eventServerId, key, eventId, newFinishTime, callback){
	this.app.rpc.event.eventRemote.updateTimeEvent.toServer(eventServerId, key, eventId, newFinishTime - Date.now(), callback)
}

/**
 * 清除指定Key的时间回调
 * @param eventServerId
 * @param key
 * @param callback
 */
pro.clearTimeEvents = function(eventServerId, key, callback){
	this.app.rpc.event.eventRemote.clearTimeEventsByKey.toServer(eventServerId, key, callback)
}


/**
 * 添加玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addPlayerTimeEvent = function(playerDoc, eventType, eventId, finishTime, callback){
	if(!_.isEmpty(playerDoc.logicServerId)){
		var key = Consts.TimeEventType.Player + "_" + playerDoc._id
		this.addTimeEvent(playerDoc.eventServerId, playerDoc.logicServerId, key, eventType, eventId, finishTime, callback)
	}else{
		callback()
	}
}

/**
 * 移除玩家时间回调
 * @param playerDoc
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removePlayerTimeEvent = function(playerDoc, eventId, callback){
	if(!_.isEmpty(playerDoc.logicServerId)){
		var key = Consts.TimeEventType.Player + "_" + playerDoc._id
		this.removeTimeEvent(playerDoc.eventServerId, key, eventId, callback)
	}else{
		callback()
	}
}

/**
 * 更新玩家时间回调
 * @param playerDoc
 * @param eventId
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updatePlayerTimeEvent = function(playerDoc, eventId, newFinishTime, callback){
	if(!_.isEmpty(playerDoc.logicServerId)){
		var key = Consts.TimeEventType.Player + "_" + playerDoc._id
		this.updateTimeEvent(playerDoc.eventServerId, key, eventId, newFinishTime, callback)
	}else{
		callback()
	}
}

/**
 * 清除指定玩家的全部时间回调
 * @param playerDoc
 * @param callback
 * @returns {*}
 */
pro.clearPlayerTimeEvents = function(playerDoc, callback){
	if(!_.isEmpty(playerDoc.logicServerId)){
		var key = Consts.TimeEventType.Player + "_" + playerDoc._id
		this.clearTimeEvents(playerDoc.eventServerId, key, callback)
	}else{
		callback()
	}
}

/**
 * 添加联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addAllianceTimeEvent = function(allianceDoc, eventType, eventId, finishTime, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.addTimeEvent("event-server-1", "logic-server-1", key, eventType, eventId, finishTime, callback)
}

/**
 * 移除联盟时间回调
 * @param allianceDoc
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removeAllianceTimeEvent = function(allianceDoc, eventId, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.removeTimeEvent("event-server-1", key, eventId, callback)
}

/**
 * 更新联盟时间回调
 * @param allianceDoc
 * @param eventId
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updateAllianceTimeEvent = function(allianceDoc, eventId, newFinishTime, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.updateTimeEvent("event-server-1", key, eventId, newFinishTime, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param allianceDoc
 * @param callback
 * @returns {*}
 */
pro.clearAllianceTimeEvents = function(allianceDoc, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.clearTimeEvents("event-server-1", key, callback)
}