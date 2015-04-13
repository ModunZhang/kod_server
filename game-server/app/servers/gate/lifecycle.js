"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")

var LogService = require("../../services/logService")
var GateService = require("../../services/gateService")
var DataService = require("../../services/dataService")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("logService", new LogService(app))
	app.set("gateService", new GateService(app))
	app.set("dataService", Promise.promisifyAll(new DataService(app)))
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