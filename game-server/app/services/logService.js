"use strict"

/**
 * Created by modun on 15/3/19.
 */

var kodLogic = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic")
var kodLogicError = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var kodMaillError = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic-error")

var LogService = function(app){
	this.app = app
	this.evn = app.get("env")
	this.serverId = app.getServerId()
}
module.exports = LogService
var pro = LogService.prototype

pro.info = function(functionName, message, object){

}

pro.error = function(functionName, message, object){

}