"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")

module.exports = function(app){
	return new ChatHandler(app)
}

var ChatHandler = function(app){
	this.app = app
	this.playerService = app.get("playerService")
	this.channelService = app.get("channelService")
	this.globalChatChannel = this.channelService.getChannel(Consts.GloablChatChannelName)
	this.chats = []
	this.maxChatCount = 50
	this.commands = [
		{
			command:"reset",
			desc:"重置玩家数据",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.reset(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"gem",
			desc:"修改玩家宝石数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.gem(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"rs",
			desc:"修改玩家资源数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.rs(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"citizen",
			desc:"修改玩家空闲居民数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.citizen(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"coin",
			desc:"修改玩家银币数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.coin(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"energy",
			desc:"修改玩家能量数据",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.energy(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"blood",
			desc:"修改玩家英雄之血的数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.blood(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"building",
			desc:"修改玩家银币数量",
			func:function(session, uid, text, callback){
				var self = this
				var level = text.split(" ")[1]
				level = parseInt(level)
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.building(session, uid, level, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"keep",
			desc:"修改玩家城堡等级",
			func:function(session, uid, text, callback){
				var self = this
				var level = text.split(" ")[1]
				level = parseInt(level)
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.keep(session, uid, level, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"rmbuildingevents",
			desc:"删除所有建筑的升级事件",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.rmbuildingevents(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"rmmaterialevents",
			desc:"清除材料制造事件",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.rmmaterialevents(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"kickme",
			desc:"将自己踢出服务器",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.kickme(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"material",
			desc:"统一修改玩家材料数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.material(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"soldiermaterial",
			desc:"统一修改玩家招募特殊兵种材料数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.soldiermaterial(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"rmsoldierevents",
			desc:"清除士兵招募事件",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.rmsoldierevents(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"dragonmaterial",
			desc:"统一修改玩家制作龙装备的材料数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.dragonmaterial(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"dragonequipment",
			desc:"统一修改玩家龙装备的数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.dragonequipment(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"rmdragonequipmentevents",
			desc:"清除龙装备制造事件",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.rmdragonequipmentevents(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"addtreatsoldiers",
			desc:"设置伤兵数量",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.addtreatsoldiers(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"rmtreatsoldierevents",
			desc:"清除士兵治疗事件",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.rmtreatsoldierevents(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"dragonvitality",
			desc:"修改指定龙的活力",
			func:function(session, uid, text, callback){
				var self = this
				var dragonType = text.split(" ")[1]
				var count = text.split(" ")[2]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.dragonvitality(session, uid, dragonType, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"dragonskill",
			desc:"设置龙的技能的等级",
			func:function(session, uid, text, callback){
				var self = this
				var dragonType = text.split(" ")[1]
				var level = text.split(" ")[2]
				level = parseInt(level)
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.dragonskill(session, uid, dragonType, level, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"dragonequipmentstar",
			desc:"设置龙装备的星级",
			func:function(session, uid, text, callback){
				var self = this
				var dragonType = text.split(" ")[1]
				var star = text.split(" ")[2]
				star = parseInt(star)
				if(_.isNumber(star)){
					self.app.rpc.logic.commandRemote.dragonequipmentstar(session, uid, dragonType, star, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"dragonstar",
			desc:"设置龙的星级",
			func:function(session, uid, text, callback){
				var self = this
				var dragonType = text.split(" ")[1]
				var star = text.split(" ")[2]
				star = parseInt(star)
				if(_.isNumber(star)){
					self.app.rpc.logic.commandRemote.dragonstar(session, uid, dragonType, star, function(e){
						callback(e)
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
	if(_.isEmpty(type) || _.isEmpty(type.trim())){
		var e = new Error("type 不能为空")
		next(e, {code:500, message:e.message})
	}

	var filterCommand = Promise.promisify(FilterCommand, this)
	this.playerService.getPlayerByIdAsync(session.uid).then(function(doc){
		return filterCommand(doc, text, session)
	}).then(function(doc){
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
		self.globalChatChannel.pushMessage(Events.chat.onChat, response)
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

var FilterCommand = function(playerDoc, chatText, session, callback){
	chatText = chatText.toLowerCase()
	if(_.isEqual("help", chatText)){
		PushHelpMessageToPlayer.call(this, session)
		callback(null, playerDoc)
	}else{
		var func = GetPlayerCommand.call(this, chatText)
		if(_.isFunction(func)){
			func.call(this, session, session.uid, chatText, function(e){
				callback(e, playerDoc)
			})
		}else{
			callback(null, playerDoc)
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
			return value.func
		}
	}

	return null
}

var PushToPlayer = function(event, session, msg){
	this.channelService.pushMessageByUids(event, msg, [
		{uid:session.uid, sid:session.get("logicServerId")}
	])
}