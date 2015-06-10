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
var Consts = require("../../consts/consts")

var Deal = require("../../domains/deal")
var Billing = require("../../domains/billing")
var GemUse = require("../../domains/gemUse")
var GemAdd = require("../../domains/gemAdd")
var Device = require("../../domains/device")
var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")

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
		}else if(_.isEqual(server.serverType, "rank") && _.isEqual(server.usedFor, currentServer.usedFor)){
			app.set("rankServerId", id)
		}else if(_.isEqual(server.serverType, "cache") && _.isEqual(server.id, currentServer.usedFor)){
			app.set("cacheServerId", id)
		}else if(_.isEqual(server.serverType, "gate")){
			app.set("gateServerId", id)
		}
	})

	app.set("Deal", Promise.promisifyAll(Deal))
	app.set("Billing", Promise.promisifyAll(Billing))
	app.set("GemUse", Promise.promisifyAll(GemUse))
	app.set("GemAdd", Promise.promisifyAll(GemAdd))
	app.set("Device", Promise.promisifyAll(Device))
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))

	app.set("logService", new LogService(app))
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

	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback, cancelShutDownTimer){
	cancelShutDownTimer()
	app.set("serverStatus", Consts.ServerStatus.Stoping)
	var sessionService = app.get("sessionService")
	var kickAsync = Promise.promisify(sessionService.kick, sessionService)
	var uids = _.keys(sessionService.service.uidMap)
	app.set("membersCount", uids.length)
	var funcs = []
	_.each(uids, function(uid){
		funcs.push(kickAsync(uid, "服务器关闭"))
	})
	Promise.all(funcs).then(function(){
		var interval = setInterval(function(){
			if(app.get("membersCount") == 0){
				clearInterval(interval)
				app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
				setTimeout(callback, 1000)
			}
		}, 1000)
	}).catch(function(e){
		app.get("logService").onEventError("server stoped", {serverId:app.getServerId()}, e.stack)
		setTimeout(callback, 1000)
	})
}

life.afterStartAll = function(app){
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
}