"use strict"

/**
 * Created by modun on 15/3/6.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var DataUtils = require("../utils/dataUtils")
var Consts = require("../consts/consts.js")
var Define = require('../consts/define.js');
var Events = require('../consts/events.js');
var ErrorUtils = require("../utils/errorUtils.js")
var GameDatas = require('../datas/GameDatas.js')
var AllianceMap = GameDatas.AllianceMap;

var DataService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.timeEventService = app.get("timeEventService")
	this.cacheServerId = app.get('cacheServerId');
	this.pushService = app.get('pushService');
	this.Player = app.get("Player")
	this.Alliance = app.get("Alliance")
	this.channelService = app.get('channelService');
	this.players = {}
	this.playersQueue = {}
	this.alliances = {}
	this.alliancesQueue = {}
	this.allianceNameMap = {}
	this.allianceTagMap = {}
	this.mapIndexMap = {};
	this.flushOps = 10
	this.timeoutInterval = 10 * 60 * 1000
	this.lockCheckInterval = 5 * 1000
	this.lockInterval = 10 * 1000
	this.mapViewers = {};
	this.mapIndexs = {};
	this.bigMapLength = DataUtils.getAllianceIntInit('bigMapLength');
	this.bigMap = function(self){
		var channelService = app.get('channelService');
		var mapIndexData = [];
		for(var i = 0; i < Math.pow(self.bigMapLength, 2); i++){
			mapIndexData[i] = {
				allianceData:null,
				mapData:{
					marchEvents:{
						strikeMarchEvents:{},
						strikeMarchReturnEvents:{},
						attackMarchEvents:{},
						attackMarchReturnEvents:{}
					},
					villageEvents:{}
				},
				channel:channelService.createChannel(Consts.BigMapChannelPrefix + '_' + i)
			}
		}
		return mapIndexData;
	}(this);
	setInterval(OnLockCheckInterval.bind(this), this.lockCheckInterval)
}
module.exports = DataService
var pro = DataService.prototype


/**
 * 超时检测
 * @constructor
 */
var OnLockCheckInterval = function(){
	var self = this
	_.each(this.playersQueue, function(queue, id){
		if(queue.length > 0 && queue[0].time + self.lockInterval < Date.now()){
			var e = new Error("玩家数据锁超时")
			self.logService.onEventError("cache.cacheService.OnLockCheckInterval", {
				id:id,
				timeLocked:Date.now() - queue[0].time
			}, e.stack)
			UnlockPlayer.call(self, id)
		}
	})
	_.each(this.alliancesQueue, function(queue, id){
		if(queue.length > 0 && queue[0].time + self.lockInterval < Date.now()){
			var e = new Error("联盟数据锁超时")
			self.logService.onEventError("cache.cacheService.OnLockCheckInterval", {
				id:id,
				timeLocked:Date.now() - queue[0].time
			}, e.stack)
			UnlockAlliance.call(self, id)
		}
	})
}

/**
 * 玩家超时
 * @param id
 */
var OnPlayerTimeout = function(id){
	var self = this
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(!_.isObject(player)){
			UnlockPlayer.call(self, id)
		}else{
			clearTimeout(player.timeout)
			if(!_.isEmpty(player.doc.logicServerId)){
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				UnlockPlayer.call(self, id)
			}else{
				self.timeEventService.clearPlayerTimeEventsAsync(player.doc).catch(function(e){
					self.logService.onEventError("cache.cacheService.OnPlayerTimeout.clearPlayerTimeEvent", {id:id}, e.stack)
					return Promise.resolve()
				}).then(function(){
					delete self.players[id]
					if(player.ops > 0){
						self.Player.updateAsync({_id:id}, _.omit(player.doc, "_id")).then(function(){
							self.logService.onEvent("cache.cacheService.OnPlayerTimeout", {id:id})
							UnlockPlayer.call(self, id)
						}).catch(function(e){
							self.logService.onEventError("cache.cacheService.OnPlayerTimeout", {id:id, doc:player.doc}, e.stack)
							UnlockPlayer.call(self, id)
						})
						player.ops = 0
					}else{
						self.logService.onEvent("cache.cacheService.OnPlayerTimeout", {id:id})
						UnlockPlayer.call(self, id)
					}
				})
			}
		}
	})
}

/**
 * 联盟超时
 * @param id
 */
var OnAllianceTimeout = function(id){
	var self = this
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(!_.isObject(alliance)){
			UnlockAlliance.call(self, id)
		}else{
			clearTimeout(alliance.timeout)
			var hasMemberOnline = _.some(alliance.doc.members, function(member){
				return !!member.online
			})
			if(hasMemberOnline){
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				UnlockAlliance.call(self, id)
			}else{
				self.timeEventService.removeAllianceTempTimeEventsAsync(alliance.doc).catch(function(e){
					self.logService.onEventError("cache.cacheService.OnAllianceTimeout.removeAllianceTempTimeEvents", {id:id}, e.stack)
					return Promise.resolve()
				}).then(function(){
					delete self.alliances[id]
					if(alliance.ops > 0){
						self.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
							self.logService.onEvent("cache.cacheService.OnAllianceTimeout", {id:id})
							UnlockAlliance.call(self, id)
						}).catch(function(e){
							self.logService.onEventError("cache.cacheService.OnAllianceTimeout", {id:id, doc:alliance.doc}, e.stack)
							UnlockAlliance.call(self, id)
						})
						alliance.ops = 0
					}else{
						self.logService.onEvent("cache.cacheService.OnAllianceTimeout", {id:id})
						UnlockAlliance.call(self, id)
					}
				})
			}
		}
	})
}

