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
	this.allianceViewers = {};
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
 * 离开被观察的联盟
 * @param playerId
 * @param logicServerId
 * @param channel
 * @param timeOut
 */
var LeaveChannel = function(playerId, logicServerId, channel, timeOut){
	if(!!timeOut){
		this.logService.onRemoteError('cache.cacheRemote.LeaveChannel', {
			playerId:playerId,
			logicServerId:logicServerId,
			channel:channel.name
		}, new Error('未正常发出观察心跳').stack);
	}
	channel.leave(playerId, logicServerId);
	if(channel.getMembers().length == 0) channel.destroy();
	delete this.allianceViewers[playerId];
}


/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.addToAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onRemote('cache.cacheRemote.addToAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, true).add(playerId, logicServerId)
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.removeFromAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onRemote('cache.cacheRemote.removeFromAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(!_.isObject(channel)){
		this.logService.onRemoteError('cache.cacheRemote.removeFromAllianceChannel', {
			allianceId:allianceId,
			playerId:playerId,
			logicServerId:logicServerId
		}, new Error('channel 不存在').stack)
		callback()
		return
	}
	channel.leave(playerId, logicServerId)
	if(channel.getMembers().length == 0) channel.destroy()
	callback()
}

/**
 * 从玩家正在观察的联盟退出
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.removeFromViewedAllianceChannel = function(playerId, logicServerId, callback){
	this.logService.onRemote('cache.cacheRemote.removeFromViewedAllianceChannel', {
		playerId:playerId,
		logicServerId:logicServerId
	});
	var viewer = this.allianceViewers[playerId];
	if(!viewer) return callback();
	var timer = viewer.timer;
	var channel = viewer.channel;
	clearTimeout(timer);
	LeaveChannel.call(this, playerId, logicServerId, channel, false);
	callback();
}

/**
 * 如果玩家观察的联盟和玩家新加入的联盟相同,将玩家从观察的联盟中移除
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.removeFromViewedAllianceChannelIfEqual = function(allianceId, playerId, logicServerId, callback){
	this.logService.onRemote('cache.cacheRemote.removeFromViewedAllianceChannelIfEqual', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	var viewer = this.allianceViewers[playerId];
	if(!viewer) callback();
	var timer = viewer.timer;
	var viewedChannel = viewer.channel;
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(channel === viewedChannel){
		clearTimeout(timer);
		LeaveChannel.call(this, playerId, logicServerId, viewedChannel, false);
	}
	callback();
}

/**
 * 进入被观察联盟
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.enterAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onRemote('cache.cacheRemote.enterAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	var viewer = this.allianceViewers[playerId];
	var timer = null;
	var channel = null;
	if(!!viewer){
		timer = viewer.timer;
		channel = viewer.channel;
		clearTimeout(timer);
		LeaveChannel.call(this, playerId, logicServerId, channel, false);
	}
	channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, true);
	channel.add(playerId, logicServerId)
	viewer = {
		channel:channel,
		timer:setTimeout(LeaveChannel.bind(this), 1000 * 20, playerId, logicServerId, channel, true)
	};
	this.allianceViewers[playerId] = viewer;
	callback();
}

/**
 * 进入被观察联盟后的心跳
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.amInAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onRemote('cache.cacheRemote.amInAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	var viewer = this.allianceViewers[playerId];
	if(!viewer){
		this.logService.onRemoteError('cache.cacheRemote.amInAllianceChannel', {
			allianceId:allianceId,
			playerId:playerId,
			logicServerId:logicServerId
		}, new Error('玩家未观察此联盟').stack);
		return callback();
	}
	var timer = viewer.timer;
	var channel = viewer.channel;
	clearTimeout(timer);
	timer = setTimeout(LeaveChannel.bind(this), 1000 * 15, playerId, logicServerId, channel, true)
	viewer.timer = timer;
	callback();
}

/**
 * 玩家离开被观察的联盟
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 * @returns {*}
 */
pro.leaveAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onRemote('cache.cacheRemote.leaveAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	var viewer = this.allianceViewers[playerId];
	if(!viewer){
		this.logService.onRemoteError('cache.cacheRemote.leaveAllianceChannel', {
			allianceId:allianceId,
			playerId:playerId,
			logicServerId:logicServerId
		}, new Error('玩家未观察此联盟').stack);
		return callback();
	}
	var timer = viewer.timer;
	var channel = viewer.channel;
	clearTimeout(timer);
	LeaveChannel.call(this, playerId, logicServerId, channel, false);
	callback();
}

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