"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var PlayerService = require("../../services/playerService")
var AllianceDao = require("../../dao/allianceDao")
var PlayerDao = require("../../dao/playerDao")
var DbUtils = Promise.promisifyAll(require("../../utils/dbUtils"))
var Consts = require("../../consts/consts")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("playerDao", Promise.promisifyAll(new PlayerDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("allianceDao", Promise.promisifyAll(new AllianceDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))
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
	callback()
}

life.afterStartAll = function(app){
	var playerDocs = null
	var allianceDocs = null
	var eventServerId = "event-server-1"
	var now = Date.now()
	var addTimeEventAsync = Promise.promisify(app.rpc.event.eventRemote.addTimeEvent.toServer)
	app.get("playerDao").findAllAsync().then(function(docs){
		playerDocs = docs
		return app.get("allianceDao").findAllAsync()
	}).then(function(docs){
		allianceDocs = docs
	}).then(function(){
		var eventFuncs = []
		_.each(playerDocs, function(playerDoc){
			_.each(playerDoc.buildingEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "buildingEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "buildingEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.houseEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "houseEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "houseEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.towerEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "towerEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "towerEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.wallEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "wallEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "wallEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.materialEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "materialEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "materialEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.soldierEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "soldierEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "soldierEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.dragonEquipmentEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "dragonEquipmentEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "dragonEquipmentEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.treatSoldierEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "treatSoldierEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "treatSoldierEvents", event.id, event.finishTime - now))
				}
			})
			_.each(playerDoc.coinEvents, function(event){
				var key = Consts.TimeEventType.Player + ":" + playerDoc._id
				var timeInterval = Math.round(10 + (Math.random() * (2000 - 10)))
				if(event.finishTime > 0 && event.finishTime <= now){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "coinEvents", event.id, timeInterval))
				}else if(event.finishTime > 0){
					eventFuncs.push(addTimeEventAsync(eventServerId, key, "coinEvents", event.id, event.finishTime - now))
				}
			})
			return Promise.all(eventFuncs)
		})
	}).then(function(){
		setTimeout(function(){
			var logicServers = app.getServersByType('logic')
			var gateServerId = "gate-server-1"
			var setLogicServerStatus = Promise.promisify(app.rpc.logic.logicRemote.setServerStatus.toServer)
			var setGateServerStatus = Promise.promisify(app.rpc.gate.gateRemote.setServerStatus.toServer)
			_.each(logicServers, function(logicServer){
				var logicServerId = logicServer.id
				setLogicServerStatus(logicServerId, true)
			})
			setGateServerStatus(gateServerId, true)
		}, 5000)
	}).catch(function(e){
		errorLogger.error("handle time.lifecycle:afterStartAll Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", app.get("env"))){
			errorMailLogger.error("handle time.lifecycle:afterStartAll Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}