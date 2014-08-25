"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var utils = require("../../../utils/utils")

module.exports = function(app) {
	return new LogicRemote(app)
}

var LogicRemote = function(app) {
	this.app = app
	this.playerService = this.app.get("playerService")
	this.cacheService = this.app.get("cacheService")
}

var pro = LogicRemote.prototype

/**
 * 玩家登陆到后端逻辑服
 * @param uid
 * @param frontServerId
 * @param callback
 */
pro.login = function(uid, frontServerId, callback){
	this.playerService.playerLoginAsync(uid, frontServerId).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 玩家从后端逻辑服登出
 * @param uid
 * @param frontServerId
 * @param callback
 */
pro.logout = function(uid, frontServerId, callback){
	this.playerService.playerLogoutAsync(uid, frontServerId).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取玩家信息
 * @param uid
 * @param callback
 */
pro.getPlayerInfo = function(uid, callback){
	this.cacheService.getPlayer(uid, callback)
}