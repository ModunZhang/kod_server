"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

module.exports = function(app){
	return new ChatHandler(app)
}

var ChatHandler = function(app){
	this.app = app
	this.channelService = this.app.get("channelService")
	this.globalChannel = this.channelService.getChannel(Consts.GloablChatChannelName)
	this.chats = []
	this.maxChatCount = 50
	this.commands = [
		{
			command:"reset",
			desc:"重置玩家数据",
			callback:function(session, uid){
				var self = this
				self.app.rpc.logic.commandRemote.reset(session, uid, function(e){
					if(_.isObject(e)){
						errorLogger.error("handle TextCommand Error-----------------------------")
						errorLogger.error(e.stack)
						if(_.isEqual("production", self.app.get("env"))){
							errorLogger.error("handle TextCommand Error-----------------------------")
							errorMailLogger.error(e.stack)
						}
					}
				})
			}
		},
		{
			command:"gem",
			desc:"修改玩家宝石数量, 如: gem 2000 为修改玩家宝石数量为2000",
			callback:function(session, uid, text){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.gem(session, uid, count, function(e){
						if(_.isObject(e)){
							errorLogger.error("handle TextCommand Error-----------------------------")
							errorLogger.error(e.stack)
							if(_.isEqual("production", self.app.get("env"))){
								errorLogger.error("handle TextCommand Error-----------------------------")
								errorMailLogger.error(e.stack)
							}
						}
					})
				}
			}
		},
		{
			command:"rs",
			desc:"修改玩家资源数量, 如: rs 2000 为修改玩家所有资源数量为2000",
			callback:function(session, uid, text){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.rs(session, uid, count, function(e){
						if(_.isObject(e)){
							errorLogger.error("handle TextCommand Error-----------------------------")
							errorLogger.error(e.stack)
							if(_.isEqual("production", self.app.get("env"))){
								errorLogger.error("handle TextCommand Error-----------------------------")
								errorMailLogger.error(e.stack)
							}
						}
					})
				}
			}
		},
		{
			command:"citizen",
			desc:"修改玩家空闲居民数量, 如: citizen 2000 为修改玩家空闲居民数量为2000",
			callback:function(session, uid, text){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.citizen(session, uid, count, function(e){
						if(_.isObject(e)){
							errorLogger.error("handle TextCommand Error-----------------------------")
							errorLogger.error(e.stack)
							if(_.isEqual("production", self.app.get("env"))){
								errorLogger.error("handle TextCommand Error-----------------------------")
								errorMailLogger.error(e.stack)
							}
						}
					})
				}
			}
		},
		{
			command:"coin",
			desc:"修改玩家银币数量, 如: coin 2000 为修改玩家银币数量为2000",
			callback:function(session, uid, text){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.coin(session, uid, count, function(e){
						if(_.isObject(e)){
							errorLogger.error("handle TextCommand Error-----------------------------")
							errorLogger.error(e.stack)
							if(_.isEqual("production", self.app.get("env"))){
								errorLogger.error("handle TextCommand Error-----------------------------")
								errorMailLogger.error(e.stack)
							}
						}
					})
				}
			}
		},
		{
			command:"building",
			desc:"修改玩家银币数量, 如: building 5 为修改玩家所有玩家建筑等级为5级",
			callback:function(session, uid, text){
				var self = this
				var level = text.split(" ")[1]
				level = parseInt(level)
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.building(session, uid, level, function(e){
						if(_.isObject(e)){
							errorLogger.error("handle TextCommand Error-----------------------------")
							errorLogger.error(e.stack)
							if(_.isEqual("production", self.app.get("env"))){
								errorLogger.error("handle TextCommand Error-----------------------------")
								errorMailLogger.error(e.stack)
							}
						}
					})
				}
			}
		},
		{
			command:"keep",
			desc:"修改玩家城堡等级, 如: keep 5 为修改玩家城堡等级为5级",
			callback:function(session, uid, text){
				var self = this
				var level = text.split(" ")[1]
				level = parseInt(level)
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.keep(session, uid, level, function(e){
						if(_.isObject(e)){
							errorLogger.error("handle TextCommand Error-----------------------------")
							errorLogger.error(e.stack)
							if(_.isEqual("production", self.app.get("env"))){
								errorLogger.error("handle TextCommand Error-----------------------------")
								errorMailLogger.error(e.stack)
							}
						}
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
		var e = new Error("聊天内容不能为空")
		next(e, {code:500, message:e.message})
	}

	var getPlayerInfo = Promise.promisify(this.app.rpc.logic.logicRemote.getPlayerInfo, this)
	getPlayerInfo(session, session.uid).then(function(doc){
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
		self.globalChannel.pushMessage(Events.chat.onChat, response)

		FilterCommand.call(self, doc, text, session)
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

var FilterCommand = function(playerDoc, chatText, session){
	if(_.isEqual("help", chatText)){
		PushHelpMessageToPlayer.call(this, session)
	}else{
		var callback = GetPlayerCommand.call(this, chatText)
		if(_.isFunction(callback)){
			callback.call(this, session, session.uid, chatText)
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
		{uid:session.uid, sid:session.get("frontServerId")}
	])
}