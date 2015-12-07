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
	var cacheServerIds = [];
	_.each(app.getServersFromConfig(), function(server, id){
		if(_.isEqual(server.serverType, 'cache')){
			cacheServerIds.push(id);
		}
	})
	app.set('cacheServerIds', cacheServerIds);

	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))

	app.set("logService", new LogService(app))
	app.set("RankService", Promise.promisifyAll(new RankService(app)))

	callback()
}

life.afterStartup = function(app, callback){
	app.get("RankService").start()
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})

	callback();
}

life.beforeShutdown = function(app, callback){
	app.get("RankService").stop();
	app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
	setTimeout(callback, 1000)
}

life.afterStartAll = function(app){

}