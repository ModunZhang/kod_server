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
	this.Alliance = app.get('Alliance');
	this.cacheServerId = app.get('cacheServerId');
}

var pro = CacheRemote.prototype

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
	this.logService.onEvent('cache.cacheRemote.findPlayerById', {id:id});
	this.cacheService.directFindPlayerAsync(id).then(function(doc){
		callback(null, doc);
	}).catch(function(e){
		self.logService.onEventError('cache.cacheRemote.findPlayerById', {
			id:id
		}, e.stack);
		callback(e);
	})
}

/**
 * 临时添加宝石
 * @param id
 * @param gem
 * @param callback
 */
pro.tempAddPlayerGem = function(id, gem, callback){
	this.logService.onEvent('cache.cacheRemote.tempAddPlayerGem', {id:id, gem:gem});

	var self = this;
	var playerDoc = null;
	var playerData = [];
	this.cacheService.findPlayerAsync(id).then(function(doc){
		playerDoc = doc;
		playerDoc.resources.gem += gem;
		playerData.push(['resources.gem', playerDoc.resources.gem]);

		return self.cacheService.updatePlayerAsync(id, playerDoc);
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback();
	}).catch(function(e){
		self.logService.onEventError('cache.cacheRemote.tempAddPlayerGem', {
			id:id,
			gem:gem
		}, e.stack);
		callback(e);
	})
}

/**
 * 根据ID查找联盟
 * @param id
 * @param callback
 */
pro.findAllianceById = function(id, callback){
	this.logService.onEvent('cache.cacheRemote.findAllianceById', {id:id});
	this.cacheService.directFindAllianceAsync(id).then(function(doc){
		callback(null, doc);
	}).catch(function(e){
		self.logService.onEventError('cache.cacheRemote.findAllianceById', {
			id:id
		}, e.stack);
		callback(e);
	})
}