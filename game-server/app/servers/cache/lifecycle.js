"use strict"

/**
* Created by modun on 14-8-9.
*/
var _ = require("underscore")
var Promise = require("bluebird")

var LogService = require("../../services/logService")
var CacheService = require("../../services/cacheService")
var TimeEventService = require("../../services/timeEventService")
var PlayerTimeEventService = require("../../services/playerTimeEventService")
var ServerState = require("../../domains/serverState")
var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")
var Consts = require("../../consts/consts")

var life = module.exports

life.beforeStartup = function(app, callback){
	var currentServer = app.getServerFromConfig(app.getServerId())
	app.set("cacheServerId", currentServer.id)
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "chat") && _.isEqual(server.usedFor, currentServer.id)){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "event") && _.isEqual(server.usedFor, currentServer.id)){
			app.set("eventServerId", id)
		}else if(_.isEqual(server.serverType, "gate")){
			app.set("gateServerId", id)
		}
	})

	app.set("ServerState", Promise.promisifyAll(ServerState))
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("logService", Promise.promisifyAll(new LogService(app)))
	app.set("timeEventService", Promise.promisifyAll(new TimeEventService(app)))
	app.set("playerTimeEventService", Promise.promisifyAll(new PlayerTimeEventService(app)))
	app.set("cacheService", Promise.promisifyAll(new CacheService(app)))
	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback, cancelShutDownTimer){
	cancelShutDownTimer()
	var cacheService = app.get("cacheService")
	var logService = app.get("logService")
	logService.onEvent("cache.lifecycle.beforeShutdown start persistence data", {})

	app.get("ServerState").createAsync({type:Consts.ServerState.Stop}).then(function(){
		return cacheService.timeoutAllAlliancesAsync()
	}).then(function(){
		return cacheService.timeoutAllPlayersAsync()
	}).then(function(){
		logService.onEvent("cache.lifecycle.beforeShutdown persistence data finished", {})
		callback()
	}).catch(function(e){
		logService.onEventError("cache.lifecycle.beforeShutdown", {}, e.stack)
		callback()
	})
}

life.afterStartAll = function(app){
	var cacheServerId = app.getServerId()
	var logicServers = app.getServersByType("logic")
	var funcs = []
	var setServerStatusAsync = Promise.promisify(app.rpc.logic.logicRemote.setServerStatus.toServer)
	_.each(logicServers, function(server){
		if(_.isEqual(server.usedFor, cacheServerId)){
			funcs.push(setServerStatusAsync(server.id, true))
		}
	})
	Promise.all(funcs).then(function(){
		app.get("logService").onEvent("server start finished", {})
	})
}