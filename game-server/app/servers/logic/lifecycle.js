"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var PushService = require("../../services/pushService")
var LogService = require("../../services/logService")
var ApnService = require("../../services/apnService")
var DataService = require("../../services/dataService")
var PlayerTimeEventService = require("../../services/playerTimeEventService")
var PlayerApiService = require("../../services/playerApiService")
var PlayerApiService2 = require("../../services/playerApiService2")
var PlayerApiService3 = require("../../services/playerApiService3")
var PlayerApiService4 = require("../../services/playerApiService4")
var PlayerApiService5 = require("../../services/playerApiService5")
var PlayerIAPService = require("../../services/playerIAPService")
var AllianceTimeEventService = require("../../services/allianceTimeEventService")
var AllianceApiService = require("../../services/allianceApiService")
var AllianceApiService2 = require("../../services/allianceApiService2")
var AllianceApiService3 = require("../../services/allianceApiService3")
var AllianceApiService4 = require("../../services/allianceApiService4")
var AllianceApiService5 = require("../../services/allianceApiService5")
var TimeEventService = require("../../services/timeEventService")
var Deal = require("../../domains/deal")
var Billing = require("../../domains/billing")
var GemUse = require("../../domains/gemUse")
var GemAdd = require("../../domains/gemAdd")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("Deal", Promise.promisifyAll(Deal))
	app.set("Billing", Promise.promisifyAll(Billing))
	app.set("GemUse", Promise.promisifyAll(GemUse))
	app.set("GemAdd", Promise.promisifyAll(GemAdd))

	app.set("logService", Promise.promisifyAll(new LogService(app)))
	app.set("channelService", Promise.promisifyAll(app.get("channelService")))
	app.set("apnService", new ApnService(app))
	app.set("dataService", Promise.promisifyAll(new DataService(app)))
	app.set("pushService", Promise.promisifyAll(new PushService(app)))
	app.set("timeEventService", Promise.promisifyAll(new TimeEventService(app)))
	app.set("playerTimeEventService", Promise.promisifyAll(new PlayerTimeEventService(app)))
	app.set("allianceTimeEventService", Promise.promisifyAll(new AllianceTimeEventService(app)))
	app.set("playerApiService", Promise.promisifyAll(new PlayerApiService(app)))
	app.set("playerApiService2", Promise.promisifyAll(new PlayerApiService2(app)))
	app.set("playerApiService3", Promise.promisifyAll(new PlayerApiService3(app)))
	app.set("playerApiService4", Promise.promisifyAll(new PlayerApiService4(app)))
	app.set("playerApiService5", Promise.promisifyAll(new PlayerApiService5(app)))
	app.set("playerIAPService", Promise.promisifyAll(new PlayerIAPService(app)))
	app.set("allianceApiService", Promise.promisifyAll(new AllianceApiService(app)))
	app.set("allianceApiService2", Promise.promisifyAll(new AllianceApiService2(app)))
	app.set("allianceApiService3", Promise.promisifyAll(new AllianceApiService3(app)))
	app.set("allianceApiService4", Promise.promisifyAll(new AllianceApiService4(app)))
	app.set("allianceApiService5", Promise.promisifyAll(new AllianceApiService5(app)))

	console.log(app.getCurServer(), "11111111111111")
	console.log(app.getServersByType())

	callback()
}

life.afterStartup = function(app, callback){
	var logicServer = app.getCurServer()
	var chatServer = _.find(app.getServersByType("chat"), function(server){
		return _.isEqual(logicServer.usedFor, server.usedFor)
	})
	var eventServer = _.find(app.getServersByType("event"), function(server){
		return _.isEqual(logicServer.usedFor, server.usedFor)
	})
	var cacheServer = _.find(app.getServersByType("cache"), function(server){
		return _.isEqual(logicServer.usedFor, server.id)
	})
	var logicServerId = logicServer.id
	var chatServerId = chatServer.id
	var eventServerId = eventServer.id
	var cacheServerId = cacheServer.id
	app.set("logicServerId", logicServerId)
	app.set("chatServerId", chatServerId)
	app.set("eventServerId", eventServerId)
	app.set("cacheServerId", cacheServerId)

	callback()
}

life.beforeShutdown = function(app, callback, cancelShutDownTimer){
	cancelShutDownTimer()
	var sessionService = app.get("sessionService")
	var kickAsync = Promise.promisify(sessionService.kick, sessionService)
	var uids = _.keys(sessionService.service.uidMap)
	var funcs = []
	_.each(uids, function(uid){
		funcs.push(kickAsync(uid, "服务器关闭"))
	})
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		app.get("logService").onEventError("logic.lifecycle.beforeShutdown", {}, e.stack)
	})
}

life.afterStartAll = function(app){

}