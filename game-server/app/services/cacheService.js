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
	this.redis = app.get("redis")
	this.Player = app.get("Player")
	this.Alliance = app.get("Alliance")
	this.players = []
	this.playerLocks = {}
	this.alliances = []
	this.allianceLocks = {}
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 创建玩家对象
 * @param doc
 * @param callback
 */
pro.createPlayer = function(doc, callback){
	var self = this
	this.Player.createAsync(doc).then(function(doc){
		self.players[doc._id] = doc
		callback(doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindPlayer = function(id, callback){
	var self = this
	var player = this.players[id]
	if(_.isObject(player)) callback(null, player)
	else{
		self.Player.findByIdAsync(id).then(function(doc){
			if(_.isObject(doc)) self.players[id] = doc
			callback(null, doc)
		})
	}
}

/**
 * 按Id查询玩家
 * @param id
 * @param callback
 */
pro.findPlayer = function(id, callback){
	var self = this
	var player = this.players[id]
	if(_.isObject(player)){
		callback(null, player)
	}else{
		self.Player.findByIdAsync(id).then(function(doc){
			if(_.isObject(doc)) self.players[id] = doc
			callback(null, doc)
		})
	}
}

/**
 * 更新玩家对象
 * @param id
 * @param version
 * @param doc
 * @param callback
 */
pro.updatePlayer = function(id, version, doc, callback){
	this.players[id] = doc
	callback()
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param version
 * @param doc
 * @param callback
 */
pro.flashPlayer = function(id, version, doc, callback){
	this.cacheService.flashPlayer(id, version, doc, callback)
}



/**
 * 创建联盟对象
 * @param doc
 * @param callback
 */
pro.createAlliance = function(doc, callback){
	this.cacheService.createAlliance(id, doc, callback)
}

/**
 * 按Id直接查询联盟,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindAlliance = function(id, callback){
	this.cacheService.directFindAlliance(id, callback)
}

/**
 * 按Id查询联盟
 * @param id
 * @param callback
 */
pro.findAlliance = function(id, callback){
	this.cacheService.findAlliance(id, callback)
}

/**
 * 更新联盟对象
 * @param id
 * @param version
 * @param doc
 * @param callback
 */
pro.updateAlliance = function(id, version, doc, callback){
	this.cacheService.updateAlliance(id, version, doc, callback)
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param version
 * @param doc
 * @param callback
 */
pro.flashAlliance = function(id, version, doc, callback){
	this.cacheService.flashAlliance(id, version, doc, callback)
}