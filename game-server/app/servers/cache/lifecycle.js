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
	app.set("logService", Promise.promisifyAll(new LogService(app)))
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
	setTimeout(function(){
		var cacheService = app.get("cacheService")
		var logService = app.get("logService")
		logService.onEvent("cache.lifecycle.beforeShutdown persistence data", {serverId:app.get("cacheServerId")})
		app.get("ServerState").createAsync({type:Consts.ServerState.Stop}).then(function(){
			return cacheService.timeoutAllAlliancesAsync()
		}).then(function(){
			return cacheService.timeoutAllPlayersAsync()
		}).then(function(){
			logService.onEvent("cache.lifecycle.beforeShutdown persistence data finished", {serverId:app.get("cacheServerId")})
			callback()
		}).catch(function(e){
			logService.onEventError("cache.lifecycle.beforeShutdown", {serverId:app.get("cacheServerId")}, e.stack)
			callback()
		})
	}, 2000)
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

	logService.onEvent("cache.lifecycle.afterStartAll", {serverId:app.get("cacheServerId")})
	var funcs = []
	funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Stop}, null, {"sort":{"time":-1}}))
	funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Start}, null, {"sort":{"time":-1}}))
	Promise.all(funcs).spread(function(stopDoc, startDoc){
		if(!_.isObject(stopDoc)) serverStopTime = 0
		else if(!_.isObject(startDoc) || startDoc.time >= stopDoc.time) serverStopTime = 0
		else serverStopTime = Date.now() - stopDoc.time
	}).then(function(){
		var findAllianceId = function(callback){
			Alliance.collection.find({serverId:app.get("cacheServerId")}, {_id:true}).toArray(function(e, docs){
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
			return cacheService.findAllianceAsync(id).then(function(doc){
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
		logService.onEvent("cache.lifecycle.afterStartAll success", {serverId:app.get("cacheServerId")})
	}).catch(function(e){
		logService.onEventError("cache.lifecycle.afterStartAll success with error", {serverId:app.get("cacheServerId")}, e.stack)
	})
}