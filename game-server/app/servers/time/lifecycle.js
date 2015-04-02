"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var LogService = require("../../services/logService")
var ServerState = require("../../domains/serverState")
var AllianceDao = require("../../dao/allianceDao")
var PlayerDao = require("../../dao/playerDao")
var CacheService = require("../../services/cacheService")
var LogicUtils = require("../../utils/logicUtils")
var DataUtils = require("../../utils/dataUtils")
var Consts = require("../../consts/consts")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("ServerState", Promise.promisifyAll(ServerState))
	app.set("allianceDao", Promise.promisifyAll(new AllianceDao(app.get("redis"), app.get("scripto"), app.get("env"))))
	app.set("playerDao", Promise.promisifyAll(new PlayerDao(app.get("redis"), app.get("scripto"), app.get("env"))))

	app.set("logService", Promise.promisifyAll(new LogService(app)))
	app.set("channelService", Promise.promisifyAll(app.get("channelService")))
	app.set("globalChannelService", Promise.promisifyAll(app.get("globalChannelService")))
	app.set("cacheService", Promise.promisifyAll(new CacheService(app)))

	var cacheService = app.get("cacheService")
	cacheService.flushDbAsync().then(function(){
		return cacheService.loadPlayersAsync()
	}).then(function(){
		return cacheService.loadAlliancesAsync()
	}).then(function(){
		callback()
	}).catch(function(e){
		app.get("logService").onEventError("time.lifecycle.beforeStartup", {}, e.stack)
		callback()
	})
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	var cacheService = app.get("cacheService")
	app.get("ServerState").createAsync({type:Consts.ServerState.Stop}).then(function(){
		return cacheService.unloadPlayersAsync()
	}).then(function(){
		return cacheService.unloadAlliancesAsync()
	}).then(function(){
		callback()
	}).catch(function(e){
		app.get("logService").onEventError("time.lifecycle.beforeShutdown", {}, e.stack)
		callback()
	})
}

life.afterStartAll = function(app){
	var playerDao = app.get("playerDao")
	var allianceDao = app.get("allianceDao")
	var id = null
	var eventServerId = "event-server-1"
	var now = Date.now()
	var addTimeEventAsync = Promise.promisify(app.rpc.event.eventRemote.addTimeEvent.toServer)
	var eventFuncs = []

	var activePlayersEvents = function(playerIds){
		if(playerIds.length == 0) return Promise.resolve()
		id = playerIds.shift()
		return playerDao.findAsync(id).then(function(playerDoc){
			var key = Consts.TimeEventType.Player + ":" + playerDoc._id
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
			_.each(playerDoc.dragonHatchEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "dragonHatchEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(playerDoc.dragonDeathEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "dragonDeathEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(playerDoc.productionTechEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "productionTechEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(playerDoc.militaryTechEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "militaryTechEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(playerDoc.soldierStarEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "soldierStarEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(playerDoc.vipEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "vipEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(playerDoc.itemEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "itemEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(playerDoc.dailyQuestEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "dailyQuestEvents", event.id, event.finishTime - event.startTime))
			})
			DataUtils.refreshPlayerPower(playerDoc, [])
			return playerDao.updateAsync(playerDoc)
		}).then(function(){
			return activePlayersEvents(playerIds)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}
	var activeAllianceEvents = function(allianceIds){
		if(allianceIds.length == 0) return Promise.resolve()
		id = allianceIds.shift()
		return allianceDao.findAsync(id).then(function(allianceDoc){
			var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
			if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
				allianceDoc.basicInfo.statusFinishTime = now + (allianceDoc.basicInfo.statusFinishTime - allianceDoc.basicInfo.statusStartTime)
				allianceDoc.basicInfo.statusStartTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, allianceDoc.basicInfo.statusFinishTime - allianceDoc.basicInfo.statusStartTime))
			}else if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				allianceDoc.basicInfo.statusFinishTime = now + (allianceDoc.basicInfo.statusFinishTime - allianceDoc.basicInfo.statusStartTime)
				allianceDoc.basicInfo.statusStartTime = now
				if(_.isEqual(allianceDoc.allianceFight.attackAllianceId, allianceDoc._id)){
					var thekey = Consts.TimeEventType.AllianceFight
					var theEventType = Consts.TimeEventType.AllianceFight
					var theEventId = allianceDoc.allianceFight.attackAllianceId + ":" + allianceDoc.allianceFight.defenceAllianceId
					eventFuncs.push(addTimeEventAsync(eventServerId, thekey, theEventType, theEventId, allianceDoc.basicInfo.statusFinishTime - allianceDoc.basicInfo.statusStartTime))
				}
			}else if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Peace)){
				allianceDoc.basicInfo.statusStartTime = now
			}


			_.each(allianceDoc.shrineEvents, function(event){
				event.startTime = now + (event.startTime - event.createTime)
				event.createTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "shrineEvents", event.id, event.startTime - event.finishTime))
			})
			_.each(allianceDoc.villageEvents, function(event){
				event.finishTime = now + (event.finishTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "villageEvents", event.id, event.finishTime - event.startTime))
			})
			_.each(allianceDoc.strikeMarchEvents, function(event){
				event.arriveTime = now + (event.arriveTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "strikeMarchEvents", event.id, event.arriveTime - event.startTime))
			})
			_.each(allianceDoc.strikeMarchReturnEvents, function(event){
				event.arriveTime = now + (event.arriveTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "strikeMarchReturnEvents", event.id, event.arriveTime - event.startTime))
			})
			_.each(allianceDoc.attackMarchEvents, function(event){
				event.arriveTime = now + (event.arriveTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "attackMarchEvents", event.id, event.arriveTime - event.startTime))
			})
			_.each(allianceDoc.attackMarchReturnEvents, function(event){
				event.arriveTime = now + (event.arriveTime - event.startTime)
				event.startTime = now
				eventFuncs.push(addTimeEventAsync(eventServerId, key, "attackMarchReturnEvents", event.id, event.arriveTime - event.startTime))
			})
			return allianceDao.updateAsync(allianceDoc)
		}).then(function(){
			return activeAllianceEvents(allianceIds)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}

	setTimeout(function(){
		var logService = app.get("logService")
		logService.onEvent("time.lifecycle.afterStartAll start restoring data", {})
		playerDao.findAllKeysAsync().then(function(ids){
			return activePlayersEvents(ids)
		}).then(function(){
			return allianceDao.findAllKeysAsync()
		}).then(function(ids){
			return activeAllianceEvents(ids)
		}).then(function(){
			logService.onEvent("time.lifecycle.afterStartAll restoring data finished", {})
			logService.onEvent("time.lifecycle.afterStartAll start change server status", {})
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
			logService.onEvent("time.lifecycle.afterStartAll change server status finished", {})
		}).then(function(){
			app.get("ServerState").createAsync({type:Consts.ServerState.Start})
		}).catch(function(e){
			logService.onEventError("time.lifecycle.afterStartAll", {}, e.stack)
		})
	}, 1000)
}