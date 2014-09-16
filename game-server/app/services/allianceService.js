"use strict"

/**
 * Created by modun on 14-9-16.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require('crypto')

var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var Consts = require("../consts/consts")

var AllianceService = function(app){
	this.app = app
	this.pushService = this.app.get("pushService")
	this.callbackService = this.app.get("callbackService")
	this.cacheService = this.app.get("cacheService")
}

module.exports = AllianceService
var pro = AllianceService.prototype

