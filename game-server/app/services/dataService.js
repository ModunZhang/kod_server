"use strict"

/**
 * Created by modun on 15/3/6.
 */

var LogicUtils = require("../utils/logicUtils")

var DataService = function(app){
	this.app = app
	this.cacheServerId = app.get("cacheServerId")
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 创建玩家对象
 * @param player
 * @param callback
 */
pro.createPlayer = function(player, callback){
	this.app.rpc.cache.cacheRemote.createPlayer.toServer(this.cacheServerId, player, callback)
}

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindPlayer = function(id, callback){
	this.app.rpc.cache.cacheRemote.directFindPlayer.toServer(this.cacheServerId, id, callback)
}

/**
 * 按Id查询玩家
 * @param id
 * @param callback
 */
pro.findPlayer = function(id, callback){
	this.app.rpc.cache.cacheRemote.findPlayer.toServer(this.cacheServerId, id, callback)
}

/**
 * 更新玩家对象
 * @param doc
 * @param data
 * @param callback
 */
pro.updatePlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.updatePlayer.toServer(this.cacheServerId, doc._id, doc, callback)
}

/**
 * 更新玩家对象并同步到Mongo
 * @param doc
 * @param data
 * @param callback
 */
pro.flashPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flashPlayer.toServer(this.cacheServerId, doc._id, doc, callback)
}

/**
 * 创建联盟对象
 * @param id
 * @param alliance
 * @param callback
 */
pro.createAlliance = function(id, alliance, callback){
	alliance.serverId = this.cacheServerId
	this.app.rpc.cache.cacheRemote.createAlliance.toServer(this.cacheServerId, alliance, callback)
}

/**
 * 按Id直接查询联盟,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindAlliance = function(id, callback){
	this.app.rpc.cache.cacheRemote.directFindAlliance.toServer(this.cacheServerId, id, callback)
}

/**
 * 按Id查询联盟
 * @param id
 * @param callback
 */
pro.findAlliance = function(id, callback){
	this.app.rpc.cache.cacheRemote.findAlliance.toServer(this.cacheServerId, id, callback)
}

/**
 * 更新联盟对象
 * @param doc
 * @param data
 * @param callback
 */
pro.updateAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.updateAlliance.toServer(this.cacheServerId, doc._id, doc, callback)
}

/**
 * 更新玩家对象并同步到Mongo
 * @param doc
 * @param data
 * @param callback
 */
pro.flashAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flashAlliance.toServer(this.cacheServerId, doc._id, doc, callback)
}