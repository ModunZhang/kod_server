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
 * 创建对象
 * @param modelName
 * @param id
 * @param doc
 * @param callback
 */
pro.create = function(modelName, id, doc, callback){
	this.cacheService.create(modelName, id, doc, callback)
}

/**
 * 按Id查询
 * @param modelName
 * @param id
 * @param callback
 */
pro.find = function(modelName, id, callback){
	this.cacheService.find(modelName, id, callback)
}

/**
 * 更新对象
 * @param modelName
 * @param id
 * @param version
 * @param doc
 * @param callback
 */
pro.update = function(modelName, id, version, doc, callback){
	this.cacheService.update(modelName, id, version, doc, callback)
}

/**
 * 更新对象并同步到Mongo
 * @param modelName
 * @param id
 * @param version
 * @param doc
 * @param callback
 */
pro.flash = function(modelName, id, version, doc, callback){
	this.cacheService.flash(modelName, id, version, doc, callback)
}