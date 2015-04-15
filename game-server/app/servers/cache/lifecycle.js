"use strict"

/**
* Created by modun on 14-8-9.
*/
var _ = require("underscore")
var Promise = require("bluebird")

var LogService = require("../../services/logService")
var CacheService = require("../../services/cacheService")
var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("logService", Promise.promisifyAll(new LogService(app)))
	app.set("cacheService", Promise.promisifyAll(new CacheService(app)))
	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	callback()
}

life.afterStartAll = function(app){
	var serverId = app.getServerId()
	var logicServers = app.getServersByType("logic")
	var funcs = []
	var setServerStatusAsync = Promise.promisify(app.rpc.logic.logicRemote.setServerStatus.toServer)
	_.each(logicServers, function(server){
		if(_.isEqual(server.usedFor, serverId)){
			funcs.push(setServerStatusAsync(server.id, true))
		}
	})
	Promise.all(funcs).then(function(){
		app.get("logService").onEvent("server start finished", {})
	})
}