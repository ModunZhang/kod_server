"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var util = require("util")
var _ = require("underscore")

var BaseDao = require("./baseDao")
var Alliance = require("../domains/alliance")

var AllianceDao = function(){
	BaseDao.call(this, Alliance)
}

util.inherits(AllianceDao, BaseDao)
module.exports = AllianceDao