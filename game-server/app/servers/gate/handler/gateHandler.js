"use strict"

/**
 * Created by modun on 14-7-22.
 */

var _ = require("underscore")
var Promise = require("bluebird")
var ShortId = require("shortid")

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

	var self = this;
	this.Lock.findOneAsync({type:'device', value:deviceId, finishTime:{$gt:Date.now()}}).then(function(doc){
		if(_.isObject(doc)) return Promise.reject(ErrorUtils.deviceLocked(deviceId))
	}).then(function(){
		return self.Device.findByIdAsync(deviceId)
	}).then(function(doc){
		var device = null
		if(_.isObject(doc)){
			device = doc
			return self.Lock.findOneAsync({type:'player', value:device.playerId, finishTime:{$gt:Date.now()}}).then(function(doc){
				if(_.isObject(doc)) return Promise.reject(ErrorUtils.playerLocked(device.playerId))
				else{
					return self.Player.findByIdAsync(device.playerId, {serverId:true}).then(function(doc){
						return Promise.resolve(doc.serverId)
					})
				}
			})
		}else{
			var playerId = ShortId.generate()
			device = LogicUtils.createDevice(deviceId, playerId)
			var serverId = self.gateService.getPromotedServer().id
			var player = LogicUtils.createPlayer(playerId, serverId)
			return self.Device.createAsync(device).then(function(){
				return self.Player.createAsync(player).then(function(doc){
					var playerDoc = Utils.clone(doc)
					LogicUtils.initPlayerDoc(playerDoc)
					var playerId = playerDoc._id
					delete playerDoc._id
					return self.Player.updateAsync({_id:playerId}, playerDoc).then(function(){
						return Promise.resolve(serverId)
					})
				})
			})
		}
	}).then(function(serverId){
		var logicServer = self.gateService.getPromotedLogicServer(serverId)
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
		next(e, ErrorUtils.getError(e))
	})
}