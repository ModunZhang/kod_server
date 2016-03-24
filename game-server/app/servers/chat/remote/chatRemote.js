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
}

var pro = ChatRemote.prototype

/**
 * 将玩家添加到聊天频道中
 * @param playerId
 * @param logicServerId
 * @param cacheServerId
 * @param callback
 */
pro.addToChatChannel = function(playerId, logicServerId, cacheServerId, callback){
	this.logService.onRemote('chat.chatRemote.addToChatChannel', {
		playerId:playerId,
		logicServerId:logicServerId,
		cacheServerId:cacheServerId
	});
	this.globalChatChannel.add(playerId, logicServerId)
	this.channelService.getChannel(Consts.GlobalChatChannel + "_" + cacheServerId, true).add(playerId, logicServerId)
	callback()
}

/**
 * 将玩家从聊天频道中移除
 * @param playerId
 * @param logicServerId
 * @param cacheServerId
 * @param callback
 */
pro.removeFromChatChannel = function(playerId, logicServerId, cacheServerId, callback){
	this.logService.onRemote('chat.chatRemote.removeFromChatChannel', {
		playerId:playerId,
		logicServerId:logicServerId,
		cacheServerId:cacheServerId
	});
	this.globalChatChannel.leave(playerId, logicServerId)
	var channel = this.channelService.getChannel(Consts.GlobalChatChannel + "_" + cacheServerId, false)
	if(!_.isObject(channel)){
		this.logService.onError('chat.chatRemote.removeFromChatChannel', {
			playerId:playerId,
			logicServerId:logicServerId,
			cacheServerId:cacheServerId
		}, new Error('channel 不存在').stack);
		callback()
		return
	}
	channel.leave(playerId, logicServerId)
	callback()
}

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerId
 * @param logicServerId
 * @param callback
 */
pro.addToAllianceChannel = function(allianceId, playerId, logicServerId, callback){
	this.logService.onRemote('chat.chatRemote.addToAllianceChannel', {
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
	this.logService.onRemote('chat.chatRemote.removeFromAllianceChannel', {
		allianceId:allianceId,
		playerId:playerId,
		logicServerId:logicServerId
	});
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(!_.isObject(channel)){
		this.logService.onError('chat.chatRemote.removeFromAllianceChannel', {
			allianceId:allianceId,
			playerId:playerId,
			logicServerId:logicServerId
		}, new Error('channel 不存在').stack)
		callback()
		return
	}
	channel.leave(playerId, logicServerId)
	callback()
}

/**
 * 删除联盟频道
 * @param allianceId
 * @param callback
 */
pro.destroyAllianceChannel = function(allianceId, callback){
	this.logService.onRemote('chat.chatRemote.destroyAllianceChannel', {allianceId:allianceId});
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	if(!_.isObject(channel)){
		this.logService.onError('chat.chatRemote.destroyAllianceChannel', {
			allianceId:allianceId
		}, new Error('channel 不存在').stack)
		callback()
		return
	}
	channel.destroy()
	callback()
}

/**
 * 通知服务器公告有变动
 * @param cacheServerId
 * @param callback
 */
pro.onServerNoticeChnaged = function(cacheServerId, callback){
	var channel = this.channelService.getChannel(Consts.GlobalChatChannel + "_" + cacheServerId, false)
	if(_.isObject(channel)){
		channel.pushMessage(Events.player.onServerNoticeChanged, {}, {}, null)
	}
	callback();
}