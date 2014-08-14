/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var utils = require("../utils/utils")
var util = require("util")
var _ = require("underscore")

var BaseDao = require("./baseDao")
var Player = require("../domains/player")

var PlayerDao = function(redis){
	BaseDao.call(this, redis, Player)
}

util.inherits(PlayerDao, BaseDao)
module.exports = PlayerDao