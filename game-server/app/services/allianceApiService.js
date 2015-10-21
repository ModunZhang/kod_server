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
	this.cacheService = app.get('cacheService');
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
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var gemUsed = null
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isString(playerDoc.allianceId)){
			return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		}
		gemUsed = DataUtils.getAllianceIntInit("createAllianceGem")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))

		return new Promise(function(resolve, reject){
			self.cacheService.getAllianceModel().collection.count(function(e, count){
				if(!!e)return reject(e);
				if(count > Math.pow(Define.BigMapLength - 1, 2)){
					return reject(ErrorUtils.allianceCountReachMaxCanNotCreateNewAlliance(playerId));
				}
				resolve();
			})
		})
	}).then(function(){
		var alliance = {
			_id:ShortId.generate(),
			serverId:playerDoc.serverId,
			basicInfo:{
				name:name,
				tag:tag,
				language:language,
				terrain:terrain,
				terrainStyle:_.random(1,6),
				flag:flag,
				kill:0,
				power:0
			},
			members:[],
			notice:null,
			desc:null,
			allianceFight:null
		}
		return self.cacheService.createAllianceAsync(alliance)
	}).then(function(doc){
		allianceDoc = doc
		var mapObjects = [];
		allianceDoc.mapObjects = mapObjects
		var map = MapUtils.buildMap(allianceDoc.basicInfo.terrainStyle, mapObjects);
		DataUtils.initMapBuildings(allianceDoc);
		DataUtils.initMapVillages(allianceDoc, mapObjects, map);
		DataUtils.initMapMonsters(allianceDoc, mapObjects, map);
		var monsterRefreshTime = DataUtils.getAllianceIntInit('monsterRefreshMinutes') * 60 * 1000 / 60
		allianceDoc.basicInfo.monsterRefreshTime = Date.now() + monsterRefreshTime
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, Consts.MonsterRefreshEvent, Consts.MonsterRefreshEvent, monsterRefreshTime])
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = MapUtils.getRect(map, memberSizeInMap.width, memberSizeInMap.height);
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberMapObject)
		LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Archon, memberMapObject.id, true)
		allianceDoc.members[0].online = true
		DataUtils.refreshAllianceBasicInfo(allianceDoc, [])

		playerDoc.allianceId = allianceDoc._id
		playerData.push(["allianceId", playerDoc.allianceId])

		playerDoc.resources.gem -= gemUsed
		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"createAlliance"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		playerData.push(["resources.gem", playerDoc.resources.gem])

		eventFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, {
			allianceId:allianceDoc._id,
			allianceTag:allianceDoc.basicInfo.tag
		}])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id, playerDoc])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		var mapData = self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData;
		var mapIndexData = self.cacheService.getMapIndexs();
		callback(null, [playerData, allianceDoc, mapData, mapIndexData]);
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	this.cacheService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.cacheService.directFindAllianceAsync(playerDoc.allianceId)
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
	var self = this
	var allianceDocs = []
	var findAllianceAsync = new Promise(function(resolve, reject){
		self.cacheService.getAllianceModel().collection.find({
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
	var self = this
	var allianceDocs = []
	var findAllianceAsync = new Promise(function(resolve, reject){
		self.cacheService.getAllianceModel().collection.find({
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
	var self = this
	var playerDoc = null
	var playerData = []
	var forceSave = false
	var allianceDoc = null
	var allianceData = []
	var gemUsed = null
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceBasicInfo")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "editAllianceBasicInfo"))
		}

		gemUsed = DataUtils.getAllianceIntInit("editAllianceBasicInfoGem")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		return Promise.resolve()
	}).then(function(){
		if(!_.isEqual(allianceDoc.basicInfo.name, name)){
			forceSave = true
			return self.cacheService.getAllianceModel().findOneAsync({"basicInfo.name":name}, {_id:true}).then(function(doc){
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
			return self.cacheService.getAllianceModel().findOneAsync({"basicInfo.tag":tag}, {_id:true}).then(function(doc){
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
		playerDoc.resources.gem -= gemUsed
		playerData.push(["resources.gem", playerDoc.resources.gem])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])

		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"editAllianceBasicInfo"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])

		var isNameChanged = !_.isEqual(allianceDoc.basicInfo.name, name)
		var isTagChanged = !_.isEqual(allianceDoc.basicInfo.tag, tag)
		var isFlagChanged = !_.isEqual(allianceDoc.basicInfo.flag, flag)
		var isLanguageChanged = !_.isEqual(allianceDoc.basicInfo.language, language)
		allianceDoc.basicInfo.name = name
		allianceDoc.basicInfo.tag = tag
		allianceDoc.basicInfo.language = language
		allianceDoc.basicInfo.flag = flag
		pushFuncs.push([self.cacheService, self.cacheService.updateMapAllianceAsync, allianceDoc.mapIndex, allianceDoc]);
		allianceData.push(["basicInfo", allianceDoc.basicInfo])

		if(isNameChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Name, playerDoc.basicInfo.name, [allianceDoc.basicInfo.name])
		}
		if(isTagChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Tag, playerDoc.basicInfo.name, [allianceDoc.basicInfo.tag])
		}
		if(isFlagChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Flag, playerDoc.basicInfo.name, [])
		}
		if(isLanguageChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Language, playerDoc.basicInfo.name, [allianceDoc.basicInfo.language])
		}

		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		if(forceSave){
			updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
		}else{
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	self.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
		pushFuncs.push([self.cacheService, self.cacheService.updateMapAllianceAsync, allianceDoc.mapIndex, allianceDoc]);
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceTitleName")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceTitleName"))
		}

		allianceDoc.titles[title] = titleName
		allianceData.push(["titles." + title, allianceDoc.titles[title]])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
		return self.cacheService.updateAllianceAsync(allianceDoc._id, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
		return self.cacheService.updateAllianceAsync(allianceDoc._id, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceJoinType")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceJoinType"))
		}

		allianceDoc.basicInfo.joinType = joinType
		allianceData.push(["basicInfo.joinType", allianceDoc.basicInfo.joinType])
		return Promise.resolve()
	}).then(function(){
		return self.cacheService.flushAllianceAsync(allianceDoc._id, allianceDoc)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var previousTitleName = null
	var currentTitleName = null
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, promotionType, memberObject.name, [playerObject.name, memberObject.title]);
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var memberDoc = null
	var memberData = []
	var updateFuncs = []
	var pushFuncs = []
	var eventFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
		var hasStrikeMarchEventsToMember = _.some(self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData.marchEvents.strikeMarchEvents, function(event){
			return event.marchType === Consts.MarchType.City && event.defencePlayerData.id === memberId;
		})
		var hasAttackMarchEventsToMember = _.some(self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData.marchEvents.attackMarchEvents, function(event){
			return event.marchType === Consts.MarchType.City && event.defencePlayerData.id === memberId;
		})
		if(hasStrikeMarchEventsToMember || hasAttackMarchEventsToMember) return Promise.reject(ErrorUtils.canNotQuitAllianceForPlayerWillBeAttacked(playerId, allianceId, memberId));

		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(memberId, event.playerData.id)
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
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Kick, memberObject.name, [playerObject.name]);
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		return self.cacheService.findPlayerAsync(memberId)
	}).then(function(doc){
		memberDoc = doc
		memberDoc.allianceId = null
		memberData.push(["allianceId", null])
		DataUtils.refreshPlayerResources(memberDoc)
		LogicUtils.returnPlayerMarchTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, pushFuncs, self.timeEventService, self.cacheService);
		LogicUtils.returnPlayerMarchReturnTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, pushFuncs, self.timeEventService, self.cacheService);
		LogicUtils.returnPlayerShrineTroops(memberDoc, memberData, allianceDoc, allianceData)
		LogicUtils.returnPlayerVillageTroop(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, pushFuncs, self.timeEventService, self.dataService, self.cacheService);
		LogicUtils.removePlayerHelpEvents(memberDoc, allianceDoc, allianceData);

		var returnHelpedByTroop = function(helpedByTroop){
			var doc = null
			var data = []
			return self.cacheService.findPlayerAsync(helpedByTroop.id).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByTroop(memberDoc, memberData, helpedByTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.cacheService.updatePlayerAsync(doc._id, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpedByTroop", {helpedByTroop:helpedByTroop}, e.stack)
				if(_.isObject(doc)) return self.cacheService.updatePlayerAsync(doc._id, null)
				return Promise.resolve()
			})
		}
		var returnHelpToTroop = function(helpToTroop){
			var doc = null
			var data = []
			return self.cacheService.findPlayerAsync(helpToTroop.beHelpedPlayerData.id).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpToTroop(allianceDoc, allianceData, memberDoc, memberData, helpToTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.cacheService.updatePlayerAsync(doc._id, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.kickAllianceMemberOff.returnHelpToTroop", {helpToTroop:helpToTroop}, e.stack)
				if(_.isObject(doc)) return self.cacheService.updatePlayerAsync(doc._id, null)
				return Promise.resolve()
			})
		}

		var funcs = []
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
			eventFuncs.push([self.dataService, self.dataService.removePlayerFromAllianceChannelAsync, allianceDoc._id, memberDoc])
			eventFuncs.push([self.cacheService, self.cacheService.removeFromViewedMapIndexChannelAsync, memberDoc._id, memberDoc.logicServerId]);
			eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, memberDoc, {
				allianceId:"",
				allianceTag:""
			}])
		}
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, memberDoc._id, memberDoc])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var previousTitleName = null
	var currentTitleName = null
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, playerObject.name, [memberObject.name]);
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}