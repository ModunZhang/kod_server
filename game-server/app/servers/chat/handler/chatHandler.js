/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var utils = require("../../../utils/utils")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new ChatHandler(app)
}

var ChatHandler = function(app){
	this.app = app
	this.playerService = this.app.get("playerService")
	this.channelService = this.app.get("channelService")
	this.gloablChatChannel = this.channelService.getChannel(Consts.GloablChatChannelName, true)
	this.chats = []
	this.maxChatCount = 50
}

var pro = ChatHandler.prototype


/**
 * 发送聊天信息
 * @param msg
 * @param session
 * @param next
 */
pro.send = function(msg, session, next){
	var self = this
	var text = msg.text
	var type = msg.type
	if(_.isEmpty(text) || _.isEmpty(text.trim())){
		next(null, utils.next(null, 500))
	}
	if(_.isEmpty(type)){
		next(null, utils.next(null, 500))
	}

	this.playerService.getPlayerByIdAsync(session.uid).then(function(doc){
		if(_.isElement(doc)){
			next(null, utils.next(null, 500))
		}else if(FilterCommand.call(self, text, doc)){
			next(null, utils.next(null, 200))
		}else{
			var time = Date.now()
			var response = {
				fromId:doc._id,
				from:doc.name,
				text:text,
				time:time
			}

			if(self.chats.length > self.maxChatCount){
				self.chats.shift()
			}
			self.chats.push(response)
			self.gloablChatChannel.pushMessage("onChat", response)
			next(null, utils.next(null, 200))
		}
	})
}

/**
 * 获取所有聊天信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAll = function(msg, session, next){
	next(null, utils.next(this.chats, 200))
}

var FilterCommand = function(text, userInfo){
	return false
}