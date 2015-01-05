"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var logicLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic", __filename)
var AllianceDao = require("../../dao/allianceDao")
var PlayerDao = require("../../dao/playerDao")
var DbUtils = Promise.promisifyAll(require("../../utils/dbUtils"))
var LogicUtils = require("../../utils/logicUtils")
var DataUtils = require("../../utils/dataUtils")
var Consts = require("../../consts/consts")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("allianceDao", Promise.promisifyAll(new AllianceDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("playerDao", Promise.promisifyAll(new PlayerDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("channelService", Promise.promisifyAll(app.get("channelService")))
	app.set("globalChannelService", Promise.promisifyAll(app.get("globalChannelService")))

	DbUtils.loadAllDataAsync(app.get("redis"), app.get("playerDao"), app.get("allianceDao")).then(function(){
		callback()
	}).catch(function(e){
		errorLogger.error("handle time.lifecycle:beforeStartup Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", app.get("env"))){
			errorMailLogger.error("handle time.lifecycle:beforeStartup Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
		callback()
	})
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	DbUtils.unloadAllDataAsync(app.get("playerDao"), app.get("allianceDao")).then(function(){
		callback()
	})
}

life.afterStartAll = function(app){
	setTimeout(function(){
		var playerDocs = null
		var allianceDocs = null
		var eventServerId = "event-server-1"
		var now = Date.now()
		var addTimeEventAsync = Promise.promisify(app.rpc.event.eventRemote.addTimeEvent.toServer)
		var eventFuncs = []
		logicLogger.info("start restoring data")
		app.get("playerDao").findAllAsync().then(function(docs){
			playerDocs = docs
			return app.get("allianceDao").findAllAsync()
		}).then(function(docs){
			allianceDocs = docs
		}).then(function(){
			_.each(playerDocs, function(playerDoc){
				_.each(playerDoc.buildingEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "buildingEvents", event.id, event.finishTime - event.startTime))
				})
				_.each(playerDoc.houseEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "houseEvents", event.id, event.finishTime - event.startTime))
				})
				_.each(playerDoc.towerEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "towerEvents", event.id, event.finishTime - event.startTime))
				})
				_.each(playerDoc.wallEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "wallEvents", event.id, event.finishTime - event.startTime))
				})
				_.each(playerDoc.materialEvents, function(event){
					if(event.finishTime > 0){
						event.finishTime = now + (event.finishTime - event.startTime)
						event.startTime = now
						eventFuncs.push(addTimeEventAsync(eventServerId, key, "materialEvents", event.id, event.finishTime - event.startTime))
					}
				})
				_.each(playerDoc.soldierEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "soldierEvents", event.id, event.finishTime - event.startTime))
				})
				_.each(playerDoc.dragonEquipmentEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "dragonEquipmentEvents", event.id, event.finishTime - event.startTime))
				})
				_.each(playerDoc.treatSoldierEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "treatSoldierEvents", event.id, event.finishTime - event.startTime))
				})
				_.each(playerDoc.coinEvents, function(event){
					event.finishTime = now + (event.finishTime - event.startTime)
					event.startTime = now
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "coinEvents", event.id, event.finishTime - event.startTime))
				})
				LogicUtils.refreshPlayerPower(playerDoc)
			})
		}).then(function(){
			return app.get("playerDao").updateAllAsync(playerDocs)
		}).then(function(){
			return app.get("allianceDao").updateAllAsync(allianceDocs)
		}).then(function(){
			return Promise.all(eventFuncs)
		}).then(function(){
			logicLogger.info("restoring data finished")
			logicLogger.info("start change server status")
			var logicServers = app.getServersByType('logic')
			var gateServerId = "gate-server-1"
			var setLogicServerStatus = Promise.promisify(app.rpc.logic.logicRemote.setServerStatus.toServer)
			var setGateServerStatus = Promise.promisify(app.rpc.gate.gateRemote.setServerStatus.toServer)
			var funcs = []
			_.each(logicServers, function(logicServer){
				var logicServerId = logicServer.id
				funcs.push(setLogicServerStatus(logicServerId, true))
			})
			funcs.push(setGateServerStatus(gateServerId, true))
			return Promise.all(funcs)
		}).then(function(){
			logicLogger.info("change server status finished")
		}).catch(function(e){
			errorLogger.error("handle time.lifecycle:afterStartAll Error -----------------------------")
			errorLogger.error(e.stack)
			if(_.isEqual("production", app.get("env"))){
				errorMailLogger.error("handle time.lifecycle:afterStartAll Error -----------------------------")
				errorMailLogger.error(e.stack)
			}
		})
	}, 1000)
}

var GetAllianceDoc = function(allianceDocs, allianceId){
	for(var i = 0; i < allianceDocs.length; i++){
		var allianceDoc = allianceDocs[i]
		if(_.isEqual(allianceDoc._id, allianceId)) return allianceDoc
	}
	return null
}