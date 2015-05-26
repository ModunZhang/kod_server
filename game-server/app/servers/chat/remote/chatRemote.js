"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")

module.exports = function(app) {
	return new ChatRemote(app)
}

var ChatRemote = function(app) {
	this.app = app
	this.channelService = app.get("channelService")
	this.globalChatChannel = this.channelService.getChannel(Consts.GlobalChatChannel, true)
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
	this.sendNotice(Consts.NoticeType.Info, '热烈欢迎 ' + uid + ' 登录游戏', callback)
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
	channel.leave(uid, logicServerId)
	if(channel.getMembers().length == 0){
		channel.destroy()
		delete this.app.get('allianceChats')[allianceId]
	}
	callback()
}

/**
 * 将对战中的联盟记录起来
 * @param attackAllianceId
 * @param defenceAllianceId
 * @param callback
 */
pro.createAllianceFightChannel = function(attackAllianceId, defenceAllianceId, callback){
	var allianceFights = this.app.get('allianceFights')
	allianceFights[attackAllianceId] = attackAllianceId + '_' + defenceAllianceId
	allianceFights[defenceAllianceId] = attackAllianceId + '_' + defenceAllianceId
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
	delete this.app.get('allianceFightChats')[attackAllianceId + '_' + defenceAllianceId]
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