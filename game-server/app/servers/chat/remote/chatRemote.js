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
	this.gloablChatChannel = this.channelService.getChannel(Consts.GloablChatChannelName, true)
}

var pro = ChatRemote.prototype

/**
 * 将玩家添加到全服聊天频道中
 * @param uid
 * @param sid
 * @param cb
 */
pro.add = function(uid, sid, cb){
	this.gloablChatChannel.add(uid, sid)
	cb()
}

/**
 * 将玩家从全服聊天频道中移除
 * @param uid
 * @param sid
 * @param cb
 */
pro.leave = function(uid, sid, cb){
	this.gloablChatChannel.leave(uid, sid)
	cb()
}