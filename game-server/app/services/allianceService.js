"use strict"

/**
 * Created by modun on 14-10-28.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var MapUtils = require("../utils/mapUtils")
var FightUtils = require("../utils/fightUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")
var Localizations = require("../consts/localizations")


var AllianceService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceService
var pro = AllianceService.prototype


/**
 * 创建联盟
 * @param playerId
 * @param name
 * @param tag
 * @param language
 * @param terrain
 * @param flag
 * @param callback
 */
pro.createAlliance = function(playerId, name, tag, language, terrain, flag, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		callback(new Error("language 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		callback(new Error("terrain 不合法"))
		return
	}
	if(!_.isString(flag)){
		callback(new Error("flag 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceFinded = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入了联盟"))
		}
		var gemUsed = DataUtils.getGemByCreateAlliance()
		if(playerDoc.resources.gem < gemUsed){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		return Promise.resolve()
	}).then(function(){
		return self.allianceDao.findByIndexAsync("basicInfo.name", name)
	}).then(function(doc){
		if(_.isObject(doc)){
			allianceFinded = doc
			return Promise.reject(new Error("联盟名称已经存在"))
		}
		return self.allianceDao.findByIndexAsync("basicInfo.tag", tag)
	}).then(function(doc){
		if(_.isObject(doc)){
			allianceFinded = doc
			return Promise.reject(new Error("联盟标签已经存在"))
		}

		var alliance = {
			basicInfo:{
				name:name,
				tag:tag,
				language:language,
				terrain:terrain,
				flag:flag
			},
			members:[]
		}
		var mapObjects = MapUtils.create()
		alliance.mapObjects = mapObjects
		var villages = DataUtils.createMapVillages(mapObjects)
		alliance.villages = villages
		return self.allianceDao.createAsync(alliance)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟创建失败"))
		}
		allianceDoc = doc
		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Archon, memberRect)
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Archon,
			titleName:allianceDoc.titles.archon
		}
		var playerData = {}
		playerData.alliance = playerDoc.alliance
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, playerDoc, allianceDoc])
		playerData.alliance = playerDoc.alliance
		playerData.resources = playerDoc.resources
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceFinded)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceFinded._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 发送联盟邮件
 * @param playerId
 * @param title
 * @param content
 * @param callback
 */
pro.sendAllianceMail = function(playerId, title, content, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(title)){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(content)){
		callback(new Error("content 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDocs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "sendAllianceMail")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		var mailToPlayer = {
			id:ShortId.generate(),
			title:title,
			fromName:playerDoc.basicInfo.name,
			fromAllianceTag:(!!playerDoc.alliance && !!playerDoc.alliance.id) ? playerDoc.alliance.tag : "",
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
			fromAllianceTag:playerDoc.alliance.tag,
			content:content,
			sendTime:Date.now(),
			isRead:false,
			isSaved:false
		}
		var playerData = {}
		playerData.__sendMails = []
		if(playerDoc.sendMails.length >= Define.PlayerMailSendboxMessageMaxSize){
			var sendMail = playerDoc.sendMails.shift()
			playerData.__sendMails.push({
				type:Consts.DataChangedType.Remove,
				data:sendMail
			})
		}
		playerDoc.sendMails.push(mailToPlayer)
		playerData.__sendMails.push({
			type:Consts.DataChangedType.Add,
			data:mailToPlayer
		})

		playerData.__mails = []
		if(playerDoc.mails.length >= Define.PlayerMailInboxMessageMaxSize){
			var mail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
			LogicUtils.removeItemInArray(playerDoc.mails, mail)
			playerData.__mails.push({
				type:Consts.DataChangedType.Remove,
				data:mail
			})
			if(!!mail.isSaved){
				playerData.__savedMails = [{
					type:Consts.DataChangedType.Remove,
					data:mail
				}]
			}
		}
		playerDoc.mails.push(mailToMember)
		playerData.__mails.push({
			type:Consts.DataChangedType.Add,
			data:mailToMember
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		var sendMailToMember = function(member){
			return self.playerDao.findByIdAsync(member.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				memberDocs.push(doc)
				var docData = {}
				docData.__mails = []
				if(doc.mails.length >= Define.PlayerMailInboxMessageMaxSize){
					var mail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
					LogicUtils.removeItemInArray(playerDoc.mails, mail)
					docData.__mails.push({
						type:Consts.DataChangedType.Remove, data:mail
					})
					if(!!mail.isSaved){
						docData.__savedMails = [{
							type:Consts.DataChangedType.Remove, data:mail
						}]
					}
				}
				doc.mails.push(mailToMember)
				docData.__mails.push({
					type:Consts.DataChangedType.Add, data:mailToMember
				})
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
			}).catch(function(e){
				return Promise.reject(e)
			})
		}
		var funcs = []
		_.each(allianceDoc.members, function(member){
			if(!_.isEqual(member.id, playerDoc._id)){
				funcs.push(sendMailToMember(member))
			}
		})
		return Promise.all(funcs)
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		})
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 主动获取玩家联盟的信息
 * @param playerId
 * @param callback
 */
pro.getMyAllianceData = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, playerDoc, allianceDoc])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取能直接加入的联盟
 * @param playerId
 * @param callback
 */
pro.getCanDirectJoinAlliances = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.getModel().find({"basicInfo.joinType":Consts.AllianceJoinType.All}).sort({"basicInfo.power":-1}).limit(10).exec())
		return Promise.all(funcs)
	}).spread(function(tmp, docs){
		return self.pushService.onGetCanDirectJoinAlliancesSuccessAsync(playerDoc, docs)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			self.playerDao.removeLockByIdAsync(playerDoc._id).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 搜索联盟
 * @param playerId
 * @param tag
 * @param callback
 */
pro.searchAllianceByTag = function(playerId, tag, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.searchByIndexAsync("basicInfo.tag", tag))
		return Promise.all(funcs)
	}).spread(function(tmp, docs){
		return self.pushService.onSearchAlliancesSuccessAsync(playerDoc, docs)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			self.playerDao.removeLockByIdAsync(playerDoc._id).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 编辑联盟基础信息
 * @param playerId
 * @param name
 * @param tag
 * @param language
 * @param flag
 * @param callback
 */
pro.editAllianceBasicInfo = function(playerId, name, tag, language, flag, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		callback(new Error("language 不合法"))
		return
	}
	if(!_.isString(flag)){
		callback(new Error("flag 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceDocFinded = null
	var allianceMemberDocs = []
	var pushFuncs = []
	var updateFuncs = []
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceBasicInfo")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		var gemUsed = DataUtils.getEditAllianceBasicInfoGem()
		if(playerDoc.resources.gem < gemUsed){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(_.isEqual(allianceDoc.basicInfo.name, name)){
			return Promise.resolve(allianceDoc)
		}else{
			return self.allianceDao.findByIndexAsync("basicInfo.name", name)
		}
	}).then(function(doc){
		if(_.isObject(doc) && !_.isEqual(doc._id, allianceDoc._id)){
			allianceDocFinded = doc
			return Promise.reject(new Error("联盟名称已经存在"))
		}
		if(_.isEqual(allianceDoc.basicInfo.tag, tag)){
			return Promise.resolve(allianceDoc)
		}else{
			return self.allianceDao.findByIndexAsync("basicInfo.tag", tag)
		}
	}).then(function(doc){
		if(_.isObject(doc) && !_.isEqual(doc._id, allianceDoc._id)){
			allianceDocFinded = doc
			return Promise.reject(new Error("联盟标签已经存在"))
		}
		var isNameChanged = !_.isEqual(allianceDoc.basicInfo.name, name)
		var isTagChanged = !_.isEqual(allianceDoc.basicInfo.tag, tag)
		var isFlagChanged = !_.isEqual(allianceDoc.basicInfo.flag, flag)
		var isLanguageChanged = !_.isEqual(allianceDoc.basicInfo.language, language)
		allianceDoc.basicInfo.name = name
		allianceDoc.basicInfo.tag = tag
		allianceDoc.basicInfo.language = language
		allianceDoc.basicInfo.flag = flag
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])

		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.__events = []
		var event = null
		if(isNameChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Name, playerDoc.basicInfo.name, [allianceDoc.basicInfo.name])
			allianceData.__events.push({
				type:Consts.DataChangedType.Add,
				data:event
			})
		}
		if(isTagChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Tag, playerDoc.basicInfo.name, [allianceDoc.basicInfo.tag])
			allianceData.__events.push({
				type:Consts.DataChangedType.Add,
				data:event
			})
		}
		if(isFlagChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Flag, playerDoc.basicInfo.name, [allianceDoc.basicInfo.flag])
			allianceData.__events.push({
				type:Consts.DataChangedType.Add,
				data:event
			})
		}
		if(isLanguageChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Language, playerDoc.basicInfo.name, [allianceDoc.basicInfo.language])
			allianceData.__events.push({
				type:Consts.DataChangedType.Add,
				data:event
			})
		}
		var playerData = {}
		playerData.resources = playerDoc.resources
		if(isNameChanged || isTagChanged){
			playerDoc.alliance.name = name
			playerDoc.alliance.tag = tag
			playerData.alliance = playerDoc.alliance
		}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		if(isNameChanged || isTagChanged){
			var funcs = []
			var updateMember = function(member){
				return self.playerDao.findByIdAsync(member.id).then(function(doc){
					if(!_.isObject(doc)){
						return Promise.reject(new Error("玩家不存在"))
					}
					allianceMemberDocs.push(doc)
					doc.alliance.name = name
					doc.alliance.tag = tag
					var memberData = {}
					memberData.alliance = doc.alliance
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, memberData])
					return Promise.resolve()
				}).catch(function(e){
					return Promise.reject(e)
				})
			}
			_.each(allianceDoc.members, function(member){
				if(!_.isEqual(member.id, playerDoc._id)){
					funcs.push(updateMember(member))
				}
			})
			return Promise.all(funcs)
		}
		return Promise.resolve()
	}).then(function(){
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(allianceDocFinded)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDocFinded._id))
		}
		_.each(allianceMemberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		})
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 编辑联盟地形
 * @param playerId
 * @param terrain
 * @param callback
 */
