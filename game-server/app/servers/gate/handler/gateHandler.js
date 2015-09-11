"use strict"

/**
 * Created by modun on 14-7-22.
 */

var _ = require("underscore")
var Promise = require("bluebird")
var ShortId = require("shortid")
var Http = require("http")

var Utils = require("../../../utils/utils")
var ErrorUtils = require("../../../utils/errorUtils")
var LogicUtils = require("../../../utils/logicUtils")
var DataUtils = require("../../../utils/dataUtils")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.gateService = app.get("gateService")
	this.Player = app.get("Player")
	this.Device = app.get("Device")
	this.Lock = app.get('Lock');
	this.serverConfig = app.get('serverConfig')
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
	var tag = msg.tag
	var e = null
	if(!_.isString(deviceId)){
		e = new Error("deviceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(tag) || tag < 0 || tag % 1 != 0){
		e = new Error("tag 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	var self = this;
	var getClientBuildAsync = new Promise(function(resolve, reject){
		if(!self.serverConfig.clientTagCheckEnabled) resolve()
		else{
			Http.get(self.serverConfig.clientTagValidateUrl, function(res){
				if(res.statusCode != 200) reject(ErrorUtils.versionValidateFailed(tag))
				else{
					res.on('data', function(data){
						var config = JSON.parse(data.toString())
						if(_.isEqual(tag, config.tag)) resolve()
						else reject(ErrorUtils.versionNotEqual(tag, config.tag))
					})
				}
			}).on('error', function(e){
				self.logService.onRequestError("gate.getHandler.queryEntry", msg, e.stack)
				reject(ErrorUtils.versionValidateFailed(tag))
			})
		}
	})

	getClientBuildAsync.then(function(){
		return self.Device.findByIdAsync(deviceId)
	}).then(function(doc){
		var device = null
		if(_.isObject(doc)){
			device = doc
			return self.Player.findByIdAsync(device.playerId, {serverId:true, 'countInfo.lockTime':true}).then(function(doc){
				if(doc.countInfo.lockTime > Date.now()) return Promise.reject(ErrorUtils.playerLocked(device.playerId))
				return Promise.resolve(doc.serverId)
			})
		}else{
			var playerId = ShortId.generate()
			device = LogicUtils.createDevice(deviceId, playerId)
			var serverId = self.gateService.getPromotedServer().id
			var player = LogicUtils.createPlayer(playerId, deviceId, serverId)
			return self.Device.createAsync(device).then(function(){
				return self.Player.createAsync(player).then(function(doc){
					var playerDoc = Utils.clone(doc)
					var playerId = playerDoc._id
					delete playerDoc._id
					return self.Player.updateAsync({_id:playerId}, playerDoc).then(function(){
						return Promise.resolve(serverId)
					})
				})
			})
		}
	}).then(function(serverId){
		var logicServer = self.gateService.getLogicServer(serverId)
		if(!_.isObject(logicServer)){
			var e = ErrorUtils.serverUnderMaintain()
			next(e, ErrorUtils.getError(e))
		}else{
			var data = {
				id:logicServer.id,
				host:logicServer.clientHost,
				port:logicServer.clientPort
			}
			next(null, {data:data, code:200})
		}
	}).catch(function(e){
		self.logService.onRequestError("gate.getHandler.queryEntry", {deviceId:deviceId}, e.stack)
		next(null, ErrorUtils.getError(e))
	})
}