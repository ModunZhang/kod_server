"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")

var LogService = require("../../services/logService")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("logService", new LogService(app))

	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
	setTimeout(callback, 1000)
}

life.afterStartAll = function(app){
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
}