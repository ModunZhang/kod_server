"use strict"

/**
* Created by modun on 14-8-9.
*/

var Promise = require("bluebird")
var _ = require("underscore")

var PushService = require("../../services/pushService")
var PlayerService = require("../../services/playerService")
var AllianceDao = require("../../dao/allianceDao")
var PlayerDao = require("../../dao/playerDao")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("allianceDao", Promise.promisifyAll(new AllianceDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("playerDao", Promise.promisifyAll(new PlayerDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("pushService", Promise.promisifyAll(new PushService(app)))
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