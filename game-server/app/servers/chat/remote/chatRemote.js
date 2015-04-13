"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Consts = require("../../../consts/consts")

module.exports = function(app) {
	return new ChatRemote(app)
}

var ChatRemote = function(app) {
	this.app = app
	this.channelService = this.app.get("channelService")
}

var pro = ChatRemote.prototype

/**
 * 将玩家添加到聊天频道中
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.addToChatChannel = function(uid, logicServerId, callback){
	this.channelService.getChannel(Consts.GlobalChatChannel, true).add(uid, logicServerId)
	callback()
}

/**
 * 将玩家从聊天频道中移除
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.removeFromChatChannel = function(uid, logicServerId, callback){
	this.channelService.getChannel(Consts.GlobalChatChannel).leave(uid, logicServerId)
	callback()
}