/**
 * 加入玩家请求队列
 * @param id
 * @param func
 */
var LockPlayer = function(id, func){
	if(!_.isObject(this.playersQueue[id])) this.playersQueue[id] = []
	this.playersQueue[id].push({func:func, time:Date.now()})
	if(this.playersQueue[id].length == 1) this.playersQueue[id][0].func()
}

/**
 * 加入联盟请求队列
 * @param id
 * @param func
 */
var LockAlliance = function(id, func){
	if(!_.isObject(this.alliancesQueue[id])) this.alliancesQueue[id] = []
	this.alliancesQueue[id].push({func:func, time:Date.now()})
	if(this.alliancesQueue[id].length == 1) this.alliancesQueue[id][0].func()
}

/**
 * 从玩家请求队列移除
 * @param id
 */
var UnlockPlayer = function(id){
	var playerQueue = this.playersQueue[id]
	if(!_.isArray(playerQueue) || playerQueue.length == 0){
		var e = new Error("请求队列不存在或为空")
		this.logService.onEventError("cache.cacheService.UnlockPlayer", {id:id}, e.stack)
	}else{
		playerQueue.shift()
		if(playerQueue.length > 0){
			_.each(playerQueue, function(queue){
				queue.time = Date.now()
			})
			process.nextTick(playerQueue[0].func)
		}else{
			delete this.playersQueue[id]
		}
	}
}

/**
 * 从玩家请求队列移除
 * @param id
 */
var UnlockAlliance = function(id){
	var allianceQueue = this.alliancesQueue[id]
	if(!_.isArray(allianceQueue) || allianceQueue.length == 0){
		var e = new Error("请求队列不存在或为空")
		this.logService.onEventError("cache.cacheService.UnlockAlliance", {id:id}, e.stack)
	}else{
		allianceQueue.shift()
		if(allianceQueue.length > 0){
			_.each(allianceQueue, function(queue){
				queue.time = Date.now()
			})
			process.nextTick(allianceQueue[0].func)
		}else{
			delete this.alliancesQueue[id]
		}
	}
}

/**
 * 获取玩家模型
 * @returns {*|DataService.Player}
 */
pro.getPlayerModel = function(){
	return this.Player
}

/**
 * 获取联盟模型
 * @returns {*|DataService.Alliance}
 */
pro.getAllianceModel = function(){
	return this.Alliance
}

/**
 * 玩家数据是否被锁定
 * @param id
 * @returns {boolean}
 */
pro.isPlayerLocked = function(id){
	return _.isObject(this.playersQueue[id]) && this.playersQueue[id].length > 0
}

/**
 * 联盟数据是否被锁定
 * @param id
 * @returns {boolean}
 */
pro.isAllianceLocked = function(id){
	return _.isObject(this.alliancesQueue[id]) && this.alliancesQueue[id].length > 0
}

/**
 * 创建联盟对象
 * @param allianceData
 * @param callback
 */
