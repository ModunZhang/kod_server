"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")

var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
	this.logService = app.get("logService")
	this.gateService = app.get("gateService")
	this.dataService = app.get("dataService")
}

var pro = Handler.prototype

/**
 * 获取前端服务器
 * @param msg
 * @param session
 * @param next
 */
pro.queryEntry = function(msg, session, next){
	this.logService.onRequest("gate.getHandler.queryEntry", msg)
	var e = null
	if(!this.app.get("isReady")){
		e = ErrorUtils.serverUnderMaintain()
		next(e, ErrorUtils.getError(e))
		return
	}

	var deviceId = msg.get("deviceId")
	if(!_.isString(deviceId)){
		next(e, ErrorUtils.getError(new Error("deviceId 不合法")))
		return
	}
	this.dataService.findPlayerAsync(deviceId).then(function(doc){
		if(_.isObject(doc)){
			return Promo
		}
	})


	var logicServer = this.gateService.getPromotedLogicServer()
	var data = {
		id:logicServer.id,
		host:logicServer.outHost,
		port:logicServer.clientPort
	}
	next(null,{
		data:data,
		code:200
	})
}