pro.editAllianceTerrian = function(playerId, terrain, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		callback(new Error("terrain 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceTerrian")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])

		var honourUsed = DataUtils.getEditAllianceTerrianHonour()
		if(allianceDoc.basicInfo.honour < honourUsed){
			return Promise.reject(new Error("联盟荣耀值不足"))
		}
		allianceDoc.basicInfo.honour -= honourUsed
		allianceDoc.basicInfo.terrain = terrain
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Terrain, playerDoc.basicInfo.name, [allianceDoc.basicInfo.terrain])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 编辑职位名称
 * @param playerId
 * @param title
 * @param titleName
 * @param callback
 */
pro.editAllianceTitleName = function(playerId, title, titleName, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTitle, title)){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(titleName)){
		callback(new Error("titleName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceMemberDocs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceTitleName")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.titles[title] = titleName
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		if(_.isEqual(playerDoc.alliance.title, title)){
			playerDoc.alliance.titleName = titleName
			var playerData = {}
			playerData.alliance = playerDoc.alliance
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		}else{
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		}

		var updateMemberTitleName = function(member){
			return self.playerDao.findByIdAsync(member.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				allianceMemberDocs.push(doc)
				doc.alliance.titleName = titleName
				var memberData = {}
				memberData.alliance = doc.alliance
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, memberData])
				return Promise.resolve()
			}).catch(function(e){
				return Promise.reject(e)
			})
		}
		var funcs = []
		_.each(allianceDoc.members, function(member){
			if(_.isEqual(member.title, title) && !_.isEqual(member.id, playerDoc._id)){
				funcs.push(updateMemberTitleName(member))
			}
		})
		return Promise.all(funcs)
	}).then(function(){
		var allianceData = {}
		allianceData.titles = allianceDoc.titles
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(allianceMemberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		})
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 编辑联盟公告
 * @param playerId
 * @param notice
 * @param callback
 */
pro.editAllianceNotice = function(playerId, notice, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(notice)){
		callback(new Error("notice 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceNotice")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.notice = notice
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Notice, playerDoc.basicInfo.name, [])
		allianceData.notice = allianceDoc.notice
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 编辑联盟描述
 * @param playerId
 * @param description
 * @param callback
 */
pro.editAllianceDescription = function(playerId, description, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(description)){
		callback(new Error("description 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceDescription")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.desc = description
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Desc, playerDoc.basicInfo.name, [])
		allianceData.desc = allianceDoc.desc
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]

		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 编辑联盟加入方式
 * @param playerId
 * @param joinType
 * @param callback
 */
pro.editAllianceJoinType = function(playerId, joinType, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceJoinType, joinType)){
		callback(new Error("joinType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceJoinType")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.basicInfo.joinType = joinType
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 修改联盟某个玩家的职位
 * @param playerId
 * @param memberId
 * @param title
 * @param callback
 */
pro.editAllianceMemberTitle = function(playerId, memberId, title, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTitle, title)){
		callback(new Error("title 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能修改玩家自己的职位"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var memberInAllianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceMemberTitle")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)){
			return Promise.reject(new Error("联盟没有此玩家"))
		}
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerInAllianceDoc.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberInAllianceDoc.title)
		var afterMemberLevel = DataUtils.getAllianceTitleLevel(title)
		if(currentMemberLevel <= myMemberLevel){
			return Promise.reject(new Error("不能对职级高于或等于自己的玩家进行升级降级操作"))
		}
		if(afterMemberLevel <= myMemberLevel){
			return Promise.reject(new Error("不能将玩家的职级调整到与自己平级或者比自己高"))
		}
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		memberDoc.alliance.title = title
		memberDoc.alliance.titleName = allianceDoc.titles[title]
		memberInAllianceDoc.title = title
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Promotion, memberInAllianceDoc.name, [memberInAllianceDoc.title])
		var memberData = {}
		memberData.alliance = memberDoc.alliance
		var allianceData = {}
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:memberInAllianceDoc
		}]
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 将玩家踢出联盟
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.kickAllianceMemberOff = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能将自己踢出联盟"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var memberInAllianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceMemberTitle")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)){
			return Promise.reject(new Error("联盟没有此玩家"))
		}
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerInAllianceDoc.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberInAllianceDoc.title)
		if(currentMemberLevel <= myMemberLevel){
			return Promise.reject(new Error("不能将职级高于或等于自己的玩家踢出联盟"))
		}
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc

		var allianceData = {}
		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(memberId, event.id)
		})
		if(helpEvents.length > 0) allianceData.__helpEvents = []
		_.each(helpEvents, function(helpEvent){
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			allianceData.__helpEvents.push({
				type:Consts.DataChangedType.Remove,
				data:helpEvent
			})
		})

		memberDoc.alliance = null
		var memberData = {}
		memberData.alliance = {}
		LogicUtils.removeItemInArray(allianceDoc.members, memberInAllianceDoc)
		allianceData.__members = [{
			type:Consts.DataChangedType.Remove,
			data:memberInAllianceDoc
		}]
		var memberObjectInMap = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, memberInAllianceDoc.location)
		if(!_.isObject(memberObjectInMap)){
			return Promise.reject(new Error("玩家不在联盟地图中"))
		}
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, memberObjectInMap)
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Remove,
			data:memberObjectInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Kick, memberInAllianceDoc.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.globalChannelService, self.globalChannelService.leaveAsync, Consts.AllianceChannelPrefix + allianceDoc._id, memberDoc._id, memberDoc.logicServerId])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 移交盟主职位
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.handOverAllianceArchon = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能将盟主职位移交给自己"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var memberInAllianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!_.isEqual(playerDoc.alliance.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(new Error("别逗了,你是不盟主好么"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)){
			return Promise.reject(new Error("联盟没有此玩家"))
		}

		var allianceData = {}
		allianceData.__members = []
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		playerInAllianceDoc.title = Consts.AllianceTitle.Member
		allianceData.__members.push({
			type:Consts.DataChangedType.Edit,
			data:playerInAllianceDoc
		})
		playerDoc.alliance.title = Consts.AllianceTitle.Member
		playerDoc.alliance.titleName = allianceDoc.titles.member
		var playerData = {}
		playerData.alliance = playerDoc.alliance
		memberInAllianceDoc.title = Consts.AllianceTitle.Archon
		allianceData.__members.push({
			type:Consts.DataChangedType.Edit,
			data:memberInAllianceDoc
		})
		memberDoc.alliance.title = Consts.AllianceTitle.Archon
		memberDoc.alliance.titleName = allianceDoc.titles.archon
		var memberData = {}
		memberData.alliance = memberDoc.alliance
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, memberDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 退出联盟
 * @param playerId
 * @param callback
 */
