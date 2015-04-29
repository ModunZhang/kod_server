"use strict"

/**
 * Created by modun on 15/3/6.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var DataUtils = require("../utils/dataUtils")
var Consts = require("../consts/consts.js")

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
	this.maxPlayerQueue = 5
	this.maxAllianceQueue = 10
	this.flushOps = 10
	this.timeoutInterval = 10 * 60 * 1000
	this.lockCheckInterval = 5 * 1000
	this.lockInterval = 20 * 1000

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
				self.timeEventService.clearPlayerTimeEventsAsync(player.doc).then(function(){
					delete self.players[id]
					if(player.ops > 0){
						delete player.doc._id
						self.Player.updateAsync({_id:id}, player.doc).then(function(){
							self.logService.onEvent("cache.cacheService.OnPlayerTimeout", {id:id})
							UnlockPlayer.call(self, id)
						}).catch(function(e){
							self.logService.onEventError("cache.cacheService.OnPlayerTimeout", {id:id}, e.stack)
							UnlockPlayer.call(self, id)
						})
						player.doc._id = id
						player.ops = 0
					}else{
						self.logService.onEvent("cache.cacheService.OnPlayerTimeout", {id:id})
						UnlockPlayer.call(self, id)
					}
				}, function(){
					delete self.players[id]
					if(player.ops > 0){
						delete player.doc._id
						self.Player.updateAsync({_id:id}, player.doc).then(function(){
							self.logService.onEvent("cache.cacheService.OnPlayerTimeout", {id:id})
							UnlockPlayer.call(self, id)
						}).catch(function(e){
							self.logService.onEventError("cache.cacheService.OnPlayerTimeout", {id:id}, e.stack)
							UnlockPlayer.call(self, id)
						})
						player.doc._id = id
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
					delete alliance.doc._id
					self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
						self.logService.onEvent("cache.cacheService.OnAllianceTimeout", {id:id})
						UnlockAlliance.call(self, id)
					}).catch(function(e){
						self.logService.onEventError("cache.cacheService.OnAllianceTimeout", {id:id}, e.stack)
						UnlockAlliance.call(self, id)
					})
					alliance.doc._id = id
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
 * 加入玩家请求队列
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
		var e = new Error("请求队列不存在为空")
		this.logService.onEventError("cache.cacheService.UnlockAlliance", {id:id}, e.stack)
	}else{
		allianceQueue.shift()
		if(allianceQueue.length > 0){
			process.nextTick(allianceQueue[0].func)
		}else{
			delete this.alliancesQueue[id]
		}
	}
}

/**
 * 创建玩家对象
 * @param playerData
 * @param callback
 */
pro.createPlayer = function(playerData, callback){
	var self = this
	LockPlayer.call(this, playerData._id, function(){
		self.Player.createAsync(playerData).then(function(doc){
			var playerDoc = doc.toObject()
			var player = {}
			player.doc = playerDoc
			player.ops = 0
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, playerData._id)
			self.players[playerData._id] = player
			callback(null, playerDoc)
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.createPlayer", {playerData:playerData}, e.stack)
			UnlockPlayer.call(self, playerData._id)
			callback(e)
		})
	})
}

/**
 * 创建联盟对象
 * @param allianceData
 * @param callback
 */
