"use strict"

/**
 * Created by modun on 14-10-28.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

var AllianceDao = require("../dao/allianceDao")
var PlayerDao = require("../dao/playerDao")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var MapUtils = require("../utils/mapUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")
var Localizations = require("../consts/localizations")


var AllianceService = function(app){
	this.app = app
	this.env = app.get("env")
	this.redis = app.get("redis")
	this.scripto = app.get("scripto")
	this.pushService = this.app.get("pushService")
	this.globalChannelService = this.app.get("globalChannelService")
	this.allianceDao = Promise.promisifyAll(new AllianceDao(this.redis, this.scripto, this.env))
	this.playerDao = Promise.promisifyAll(new PlayerDao(this.redis, this.scripto, this.env))
}

module.exports = AllianceService
var pro = AllianceService.prototype