pro.quitAlliance = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var playerDocInAlliance = null
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(_.isEqual(playerDoc.alliance.title, Consts.AllianceTitle.Archon) && allianceDoc.members.length > 1){
			return Promise.reject(new Error("别逗了,仅当联盟成员为空时,盟主才能退出联盟"))
		}

		var allianceData = {}
		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(playerId, event.id)
		})
		if(helpEvents.length > 0) allianceData.__helpEvents = []
		_.each(helpEvents, function(helpEvent){
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			allianceData.__helpEvents.push({
				type:Consts.DataChangedType.Remove,
				data:helpEvent
			})
		})
		playerDocInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		LogicUtils.removeItemInArray(allianceDoc.members, playerDocInAlliance)
		allianceData.__members = [{
			type:Consts.DataChangedType.Remove,
			data:playerDocInAlliance
		}]
		var playerObjectInMap = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, playerDocInAlliance.location)
		if(!_.isObject(playerObjectInMap)){
			return Promise.reject(new Error("玩家不在联盟地图中"))
		}
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, playerObjectInMap)
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Remove,
			data:playerObjectInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Quit, playerDocInAlliance.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		playerDoc.alliance = null
		var playerData = {}
		playerData.alliance = {}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		if(allianceDoc.members.length <= 0){
			updateFuncs.push([self.allianceDao, self.allianceDao.deleteByIdAsync, allianceDoc._id])
			updateFuncs.push([self.globalChannelService, self.globalChannelService.destroyChannelAsync, Consts.AllianceChannelPrefix + allianceDoc._id])
			eventFuncs.push([self.timeEventService, self.timeEventService.clearAllianceTimeEventsAsync, allianceDoc])
		}else{
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			updateFuncs.push([self.globalChannelService, self.globalChannelService.leaveAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		}
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 直接加入某联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.joinAllianceDirectly = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var inviterDocs = []
	var requestedAllianceDocs = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(!_.isEqual(doc.basicInfo.joinType, Consts.AllianceJoinType.All)){
			return Promise.reject(new Error("联盟不允许直接加入"))
		}

		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		var memberInAlliance = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberRect)
		var allianceData = {}
		allianceData.__members = [{
			type:Consts.DataChangedType.Add,
			data:memberInAlliance
		}]
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Add,
			data:memberObjInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		var playerData = {}
		playerData.alliance = playerDoc.alliance
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, playerDoc, allianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, playerDoc._id])

		var funcs = []
		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.resolve()
				}
				requestedAllianceDocs.push(doc)
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, playerId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.resolve()
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, doc])
				var docData = {}
				docData.__joinRequestEvents = [{
					type:Consts.DataChangedType.Remove,
					data:joinRequestEvent
				}]
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.requestToAllianceEvents = playerDoc.requestToAllianceEvents

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return self.playerDao.findByIdAsync(inviterId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				inviterDocs.push(doc)
				var docData = {}
				LogicUtils.sendSystemMail(doc, docData, titleKey, [], contentKey, [playerDoc.basicInfo.name])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.inviteToAllianceEvents = playerDoc.inviteToAllianceEvents

		return Promise.all(funcs)
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(requestedAllianceDocs, function(doc){
			funcs.push(self.allianceDao.removeLockByIdAsync(doc))
		})
		_.each(inviterDocs, function(doc){
			funcs.push(self.playerDao.removeLockByIdAsync(doc))
		})
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 申请加入联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.requestToJoinAlliance = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		if(playerDoc.requestToAllianceEvents.length >= Define.RequestJoinAllianceMessageMaxSize){
			return Promise.reject(new Error("联盟申请已满,请撤消部分申请后再来申请"))
		}
		if(LogicUtils.hasPendingRequestEventToAlliance(playerDoc, allianceId)){
			return Promise.reject(new Error("对此联盟的申请已发出,请耐心等候审核"))
		}
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(doc.joinRequestEvents.length >= Define.AllianceRequestMessageMaxSize){
			return Promise.reject(new Error("此联盟的申请信息已满,请等候其处理后再进行申请"))
		}

		var allianceData = {}
		var playerData = {}
		var requestTime = Date.now()
		var joinRequestEvent = LogicUtils.addAllianceRequestEvent(allianceDoc, playerDoc, requestTime)
		allianceData.__joinRequestEvents = [{
			type:Consts.DataChangedType.Add,
			data:joinRequestEvent
		}]
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Request, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		var requestToAllianceEvent = LogicUtils.addPlayerJoinAllianceEvent(playerDoc, allianceDoc, requestTime)
		playerData.__requestToAllianceEvents = [{
			type:Consts.DataChangedType.Add,
			data:requestToAllianceEvent
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 取消对某联盟的加入申请
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.cancelJoinAllianceRequest = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		var eventInPlayer = LogicUtils.getRequestToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(eventInPlayer)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		LogicUtils.removeItemInArray(playerDoc.requestToAllianceEvents, eventInPlayer)
		var playerData = {}
		playerData.__requestToAllianceEvents = [{
			type:Consts.DataChangedType.Remove,
			data:eventInPlayer
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.resolve()
		}
		allianceDoc = doc
		var eventInAlliance = LogicUtils.getPlayerRequestEventAtAlliance(allianceDoc, playerId)
		if(!_.isObject(eventInAlliance)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, eventInAlliance)
		var allianceData = {}
		allianceData.__joinRequestEvents = [{
			type:Consts.DataChangedType.Remove,
			data:eventInAlliance
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 处理加入联盟申请
 * @param playerId
 * @param memberId
 * @param agree
 * @param callback
 */
pro.handleJoinAllianceRequest = function(playerId, memberId, agree, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(!_.isBoolean(agree)){
		callback(new Error("agree 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能处理自己加入联盟的申请"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var requestedAllianceDocs = []
	var inviterDocs = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "handleJoinAllianceRequest")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		var eventInMember = LogicUtils.getRequestToAllianceEvent(memberDoc, allianceDoc._id)
		if(!_.isObject(eventInMember)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		var eventInAlliance = LogicUtils.getPlayerRequestEventAtAlliance(allianceDoc, memberId)
		if(!_.isObject(eventInAlliance)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		var memberData = {}
		var allianceData = {}
		LogicUtils.removeItemInArray(memberDoc.requestToAllianceEvents, eventInMember)
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, eventInAlliance)

		var titleKeyApproved = Localizations.Alliance.RequestApprovedTitle
		var titleKeyRejected = Localizations.Alliance.RequestRejectedTitle
		var contentKeyApproved = Localizations.Alliance.RequestApprovedContent
		var contentKeyRejected = Localizations.Alliance.RequestRejectedContent
		var titleKey = agree ? titleKeyApproved : titleKeyRejected
		var contentKey = agree ? contentKeyApproved : contentKeyRejected
		LogicUtils.sendSystemMail(memberDoc, memberData, titleKey, [], contentKey, [allianceDoc.basicInfo.name])

		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])

		allianceData.__joinRequestEvents = [{
			type:Consts.DataChangedType.Remove,
			data:eventInAlliance
		}]
		if(!agree){
			memberData.__requestToAllianceEvents = [{
				type:Consts.DataChangedType.Remove,
				data:eventInMember
			}]
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
			return Promise.resolve()
		}

		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		var memberInAlliance = LogicUtils.addAllianceMember(allianceDoc, memberDoc, Consts.AllianceTitle.Member, memberRect)
		allianceData.__members = [{
			type:Consts.DataChangedType.Add,
			data:memberInAlliance
		}]
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Add,
			data:memberObjInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, memberDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		if(!_.isEmpty(memberDoc.logicServerId)){
			updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, memberDoc._id, memberDoc.logicServerId])
		}

		memberDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		memberData.alliance = memberDoc.alliance
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, memberDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, memberDoc._id])
		var funcs = []
		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.resolve()
				}
				requestedAllianceDocs.push(doc)
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, memberId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.reject(new Error("玩家请求事件不存在"))
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				var docData = {}
				docData.__joinRequestEvents = [{
					type:Consts.DataChangedType.Remove,
					data:joinRequestEvent
				}]
				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(memberDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(memberDoc.requestToAllianceEvents)
		memberData.requestToAllianceEvents = memberDoc.requestToAllianceEvents

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return self.playerDao.findByIdAsync(inviterId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				inviterDocs.push(doc)
				var docData = {}
				LogicUtils.sendSystemMail(doc, docData, titleKey, [], contentKey, [memberDoc.basicInfo.name])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(memberDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(memberDoc.inviteToAllianceEvents)
		memberData.inviteToAllianceEvents = memberDoc.inviteToAllianceEvents

		return Promise.all(funcs)
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		_.each(requestedAllianceDocs, function(doc){
			funcs.push(self.allianceDao.removeLockByIdAsync(doc))
		})
		_.each(inviterDocs, function(doc){
			funcs.push(self.playerDao.removeLockByIdAsync(doc))
		})

		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 邀请玩家加入联盟
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.inviteToJoinAlliance = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能邀请自己加入联盟"))
		return
	}

	var self = this
	var playerDoc = null
	var memberDoc = null
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "inviteToJoinAlliance")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(playerDoc.alliance.id))
		funcs.push(self.playerDao.findByIdAsync(memberId))
		return Promise.all(funcs)
	}).spread(function(theAllianceDoc, theMemberDoc){
		if(!_.isObject(theAllianceDoc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = theAllianceDoc
		if(!_.isObject(theMemberDoc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = theMemberDoc
		if(_.isObject(theMemberDoc.alliance) && !_.isEmpty(theMemberDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		if(LogicUtils.hasInviteEventToAlliance(memberDoc, allianceDoc)){
			return Promise.reject(new Error("此玩家已被邀请加入我方联盟,请等候其处理"))
		}
		if(theMemberDoc.inviteToAllianceEvents.length >= Define.InviteJoinAllianceMessageMaxSize){
			return Promise.reject(new Error("此玩家的邀请信息已满,请等候其处理后再进行邀请"))
		}
		var inviteTime = Date.now()
		var memberData = {}
		var inviteToAllianceEvent = LogicUtils.addPlayerInviteAllianceEvent(playerDoc._id, memberDoc, allianceDoc, inviteTime)
		memberData.__inviteToAllianceEvents = [{
			type:Consts.DataChangedType.Add,
			data:inviteToAllianceEvent
		}]
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}
/**
 * 处理加入联盟邀请
 * @param playerId
 * @param allianceId
 * @param agree
 * @param callback
 */
pro.handleJoinAllianceInvite = function(playerId, allianceId, agree, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}
	if(!_.isBoolean(agree)){
		callback(new Error("agree 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var inviterDoc = null
	var inviteEvent = null
	var requestedAllianceDocs = []
	var inviterDocs = []
	var pushFuncs = []
	var updateFuncs = []
	var playerData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		var event = LogicUtils.getInviteToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(event)){
			return Promise.reject(new Error("邀请事件不存在"))
		}
		inviteEvent = event
		LogicUtils.removeItemInArray(playerDoc.inviteToAllianceEvents, inviteEvent)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		if(!agree){
			playerData.__inviteToAllianceEvents = [{
				type:Consts.DataChangedType.Remove,
				data:inviteEvent
			}]
		}

		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(allianceId))
		funcs.push(self.playerDao.findByIdAsync(inviteEvent.inviterId))
		return Promise.all(funcs)
	}).spread(function(theAllianceDoc, theInviterDoc){
		if(!_.isObject(theAllianceDoc)){
			if(!!agree) return Promise.reject(new Error("联盟不存在"))
			else return Promise.resolve()
		}
		allianceDoc = theAllianceDoc
		if(!_.isObject(theInviterDoc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		inviterDoc = theInviterDoc

		var titleKeyApproved = Localizations.Alliance.InviteApprovedTitle
		var titleKeyRejected = Localizations.Alliance.InviteRejectedTitle
		var contentKeyApproved = Localizations.Alliance.InviteApprovedContent
		var contentKeyRejected = Localizations.Alliance.InviteRejectedContent
		var titleKey = agree ? titleKeyApproved : titleKeyRejected
		var contentKey = agree ? contentKeyApproved : contentKeyRejected
		var inviterData = {}
		LogicUtils.sendSystemMail(inviterDoc, inviterData, titleKey, [], contentKey, [playerDoc.basicInfo.name])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, inviterDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, inviterDoc, inviterData])

		if(!agree){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			return Promise.resolve()
		}

		var allianceData = {}
		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		var memberInAlliance = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberRect)
		allianceData.__members = [{
			type:Consts.DataChangedType.Add,
			data:memberInAlliance
		}]
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Add,
			data:memberObjInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, playerDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, playerDoc._id])

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		playerData.alliance = playerDoc.alliance

		var funcs = []
		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.resolve()
				}
				requestedAllianceDocs.push(doc)
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, playerId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.reject(new Error("玩家请求事件不存在"))
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				var docData = {}
				docData.__joinRequestEvents = [{
					type:Consts.DataChangedType.Remove,
					data:joinRequestEvent
				}]
				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.requestToAllianceEvents = playerDoc.requestToAllianceEvents

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return self.playerDao.findByIdAsync(inviterId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				inviterDocs.push(doc)
				var docData = {}
				LogicUtils.sendSystemMail(doc, docData, titleKey, [], contentKey, [playerDoc.basicInfo.name])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.inviteToAllianceEvents = playerDoc.inviteToAllianceEvents

		return Promise.all(funcs)
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(requestedAllianceDocs, function(doc){
			funcs.push(self.allianceDao.removeLockByIdAsync(doc._id))
		})
		_.each(inviterDocs, function(doc){
			funcs.push(self.playerDao.removeLockByIdAsync(doc._id))
		})
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 盟主长时间不登录时,玩家可宝石购买盟主职位
 * @param playerId
 * @param callback
 */
pro.buyAllianceArchon = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var archonDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(_.isEqual(doc.alliance.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(new Error("玩家已经是盟主了"))
		}
		var gemUsed = DataUtils.getGemByBuyAllianceArchon()
		if(playerDoc.resources.gem < gemUsed){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var archonDocInAlliance = LogicUtils.getAllianceArchon(allianceDoc)
		var canBuyInterval = 0//1000 * 60 * 60 * 24 * 7 //7天
		if(archonDocInAlliance.lastLoginTime + canBuyInterval > Date.now()){
			return Promise.reject(new Error("盟主连续7天不登陆时才能购买盟主职位"))
		}
		return self.playerDao.findByIdAsync(archonDocInAlliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		archonDoc = doc

		var allianceData = {}
		allianceData.__members = []
		var archonDocInAlliance = LogicUtils.getAllianceArchon(allianceDoc)
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		playerInAllianceDoc.title = Consts.AllianceTitle.Archon
		allianceData.__members.push({
			type:Consts.DataChangedType.Edit,
			data:playerInAllianceDoc
		})
		playerDoc.alliance.title = Consts.AllianceTitle.Archon
		playerDoc.alliance.titleName = allianceDoc.titles.archon
		var playerData = {}
		playerData.alliance = playerDoc.alliance
		playerData.resources = playerDoc.resources
		archonDocInAlliance.title = Consts.AllianceTitle.Member
		allianceData.__members.push({
			type:Consts.DataChangedType.Edit,
			data:archonDocInAlliance
		})
		archonDoc.alliance.title = Consts.AllianceTitle.Member
		archonDoc.alliance.titleName = allianceDoc.titles.member
		var archonData = {}
		archonData.alliance = archonDoc.alliance
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, archonDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, archonDoc, archonData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 请求联盟成员协助加速
 * @param playerId
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.requestAllianceToSpeedUp = function(playerId, eventType, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceHelpEventType, eventType)){
		callback(new Error("eventType 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	var buildEvent = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		buildEvent = LogicUtils.getPlayerBuildEvent(playerDoc, eventType, eventId)
		if(!_.isObject(buildEvent)){
			return Promise.reject(new Error("玩家建造事件不存在"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, eventId)
		if(_.isObject(helpEvent)){
			return Promise.reject("此建筑已经发送了加速请求")
		}

		var building = LogicUtils.getBuildingByEventTypeAndBuildEvent(playerDoc, eventType, buildEvent)
		var buildingName = _.isEqual(eventType, Consts.AllianceHelpEventType.Wall) ? "wall" : _.isEqual(eventType, Consts.AllianceHelpEventType.Tower) ? "tower" : building.type
		var event = LogicUtils.addAllianceHelpEvent(allianceDoc, playerDoc, building.level + 1, eventType, buildingName, buildEvent.id)
		var allianceData = {}
		allianceData.__helpEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 协助联盟玩家加速
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.helpAllianceMemberSpeedUp = function(playerId, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var helpEvent = null
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, eventId)
		if(!_.isObject(helpEvent)){
			return Promise.reject("帮助事件不存在")
		}
		if(_.isEqual(playerDoc._id, helpEvent.id)){
			return Promise.reject(new Error("不能帮助自己加速建造"))
		}
		if(!!_.contains(helpEvent.helpedMembers, playerId)){
			return Promise.reject("玩家已经帮助过此事件了")
		}
		if(helpEvent.helpedMembers.length >= helpEvent.maxHelpCount){
			return Promise.reject("帮助事件已达到最大帮助次数")
		}
		return self.playerDao.findByIdAsync(helpEvent.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		var buildEvent = LogicUtils.getPlayerBuildEvent(memberDoc, helpEvent.helpEventType, helpEvent.eventId)
		if(!_.isObject(buildEvent)){
			return Promise.reject(new Error("玩家建造事件不存在"))
		}
		helpEvent.helpedMembers.push(playerDoc._id)
		var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc)
		var newFinishTime = buildEvent.finishTime - effect
		var memberData = {}
		var allianceData = {}
		if(newFinishTime <= Date.now()){
			eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, memberDoc, buildEvent.id])
			buildEvent.finishTime = newFinishTime
			var params = self.timeEventService.onPlayerEvent(memberDoc, null, helpEvent.helpEventType, helpEvent.eventId)
			pushFuncs = pushFuncs.concat(params.pushFuncs)
			_.extend(memberData, params.playerData)
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			allianceData.__helpEvents = [{
				type:Consts.DataChangedType.Remove,
				data:helpEvent
			}]
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		}else{
			eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, memberDoc, buildEvent.id, newFinishTime])
			buildEvent.finishTime = newFinishTime
			var eventsInfo = LogicUtils.getPlayerBuildEvents(memberDoc, helpEvent.helpEventType)
			_.extend(memberData, eventsInfo)
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
			allianceData.__helpEvents = [{
				type:Consts.DataChangedType.Edit,
				data:helpEvent
			}]
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		}
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 协助联盟所有玩家加速
 * @param playerId
 * @param callback
 */
pro.helpAllAllianceMemberSpeedUp = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = {}
	var memberDocs = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc

		allianceData.__helpEvents = []
		var speedUp = function(memberId, helpEvents){
			var needHelpedEvents = _.filter(helpEvents, function(helpEvent){
				return !_.contains(helpEvent.helpedMembers, playerId) && helpEvent.helpedMembers.length < helpEvent.maxHelpCount
			})
			if(needHelpedEvents.length <= 0) return Promise.resolve()
			return self.playerDao.findByIdAsync(memberId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				var memberDoc = doc
				var memberData = {}
				memberDocs.push(memberDoc)
				for(var i = 0; i < needHelpedEvents.length; i++){
					var helpEvent = needHelpedEvents[i]
					var buildEvent = LogicUtils.getPlayerBuildEvent(memberDoc, helpEvent.helpEventType, helpEvent.eventId)
					if(!_.isObject(buildEvent)){
						return Promise.reject(new Error("玩家建造事件不存在"))
					}
					helpEvent.helpedMembers.push(playerDoc._id)
					var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc)
					var newFinishTime = buildEvent.finishTime - effect
					if(newFinishTime <= Date.now()){
						eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, memberDoc, buildEvent.id])
						buildEvent.finishTime = newFinishTime
						var params = self.timeEventService.onPlayerEvent(memberDoc, null, helpEvent.helpEventType, helpEvent.eventId)
						pushFuncs = pushFuncs.concat(params.pushFuncs)
						_.extend(memberData, params.playerData)
						LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
						allianceData.__helpEvents.push({
							type:Consts.DataChangedType.Remove,
							data:helpEvent
						})
					}else{
						eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, memberDoc, buildEvent.id, newFinishTime])
						buildEvent.finishTime = newFinishTime
						var eventsInfo = LogicUtils.getPlayerBuildEvents(memberDoc, helpEvent.helpEventType)
						_.extend(memberData, eventsInfo)
						allianceData.__helpEvents.push({
							type:Consts.DataChangedType.Edit,
							data:helpEvent
						})
					}
				}
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
				return Promise.resolve()
			})
		}
		var funcs = []
		var memberIds = _.pluck(allianceDoc.helpEvents, "id")
		memberIds = _.uniq(memberIds)
		_.each(memberIds, function(memberId){
			var events = _.filter(allianceDoc.helpEvents, function(event){
				return _.isEqual(event.id, memberId)
			})
			if(!_.isEqual(playerDoc._id, memberId)){
				funcs.push(speedUp(memberId, events))
			}
		})
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		return Promise.all(funcs)
	}).then(function(){
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		})
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 联盟捐赠
 * @param playerId
 * @param donateType
 * @param callback
 */
pro.donateToAlliance = function(playerId, donateType, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.hasAllianceDonateType(donateType)){
		callback(new Error("donateType "))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var memberDocInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		var donateLevel = LogicUtils.getAllianceMemberDonateLevelByType(memberDocInAlliance, donateType)
		var donateConfig = DataUtils.getAllianceDonateConfigByTypeAndLevel(donateType, donateLevel)
		LogicUtils.refreshPlayerResources(playerDoc)
		if(playerDoc.resources[donateType] < donateConfig.count){
			return Promise.reject(new Error("资源不足"))
		}
		playerDoc.resources[donateType] -= donateConfig.count
		LogicUtils.refreshPlayerResources(playerDoc)

		playerDoc.allianceInfo.loyalty += donateConfig.loyalty * (1 + donateConfig.extra)
		allianceDoc.basicInfo.honour += donateConfig.honour * (1 + donateConfig.extra)
		memberDocInAlliance.loyalty = playerDoc.allianceInfo.loyalty
		DataUtils.updateAllianceMemberDonateLevel(memberDocInAlliance, donateType)
		var playerData = {}
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData.allianceInfo = playerDoc.allianceInfo
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:memberDocInAlliance
		}]
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 升级联盟建筑
 * @param playerId
 * @param buildingName
 * @param callback
 */
