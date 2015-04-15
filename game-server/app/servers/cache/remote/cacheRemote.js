"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Consts = require("../../../consts/consts")

module.exports = function(app) {
	return new CacheRemote(app)
}

var CacheRemote = function(app) {
	this.app = app
	this.cacheService = app.get("cacheService")
}

var pro = CacheRemote.prototype

/**
 * 创建玩家对象
 * @param id
 * @param doc
 * @param callback
 */
pro.createPlayer = function(id, doc, callback){
	this.cacheService.createPlayer(id, doc, callback)
}

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindPlayer = function(id, callback){
	this.cacheService.directFindPlayer(id, callback)
}

/**
 * 按Id查询玩家
 * @param id
 * @param callback
 */
pro.findPlayer = function(id, callback){
	this.cacheService.findPlayer(id, callback)
}

/**
 * 更新玩家对象
 * @param id
 * @param version
 * @param doc
 * @param callback
 */
pro.updatePlayer = function(id, version, doc, callback){
	this.cacheService.updatePlayer(id, version, doc, callback)
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
 * @param id
 * @param doc
 * @param callback
 */
pro.createAlliance = function(id, doc, callback){
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