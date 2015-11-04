"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var ShortId = require('shortid');
var Promise = require('bluebird');

var DataUtils = require("../../../utils/dataUtils")
var ErrorUtils = require("../../../utils/errorUtils")
var Consts = require("../../../consts/consts")
var Define = require("../../../consts/define")

module.exports = function(app){
	return new CacheRemote(app)
}

var CacheRemote = function(app){
	this.app = app
	this.logService = app.get('logService');
	this.channelService = app.get('channelService')
	this.cacheService = app.get('cacheService');
	this.pushService = app.get('pushService');
	this.Player = app.get('Player');

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
	this.cacheServerId = app.get('cacheServerId');
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
 * 获取在线玩家数量
 * @param callback
 */
pro.getLoginedCount = function(callback){
	this.logService.onRemote('cache.cacheRemote.getLoginedCount');
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

	if(!_.isObject(service)){
		e = new Error('后端Api 不存在')
		self.logService.onError('cache.cacheRemote.request', {api:api, params:params}, e.stack)
		callback(null, {code:500, data:e.message})
		return
	}
	service[api + 'Async'].apply(service, Array.prototype.slice.call(params, 0)).then(function(data){
		callback(null, {code:200, data:data})
	}).catch(function(e){
		if(!!e.code){
			self.logService.onWarning('cache.cacheRemote.request', {api:api, params:params}, e.stack)
			callback(null, {code:e.code, data:e.message})
		}else{
			self.logService.onError('cache.cacheRemote.request', {api:api, params:params}, e.stack)
			callback(null, {code:500, data:e.message})
		}

	})
}