"use strict"

/**
 * Created by modun on 14-8-9.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var PushService = require("../../services/pushService")
var LogService = require("../../services/logService")
var DataService = require("../../services/dataService")
var PlayerTimeEventService = require("../../services/playerTimeEventService")
var AllianceTimeEventService = require("../../services/allianceTimeEventService")


var life = module.exports

life.beforeStartup = function(app, callback){
	var currentServer = app.getServerFromConfig(app.getServerId())
	app.set("logicServerId", currentServer.id)
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "chat") && _.isEqual(server.usedFor, currentServer.usedFor)){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "event") && _.isEqual(server.usedFor, currentServer.usedFor)){
			app.set("eventServerId", id)
		}else if(_.isEqual(server.serverType, "cache") && _.isEqual(server.id, currentServer.usedFor)){
			app.set("cacheServerId", id)
		}else if(_.isEqual(server.serverType, "gate")){
			app.set("gateServerId", id)
		}
	})

	app.set("logService", Promise.promisifyAll(new LogService(app)))
	app.set("pushService", Promise.promisifyAll(new PushService(app)))
	app.set("dataService", Promise.promisifyAll(new DataService(app)))
	app.set("playerTimeEventService", Promise.promisifyAll(new PlayerTimeEventService(app)))
	app.set("allianceTimeEventService", Promise.promisifyAll(new AllianceTimeEventService(app)))
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