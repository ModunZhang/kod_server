"use strict"

/**
 * Created by modun on 14-8-9.
 */
var _ = require("underscore")
var Promise = require("bluebird")

var LogService = require("../../services/logService")
var CacheService = require("../../services/cacheService")
var TimeEventService = require("../../services/timeEventService")
var PlayerTimeEventService = require("../../services/playerTimeEventService")
var ServerState = require("../../domains/serverState")
var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")
var Consts = require("../../consts/consts")

var life = module.exports

life.beforeStartup = function(app, callback){
	var currentServer = app.getServerFromConfig(app.getServerId())
	app.set("cacheServerId", currentServer.id)
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "chat") && _.isEqual(server.usedFor, currentServer.id)){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "event") && _.isEqual(server.usedFor, currentServer.id)){
			app.set("eventServerId", id)
		}else if(_.isEqual(server.serverType, "gate")){
			app.set("gateServerId", id)
		}
	})

	app.set("ServerState", Promise.promisifyAll(ServerState))
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("logService", new LogService(app))
	app.set("timeEventService", Promise.promisifyAll(new TimeEventService(app)))
	app.set("playerTimeEventService", Promise.promisifyAll(new PlayerTimeEventService(app)))
	app.set("cacheService", Promise.promisifyAll(new CacheService(app)))
	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback, cancelShutDownTimer){
	cancelShutDownTimer()
	var maxInterval = 30
	var currentInterval = 0
	var interval = setInterval(function(){
		currentInterval++
		var logicServers = _.filter(app.getServersByType("logic"), function(server){
			return _.isEqual(server.usedFor, app.getServerId())
		})
		var eventServer = _.find(app.getServersByType("event"), function(server){
			return _.isEqual(server.usedFor, app.getServerId())
		})
		if(currentInterval >= maxInterval || (logicServers.length == 0 && !_.isObject(eventServer))){
			clearInterval(interval)
			var cacheService = app.get("cacheService")
			app.get("ServerState").createAsync({type:Consts.ServerState.Stop}).then(function(){
				return cacheService.timeoutAllAlliancesAsync()
			}).then(function(){
				return cacheService.timeoutAllPlayersAsync()
			}).then(function(){
				app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
				setTimeout(callback, 1000)
			}).catch(function(e){
				app.get("logService").onEventError("server stoped", {serverId:app.getServerId()}, e.stack)
				setTimeout(callback, 1000)
			})
		}
	}, 1000)
}

life.afterStartAll = function(app){
	var cacheServerId = app.getServerId()
	var logicServers = app.getServersByType("logic")
	var logService = app.get("logService")
	var cacheService = app.get("cacheService")
	var timeEventService = app.get("timeEventService")
	var ServerState = app.get("ServerState")
	var Alliance = app.get("Alliance")
	var serverStopTime = null

	var funcs = []
	funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Stop}, null, {"sort":{"time":-1}}))
	funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Start}, null, {"sort":{"time":-1}}))
	Promise.all(funcs).spread(function(stopDoc, startDoc){
		if(!_.isObject(stopDoc)) serverStopTime = 0
		else if(!_.isObject(startDoc) || startDoc.time >= stopDoc.time) serverStopTime = 0
		else serverStopTime = Date.now() - stopDoc.time
	}).then(function(){
		var findAllianceId = function(callback){
			Alliance.collection.find({
				serverId:app.get("cacheServerId"),
				$or:[
					{"basicInfo.status":Consts.AllianceStatus.Protect},
					{"basicInfo.status":Consts.AllianceStatus.Prepare},
					{"basicInfo.status":Consts.AllianceStatus.Fight},
					{"shrineEvents.0":{$exists:true}},
					{"villageEvents.0":{$exists:true}},
					{"villageCreateEvents.0":{$exists:true}},
					{"strikeMarchEvents.0":{$exists:true}},
					{"strikeMarchReturnEvents.0":{$exists:true}},
					{"attackMarchEvents.0":{$exists:true}},
					{"attackMarchReturnEvents.0":{$exists:true}}
				]
			}, {_id:true}).toArray(function(e, docs){
				if(_.isObject(e)){
					callback(e)
				}else{
					callback(null, docs)
				}
			})
		}
		var findAllianceIdAsync = Promise.promisify(findAllianceId)
		return findAllianceIdAsync()
	}).then(function(docs){
		var restoreAllianceEventsAsync = function(id){
			var allianceDoc = null
			return cacheService.findAllianceAsync(id, false).then(function(doc){
				allianceDoc = doc
				return timeEventService.restoreAllianceTimeEventsAsync(allianceDoc, serverStopTime)
			}).then(function(){
				return cacheService.updateAllianceAsync(allianceDoc._id, allianceDoc)
			}).catch(function(e){
				logService.onEventError("cache.lifecycle.afterStartAll.restoreAllianceEvents", {allianceId:id}, e.stack)
				return cacheService.updateAllianceAsync(allianceDoc._id, null)
			})
		}
		funcs = []
		_.each(docs, function(doc){
			funcs.push(restoreAllianceEventsAsync(doc._id))
		})
		return Promise.all(funcs)
	}).then(function(){
		var setServerStatusAsync = Promise.promisify(app.rpc.logic.logicRemote.setServerStatus.toServer)
		funcs = []
		_.each(logicServers, function(server){
			if(_.isEqual(server.usedFor, cacheServerId)){
				funcs.push(setServerStatusAsync(server.id, Consts.ServerStatus.On))
			}
		})
		return Promise.all(funcs)
	}).then(function(){
		ServerState.createAsync({type:Consts.ServerState.Start})
	}).then(function(){
		logService.onEvent("server started", {serverId:app.getServerId()})
	}).catch(function(e){
		logService.onEventError("server started", {serverId:app.getServerId()}, e.stack)
	})
}