pro.createAlliance = function(allianceData, callback){
	this.logService.onFind('cache.cacheService.createAlliance', {id:allianceData._id})
	var self = this
	LockAlliance.call(this, allianceData._id, function(){
		var mapIndex = null;
		var hasFound = _.find(AllianceMap.bigRound, function(round){
			var locationFrom = {x:round.locationFromX, y:round.locationFromY};
			return _.find(AllianceMap.roundIndex, function(index){
				var x = locationFrom.x + index.x;
				var y = locationFrom.y + index.y;
				mapIndex = x + (y * self.bigMapLength);
				return !self.bigMap[mapIndex].allianceData && !self.mapIndexMap[mapIndex];
			})
		})
		if(!hasFound){
			UnlockAlliance.call(self, allianceData._id)
			callback(ErrorUtils.noFreeMapArea());
			return
		}
		if(self.allianceNameMap[allianceData.basicInfo.name]){
			UnlockAlliance.call(self, allianceData._id)
			callback(ErrorUtils.allianceNameExist(null, allianceData.basicInfo.name))
			return
		}
		if(self.allianceTagMap[allianceData.basicInfo.tag]){
			UnlockAlliance.call(self, allianceData._id)
			callback(ErrorUtils.allianceTagExist(null, allianceData.basicInfo.tag))
			return
		}
		self.allianceNameMap[allianceData.basicInfo.name] = true
		self.allianceTagMap[allianceData.basicInfo.tag] = true
		self.mapIndexMap[mapIndex] = true;
		allianceData.mapIndex = mapIndex;
		var promise = new Promise(function(resolve, reject){
			self.Alliance.collection.find({"basicInfo.name":allianceData.basicInfo.name}, {_id:true}).count(function(e, size){
				if(_.isObject(e)) reject(e)
				else if(size > 0) reject(ErrorUtils.allianceNameExist(null, allianceData.basicInfo.name))
				else resolve()
			})
		})
		promise.then(function(){
			return new Promise(function(resolve, reject){
				self.Alliance.collection.find({"basicInfo.tag":allianceData.basicInfo.tag}, {_id:true}).count(function(e, size){
					if(_.isObject(e)) reject(e)
					else if(size > 0) reject(ErrorUtils.allianceTagExist(null, allianceData.basicInfo.tag))
					else resolve()
				})
			})
		}).then(function(){
			return self.Alliance.createAsync(allianceData)
		}).then(function(doc){
			var allianceDoc = doc.toObject()
			var alliance = {}
			alliance.doc = allianceDoc
			alliance.ops = 0
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, allianceData._id)
			self.alliances[allianceData._id] = alliance
			self.updateMapAlliance(allianceDoc.mapIndex, allianceDoc, null);

			delete self.allianceNameMap[allianceData.basicInfo.name]
			delete self.allianceTagMap[allianceData.basicInfo.tag]
			delete self.mapIndexMap[mapIndex];

			callback(null, allianceDoc)
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.createAlliance", {
				allianceId:allianceData._id,
				allianceName:allianceData.basicInfo.name,
				allianceTag:allianceData.basicInfo.tag
			}, e.stack)
			delete self.allianceNameMap[allianceData.basicInfo.name];
			delete self.allianceTagMap[allianceData.basicInfo.tag];
			delete self.mapIndexMap[mapIndex];
			UnlockAlliance.call(self, allianceData._id)
			callback(e)
		})
	})
}

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindPlayer = function(id, callback){
	this.logService.onFind('cache.cacheService.directFindPlayer', {id:id})
	var self = this
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			UnlockPlayer.call(self, id)
			callback(null, player.doc)
		}else{
			var playerDoc = null
			self.Player.findOneAsync({_id:id, 'serverId':self.cacheServerId}).then(function(doc){
				if(_.isObject(doc)){
					playerDoc = doc.toObject()
					player = {}
					player.doc = playerDoc
					player.ops = 0
					player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
					self.players[id] = player
					return self.timeEventService.restorePlayerTimeEventsAsync(playerDoc)
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				UnlockPlayer.call(self, id)
				callback(null, playerDoc)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.directFindPlayer", {id:id}, e.stack)
				UnlockPlayer.call(self, id)
				callback(e)
			})
		}
	})
}

/**
 * 按Id直接查询联盟,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindAlliance = function(id, callback){
	this.logService.onFind('cache.cacheService.directFindAlliance', {id:id})
	var self = this
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			UnlockAlliance.call(self, id)
			callback(null, alliance.doc)
		}else{
			var allianceDoc = null
			self.Alliance.findOneAsync({_id:id, 'serverId':self.cacheServerId}).then(function(doc){
				if(_.isObject(doc)){
					allianceDoc = doc.toObject()
					alliance = {}
					alliance.doc = allianceDoc
					alliance.ops = 0
					alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
					self.alliances[id] = alliance
					return self.timeEventService.restoreAllianceTempTimeEventsAsync(allianceDoc)
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				UnlockAlliance.call(self, id)
				callback(null, allianceDoc)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.directFindAlliance", {id:id}, e.stack)
				UnlockAlliance.call(self, id)
				callback(e)
			})
		}
	})
}

/**
 * 按Id查询玩家
 * @param id
 * @param callback
 */
pro.findPlayer = function(id, callback){
	this.logService.onFind('cache.cacheService.findPlayer', {id:id})
	var self = this
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			callback(null, player.doc)
		}else{
			var playerDoc = null
			self.Player.findOneAsync({_id:id, 'serverId':self.cacheServerId}).then(function(doc){
				if(_.isObject(doc)){
					playerDoc = doc.toObject()
					player = {}
					player.doc = playerDoc
					player.ops = 0
					player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
					self.players[id] = player
					return self.timeEventService.restorePlayerTimeEventsAsync(playerDoc)
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				if(!_.isObject(playerDoc)){
					UnlockPlayer.call(self, id)
				}
				callback(null, playerDoc)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.findPlayer", {id:id}, e.stack)
				UnlockPlayer.call(self, id)
				callback(e)
			})
		}
	})
}

/**
 * 按Id查询联盟
 * @param id
 * @param callback
 */
pro.findAlliance = function(id, callback){
	this.logService.onFind('cache.cacheService.findAlliance', {id:id})
	var self = this
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			callback(null, alliance.doc)
		}else{
			var allianceDoc = null
			self.Alliance.findOneAsync({_id:id, 'serverId':self.cacheServerId}).then(function(doc){
				if(_.isObject(doc)){
					allianceDoc = doc.toObject()
					alliance = {}
					alliance.doc = allianceDoc
					alliance.ops = 0
					alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
					self.alliances[id] = alliance
					return self.timeEventService.restoreAllianceTempTimeEventsAsync(allianceDoc)
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				if(!_.isObject(allianceDoc)){
					UnlockAlliance.call(self, id)
				}
				callback(null, allianceDoc)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.findAlliance", {id:id}, e.stack)
				UnlockAlliance.call(self, id)
				callback(e)
			})
		}
	})
}

/**
 * 更新玩家对象
 * @param id
 * @param doc
 * @param callback
 */
