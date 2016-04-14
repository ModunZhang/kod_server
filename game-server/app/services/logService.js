"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")


var LogService = function(app){
	this.app = app
	this.serverId = app.getCurServer().id;
	this.httpServerId = app.get('httpServerId');
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

}

/**
 * 事件触发日志
 * @param api
 * @param object
 */
pro.onEvent = function(api, object){

}

/**
 * 一般错误触发日志
 * @param api
 * @param object
 * @param stack
 */
pro.onWarning = function(api, object, stack){

}

/**
 * 事件触发错误日志
 * @param api
 * @param object
 * @param stack
 */
pro.onError = function(api, object, stack){

}