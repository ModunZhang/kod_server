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
	this.playerService = this.app.get("playerService")
	this.sessionService = this.app.get("sessionService")
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