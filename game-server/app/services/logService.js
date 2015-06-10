"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var requestLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-request")
var requestErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-request-error")
var eventLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-event")
var eventErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-event-error")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var mailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail")

var LogService = function(app){
	this.app = app
	this.evn = app.get("env")
}
module.exports = LogService
var pro = LogService.prototype

/**
 * 玩家请求日志
 * @param api
 * @param object
 */
pro.onRequest = function(api, object){
	requestLogger.info(api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * 玩家请求错误日志
 * @param api
 * @param object
 * @param stack
 */
pro.onRequestError = function(api, object, stack){
	if(!_.isEqual(this.evn, "local")){
		errorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		errorLogger.error(_.isString(stack) ? stack : '')
		requestLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		requestLogger.error(_.isString(stack) ? stack : '')
	}
	requestErrorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	requestErrorLogger.error(_.isString(stack) ? stack : '')
}

/**
 * 事件触发日志
 * @param api
 * @param object
 */
pro.onEvent = function(api, object){
	eventLogger.info(api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * 事件触发错误日志
 * @param api
 * @param object
 * @param stack
 */
pro.onEventError = function(api, object, stack){
	if(!_.isEqual(this.evn, "local")){
		errorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		errorLogger.error(_.isString(stack) ? stack : '')
		eventLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		eventLogger.error(_.isString(stack) ? stack : '')
	}
	eventErrorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	eventErrorLogger.error(_.isString(stack) ? stack : '')
	if(!_.isEqual(this.evn, "local")){
		mailLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		mailLogger.error(_.isString(stack) ? stack : '')
	}
}