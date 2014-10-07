"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var util = require("util")
var _ = require("underscore")

var BaseDao = require("./baseDao")
var Alliance = require("../domains/alliance")

var AllianceDao = function(redis, scripto, env){
	var indexs = ["basicInfo.name", "basicInfo.tag"]
	BaseDao.call(this, redis, scripto, "alliance", Alliance, indexs, env)
}

util.inherits(AllianceDao, BaseDao)
module.exports = AllianceDao