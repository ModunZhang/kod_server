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
	this.dataService = app.get("dataService")
	this.logService = app.get("logService")
	this.GemUse = app.get("GemUse")
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
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isString(playerDoc.allianceId)){
			return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		}
		var gemUsed = DataUtils.getAllianceIntInit("createAllianceGem")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"createAlliance"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		playerData.push(["resources.gem", playerDoc.resources.gem])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.getAllianceModel().findOneAsync({"basicInfo.name":name}, {_id:true})
	}).then(function(doc){
		if(_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNameExist(playerId, name))
		return self.dataService.getAllianceModel().findOneAsync({"basicInfo.tag":tag}, {_id:true})
	}).then(function(doc){
		if(_.isObject(doc)) return Promise.reject(ErrorUtils.allianceTagExist(playerId, tag))

		var alliance = {
			_id:ShortId.generate(),
			serverId:playerDoc.serverId,
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
		alliance.buildings = DataUtils.createMapBuildings(mapObjects)
		alliance.villages = DataUtils.createMapVillages(mapObjects)
		return self.dataService.createAllianceAsync(alliance)
	}).then(function(doc){
		allianceDoc = doc
		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberMapObject)
		LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Archon, memberMapObject.id, true)
		LogicUtils.refreshAllianceBasicInfo(allianceDoc, [])
		playerDoc.allianceId = allianceDoc._id
		playerData.push(["allianceId", playerDoc.allianceId])
		updateFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, [playerData, allianceDoc])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var mailToMember = null
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.directFindAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "sendAllianceMail")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "sendAllianceMail"))
		}

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
		mailToMember = {
			id:ShortId.generate(),
			title:title,
			fromId:playerDoc._id,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:allianceDoc.basicInfo.tag,
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
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		callback(null, playerData)
		return Promise.resolve()
	}, function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
			return Promise.reject(e)
		})
	}).then(function(){
		var SendMailToMemberAsync = function(member){
			var memberDoc = null
			var memberData = []
			return self.dataService.findPlayerAsync(member.id).then(function(doc){
				memberDoc = doc
				if(memberDoc.mails.length >= Define.PlayerMailsMaxSize){
					var mail = LogicUtils.getPlayerFirstUnSavedMail(memberDoc)
					memberData.push(["mails." + memberDoc.mails.indexOf(mail), null])
					LogicUtils.removeItemInArray(memberDoc.mails, mail)
				}
				memberDoc.mails.push(mailToMember)
				memberData.push(["mails." + doc.mails.indexOf(mailToMember), mailToMember])
				return self.dataService.updatePlayerAsync(doc, doc)
			}).then(function(){
				return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData)
			}).catch(function(e){
				self.logService.onEventError("logic.allianceApiService.SendMailToMemberAsync", {memberId:member._id}, e.stack)
				var funcs = []
				if(_.isObject(memberDoc)){
					funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
				}
				if(funcs.length > 0){
					return Promise.all(funcs).then(function(){
						return Promise.resolve()
					})
				}else{
					return Promise.resolve()
				}
			})
		}
		var funcs = []
		_.each(allianceDoc.members, function(member){
			if(!_.isEqual(member.id, playerDoc._id)){
				funcs.push(SendMailToMemberAsync(member))
			}
		})
		return Promise.all(funcs)
	}).catch(function(e){
		self.logService.onEventError("logic.allianceApiService.sendAllianceMail", {
			playerId:playerId,
			title:title,
			content:content
		}, e.stack)
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
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.directFindAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		return Promise.resolve()
	}).then(function(){
		callback(null, allianceDoc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取能直接加入的联盟
 * @param playerId
 * @param callback
 */
pro.getCanDirectJoinAlliances = function(playerId, callback){
	var self = this
	var allianceDocs = []

	this.dataService.getAllianceModel().findAsync({
		"serverId":self.app.get("cacheServerId"),
		"basicInfo.joinType":Consts.AllianceJoinType.All
	}, null, {"sort":{"basicInfo.power":-1}, "limit":10}).then(function(docs){
		_.each(docs, function(doc){
			var shortDoc = {
				id:doc._id,
				name:doc.basicInfo.name,
				tag:doc.basicInfo.tag,
				flag:doc.basicInfo.flag,
				members:doc.members.length,
				membersMax:DataUtils.getAllianceMemberMaxCount(doc),
				power:doc.basicInfo.power,
				language:doc.basicInfo.language,
				kill:doc.basicInfo.kill,
				archon:LogicUtils.getAllianceArchon(doc).name,
				joinType:doc.basicInfo.joinType,
				terrain:doc.basicInfo.terrain
			}
			allianceDocs.push(shortDoc)
		})
		return Promise.resolve()
	}).then(function(){
		callback(null, allianceDocs)
	}).catch(function(e){
		callback(e)
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
	var allianceDocs = []
	this.dataService.getAllianceModel().findAsync({
		"serverId":self.app.get("cacheServerId"),
		"basicInfo.tag":{$regex:tag}
	}, null, {"limit":10}).then(function(docs){
		_.each(docs, function(doc){
			var shortDoc = {
				id:doc._id,
				name:doc.basicInfo.name,
				tag:doc.basicInfo.tag,
				flag:doc.basicInfo.flag,
				members:doc.members.length,
				membersMax:DataUtils.getAllianceMemberMaxCount(doc),
				power:doc.basicInfo.power,
				language:doc.basicInfo.language,
				kill:doc.basicInfo.kill,
				archon:LogicUtils.getAllianceArchon(doc).name,
				joinType:doc.basicInfo.joinType,
				terrain:doc.basicInfo.terrain
			}
			allianceDocs.push(shortDoc)
		})
		return Promise.resolve()
	}).then(function(){
		callback(null, allianceDocs)
	}).catch(function(e){
		callback(e)
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
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceBasicInfo")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceBasicInfo"))
		}
		var gemUsed = DataUtils.getAllianceIntInit("editAllianceBasicInfoGem")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		playerData.push(["resources.gem", playerDoc.resources.gem])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])

		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"editAllianceBasicInfo"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		return Promise.resolve()
	}).then(function(){
		if(!_.isEqual(allianceDoc.basicInfo.name, name)){
			forceSave = true
			return self.dataService.getAllianceModel().findOneAsync({"basicInfo.name":name}, {_id:true}).then(function(doc){
				if(_.isObject(doc)){
					return Promise.reject(ErrorUtils.allianceNameExist(playerId, name))
				}else{
					return Promise.resolve()
				}
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		if(!_.isEqual(allianceDoc.basicInfo.tag, tag)){
			forceSave = true
			return self.dataService.getAllianceModel().findOneAsync({"basicInfo.tag":tag}, {_id:true}).then(function(doc){
				if(_.isObject(doc)){
					return Promise.reject(ErrorUtils.allianceTagExist(playerId, tag))
				}else{
					return Promise.resolve()
				}
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		var isNameChanged = !_.isEqual(allianceDoc.basicInfo.name, name)
		var isTagChanged = !_.isEqual(allianceDoc.basicInfo.tag, tag)
		var isFlagChanged = !_.isEqual(allianceDoc.basicInfo.flag, flag)
		var isLanguageChanged = !_.isEqual(allianceDoc.basicInfo.language, language)
		allianceDoc.basicInfo.name = name
		allianceDoc.basicInfo.tag = tag
		allianceDoc.basicInfo.language = language
		allianceDoc.basicInfo.flag = flag

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

		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		if(forceSave){
			updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
		}else{
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		}
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceTerrian")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceTerrian"))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerDoc._id, allianceDoc._id))
		var honourUsed = DataUtils.getAllianceIntInit("editAllianceTerrianHonour")
		if(allianceDoc.basicInfo.honour < honourUsed) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		allianceDoc.basicInfo.honour -= honourUsed
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		allianceDoc.basicInfo.terrain = terrain
		allianceData.push(["basicInfo.terrain", allianceDoc.basicInfo.terrain])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Terrain, playerDoc.basicInfo.name, [allianceDoc.basicInfo.terrain])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceTitleName")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceTitleName"))
		}

		allianceDoc.titles[title] = titleName
		allianceData.push(["titles." + title, allianceDoc.titles[title]])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceNotice")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceNotice"))
		}

		allianceDoc.notice = notice
		allianceData.push(["notice", allianceDoc.notice])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Notice, playerDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.updateAllianceAsync(allianceDoc, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceDescription")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceDescription"))
		}

		allianceDoc.desc = description
		allianceData.push(["desc", allianceDoc.desc])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Desc, playerDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.updateAllianceAsync(allianceDoc, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceJoinType")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceJoinType"))
		}

		allianceDoc.basicInfo.joinType = joinType
		allianceData.push(["basicInfo.joinType", allianceDoc.basicInfo.joinType])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.flushAllianceAsync(allianceDoc, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var memberDoc = null
	var memberData = []
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var previousTitleName = null
	var currentTitleName = null
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceMemberTitle")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceMemberTitle"))
		}

		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerObject.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberObject.title)
		var afterMemberLevel = DataUtils.getAllianceTitleLevel(title)
		var promotionType = currentMemberLevel >= afterMemberLevel ? Consts.AllianceEventType.PromotionUp : Consts.AllianceEventType.PromotionDown
		if(currentMemberLevel <= myMemberLevel){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceDoc._id, "editAllianceMemberTitle"))
		}
		if(afterMemberLevel <= myMemberLevel){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceDoc._id, "editAllianceMemberTitle"))
		}
		previousTitleName = allianceDoc.titles[memberObject.title]
		memberObject.title = title
		currentTitleName = allianceDoc.titles[memberObject.title]
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".title", memberObject.title])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, promotionType, memberObject.name, [memberObject.title])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.findPlayerAsync(memberId)
	}).then(function(doc){
		memberDoc = doc
		var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedContent")
		LogicUtils.sendSystemMail(memberDoc, memberData, titleKey, [], contentKey, [previousTitleName, currentTitleName])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, memberDoc, memberDoc])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var allianceDoc = null
	var allianceData = []
	var memberDoc = null
	var memberData = []
	var updateFuncs = []
	var pushFuncs = []
	var eventFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "kickAllianceMemberOff")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "kickAllianceMemberOff"))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatusCanNotKickMemberOff(playerId, allianceDoc._id, memberId))
		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerObject.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberObject.title)
		if(currentMemberLevel <= myMemberLevel) return Promise.reject(ErrorUtils.canNotKickAllianceMemberOffForTitleIsUpperThanMe(playerId, allianceDoc._id, memberId))

		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(memberId, event.id)
		})
		_.each(helpEvents, function(helpEvent){
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
		})
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), null])
		LogicUtils.removeItemInArray(allianceDoc.members, memberObject)
		var memberMapObject = LogicUtils.getAllianceMapObjectById(allianceDoc, memberObject.mapId)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), null])
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, memberMapObject)
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Kick, memberObject.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		LogicUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)

		return self.dataService.findPlayerAsync(memberId)
	}).then(function(doc){
		memberDoc = doc
		memberDoc.allianceId = null
		memberData.push(["allianceId", null])
		var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceKickMemberOffTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceKickMemberOffContent")
		LogicUtils.sendSystemMail(memberDoc, memberData, titleKey, [allianceDoc.basicInfo.name], contentKey, [allianceDoc.basicInfo.name])

		LogicUtils.returnPlayerMarchTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerMarchReturnTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerShrineTroops(memberDoc, memberData, allianceDoc, allianceData)
		LogicUtils.returnPlayerVillageTroop(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)

		var returnHelpedByMarchTroop = function(marchEvent){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(marchEvent.attackPlayerData.id).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpedByMarchTroop", {marchEvent:marchEvent}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc, null)
				return Promise.resolve()
			})
		}
		var returnHelpedByTroop = function(helpedByTroop){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(helpedByTroop.id).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByTroop(memberDoc, memberData, helpedByTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpedByTroop", {helpedByTroop:helpedByTroop}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc, null)
				return Promise.resolve()
			})
		}
		var returnHelpToTroop = function(helpToTroop){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(helpToTroop.beHelpedPlayerData.id).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpToTroop(memberDoc, memberData, helpToTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpToTroop", {helpToTroop:helpToTroop}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc, null)
				return Promise.resolve()
			})
		}

		var funcs = []
		_.each(allianceDoc.attackMarchEvents, function(marchEvent){
			if(_.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, memberDoc._id)){
				funcs.push(returnHelpedByMarchTroop(marchEvent))
			}
		})
		_.each(memberDoc.helpedByTroops, function(helpedByTroop){
			funcs.push(returnHelpedByTroop(helpedByTroop))
		})
		_.each(memberDoc.helpToTroops, function(helpToTroop){
			funcs.push(returnHelpToTroop(helpToTroop))
		})

		return Promise.all(funcs)
	}).then(function(){
		if(_.isString(memberDoc.logicServerId)){
			updateFuncs.push([self.dataService, self.dataService.removePlayerFromAllianceChannelAsync, allianceDoc._id, memberDoc])
		}
		updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, memberDoc, memberDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var memberDoc = null
	var memberData = []
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var previousTitleName = null
	var currentTitleName = null
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))

		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isEqual(playerObject.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(ErrorUtils.youAreNotTheAllianceArchon(playerId, playerDoc.allianceId))
		}

		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		playerObject.title = Consts.AllianceTitle.Member
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".title", playerObject.title])
		previousTitleName = allianceDoc.titles[memberObject.title]
		memberObject.title = Consts.AllianceTitle.Archon
		currentTitleName = allianceDoc.titles[memberObject.title]
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".title", memberObject.title])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, memberObject.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])

		return Promise.resolve()
	}).then(function(){
		return self.dataService.findPlayerAsync(memberId)
	}).then(function(doc){
		memberDoc = doc
		var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedContent")
		LogicUtils.sendSystemMail(memberDoc, memberData, titleKey, [], contentKey, [previousTitleName, currentTitleName])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, memberDoc, memberDoc])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}