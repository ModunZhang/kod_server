"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var requestLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-request")
var eventLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-event")
var remoteLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-remote")
var findLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-find")
var gmLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-gm")
var warningLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-warning")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorsLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-errors")
var mailWarningLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-warning")
var mailErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

var LogService = function(app){
	this.app = app
	this.serverId = app.getCurServer().id;
	this.serverConfig = app.get('serverConfig');
}
module.exports = LogService
var pro = LogService.prototype

/**
 * 请求时间日志
 * @param api
 * @param code
 * @param uid
 * @param uname
 * @param time
 * @param msg
 */
pro.onRequest = function(api, code, uid, uname, time, msg){
	requestLogger.info('[%s] Code:%d Time:%dms Api:%s Uid:%s UName:%s Msg:%j', this.serverId, code, time, api, uid, uname, _.omit(msg, '__route__'));
}

/**
 * 事件触发日志
 * @param api
 * @param object
 */
pro.onEvent = function(api, object){
	eventLogger.info('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * RPC请求日志
 * @param api
 * @param object
 */
pro.onRemote = function(api, object){
	remoteLogger.info('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * 缓存查询触发日志
 * @param api
 * @param object
 */
pro.onFind = function(api, object){
	findLogger.info('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * Gm平台Api调用日志
 * @param api
 * @param object
 */
pro.onGm = function(api, object){
	gmLogger.info('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
}

/**
 * 一般错误触发日志
 * @param api
 * @param object
 * @param stack
 */
pro.onWarning = function(api, object, stack){
	warningLogger.error('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
	warningLogger.error(_.isString(stack) ? stack : '')
	errorsLogger.error('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
	errorsLogger.error(_.isString(stack) ? stack : '')
	if(this.serverConfig.productionMode){
		mailWarningLogger.error('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
		mailWarningLogger.error(_.isString(stack) ? stack : '')
	}
}

/**
 * 事件触发错误日志
 * @param api
 * @param object
 * @param stack
 */
pro.onError = function(api, object, stack){
	errorLogger.error('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
	errorLogger.error(_.isString(stack) ? stack : '')
	errorsLogger.error('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
	errorsLogger.error(_.isString(stack) ? stack : '')
	if(this.serverConfig.productionMode){
		mailErrorLogger.error('[' + this.serverId + '] ' + api + ":" + " %j", _.isObject(object) ? object : {})
		mailErrorLogger.error(_.isString(stack) ? stack : '')
	}
}