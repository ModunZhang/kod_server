"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var requestLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-request")
var requestErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-request-error")
var eventLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-event")
var eventErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-event-error")
var cronLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-cron")
var cronErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-cron-error")
var iapGiftLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-iapGift")
var iapGiftErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-iapGift-error")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var mailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail")

var LogService = function(app){
	this.app = app
	this.evn = app.get("env")
	this.serverId = app.getServerId()
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
	errorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	errorLogger.error(stack)
	requestLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	requestLogger.error(stack)
	requestErrorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	requestErrorLogger.error(stack)
	if(_.isEqual(this.evn, "production")){
		mailLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		mailLogger.error(stack)
	}
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
	errorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	errorLogger.error(stack)
	eventLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	eventLogger.error(stack)
	eventErrorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	eventErrorLogger.error(stack)
	if(_.isEqual(this.evn, "production")){
		mailLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		mailLogger.error(stack)
	}
}

/**
 * 定时任务日志
 * @param api
 * @param object
 */
pro.onCron = function(api, object){
	cronLogger.info(api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * 定时任务错误日志
 * @param api
 * @param object
 * @param stack
 */
pro.onCronError = function(api, object, stack){
	errorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	errorLogger.error(stack)
	cronLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	cronLogger.error(stack)
	cronErrorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	cronErrorLogger.error(stack)
	if(_.isEqual(this.evn, "production")){
		mailLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		mailLogger.error(stack)
	}
}

/**
 * 定时任务日志
 * @param api
 * @param object
 */
pro.onIapGift = function(api, object){
	iapGiftLogger.info(api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * 定时任务错误日志
 * @param api
 * @param object
 * @param stack
 */
pro.onIapGiftError = function(api, object, stack){
	errorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	errorLogger.error(stack)
	iapGiftLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	iapGiftLogger.error(stack)
	iapGiftErrorLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
	iapGiftErrorLogger.error(stack)
	if(_.isEqual(this.evn, "production")){
		mailLogger.error(api + ":" + " %j", _.isObject(object) ? object : {})
		mailLogger.error(stack)
	}
}