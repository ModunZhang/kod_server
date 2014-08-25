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
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("pushService", new PushService(app))
	app.set("callbackService", new CallbackService(app))
	app.set("cacheService", Promise.promisifyAll(new CacheService()))
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))

	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	var cacheService = app.get("cacheService")
	cacheService.saveAllCachesAsync().then(function(){
		callback()
	}).catch(function(e){
		errorLogger.error("handle beforeShutdown Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", app.get("env"))){
			errorMailLogger.error("handle beforeShutdown Error -----------------------------")
			errorMailLogger.error(e.stack)
		}

		callback()
	})
}

life.afterStartAll = function(app){

}