pro.updatePlayer = function(id, doc, callback){
	this.logService.onFind('cache.cacheService.updatePlayer', {id:id})
	var self = this
	var player = this.players[id]
	if(_.isObject(doc)){
		player.doc = doc
		player.ops += 1
	}
	if(player.ops >= this.flushOps){
		clearTimeout(player.timeout)
		this.Player.updateAsync({_id:id}, _.omit(player.doc, "_id")).then(function(){
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			UnlockPlayer.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.updatePlayer", {id:id, doc:player.doc}, e.stack)
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			UnlockPlayer.call(self, id)
			callback(e)
		})
		player.ops = 0
	}else{
		UnlockPlayer.call(self, id)
		callback()
	}
}

/**
 * 更新联盟对象
 * @param id
 * @param doc
 * @param callback
 */
pro.updateAlliance = function(id, doc, callback){
	this.logService.onFind('cache.cacheService.updateAlliance', {id:id})
	var self = this
	var alliance = this.alliances[id]
	if(_.isObject(doc)){
		alliance.doc = doc
		alliance.ops += 1
	}
	if(alliance.ops >= this.flushOps){
		clearTimeout(alliance.timeout)
		this.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			UnlockAlliance.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.updateAlliance", {id:id, doc:alliance.doc}, e.stack)
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			UnlockAlliance.call(self, id)
			callback(e)
		})
		alliance.ops = 0
	}else{
		UnlockAlliance.call(self, id)
		callback()
	}
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param doc
 * @param callback
 */
pro.flushPlayer = function(id, doc, callback){
	this.logService.onFind('cache.cacheService.flushPlayer', {id:id})
	var self = this
	var player = this.players[id]
	if(_.isObject(doc)){
		player.doc = doc
		player.ops += 1
	}
	clearTimeout(player.timeout)
	if(player.ops > 0){
		self.Player.updateAsync({_id:id}, _.omit(player.doc, "_id")).then(function(){
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			UnlockPlayer.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushPlayer", {id:id, doc:player.doc}, e.stack)
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			UnlockPlayer.call(self, id)
			callback(e)
		})
		player.ops = 0
	}else{
		player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
		UnlockPlayer.call(self, id)
		callback()
	}
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param doc
 * @param callback
 */
pro.flushAlliance = function(id, doc, callback){
	this.logService.onFind('cache.cacheService.flushAlliance', {id:id})
	var self = this
	var alliance = this.alliances[id]
	if(_.isObject(doc)){
		alliance.doc = doc
		alliance.ops += 1
	}
	clearTimeout(alliance.timeout)
	if(alliance.ops > 0){
		self.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			UnlockAlliance.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushAlliance", {id:id, doc:alliance.doc}, e.stack)
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			UnlockAlliance.call(self, id)
			callback(e)
		})
		alliance.ops = 0
	}else{
		alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
		UnlockAlliance.call(self, id)
		callback()
	}
}

/**
 * 更新玩家并同步到Mongo最后将玩家从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutPlayer = function(id, doc, callback){
	this.logService.onFind('cache.cacheService.timeoutPlayer', {id:id})
	var self = this
	var player = this.players[id]
	if(_.isObject(doc)){
		player.doc = doc
		player.ops += 1
	}
	clearTimeout(player.timeout)
	delete self.players[id]
	this.timeEventService.clearPlayerTimeEventsAsync(player.doc).catch(function(e){
		self.logService.onEventError("cache.cacheService.timeoutPlayer.clearPlayerTimeEvents", {id:id}, e.stack)
		return Promise.resolve()
	}).then(function(){
		if(player.ops > 0){
			self.Player.updateAsync({_id:id}, _.omit(player.doc, "_id")).then(function(){
				self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:id})
				UnlockPlayer.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutPlayer", {id:id, doc:player.doc}, e.stack)
				UnlockPlayer.call(self, id)
				callback(e)
			})
			player.ops = 0
		}else{
			self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:id})
			UnlockPlayer.call(self, id)
			callback()
		}
	})
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutAlliance = function(id, doc, callback){
	this.logService.onFind('cache.cacheService.timeoutAlliance', {id:id})
	var self = this
	var alliance = this.alliances[id]
	if(_.isObject(doc)){
		alliance.doc = doc
		alliance.ops += 1
	}
	clearTimeout(alliance.timeout)
	delete self.alliances[id]
	this.timeEventService.removeAllianceTempTimeEventsAsync(alliance.doc).catch(function(e){
		self.logService.onEventError("cache.cacheService.timeoutPlayer.removeAllianceTempTimeEvents", {id:id}, e.stack)
		return Promise.resolve()
	}).then(function(){
		if(alliance.ops > 0){
			self.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
				self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:id})
				UnlockAlliance.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutAlliance", {id:id, doc:alliance.doc}, e.stack)
				UnlockAlliance.call(self, id)
				callback()
			})
			alliance.ops = 0
		}else{
			self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:id})
			UnlockAlliance.call(self, id)
			callback()
		}
	})
}

/**
 * 删除联盟
 * @param id
 * @param callback
 */
