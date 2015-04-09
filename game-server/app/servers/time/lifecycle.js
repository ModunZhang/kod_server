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
var PlayerTimeEventService = require("../../services/playerTimeEventService")
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
	app.set("playerTimeEventService", Promise.promisifyAll(new PlayerTimeEventService(app)))
	app.set("cacheService", Promise.promisifyAll(new CacheService(app)))

	var cacheService = app.get("cacheService")
	var logService = app.get("logService")

	logService.onEvent("time.lifecycle.afterStartAll start restoring data", {})
	cacheService.flushDbAsync().then(function(){
		return cacheService.loadPlayersAsync()
	}).then(function(){
		return cacheService.loadAlliancesAsync()
	}).then(function(){
		logService.onEvent("time.lifecycle.afterStartAll restoring data finished", {})
		callback()
	}).catch(function(e){
		app.get("logService").onEventError("time.lifecycle.beforeStartup", {}, e.stack)
		callback()
	})
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback, cancelShutDownTimer){
	cancelShutDownTimer()
	var logService = app.get("logService")
	logService.onEvent("time.lifecycle.beforeShutdown start persistence data", {})
	var cacheService = app.get("cacheService")
	app.get("ServerState").createAsync({type:Consts.ServerState.Stop}).then(function(){
		return cacheService.unloadPlayersAsync()
	}).then(function(){
		return cacheService.unloadAlliancesAsync()
	}).then(function(){
		logService.onEvent("time.lifecycle.beforeShutdown persistence data finished", {})
		callback()
	}).catch(function(e){
		app.get("logService").onEventError("time.lifecycle.beforeShutdown", {}, e.stack)
		callback()
	})
}

