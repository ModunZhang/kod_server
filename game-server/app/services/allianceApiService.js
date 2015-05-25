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
	if(!_.isString(name) || name.trim().length > Define.InputLength.AllianceName){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(tag) || tag.trim().length > Define.InputLength.AllianceTag){
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
	this.dataService.findPlayerAsync(playerId, ['_id', 'logicServerId', 'allianceId', 'serverId', 'apnId', 'countInfo', 'basicInfo', 'buildings', 'allianceInfo', 'countInfo', 'resources'], false).then(function(doc){
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

		var alliance = {
			_id:ShortId.generate(),
			serverId:playerDoc.serverId,
			basicInfo:{
				name:name,
				tag:tag,
				language:language,
				terrain:terrain,
				flag:flag,
				kill:0,
				power:0
			},
			members:[],
			allianceFight:null
		}
		var mapObjects = MapUtils.create()
		alliance.mapObjects = mapObjects
		alliance.buildings = DataUtils.createMapBuildings(mapObjects)
		alliance.villages = DataUtils.createMapVillages(mapObjects)
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberMapObject)
		LogicUtils.addAllianceMember(alliance, playerDoc, Consts.AllianceTitle.Archon, memberMapObject.id, true)
		DataUtils.refreshAllianceBasicInfo(alliance, [])
		return self.dataService.createAllianceAsync(alliance)
	}).then(function(doc){
		allianceDoc = doc
		playerDoc.allianceId = allianceDoc._id
		playerData.push(["allianceId", playerDoc.allianceId])

		updateFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, ["allianceId", ["allianceTag"]], [allianceDoc._id, allianceDoc.basicInfo.tag]])
		updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, playerDoc._id, playerDoc])
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, [playerData, allianceDoc])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 发送联盟邮件
 * @param playerId
 * @param allianceId
 * @param title
 * @param content
 * @param callback
 */