pro.deleteAlliance = function(id, callback){
	this.logService.onFind('cache.cacheService.deleteAlliance', {id:id})
	var self = this
	var alliance = this.alliances[id]
	clearTimeout(alliance.timeout)
	delete self.alliances[id]
	this.timeEventService.removeAllianceTempTimeEventsAsync(alliance.doc).catch(function(e){
		self.logService.onEventError("cache.cacheService.timeoutPlayer.removeAllianceTempTimeEvents", {id:id}, e.stack)
		return Promise.resolve()
	}).then(function(){
		self.Alliance.findByIdAndRemoveAsync(id).then(function(){
			UnlockAlliance.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.deleteAlliance", {id:id}, e.stack)
		})
	})
}

/**
 * 更新所有玩家并同步到Mongo最后将玩家从内存移除
 * @param callback
 */
pro.timeoutAllPlayers = function(callback){
	var self = this
	var timeoutPlayer = function(player, callback){
		if(player.ops > 0){
			self.Player.updateAsync({_id:player.doc._id}, _.omit(player.doc, "_id")).then(function(){
				self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:player.doc._id})
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutPlayer", {id:player.doc._id, doc:player.doc}, e.stack)
				callback()
			})
			player.ops = 0
		}else{
			self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:player.doc._id})
			callback()
		}
	}
	var timeoutPlayerAsync = Promise.promisify(timeoutPlayer, this)
	var players = _.values(this.players)
	_.each(players, function(player){
		clearTimeout(player.timeout)
	});

	(function excuteTimeout(){
		if(players.length > 0){
			timeoutPlayerAsync(players.shift()).then(function(){
				excuteTimeout()
			})
		}else{
			callback()
		}
	})()
}

/**
 * 更新所有联盟并同步到Mongo最后将联盟从内存移除
 * @param callback
 */
pro.timeoutAllAlliances = function(callback){
	var self = this
	var timeoutAlliance = function(alliance, callback){
		if(alliance.ops > 0){
			self.Alliance.updateAsync({_id:alliance.doc._id}, _.omit(alliance.doc, "_id")).then(function(){
				self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:alliance.doc._id})
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutAlliance", {
					id:alliance.doc._id,
					doc:alliance.doc
				}, e.stack)
				callback()
			})
			alliance.ops = 0
		}else{
			self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:alliance.doc._id})
			callback()
		}
	}
	var timeoutAllianceAsync = Promise.promisify(timeoutAlliance, this)
	var alliances = _.values(this.alliances)
	_.each(alliances, function(alliance){
		clearTimeout(alliance.timeout)
	});

	(function excuteTimeout(){
		if(alliances.length > 0){
			timeoutAllianceAsync(alliances.shift()).then(function(){
				excuteTimeout()
			})
		}else{
			callback()
		}
	})()
}

/**
 * 玩家是否在缓存
 * @param playerId
 */
pro.isPlayerInCache = function(playerId){
	return _.isObject(this.players[playerId]);
}

/**
 * 联盟是否在缓存
 * @param allianceId
 */
pro.isAllianceInCache = function(allianceId){
	return _.isObject(this.alliances[allianceId]);
}


/**
 * 获取大地图地形数据
 * @returns {{}|*}
 */
pro.getMapIndexs = function(){
	return this.mapIndexs;
}

/**
 * 获取地图Map
 * @param index
 * @returns {*}
 */
pro.getMapDataAtIndex = function(index){
	return this.bigMap[index];
}

/**
 * 更新地图联盟对象
 * @param index
 * @param allianceDoc
 * @param callback
 */
pro.updateMapAlliance = function(index, allianceDoc, callback){
	var mapIndexData = this.bigMap[index];
	if(!!allianceDoc){
		mapIndexData.allianceData = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag,
			terrain:allianceDoc.basicInfo.terrain,
			status:allianceDoc.basicInfo.status
		};
		this.mapIndexs[index] = AllianceMap.terrainStyle[allianceDoc.basicInfo.terrain + '_' + allianceDoc.basicInfo.terrainStyle].index
	}else{
		var eventName = Events.alliance.onAllianceDataChanged;
		if(!!mapIndexData.allianceData){
			var uids = _.values(mapIndexData.channel.records);
			if(uids.length > 0){
				self.channelService.pushMessageByUids(eventName, {
					targetAllianceId:mapIndexData.allianceData.id,
					data:[['', null]]
				}, uids, {}, function(e){
					if(_.isObject(e)) self.logService.onEventError("cache.cacheService.updateMapAlliance", {mapIndex:mapIndex}, e.stack)
				})
			}
		}
		mapIndexData.allianceData = null;
		delete this.mapIndexs[index];
	}
	if(!!callback) callback();
}

var GetLocationFromEvent = function(event){
	var bigMapLength = DataUtils.getAllianceIntInit('bigMapLength');
	var from = {
		x:event.fromAlliance.mapIndex % bigMapLength,
		y:Math.floor(event.fromAlliance.mapIndex / bigMapLength)
	};
	var to = {
		x:event.toAlliance.mapIndex % bigMapLength,
		y:Math.floor(event.toAlliance.mapIndex / bigMapLength)
	}
	if(from.x > to.x){
		var tmp = from;
		from = to;
		to = tmp;
	}
	return {from:from, to:to};
}

/**
 * 添加新的地图事件
 * @param eventType
 * @param event
 * @param callback
 */
