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
			callback:function(text, session, userDoc){
				var self = this
				var basicPlayerInfo = require("../../../consts/basicPlayerInfo")
				basicPlayerInfo._id = userDoc._id
				basicPlayerInfo.__v = userDoc.__v
				basicPlayerInfo.basicInfo.deviceId = userDoc.basicInfo.deviceId
				basicPlayerInfo.basicInfo.name = userDoc.basicInfo.name
				basicPlayerInfo.basicInfo.cityName = userDoc.basicInfo.cityName
				self.playerService.updatePlayerAsync(basicPlayerInfo).then(function(doc){
					PushToPlayer.call(self, Events.player.onPlayerDataChanged, session, utils.filter(doc))
				}).catch(function(e){
					console.error(e)
				})
			}
		},
		{
			command:"gem",
			desc:"修改玩家宝石数量, 如: gem 2000 为修改玩家宝石数量为2000",
			callback:function(text, session, userDoc){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					userDoc.basicInfo.gem = count
					self.playerService.refreshPlayerResources(userDoc)
					self.playerService.updatePlayerAsync(userDoc).then(function(doc){
						PushToPlayer.call(self, Events.player.onPlayerDataChanged, session, utils.filter(doc))
					}).catch(function(e){
						console.error(e)
					})
				}
			}
		},
		{
			command:"rs",
			desc:"修改玩家资源数量, 如: rs 2000 为修改玩家所有资源数量为2000",
			callback:function(text, session, userDoc){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					userDoc.resources.wood = count
					userDoc.resources.stone = count
					userDoc.resources.iron = count
					userDoc.resources.food = count
					self.playerService.refreshPlayerResources(userDoc)
					self.playerService.updatePlayerAsync(userDoc).then(function(doc){
						PushToPlayer.call(self, Events.player.onPlayerDataChanged, session, utils.filter(doc))
					}).catch(function(e){
						console.error(e)
					})
				}
			}
		},
		{
			command:"citizen",
			desc:"修改玩家空闲居民数量, 如: citizen 2000 为修改玩家空闲居民数量为2000",
			callback:function(text, session, userDoc){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					userDoc.resources.citizen = count
					self.playerService.refreshPlayerResources(userDoc)
					self.playerService.updatePlayerAsync(userDoc).then(function(doc){
						PushToPlayer.call(self, Events.player.onPlayerDataChanged, session, utils.filter(doc))
					}).catch(function(e){
						console.error(e)
					})
				}
			}
		},
		{
			command:"coin",
			desc:"修改玩家银币数量, 如: coin 2000 为修改玩家银币数量为2000",
			callback:function(text, session, userDoc){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					userDoc.basicInfo.coin = count
					self.playerService.refreshPlayerResources(userDoc)
					self.playerService.updatePlayerAsync(userDoc).then(function(doc){
						PushToPlayer.call(self, Events.player.onPlayerDataChanged, session, utils.filter(doc))
					}).catch(function(e){
						console.error(e)
					})
				}
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

	this.playerService.getPlayerByIdAsync(session.uid).then(function(doc){
		var time = Date.now()
		var response = {
			fromId:doc._id,
			fromIcon:doc.basicInfo.icon,
			fromName:doc.basicInfo.name,
			fromVip:1,
			fromType:type,
			text:text,
			time:time
		}

		if(self.chats.length > self.maxChatCount){
			self.chats.shift()
		}
		self.chats.push(response)
		self.gloablChatChannel.pushMessage(Events.chat.onChat, response)

		FilterCommand.call(self, text, doc, session)
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

var FilterCommand = function(text, userDoc, session){
	if(_.isEqual("help", text)){
		PushHelpMessageToPlayer.call(this, session)
	}else{
		var callback = GetPlayerCommand.call(this, text)
		if(_.isFunction(callback)){
			callback.call(this, text, session, userDoc)
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
		fromIcon:"playerIcon_default.png",
		fromName:"系统",
		fromVip:1,
		fromType:"system",
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
	for(var i = 0; i < this.commands.length; i++){
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