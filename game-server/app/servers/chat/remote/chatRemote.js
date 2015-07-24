"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require('bluebird');

var DataUtils = require('../../../utils/dataUtils')

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")

module.exports = function(app){
	return new ChatRemote(app)
}

var ChatRemote = function(app){
	this.app = app
	this.logService = app.get('logService');
	this.channelService = app.get("channelService")
	this.globalChatChannel = this.channelService.getChannel(Consts.GlobalChatChannel, true)
	this.allianceChats = app.get('allianceChats')
	this.allianceFights = app.get('allianceFights')
	this.allianceFightChats = app.get('allianceFightChats')
	this.Player = app.get('Player');
}

var pro = ChatRemote.prototype

/**
 * 将玩家添加到聊天频道中
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.addToChatChannel = function(uid, logicServerId, callback){
	this.globalChatChannel.add(uid, logicServerId)
	callback()
}

/**
 * 将玩家从聊天频道中移除
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.removeFromChatChannel = function(uid, logicServerId, callback){
	this.globalChatChannel.leave(uid, logicServerId)
	callback()
}

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
		this.logService.onEventError('chat.chatRemote.removeFromAllianceChannel', {
			allianceId:allianceId,
			playerId:uid,
			logicServerId:logicServerId
		})
		callback()
		return
	}
	channel.leave(uid, logicServerId)
	callback()
}

/**
 * 删除联盟聊天频道
 * @param allianceId
 * @param callback
 */
pro.destroyAllianceChannel = function(allianceId, callback){
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(!_.isObject(channel)){
		this.logService.onEventError('chat.chatRemote.destroyAllianceChannel', {allianceId:allianceId})
		callback()
		return
	}
	channel.destroy()
	callback()
}

/**
 * 将对战中的联盟记录起来
 * @param attackAllianceId
 * @param defenceAllianceId
 * @param callback
 */
pro.createAllianceFightChannel = function(attackAllianceId, defenceAllianceId, callback){
	this.allianceFights[attackAllianceId] = attackAllianceId + '_' + defenceAllianceId
	this.allianceFights[defenceAllianceId] = attackAllianceId + '_' + defenceAllianceId
	callback()
}

/**
 * 将对战中的联盟从记录中移除
 * @param attackAllianceId
 * @param defenceAllianceId
 * @param callback
 */
pro.deleteAllianceFightChannel = function(attackAllianceId, defenceAllianceId, callback){
	var allianceFights = this.app.get('allianceFights')
	delete allianceFights[attackAllianceId]
	delete allianceFights[defenceAllianceId]
	delete this.allianceFightChats[attackAllianceId + '_' + defenceAllianceId]
	callback()
}

/**
 * 发送全服通告
 * @param type
 * @param content
 * @param callback
 */
pro.sendNotice = function(type, content, callback){
	this.globalChatChannel.pushMessage(Events.chat.onNotice, {type:type, content:content}, {}, null)
	callback()
}

/**
 * 发送全服系统邮件
 * @param title
 * @param content
 * @param callback
 */
pro.sendServerMail = function(title, content, callback){
	this.logService.onEvent('chat.chatRemote.sendServerMail', {title:title, content:content});

	var self = this;
	var lastLoginTime = Date.now() - (DataUtils.getPlayerIntInit('activePlayerNeedHouses') * 60 * 60 * 1000);
	var serverIds = {};
	var playerCount = 0;
	this.Player.collection.find({'countInfo.lastLogoutTime':{$gt:lastLoginTime}}, {
		_id:true,
		serverId:true
	}).toArray(function(e, docs){
		playerCount = docs.length;
		_.each(docs, function(doc){
			(function(){
				if(!_.isArray(serverIds[doc.serverId])) serverIds[doc.serverId] = [];
				serverIds[doc.serverId].push(doc._id);
			})();
		})
		var funcs = []
		_.each(serverIds, function(ids, serverId){
			(function(){
				var sendMailAsync = new Promise(function(resolve, reject){
					self.app.rpc.cache.cacheRemote.sendServerMail.toServer(serverId, ids, title, content, function(e){
						if(_.isObject(e)) reject(e);
						else resolve()
					})
				})
				funcs.push(sendMailAsync);
			})();
		})

		Promise.all(funcs).catch(function(e){
			self.logService.onEventError('chat.chatRemote.sendServerMail', {
				title:title,
				content:content
			}, e.stack);
		})
	})
	callback();
}