"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")

var LogService = require("../../services/logService")
var GateService = require("../../services/gateService")
var PlayerDao = require("../../dao/playerDao")
var Device = require("../../domains/device")
var User = require("../../domains/user")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("Device", Promise.promisifyAll(Device))
	app.set("User", Promise.promisifyAll(User))
	app.set("playerDao", Promise.promisifyAll(new PlayerDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("logService", Promise.promisifyAll(new LogService(app)))
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
	app.get("gateService").start()
}