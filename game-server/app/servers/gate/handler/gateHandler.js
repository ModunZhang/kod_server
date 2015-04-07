"use strict"

/**
 * Created by modun on 14-7-22.
 */

var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
	this.logService = app.get("logService")
	this.gateService = app.get("gateService")
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