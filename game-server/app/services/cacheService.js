"use strict"

/**
 * Created by modun on 14-8-22.
 */

var Promise = require("bluebird")

var PlayerDao = require("../dao/playerDao")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var Utils = require("../utils/utils")

var CacheService = function(){
	this.playerDao = Promise.promisifyAll(new PlayerDao())
	this.maxChangedCount = 1
	this.players = {}
}

module.exports = CacheService
var pro = CacheService.prototype


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
		callback(null,Utils.clone(doc))
	}).catch(function(e){
		callback(e)
	})
}