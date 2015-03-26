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
pro.add = function(uid, logicServerId, callback){
	this.channelService.getChannel(Consts.GloablChatChannelName, true).add(uid, logicServerId)
	callback()
}

/**
 * 将玩家从聊天频道中移除
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.leave = function(uid, logicServerId, callback){
	this.channelService.getChannel(Consts.GloablChatChannelName).leave(uid, logicServerId)
	callback()
}