pro.sendAllianceMail = function(playerId, allianceId, title, content, callback){
	if(!_.isString(title)){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(content)){
		callback(new Error("content 不合法"))
		return
	}

	this.dataService.sendAllianceMailAsync(playerId, allianceId, title, content).then(function(){
		callback(null)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 主动获取玩家联盟的信息
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getMyAllianceData = function(playerId, allianceId, callback){
	var self = this
	var playerDoc = null
	var allianceDoc = null
	this.dataService.directFindPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.directFindAllianceAsync(playerDoc.allianceId, [], false)
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
 * @param fromIndex
 * @param callback
 */
pro.getCanDirectJoinAlliances = function(playerId, fromIndex, callback){
	if(!_.isNumber(fromIndex) || fromIndex < 0 || fromIndex % 10 != 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var allianceDocs = []

	var findAllianceAsync = new Promise(function(resolve, reject){
		self.dataService.getAllianceModel().collection.find({
			serverId:self.app.get('cacheServerId'),
			'basicInfo.joinType':Consts.AllianceJoinType.All
		}, {
			_id:true,
			basicInfo:true,
			members:true,
			buildings:true
		}).sort({'basicInfo.power':-1}).skip(fromIndex).limit(10).toArray(function(e, docs){
			if(_.isObject(e)) reject(e)
			else resolve(docs)
		})
	})
	findAllianceAsync.then(function(docs){
		_.each(docs, function(doc){
			if(doc.members.length > 0){
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
			}
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
	if(!_.isString(tag) || tag.trim().length > Define.InputLength.AllianceTag){
		callback(new Error("tag 不合法"))
		return
	}

	var self = this
	var allianceDocs = []
	var findAllianceAsync = new Promise(function(resolve, reject){
		self.dataService.getAllianceModel().collection.find({
			serverId:self.app.get('cacheServerId'),
			"basicInfo.tag":{$regex:tag, $options:"i"}
		}, {
			_id:true,
			basicInfo:true,
			members:true,
			buildings:true
		}).limit(10).toArray(function(e, docs){
			if(_.isObject(e)) reject(e)
			else resolve(docs)
		})
	})

	findAllianceAsync.then(function(docs){
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
 * @param allianceId
 * @param name
 * @param tag
 * @param language
 * @param flag
 * @param callback
 */
pro.editAllianceBasicInfo = function(playerId, allianceId, name, tag, language, flag, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(name) || name.trim().length > Define.InputLength.AllianceName){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(tag) || tag.trim().length > Define.InputLength.AllianceTag){
		callback(new Error("tag 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		callback(new Error("language 不合法"))
		return
	}
	if(!_.isString(flag) || flag.trim().length > Define.InputLength.AllianceFlag){
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
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'resources'], false).then(function(doc){
		playerDoc = doc
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'members', 'events'], false)
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
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc._id, playerDoc])

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
		if(isNameChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Name, playerDoc.basicInfo.name, [allianceDoc.basicInfo.name])
		}
		if(isTagChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Tag, playerDoc.basicInfo.name, [allianceDoc.basicInfo.tag])
		}
		if(isFlagChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Flag, playerDoc.basicInfo.name, [allianceDoc.basicInfo.flag])
		}
		if(isLanguageChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Language, playerDoc.basicInfo.name, [allianceDoc.basicInfo.language])
		}

		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		if(forceSave){
			updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc._id, allianceDoc])
		}else{
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 编辑联盟地形
 * @param playerId
 * @param playerName
 * @param allianceId
 * @param terrain
 * @param callback
 */
pro.editAllianceTerrian = function(playerId, playerName, allianceId, terrain, callback){
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		callback(new Error("terrain 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	self.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'events', 'members', 'allianceFight'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceTerrian")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceTerrian"))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id))
		var honourUsed = DataUtils.getAllianceIntInit("editAllianceTerrianHonour")
		if(allianceDoc.basicInfo.honour < honourUsed) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		allianceDoc.basicInfo.honour -= honourUsed
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		allianceDoc.basicInfo.terrain = terrain
		allianceData.push(["basicInfo.terrain", allianceDoc.basicInfo.terrain])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Terrain, playerName, [allianceDoc.basicInfo.terrain])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 编辑职位名称
 * @param playerId
 * @param allianceId
 * @param title
 * @param titleName
 * @param callback
 */
pro.editAllianceTitleName = function(playerId, allianceId, title, titleName, callback){
	if(!_.contains(Consts.AllianceTitle, title)){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(titleName) || titleName.trim().length > Define.InputLength.AllianceTitleName){
		callback(new Error("titleName 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'members', 'titles'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceTitleName")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceTitleName"))
		}

		allianceDoc.titles[title] = titleName
		allianceData.push(["titles." + title, allianceDoc.titles[title]])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 编辑联盟公告
 * @param playerId
 * @param playerName
 * @param allianceId
 * @param notice
 * @param callback
 */
pro.editAllianceNotice = function(playerId, playerName, allianceId, notice, callback){
	if(!_.isString(notice) || notice.trim().length > Define.InputLength.AllianceNotice){
		callback(new Error("notice 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	this.dataService.findAllianceAsync(allianceId, [], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceNotice")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceNotice"))
		}

		allianceDoc.notice = notice
		allianceData.push(["notice", allianceDoc.notice])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Notice, playerName, [])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.updateAllianceAsync(allianceDoc._id, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 编辑联盟描述
 * @param playerId
 * @param playerName
 * @param allianceId
 * @param description
 * @param callback
 */
pro.editAllianceDescription = function(playerId, playerName, allianceId, description, callback){
	if(!_.isString(description) || description.trim().length > Define.InputLength.AllianceDesc){
		callback(new Error("description 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	this.dataService.findAllianceAsync(allianceId, [], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceDescription")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceDescription"))
		}

		allianceDoc.desc = description
		allianceData.push(["desc", allianceDoc.desc])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Desc, playerName, [])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.updateAllianceAsync(allianceDoc._id, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 编辑联盟加入方式
 * @param playerId
 * @param allianceId
 * @param joinType
 * @param callback
 */
pro.editAllianceJoinType = function(playerId, allianceId, joinType, callback){
	if(!_.contains(Consts.AllianceJoinType, joinType)){
		callback(new Error("joinType 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	this.dataService.findAllianceAsync(allianceId, [], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceJoinType")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceJoinType"))
		}

		allianceDoc.basicInfo.joinType = joinType
		allianceData.push(["basicInfo.joinType", allianceDoc.basicInfo.joinType])
		return Promise.resolve()
	}).then(function(){
		return self.dataService.flushAllianceAsync(allianceDoc._id, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 修改联盟某个玩家的职位
 * @param playerId
 * @param allianceId
 * @param memberId
 * @param title
 * @param callback
 */
pro.editAllianceMemberTitle = function(playerId, allianceId, memberId, title, callback){
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
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
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var previousTitleName = null
	var currentTitleName = null
	this.dataService.findAllianceAsync(allianceId, ['_id', 'members', 'titles', 'events'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceMemberTitle")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceMemberTitle"))
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
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, promotionType, memberObject.name, [memberObject.title])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		allianceDoc = null
		var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedContent")
		return self.dataService.sendSysMailAsync(memberId, titleKey, [], contentKey, [previousTitleName, currentTitleName])
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 将玩家踢出联盟
 * @param playerId
 * @param allianceId
 * @param memberId
 * @param callback
 */
pro.kickAllianceMemberOff = function(playerId, allianceId, memberId, callback){
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能将自己踢出联盟"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var memberDoc = null
	var memberData = []
	var updateFuncs = []
	var pushFuncs = []
	var eventFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'members', 'villages', 'allianceFight', 'mapObjects', 'events', 'helpEvents', 'attackMarchEvents', 'attackMarchReturnEvents', 'strikeMarchEvents', 'strikeMarchReturnEvents', 'villageEvents', 'shrineEvents'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "kickAllianceMemberOff")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "kickAllianceMemberOff"))
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
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Kick, memberObject.name, [])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)

		return self.dataService.findPlayerAsync(memberId, ['_id', 'logicServerId', 'basicInfo', 'resources', 'allianceInfo', 'buildings', 'productionTechs', 'dragons', 'soldierMaterials', 'dragonMaterials', 'items', 'soldiers', 'soldierStars', 'helpToTroops', 'helpedByTroops', 'houseEvents', 'vipEvents', 'itemEvents'], false)
	}).then(function(doc){
		memberDoc = doc
		memberDoc.allianceId = null
		memberData.push(["allianceId", null])
		DataUtils.refreshPlayerResources(memberDoc)

		LogicUtils.returnPlayerMarchTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerMarchReturnTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerShrineTroops(memberDoc, memberData, allianceDoc, allianceData)
		LogicUtils.returnPlayerVillageTroop(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, self.timeEventService, self.dataService)

		var returnHelpedByMarchTroop = function(marchEvent){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(marchEvent.attackPlayerData.id, ['_id', 'logicServerId', 'basicInfo', 'dragons', 'soldiers', 'vipEvents', 'itemEvents'], false).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc._id, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpedByMarchTroop", {marchEvent:marchEvent}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc._id, null)
				return Promise.resolve()
			})
		}
		var returnHelpedByTroop = function(helpedByTroop){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(helpedByTroop.id, ['_id', 'logicServerId', 'basicInfo', 'resources', 'buildings', 'productionTechs', 'dragons', 'soldierMaterials', 'dragonMaterials', 'items', 'soldiers', 'soldierStars', 'helpToTroops', 'houseEvents', 'vipEvents', 'itemEvents'], false).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByTroop(memberDoc, memberData, helpedByTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc._id, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpedByTroop", {helpedByTroop:helpedByTroop}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc._id, null)
				return Promise.resolve()
			})
		}
		var returnHelpToTroop = function(helpToTroop){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(helpToTroop.beHelpedPlayerData.id, ['_id', 'logicServerId', 'helpedByTroops'], false).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpToTroop(memberDoc, memberData, helpToTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc._id, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpToTroop", {helpToTroop:helpToTroop}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc._id, null)
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

		DataUtils.refreshPlayerResources(memberDoc)
		memberData.push(["resources", memberDoc.resources])
		return Promise.all(funcs)
	}).then(function(){
		if(!_.isEmpty(memberDoc.logicServerId)){
			updateFuncs.push([self.dataService, self.dataService.removePlayerFromAllianceChannelAsync, allianceDoc._id, memberDoc])
			updateFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, memberDoc, ["allianceId", ["allianceTag"]], ["", ""]])
		}
		updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, memberDoc._id, memberDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc._id, allianceDoc])
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
		var allianceName = allianceDoc.basicInfo.name
		allianceDoc = null
		memberDoc = null
		var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceKickMemberOffTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceKickMemberOffContent")
		return self.dataService.sendSysMailAsync(memberId, titleKey, [allianceName], contentKey, [allianceName])
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 移交盟主职位
 * @param playerId
 * @param allianceId
 * @param memberId
 * @param callback
 */
pro.handOverAllianceArchon = function(playerId, allianceId, memberId, callback){
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能将盟主职位移交给自己"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var previousTitleName = null
	var currentTitleName = null
	this.dataService.findAllianceAsync(allianceId, ['_id', 'members', 'titles', 'events'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isEqual(playerObject.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(ErrorUtils.youAreNotTheAllianceArchon(playerId, allianceId))
		}

		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		playerObject.title = Consts.AllianceTitle.Member
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".title", playerObject.title])
		previousTitleName = allianceDoc.titles[memberObject.title]
		memberObject.title = Consts.AllianceTitle.Archon
		currentTitleName = allianceDoc.titles[memberObject.title]
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".title", memberObject.title])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, memberObject.name, [])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		allianceDoc = null
		var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedContent")
		return self.dataService.sendSysMailAsync(memberId, titleKey, [], contentKey, [previousTitleName, currentTitleName])
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}