pro.addMarchEvent = function(eventType, event, callback){
	this.logService.onEvent('cache.cacheService.addMarchEvent', {eventType:eventType, event:event});
	var self = this;
	var locations = GetLocationFromEvent(event);
	var from = locations.from;
	var to = locations.to;
	var AddEvent = function(mapIndex){
		if(mapIndex === event.fromAlliance.mapIndex) return;
		var mapIndexData = self.bigMap[mapIndex];
		mapIndexData.mapData.marchEvents[eventType][event.id] = event;
		var uids = []
		if(!!mapIndexData.allianceData){
			var channelName = Consts.AllianceChannelPrefix + "_" + mapIndexData.allianceData.id;
			var channel = self.channelService.getChannel(channelName, false)
			if(!!channel){
				uids = uids.concat(_.values(channel.records))
			}
		}
		uids = uids.concat(_.values(mapIndexData.channel.records))
		if(uids.length > 0){
			self.channelService.pushMessageByUids(Events.alliance.onMapDataChanged, {
				targetMapIndex:mapIndex,
				data:[['marchEvents.' + eventType + '.' + event.id, event]]
			}, uids, {}, function(e){
				if(_.isObject(e)){
					self.logService.onEventError("cache.cacheService.addMarchEvent", {
						mapIndex:mapIndex,
						eventType:eventType,
						event:event
					}, e.stack)
				}
			})
		}
	}

	var j = null;
	for(var i = from.x; i <= to.x; i++){
		if(from.y <= to.y){
			for(j = from.y; j <= to.y; j++){
				AddEvent(i + (j * self.bigMapLength));
			}
		}else{
			for(j = from.y; j >= to.y; j--){
				AddEvent(i + (j * self.bigMapLength));
			}
		}
	}
	callback();
}

/**
 * 更新地图事件
 * @param eventType
 * @param event
 * @param callback
 */
pro.updateMarchEvent = function(eventType, event, callback){
	this.logService.onEvent('cache.cacheService.updateMarchEvent', {eventType:eventType, event:event});
	var self = this;
	var locations = GetLocationFromEvent(event);
	var from = locations.from;
	var to = locations.to;

	var UpdateEvent = function(mapIndex){
		if(mapIndex === event.fromAlliance.mapIndex) return;
		var mapIndexData = self.bigMap[mapIndex];
		mapIndexData.mapData.marchEvents[eventType][event.id] = event;
		var uids = []
		if(!!mapIndexData.allianceData){
			var channelName = Consts.AllianceChannelPrefix + "_" + mapIndexData.allianceData.id;
			var channel = self.channelService.getChannel(channelName, false)
			if(!!channel){
				uids = uids.concat(_.values(channel.records))
			}
		}
		uids = uids.concat(_.values(mapIndexData.channel.records))
		if(uids.length > 0){
			self.channelService.pushMessageByUids(Events.alliance.onMapDataChanged, {
				targetMapIndex:mapIndex,
				data:[['marchEvents.' + eventType + '.' + event.id + '.arriveTime', event.arriveTime]]
			}, uids, {}, function(e){
				if(_.isObject(e)){
					self.logService.onEventError("cache.cacheService.updateMarchEvent", {
						mapIndex:mapIndex,
						eventType:eventType,
						event:event
					}, e.stack)
				}
			})
		}
	}

	var j = null;
	for(var i = from.x; i <= to.x; i++){
		if(from.y <= to.y){
			for(j = from.y; j <= to.y; j++){
				UpdateEvent(i + (j * self.bigMapLength));
			}
		}else{
			for(j = from.y; j >= to.y; j--){
				UpdateEvent(i + (j * self.bigMapLength));
			}
		}
	}

	callback();
}

/**
 * 移除地图事件
 * @param eventType
 * @param event
 * @param callback
 */
pro.removeMarchEvent = function(eventType, event, callback){
	this.logService.onEvent('cache.cacheService.removeMarchEvent', {eventType:eventType, event:event});
	var self = this;
	var locations = GetLocationFromEvent(event);
	var from = locations.from;
	var to = locations.to;

	var RemoveEvent = function(mapIndex){
		if(mapIndex === event.fromAlliance.mapIndex) return;
		var mapIndexData = self.bigMap[mapIndex];
		delete mapIndexData.mapData.marchEvents[eventType][event.id];
		var uids = []
		if(!!mapIndexData.allianceData){
			var channelName = Consts.AllianceChannelPrefix + "_" + mapIndexData.allianceData.id;
			var channel = self.channelService.getChannel(channelName, false)
			if(!!channel){
				uids = uids.concat(_.values(channel.records))
			}
		}
		uids = uids.concat(_.values(mapIndexData.channel.records))
		if(uids.length > 0){
			self.channelService.pushMessageByUids(Events.alliance.onMapDataChanged, {
				targetMapIndex:mapIndex,
				data:[['marchEvents.' + eventType + '.' + event.id, null]]
			}, uids, {}, function(e){
				if(_.isObject(e)){
					self.logService.onEventError("cache.cacheService.removeMarchEvent", {
						mapIndex:mapIndex,
						eventType:eventType,
						event:event
					}, e.stack)
				}
			})
		}
	}

	var j = null;
	for(var i = from.x; i <= to.x; i++){
		if(from.y <= to.y){
			for(j = from.y; j <= to.y; j++){
				RemoveEvent(i + (j * self.bigMapLength));
			}
		}else{
			for(j = from.y; j >= to.y; j--){
				RemoveEvent(i + (j * self.bigMapLength));
			}
		}
	}

	callback();
}

