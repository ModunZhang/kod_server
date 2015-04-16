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
	callback()
}

life.afterStartAll = function(app){
	app.get("gateService").init()
}