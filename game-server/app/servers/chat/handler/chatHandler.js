"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")
var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app){
	return new ChatHandler(app)
}

var ChatHandler = function(app){
	this.app = app
	this.channelService = app.get("channelService")
	this.chatChannel = this.channelService.getChannel(Consts.GlobalChatChannel, false)
	this.logService = app.get("logService")
	this.chats = []
	this.allianceChats = {}
	this.allianceFightChats = {}
	this.maxChatCount = 50
	this.maxAllianceChatCount = 50
	this.maxAllianceFightChatCount = 50
	this.commands = [
		{
			command:"resources",
			desc:"修改玩家资源数量:resources wood 5",
			func:function(session, uid, text, callback){
				var self = this
				var params = text.split(" ")
				var name = params[1]
				var count = parseInt(params[2])
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.resources(session, uid, name, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"buildinglevel",
			desc:"修改建筑等级:buildinglevel 1 5",
			func:function(session, uid, text, callback){
				var self = this
				var params = text.split(" ")
				var location = parseInt(params[1])
				var level = parseInt(params[2])
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.buildinglevel(session, uid, location, level, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"rmevents",
			desc:"清除玩家事件:rmevents vipEvents",
			func:function(session, uid, text, callback){
				var self = this
				var eventType = text.split(" ")[1]
				self.app.rpc.logic.commandRemote.rmevents(session, uid, eventType, function(e){
					callback(e)
				})
			}
		},
		{
			command:"material",
			desc:"统一修改玩家材料数量 material 5",
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
			desc:"统一修改玩家招募特殊兵种材料数量:soldiermaterial 5",
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
			command:"dragonmaterial",
			desc:"统一修改玩家制作龙装备的材料数量:dragonmaterial 5",
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
			desc:"统一修改玩家龙装备的数量:dragonequipment 5",
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
			command:"soldiers",
			desc:"设置士兵数量:soldiers 5",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.soldiers(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"woundedsoldiers",
			desc:"设置伤兵数量:woundedsoldiers 5",
			func:function(session, uid, text, callback){
				var self = this
				var count = text.split(" ")[1]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.woundedsoldiers(session, uid, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"dragonhp",
			desc:"修改指定龙的Hp:dragonhp redDragon 5",
			func:function(session, uid, text, callback){
				var self = this
				var dragonType = text.split(" ")[1]
				var count = text.split(" ")[2]
				count = parseInt(count)
				if(_.isNumber(count)){
					self.app.rpc.logic.commandRemote.dragonhp(session, uid, dragonType, count, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"dragonskill",
			desc:"设置龙的技能的等级:dragonskill redDragon 5",
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
			desc:"设置龙装备的星级:dragonequipmentstar redDragon 5",
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
			desc:"设置龙的星级:dragonstar redDragon 5",
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
		},
		{
			command:"dragonlevel",
			desc:"设置龙的等级:dragonlevel redDragon 5",
			func:function(session, uid, text, callback){
				var self = this
				var dragonType = text.split(" ")[1]
				var level = text.split(" ")[2]
				level = parseInt(level)
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.dragonlevel(session, uid, dragonType, level, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"donatelevel",
			desc:"设置捐赠级别:donatelevel 1  (1 - 6)",
			func:function(session, uid, text, callback){
				var self = this
				var donatelevel = text.split(" ")[1]
				donatelevel = parseInt(donatelevel)
				if(_.isNumber(donatelevel) && donatelevel >= 1 && donatelevel <= 6){
					self.app.rpc.logic.commandRemote.donatelevel(session, uid, donatelevel, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"alliancehonour",
			desc:"设置联盟荣耀:alliancehonour 500",
			func:function(session, uid, text, callback){
				var self = this
				var honour = text.split(" ")[1]
				honour = parseInt(honour)
				if(_.isNumber(honour)){
					self.app.rpc.logic.commandRemote.alliancehonour(session, uid, honour, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"allianceperception",
			desc:"设置联盟感知力:allianceperception 500",
			func:function(session, uid, text, callback){
				var self = this
				var perception = text.split(" ")[1]
				perception = parseInt(perception)
				if(_.isNumber(perception)){
					self.app.rpc.logic.commandRemote.allianceperception(session, uid, perception, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"playerlevel",
			desc:"设置玩家等级:playerlevel 5",
			func:function(session, uid, text, callback){
				var self = this
				var level = text.split(" ")[1]
				level = parseInt(level)
				if(_.isNumber(level)){
					self.app.rpc.logic.commandRemote.playerlevel(session, uid, level, function(e){
						callback(e)
					})
				}
			}
		},
		{
			command:"cleargc",
			desc:"清除所有玩家GCId",
			func:function(session, uid, text, callback){
				var self = this
				self.app.rpc.logic.commandRemote.cleargc(session, uid, function(e){
					callback(e)
				})
			}
		},
		{
			command:"alliancefight",
			desc:"开启联盟战:alliancefight 目标联盟Id",
			func:function(session, uid, text, callback){
				var self = this
				var defenceAllianceId = text.split(" ")[1]
				self.app.rpc.logic.commandRemote.alliancefight(session, uid, defenceAllianceId, function(e){
					callback(e)
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
	this.logService.onRequest("chat.chatHandler.send", {playerId:session.uid, msg:msg})
	var self = this
	var text = msg.text
	var channel = msg.channel
	var e = null
	if(!_.isString(text) || _.isEmpty(text.trim())){
		e = new Error("text 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.ChannelType, channel)){
		e = new Error("channel 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	var allianceId = session.get("allianceId")
	if(_.isEqual(Consts.ChannelType.Alliance, channel) && _.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	var allianceFights = this.app.get('allianceFights')
	if(_.isEqual(Consts.ChannelType.AllianceFight, channel)){
		if(_.isEmpty(allianceId)){
			e = ErrorUtils.playerNotJoinAlliance(session.uid)
			next(e, ErrorUtils.getError(e))
			return
		}
		if(!_.isObject(allianceFights) || _.isEmpty(allianceFights[allianceId])){
			e = ErrorUtils.allianceNotInFightStatus(session.uid, allianceId)
			next(e, ErrorUtils.getError(e))
			return
		}
	}

	var name = session.get("name")
	var icon = session.get("icon")
	var vipExp = session.get("vipExp")

	var filterCommand = Promise.promisify(FilterCommand, this)
	filterCommand(text, session).then(function(){
		var response = {
			id:session.uid,
			icon:session.get("icon"),
			name:session.get("name"),
			vip:session.get("vipExp"),
			allianceId:session.get("allianceId"),
			allianceTag:session.get("allianceTag"),
			channel:channel,
			text:text,
			time:Date.now()
		}
		if(_.isEqual(Consts.ChannelType.Global, channel)){
			if(self.chats.length > self.maxChatCount){
				self.chats.shift()
			}
			self.chats.push(response)
			self.chatChannel.pushMessage(Events.chat.onChat, response, {}, null)
		}else if(_.isEqual(Consts.ChannelType.Alliance, channel)){
			if(!_.isArray(self.allianceChats[allianceId])) self.allianceChats[allianceId] = []
			if(self.allianceChats[allianceId].length > self.maxAllianceChatCount){
				self.allianceChats[allianceId].shift()
			}
			self.allianceChats[allianceId].push(response)
			var allianceChannel = self.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
			if(_.isObject(allianceChannel))
				allianceChannel.pushMessage(Events.chat.onChat, response, {}, null)
		}else if(_.isEqual(Consts.ChannelType.AllianceFight, channel)){
			var allianceFightKey = allianceFightKey[allianceId]
			if(self.allianceFightChats[allianceFightKey].length > self.maxAllianceFightChatCount){
				self.allianceFightChats.shift()
			}
			self.allianceFightChats[allianceFightKey].push(response)
			var allianceIdKeys = allianceFightKey.split('_')
			var attackAllianceId = allianceIdKeys[0]
			var defenceAllianceId = allianceIdKeys[1]
			var attackAllianceChannel = self.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + attackAllianceId, false)
			var defenceAllianceChannel = self.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + defenceAllianceId, false)
			if(_.isObject(attackAllianceChannel))
				attackAllianceChannel.pushMessage(Events.chat.onChat, response, {}, null)
			if(_.isObject(defenceAllianceChannel))
				defenceAllianceChannel.pushMessage(Events.chat.onChat, response, {}, null)
		}
		return Promise.resolve()
	}).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取所有聊天信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAll = function(msg, session, next){
	this.logService.onRequest("chat.chatHandler.getAll", {playerId:session.uid, msg:msg})
	var channel = msg.channel
	var e = null
	if(!_.contains(Consts.ChannelType, channel)){
		e = new Error("channel 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	var allianceId = session.get("allianceId")
	if(_.isEqual(Consts.ChannelType.Alliance, channel) && _.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	var allianceFights = this.app.get('allianceFights')
	if(_.isEqual(Consts.ChannelType.AllianceFight, channel)){
		if(_.isEmpty(allianceId)){
			e = ErrorUtils.playerNotJoinAlliance(session.uid)
			next(e, ErrorUtils.getError(e))
			return
		}
		if(!_.isObject(allianceFights) || _.isEmpty(allianceFights[allianceId])){
			e = ErrorUtils.allianceNotInFightStatus(session.uid, allianceId)
			next(e, ErrorUtils.getError(e))
			return
		}
	}

	var chats = null
	if(_.isEqual(Consts.ChannelType.Global, channel)) chats = this.chats
	else if(_.isEqual(Consts.ChannelType.Alliance, channel)) chats = this.allianceChats[allianceId]
	else if(_.isEqual(Consts.ChannelType.AllianceFight, channel)) chats = this.allianceFightChats[allianceFights[allianceId]]

	next(null, {code:200, chats:chats})
}

/**
 * 过滤秘技
 * @param chatText
 * @param session
 * @param callback
 */
var FilterCommand = function(chatText, session, callback){
	//callback()

	if(_.isEqual("help", chatText)){
		PushHelpMessageToPlayer.call(this, session)
		callback()
	}else{
		var func = GetPlayerCommand.call(this, chatText)
		if(_.isFunction(func)){
			func.call(this, session, session.uid, chatText, function(e){
				callback(e)
			})
		}else{
			callback()
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
		fromVip:0,
		fromChannel:"system",
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
	command = command.toLowerCase()
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
	], {}, null)
}