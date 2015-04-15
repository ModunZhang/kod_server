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
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 创建对象
 * @param modelName
 * @param id
 * @param doc
 * @param callback
 */
pro.create = function(modelName, id, doc, callback){

}

/**
 * 按Id查询
 * @param modelName
 * @param id
 * @param callback
 */
pro.find = function(modelName, id, callback){

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

}