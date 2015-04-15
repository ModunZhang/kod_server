"use strict"

/**
* Created by modun on 14-8-9.
*/

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
	
}