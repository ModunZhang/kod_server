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

	this.flushOps = 30
	this.flushInterval = 600 * 1000
	this.timeoutInterval = 600 * 1000
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 玩家超时
 * @param id
 */
var OnPlayerTimeout = function(id){
	var self = this
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		clearTimeout(player.timeout)
		clearTimeout(player.interval)
		self.timeEventService.clearPlayerTimeEventsAsync(player.doc).then(function(){
			delete self.players[id]
			if(player.ops > 0){
				delete player.doc._id
				self.Player.updateAsync({_id:id}, player.doc).then(function(){
					UnlockPlayer.call(self, id)
				}).catch(function(e){
					self.logService.onEventError("cache.cacheService.OnPlayerTimeout", {playerId:id}, e.stack)
					UnlockPlayer.call(self, id)
				})
				player.doc._id = id
				player.ops = 0
			}else{
				UnlockPlayer.call(self, id)
			}
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.OnPlayerTimeout", {playerId:id}, e.stack)
			UnlockPlayer.call(self, id)
		})
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
		clearTimeout(alliance.timeout)
		clearTimeout(alliance.interval)
		delete self.alliances[id]
		if(alliance.ops > 0){
			delete alliance.doc._id
			self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
				UnlockAlliance.call(self, id)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.OnAllianceTimeout", {allianceId:id}, e.stack)
				UnlockAlliance.call(self, id)
			})
			alliance.doc._id = id
			alliance.ops = 0
		}else{
			UnlockAlliance.call(self, id)
		}
	})
}

/**
 * 玩家存库
 * @param id
 */
var OnPlayerInterval = function(id){
	var self = this
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(player.ops > 0){
			delete player.doc._id
			self.Player.updateAsync({_id:id}, player.doc).then(function(){
				player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
				UnlockPlayer.call(self, id)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.OnPlayerInterval", {playerId:id}, e.stack)
				player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
				UnlockPlayer.call(self, id)
			})
			player.doc._id = id
			player.ops = 0
		}else{
			player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
			UnlockPlayer.call(self, id)
		}
	})
}

/**
 * 联盟存库
 * @param id
 */
var OnAllianceInterval = function(id){
	var self = this
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(alliance.ops > 0){
			delete alliance.doc._id
			self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
				alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
				UnlockAlliance.call(self, id)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.OnAllianceInterval", {allianceId:id}, e.stack)
				alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
				UnlockAlliance.call(self, id)
			})
			alliance.doc._id = id
			alliance.ops = 0
		}else{
			alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
			UnlockAlliance.call(self, id)
		}
	})
}

/**
 * 加入玩家请求队列
 * @param id
 * @param func
 */
var LockPlayer = function(id, func){
	if(!_.isArray(this.playersQueue[id])) this.playersQueue[id] = []
	this.playersQueue[id].push(func)
	if(this.playersQueue[id].length == 1) this.playersQueue[id][0]()
}

/**
 * 加入玩家请求队列
 * @param id
 * @param func
 */
var LockAlliance = function(id, func){
	if(!_.isArray(this.alliancesQueue[id])) this.alliancesQueue[id] = []
	this.alliancesQueue[id].push(func)
	if(this.alliancesQueue[id].length == 1) this.alliancesQueue[id][0]()
}

/**
 * 从玩家请求队列移除
 * @param id
 */
var UnlockPlayer = function(id){
	var playerQueue = this.playersQueue[id]
	if(!_.isArray(playerQueue)){
		var e = new Error("此玩家请求队列不存在或为空")
		this.logService.onEventError("cache.cacheService.UnlockPlayer", {id:id}, e.stack)
		return
	}
	playerQueue.shift()
	if(playerQueue.length > 0){
		playerQueue[0]()
	}else{
		delete this.playersQueue[id]
	}
}

/**
 * 从玩家请求队列移除
 * @param id
 */