pro.upgradeAllianceBuilding = function(playerId, buildingName, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceBuildingNames, buildingName)){
		callback(new Error("buildingName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "upgradeAllianceBuilding")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var building = allianceDoc.buildings[buildingName]
		var keepLevel = playerDoc.buildings["location_1"].level
		var upgradeRequired = DataUtils.getAllianceBuildingUpgradeRequired(buildingName, building.level + 1)
		if(upgradeRequired.keepLevel > keepLevel){
			return Promise.reject(new Error("盟主城堡等级不足"))
		}
		if(upgradeRequired.honour > allianceDoc.basicInfo.honour){
			return Promise.reject(new Error("联盟荣耀值不足"))
		}
		if(DataUtils.isAllianceBuildingReachMaxLevel(buildingName, building.level)){
			return Promise.reject(new Error("建筑已达到最高等级"))
		}
		allianceDoc.basicInfo.honour -= upgradeRequired.honour
		if(_.isEqual("shrine", buildingName)) LogicUtils.refreshAlliancePerception(allianceDoc)
		building.level += 1
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.buildings = {}
		allianceData.buildings[buildingName] = allianceDoc.buildings[buildingName]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 升级联盟村落
 * @param playerId
 * @param villageType
 * @param callback
 */
pro.upgradeAllianceVillage = function(playerId, villageType, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isAllianceVillageTypeLegal(villageType)){
		callback(new Error("villageType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "upgradeAllianceVillage")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var villageLevel = allianceDoc.villageLevels[villageType]
		var upgradeRequired = DataUtils.getAllianceVillageUpgradeRequired(villageType, villageLevel)
		if(upgradeRequired.honour > allianceDoc.basicInfo.honour){
			return Promise.reject(new Error("联盟荣耀值不足"))
		}
		if(DataUtils.isAllianceVillageReachMaxLevel(villageType, villageLevel)){
			return Promise.reject(new Error("村落已达到最高等级"))
		}
		allianceDoc.basicInfo.honour -= upgradeRequired.honour
		allianceDoc.villageLevels[villageType] += 1
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.villageLevels = {}
		allianceData.villageLevels[villageType] = allianceDoc.villageLevels[villageType]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 移动联盟建筑到新的位置
 * @param playerId
 * @param buildingName
 * @param locationX
 * @param locationY
 * @param callback
 */
pro.moveAllianceBuilding = function(playerId, buildingName, locationX, locationY, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceBuildingNames, buildingName)){
		callback(new Error("buildingName 不合法"))
		return
	}
	if(!_.isNumber(locationX) || locationX % 1 !== 0){
		callback(new Error("locationX 不合法"))
	}
	if(!_.isNumber(locationY) || locationY % 1 !== 0){
		callback(new Error("locationY 不合法"))
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "moveAllianceBuilding")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var building = allianceDoc.buildings[buildingName]
		var buildingObjectInMap = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, building.location)
		var moveBuildingRequired = DataUtils.getAllianceMoveBuildingRequired(buildingName, building.level)
		if(allianceDoc.basicInfo.honour < moveBuildingRequired.honour) return Promise.reject(new Error("联盟荣耀值不足"))
		var mapObjects = allianceDoc.mapObjects
		var buildingSizeInMap = DataUtils.getSizeInAllianceMap("building")
		var oldRect = {
			x:building.location.x,
			y:building.location.y,
			width:buildingSizeInMap.width,
			height:buildingSizeInMap.height
		}
		var newRect = {x:locationX, y:locationY, width:buildingSizeInMap.width, height:buildingSizeInMap.height}
		var map = MapUtils.buildMap(mapObjects)
		if(!MapUtils.isRectLegal(map, newRect, oldRect)) return Promise.reject(new Error("不能移动到目标点位"))
		building.location = {x:newRect.x, y:newRect.y}
		buildingObjectInMap.location = {x:newRect.x, y:newRect.y}
		allianceDoc.basicInfo.honour -= moveBuildingRequired.honour
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Edit,
			data:buildingObjectInMap
		}]
		allianceData.buildings = {}
		allianceData.buildings[buildingName] = allianceDoc.buildings[buildingName]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 移动玩家城市到新的位置
 * @param playerId
 * @param locationX
 * @param locationY
 * @param callback
 */
pro.moveAllianceMember = function(playerId, locationX, locationY, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(locationX) || locationX % 1 !== 0){
		callback(new Error("locationX 不合法"))
	}
	if(!_.isNumber(locationY) || locationY % 1 !== 0){
		callback(new Error("locationY 不合法"))
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	var moveBuildingRequired = {gem:50}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(playerDoc.resources.gem < moveBuildingRequired.gem) return Promise.reject(new Error("宝石不足"))
		playerDoc.resources.gem -= moveBuildingRequired.gem
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		var playerData = {}
		playerData.resources = playerDoc.resources
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var playerDocInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
		var playerObjectInMap = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, playerDocInAlliance.location)
		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var oldRect = {
			x:playerDocInAlliance.location.x,
			y:playerDocInAlliance.location.y,
			width:memberSizeInMap.width,
			height:memberSizeInMap.height
		}
		var newRect = {x:locationX, y:locationY, width:memberSizeInMap.width, height:memberSizeInMap.height}
		var map = MapUtils.buildMap(mapObjects)
		if(!MapUtils.isRectLegal(map, newRect, oldRect)) return Promise.reject(new Error("不能移动到目标点位"))
		playerDocInAlliance.location = {x:newRect.x, y:newRect.y}
		playerObjectInMap.location = {x:newRect.x, y:newRect.y}
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Edit,
			data:playerObjectInMap
		}]
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:playerDocInAlliance
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 拆除装饰物
 * @param playerId
 * @param decorateId
 * @param callback
 */
