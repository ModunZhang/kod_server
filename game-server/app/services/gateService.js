"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var GateService = function(app){
	this.app = app
	this.serverId = app.getServerId()
	this.logService = app.get("logService")
}
module.exports = GateService
var pro = GateService.prototype

/**
 * 获取推荐的逻辑服务器
 * @returns {*}
 */
pro.getLogicServer = function(cacheServerId){
	return _.find(this.app.getServersByType("logic"), function(server){
		return _.isEqual(server.usedFor, cacheServerId)
	})
}

/**
 * 获取服务器列表
 * @param callback
 */
pro.getServers = function(callback){
	var self = this
	var cacheServers = this.app.getServersByType("cache");
	var getServerInfoAsync = Promise.promisify(this.app.rpc.cache.cacheRemote.getServerInfo.toServer, {context:this})
	var updateServerLoginedCountAsync = function(server){
		return getServerInfoAsync(server.id).then(function(serverInfo){
			server.serverInfo = serverInfo
			return Promise.resolve()
		})
	}

	var funcs = []
	_.each(cacheServers, function(server){
		funcs.push(updateServerLoginedCountAsync(server))
	})
	return Promise.all(funcs).then(function(){
		callback(null, cacheServers)
	}).catch(function(e){
		self.logService.onError('gate.gateService.getServers', null, e.stack)
		callback(null, [])
	})
}

/**
 * 获取推荐的服务器
 * @returns {*}
 */
pro.getPromotedServer = function(){
	return _.find(this.app.getServersByType("cache"), function(server){
		return server.isPromoted == "true"
	})
}