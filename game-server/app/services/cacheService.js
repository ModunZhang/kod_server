"use strict"

/**
 * Created by modun on 14-8-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var PlayerDao = require("../dao/playerDao")
var AllianceDao = require("../dao/allianceDao")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var Utils = require("../utils/utils")

var CacheService = function(){
	this.playerDao = Promise.promisifyAll(new PlayerDao())
	this.allianceDao = Promise.promisifyAll(new AllianceDao())
	this.maxChangedCount = 1
	this.players = {}
	this.alliances = {}
}

module.exports = CacheService
var pro = CacheService.prototype


/**
 * 保存所有缓存数据到mongo数据库
 * @param callback
 */
pro.saveAllCaches = function(callback){
	var self = this
	this.saveAllPlayersAsync().then(function(){
		return self.saveAllAlliancesAsync()
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 保存所有玩家数据到mongo
 * @param callback
 */
pro.saveAllPlayers = function(callback){
	var self = this
	var funcs = []
	_.each(this.players, function(playerDoc){
		funcs.push(self.removePlayerAsync(playerDoc._id))
	})

	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从mongo查询玩家并将玩家添加到缓存
 * @param id
 * @param callback
 */
pro.addPlayer = function(id, callback){
	var self = this
	this.playerDao.findByIdAsync(id).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		return Promise.resolve(doc)
	}).then(function(doc){
		self.players[doc._id] = Utils.clone(doc)
		callback(null, Utils.clone(doc))
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从缓存获取玩家
 * @param id
 * @param callback
 */
pro.getPlayer = function(id, callback){
	var doc = this.players[id]
	if(!_.isObject(doc)){
		callback(new Error("玩家不存在"))
		return
	}
	callback(null, Utils.clone(doc))
}

/**
 * 更新玩家缓存
 * @param doc
 * @param callback
 */
pro.updatePlayer = function(doc, callback){
	var docInCache = this.players[doc._id]
	if(!_.isObject(docInCache)){
		callback(new Error("玩家不存在"))
		return
	}
	docInCache.__v++
	if(docInCache.__v >= this.maxChangedCount){
		doc.__v = 0
	}else{
		doc.__v = docInCache.__v
	}
	this.players[doc._id] = Utils.clone(doc)
	callback(null, Utils.clone(doc))
	if(docInCache.__v >= this.maxChangedCount){
		this.playerDao.updateAsync(this.players[doc._id]).catch(function(e){
			errorLogger.error("handle updatePlayer Error -----------------------------")
			errorLogger.error(e.stack)
			if(_.isEqual("production", self.app.get("env"))){
				errorMailLogger.error("handle updatePlayer Error -----------------------------")
				errorMailLogger.error(e.stack)
			}
		})
	}
}

/**
 * 将玩家移出缓存,并保存到mongo
 * @param id
 * @param callback
 */
pro.removePlayer = function(id, callback){
	var self = this
	var doc = this.players[id]
	if(!_.isObject(doc)){
		callback(new Error("玩家不存在"))
		return
	}
	this.playerDao.updateAsync(doc).then(function(){
		delete self.players[id]
		callback(null, Utils.clone(doc))
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 保存所有玩家数据到mongo
 * @param callback
 */
pro.saveAllAlliances = function(callback){
	var self = this
	var funcs = []
	_.each(this.alliances, function(allianceDoc){
		funcs.push(self.removeAllianceAsync(allianceDoc._id))
	})

	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从mongo查询联盟并将联盟添加到缓存
 * @param id
 * @param callback
 */
pro.addAlliance = function(id, callback){
	var self = this
	this.allianceDao.findByIdAsync(id).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		return Promise.resolve(doc)
	}).then(function(doc){
		self.alliances[doc._id] = Utils.clone(doc)
		callback(null, Utils.clone(doc))
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从缓存获取联盟
 * @param id
 * @param callback
 */
pro.getAlliance = function(id, callback){
	var doc = this.alliances[id]
	if(!_.isObject(doc)){
		callback(new Error("联盟不存在"))
		return
	}
	callback(null, Utils.clone(doc))
}

/**
 * 更新联盟缓存
 * @param doc
 * @param callback
 */
pro.updateAlliance = function(doc, callback){
	var docInCache = this.alliances[doc._id]
	if(!_.isObject(docInCache)){
		callback(new Error("联盟不存在"))
		return
	}
	docInCache.__v++
	if(docInCache.__v >= this.maxChangedCount){
		doc.__v = 0
	}else{
		doc.__v = docInCache.__v
	}
	this.alliance[doc._id] = Utils.clone(doc)
	callback(null, Utils.clone(doc))
	if(docInCache.__v >= this.maxChangedCount){
		this.allianceDao.updateAsync(this.alliances[doc._id]).catch(function(e){
			errorLogger.error("handle updateAlliance Error -----------------------------")
			errorLogger.error(e.stack)
			if(_.isEqual("production", self.app.get("env"))){
				errorMailLogger.error("handle updateAlliance Error -----------------------------")
				errorMailLogger.error(e.stack)
			}
		})
	}
}

/**
 * 将联盟移出缓存,并保存到mongo
 * @param id
 * @param callback
 */
pro.removeAlliance = function(id, callback){
	var self = this
	var doc = this.alliances[id]
	if(!_.isObject(doc)){
		callback(new Error("联盟不存在"))
		return
	}
	this.allianceDao.updateAsync(doc).then(function(){
		delete self.alliances[id]
		callback(null, Utils.clone(doc))
	}).catch(function(e){
		callback(e)
	})
}