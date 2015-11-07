"use strict"

/**
 * Created by modun on 14-8-9.
 */
var _ = require("underscore")
var Promise = require("bluebird")

var LogService = require("../../services/logService")
var PushService = require("../../services/pushService")
var ApnService = require("../../services/apnService")
var CacheService = require("../../services/cacheService")
var DataService = require("../../services/dataService")
var TimeEventService = require("../../services/timeEventService")
var PlayerTimeEventService = require("../../services/playerTimeEventService")
var AllianceTimeEventService = require("../../services/allianceTimeEventService")
var PlayerApiService = require("../../services/playerApiService")
var PlayerApiService2 = require("../../services/playerApiService2")
var PlayerApiService3 = require("../../services/playerApiService3")
var PlayerApiService4 = require("../../services/playerApiService4")
var PlayerApiService5 = require("../../services/playerApiService5")
var PlayerIAPService = require("../../services/playerIAPService")
var AllianceApiService = require("../../services/allianceApiService")
var AllianceApiService2 = require("../../services/allianceApiService2")
var AllianceApiService3 = require("../../services/allianceApiService3")
var AllianceApiService4 = require("../../services/allianceApiService4")
var AllianceApiService5 = require("../../services/allianceApiService5")
var Consts = require("../../consts/consts")

var ServerState = require("../../domains/serverState")
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
	app.set('loginedCount', 0)
	app.set("cacheServerId", currentServer.id)
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "chat")){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "gate")){
			app.set("gateServerId", id)
		}
	})

	app.set("ServerState", Promise.promisifyAll(ServerState))
	app.set("Deal", Promise.promisifyAll(Deal))
	app.set("Billing", Promise.promisifyAll(Billing))
	app.set("GemUse", Promise.promisifyAll(GemUse))
	app.set("GemAdd", Promise.promisifyAll(GemAdd))
	app.set("Device", Promise.promisifyAll(Device))
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))

	app.set("logService", new LogService(app))
	app.set("pushService", Promise.promisifyAll(new PushService(app)))
	app.set("apnService", new ApnService(app))
	app.set("timeEventService", Promise.promisifyAll(new TimeEventService(app)))
	app.set("cacheService", Promise.promisifyAll(new CacheService(app)))
	app.set("dataService", Promise.promisifyAll(new DataService(app)))
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
	var maxInterval = 60
	var currentInterval = 0
	var interval = setInterval(function(){
		currentInterval++
		if(currentInterval >= maxInterval || app.get('loginedCount') <= 0){
			clearInterval(interval)
			var cacheService = app.get("cacheService")
			app.get("timeEventService").clearAllTimeEventsAsync().then(function(){
				return app.get("ServerState").createAsync({type:Consts.ServerState.Stop})
			}).then(function(){
				return cacheService.timeoutAllAlliancesAsync()
			}).then(function(){
				return cacheService.timeoutAllPlayersAsync()
			}).then(function(){
				app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
				setTimeout(callback, 1000)
			}).catch(function(e){
				app.get("logService").onError("server stoped", {serverId:app.getServerId()}, e.stack)
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
	var funcs = [];

	(function(){
		return new Promise(function(resolve, reject){
			return new Promise(function(resolve){
				(function getCursor(){
					var cursor = Alliance.collection.find({
						serverId:app.get("cacheServerId")
					}, {
						_id:true,
						mapIndex:true,
						basicInfo:true,
						allianceFight:true
					});
					if(!cursor){
						setTimeout(getCursor, 1000);
					}else{
						resolve(cursor);
					}
				})();
			}).then(function(cursor){
					(function getNext(){
						cursor.next(function(e, doc){
							if(!!e) return reject(e);
							if(!doc) return resolve();
							cacheService.updateMapAlliance(doc.mapIndex, doc, null);
							return getNext();
						})
					})();
				})
		})
	})().then(function(){
		funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Stop}, null, {"sort":{"time":-1}}))
		funcs.push(ServerState.findOneAsync({"type":Consts.ServerState.Start}, null, {"sort":{"time":-1}}))
		return Promise.all(funcs)
	}).spread(function(stopDoc, startDoc){
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
					{"marchEvents.strikeMarchEvents.0":{$exists:true}},
					{"marchEvents.strikeMarchReturnEvents.0":{$exists:true}},
					{"marchEvents.attackMarchEvents.0":{$exists:true}},
					{"marchEvents.attackMarchReturnEvents.0":{$exists:true}}
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
			return cacheService.findAllianceAsync(id).then(function(doc){
				allianceDoc = doc
				return timeEventService.restoreAllianceTimeEventsAsync(allianceDoc, serverStopTime)
			}).then(function(){
				return cacheService.updateAllianceAsync(allianceDoc._id, allianceDoc)
			}).catch(function(e){
				logService.onError("cache.lifecycle.afterStartAll.restoreAllianceEvents", {allianceId:id}, e.stack)
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
		logService.onError("server started", {serverId:app.getServerId()}, e.stack)
	})
}