"use strict"

/**
 * Created by modun on 15/3/6.
 */

var toobusy = require("toobusy-js")
var Promise = require("bluebird")
var _ = require("underscore")

var DataUtils = require("../utils/dataUtils")
var Consts = require("../consts/consts.js")
var ErrorUtils = require("../utils/errorUtils.js")

var DataService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.timeEventService = app.get("timeEventService")
	this.Player = app.get("Player")
	this.Alliance = app.get("Alliance")
	this.players = {}
	this.playersQueue = {}
	this.alliances = {}
	this.alliancesQueue = {}
	this.allianceNameMap = {}
	this.allianceTagMap = {}
	this.maxPlayerQueue = 1
	this.maxAllianceQueue = 1
	this.flushOps = 10
	this.timeoutInterval = 10 * 60 * 1000
	this.lockCheckInterval = 4 * 1000
	this.lockInterval = 8 * 1000
	setInterval(OnLockCheckInterval.bind(this), this.lockCheckInterval)
	this.toobusyMaxLag = 140
	this.toobusyInterval = 250
	toobusy.maxLag(this.toobusyMaxLag)
	toobusy.interval(this.toobusyInterval)
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
			self.logService.onEventError("cache.cacheService.OnLockCheckInterval", {id:id}, e.stack)
			UnlockPlayer.call(self, id)
		}
	})
	_.each(this.alliancesQueue, function(queue, id){
		if(queue.length > 0 && queue[0].time + self.lockInterval < Date.now()){
			var e = new Error("联盟数据锁超时")
			self.logService.onEventError("cache.cacheService.OnLockCheckInterval", {id:id}, e.stack)
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
							self.logService.onEventError("cache.cacheService.OnPlayerTimeout", {id:id}, e.stack)
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
				delete self.alliances[id]
				if(alliance.ops > 0){
					self.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
						self.logService.onEvent("cache.cacheService.OnAllianceTimeout", {id:id})
						UnlockAlliance.call(self, id)
					}).catch(function(e){
						self.logService.onEventError("cache.cacheService.OnAllianceTimeout", {id:id}, e.stack)
						UnlockAlliance.call(self, id)
					})
					alliance.ops = 0
				}else{
					self.logService.onEvent("cache.cacheService.OnAllianceTimeout", {id:id})
					UnlockAlliance.call(self, id)
				}
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
 * 创建联盟对象
 * @param allianceData
 * @param callback
 */
pro.createAlliance = function(allianceData, callback){
	var self = this
	LockAlliance.call(this, allianceData._id, function(){
		if(self.allianceNameMap[allianceData.basicInfo.name]){
			callback(ErrorUtils.allianceNameExist(null, allianceData.basicInfo.name))
			return
		}
		if(self.allianceNameMap[allianceData.basicInfo.tag]){
			callback(ErrorUtils.allianceTagExist(null, allianceData.basicInfo.tag))
			return
		}
		self.allianceNameMap[allianceData.basicInfo.name] = true
		self.allianceTagMap[allianceData.basicInfo.tag] = true
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
			delete self.allianceNameMap[allianceData.basicInfo.name]
			delete self.allianceTagMap[allianceData.basicInfo.tag]
			var allianceDoc = doc.toObject()
			var alliance = {}
			alliance.doc = allianceDoc
			alliance.ops = 0
			alliance.doc.members[0].online = true
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, allianceData._id)
			self.alliances[allianceData._id] = alliance
			callback(null, allianceDoc)
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.createAlliance", {
				allianceId:allianceData._id,
				allianceName:allianceData.basicInfo.name,
				allianceTag:allianceData.basicInfo.tag
			}, e.stack)
			delete self.allianceNameMap[allianceData.basicInfo.name]
			delete self.allianceTagMap[allianceData.basicInfo.tag]
			UnlockAlliance.call(self, allianceData._id)
			callback(e)
		})
	})
}

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param keys
 * @param force
 * @param callback
 */
