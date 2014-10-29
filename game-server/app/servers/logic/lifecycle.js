"use strict"

/**
* Created by modun on 14-8-9.
*/

var Promise = require("bluebird")
var _ = require("underscore")

var PushService = require("../../services/pushService")
var PlayerService = require("../../services/playerService")
var AllianceService = require("../../services/allianceService")
var TimeEventService = require("../../services/timeEventService")
var AllianceDao = require("../../dao/allianceDao")
var PlayerDao = require("../../dao/playerDao")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("allianceDao", Promise.promisifyAll(new AllianceDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("playerDao", Promise.promisifyAll(new PlayerDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("pushService", Promise.promisifyAll(new PushService(app)))
	app.set("timeEventService", Promise.promisifyAll(new TimeEventService(app)))
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))
	app.set("allianceService", Promise.promisifyAll(new AllianceService(app)))
	app.set("globalChannelService", Promise.promisifyAll(app.get("globalChannelService")))
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