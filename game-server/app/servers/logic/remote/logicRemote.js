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
	this.cacheService = this.app.get("cacheService")
	this.sessionService = this.app.get("backendSessionService")
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

/**
 * 将玩家踢下线
 * @param uid
 * @param callback
 */
pro.kickPlayer = function(uid, callback){
	var kickPlayer = Promise.promisify(this.sessionService.kickByUid, this)
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		return kickPlayer(doc.frontServerId, doc._id)
	}, function(){
		return Promise.resolve()
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}