pro.distroyAllianceDecorate = function(playerId, decorateId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(decorateId)){
		callback(new Error("decorateId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "distroyAllianceDecorate")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var decorateObject = LogicUtils.getAllianceMapObjectById(allianceDoc, decorateId)
		if(!DataUtils.isAllianceMapObjectTypeADecorateObject(decorateObject.type)) return Promise.reject(new Error("只能拆除装饰物"))
		var distroyRequired = DataUtils.getAllianceDistroyDecorateRequired(decorateObject.type)
		if(allianceDoc.basicInfo.honour < distroyRequired.honour) return Promise.reject(new Error("联盟荣耀值不足"))
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, decorateObject)
		allianceDoc.basicInfo.honour -= distroyRequired.honour
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Remove,
			data:decorateObject
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 激活联盟圣地事件
 * @param playerId
 * @param stageName
 * @param callback
 */
pro.activateAllianceShrineStage = function(playerId, stageName, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isAllianceShrineStageNameLegal(stageName)){
		callback(new Error("stageName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "activateAllianceShrineStage")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(LogicUtils.isAllianceShrineStageActivated(allianceDoc, stageName)) return Promise.reject(new Error("此联盟事件已经激活"))
		var activeStageRequired = DataUtils.getAllianceActiveShrineStageRequired(stageName)
		LogicUtils.refreshAlliancePerception(allianceDoc)
		if(allianceDoc.basicInfo.perception < activeStageRequired.perception) return Promise.reject(new Error("联盟感知力不足"))
		allianceDoc.basicInfo.perception -= activeStageRequired.perception
		var event = DataUtils.createAllianceShrineStageEvent(stageName)
		allianceDoc.shrineEvents.push(event)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "shrineEvents", event.id, event.startTime])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		allianceData.__shrineEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 行军到圣地
 * @param playerId
 * @param shrineEventId
 * @param dragonType
 * @param soldiers
 * @param callback
 */
pro.marchToShrine = function(playerId, shrineEventId, dragonType, soldiers, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(shrineEventId)){
		callback(new Error("shrineEventId 不合法"))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var playerData = {}
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		dragon.status = Consts.DragonStatus.March
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
		if(!LogicUtils.isMarchSoldierLegal(playerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		_.each(soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.soldiers = {}
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var shrineEvent = LogicUtils.getEventById(allianceDoc.shrineEvents, shrineEventId)
		if(!_.isObject(shrineEvent)) return Promise.reject(new Error("此关卡还未激活"))
		if(DataUtils.isAllianceShrineStageLocked(allianceDoc, shrineEvent.stageName)) return Promise.reject(new Error("此关卡还未解锁"))
		if(LogicUtils.isPlayerHasTroopMarchToAllianceShrineStage(allianceDoc, shrineEvent, playerId)) return Promise.reject(new Error("玩家已经对此关卡派出了部队"))
		var event = LogicUtils.createAllianceShrineMarchEvent(playerDoc, allianceDoc, shrineEventId, dragonType, soldiers)
		allianceDoc.shrineMarchEvents.push(event)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "shrineMarchEvents", event.id, event.arriveTime])
		allianceData.__shrineMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 查找合适的联盟进行战斗
 * @param playerId
 * @param callback
 */
pro.findAllianceToFight = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackAllianceDoc = null
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "findAllianceToFight")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		attackAllianceDoc = doc
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promose.reject(new Error("联盟正在战争准备期或战争期"))
		}
		return self.allianceDao.getModel().findOne({
			"_id":{$ne:attackAllianceDoc._id},
			"basicInfo.status":Consts.AllianceStatus.Peace
			//"basicInfo.power":{$gte:attackAllianceDoc.basicInfo.power * 0.8, $lt:attackAllianceDoc.basicInfo.power * 1.2}
		}).exec()
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("未能找到战力相匹配的联盟"))
		return self.allianceDao.findByIdAsync(doc._id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		defenceAllianceDoc = doc
		var now = Date.now()
		var finishTime = now + DataUtils.getAllianceFightPrepareTime()
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime])
		var attackAllianceData = {}
		attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
		attackAllianceData.moonGateData = attackAllianceDoc.moonGateData
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		var defenceAllianceData = {}
		defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo
		defenceAllianceData.moonGateData = defenceAllianceDoc.moonGateData
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 行军到月门
 * @param playerId
 * @param dragonType
 * @param soldiers
 * @param callback
 */
pro.marchToMoonGate = function(playerId, dragonType, soldiers, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var playerData = {}
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		dragon.status = Consts.DragonStatus.March
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
		if(!LogicUtils.isMarchSoldierLegal(playerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		_.each(soldiers, function(soldier){
			soldier.star = 1
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.soldiers = {}
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Peace) || _.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			return Promose.reject(new Error("联盟正在和平期或保护期"))
		}
		if(LogicUtils.isPlayerHasTroopMarchToMoonGate(allianceDoc, playerId)) return Promise.reject(new Error("玩家已经对月门派出了部队"))
		var event = LogicUtils.createAllianceMoonGateMarchEvent(playerDoc, allianceDoc, dragonType, soldiers)
		allianceDoc.moonGateMarchEvents.push(event)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "moonGateMarchEvents", event.id, event.arriveTime])
		allianceData.__moonGateMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 从月门撤兵
 * @param playerId
 * @param callback
 */
pro.retreatFromMoonGate = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var ourAllianceDoc = null
	var enemyAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var ourAllianceData = {}
	var enemyAllianceData = {}
	var playerTroopInOurAlliance = null
	var playerTroopInEnemyAlliance = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		ourAllianceDoc = doc
		if(_.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace) || _.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			return Promose.reject(new Error("联盟正在和平期或保护期"))
		}
		playerTroopInOurAlliance = LogicUtils.getPlayerTroopInOurMoonGate(ourAllianceDoc, playerId)
		if(!_.isObject(playerTroopInOurAlliance)) return Promise.reject(new Error("玩家没有部队驻扎在月门"))
		LogicUtils.removeItemInArray(ourAllianceDoc.moonGateData.ourTroops, playerTroopInOurAlliance)
		ourAllianceData.moonGateData = {}
		ourAllianceData.moonGateData.__ourTroops = [{
			type:Consts.DataChangedType.Remove,
			data:playerTroopInOurAlliance
		}]
		return self.allianceDao.findByIdAsync(ourAllianceDoc.moonGateData.enemyAlliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		enemyAllianceDoc = doc
		playerTroopInEnemyAlliance = LogicUtils.getPlayerTroopInEnemyMoonGate(enemyAllianceDoc, playerId)
		LogicUtils.removeItemInArray(enemyAllianceDoc.moonGateData.enemyTroops, playerTroopInEnemyAlliance)
		enemyAllianceData.moonGateData = {}
		enemyAllianceData.moonGateData.__enemyTroops = [{
			type:Consts.DataChangedType.Remove,
			data:playerTroopInEnemyAlliance
		}]

		var treatSoldiers = playerTroopInOurAlliance.treatSoldiers
		var leftSoldiers = playerTroopInOurAlliance.soldiers
		var rewards = playerTroopInOurAlliance.rewards
		var kill = playerTroopInOurAlliance.kill
		var dragon = playerTroopInOurAlliance.dragon
		var marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(playerDoc, ourAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
		ourAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
		ourAllianceData.__moonGateMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:marchReturnEvent
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, ourAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, ourAllianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(ourAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(ourAllianceDoc._id))
		}
		if(_.isObject(enemyAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(enemyAllianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 联盟战月门挑战
 * @param playerId
 * @param callback
 */
pro.challengeMoonGateEnemyTroop = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var ourPlayerDoc = null
	var enemyPlayerDoc = null
	var ourPlayerData = {}
	var enemyPlayerData = {}
	var ourAllianceDoc = null
	var enemyAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var ourAllianceData = {}
	ourAllianceData.moonGateData = {}
	var enemyAllianceData = {}
	enemyAllianceData.moonGateData = {}
	var ourTroop = null
	var enemyTroop = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		ourPlayerDoc = doc
		if(!_.isObject(ourPlayerDoc.alliance) || _.isEmpty(ourPlayerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(ourPlayerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		ourAllianceDoc = doc
		if(!_.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟未处于战争期"))
		}
		ourTroop = LogicUtils.getPlayerTroopInOurMoonGate(ourAllianceDoc, playerId)
		if(!_.isObject(ourTroop)) return Promise.reject(new Error("玩家没有部队驻扎在月门"))
		if(!_.isArray(ourAllianceDoc.moonGateData.enemyTroops) || ourAllianceDoc.moonGateData.enemyTroops.length == 0){
			return Promise.reject(new Error("你脑壳被门夹了啊,敌对方没得部队驻扎在月门"))
		}
		var enemyTroops = ourAllianceDoc.moonGateData.enemyTroops
		enemyTroop = enemyTroops[(Math.random() * enemyTroops.length) << 0]
		var funcs = []
		funcs.push(self.playerDao.findByIdAsync(enemyTroop.id))
		funcs.push(self.allianceDao.findByIdAsync(ourAllianceDoc.moonGateData.enemyAlliance.id))
		return Promise.all(funcs)
	}).spread(function(doc1, doc2){
		if(!_.isObject(doc1)) return Promise.reject(new Error("玩家不存在"))
		if(!_.isObject(doc2)) return Promise.reject(new Error("联盟不存在"))
		enemyPlayerDoc = doc1
		enemyAllianceDoc = doc2

		var ourFightReport = {
			ourPlayerId:ourTroop.id,
			ourPlayerName:ourTroop.name,
			enemyPlayerId:enemyTroop.id,
			enemyPlayerName:enemyTroop.name
		}
		var enemyFightReport = {
			ourPlayerId:enemyTroop.id,
			ourPlayerName:enemyTroop.name,
			enemyPlayerId:ourTroop.id,
			enemyPlayerName:ourTroop.name
		}
		if(!_.isObject(ourAllianceDoc.moonGateData.fightReports)){
			ourAllianceDoc.moonGateData.fightReports = []
			enemyAllianceDoc.moonGateData.fightReports = []
		}
		ourAllianceDoc.moonGateData.fightReports.push(ourFightReport)
		enemyAllianceDoc.moonGateData.fightReports.push(enemyFightReport)
		ourAllianceData.__fightReports = [{
			type:Consts.DataChangedType.Add,
			data:ourFightReport
		}]
		enemyAllianceData.__fightReports = [{
			type:Consts.DataChangedType.Add,
			data:enemyFightReport
		}]

		var ourDragonType = ourTroop.dragon.type
		var ourDragonForFight = {
			type:ourTroop.dragon.type,
			strength:ourPlayerDoc.dragons[ourDragonType].strength,
			vitality:ourPlayerDoc.dragons[ourDragonType].vitality,
			hp:ourPlayerDoc.dragons[ourDragonType].hp
		}
		var enemyDragonType = enemyTroop.dragon.type
		var enemyDragonForFight = {
			type:enemyTroop.dragon.type,
			strength:enemyPlayerDoc.dragons[enemyDragonType].strength,
			vitality:enemyPlayerDoc.dragons[enemyDragonType].vitality,
			hp:enemyPlayerDoc.dragons[enemyDragonType].hp
		}
		var dragonFightResult = FightUtils.dragonToDragonFight(ourDragonForFight, enemyDragonForFight)
		var ourDragonHpDecreased = null
		var enemyDragonHpDecreased = null
		if(_.isEqual(ourAllianceDoc._id, ourAllianceDoc.moonGateData.activeBy)){
			ourDragonHpDecreased = dragonFightResult.attackDragonHpDecreased
			enemyDragonHpDecreased = dragonFightResult.defenceDragonHpDecreased
		}else{
			ourDragonHpDecreased = dragonFightResult.defenceDragonHpDecreased
			enemyDragonHpDecreased = dragonFightResult.attackDragonHpDecreased
		}
		var ourDragonHp = ourPlayerDoc.dragons[ourDragonType].hp
		var enemyDragonHp = enemyPlayerDoc.dragons[enemyDragonType].hp
		ourFightReport.ourDragonFightData = {
			type:ourDragonType,
			hp:ourDragonHp,
			hpDecreased:ourDragonHpDecreased
		}
		ourFightReport.enemyDragonFightData = {
			type:enemyDragonType,
			hp:enemyDragonHp,
			hpDecreased:enemyDragonHpDecreased
		}
		enemyFightReport.ourDragonFightData = ourFightReport.enemyDragonFightData
		enemyFightReport.enemyDragonFightData = ourFightReport.ourDragonFightData

		ourPlayerDoc.dragons[ourDragonType].hp = ourDragonHp - ourDragonHpDecreased
		enemyPlayerDoc.dragons[enemyDragonType].hp = enemyDragonHp - enemyDragonHpDecreased
		ourPlayerData.dragons = {}
		ourPlayerData.dragons[ourDragonType] = ourPlayerDoc.dragons[ourDragonType]
		enemyPlayerData.dragons = {}
		enemyPlayerData.dragons[enemyDragonType] = enemyPlayerDoc.dragons[enemyDragonType]

		var ourSoldiersForFight = []
		_.each(ourTroop.soldiers, function(soldier){
			if(DataUtils.hasNormalSoldier(soldier.name)){
				ourSoldiersForFight.push(DataUtils.createNormalSoldierForFight(ourPlayerDoc, soldier.name, 1, soldier.count))
			}else{
				ourSoldiersForFight.push(DataUtils.createSpecialSoldierForFight(ourPlayerDoc, soldier.name, soldier.count))
			}
		})
		ourSoldiersForFight = _.sortBy(ourSoldiersForFight, function(soldier){
			return -(soldier.power * soldier.totalCount)
		})
		var enemySoldiersForFight = []
		_.each(enemyTroop.soldiers, function(soldier){
			if(DataUtils.hasNormalSoldier(soldier.name)){
				enemySoldiersForFight.push(DataUtils.createNormalSoldierForFight(enemyPlayerDoc, soldier.name, 1, soldier.count))
			}else{
				enemySoldiersForFight.push(DataUtils.createSpecialSoldierForFight(enemyPlayerDoc, soldier.name, soldier.count))
			}
		})
		enemySoldiersForFight = _.sortBy(enemySoldiersForFight, function(soldier){
			return -(soldier.power * soldier.totalCount)
		})

		var ourTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(ourPlayerDoc)
		var enemyTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(enemyPlayerDoc)
		var soldierFightResult = null
		if(_.isEqual(ourAllianceDoc.moonGateData.activeBy, ourAllianceDoc._id)){
			soldierFightResult = FightUtils.soldierToSoldierFight(ourSoldiersForFight, ourTreatSoldierPercent, enemySoldiersForFight, enemyTreatSoldierPercent)
			DataUtils.updateAllianceFightCurrentTroops(ourTroop, enemyTroop, soldierFightResult)
			ourFightReport.ourSoldierRoundDatas = soldierFightResult.attackRoundDatas
			ourFightReport.enemySoldierRoundDatas = soldierFightResult.defenceRoundDatas
			enemyFightReport.ourSoldierRoundDatas = soldierFightResult.defenceRoundDatas
			enemyFightReport.enemySoldierRoundDatas = soldierFightResult.attackRoundDatas
		}else{
			soldierFightResult = FightUtils.soldierToSoldierFight(enemySoldiersForFight, enemyTreatSoldierPercent, ourSoldiersForFight, ourTreatSoldierPercent)
			DataUtils.updateAllianceFightCurrentTroops(enemyTroop, ourTroop, soldierFightResult)
			ourFightReport.ourSoldierRoundDatas = soldierFightResult.defenceRoundDatas
			ourFightReport.enemySoldierRoundDatas = soldierFightResult.attackRoundDatas
			enemyFightReport.ourSoldierRoundDatas = soldierFightResult.attackRoundDatas
			enemyFightReport.enemySoldierRoundDatas = soldierFightResult.defenceRoundDatas
		}

		if(_.isEqual(ourAllianceDoc.moonGateData.activeBy, ourAllianceDoc._id)){
			ourFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.OurWin : Consts.AllianceFightResult.EnemyWin
			enemyFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.EnemyWin : Consts.AllianceFightResult.OurWin
		}else{
			ourFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.EnemyWin : Consts.AllianceFightResult.OurWin
			enemyFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.OurWin : Consts.AllianceFightResult.EnemyWin
		}

		var treatSoldiers = null
		var leftSoldiers = null
		var rewards = null
		var kill = null
		var dragon = null
		var marchReturnEvent = null
		enemyAllianceDoc.moonGateData.ourTroops = ourAllianceDoc.moonGateData.enemyTroops
		enemyAllianceDoc.moonGateData.enemyTroops = ourAllianceDoc.moonGateData.ourTroops
		if(_.isEqual(Consts.AllianceFightResult.OurWin, ourFightReport.fightResult)){
			LogicUtils.removeItemInArray(ourAllianceDoc.moonGateData.enemyTroops, enemyTroop)
			ourAllianceData.moonGateData.__enemyTroops = [{
				type:Consts.DataChangedType.Remove,
				data:enemyTroop
			}]
			enemyAllianceData.moonGateData.__ourTroops = ourAllianceData.moonGateData.__enemyTroops

			treatSoldiers = enemyTroop.treatSoldiers
			leftSoldiers = enemyTroop.soldiers
			rewards = enemyTroop.rewards
			kill = enemyTroop.kill
			dragon = enemyTroop.dragon
			marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(enemyPlayerDoc, enemyAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
			enemyAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
			enemyAllianceData.__moonGateMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, enemyAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		}else{
			LogicUtils.removeItemInArray(ourAllianceDoc.moonGateData.ourTroops, ourTroop)
			ourAllianceData.moonGateData.__ourTroops = [{
				type:Consts.DataChangedType.Remove,
				data:ourTroop
			}]
			enemyAllianceData.moonGateData.__enemyTroops = ourAllianceData.moonGateData.__ourTroops

			treatSoldiers = ourTroop.treatSoldiers
			leftSoldiers = ourTroop.soldiers
			rewards = ourTroop.rewards
			kill = ourTroop.kill
			dragon = ourTroop.dragon
			marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(ourPlayerDoc, ourAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
			ourAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
			ourAllianceData.__moonGateMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, ourAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, ourPlayerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, enemyPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, ourPlayerDoc, ourPlayerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, enemyPlayerDoc, enemyPlayerData])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, ourAllianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(ourPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(ourPlayerDoc._id))
		}
		if(_.isObject(enemyPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(enemyPlayerDoc._id))
		}
		if(_.isObject(ourAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(ourAllianceDoc._id))
		}
		if(_.isObject(enemyAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(enemyAllianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取联盟简单数据
 * @param playerId
 * @param targetAllianceId
 * @param callback
 */
pro.getAllianceViewData = function(playerId, targetAllianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(targetAllianceId)){
		callback(new Error("targetAllianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		return self.allianceDao.findByIdAsync(targetAllianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceViewDataSuccessAsync, playerDoc, allianceDoc])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取玩家简单数据
 * @param playerId
 * @param targetPlayerId
 * @param callback
 */
pro.getPlayerViewData = function(playerId, targetPlayerId, callback){

}

/**
 * 到达指定时间时,触发的消息
 * @param allianceId
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.onTimeEvent = function(allianceId, eventType, eventId, callback){
	var self = this
	var allianceDoc = null
	var event = null
	var pushFuncs = []
	var updateFuncs = []
	var eventFuncs = []
	this.allianceDao.findByIdAsync(allianceId, true).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		if(_.isEqual(eventType, Consts.AllianceStatusEvent)){
			allianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
			allianceDoc.basicInfo.statusStartTime = Date.now()
			allianceDoc.basicInfo.statusFinishTime = 0
			allianceDoc.moonGateData = null
			var allianceData = {}
			allianceData.basicInfo = allianceDoc.basicInfo
			allianceData.moonGateData = {}
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
			return Promise.resolve()
		}else{
			event = LogicUtils.getEventById(allianceDoc[eventType], eventId)
			if(!_.isObject(event)){
				return Promise.reject(new Error("联盟事件不存在"))
			}
			var timeEventFuncName = "on" + eventType.charAt(0).toUpperCase() + eventType.slice(1) + "Async"
			if(!_.isObject(self.timeEventService[timeEventFuncName])) return Promise.reject(new Error("未知的事件类型"))
			return self.timeEventService[timeEventFuncName](allianceDoc, event).then(function(params){
				updateFuncs = updateFuncs.concat(params.updateFuncs)
				eventFuncs = eventFuncs.concat(params.eventFuncs)
				pushFuncs = pushFuncs.concat(params.pushFuncs)
				return Promise.resolve()
			})
		}
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 到达指定时间时,联盟战斗触发的消息
 * @param ourAllianceId
 * @param enemyAllianceId
 * @param callback
 */
pro.onFightTimeEvent = function(ourAllianceId, enemyAllianceId, callback){
	var self = this
	var attackAllianceDoc = null
	var defenceAllianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	var eventFuncs = []
	var funcs = []
	funcs.push(this.allianceDao.findByIdAsync(ourAllianceId, true))
	funcs.push(this.allianceDao.findByIdAsync(enemyAllianceId, true))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)){
			return Promise.reject(new Error("联盟不存在"))
		}
		attackAllianceDoc = doc_1
		if(!_.isObject(doc_2)){
			return Promise.reject(new Error("联盟不存在"))
		}
		defenceAllianceDoc = doc_2
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare)){
			return self.timeEventService.onAllianceFightPrepareAsync(attackAllianceDoc, defenceAllianceDoc)
		}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && attackAllianceDoc.basicInfo.statusFinishTime > Date.now()){
			return self.timeEventService.onAllianceFightFightingAsync(attackAllianceDoc, defenceAllianceDoc)
		}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && attackAllianceDoc.basicInfo.statusFinishTime <= Date.now()){
			return self.timeEventService.onAllianceFightFightFinishedAsync(attackAllianceDoc, defenceAllianceDoc)
		}else{
			return Promise.reject(new Error("非法的联盟状态"))
		}
	}).then(function(params){
		updateFuncs = updateFuncs.concat(params.updateFuncs)
		eventFuncs = eventFuncs.concat(params.eventFuncs)
		pushFuncs = pushFuncs.concat(params.pushFuncs)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}