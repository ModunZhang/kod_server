/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var utils = require("../../../utils/utils")
var Promise = require("bluebird")

var PlayerService = require("../../../services/playerService")

module.exports = function(app){
	return new ChatHandler(app)
}

var ChatHandler = function(app){
	this.app = app
	this.playerService = Promise.promisifyAll(new PlayerService(this.app.get("redis")))
	this.channelService = this.app.get("channelService")
	this.channel = this.channelService.getChannel("chatChannel", true)
	this.chats = []
	this.maxChatCount = 50
}

var pro = ChatHandler.prototype

pro.send = function(msg, session, next){
	var self = this
	var text = msg.text
	if(_.isEmpty(text) || _.isEmpty(text.trim())){
		next()
	}

	this.playerService.getPlayerByIdAsync(session.uid).then(function(doc){
		if(_.isEmpty(doc)){
			next()
		}else{
			var time = Date.now()
			var response = {
				fromId:doc._id,
				from: doc.name,
				text: text,
				time: time
			}

			if (self.chats.length > self.maxChatCount) {
				self.chats.shift()
			}
			self.chats.push(response)
			self.channel.pushMessage("onChat", response)
			next()
		}
	})
}

pro.getAll = function(msg, session, next){
	next(null, {code:200, data:this.chats})
}