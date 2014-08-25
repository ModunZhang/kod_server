"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var PlayerService = require("../../services/playerService")
var PushService = require("../../services/pushService")
var CallbackService = require("../../services/callbackService")
var CacheService = require("../../services/cacheService")
var Consts = require("../../consts/consts")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

var life = module.exports

life.beforeStartup = function(app, cb){
	app.set("pushService", new PushService(app))
	app.set("callbackService", new CallbackService(app))
	app.set("cacheService", Promise.promisifyAll(new CacheService()))
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))

	cb()
}

life.afterStartup = function(app, cb){
	cb()
}

life.beforeShutdown = function(app, cb){
	cb()
}

life.afterStartAll = function(app){

}