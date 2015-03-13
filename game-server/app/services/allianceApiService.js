"use strict"

/**
 * Created by modun on 14/12/10.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")
var MapUtils = require("../utils/mapUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var AllianceApiService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceApiService
var pro = AllianceApiService.prototype

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
	var playerData = []
	var allianceDoc = null
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		}
		var gemUsed = DataUtils.getGemByCreateAlliance()
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		playerData.push(["resources.gem", playerDoc.resources.gem])
		return Promise.resolve()
	}).then(function(){
		return self.allianceDao.getModel().findAsync({"basicInfo.name":name}, {_id:true}, {limit:1})
	}).then(function(docs){
		if(docs.length > 0) return Promise.reject(ErrorUtils.allianceNameExist(playerId, name))
		return self.allianceDao.getModel().findAsync({"basicInfo.tag":tag}, {_id:true}, {limit:1})
	}).then(function(docs){
		if(docs.length > 0) return Promise.reject(ErrorUtils.allianceTagExist(playerId, tag))
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
		return self.allianceDao.getModel().createAsync(alliance)
	}).then(function(doc){
		allianceDoc = JSON.parse(JSON.stringify(doc))
		return self.allianceDao.addAsync(allianceDoc)
	}).then(function(){
		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Archon, memberRect)
		LogicUtils.refreshAllianceBasicInfo(allianceDoc, [])
		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Archon,
			titleName:allianceDoc.titles.archon
		}
		playerData.push(["alliance", playerDoc.alliance])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, [playerData, allianceDoc])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	var playerData = []
	var allianceDoc = null
	var memberDocs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "sendAllianceMail")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "sendAllianceMail"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])

		var mailToPlayer = {
			id:ShortId.generate(),
			title:title,
			fromName:playerDoc.basicInfo.name,
			fromAllianceTag:playerDoc.alliance.tag,
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
		if(playerDoc.sendMails.length >= Define.PlayerSendMailsMaxSize){
			playerDoc.sendMails.shift()
			playerData.push(["sendMails.0", null])
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
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

		var sendMailToMember = function(member){
			return self.playerDao.findAsync(member.id).then(function(doc){
				memberDocs.push(doc)
				var docData = []
				if(doc.mails.length >= Define.PlayerMailsMaxSize){
					var mail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
					docData.push(["mails." + doc.mails.indexOf(mail), null])
					LogicUtils.removeItemInArray(playerDoc.mails, mail)
				}
				doc.mails.push(mailToMember)
				docData.push(["mails." + doc.mails.indexOf(mailToMember), mailToMember])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
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
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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
	var self = this
	var playerDoc = null
	var allianceDoc = null
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, allianceDoc)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	var self = this
	var playerDoc = null
	var allianceDocs = null
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		var funcs = []
		funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		funcs.push(self.allianceDao.getModel().find({"basicInfo.joinType":Consts.AllianceJoinType.All}).sort({"basicInfo.power":-1}).limit(10).exec())
		return Promise.all(funcs)
	}).spread(function(tmp, docs){
		allianceDocs = docs
		return Promise.resolve()
	}).then(function(){
		callback(null, allianceDocs)
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			self.playerDao.removeLockAsync(playerDoc._id).then(function(){
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
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		var funcs = []
		funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		funcs.push(self.allianceDao.getModel().findAsync({"basicInfo.tag": "/" + tag + "/i"}, null, {limit:10}))
		return Promise.all(funcs)
	}).spread(function(tmp, docs){
		callback(null, docs)
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			self.playerDao.removeLockAsync(playerDoc._id).then(function(){
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
	var playerData = []
	var forceSave = false
	var allianceDoc = null
	var allianceData = []
	var allianceMemberDocs = []
	var pushFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceBasicInfo")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "editAllianceBasicInfo"))
		}
		var gemUsed = DataUtils.getEditAllianceBasicInfoGem()
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		playerData.push(["resources.gem", playerDoc.resources.gem])
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.name, name)){
			forceSave = true
			return self.allianceDao.getModel().findAsync({"basicInfo.name": name}, {_id:true}, {limit:1})
		}
		return Promise.resolve()
	}).then(function(docs){
		if(!_.isEqual(allianceDoc.basicInfo.name, name) && docs.length > 0){
			return Promise.reject(ErrorUtils.allianceNameExist(playerId, name))
		}
		if(!_.isEqual(allianceDoc.basicInfo.tag, tag)){
			forceSave = true
			return self.allianceDao.getModel().findAsync({"basicInfo.tag": tag}, {_id:true}, {limit:1})
		}
		return Promise.resolve()
	}).then(function(docs){
		if(!_.isEqual(allianceDoc.basicInfo.tag, tag) && docs.length > 0){
			return Promise.reject(ErrorUtils.allianceTagExist(playerId, tag))
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

		allianceData.push(["basicInfo", allianceDoc.basicInfo])
		var event = null
		if(isNameChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Name, playerDoc.basicInfo.name, [allianceDoc.basicInfo.name])
			allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		}
		if(isTagChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Tag, playerDoc.basicInfo.name, [allianceDoc.basicInfo.tag])
			allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		}
		if(isFlagChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Flag, playerDoc.basicInfo.name, [allianceDoc.basicInfo.flag])
			allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		}
		if(isLanguageChanged){
			event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Language, playerDoc.basicInfo.name, [allianceDoc.basicInfo.language])
			allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		}

		if(isNameChanged || isTagChanged){
			playerDoc.alliance.name = name
			playerDoc.alliance.tag = tag
			playerData.push(["alliance.name", playerDoc.alliance.name])
			playerData.push(["alliance.tag", playerDoc.alliance.tag])
		}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc, forceSave])
		if(isNameChanged || isTagChanged){
			var funcs = []
			var updateMember = function(member){
				return self.playerDao.findAsync(member.id).then(function(doc){
					allianceMemberDocs.push(doc)
					doc.alliance.name = name
					doc.alliance.tag = tag
					var memberData = []
					memberData.push(["alliance.name", doc.alliance.name])
					memberData.push(["alliance.tag", doc.alliance.tag])
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, memberData])
					return Promise.resolve()
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
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		_.each(allianceMemberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		callback(new Error("terrain 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceTerrian")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "editAllianceTerrian"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])

		var honourUsed = DataUtils.getEditAllianceTerrianHonour()
		if(allianceDoc.basicInfo.honour < honourUsed) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		allianceDoc.basicInfo.honour -= honourUsed
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		allianceDoc.basicInfo.terrain = terrain
		allianceData.push(["basicInfo.terrain", allianceDoc.basicInfo.terrain])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Terrain, playerDoc.basicInfo.name, [allianceDoc.basicInfo.terrain])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var allianceMemberDocs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceTitleName")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "editAllianceTitleName"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		allianceDoc.titles[title] = titleName
		allianceData.push(["titles." + title, allianceDoc.titles[title]])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		if(_.isEqual(playerDoc.alliance.title, title)){
			playerDoc.alliance.titleName = titleName
			playerData.push(["alliance.titleName", playerDoc.alliance.titleName])
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		}else{
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}

		var updateMemberTitleName = function(member){
			return self.playerDao.findAsync(member.id).then(function(doc){
				allianceMemberDocs.push(doc)
				doc.alliance.titleName = titleName
				var memberData = []
				memberData.push(["alliance.titleName", doc.alliance.titleName])
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
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		_.each(allianceMemberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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
	if(!_.isString(notice)){
		callback(new Error("notice 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceNotice")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "editAllianceNotice"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		allianceDoc.notice = notice
		allianceData.push(["notice", allianceDoc.notice])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Notice, playerDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])

		var funcs = []
		funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	if(!_.isString(description)){
		callback(new Error("description 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceDescription")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "editAllianceDescription"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		allianceDoc.desc = description
		allianceData.push(["desc", allianceDoc.desc])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Desc, playerDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])

		var funcs = []
		funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	if(!_.contains(Consts.AllianceJoinType, joinType)){
		callback(new Error("joinType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceJoinType")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "editAllianceJoinType"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		allianceDoc.basicInfo.joinType = joinType
		allianceData.push(["basicInfo.joinType", allianceDoc.basicInfo.joinType])
		var funcs = []
		funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	var allianceData = []
	var memberDoc = null
	var memberData = []
	var memberInAllianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "editAllianceMemberTitle")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "editAllianceMemberTitle"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerInAllianceDoc.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberInAllianceDoc.title)
		var afterMemberLevel = DataUtils.getAllianceTitleLevel(title)
		if(currentMemberLevel <= myMemberLevel){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceDoc._id, "editAllianceMemberTitle"))
		}
		if(afterMemberLevel <= myMemberLevel){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceDoc._id, "editAllianceMemberTitle"))
		}
		return self.playerDao.findAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
		memberDoc = doc
		memberDoc.alliance.title = title
		memberData.push(["alliance.title", memberDoc.alliance.title])
		memberDoc.alliance.titleName = allianceDoc.titles[title]
		memberData.push(["alliance.titleName", memberDoc.alliance.titleName])
		memberInAllianceDoc.title = title
		allianceData.push(["members." + allianceDoc.members.indexOf(memberInAllianceDoc) + ".title", memberInAllianceDoc.title])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Promotion, memberInAllianceDoc.name, [memberInAllianceDoc.title])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var memberDoc = null
	var memberData = []
	var memberInAllianceDoc = null
	var otherPlayerDocs = []
	var updateFuncs = []
	var pushFuncs = []
	var eventFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "kickAllianceMemberOff")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "kickAllianceMemberOff"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatusCanNotKickMemberOff(playerId, allianceDoc._id, memberId))
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerInAllianceDoc.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberInAllianceDoc.title)
		if(currentMemberLevel <= myMemberLevel) return Promise.reject(ErrorUtils.canNotKickAllianceMemberOffForTitleIsUpperThanMe(playerId, allianceDoc._id, memberId))
		return self.playerDao.findAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
		memberDoc = doc

		LogicUtils.returnPlayerShrineTroops(memberDoc, memberData, allianceDoc, allianceData)
		LogicUtils.returnPlayerMarchTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerMarchReturnTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerVillageTroop(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)

		var funcs = []
		var returnHelpedByTroop = function(helpedByTroop){
			if(_.isEqual(helpedByTroop.id, playerDoc._id)){
				LogicUtils.returnPlayerHelpedByTroop(memberDoc, memberData, helpedByTroop, playerDoc, playerData)
				return Promise.resolve()
			}else{
				doc = _.find(otherPlayerDocs, function(doc){
					return _.isEqual(helpedByTroop.id, doc._id)
				})
				if(_.isObject(doc)){
					var data = []
					LogicUtils.returnPlayerHelpedByTroop(memberDoc, memberData, helpedByTroop, doc, data)
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
					return Promise.resolve()
				}else{
					return self.playerDao.findAsync(helpedByTroop.id).then(function(doc){
						otherPlayerDocs.push(doc)
						var data = []
						LogicUtils.returnPlayerHelpedByTroop(memberDoc, memberData, helpedByTroop, doc, data)
						updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
						pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
						return Promise.resolve()
					})
				}
			}
		}
		var returnHelpToTroop = function(helpToTroop){
			if(_.isEqual(helpToTroop.beHelpedPlayerData.id, playerDoc._id)){
				LogicUtils.returnPlayerHelpToTroop(memberDoc, memberData, helpToTroop, playerDoc, playerData)
				return Promise.resolve()
			}else{
				doc = _.find(otherPlayerDocs, function(doc){
					return _.isEqual(helpToTroop.beHelpedPlayerData.id, doc._id)
				})
				if(_.isObject(doc)){
					var data = []
					LogicUtils.returnPlayerHelpToTroop(memberDoc, memberData, helpToTroop, doc, data)
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
					return Promise.resolve()
				}else{
					return self.playerDao.findAsync(helpToTroop.beHelpedPlayerData.id).then(function(doc){
						otherPlayerDocs.push(doc)
						var data = []
						LogicUtils.returnPlayerHelpToTroop(memberDoc, memberData, helpToTroop, doc, data)
						updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
						pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
						return Promise.resolve()
					})
				}
			}
		}
		var returnHelpedByMarchTroop = function(marchEvent){
			if(_.isEqual(marchEvent.attackPlayerData.id, playerDoc._id)){
				LogicUtils.returnPlayerHelpedByMarchTroop(playerDoc, playerData, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
				return Promise.resolve()
			}else{
				doc = _.find(otherPlayerDocs, function(doc){
					return _.isEqual(marchEvent.attackPlayerData.id, doc._id)
				})
				if(_.isObject(doc)){
					var data = []
					LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
					return Promise.resolve()
				}else{
					return self.playerDao.findAsync(marchEvent.attackPlayerData.id).then(function(doc){
						otherPlayerDocs.push(doc)
						var data = []
						LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
						updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
						pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
						return Promise.resolve()
					})
				}
			}
		}
		_.each(memberDoc.helpedByTroops, function(helpedByTroop){
			funcs.push(returnHelpedByTroop(helpedByTroop))
		})
		_.each(memberDoc.helpToTroops, function(helpToTroop){
			funcs.push(returnHelpToTroop(helpToTroop))
		})
		_.each(allianceDoc.attackMarchEvents, function(marchEvent){
			if(_.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, memberDoc._id)){
				funcs.push(returnHelpedByMarchTroop(marchEvent))
			}
		})

		return Promise.all(funcs)
	}).then(function(){
		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(memberId, event.id)
		})
		_.each(helpEvents, function(helpEvent){
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
		})

		memberDoc.alliance = null
		memberData.push(["alliance", null])
		allianceData.push(["members." + allianceDoc.members.indexOf(memberInAllianceDoc), null])
		LogicUtils.removeItemInArray(allianceDoc.members, memberInAllianceDoc)
		var memberObjectInMap = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, memberInAllianceDoc.location)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberObjectInMap), null])
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, memberObjectInMap)

		LogicUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Kick, memberInAllianceDoc.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])

		if(!_.isEmpty(playerData)){
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		}else{
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}
		updateFuncs.push([self.globalChannelService, self.globalChannelService.leaveAsync, Consts.AllianceChannelPrefix + allianceDoc._id, memberDoc._id, memberDoc.logicServerId])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
		}
		_.each(otherPlayerDocs, function(thePlayerDoc){
			funcs.push(self.playerDao.removeLockAsync(thePlayerDoc._id))
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
 * 移交盟主职位
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.handOverAllianceArchon = function(playerId, memberId, callback){
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
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var memberDoc = null
	var memberData = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!_.isEqual(playerDoc.alliance.title, Consts.AllianceTitle.Archon)) return Promise.reject(ErrorUtils.youAreNotTheAllianceArchon(playerId, playerDoc.alliance.id))
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		return self.playerDao.findAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
		memberDoc = doc
		var memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))

		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		playerInAllianceDoc.title = Consts.AllianceTitle.Member
		allianceData.push(["members." + allianceDoc.members.indexOf(playerInAllianceDoc) + ".title", playerInAllianceDoc.title])
		playerDoc.alliance.title = Consts.AllianceTitle.Member
		playerData.push(["alliance.title", playerDoc.alliance.title])
		playerDoc.alliance.titleName = allianceDoc.titles.member
		playerData.push(["alliance.titleName", playerDoc.alliance.titleName])

		memberInAllianceDoc.title = Consts.AllianceTitle.Archon
		allianceData.push(["members." + allianceDoc.members.indexOf(memberInAllianceDoc) + ".title", memberInAllianceDoc.title])
		memberDoc.alliance.title = Consts.AllianceTitle.Archon
		memberData.push(["alliance.title", memberDoc.alliance.title])
		memberDoc.alliance.titleName = allianceDoc.titles.archon
		memberData.push(["alliance.titleName", memberDoc.alliance.titleName])

		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, memberDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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