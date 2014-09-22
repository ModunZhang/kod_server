"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var PlayerDao = require("../../dao/playerDao")
var AllianceDao = require("../../dao/allianceDao")

var life = module.exports

life.beforeStartup = function(app, callback){
	var redis = app.get("redis")
	var scripto = app.get("scripto")
	var playerDao = Promise.promisifyAll(new PlayerDao(redis, scripto))
	var allianceDao = Promise.promisifyAll(new AllianceDao(redis, scripto))
	redis.flushallAsync().then(function(){
		return playerDao.loadAllAsync()
	}).then(function(){
			return allianceDao.loadAllAsync()
		}).then(function(){
			callback()
		}).catch(function(e){
			errorLogger.error("handle beforeStartup Error -----------------------------")
			errorLogger.error(e.stack)
			if(_.isEqual("production", app.get("env"))){
				errorMailLogger.error("handle beforeStartup Error -----------------------------")
				errorMailLogger.error(e.stack)
			}
			callback()
		})
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	var redis = app.get("redis")
	var scripto = app.get("scripto")
	var playerDao = Promise.promisifyAll(new PlayerDao(redis, scripto))
	var allianceDao = Promise.promisifyAll(new AllianceDao(redis, scripto))
	playerDao.unloadAllAsync().then(function(){
		return allianceDao.unloadAllAsync()
	}).then(function(){
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