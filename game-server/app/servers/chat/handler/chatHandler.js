/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var utils = require("../../../utils/utils")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")

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
	this.commands = [
		{
			command:"reset",
			desc:"重置玩家数据",
			callback:function(text, session, userInfo){
				var self = this
				var basicPlayerInfo = require("../../../consts/basicPlayerInfo")
				basicPlayerInfo._id = userInfo._id
				basicPlayerInfo.__v = userInfo.__v
				basicPlayerInfo.basicInfo.deviceId = userInfo.basicInfo.deviceId
				basicPlayerInfo.basicInfo.name = userInfo.basicInfo.name
				this.playerService.updatePlayerAsync(basicPlayerInfo).then(function(doc){
					PushToPlayer.call(self, Events.player.onPlayerDataChanged, session, utils.filter(doc))
				})
			}
		}
	]
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
		FilterCommand.call(self, text, doc, session)

		var time = Date.now()
		var response = {
			fromId:doc._id,
			fromIcon:doc.basicInfo.icon,
			from:doc.name,
			text:text,
			time:time
		}

		if(self.chats.length > self.maxChatCount){
			self.chats.shift()
		}
		self.chats.push(response)
		self.gloablChatChannel.pushMessage(Events.chat.onChat, response)
	}).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 获取所有聊天信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAll = function(msg, session, next){
	PushToPlayer.call(this, Events.chat.onAllChat, session, this.chats)
	next(null, {code:200})
}

var FilterCommand = function(text, userInfo, session){
	if(_.isEqual("help", text)){
		PushHelpMessageToPlayer.call(this, session)
	}else{
		var callback = GetPlayerCommand.call(this, text)
		if(_.isFunction(callback)){
			callback.call(this, text, session, userInfo)
		}
	}
}

var PushHelpMessageToPlayer = function(session){
	var commands = ""
	_.each(this.commands, function(value){
		commands += value.command + ":" + value.desc + "\n"
	})

	var msg = {
		fromId:"system",
		from:"系统",
		fromIcon:"playerIcon_default.png",
		text:commands,
		time:Date.now()
	}

	PushToPlayer.call(this, Events.chat.onChat, session, msg)
}

var GetPlayerCommand = function(text){
	var command = text.split(" ")
	if(command.length > 0){
		command = command[0]
	}

	for(var i = 0; i < this.commands.length; i ++){
		var value = this.commands[i]
		if(_.isEqual(value.command, command)){
			return value.callback
		}
	}

	return null
}

var PushToPlayer = function(event, session, msg){
	this.channelService.pushMessageByUids(event, msg, [
		{uid:session.uid, sid:session.get("serverId")}
	])
}