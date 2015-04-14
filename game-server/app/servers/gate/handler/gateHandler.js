"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")

var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.gateService = app.get("gateService")
	this.Player = app.get("Player")
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

	var self = this
	this.Player.findByIdAsync(deviceId).then(function(doc){
		if(_.isObject(doc)){
			return Promise.resolve(doc.serverId)
		}else{
			return Promise.resolve(self.gateService.getPromotedServer().id)
		}
	}).then(function(serverId){
		var logicServer = self.gateService.getPromotedLogicServer(serverId)
		var data = {
			id:logicServer.id,
			host:logicServer.outHost,
			port:logicServer.clientPort
		}

		next(null, {data:data, code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}