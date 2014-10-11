"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var PlayerService = require("../../services/playerService")

var life = module.exports

life.beforeStartup = function(app, callback){
	var playerService = Promise.promisifyAll(new PlayerService(app))
	app.set("playerService", playerService)
	playerService.loadAllDataAsync().then(function(){
		callback()
	}).catch(function(e){
		errorLogger.error("handle gate.lifecycle:beforeStartup Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", app.get("env"))){
			errorMailLogger.error("handle gate.lifecycle:beforeStartup Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
		callback()
	})
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	var playerService = app.get("playerService")
	playerService.unloadAllDataAsync().then(function(){
		callback()
	}).catch(function(e){
		errorLogger.error("handle gate.lifecycle:beforeShutdown Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", app.get("env"))){
			errorMailLogger.error("handle gate.lifecycle:beforeShutdown Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
		callback()
	})
}

life.afterStartAll = function(app){

}