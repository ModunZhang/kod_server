"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var kodLogic = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic")
var kodLogicError = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic-error")
var kodMaillError = require("pomelo/node_modules/pomelo-logger").getLogger("kod-logic-mailError")

var LogService = function(app){
	this.app = app
	this.evn = app.get("env")
	this.serverId = app.getServerId()
}
module.exports = LogService
var pro = LogService.prototype

/**
 * 记录普通日志
 * @param api
 * @param object
 */
pro.info = function(api, object){
	kodLogic.info(api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * 记录错误日志
 * @param api
 * @param object
 * @param message
 */
pro.error = function(api, object, message){
	kodLogic.error(api + ":" + " %j", _.isObject(object) ? object : {})
	kodLogic.error(message)
	kodLogicError.error(api + ":" + " %j", _.isObject(object) ? object : {})
	kodLogicError.error(message)
	if(_.isEqual(this.evn, "production")){
		kodMaillError.error(api + ":" + " %j", _.isObject(object) ? object : {})
		kodMaillError.error(message)
	}
}