life.afterStartAll = function(app){
	var playerDao = app.get("playerDao")
	var allianceDao = app.get("allianceDao")
	var ServerState = app.get("ServerState")
	var playerTimeEventService = app.get("playerTimeEventService")
	var id = null
	var eventServerId = "event-server-1"
	var now = Date.now()
	var addTimeEventAsync = Promise.promisify(app.rpc.event.eventRemote.addTimeEvent.toServer)
	var eventFuncs = null
	var serverStopTime = null

	var activePlayersEvents = function(playerIds, timeAdd){
		if(playerIds.length == 0) return Promise.resolve()
		eventFuncs = []
		id = playerIds.shift()
		return playerDao.findAsync(id, true).then(function(playerDoc){
			var key = Consts.TimeEventType.Player + ":" + playerDoc._id
			_.each(playerDoc.buildingEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "buildingEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "buildingEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.houseEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "houseEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "houseEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.materialEvents, function(event){
				if(event.finishTime > 0){
					event.startTime += timeAdd
					event.finishTime += timeAdd
					if(LogicUtils.willFinished(event.finishTime)){
						playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "materialEvents", event.id)
					}else{
						eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "materialEvents", event.id, event.finishTime - now])
					}
				}
			})
			_.each(playerDoc.soldierEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "soldierEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "soldierEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.dragonEquipmentEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "dragonEquipmentEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "dragonEquipmentEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.treatSoldierEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "treatSoldierEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "treatSoldierEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.dragonHatchEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "dragonHatchEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "dragonHatchEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.dragonDeathEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "dragonDeathEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "dragonDeathEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.productionTechEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "productionTechEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "productionTechEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.militaryTechEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "militaryTechEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "militaryTechEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.soldierStarEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "soldierStarEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "soldierStarEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.vipEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "vipEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "vipEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.itemEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "itemEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "itemEvents", event.id, event.finishTime - now])
				}
			})
			_.each(playerDoc.dailyQuestEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				if(LogicUtils.willFinished(event.finishTime)){
					playerTimeEventService.onPlayerEvent(playerDoc, [], null, null, "dailyQuestEvents", event.id)
				}else{
					eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "dailyQuestEvents", event.id, event.finishTime - now])
				}
			})
			DataUtils.refreshPlayerPower(playerDoc, [])
			return playerDao.updateAsync(playerDoc)
		}).then(function(){
			return LogicUtils.excuteAll(eventFuncs)
		}).then(function(){
			return activePlayersEvents(playerIds, timeAdd)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}
	var activeAllianceEvents = function(allianceIds, timeAdd){
		if(allianceIds.length == 0) return Promise.resolve()
		eventFuncs = []
		id = allianceIds.shift()
		return allianceDao.findAsync(id, true).then(function(allianceDoc){
			var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
			if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
				allianceDoc.basicInfo.statusStartTime += timeAdd
				allianceDoc.basicInfo.statusFinishTime += timeAdd
				eventFuncs.push([null, addTimeEventAsync, eventServerId, key, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, allianceDoc.basicInfo.statusFinishTime - now])
			}else if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				allianceDoc.basicInfo.statusStartTime += timeAdd
				allianceDoc.basicInfo.statusFinishTime += timeAdd
				if(_.isEqual(allianceDoc.allianceFight.attackAllianceId, allianceDoc._id)){
					var thekey = Consts.TimeEventType.AllianceFight
					var theEventType = Consts.TimeEventType.AllianceFight
					var theEventId = allianceDoc.allianceFight.attackAllianceId + ":" + allianceDoc.allianceFight.defenceAllianceId
					eventFuncs.push([null, addTimeEventAsync, eventServerId, thekey, theEventType, theEventId, allianceDoc.basicInfo.statusFinishTime - now])
				}
			}else if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Peace)){
				allianceDoc.basicInfo.statusStartTime += timeAdd
			}

			_.each(allianceDoc.shrineEvents, function(event){
				event.createTime = timeAdd
				event.startTime = timeAdd
				eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "shrineEvents", event.id, event.startTime - now])
			})
			_.each(allianceDoc.villageEvents, function(event){
				event.startTime += timeAdd
				event.finishTime += timeAdd
				eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "villageEvents", event.id, event.finishTime - now])
			})
			_.each(allianceDoc.strikeMarchEvents, function(event){
				event.startTime += timeAdd
				event.arriveTime += timeAdd
				eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "strikeMarchEvents", event.id, event.arriveTime - now])
			})
			_.each(allianceDoc.strikeMarchReturnEvents, function(event){
				event.startTime += timeAdd
				event.arriveTime += timeAdd
				eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "strikeMarchReturnEvents", event.id, event.arriveTime - now])
			})
			_.each(allianceDoc.attackMarchEvents, function(event){
				event.startTime += timeAdd
				event.arriveTime += timeAdd
				eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "attackMarchEvents", event.id, event.arriveTime - now])
			})
			_.each(allianceDoc.attackMarchReturnEvents, function(event){
				event.startTime += timeAdd
				event.arriveTime += timeAdd
				eventFuncs.push([null, addTimeEventAsync, eventServerId, key, "attackMarchReturnEvents", event.id, event.arriveTime - now])
			})
			return allianceDao.updateAsync(allianceDoc)
		}).then(function(){
			return LogicUtils.excuteAll(eventFuncs)
		}).then(function(){
			return activeAllianceEvents(allianceIds, timeAdd)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}

	setTimeout(function(){
		var logService = app.get("logService")
		logService.onEvent("time.lifecycle.afterStartAll start restoring events", {})
		var funcs = []
		funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Stop}, null, {"sort":{"time":-1}}))
		funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Start}, null, {"sort":{"time":-1}}))
		Promise.all(funcs).spread(function(stopDoc, startDoc){
			if(!_.isObject(stopDoc)) serverStopTime = 0
			else if(!_.isObject(startDoc) || startDoc.time >= stopDoc.time) serverStopTime = 0
			else serverStopTime = now - stopDoc.time
			return playerDao.findAllKeysAsync()
		}).then(function(ids){
			return activePlayersEvents(ids, serverStopTime)
		}).then(function(){
			return allianceDao.findAllKeysAsync()
		}).then(function(ids){
			return activeAllianceEvents(ids, serverStopTime)
		}).then(function(){
			logService.onEvent("time.lifecycle.afterStartAll restoring events finished", {})
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