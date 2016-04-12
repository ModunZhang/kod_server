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
	var cacheServer = _.find(this.app.getServersByType("cache"), function(server){
		return server.id === cacheServerId;
	})
	if(!cacheServer) return null;

	var logicServers = _.filter(this.app.getServersByType("logic"), function(server){
		return server.host === cacheServer.host;
	})
	return logicServers.length > 0 ? logicServers[_.random(0, logicServers.length - 1)] : null;
}

/**
 * 获取推荐的服务器
 * @returns {*}
 */
pro.getPromotedServer = function(){
	var servers = this.app.getServersByType("cache");
	servers = _.sortBy(servers, function(server){
		return -server.port;
	})
	return servers.length > 0 ?  servers[0] : null;
}