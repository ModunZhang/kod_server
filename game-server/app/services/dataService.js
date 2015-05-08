"use strict"

/**
 * Created by modun on 15/3/6.
 */
var _ = require("underscore")
var Promise = require("bluebird")

var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")

var DataService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.cacheServerId = app.get("cacheServerId")
	this.chatServerId = app.get("chatServerId")
	this.eventServerId = app.get("eventServerId")
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
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindPlayer = function(id, callback){
	this.app.rpc.cache.cacheRemote.directFindPlayer.toServer(this.cacheServerId, id, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 按Id查询玩家
 * @param id
 * @param force
 * @param callback
 */
pro.findPlayer = function(id, force, callback){
	if(arguments.length == 2){
		callback = force
		force = false
	}
	this.app.rpc.cache.cacheRemote.findPlayer.toServer(this.cacheServerId, id, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象
 * @param doc
 * @param data
 * @param callback
 */
pro.updatePlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.updatePlayer.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param doc
 * @param data
 * @param callback
 */
pro.flushPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flushPlayer.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家并同步到Mongo最后将玩家从内存移除
 * @param doc
 * @param data
 * @param callback
 */
pro.timeoutPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.timeoutPlayer.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 创建联盟对象
 * @param alliance
 * @param callback
 */
pro.createAlliance = function(alliance, callback){
	this.app.rpc.cache.cacheRemote.createAlliance.toServer(this.cacheServerId, alliance, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 按Id直接查询联盟,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindAlliance = function(id, callback){
	this.app.rpc.cache.cacheRemote.directFindAlliance.toServer(this.cacheServerId, id, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 按Id查询联盟
 * @param id
 * @param force
 * @param callback
 */
pro.findAlliance = function(id, force, callback){
	if(arguments.length == 2){
		callback = force
		force = false
	}
	this.app.rpc.cache.cacheRemote.findAlliance.toServer(this.cacheServerId, id, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新联盟对象
 * @param doc
 * @param data
 * @param callback
 */
pro.updateAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.updateAlliance.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param doc
 * @param data
 * @param callback
 */
pro.flushAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flushAlliance.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param doc
 * @param data
 * @param callback
 */
pro.timeoutAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.timeoutAlliance.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, this)
	var addToEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.addToAllianceChannel.toServer, this)
	var addToLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(addToEventChannelAsync(this.eventServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	_.each(this.logicServers, function(server){
		funcs.push(addToLogicChannelAsync(server.id, allianceId, playerDoc._id, playerDoc.logicServerId))
	})
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		self.logService.onEventError("logic.dataService.addPlayerToAllianceChannel", {allianceId:allianceId, playerId:playerDoc._id}, e.stack)
		callback()
	})
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, this)
	var removeFromEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.removeFromAllianceChannel.toServer, this)
	var removeFromLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(removeFromEventChannelAsync(this.eventServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	_.each(this.logicServers, function(server){
		funcs.push(removeFromLogicChannelAsync(server.id, allianceId, playerDoc._id, playerDoc.logicServerId))
	})
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		self.logService.onEventError("logic.dataService.removePlayerFromAllianceChannel", {allianceId:allianceId, playerId:playerDoc._id}, e.stack)
		callback()
	})
}

/**
 * 将玩家添加到所有频道中
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToChannels = function(playerDoc, callback){
	var self = this
	var addToChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToChatChannel.toServer, this)
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, this)
	var addToEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.addToAllianceChannel.toServer, this)
	var addToLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId))
	if(_.isString(playerDoc.allianceId)){
		funcs.push(addToChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(addToEventChannelAsync(this.eventServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		_.each(this.logicServers, function(server){
			funcs.push(addToLogicChannelAsync(server.id, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		})
	}
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		self.logService.onEventError("logic.dataService.addPlayerToChannels", {playerId:playerDoc._id}, e.stack)
		callback()
	})
}

/**
 * 将玩家从所有频道中移除
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromChannels = function(playerDoc, callback){
	var self = this
	var removeFromChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromChatChannel.toServer, this)
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, this)
	var removeFromEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.removeFromAllianceChannel.toServer, this)
	var removeFromLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId))
	if(_.isString(playerDoc.allianceId)){
		funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(removeFromEventChannelAsync(this.eventServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		_.each(this.logicServers, function(server){
			funcs.push(removeFromLogicChannelAsync(server.id, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		})
	}
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		self.logService.onEventError("logic.dataService.removePlayerFromChannels", {playerId:playerDoc._id}, e.stack)
		callback()
	})
}