pro.createAlliance = function(allianceData, callback){
	var self = this
	LockAlliance.call(this, allianceData._id, function(){
		self.Alliance.createAsync(allianceData).then(function(doc){
			var allianceDoc = doc.toObject()
			var alliance = {}
			alliance.doc = allianceDoc
			alliance.ops = 0
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, allianceData._id)
			self.alliances[allianceData._id] = alliance
			callback(null, allianceDoc)
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.createAlliance", {allianceData:allianceData}, e.stack)
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
	var self = this
	if(_.isArray(this.playersQueue[id]) && this.playersQueue[id].length >= this.maxPlayerQueue){
		callback(new Error("服务器繁忙"))
		return
	}
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			UnlockPlayer.call(self, id)
			callback(null, player.doc)
		}else{
			var playerDoc = null
			self.Player.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					playerDoc = doc.toObject()
					var player = {}
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
	var self = this
	if(_.isArray(this.alliancesQueue[id]) && this.alliancesQueue[id].length >= this.maxAllianceQueue){
		callback(new Error("服务器繁忙"))
		return
	}
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			UnlockAlliance.call(self, id)
			callback(null, alliance.doc)
		}else{
			var allianceDoc = null
			self.Alliance.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					allianceDoc = doc.toObject()
					var alliance = {}
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
	var self = this
	if(_.isArray(this.playersQueue[id]) && this.playersQueue[id].length >= this.maxPlayerQueue){
		callback(new Error("服务器繁忙"))
		return
	}
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			callback(null, player.doc)
		}else{
			var playerDoc = null
			self.Player.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					playerDoc = doc.toObject()
					var player = {}
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
	var self = this
	if(_.isArray(this.alliancesQueue[id]) && this.alliancesQueue[id].length >= this.maxAllianceQueue){
		callback(new Error("服务器繁忙"))
		return
	}
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			callback(null, alliance.doc)
		}else{
			var allianceDoc = null
			self.Alliance.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					allianceDoc = doc.toObject()
					var alliance = {}
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
	var self = this
	if(_.isObject(doc)){
		var player = this.players[id]
		player.doc = doc
		player.ops += 1
		if(player.ops >= this.flushOps){
			clearTimeout(player.timeout)
			delete player.doc._id
			self.Player.updateAsync({_id:id}, player.doc).then(function(){
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				UnlockPlayer.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.updatePlayer", {id:id}, e.stack)
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				UnlockPlayer.call(self, id)
				callback(e)
			})
			player.doc._id = id
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
		alliance.doc = doc
		alliance.ops += 1
		if(alliance.ops >= this.flushOps){
			clearTimeout(alliance.timeout)
			delete alliance.doc._id
			self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				UnlockAlliance.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.updateAlliance", {id:id}, e.stack)
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				UnlockAlliance.call(self, id)
				callback(e)
			})
			alliance.doc._id = id
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
		player.doc = doc
		player.ops += 1
	}
	clearTimeout(player.timeout)
	if(player.ops > 0){
		delete player.doc._id
		self.Player.updateAsync({_id:id}, player.doc).then(function(){
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			UnlockPlayer.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushPlayer", {id:id}, e.stack)
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			UnlockPlayer.call(self, id)
			callback(e)
		})
		player.doc._id = id
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
		alliance.doc = doc
		alliance.ops += 1
	}
	clearTimeout(alliance.timeout)
	if(alliance.ops > 0){
		delete alliance.doc._id
		self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			UnlockAlliance.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushAlliance", {id:id}, e.stack)
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			UnlockAlliance.call(self, id)
			callback(e)
		})
		alliance.doc._id = id
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
	this.timeEventService.clearPlayerTimeEventsAsync(player.doc).then(function(){
		delete self.players[id]
		if(_.isObject(doc)){
			player.doc = doc
			player.ops += 1
		}
		if(player.ops > 0){
			delete player.doc._id
			self.Player.updateAsync({_id:id}, player.doc).then(function(){
				self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:id})
				UnlockPlayer.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutPlayer", {id:id}, e.stack)
				UnlockPlayer.call(self, id)
				callback(e)
			})
			player.doc._id = id
			player.ops = 0
		}else{
			self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:id})
			UnlockPlayer.call(self, id)
			callback()
		}
	}, function(){
		delete self.players[id]
		if(_.isObject(doc)){
			player.doc = doc
			player.ops += 1
		}
		if(player.ops > 0){
			delete player.doc._id
			self.Player.updateAsync({_id:id}, player.doc).then(function(){
				self.logService.onEvent("cache.cacheService.timeoutPlayer", {id:id})
				UnlockPlayer.call(self, id)
				callback()
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutPlayer", {id:id}, e.stack)
				UnlockPlayer.call(self, id)
				callback()
			})
			player.doc._id = id
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
	var self = this
	var alliance = this.alliances[id]
	clearTimeout(alliance.timeout)
	delete self.alliances[id]
	if(_.isObject(doc)){
		alliance.doc = doc
		alliance.ops += 1
	}
	if(alliance.ops > 0){
		delete alliance.doc._id
		self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
			self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:id})
			UnlockAlliance.call(self, id)
			callback()
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.timeoutAlliance", {id:id}, e.stack)
			UnlockAlliance.call(self, id)
			callback()
		})
		alliance.doc._id = id
		alliance.ops = 0
	}else{
		self.logService.onEvent("cache.cacheService.timeoutAlliance", {id:id})
		UnlockAlliance.call(self, id)
		callback()
	}
}

/**
 * 更新所有玩家并同步到Mongo最后将玩家从内存移除
 * @param callback
 */
pro.timeoutAllPlayers = function(callback){
	var self = this
	var funcs = []
	var timeoutPlayer = function(id, callback){
		LockPlayer.call(self, id, function(){
			var player = self.players[id]
			if(!_.isObject(player)){
				UnlockPlayer.call(self, id)
				callback()
			}else{
				clearTimeout(player.timeout)
				delete self.players[id]
				if(player.ops > 0){
					delete player.doc._id
					self.Player.updateAsync({_id:id}, player.doc).then(function(){
						self.logService.onEvent("cache.cacheService.timeoutAllPlayers", {id:id})
						UnlockPlayer.call(self, id)
						callback()
					}).catch(function(e){
						self.logService.onEventError("cache.cacheService.timeoutAllPlayers", {id:id}, e.stack)
						UnlockPlayer.call(self, id)
						callback()
					})
					player.doc._id = id
					player.ops = 0
				}else{
					self.logService.onEvent("cache.cacheService.timeoutAllPlayers", {id:id})
					UnlockPlayer.call(self, id)
					callback()
				}
			}
		})
	}
	var timeoutPlayerAsync = Promise.promisify(timeoutPlayer, this)
	_.each(this.players, function(player, id){
		funcs.push(timeoutPlayerAsync(id))
	})
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 更新所有联盟并同步到Mongo最后将联盟从内存移除
 * @param callback
 */
pro.timeoutAllAlliances = function(callback){
	var self = this
	var funcs = []
	var timeoutAlliance = function(id, callback){
		LockAlliance.call(self, id, function(){
			var alliance = self.alliances[id]
			if(!_.isObject(alliance)){
				UnlockAlliance.call(self, id)
				callback()
			}else{
				clearTimeout(alliance.timeout)
				delete self.alliances[id]
				if(alliance.ops > 0){
					delete alliance.doc._id
					self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
						self.logService.onEvent("cache.cacheService.timeoutAllAlliances", {id:id})
						UnlockAlliance.call(self, id)
						callback()
					}).catch(function(e){
						self.logService.onEventError("cache.cacheService.timeoutAllAlliances", {id:id}, e.stack)
						UnlockAlliance.call(self, id)
						callback()
					})
					alliance.doc._id = id
					alliance.ops = 0
				}else{
					self.logService.onEvent("cache.cacheService.timeoutAllAlliances", {id:id})
					UnlockAlliance.call(self, id)
					callback()
				}
			}
		})
	}
	var timeoutAllianceAsync = Promise.promisify(timeoutAlliance, this)
	_.each(this.alliances, function(alliance, id){
		funcs.push(timeoutAllianceAsync(id))
	})
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}