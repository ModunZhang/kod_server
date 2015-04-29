"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")

var Player = require("../../domains/player")
var Device = require("../../domains/device")
var LogService = require("../../services/logService")
var GateService = require("../../services/gateService")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Device", Promise.promisifyAll(Device))
	app.set("logService", new LogService(app))
	app.set("gateService", new GateService(app))

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
	app.get("gateService").init()
}