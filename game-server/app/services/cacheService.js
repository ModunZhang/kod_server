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