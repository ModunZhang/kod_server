"use strict"

/**
 * Created by modun on 14-7-29.
 */

var toobusy = require("toobusy-js")
var _ = require("underscore")

var ErrorUtils = require("../../../utils/errorUtils")
var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new CacheRemote(app)
}

var CacheRemote = function(app){
	this.app = app
	this.logService = app.get('logService');
	this.channelService = app.get('channelService')

	this.playerApiService = app.get("playerApiService")
	this.playerApiService2 = app.get("playerApiService2")
	this.playerApiService3 = app.get("playerApiService3")
	this.playerApiService4 = app.get("playerApiService4")
	this.playerApiService5 = app.get("playerApiService5")
	this.playerIAPService = app.get("playerIAPService")
	this.allianceApiService = app.get("allianceApiService")
	this.allianceApiService2 = app.get("allianceApiService2")
	this.allianceApiService3 = app.get("allianceApiService3")
	this.allianceApiService4 = app.get("allianceApiService4")
	this.allianceApiService5 = app.get("allianceApiService5")
	this.toobusyMaxLag = 140
	this.toobusyInterval = 250
	toobusy.maxLag(this.toobusyMaxLag)
	toobusy.interval(this.toobusyInterval)
	this.apiMap = {}
	var self = this
	var services = [this.playerApiService, this.playerApiService2, this.playerApiService3, this.playerApiService4, this.playerApiService5,
		this.playerIAPService, this.allianceApiService, this.allianceApiService2, this.allianceApiService3, this.allianceApiService4, this.allianceApiService5
	]
	_.each(services, function(service){
		if(!_.isObject(service)) return
		var properties = Object.getPrototypeOf(service)
		_.each(properties, function(value, key){
			if(_.isFunction(value)){
				if(_.isObject(self.apiMap[key])){
					throw new Error("api名称重复:" + key)
				}else
					self.apiMap[key] = service;
			}
		})
	})
}

var pro = CacheRemote.prototype

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.addToAllianceChannel = function(allianceId, uid, logicServerId, callback){
	this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, true).add(uid, logicServerId)
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.removeFromAllianceChannel = function(allianceId, uid, logicServerId, callback){
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(!_.isObject(channel)){
		this.logService.onEventError('cache.cacheRemote.removeFromAllianceChannel', {
			allianceId:allianceId,
			playerId:uid,
			logicServerId:logicServerId
		})
		callback()
		return
	}
	channel.leave(uid, logicServerId)
	if(channel.getMembers().length == 0) channel.destroy()
	callback()
}

/**
 * 获取在线玩家数量
 * @param callback
 */
pro.getLoginedCount = function(callback){
	callback(null, this.app.get('loginedCount'))
}

/**
 * 处理前端服务器发来的请求
 * @param api
 * @param params
 * @param callback
 */
pro.request = function(api, params, callback){
	var self = this
	var service = this.apiMap[api]
	var e = null
	if(toobusy()){
		e = ErrorUtils.serverTooBusy(api, params)
		self.logService.onRequestError('cache.cacheRemote.request', {api:api, params:params}, e.stack)
		callback(null, {code:e.code, data:e.message})
		return
	}
	if(!_.isObject(service)){
		e = new Error('后端Api 不存在')
		self.logService.onRequestError('cache.cacheRemote.request', {api:api, params:params}, e.stack)
		callback(null, {code:500, data:e.message})
		return
	}
	service[api + 'Async'].apply(service, Array.prototype.slice.call(params, 0)).then(function(data){
		callback(null, {code:200, data:data})
	}).catch(function(e){
		self.logService.onRequestError('cache.cacheRemote.request', {api:api, params:params}, e.stack)
		callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
	})
}