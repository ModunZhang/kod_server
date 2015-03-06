"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var PushService = require("../../services/pushService")
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
var AllianceDao = require("../../dao/allianceDao")
var PlayerDao = require("../../dao/playerDao")
var Alliance = require("../../domains/alliance")
var Player = require("../../domains/player")
var Deal = require("../../domains/deal")
var Billing = require("../../domains/billing")
var Device = require("../../domains/device")
var User = require("../../domains/user")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Deal", Promise.promisifyAll(Deal))
	app.set("Billing", Promise.promisifyAll(Billing))
	app.set("Device", Promise.promisifyAll(Device))
	app.set("User", Promise.promisifyAll(User))
	app.set("allianceDao", Promise.promisifyAll(new AllianceDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("playerDao", Promise.promisifyAll(new PlayerDao(app.get("redis"), app.get("scripto"), app.get("env"))))

	app.set("channelService", Promise.promisifyAll(app.get("channelService")))
	app.set("globalChannelService", Promise.promisifyAll(app.get("globalChannelService")))

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

life.beforeShutdown = function(app, callback){
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
		errorLogger.error("handle logicServer.lifecycle: beforeShutdown Error -----------------------------")
		errorLogger.error(e.stack)
		errorMailLogger.error("handle logicServer.lifecycle: beforeShutdown Error -----------------------------")
		errorMailLogger.error(e.stack)
		callback()
	})
}

life.afterStartAll = function(app){

}