"use strict"

/**
 * Created by modun on 14-10-28.
 */

var _ = require("underscore")
var Promise = require("bluebird")


var TimeEventService = function(app){
	this.app = app
}

module.exports = TimeEventService
var pro = TimeEventService.prototype



/**
 * 添加时间回调
 * @param key
 * @param eventServerId
 * @param logicServerId
 * @param finishTime
 * @param callback
 */
pro.addTimeEvent = function(key, eventServerId, logicServerId, finishTime, callback){
	this.app.rpc.event.eventRemote.addTimeEvent.toServer(eventServerId, key, logicServerId, finishTime, Date.now(), callback)
}

/**
 * 移除时间回调
 * @param key
 * @param eventServerId
 * @param finishTime
 * @param callback
 */
pro.removeTimeEvent = function(key, eventServerId, finishTime, callback){
	this.app.rpc.event.eventRemote.removeTimeEvent.toServer(eventServerId, key, finishTime, callback)
}

/**
 * 更新时间回调
 * @param key
 * @param eventServerId
 * @param oldFinishTime
 * @param newFinishTime
 * @param callback
 */
pro.updateTimeEvent = function(key, eventServerId, oldFinishTime, newFinishTime, callback){
	this.app.rpc.event.eventRemote.updateTimeEvent.toServer(eventServerId, key, oldFinishTime, newFinishTime, Date.now(), callback)
}

/**
 * 清除指定Key的时间回调
 * @param key
 * @param eventServerId
 * @param callback
 */
pro.clearTimeEvents = function(key, eventServerId, callback){
	this.app.rpc.event.eventRemote.clearTimeEventsByKey.toServer(eventServerId, key, callback)
}

/**
 * 添加玩家时间回调
 * @param playerDoc
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addPlayerTimeEvent = function(playerDoc, finishTime, callback){
	if(!_.isEmpty(playerDoc.logicServerId)){
		var key = Consts.TimeEventType.Player + "_" + playerDoc._id
		this.addTimeEvent(key, playerDoc.eventServerId, playerDoc.logicServerId, finishTime, callback)
	}else{
		callback()
	}
}

/**
 * 移除玩家时间回调
 * @param playerDoc
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.removePlayerTimeEvent = function(playerDoc, finishTime, callback){
	if(!_.isEmpty(playerDoc.logicServerId)){
		var key = Consts.TimeEventType.Player + "_" + playerDoc._id
		this.removeTimeEvent(key, playerDoc.eventServerId, finishTime, callback)
	}else{
		callback()
	}
}

/**
 * 更新玩家时间回调
 * @param playerDoc
 * @param oldFinishTime
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updatePlayerTimeEvent = function(playerDoc, oldFinishTime, newFinishTime, callback){
	if(!_.isEmpty(playerDoc.logicServerId)){
		var key = Consts.TimeEventType.Player + "_" + playerDoc._id
		this.updateTimeEvent(key, playerDoc.eventServerId, oldFinishTime, newFinishTime, callback)
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
		this.clearTimeEvents(key, playerDoc.eventServerId, callback)
	}else{
		callback()
	}
}

/**
 * 添加联盟时间回调
 * @param allianceDoc
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addAllianceTimeEvent = function(allianceDoc, finishTime, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.addTimeEvent(key, "event-server-1", "logic-server-1", finishTime, callback)
}

/**
 * 移除联盟时间回调
 * @param allianceDoc
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.removeAllianceTimeEvent = function(allianceDoc, finishTime, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.removeTimeEvent(key, "event-server-1", finishTime, callback)
}

/**
 * 更新联盟时间回调
 * @param allianceDoc
 * @param oldFinishTime
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updateAllianceTimeEvent = function(allianceDoc, oldFinishTime, newFinishTime, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.updateTimeEvent(key, "event-server-1", oldFinishTime, newFinishTime, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param allianceDoc
 * @param callback
 * @returns {*}
 */
pro.clearAllianceTimeEvents = function(allianceDoc, callback){
	var key = Consts.TimeEventType.Alliance + "_" + allianceDoc._id
	this.clearTimeEvents(key, "event-server-1", callback)
}