pro.directFindPlayer = function(id, keys, force, callback){
	var self = this
	if(!force){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.directFindPlayer", {id:id}))
			return
		}else if(_.isArray(this.playersQueue[id]) && this.playersQueue[id].length >= this.maxPlayerQueue){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.directFindPlayer", {id:id}))
			return
		}
	}
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			UnlockPlayer.call(self, id)
			callback(null, _.isEmpty(keys) ? player.doc : _.pick(player.doc, keys))
		}else{
			var playerDoc = null
			self.Player.findByIdAsync(id).then(function(doc){
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
				callback(null, _.isNull(playerDoc) ? null : _.isEmpty(keys) ? playerDoc : _.pick(playerDoc, keys))
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
 * @param keys
 * @param force
 * @param callback
 */
pro.directFindAlliance = function(id, keys, force, callback){
	var self = this
	if(!force){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.directFindAlliance", {id:id}))
			return
		}else if(_.isArray(this.alliancesQueue[id]) && this.alliancesQueue[id].length >= this.maxAllianceQueue){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.directFindAlliance", {id:id}))
			return
		}
	}
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			UnlockAlliance.call(self, id)
			callback(null, _.isEmpty(keys) ? alliance.doc : _.pick(alliance.doc, keys))
		}else{
			var allianceDoc = null
			self.Alliance.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					allianceDoc = doc.toObject()
					alliance = {}
					alliance.doc = allianceDoc
					alliance.ops = 0
					alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
					self.alliances[id] = alliance
					return Promise.resolve()
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				UnlockAlliance.call(self, id)
				callback(null, _.isNull(allianceDoc) ? null : _.isEmpty(keys) ? allianceDoc : _.pick(allianceDoc, keys))
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
 * @param keys
 * @param force
 * @param callback
 */
pro.findPlayer = function(id, keys, force, callback){
	var self = this
	if(!force){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.findPlayer", {id:id}))
			return
		}else if(_.isArray(this.playersQueue[id]) && this.playersQueue[id].length >= this.maxPlayerQueue){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.findPlayer", {id:id}))
			return
		}
	}
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			callback(null, _.isEmpty(keys) ? player.doc : _.pick(player.doc, keys))
		}else{
			var playerDoc = null
			self.Player.findByIdAsync(id).then(function(doc){
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
				callback(null, _.isNull(playerDoc) ? null : _.isEmpty(keys) ? playerDoc : _.pick(playerDoc, keys))
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
 * @param keys
 * @param force
 * @param callback
 */
pro.findAlliance = function(id, keys, force, callback){
	var self = this
	if(!force){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.findAlliance", {id:id}))
			return
		}else if(_.isArray(this.alliancesQueue[id]) && this.alliancesQueue[id].length >= this.maxAllianceQueue){
			callback(ErrorUtils.serverTooBusy("cache.cacheService.findAlliance", {id:id}))
			return
		}
	}
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			callback(null, _.isEmpty(keys) ? alliance.doc : _.pick(alliance.doc, keys))
		}else{
			var allianceDoc = null
			self.Alliance.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					allianceDoc = doc.toObject()
					alliance = {}
					alliance.doc = allianceDoc
					alliance.ops = 0
					alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
					self.alliances[id] = alliance
					return Promise.resolve()
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				if(!_.isObject(allianceDoc)){
					UnlockAlliance.call(self, id)
				}
				callback(null, _.isNull(allianceDoc) ? null : _.isEmpty(keys) ? allianceDoc : _.pick(allianceDoc, keys))
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
	var self = this
	if(_.isObject(doc)){
		var player = this.players[id]
		_.extend(player.doc, doc)
		player.ops += 1
		if(player.ops >= this.flushOps){
			clearTimeout(player.timeout)
			self.Player.updateAsync({_id:id}, _.omit(player.doc, "_id")).then(function(){
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				UnlockPlayer.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.updatePlayer", {id:id}, e.stack)
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				UnlockPlayer.call(self, id)
				callback(e)
			})
			player.ops = 0
		}else{
			UnlockPlayer.call(self, id)
			callback()
		}
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
	var self = this
	if(_.isObject(doc)){
		var alliance = this.alliances[id]
		_.extend(alliance.doc, doc)
		alliance.ops += 1
		if(alliance.ops >= this.flushOps){
			clearTimeout(alliance.timeout)
			self.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				UnlockAlliance.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.updateAlliance", {id:id}, e.stack)
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				UnlockAlliance.call(self, id)
				callback(e)
			})
			alliance.ops = 0
		}else{
			UnlockAlliance.call(self, id)
			callback()
		}
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
	var self = this
	var player = this.players[id]
	if(_.isObject(doc)){
		_.extend(player.doc, doc)
		player.ops += 1
	}
	clearTimeout(player.timeout)
	if(player.ops > 0){
		self.Player.updateAsync({_id:id}, _.omit(player.doc, "_id")).then(function(){
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			UnlockPlayer.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushPlayer", {id:id}, e.stack)
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
	var self = this
	var alliance = this.alliances[id]
	if(_.isObject(doc)){
		_.extend(alliance.doc, doc)
		alliance.ops += 1
	}
	clearTimeout(alliance.timeout)
	if(alliance.ops > 0){
		self.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			UnlockAlliance.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushAlliance", {id:id}, e.stack)
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
	var self = this
	var player = this.players[id]
	clearTimeout(player.timeout)
	this.timeEventService.clearPlayerTimeEventsAsync(player.doc).catch(function(e){
		self.logService.onEventError("cache.cacheService.timeoutPlayer.clearPlayerTimeEvents", {id:id}, e.stack)
		return Promise.resolve()
	}).then(function(){
		delete self.players[id]
		if(_.isObject(doc)){
			_.extend(player.doc, doc)
			player.ops += 1
		}
		if(player.ops > 0){
			self.Player.updateAsync({_id:id}, _.omit(player.doc, "_id")).then(function(){
				self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:id})
				UnlockPlayer.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutPlayer", {id:id}, e.stack)
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
 * 移除玩家缓存
 * @param id
 * @param callback
 */
pro.removePlayer = function(id, callback){
	var player = this.players[id]
	clearTimeout(player.timeout)
	delete this.players[id]
	UnlockPlayer.call(this, id)
	callback()
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutAlliance = function(id, doc, callback){
	var self = this
	var alliance = this.alliances[id]
	clearTimeout(alliance.timeout)
	delete self.alliances[id]
	if(_.isObject(doc)){
		_.extend(alliance.doc, doc)
		alliance.ops += 1
	}
	if(alliance.ops > 0){
		self.Alliance.updateAsync({_id:id}, _.omit(alliance.doc, "_id")).then(function(){
			self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:id})
			UnlockAlliance.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.timeoutAlliance", {id:id}, e.stack)
			UnlockAlliance.call(self, id)
			callback()
		})
		alliance.ops = 0
	}else{
		self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:id})
		UnlockAlliance.call(self, id)
		callback()
	}
}

/**
 * 删除联盟
 * @param id
 * @param callback
 */
pro.deleteAlliance = function(id, callback){
	var self = this
	var alliance = this.alliances[id]
	clearTimeout(alliance.timeout)
	delete self.alliances[id]
	self.Alliance.findByIdAndRemoveAsync(id).then(function(){
		UnlockAlliance.call(self, id)
		callback()
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
				self.logService.onEventError("cache.cacheService.timeoutPlayer", {id:player.doc._id}, e.stack)
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
				self.logService.onEventError("cache.cacheService.timeoutAlliance", {id:alliance.doc._id}, e.stack)
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