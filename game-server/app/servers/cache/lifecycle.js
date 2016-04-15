"use strict"

/**
 * Created by modun on 14-8-9.
 */
var _ = require("underscore")
var Promise = require("bluebird")
var mongoose = require('mongoose')

var LogicUtils = require("../../utils/logicUtils")
var LogService = require("../../services/logService")
var PushService = require("../../services/pushService")
var RemotePushService = require("../../services/remotePushService")
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
var GemChange = require("../../domains/gemChange")
var GemAdd = require("../../domains/gemAdd")
var Device = require("../../domains/device")
var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")
var Country = require("../../domains/country")
var Analyse = require("../../domains/analyse")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set('onlineCount', 0)
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "gate")){
			app.set("getServerId", id)
		}else if(_.isEqual(server.serverType, "chat")){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "rank")){
			app.set("rankServerId", id)
		}else if(_.isEqual(server.serverType, "http")){
			app.set("httpServerId", id)
		}
	})

	app.set("ServerState", Promise.promisifyAll(ServerState))
	app.set("Deal", Promise.promisifyAll(Deal))
	app.set("Billing", Promise.promisifyAll(Billing))
	app.set("GemChange", Promise.promisifyAll(GemChange))
	app.set("GemAdd", Promise.promisifyAll(GemAdd))
	app.set("Device", Promise.promisifyAll(Device))
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("Country", Promise.promisifyAll(Country))
	app.set("Analyse", Promise.promisifyAll(Analyse));

	app.set("logService", new LogService(app))
	app.set("pushService", Promise.promisifyAll(new PushService(app)))
	app.set("remotePushService", new RemotePushService(app))
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
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
	callback();

	var cacheServerId = app.getCurServer().id
	var logService = app.get("logService")
	var cacheService = app.get("cacheService")
	var timeEventService = app.get("timeEventService")
	var ServerState = app.get("ServerState")
	var Alliance = app.get("Alliance")
	var Country = app.get('Country')
	var dataAnalyse = function(analyseDoc){
		var dateFrom = analyseDoc.dateTime;
		var dateTo = LogicUtils.getNextDateTime(dateFrom, 1);
		return app.get('Billing').aggregateAsync([
			{
				$match:{
					serverId:analyseDoc.serverId,
					time:{$gte:dateFrom, $lt:dateTo}
				}
			},
			{
				$group:{
					_id:"$playerId",
					totalPrice:{$sum:{$multiply:['$price', '$quantity']}},
					count:{$sum:1}
				}
			},
			{
				$group:{
					_id:null,
					payCount:{$sum:1},
					payTimes:{$sum:'$count'},
					revenue:{$sum:'$totalPrice'}
				}
			}
		]).then(function(docs){
			if(docs.length > 0){
				analyseDoc.payCount = docs[0].payCount
				analyseDoc.payTimes = docs[0].payTimes
				analyseDoc.revenue = docs[0].revenue
			}
			return app.get('Player').countAsync({
				serverId:analyseDoc.serverId,
				'countInfo.registerTime':{$lt:dateTo},
				'countInfo.lastLoginTime':{$gte:dateFrom}
			})
		}).then(function(count){
			analyseDoc.dau = count;
			return app.get('Player').countAsync({
				serverId:analyseDoc.serverId,
				'countInfo.registerTime':{$gte:dateFrom, $lt:dateTo}
			})
		}).then(function(count){
			analyseDoc.dnu = count;
			var Player = app.get('Player');
			var todayStartTime = LogicUtils.getTodayDateTime();
			var day1From = LogicUtils.getNextDateTime(analyseDoc.dateTime, 1);
			var day3From = LogicUtils.getNextDateTime(analyseDoc.dateTime, 3);
			var day7From = LogicUtils.getNextDateTime(analyseDoc.dateTime, 7);
			var day15From = LogicUtils.getNextDateTime(analyseDoc.dateTime, 15);
			var day30From = LogicUtils.getNextDateTime(analyseDoc.dateTime, 30);
			var dayXFroms = [
				{key:'day1', value:day1From},
				{key:'day3', value:day3From},
				{key:'day7', value:day7From},
				{key:'day15', value:day15From},
				{key:'day30', value:day30From}
			];
			return Promise.fromCallback(function(callback){
				(function updateRetention(){
					var dayXFrom = dayXFroms.shift();
					if(!dayXFrom){
						analyseDoc.finished = true;
						return callback();
					}
					if(dayXFrom.value > todayStartTime) return callback();
					Player.countAsync({
						serverId:analyseDoc.serverId,
						'countInfo.registerTime':{$gte:dateFrom, $lt:dateTo},
						'countInfo.lastLoginTime':{$gte:dayXFrom.value}
					}).then(function(count){
						analyseDoc[dayXFrom.key] = count;
						updateRetention();
					}).catch(function(e){
						callback(e);
					})
				})();
			})
		}).then(function(){
			return Promise.fromCallback(function(callback){
				analyseDoc.save(callback);
			})
		}).catch(function(e){
			logService.onError("cache.lifecycle.afterStartup.dataAnalyse", null, e.stack)
			return Promise.resolve();
		})
	}
	var checkAnalyse = function(dateTime){
		var serverState = app.get('__serverState');
		var serverStateCreateDateTime = LogicUtils.getPreviousDateTime(serverState.openAt, 0);
		if(dateTime < serverStateCreateDateTime) return Promise.resolve();
		return Analyse.findOneAsync({serverId:cacheServerId, dateTime:dateTime}).then(function(doc){
			if(!!doc) return Promise.resolve(doc);
			doc = {serverId:cacheServerId, dateTime:dateTime};
			return Analyse.createAsync(doc);
		}).then(function(doc){
			if(doc.finished) return Promise.resolve(false);
			return dataAnalyse(doc).then(function(){
				return Promise.resolve(true);
			})
		}).then(function(continued){
			return continued ? checkAnalyse(LogicUtils.getPreviousDateTime(dateTime, 1)) : Promise.resolve();
		})
	}

	var serverStopTime = null
	var funcs = [];
	Promise.fromCallback(function(callback){
		(function checkConnection(){
			if(mongoose.connection.readyState === 1) return callback();
			return setTimeout(checkConnection, 1000);
		})();
	}).then(function(){
		return ServerState.findByIdAsync(cacheServerId).then(function(doc){
			if(!!doc) return Promise.resolve(doc);
			doc = {_id:cacheServerId};
			return ServerState.createAsync(doc)
		}).then(function(doc){
			serverStopTime = Date.now() - doc.lastStopTime;
			app.set('__serverState', doc.toObject());
		})
	}).then(function(){
		return checkAnalyse(LogicUtils.getTodayDateTime())
	}).then(function(){
		var cursor = Alliance.collection.find({
			serverId:cacheServerId
		}, {
			_id:true,
			mapIndex:true,
			basicInfo:true,
			allianceFight:true
		});
		return Promise.fromCallback(function(callback){
			(function getNext(){
				cursor.next(function(e, doc){
					if(!!e) return callback(e);
					if(!doc) return callback();
					cacheService.updateMapAlliance(doc.mapIndex, doc);
					return getNext();
				})
			})();
		})
	}).then(function(){
		return Country.findByIdAsync(cacheServerId).then(function(doc){
			if(!!doc) return Promise.resolve(doc);
			doc = {
				_id:cacheServerId,
				status:{
					status:Consts.AllianceStatus.Peace,
					startTime:Date.now(),
					finishTime:0
				},
				monsters:{
					refreshTime:Date.now(),
					undeadsquads:[],
					necronators:[]
				},
				dominator:null
			}
			return Country.createAsync(doc)
		}).then(function(doc){

		})
	}).then(function(){
		var findAllianceId = function(callback){
			Alliance.collection.find({
				serverId:cacheServerId,
				$or:[
					{"basicInfo.status":Consts.AllianceStatus.Protect},
					{"basicInfo.status":Consts.AllianceStatus.Prepare},
					{"basicInfo.status":Consts.AllianceStatus.Fight},
					{"shrineEvents.0":{$exists:true}},
					{"villageEvents.0":{$exists:true}},
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
			var lockPairs = [];
			return cacheService.findAllianceAsync(id).then(function(doc){
				allianceDoc = doc

				lockPairs.push({key:Consts.Pairs.Alliance, value:allianceDoc._id});
				return cacheService.lockAllAsync(lockPairs);
			}).then(function(){
				return timeEventService.restoreAllianceTimeEventsAsync(allianceDoc, serverStopTime)
			}).then(function(){
				return cacheService.touchAllAsync(lockPairs);
			}).then(function(){
				return cacheService.unlockAllAsync(lockPairs);
			}).catch(function(e){
				logService.onError("cache.lifecycle.afterStartup.restoreAllianceEvents", {allianceId:id}, e.stack)
			}).finally(function(){
				return Promise.resolve();
			})
		}
		funcs = []
		_.each(docs, function(doc){
			funcs.push(restoreAllianceEventsAsync(doc._id))
		})
		return Promise.all(funcs)
	}).then(function(){
		app.set("serverStatus", Consts.ServerStatus.On);
	}).then(function(){
		(function analyseAtTime(){
			setTimeout(function(){
				checkAnalyse(LogicUtils.getTodayDateTime()).then(function(){
					analyseAtTime();
				}).catch(function(e){
					logService.onError("cache.lifecycle.afterStartup.analyseAtTime", null, e.stack)
				})
			}, 1000 * 60 * 10)
		})();
		return Promise.resolve();
	}).then(function(){
		logService.onEvent("restore data finished", {serverId:app.getServerId()})
	}).catch(function(e){
		logService.onError("restore data finished with error", {serverId:app.getServerId()}, e.stack)
	})
}

life.beforeShutdown = function(app, callback, cancelShutDownTimer){
	cancelShutDownTimer()
	app.set("serverStatus", Consts.ServerStatus.Stoping)
	var cacheService = app.get('cacheService');
	var playerApiService = app.get('playerApiService');
	app.get("timeEventService").clearAllTimeEventsAsync().then(function(){
		var onlineUsers = _.filter(cacheService.players, function(player){
			return !!player.doc.logicServerId;
		})
		return Promise.fromCallback(function(callback){
			(function logoutPlayer(){
				if(onlineUsers.length === 0) return callback();
				var playerDoc = onlineUsers.pop().doc;
				var logicServerId = playerDoc.logicServerId
				playerApiService.logoutAsync(playerDoc._id, playerDoc.logicServerId, 'serverClose').then(function(){
					if(!!app.getServerById(logicServerId)){
						app.rpc.logic.logicRemote.kickPlayer.toServer(logicServerId, playerDoc._id, "serverClose", null)
					}
					return logoutPlayer();
				}).catch(function(e){
					app.get("logService").onError('cache.lifecycle.beforeShutdown.logoutPlayer', {playerId:playerDoc._id}, e.stack);
					return logoutPlayer();
				})
			})();
		})
	}).then(function(){
		return app.get("ServerState").findByIdAndUpdateAsync(app.getCurServer().id, {lastStopTime:Date.now()});
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
	});
}

life.afterStartAll = function(app){

}