/**
 * 添加新的采集事件
 * @param event
 * @param callback
 */
pro.addVillageEvent = function(event, callback){
	this.logService.onEvent('cache.cacheService.addVillageEvent', {event:event});
	var self = this;
	var locations = GetLocationFromEvent(event);
	var from = locations.from;
	var to = locations.to;

	var AddEvent = function(mapIndex){
		if(mapIndex === event.fromAlliance.mapIndex) return;
		var mapIndexData = self.bigMap[mapIndex];
		mapIndexData.mapData.villageEvents[event.id] = event;
		var uids = []
		if(!!mapIndexData.allianceData){
			var channelName = Consts.AllianceChannelPrefix + "_" + mapIndexData.allianceData.id;
			var channel = self.channelService.getChannel(channelName, false)
			if(!!channel){
				uids = uids.concat(_.values(channel.records))
			}
		}
		uids = uids.concat(_.values(mapIndexData.channel.records))
		if(uids.length > 0){
			self.channelService.pushMessageByUids(Events.alliance.onMapDataChanged, {
				targetMapIndex:mapIndex,
				data:[['villageEvents.' + event.id, event]]
			}, uids, {}, function(e){
				if(_.isObject(e)){
					self.logService.onEventError("cache.cacheService.addVillageEvent", {
						mapIndex:mapIndex,
						event:event
					}, e.stack)
				}
			})
		}
	}

	var j = null;
	for(var i = from.x; i <= to.x; i++){
		if(from.y <= to.y){
			for(j = from.y; j <= to.y; j++){
				AddEvent(i + (j * self.bigMapLength));
			}
		}else{
			for(j = from.y; j >= to.y; j--){
				AddEvent(i + (j * self.bigMapLength));
			}
		}
	}
	callback();
}

/**
 * 更新采集事件
 * @param event
 * @param callback
 */
pro.updateVillageEvent = function(event, callback){
	this.logService.onEvent('cache.cacheService.updateVillageEvent', {event:event});
	var self = this;
	var locations = GetLocationFromEvent(event);
	var from = locations.from;
	var to = locations.to;

	var UpdateEvent = function(mapIndex){
		if(mapIndex === event.fromAlliance.mapIndex) return;
		var mapIndexData = self.bigMap[mapIndex];
		mapIndexData.mapData.villageEvents[event.id] = event;
		var uids = []
		if(!!mapIndexData.allianceData){
			var channelName = Consts.AllianceChannelPrefix + "_" + mapIndexData.allianceData.id;
			var channel = self.channelService.getChannel(channelName, false)
			if(!!channel){
				uids = uids.concat(_.values(channel.records))
			}
		}
		uids = uids.concat(_.values(mapIndexData.channel.records))
		if(uids.length > 0){
			self.channelService.pushMessageByUids(Events.alliance.onMapDataChanged, {
				targetMapIndex:mapIndex,
				data:[['villageEvents.' + event.id, event]]
			}, uids, {}, function(e){
				if(_.isObject(e)){
					self.logService.onEventError("cache.cacheService.updateVillageEvent", {
						mapIndex:mapIndex,
						event:event
					}, e.stack)
				}
			})
		}
	}

	var j = null;
	for(var i = from.x; i <= to.x; i++){
		if(from.y <= to.y){
			for(j = from.y; j <= to.y; j++){
				UpdateEvent(i + (j * self.bigMapLength));
			}
		}else{
			for(j = from.y; j >= to.y; j--){
				UpdateEvent(i + (j * self.bigMapLength));
			}
		}
	}

	callback();
}

/**
 * 移除采集事件
 * @param event
 * @param callback
 */
pro.removeVillageEvent = function(event, callback){
	this.logService.onEvent('cache.cacheService.removeVillageEvent', {event:event});
	var self = this;
	var locations = GetLocationFromEvent(event);
	var from = locations.from;
	var to = locations.to;

	var RemoveEvent = function(mapIndex){
		if(mapIndex === event.fromAlliance.mapIndex) return;
		var mapIndexData = self.bigMap[mapIndex];
		delete mapIndexData.mapData.villageEvents[event.id];
		var uids = []
		if(!!mapIndexData.allianceData){
			var channelName = Consts.AllianceChannelPrefix + "_" + mapIndexData.allianceData.id;
			var channel = self.channelService.getChannel(channelName, false)
			if(!!channel){
				uids = uids.concat(_.values(channel.records))
			}
		}
		uids = uids.concat(_.values(mapIndexData.channel.records))
		if(uids.length > 0){
			self.channelService.pushMessageByUids(Events.alliance.onMapDataChanged, {
				targetMapIndex:mapIndex,
				data:[['villageEvents.' + event.id, null]]
			}, uids, {}, function(e){
				if(_.isObject(e)){
					self.logService.onEventError("cache.cacheService.removeVillageEvent", {
						mapIndex:mapIndex,
						event:event
					}, e.stack)
				}
			})
		}
	}

	var j = null;
	for(var i = from.x; i <= to.x; i++){
		if(from.y <= to.y){
			for(j = from.y; j <= to.y; j++){
				RemoveEvent(i + (j * self.bigMapLength));
			}
		}else{
			for(j = from.y; j >= to.y; j--){
				RemoveEvent(i + (j * self.bigMapLength));
			}
		}
	}

	callback();
}


