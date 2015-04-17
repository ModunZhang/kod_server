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
	this.Player = app.get("Player")
	this.Alliance = app.get("Alliance")
	this.players = []
	this.playersQueue = {}
	this.alliances = []
	this.alliancesQueue = {}

	this.flushOps = 60
	this.flushInterval = 120 * 1000
	this.timeoutInterval = 600 * 1000
}
module.exports = DataService
var pro = DataService.prototype

var OnPlayerTimeout = function(id){
	var self = this
	this.lockPlayer(id, function(){
		var player = self.players[id]
		clearTimeout(player.interval)
		delete self.players[id]
		if(player.ops > 0){
			var doc = player.doc
			delete doc._id
			self.Player.updateAsync({_id:id}, doc).then(function(){
				self.unlockPlayer(id)
			})
		}else{
			self.unlockPlayer(id)
		}
	})
}

var OnPlayerInterval = function(id){
	var self = this
	this.lockPlayer(id, function(){
		var player = self.players[id]
		if(player.ops > 0){
			var doc = player.doc
			delete doc._id
			self.Player.updateAsync({_id:id}, doc).then(function(){
				player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
				self.unlockPlayer(id)
			})
			doc._id = id
			player.ops = 0
		}else{
			player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
			self.unlockPlayer(id)
		}
	})
}


var OnAllianceTimeout = function(id){
	var self = this
	this.lockAlliance(id, function(){
		var alliance = self.alliances[id]
		clearTimeout(alliance.interval)
		delete self.alliances[id]
		if(alliance.ops > 0){
			var doc = alliance.doc
			delete doc._id
			self.Alliance.updateAsync({_id:id}, doc).then(function(){
				self.unlockAlliance(id)
			})
		}else{
			self.unlockAlliance(id)
		}
	})
}

var OnAllianceInterval = function(id){
	var self = this
	this.lockAlliance(id, function(){
		var alliance = self.alliances[id]
		if(alliance.ops > 0){
			var doc = alliance.doc
			delete doc._id
			self.Alliance.updateAsync({_id:id}, doc).then(function(){
				alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
				self.unlockAlliance(id)
			})
			doc._id = id
			alliance.ops = 0
		}else{
			alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
			self.unlockAlliance(id)
		}
	})
}

/**
 * 加入玩家请求队列
 * @param id
 * @param func
 */
pro.lockPlayer = function(id, func){
	if(!_.isArray(this.playersQueue[id])) this.playersQueue[id] = []
	this.playersQueue[id].push(func)
	if(this.playersQueue[id].length == 1) this.playersQueue[id][0]()
}

/**
 * 从玩家请求队列移除
 * @param id
 */
