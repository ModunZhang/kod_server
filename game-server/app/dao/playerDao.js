"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var util = require("util")
var _ = require("underscore")

var BaseDao = require("./baseDao")
var Player = require("../domains/player")

var PlayerDao = function(redis, scripto, env){
	var indexs = ["countInfo.deviceId", "basicInfo.name"]
	BaseDao.call(this, redis, scripto, "player", Player, indexs, env)
}

util.inherits(PlayerDao, BaseDao)
module.exports = PlayerDao