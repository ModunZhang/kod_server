"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var Consts = require("../../../consts/consts")

module.exports = function(app) {
	return new LogicRemote(app)
}

var LogicRemote = function(app) {
	this.app = app
	this.callbackService = app.get("callbackService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.allianceTimeEventService = app.get("allianceTimeEventService")
	this.sessionService = app.get("sessionService")
}
var pro = LogicRemote.prototype

/**
 * 将玩家踢下线
 * @param uid
 * @param reason
 * @param callback
 */
pro.kickPlayer = function(uid, reason, callback){
	this.sessionService.kick(uid, reason, callback)
}

/**
 * 执行时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.onTimeEvent = function(key, eventType, eventId, callback){
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
 * 设置服务器状态
 * @param status
 * @param callback
 */
pro.setServerStatus = function(status, callback){
	this.app.set("isReady", status)
	callback()
}