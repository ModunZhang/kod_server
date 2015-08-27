"use strict"

/**
 * Created by modun on 14-7-29.
 */

var toobusy = require("toobusy-js")
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
	this.toobusyMaxLag = 100
	this.toobusyInterval = 500
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
 * 处理前端服务器发来的请求
 * @param api
 * @param params
 * @param callback
 */
pro.request = function(api, params, callback){
	var self = this
	var service = this.apiMap[api]
	var e = null
	//if(toobusy() && !_.isEqual(api, 'logout') && !_.isEqual(api, 'addPlayerBillingData')){
	//	e = ErrorUtils.serverTooBusy(api, params)
	//	self.logService.onRequestError('cache.cacheRemote.request', {api:api, params:params}, e.stack)
	//	callback(null, {code:e.code, data:e.message})
	//	return
	//}
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


/**
 * 给在线玩家发全服邮件
 * @param playerIds
 * @param title
 * @param content
 * @param callback
 */
var SendInCacheServerMail = function(playerIds, title, content, callback){
	var self = this;
	var mail = {
		id:ShortId.generate(),
		title:title,
		fromId:"__system",
		fromName:"__system",
		fromIcon:0,
		fromAllianceTag:"",
		sendTime:Date.now(),
		content:content,
		isRead:false,
		isSaved:false
	};

	setImmediate(function(){
		if(playerIds.length > 0){
			var playerId = playerIds.shift();
			var playerDoc = null;
			var playerData = [];
			return self.cacheService.findPlayerAsync(playerId).then(function(doc){
				playerDoc = doc;
				if(!_.isObject(playerDoc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, playerId));
				while(playerDoc.mails.length >= Define.PlayerMailsMaxSize){
					(function(){
						var willRemovedMail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
						playerData.push(["mails." + playerDoc.mails.indexOf(willRemovedMail), null])
						LogicUtils.removeItemInArray(playerDoc.mails, willRemovedMail)
					})();
				}
				playerDoc.mails.push(mail)
				playerData.push(["mails." + playerDoc.mails.indexOf(mail), mail])
				return self.cacheService.updatePlayerAsync(playerId, playerDoc)
			}).then(function(){
				return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
			}).then(function(){
				return SendInCacheServerMail.call(self, playerIds, title, content, callback);
			}).catch(function(e){
				self.logService.onEventError('cache.cacheRemote.SendInCacheServerMail', {
					playerId:playerId,
					title:title,
					content:content
				}, e.stack);
				var funcs = []
				if(_.isObject(playerDoc)){
					funcs.push(self.cacheService.updatePlayerAsync(playerId, null))
				}
				return Promise.all(funcs).then(function(){
					return SendInCacheServerMail.call(self, playerIds, title, content, callback);
				})
			})
		}else{
			callback();
		}
	})
}

/**
 * 给离线玩家发送全服邮件
 * @param playerIds
 * @param title
 * @param content
 * @param callback
 */
var SendOutCacheServerMail = function(playerIds, title, content, callback){
	var self = this;
	var mail = {
		id:ShortId.generate(),
		title:title,
		fromId:"__system",
		fromName:"__system",
		fromIcon:0,
		fromAllianceTag:"",
		sendTime:Date.now(),
		content:content,
		isRead:false,
		isSaved:false
	};

	this.Player.collection.update({
		serverId:self.cacheServerId,
		_id:{$in:playerIds}
	}, {$push:{mails:mail}}, {multi:true}, function(e){
		if(_.isObject(e)) callback(e);
		else callback()
	});
}

/**
 * 获取在线玩家数量
 * @param callback
 */
pro.getLoginedCount = function(callback){
	callback(null, this.app.get('loginedCount'))
}

/**
 * 发送全服系统邮件
 * @param title
 * @param content
 * @param callback
 */
pro.sendGlobalMail = function(title, content, callback){
	this.logService.onEvent('cache.cacheRemote.sendGlobalMail', {title:title, content:content});

	var self = this
	var lastLoginTime = Date.now() - (DataUtils.getPlayerIntInit('activePlayerNeedHouses') * 60 * 60 * 1000);
	this.Player.collection.find({
		serverId:self.cacheServerId,
		'countInfo.lastLogoutTime':{$gt:lastLoginTime}
	}, {
		_id:true
	}).toArray(function(e, docs){
		var inCacheIds = [];
		var outCacheIds = [];
		_.each(docs, function(doc){
			var id = doc._id;
			if(self.cacheService.isPlayerInCache(id)) inCacheIds.push(id);
			else outCacheIds.push(id);
		})
		var SendOutCacheServerMailAsync = Promise.promisify(SendOutCacheServerMail, self);
		var SendInCacheServerMailAsync = Promise.promisify(SendInCacheServerMail, self);
		SendOutCacheServerMailAsync(outCacheIds, title, content).then(function(){
			self.logService.onEvent('cache.cacheRemote.sendGlobalMail.SendOutCacheServerMail', {
				playerCount:outCacheIds.length,
				title:title,
				content:content
			});
			return SendInCacheServerMailAsync(inCacheIds, title, content)
		}).then(function(){
			self.logService.onEvent('cache.cacheRemote.sendGlobalMail.SendInCacheServerMail', {
				playerCount:inCacheIds.length,
				title:title,
				content:content
			});
		}).catch(function(e){
			self.logService.onEventError('cache.cacheRemote.sendGlobalMail', {
				playerCount:docs.length,
				title:title,
				content:content
			}, e.stack);
		})
	})

	callback();
}

/**
 * 向指定玩家发送系统邮件
 * @param ids
 * @param title
 * @param content
 * @param callback
 */
pro.sendMailToPlayers = function(ids, title, content, callback){
	this.logService.onEvent('cache.cacheRemote.sendMailToPlayers', {ids:ids, title:title, content:content});

	var self = this;
	var inCacheIds = [];
	var outCacheIds = [];
	_.each(ids, function(id){
		if(self.cacheService.isPlayerInCache(id)) inCacheIds.push(id);
		else outCacheIds.push(id);
	})
	var SendOutCacheServerMailAsync = Promise.promisify(SendOutCacheServerMail, this);
	var SendInCacheServerMailAsync = Promise.promisify(SendInCacheServerMail, this);
	SendOutCacheServerMailAsync(outCacheIds, title, content).then(function(){
		self.logService.onEvent('cache.cacheRemote.sendMailToPlayers.SendOutCacheServerMail', {
			playerCount:outCacheIds.length,
			title:title,
			content:content
		});
		return SendInCacheServerMailAsync(inCacheIds, title, content)
	}).then(function(){
		self.logService.onEvent('cache.cacheRemote.sendMailToPlayers.SendInCacheServerMail', {
			playerCount:inCacheIds.length,
			title:title,
			content:content
		});
	}).catch(function(e){
		self.logService.onEventError('cache.cacheRemote.sendMailToPlayers', {
			count:ids.length,
			title:title,
			content:content
		}, e.stack);
	})

	callback()
}

/**
 * 根据ID查找玩家
 * @param id
 * @param callback
 */
pro.findPlayerById = function(id, callback){
	this.cacheService.findPlayerAsync(id).then(function(doc){
		callback(null, doc);
	}).catch(function(e){
		callback(e);
	})
}