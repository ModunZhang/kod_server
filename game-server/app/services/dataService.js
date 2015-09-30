"use strict"

/**
 * Created by modun on 15/3/6.
 */
var _ = require("underscore")
var Promise = require("bluebird")
var ShortId = require('shortid')
var sprintf = require("sprintf")

var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var DataUtils = require("../utils/dataUtils")
var Define = require("../consts/define")
var Consts = require("../consts/consts")

var DataService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.cacheServerId = app.get("cacheServerId")
	this.chatServerId = app.get("chatServerId")
	this.cacheService = app.get('cacheService')
	this.pushService = app.get('pushService')
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(this.cacheService.addToAllianceChannelAsync, allianceId, playerDoc._id, playerDoc.logicServerId);
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("cache.dataService.addPlayerToAllianceChannel", {
			allianceId:allianceId,
			playerId:playerDoc._id
		}, e.stack)
	})
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(this.cacheService.removeFromAllianceChannelAsync, allianceId, playerDoc._id, playerDoc.logicServerId);
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("cache.dataService.removePlayerFromAllianceChannel", {
			allianceId:allianceId,
			playerId:playerDoc._id
		}, e.stack)
	})
	callback()
}

/**
 * 删除联盟频道
 * @param allianceId
 * @param callback
 */
pro.destroyAllianceChannel = function(allianceId, callback){
	var self = this;
	var funcs = [];
	var distroyChatAllianceChannel = function(){
		return new Promise(function(resolve, reject){
			self.app.rpc.chat.chatRemote.destroyAllianceChannel.toServer(self.chatServerId, allianceId, function(e){
				if(!!e) return reject(e);
				resolve();
			})
		});
	}
	funcs.push(distroyChatAllianceChannel);
	funcs.push(self.cacheService.destroyAllianceChannelAsync(allianceId))
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("cache.dataService.destroyAllianceChannel", {
			allianceId:allianceId
		}, e.stack)
	})
	callback()
}

/**
 * 将玩家添加到所有频道中
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToChannels = function(playerDoc, callback){
	var self = this
	var addToChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToChatChannel.toServer, this)
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId, this.cacheServerId));
	if(_.isString(playerDoc.allianceId)){
		funcs.push(addToChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(this.cacheService.addToAllianceChannelAsync, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId);
	}
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("cache.dataService.addPlayerToChannels", {playerId:playerDoc._id}, e.stack)
	})
	callback()
}

/**
 * 将玩家从所有频道中移除
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromChannels = function(playerDoc, callback){
	var self = this
	var removeFromChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromChatChannel.toServer, this)
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId, this.cacheServerId));
	if(_.isString(playerDoc.allianceId)){
		funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(this.cacheService.removeFromAllianceChannelAsync, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId);
		funcs.push(this.cacheService.removeFromViewedMapIndexChannelAsync, playerDoc._id, playerDoc.logicServerId);
	}
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("cache.dataService.removePlayerFromChannels", {playerId:playerDoc._id}, e.stack)
	})
	callback()
}

/**
 * 创建联盟对战频道
 * @param attackAllianceId
 * @param defenceAllianceId
 * @param callback
 */
pro.createAllianceFightChannel = function(attackAllianceId, defenceAllianceId, callback){
	var self = this
	var createAllianceFightChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.createAllianceFightChannel.toServer, this)
	createAllianceFightChannelAsync(this.chatServerId, attackAllianceId, defenceAllianceId).catch(function(e){
		self.logService.onEventError("cache.dataService.createAllianceFightChannel", {
			attackAllianceId:attackAllianceId,
			defenceAllianceId:defenceAllianceId
		}, e.stack)
	})
	callback()
}

/**
 * 删除战频道移除
 * @param attackAllianceId
 * @param defenceAllianceId
 * @param callback
 */
pro.deleteAllianceFightChannel = function(attackAllianceId, defenceAllianceId, callback){
	var self = this
	var deleteAllianceFightChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.deleteAllianceFightChannel.toServer, this)
	deleteAllianceFightChannelAsync(this.chatServerId, attackAllianceId, defenceAllianceId).catch(function(e){
		self.logService.onEventError("cache.dataService.deleteAllianceFightChannel", {
			attackAllianceId:attackAllianceId,
			defenceAllianceId:defenceAllianceId
		}, e.stack)
	})
	callback()
}

/**
 * 更新玩家session信息
 * @param playerDoc
 * @param params
 * @param callback
 */
pro.updatePlayerSession = function(playerDoc, params, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback()
		return
	}
	var self = this
	this.app.rpc.logic.logicRemote.updatePlayerSession.toServer(playerDoc.logicServerId, playerDoc._id, params, function(e){
		if(_.isObject(e)){
			self.logService.onEventError("cache.dataService.updatePlayerSession", {
				playerId:playerDoc._id,
				keys:keys,
				values:values
			}, e.stack)
		}
	})
	callback()
}

/**
 * 玩家是否在线
 * @param playerDoc
 * @param callback
 */
pro.isPlayerOnline = function(playerDoc, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback(null, false)
		return
	}
	this.app.rpc.logic.logicRemote.isPlayerOnline.toServer(playerDoc.logicServerId, playerDoc._id, callback)
}

