"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")
var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app){
	return new RankHandler(app)
}

var RankHandler = function(app){
	this.app = app
}

var pro = RankHandler.prototype
