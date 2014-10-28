"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Promise = require("bluebird")
var _ = require("underscore")

module.exports = function(app) {
	return new LogicRemote(app)
}

var LogicRemote = function(app) {
	this.app = app
	this.callbackService = app.get("callbackService")
	this.playerService = app.get("playerService")
	this.sessionService = app.get("sessionService")
}

var pro = LogicRemote.prototype

/**
 * 将玩家踢下线
 * @param uid
 * @param callback
 */
pro.kickPlayer = function(uid, callback){
	this.sessionService.kick(uid, callback)
}

/**
 * 执行时间回调
 * @param key
 * @param finishTime
 * @param callback
 */
pro.onTimeEvent = function(key, finishTime, callback){
	this.playerService.onTimeEvent(key, finishTime, callback)
}