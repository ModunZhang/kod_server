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

pro.create = function(modelName, id, doc, callback){

}

pro.find = function(modelName, id, callback){

}

pro.update = function(modelName, id, version, doc, callback){

}

pro.flash = function(modelName, id, version, doc, callback){

}