pro.unlockPlayer = function(id){
	var playerQueue = this.playersQueue[id]
	if(!_.isArray(playerQueue)){
		var e = new Error("此玩家请求队列不存在或为空")
		this.logService.onEventError("cache.cacheService.unlockPlayer", {id:id}, e.stack)
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
 * 加入玩家请求队列
 * @param id
 * @param func
 */
pro.lockAlliance = function(id, func){
	if(!_.isArray(this.alliancesQueue[id])) this.alliancesQueue[id] = []
	this.alliancesQueue[id].push(func)
	if(this.alliancesQueue[id].length == 1) this.alliancesQueue[id][0]()
}

/**
 * 从玩家请求队列移除
 * @param id
 */
pro.unlockAlliance = function(id){
	var allianceQueue = this.alliancesQueue[id]
	if(!_.isArray(allianceQueue)){
		var e = new Error("此联盟请求队列不存在或为空")
		this.logService.onEventError("cache.cacheService.unlockAlliance", {id:id}, e.stack)
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
	this.lockPlayer(playerData._id, function(){
		self.Player.createAsync(playerData).then(function(doc){
			var player = {}
			player.doc = doc.toObject()
			player.ops = 0
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, playerData._id)
			player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, playerData._id)
			self.players[playerData._id] = player
			callback(null, self.players[playerData._id].doc)
		}).catch(function(e){
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
	this.lockPlayer(id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			callback(null, player.doc)
			self.unlockPlayer(id)
		}else{
			self.Player.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					var player = {}
					player.doc = doc.toObject()
					player.ops = 0
					player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
					player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
					self.players[id] = player
					callback(null, self.players[id].doc)
				}else{
					callback(null, null)
				}
				self.unlockPlayer(id)
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
	this.lockPlayer(id, function(){
		var player = self.players[id]
		if(_.isObject(player)){
			callback(null, player.doc)
		}else{
			self.Player.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					var player = {}
					player.doc = doc.toObject()
					player.ops = 0
					player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
					player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
					self.players[id] = player
					callback(null, self.players[doc._id].doc)
				}else{
					self.unlockPlayer(id)
					callback(null, null)
				}
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
			delete doc._id
			self.Player.updateAsync({_id:id}, player.doc).then(function(){
				player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
				player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
				callback()
				self.unlockPlayer(id)
			})
			doc._id = id
			player.ops = 0
		}else{
			callback()
			self.unlockPlayer(id)
		}
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
		delete doc._id
		self.Player.updateAsync({_id:id}, player.doc).then(function(){
			player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
			player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
			callback()
			self.unlockPlayer(id)
		})
		doc._id = id
		player.ops = 0
	}else{
		player.timeout = setTimeout(OnPlayerTimeout.bind(self), self.timeoutInterval, id)
		player.interval = setTimeout(OnPlayerInterval.bind(self), self.flushInterval, id)
		callback()
		self.unlockPlayer(id)
	}
}

/**
 * 更新玩家并且将玩家从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutPlayer = function(id, doc, callback){
	var self = this
	var player = this.players[id]
	delete  this.players[id]
	if(_.isObject(doc)){
		player.doc = doc
		player.ops += 1
	}
	clearTimeout(player.timeout)
	clearTimeout(player.interval)
	if(player.ops > 0){
		delete doc._id
		self.Player.updateAsync({_id:id}, player.doc).then(function(){
			callback()
			self.unlockPlayer(id)
		})
		doc._id = id
		player.ops = 0
	}else{
		callback()
		self.unlockPlayer(id)
	}
}






/**
 * 创建联盟对象
 * @param allianceData
 * @param callback
 */
pro.createAlliance = function(allianceData, callback){
	var self = this
	this.lockAlliance(allianceData._id, function(){
		self.Alliance.createAsync(allianceData).then(function(doc){
			var alliance = {}
			alliance.doc = doc.toObject()
			alliance.ops = 0
			alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, allianceData._id)
			alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, allianceData._id)
			self.alliances[allianceData._id] = alliance
			callback(null, self.alliances[allianceData._id].doc)
		}).catch(function(e){
			callback(e)
		})
	})
}

/**
 * 按Id直接查询联盟,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindAlliance = function(id, callback){
	var self = this
	this.lockAlliance(id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			callback(null, alliance.doc)
			self.unlockAlliance(id)
		}else{
			self.Alliance.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					var alliance = {}
					alliance.doc = doc.toObject()
					alliance.ops = 0
					alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
					alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
					self.alliances[id] = alliance
					callback(null, self.alliances[id].doc)
				}else{
					callback(null, null)
				}
				self.unlockAlliance(id)
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
	this.lockAlliance(id, function(){
		var alliance = self.alliances[id]
		if(_.isObject(alliance)){
			callback(null, alliance.doc)
		}else{
			self.Alliance.findByIdAsync(id).then(function(doc){
				if(_.isObject(doc)){
					var alliance = {}
					alliance.doc = doc.toObject()
					alliance.ops = 0
					alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
					alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
					self.alliances[id] = alliance
					callback(null, self.alliances[doc._id].doc)
				}else{
					self.unlockAlliance(id)
					callback(null, null)
				}
			})
		}
	})
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
			delete doc._id
			self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
				clearTimeout(alliance.timeout)
				clearTimeout(alliance.interval)
				alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
				alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
				callback()
				self.unlockAlliance(id)
			})
			doc._id = id
			alliance.ops = 0
		}else{
			callback()
			self.unlockAlliance(id)
		}
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
	}
	delete doc._id
	self.Alliance.updateAsync({_id:id}, alliance.doc).then(function(){
		clearTimeout(alliance.timeout)
		clearTimeout(alliance.interval)
		alliance.timeout = setTimeout(OnAllianceTimeout.bind(self), self.timeoutInterval, id)
		alliance.interval = setTimeout(OnAllianceInterval.bind(self), self.flushInterval, id)
		callback()
		self.unlockAlliance(id)
	})
	doc._id = id
	alliance.ops = 0
}