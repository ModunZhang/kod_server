"use strict"

/**
 * Created by modun on 15/3/6.
 */
var _ = require("underscore")
var Promise = require("bluebird")

var LogicUtils = require("../utils/logicUtils")

var DataService = function(app){
	this.app = app
	this.cacheServerId = app.get("cacheServerId")
	this.logicServers = _.filter(app.getServersFromConfig(), function(server){
		return _.isEqual(server.serverType, "logic") && _.isEqual(server.usedFor, app.get("cacheServerId"))
	})
	this.Player = app.get("Player")
	this.Alliance = app.get("Alliance")
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 获取玩家模型
 * @returns {*|DataService.Player}
 */
pro.getPlayerModel = function(){
	return this.Player
}

/**
 * 获取联盟模型
 * @returns {*|DataService.Alliance}
 */
pro.getAllianceModel = function(){
	return this.Alliance
}

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
pro.flushPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flushPlayer.toServer(this.cacheServerId, doc._id, doc, callback)
}

/**
 * 更新玩家并同步到Mongo最后将玩家从内存移除
 * @param doc
 * @param data
 * @param callback
 */
pro.timeoutPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.timeoutPlayer.toServer(this.cacheServerId, doc._id, doc, callback)
}

/**
 * 创建联盟对象
 * @param alliance
 * @param callback
 */
pro.createAlliance = function(alliance, callback){
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
pro.flushAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flushAlliance.toServer(this.cacheServerId, doc._id, doc, callback)
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param doc
 * @param data
 * @param callback
 */
pro.timeoutAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.timeoutAlliance.toServer(this.cacheServerId, doc._id, doc, callback)
}

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.addPlayerToAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	var funcs = []
	var addToEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.addToAllianceChannel.toServer, this)
	var addToLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.addToAllianceChannel.toServer, this)

	funcs.push(addToEventChannelAsync(this.app.get("eventServerId"), allianceId, playerId, logicServerId))
	_.each(this.logicServers, function(server){
		funcs.push(addToLogicChannelAsync(server.id, allianceId, playerId, logicServerId))
	})

	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.removePlayerFromAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	var funcs = []
	var removeFromEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.removeFromAllianceChannel.toServer, this)
	var removeFromLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.removeFromAllianceChannel.toServer, this)

	funcs.push(removeFromEventChannelAsync(this.app.get("eventServerId"), allianceId, playerId, logicServerId))
	_.each(this.logicServers, function(server){
		funcs.push(removeFromLogicChannelAsync(server.id, allianceId, playerId, logicServerId))
	})

	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}