"use strict"

/**
* Created by modun on 14-8-9.
*/

var Promise = require("bluebird")
var _ = require("underscore")

var PushService = require("../../services/pushService")
var CallbackService = require("../../services/callbackService")
var PlayerService = require("../../services/playerService")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("pushService", Promise.promisifyAll(new PushService(app)))
	app.set("callbackService", Promise.promisifyAll(new CallbackService(app)))
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))

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