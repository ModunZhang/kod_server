"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")

var LogService = require("../../services/logService")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("logService", Promise.promisifyAll(new LogService(app)))
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