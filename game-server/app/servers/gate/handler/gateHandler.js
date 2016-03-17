"use strict"

/**
 * Created by modun on 14-7-22.
 */

var _ = require("underscore")
var Promise = require("bluebird")
var ShortId = require("shortid")
var request = require('request')

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
	this.serverConfig = app.get('serverConfig')
	this.clientTag = null;
}

var pro = Handler.prototype


/**
 * 获取前端服务器
 * @param msg
 * @param session
 * @param next
 */
pro.queryEntry = function(msg, session, next){
	var self = this;
	var platform = msg.platform;
	var deviceId = msg.deviceId;
	var tag = msg.tag;
	var e = null
	if(platform !== this.serverConfig.platform){
		e = new Error("platform 不合法")
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isString(deviceId)){
		e = new Error("deviceId 不合法")
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isNumber(tag) || tag % 1 != 0){
		e = new Error("tag 不合法")
		return next(e, ErrorUtils.getError(e))
	}

	Promise.fromCallback(function(callback){
		if(tag === -1 || !self.serverConfig.clientTagValidateUrl) return callback();
		if(!self.clientTag){
			request.get(self.serverConfig.clientTagValidateUrl, function(e, resp, body){
				if(!!e || resp.statusCode != 200){
					e = new Error('检查客户端版本失败');
					self.logService.onError('gate.gateHandler.queryEntry', {}, e.stack);
					return callback(ErrorUtils.serverUnderMaintain());
				}
				var config = JSON.parse(body)
				self.clientTag = config.tag;
				if(tag < self.clientTag) return callback(ErrorUtils.versionNotEqual(tag, self.clientTag));
				callback();
			})
		}else{
			if(tag < self.clientTag) return callback(ErrorUtils.versionNotEqual(tag, self.clientTag));
			callback();
		}
	}).then(function(){
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
			var promotedServer = self.gateService.getPromotedServer();
			if(!promotedServer)  return Promise.reject(ErrorUtils.serverUnderMaintain());
			var serverId = promotedServer.id
			var player = LogicUtils.createPlayer(playerId, deviceId, serverId)
			return self.Device.createAsync(device).then(function(){
				return self.Player.createAsync(player)
			}).then(function(){
				return Promise.resolve(serverId)
			})
		}
	}).then(function(serverId){
		var logicServer = self.gateService.getLogicServer(serverId)
		if(!logicServer) return Promise.reject(ErrorUtils.serverUnderMaintain());
		var data = {
			id:logicServer.id,
			host:logicServer.clientHost,
			port:logicServer.clientPort,
			platForm:self.serverConfig.platform,
			env:self.serverConfig.env
		}
		next(null, {data:data, code:200})
	}).catch(function(e){
		self.logService.onWarning("gate.getHandler.queryEntry", {deviceId:deviceId}, e.stack)
		next(null, ErrorUtils.getError(e))
	})
}