/**
 * 为玩家添加系统邮件
 * @param id
 * @param titleKey
 * @param titleArgs
 * @param contentKey
 * @param contentArgs
 * @param callback
 */
pro.sendSysMail = function(id, titleKey, titleArgs, contentKey, contentArgs, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id).then(function(doc){
		playerDoc = doc
		var language = playerDoc.basicInfo.language
		var title = titleKey[language]
		var content = contentKey[language]
		if(!_.isString(title)){
			title = titleKey.en
		}
		if(!_.isString(content)){
			content = contentKey.en
		}
		if(titleArgs.length > 0){
			title = sprintf.vsprintf(title, titleArgs)
		}
		if(contentArgs.length > 0){
			content = sprintf.vsprintf(content, contentArgs)
		}

		var mail = {
			id:ShortId.generate(),
			title:title,
			fromId:"__system",
			fromName:"__system",
			fromIcon:0,
			fromAllianceTag:"",
			sendTime:Date.now(),
			content:content,
			rewards:[],
			rewardGetted:false,
			isRead:false,
			isSaved:false
		}

		while(playerDoc.mails.length >= Define.PlayerMailsMaxSize){
			(function(){
				var willRemovedMail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
				playerData.push(["mails." + playerDoc.mails.indexOf(willRemovedMail), null])
				LogicUtils.removeItemInArray(playerDoc.mails, willRemovedMail)
			})();
		}
		playerDoc.mails.push(mail)
		playerData.push(["mails." + playerDoc.mails.indexOf(mail), mail])
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 为玩家添加战报
 * @param id
 * @param report
 * @param callback
 */
pro.sendSysReport = function(id, report, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id).then(function(doc){
		playerDoc = doc
		while(playerDoc.reports.length >= Define.PlayerReportsMaxSize){
			(function(){
				var willRemovedReport = LogicUtils.getPlayerFirstUnSavedReport(playerDoc)
				playerData.push(["reports." + playerDoc.reports.indexOf(willRemovedReport), null])
				LogicUtils.removeItemInArray(playerDoc.reports, willRemovedReport)
			})();
		}
		playerDoc.reports.push(report)
		playerData.push(["reports." + playerDoc.reports.indexOf(report), report])
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 发送联盟邮件
 * @param id
 * @param allianceId
 * @param title
 * @param content
 * @param callback
 */
pro.sendAllianceMail = function(id, allianceId, title, content, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var memberDocs = []
	var memberDatas = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(id).then(function(doc){
		playerDoc = doc
		return self.cacheService.directFindAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, id)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "sendAllianceMail"))
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(id, allianceId, "sendAllianceMail"));

		var funcs = []
		_.each(allianceDoc.members, function(member){
			if(!_.isEqual(member.id, id))
				funcs.push(self.cacheService.findPlayerAsync(member.id))
		})
		return Promise.all(funcs)
	}).then(function(docs){
		memberDocs = docs

		var mailToPlayer = {
			id:ShortId.generate(),
			title:title,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:allianceDoc.basicInfo.tag,
			toId:"__allianceMembers",
			toName:"__allianceMembers",
			content:content,
			sendTime:Date.now()
		}
		var mailToMember = {
			id:ShortId.generate(),
			title:title,
			fromId:playerDoc._id,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:allianceDoc.basicInfo.tag,
			content:content,
			sendTime:Date.now(),
			rewards:[],
			rewardGetted:false,
			isRead:false,
			isSaved:false
		}

		while(playerDoc.sendMails.length >= Define.PlayerSendMailsMaxSize){
			(function(){
				playerDoc.sendMails.shift()
				playerData.push(["sendMails.0", null])
			})();
		}
		playerDoc.sendMails.push(mailToPlayer)
		playerData.push(["sendMails." + playerDoc.sendMails.indexOf(mailToPlayer), mailToPlayer])

		if(playerDoc.mails.length >= Define.PlayerMailsMaxSize){
			var mail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
			playerData.push(["mails." + playerDoc.mails.indexOf(mail), null])
			LogicUtils.removeItemInArray(playerDoc.mails, mail)
		}
		playerDoc.mails.push(mailToMember)
		playerData.push(["mails." + playerDoc.mails.indexOf(mailToMember), mailToMember])
		updateFuncs.push(self.cacheService.updatePlayerAsync(id, playerDoc))

		_.each(memberDocs, function(memberDoc){
			var memberData = {}
			memberData.doc = {_id:memberDoc._id, logicServerId:memberDoc.logicServerId}
			memberData.data = []
			while(memberDoc.mails.length >= Define.PlayerMailsMaxSize){
				(function(){
					var mail = LogicUtils.getPlayerFirstUnSavedMail(memberDoc)
					memberData.data.push(["mails." + memberDoc.mails.indexOf(mail), null])
					LogicUtils.removeItemInArray(memberDoc.mails, mail)
				})();
			}
			memberDoc.mails.push(mailToMember)
			memberData.data.push(["mails." + memberDoc.mails.indexOf(mailToMember), mailToMember])
			memberDatas.push(memberData)
			updateFuncs.push(self.cacheService.updatePlayerAsync(memberDoc._id, memberDoc))
		})
		return Promise.all(updateFuncs)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		_.each(memberDatas, function(memberData){
			self.pushService.onPlayerDataChangedAsync(memberData.doc, memberData.data)
		})
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
		})
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}