/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.addToAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onEvent('cache.cacheService.addToAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, true).add(playerId, logicServerId)
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.removeFromAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onEvent('cache.cacheService.removeFromAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(!_.isObject(channel)){
		this.logService.onEventError('cache.cacheService.removeFromAllianceChannel', {
			allianceId:allianceId,
			playerId:playerId,
			logicServerId:logicServerId
		}, new Error('channel 不存在').stack)
		callback()
		return
	}
	channel.leave(playerId, logicServerId)
	callback()
}

/**
 * 删除联盟频道
 * @param allianceId
 * @param callback
 */
pro.destroyAllianceChannel = function(allianceId, callback){
	this.logService.onEvent('cache.cacheService.destroyAllianceChannel', {allianceId:allianceId});
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(!_.isObject(channel)){
		this.logService.onEventError('cache.cacheService.destroyAllianceChannel', {
			allianceId:allianceId
		}, new Error('channel 不存在').stack)
		return callback()
	}
	channel.destroy()
	callback()
}

/**
 * 离开被观察的地块
 * @param viewer
 * @param timeout
 */
var LeaveChannel = function(viewer, timeout){
	var playerId = viewer.playerId;
	var logicServerId = viewer.logicServerId;
	var timer = viewer.timer;
	var mapIndex = viewer.mapIndex;
	var mapIndexData = this.bigMap[mapIndex];
	var channel = mapIndexData.channel;
	if(!!timeout){
		this.logService.onEvent('cache.cacheService.LeaveChannel', {
			playerId:playerId,
			logicServerId:logicServerId,
			channel:channel.name
		}, new Error('未正常发出观察心跳').stack);
	}
	clearTimeout(timer);
	channel.leave(playerId, logicServerId);
	delete this.mapViewers[playerId];
}

/**
 * 进入被观察地块
 * @param playerId
 * @param logicServerId
 * @param mapIndex
 * @param callback
 */
pro.enterMapIndexChannel = function(playerId, logicServerId, mapIndex, callback){
	this.logService.onEvent('cache.cacheService.enterMapIndexChannel', {
		playerId:playerId,
		logicServerId:logicServerId,
		mapIndex:mapIndex
	});

	var viewer = this.mapViewers[playerId];
	if(!!viewer) LeaveChannel.call(this, viewer, false);

	var mapIndexData = this.bigMap[mapIndex];
	var channel = mapIndexData.channel;
	channel.add(playerId, logicServerId)
	viewer = {
		playerId:playerId,
		logicServerId:logicServerId,
		mapIndex:mapIndex
	};
	viewer.timer = setTimeout(LeaveChannel.bind(this), 1000 * 20, viewer, true);
	this.mapViewers[playerId] = viewer;

	if(!this.bigMap[mapIndex].allianceData){
		return callback(null, {allianceData:null, mapData:mapIndexData.mapData});
	}

	var allianceId = this.bigMap[mapIndex].allianceData.id;
	this.directFindAllianceAsync(allianceId).then(function(doc){
		callback(null, {allianceData:_.pick(doc, Consts.AllianceViewDataKeys), mapData:mapIndexData.mapData});
	})
}

/**
 * 进入被观察地块后的心跳
 * @param playerId
 * @param logicServerId
 * @param mapIndex
 * @param callback
 */
pro.amInMapIndexChannel = function(playerId, logicServerId, mapIndex, callback){
	this.logService.onEvent('cache.cacheService.amInMapIndexChannel', {
		playerId:playerId,
		logicServerId:logicServerId,
		mapIndex:mapIndex
	});

	var viewer = this.mapViewers[playerId];
	if(!viewer || viewer.mapIndex !== mapIndex){
		return callback(ErrorUtils.playerNotViewThisMapIndex(playerId, mapIndex));
	}
	clearTimeout(viewer.timer);
	viewer.timer = setTimeout(LeaveChannel.bind(this), 1000 * 20, viewer, true)
	callback();
}

/**
 * 玩家离开被观察的地块
 * @param playerId
 * @param logicServerId
 * @param mapIndex
 * @param callback
 * @returns {*}
 */
pro.leaveMapIndexChannel = function(playerId, logicServerId, mapIndex, callback){
	this.logService.onEvent('cache.cacheService.leaveAllianceChannel', {
		playerId:playerId,
		logicServerId:logicServerId,
		mapIndex:mapIndex
	});
	var viewer = this.mapViewers[playerId];
	if(!viewer || viewer.mapIndex !== mapIndex){
		return callback(ErrorUtils.playerNotViewThisMapIndex(playerId, mapIndex));
	}
	LeaveChannel.call(this, viewer, false);
	callback();
}

/**
 * 从玩家正在观察的地块移除
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.removeFromViewedMapIndexChannel = function(playerId, logicServerId, callback){
	this.logService.onEvent('cache.cacheRemote.removeFromViewedAllianceChannel', {
		playerId:playerId,
		logicServerId:logicServerId
	});
	var viewer = this.mapViewers[playerId];
	if(!viewer) return callback();
	LeaveChannel.call(this, viewer, false);
	callback();
}
