"use strict"

/**
 * Created by modun on 14-8-9.
 */
var _ = require("underscore")
var Promise = require("bluebird")

var LogService = require("../../services/logService")
var RankService = require("../../services/rankService")
var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")

var life = module.exports

life.beforeStartup = function(app, callback){
	var currentServer = app.getServerFromConfig(app.getServerId())
	app.set("eventServerId", currentServer.id)
	app.set('cacheServerId', currentServer.usedFor);

	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("RankService", Promise.promisifyAll(new RankService(app)))
	app.set("logService", new LogService(app))

	callback()
}

life.afterStartup = function(app, callback){
	app.get("RankService").start(callback)
}

life.beforeShutdown = function(app, callback){
	app.get("RankService").stop(function(){
		app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
		setTimeout(callback, 1000)
	})
}

life.afterStartAll = function(app){
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
}