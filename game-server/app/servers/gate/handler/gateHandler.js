"use strict"

/**
 * Created by modun on 14-7-22.
 */

var _ = require("underscore")
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
	this.Device = app.get("Device")
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

	var deviceId = msg.deviceId
	if(!_.isString(deviceId)){
		var e = new Error("deviceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	var self = this
	this.Device.findByIdAsync(deviceId).then(function(doc){
		if(_.isObject(doc)){
			return self.Player.findByIdAsync(doc.playerId).then(function(doc){
				return Promise.resolve(doc.serverId)
			})
		}else{
			return Promise.resolve(self.gateService.getPromotedServer().id)
		}
	}).then(function(serverId){
		var logicServer = self.gateService.getPromotedLogicServer(serverId)
		if(!_.isObject(logicServer)){
			var e = ErrorUtils.serverUnderMaintain()
			next(e, ErrorUtils.getError(e))
		}else{
			var data = {
				id:logicServer.id,
				host:logicServer.host,
				port:logicServer.clientPort
			}
			next(null, {data:data, code:200})
		}
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}