var UnlockAlliance = function(id){
	var allianceQueue = this.alliancesQueue[id]
	if(!_.isArray(allianceQueue)){
		var e = new Error("此联盟请求队列不存在或为空")
		this.logService.onEventError("cache.cacheService.UnlockAlliance", {id:id}, e.stack)
		return
	}
	allianceQueue.shift()
	if(allianceQueue.length > 0){
		allianceQueue[0]()
	}else{
		delete this.alliancesQueue[id]
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
			player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, playerData._id)
			self.players[playerData._id] = player
			callback(null, playerDoc)
		}).catch(function(e){
			callback(e)
			UnlockPlayer.call(self, playerData._id)
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
			alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, allianceData._id)
			self.alliances[allianceData._id] = alliance
			callback(null, allianceDoc)
		}).catch(function(e){
			callback(e)
			UnlockAlliance.call(self, allianceData._id)
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
	LockPlayer.call(this, id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			callback(null, player.doc)
			UnlockPlayer.call(self, id)
		}else{
			var playerDoc = null
			self.Player.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					playerDoc = doc.toObject()
					var player = {}
					player.doc = playerDoc
					player.ops = 0
					player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
					player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
					self.players[id] = player
					return self.timeEventService.restorePlayerTimeEventsAsync(playerDoc)
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				callback(null, playerDoc)
				UnlockPlayer.call(self, id)
			}).catch(function(e){
				callback(e)
				UnlockPlayer.call(self, id)
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
	LockAlliance.call(this, id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			callback(null, alliance.doc)
			UnlockAlliance.call(self, id)
		}else{
			var allianceDoc = null
			self.Alliance.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					allianceDoc = doc.toObject()
					var alliance = {}
					alliance.doc = allianceDoc
					alliance.ops = 0
					alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
					alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
					self.alliances[id] = alliance
					return Promise.resolve()
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				callback(null, allianceDoc)
				UnlockAlliance.call(self, id)
			}).catch(function(e){
				callback(e)
				UnlockAlliance.call(self, id)
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
					player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
					self.players[id] = player
					return self.timeEventService.restorePlayerTimeEventsAsync(playerDoc)
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				callback(null, playerDoc)
				if(!_.isObject(playerDoc)){
					UnlockPlayer.call(self, id)
				}
			}).catch(function(e){
				callback(e)
				UnlockPlayer.call(self, id)
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
					alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
					self.alliances[id] = alliance
					return Promise.resolve()
				}else{
					return Promise.resolve()
				}
			}).then(function(){
				callback(null, allianceDoc)
				if(!_.isObject(allianceDoc)){
					UnlockAlliance.call(self, id)
				}
			}).catch(function(e){
				callback(e)
				UnlockAlliance.call(self, id)
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
			clearTimeout(player.interval)
			delete player.doc._id
			self.Player.updateAsync({_id:id}, player.doc).then(function(){
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
				callback()
				UnlockPlayer.call(self, id)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.updatePlayer", {playerId:id}, e.stack)
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
				callback()
				UnlockPlayer.call(self, id)
			})
			player.doc._id = id
			player.ops = 0
		}else{
			callback()
			UnlockPlayer.call(self, id)
		}
	}else{
		UnlockPlayer.call(self, id)
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
			clearTimeout(alliance.interval)
			delete alliance.doc._id
			self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
				callback()
				UnlockAlliance.call(self, id)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.updateAlliance", {allianceId:id}, e.stack)
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
				callback()
				UnlockAlliance.call(self, id)
			})
			alliance.doc._id = id
			alliance.ops = 0
		}else{
			callback()
			UnlockAlliance.call(self, id)
		}
	}else{
		UnlockAlliance.call(self, id)
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
	clearTimeout(player.interval)
	if(player.ops > 0){
		delete player.doc._id
		self.Player.updateAsync({_id:id}, player.doc).then(function(){
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
			callback()
			UnlockPlayer.call(self, id)
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushPlayer", {playerId:id}, e.stack)
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
			callback()
			UnlockPlayer.call(self, id)
		})
		player.doc._id = id
		player.ops = 0
	}else{
		player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
		player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
		callback()
		UnlockPlayer.call(self, id)
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
	clearTimeout(alliance.interval)
	if(alliance.ops > 0){
		delete alliance.doc._id
		self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
			callback()
			UnlockAlliance.call(self, id)
		}).catch(function(e){
			self.logService.onEventError("cache.cacheService.flushAlliance", {allianceId:id}, e.stack)
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
			alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
			callback()
			UnlockAlliance.call(self, id)
		})
		alliance.doc._id = id
		alliance.ops = 0
	}else{
		alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
		alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
		callback()
		UnlockAlliance.call(self, id)
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
	clearTimeout(player.interval)
	this.timeEventService.clearPlayerTimeEventsAsync(player.doc).then(function(){
		delete  self.players[id]
		if(_.isObject(doc)){
			player.doc = doc
			player.ops += 1
		}
		if(player.ops > 0){
			delete player.doc._id
			self.Player.updateAsync({_id:id}, player.doc).then(function(){
				callback()
				UnlockPlayer.call(self, id)
			}).catch(function(e){
				self.logService.onEventError("cache.cacheService.timeoutPlayer", {playerId:id}, e.stack)
				callback()
				UnlockPlayer.call(self, id)
			})
			player.doc._id = id
			player.ops = 0
		}else{
			callback()
			UnlockPlayer.call(self, id)
		}
	}).catch(function(e){
		self.logService.onEventError("cache.cacheService.timeoutPlayer", {playerId:id}, e.stack)
		callback()
		UnlockPlayer.call(self, id)
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
	delete  this.alliances[id]
	if(_.isObject(doc)){
		alliance.doc = doc
		alliance.ops += 1
	}
	clearTimeout(alliance.timeout)
	clearTimeout(alliance.interval)
	if(alliance.ops > 0){
		delete alliance.doc._id
		self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
			callback()
			UnlockAlliance.call(self, id)
		})
		alliance.doc._id = id
		alliance.ops = 0
	}else{
		callback()
		UnlockAlliance.call(self, id)
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
			clearTimeout(player.timeout)
			clearTimeout(player.interval)
			delete self.players[id]
			if(player.ops > 0){
				delete player.doc._id
				self.Player.updateAsync({_id:id}, player.doc).then(function(){
					callback()
					UnlockPlayer.call(self, id)
				}).catch(function(e){
					self.logService.onEventError("cache.cacheService.timeoutAllPlayers", {playerId:id}, e.stack)
					callback()
					UnlockPlayer.call(self, id)
				})
				player.doc._id = id
				player.ops = 0
			}else{
				callback()
				UnlockPlayer.call(self, id)
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
			clearTimeout(alliance.timeout)
			clearTimeout(alliance.interval)
			delete  self.alliances[id]
			if(alliance.ops > 0){
				delete alliance.doc._id
				self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
					callback()
					UnlockAlliance.call(self, id)
				}).catch(function(e){
					self.logService.onEventError("cache.cacheService.timeoutAllAlliances", {playerId:id}, e.stack)
					callback()
					UnlockAlliance.call(self, id)
				})
				alliance.doc._id = id
				alliance.ops = 0
			}else{
				callback()
				UnlockAlliance.call(self, id)
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