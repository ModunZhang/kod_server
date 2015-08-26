"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require('bluebird');

var DataUtils = require('../../../utils/dataUtils')
var LogicUtils = require('../../../utils/logicUtils')

var Define = require("../../../consts/define")
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
	this.chats = app.get('chats');
	this.Player = app.get('Player');
}

var pro = ChatRemote.prototype

/**
 * 将玩家添加到聊天频道中
 * @param uid
 * @param logicServerId
 * @param cacheServerId
 * @param callback
 */
pro.addToChatChannel = function(uid, logicServerId, cacheServerId, callback){
	this.globalChatChannel.add(uid, logicServerId)
	this.channelService.getChannel(Consts.GlobalChatChannel + "_" + cacheServerId, true).add(uid, logicServerId)
	callback()
}

/**
 * 将玩家从聊天频道中移除
 * @param uid
 * @param logicServerId
 * @param cacheServerId
 * @param callback
 */
pro.removeFromChatChannel = function(uid, logicServerId, cacheServerId, callback){
	this.globalChatChannel.leave(uid, logicServerId)
	var channel = this.channelService.getChannel(Consts.GlobalChatChannel + "_" + cacheServerId, false)
	if(!_.isObject(channel)){
		this.logService.onEventError('chat.chatRemote.removeFromChatChannel', {
			playerId:uid,
			logicServerId:logicServerId,
			cacheServerId:cacheServerId
		})
		callback()
		return
	}
	channel.leave(uid, logicServerId)
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
 * @param servers
 * @param type
 * @param content
 * @param callback
 */
pro.sendGlobalNotice = function(servers, type, content, callback){
	this.logService.onEvent('chat.chatRemote.sendGlobalNotice', {servers:servers, type:type, content:content});
	var self = this
	_.each(servers, function(cacheServerId){
		var channel = self.channelService.getChannel(Consts.GlobalChatChannel + "_" + cacheServerId, false)
		if(_.isObject(channel)){
			channel.pushMessage(Events.chat.onNotice, {type:type, content:content}, {}, null)
		}
	})
	callback()
}

/**
 * 发送全服系统邮件
 * @param servers
 * @param title
 * @param content
 * @param callback
 */
pro.sendGlobalMail = function(servers, title, content, callback){
	this.logService.onEvent('chat.chatRemote.sendGlobalMail', {servers:servers, title:title, content:content});

	var self = this;
	_.each(servers, function(serverId){
		self.app.rpc.cache.cacheRemote.sendGlobalMail.toServer(serverId, title, content, function(e){
			if(_.isObject(e)){
				self.logService.onEventError('chat.chatRemote.sendGlobalMail', {
					title:title,
					content:content,
					serverId:serverId
				}, e.stack);
			}
		})
	})
	callback();
}

/**
 * 给指定ID发送邮件
 * @param ids
 * @param title
 * @param content
 * @param callback
 */
pro.sendMailToPlayers = function(ids, title, content, callback){
	this.logService.onEvent('chat.chatRemote.sendMailToPlayers', {ids:ids, title:title, content:content});

	var self = this;
	var serverIds = {};
	this.Player.collection.find({_id:{$in:ids}}, {serverId:true}).toArray(function(e, docs){
		if(!!e){
			self.logService.onEventError('chat.chatRemote.sendMailToPlayers', {
				ids:ids,
				title:title,
				content:content
			}, e.stack);
		}else{
			_.each(docs, function(doc){
				if(!serverIds[doc.serverId]) serverIds[doc.serverId] = [];
				serverIds[doc.serverId].push(doc._id);
			})
			_.each(serverIds, function(ids, serverId){
				self.app.rpc.cache.cacheRemote.sendMailToPlayers.toServer(serverId, ids, title, content, function(e){
					if(_.isObject(e)){
						self.logService.onEventError('chat.chatRemote.sendMailToPlayers', {
							title:title,
							content:content,
							serverId:serverId
						}, e.stack);
					}
				})
			})
		}
	})

	callback()
}

/**
 * 获取聊天记录
 * @param time
 * @param callback
 */
pro.getGlobalChats = function(time, callback){
	var self = this;
	if(time === 0) return callback(null, this.chats);

	var sliceFrom = null;
	for(var i = this.chats.length - 1; i >=0; i --){
		var chat = self.chats[i];
		if(chat.time <= time){
			sliceFrom = i + 1;
			break;
		}
	}
	if(sliceFrom >= 0) return callback(null, this.chats.slice(sliceFrom));

	callback(null, []);
}

/**
 * 发送系统聊天
 * @param content
 * @param callback
 */
pro.sendSysChat = function(content, callback){
	var message = LogicUtils.createSysChatMessage(content);
	if(this.chats.length > Define.MaxChatCount){
		this.chats.shift()
	}
	this.chats.push(message)
	this.globalChatChannel.pushMessage(Events.chat.onChat, message, {}, null)
	callback(null, message);
}