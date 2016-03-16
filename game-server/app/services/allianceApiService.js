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
var ReportUtils = require('../utils/reportUtils')
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
	this.cacheServerId = app.getCurServer().id;
	this.GemChange = app.get("GemChange")
}
module.exports = AllianceApiService
var pro = AllianceApiService.prototype

/**
 * 创建联盟
 * @param playerId
 * @param name
 * @param tag
 * @param country
 * @param terrain
 * @param flag
 * @param callback
 */
pro.createAlliance = function(playerId, name, tag, country, terrain, flag, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var gemUsed = null
	var lockPairs = [];
	var eventFuncs = []
	var updateFuncs = []
	var alliance = null;
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isString(playerDoc.allianceId)){
			return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		}
		gemUsed = DataUtils.getAllianceIntInit("createAllianceGem")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))

		alliance = {
			_id:ShortId.generate(),
			serverId:playerDoc.serverId,
			basicInfo:{
				name:name,
				tag:tag,
				country:country,
				terrain:terrain,
				terrainStyle:_.random(1, 6),
				flag:flag,
				kill:0,
				power:0
			},
			members:[],
			notice:null,
			desc:null,
			allianceFight:null
		}
		lockPairs.push({type:Consts.Pairs.Player, value:playerDoc._id});
		lockPairs.push({type:Consts.Pairs.Alliance, value:alliance._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.createAllianceAsync(alliance)
	}).then(function(doc){
		allianceDoc = doc
		var mapObjects = [];
		allianceDoc.mapObjects = mapObjects
		var map = MapUtils.buildMap(allianceDoc.basicInfo.terrainStyle, mapObjects);
		DataUtils.initMapBuildings(allianceDoc);
		DataUtils.initMapVillages(allianceDoc, mapObjects, map);
		DataUtils.initMapMonsters(allianceDoc, mapObjects, map);
		var monsterRefreshTime = DataUtils.getAllianceIntInit('monsterRefreshMinutes') * 60 * 1000
		var villageRefreshTime = DataUtils.getAllianceIntInit('villageRefreshTime') * 60 * 1000
		allianceDoc.basicInfo.monsterRefreshTime = Date.now() + monsterRefreshTime;
		allianceDoc.basicInfo.villageRefreshTime = Date.now() + monsterRefreshTime;
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, Consts.MonsterRefreshEvent, Consts.MonsterRefreshEvent, monsterRefreshTime])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, Consts.VillageRefreshEvent, Consts.VillageRefreshEvent, villageRefreshTime])
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
			playerName:playerDoc.basicInfo.name,
			changed:-gemUsed,
			left:playerDoc.resources.gem,
			api:"createAlliance"
		}
		eventFuncs.push([self.GemChange, self.GemChange.createAsync, gemUse])
		playerData.push(["resources.gem", playerDoc.resources.gem])

		eventFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, {
			allianceId:allianceDoc._id,
			allianceTag:allianceDoc.basicInfo.tag
		}])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		var mapData = self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData;
		var mapIndexData = self.cacheService.getMapIndexs();
		callback(null, [playerData, allianceDoc, mapData, mapIndexData]);
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
		callback()
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.cacheService.findAllianceAsync(playerDoc.allianceId)
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
	Promise.fromCallback(function(callback){
		self.cacheService.getAllianceModel().collection.find({
			serverId:self.cacheServerId,
			'basicInfo.joinType':Consts.AllianceJoinType.All
		}, {
			_id:true,
			basicInfo:true,
			members:true,
			buildings:true
		}).sort({'basicInfo.power':-1}).skip(fromIndex).limit(10).toArray(callback);
	}).then(function(docs){
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
					country:doc.basicInfo.country,
					kill:doc.basicInfo.kill,
					archon:LogicUtils.getAllianceArchon(doc).name,
					joinType:doc.basicInfo.joinType,
					terrain:doc.basicInfo.terrain
				}
				allianceDocs.push(shortDoc)
			}
		})
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
	Promise.fromCallback(function(callback){
		self.cacheService.getAllianceModel().collection.find({
			serverId:self.cacheServerId,
			"basicInfo.tag":{$regex:tag, $options:"i"}
		}, {
			_id:true,
			basicInfo:true,
			members:true,
			buildings:true
		}).limit(10).toArray(callback);
	}).then(function(docs){
		_.each(docs, function(doc){
			var shortDoc = {
				id:doc._id,
				name:doc.basicInfo.name,
				tag:doc.basicInfo.tag,
				flag:doc.basicInfo.flag,
				members:doc.members.length,
				membersMax:DataUtils.getAllianceMemberMaxCount(doc),
				power:doc.basicInfo.power,
				country:doc.basicInfo.country,
				kill:doc.basicInfo.kill,
				archon:LogicUtils.getAllianceArchon(doc).name,
				joinType:doc.basicInfo.joinType,
				terrain:doc.basicInfo.terrain
			}
			allianceDocs.push(shortDoc)
		})
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
 * @param country
 * @param flag
 * @param callback
 */
pro.editAllianceBasicInfo = function(playerId, allianceId, name, tag, country, flag, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var lockPairs = [];
	var pushFuncs = [];
	var eventFuncs = [];
	var updateFuncs = [];
	var gemUsed = null
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
		lockPairs.push({type:Consts.Pairs.Player, value:playerDoc._id});
		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		if(!_.isEqual(allianceDoc.basicInfo.name, name)){
			return self.cacheService.getAllianceModel().findOneAsync({"basicInfo.name":name}, {_id:true}).then(function(doc){
				if(_.isObject(doc)){
					return Promise.reject(ErrorUtils.allianceNameExist(playerId, name))
				}else{
					return Promise.resolve()
				}
			})
		}
	}).then(function(){
		if(!_.isEqual(allianceDoc.basicInfo.tag, tag)){
			return self.cacheService.getAllianceModel().findOneAsync({"basicInfo.tag":tag}, {_id:true}).then(function(doc){
				if(_.isObject(doc)){
					return Promise.reject(ErrorUtils.allianceTagExist(playerId, tag))
				}else{
					return Promise.resolve()
				}
			})
		}
	}).then(function(){
		playerDoc.resources.gem -= gemUsed
		playerData.push(["resources.gem", playerDoc.resources.gem])

		var gemUse = {
			playerId:playerId,
			playerName:playerDoc.basicInfo.name,
			changed:-gemUsed,
			left:playerDoc.resources.gem,
			api:"editAllianceBasicInfo"
		}
		eventFuncs.push([self.GemChange, self.GemChange.createAsync, gemUse])

		var isNameChanged = !_.isEqual(allianceDoc.basicInfo.name, name)
		var isTagChanged = !_.isEqual(allianceDoc.basicInfo.tag, tag)
		var isFlagChanged = !_.isEqual(allianceDoc.basicInfo.flag, flag)
		var isCountryChanged = !_.isEqual(allianceDoc.basicInfo.country, country)
		allianceDoc.basicInfo.name = name
		allianceDoc.basicInfo.tag = tag
		allianceDoc.basicInfo.country = country
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
		if(isCountryChanged){
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Country, playerDoc.basicInfo.name, [allianceDoc.basicInfo.country])
		}
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs);
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var lockPairs = [];
	var updateFuncs = [];
	var pushFuncs = []
	var honourUsed = null;
	self.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceTerrian")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceTerrian"))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id))
		honourUsed = DataUtils.getAllianceIntInit("editAllianceTerrianHonour")
		if(allianceDoc.basicInfo.honour < honourUsed) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		allianceDoc.basicInfo.honour -= honourUsed
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		allianceDoc.basicInfo.terrain = terrain
		allianceData.push(["basicInfo.terrain", allianceDoc.basicInfo.terrain])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.Terrain, playerName, [allianceDoc.basicInfo.terrain])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id]);
		pushFuncs.push([self.cacheService, self.cacheService.updateMapAllianceAsync, allianceDoc.mapIndex, allianceDoc]);
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var lockPairs = [];
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceNotice")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceNotice"))
		}

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
	}).then(function(){
		allianceDoc.notice = notice
		allianceData.push(["notice", allianceDoc.notice])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Notice, playerName, [])
		return self.cacheService.flushAllianceAsync(allianceDoc._id);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var lockPairs = [];
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceDescription")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceDescription"))
		}

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
	}).then(function(){
		allianceDoc.desc = description
		allianceData.push(["desc", allianceDoc.desc])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Desc, playerName, [])
		return self.cacheService.flushAllianceAsync(allianceDoc._id);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var lockPairs = [];
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceJoinType")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceJoinType"))
		}

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
	}).then(function(){
		allianceDoc.basicInfo.joinType = joinType
		allianceData.push(["basicInfo.joinType", allianceDoc.basicInfo.joinType])
		return self.cacheService.flushAllianceAsync(allianceDoc._id);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc, allianceData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var lockPairs = [];
	var pushFuncs = []
	var playerObject = null;
	var memberObject = null;
	var previousTitleName = null
	var currentTitleName = null
	var promotionType = null;
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "editAllianceMemberTitle")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "editAllianceMemberTitle"))
		}
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerObject.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberObject.title)
		var afterMemberLevel = DataUtils.getAllianceTitleLevel(title)
		promotionType = currentMemberLevel >= afterMemberLevel ? Consts.AllianceEventType.PromotionUp : Consts.AllianceEventType.PromotionDown
		if(currentMemberLevel <= myMemberLevel){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceDoc._id, "editAllianceMemberTitle"))
		}
		if(afterMemberLevel <= myMemberLevel){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceDoc._id, "editAllianceMemberTitle"))
		}

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		previousTitleName = '__' + memberObject.title
		memberObject.title = title
		currentTitleName = '__' + memberObject.title
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".title", memberObject.title])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, promotionType, memberObject.name, [playerObject.name, memberObject.title]);
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).then(
		function(){
			var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedTitle")
			var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedContent")
			return self.dataService.sendSysMailAsync(memberId, titleKey, [], contentKey, [previousTitleName, currentTitleName])
		},
		function(e){
			if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
			callback(e)
		}
	)
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
	var lockPairs = [];
	var updateFuncs = [];
	var eventFuncs = []
	var pushFuncs = []
	var memberObject = null;
	var playerObject = null;
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "kickAllianceMemberOff")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "kickAllianceMemberOff"))
		}

		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatusCanNotKickMemberOff(playerId, allianceDoc._id, memberId))
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
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
		return self.cacheService.findPlayerAsync(memberId)
	}).then(function(doc){
		memberDoc = doc;

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
		lockPairs.push({type:Consts.Pairs.Player, value:memberDoc._id});
		if(!!memberDoc.helpToTroop) lockPairs.push({type:Consts.Pairs.Player, value:memberDoc.helpToTroop.id});
		if(!!memberDoc.helpedByTroop) lockPairs.push({type:Consts.Pairs.Player, value:memberDoc.helpedByTroop.id});
		var villageEvents = _.filter(allianceDoc.villageEvents, function(event){
			return event.playerData.id === memberDoc._id;
		})
		_.each(villageEvents, function(event){
			if(event.toAlliance.id !== allianceDoc._id) lockPairs.push({
				type:Consts.Pairs.Alliance,
				value:event.toAlliance.id
			});
		})
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
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

		memberDoc.allianceId = null
		memberData.push(["allianceId", null])
		DataUtils.refreshPlayerResources(memberDoc)
		memberData.push(["resources", memberDoc.resources])
		LogicUtils.returnPlayerMarchTroops(memberDoc, memberData, allianceDoc, allianceData, eventFuncs, pushFuncs, self.timeEventService, self.cacheService);
		LogicUtils.returnPlayerMarchReturnTroops(memberDoc, memberData, allianceDoc, allianceData, updateFuncs, eventFuncs, pushFuncs, self.timeEventService, self.cacheService, self.dataService);
		LogicUtils.returnPlayerShrineTroops(memberDoc, memberData, allianceDoc, allianceData)
		LogicUtils.removePlayerHelpEvents(memberDoc, allianceDoc, allianceData);

		var returnHelpedByTroop = function(helpedByTroop){
			var helpedByPlayerDoc = null
			var helpedByPlayerData = []
			return self.cacheService.findPlayerAsync(helpedByTroop.id).then(function(doc){
				helpedByPlayerDoc = doc
				LogicUtils.returnPlayerHelpedByTroop(memberDoc, memberData, helpedByPlayerDoc, helpedByPlayerData, updateFuncs, self.dataService)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpedByPlayerDoc, helpedByPlayerData])
			})
		}
		var returnHelpToTroop = function(helpToTroop){
			var beHelpedPlayerDoc = null
			var beHelpedPlayerData = []
			return self.cacheService.findPlayerAsync(helpToTroop.id).then(function(theDoc){
				beHelpedPlayerDoc = theDoc
				DataUtils.refreshPlayerResources(beHelpedPlayerDoc)
				beHelpedPlayerData.push(["resources", beHelpedPlayerData.resources])
				LogicUtils.returnPlayerHelpToTroop(allianceDoc, allianceData, memberDoc, memberData, beHelpedPlayerDoc, beHelpedPlayerData, updateFuncs, self.dataService)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])
			})
		}
		var returnVillageTroops = function(villageEvent){
			pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, villageEvent]);
			allianceData.push(["villageEvents." + allianceDoc.villageEvents.indexOf(villageEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.villageEvents, villageEvent);
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "villageEvents", villageEvent.id])

			LogicUtils.removePlayerTroopOut(memberDoc, villageEvent.playerData.dragon.type);
			DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[villageEvent.playerData.dragon.type]);
			memberDoc.dragons[villageEvent.playerData.dragon.type].status = Consts.DragonStatus.Free
			memberData.push(["dragons." + villageEvent.playerData.dragon.type, memberDoc.dragons[villageEvent.playerData.dragon.type]])
			LogicUtils.addPlayerSoldiers(memberDoc, memberData, villageEvent.playerData.soldiers)
			DataUtils.addPlayerWoundedSoldiers(memberDoc, memberData, villageEvent.playerData.woundedSoldiers)
			var resourceCollected = Math.floor(villageEvent.villageData.collectTotal
				* ((Date.now() - villageEvent.startTime)
				/ (villageEvent.finishTime - villageEvent.startTime))
			)
			if(villageEvent.toAlliance.id === allianceDoc._id){
				var village = LogicUtils.getAllianceVillageById(allianceDoc, villageEvent.villageData.id)
				village.villageEvent = null;
				allianceData.push(["villages." + allianceDoc.villages.indexOf(village) + ".villageEvent", village.villageEvent])
				var originalRewards = villageEvent.playerData.rewards
				var resourceName = village.name.slice(0, -7)
				var newRewards = [{
					type:"resources",
					name:resourceName,
					count:resourceCollected
				}]
				LogicUtils.mergeRewards(originalRewards, newRewards)
				village.resource -= resourceCollected
				allianceData.push(["villages." + allianceDoc.villages.indexOf(village) + ".resource", village.resource])
				var collectReport = ReportUtils.createCollectVillageReport(allianceDoc, village, newRewards)
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, memberDoc._id, collectReport])
				return self.dataService.addPlayerRewardsAsync(memberDoc, memberData, 'kickAllianceMemberOff', null, originalRewards, false);
			}else{
				var targetAllianceDoc = null;
				var targetAllianceData = [];
				return self.cacheService.findAllianceAsync(villageEvent.toAlliance.id).then(function(doc){
					targetAllianceDoc = doc;
					var village = LogicUtils.getAllianceVillageById(targetAllianceDoc, villageEvent.villageData.id)
					village.villageEvent = null;
					targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".villageEvent", village.villageEvent])
					var originalRewards = villageEvent.playerData.rewards
					var resourceName = village.name.slice(0, -7)
					var newRewards = [{
						type:"resources",
						name:resourceName,
						count:resourceCollected
					}]
					LogicUtils.mergeRewards(originalRewards, newRewards)

					village.resource -= resourceCollected
					targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
					var collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, newRewards)
					pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, memberDoc._id, collectReport])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, targetAllianceDoc, targetAllianceData]);
					return self.dataService.addPlayerRewardsAsync(memberDoc, memberData, 'kickAllianceMemberOff', null, originalRewards, false);
				})
			}
		}

		var funcs = [];
		_.each(allianceDoc.villageEvents, function(villageEvent){
			if(villageEvent.playerData.id === memberDoc._id){
				funcs.push(returnVillageTroops(villageEvent));
			}
		})
		if(!!memberDoc.helpedByTroop) funcs.push(returnHelpedByTroop(memberDoc.helpedByTroop))
		if(!!memberDoc.helpToTroop) funcs.push(returnHelpToTroop(memberDoc.helpToTroop))
		return Promise.all(funcs)
	}).then(function(){
		if(!!memberDoc.logicServerId){
			eventFuncs.push([self.dataService, self.dataService.removePlayerFromAllianceChannelAsync, allianceDoc._id, memberDoc])
			eventFuncs.push([self.cacheService, self.cacheService.removeFromViewedMapIndexChannelAsync, memberDoc._id, memberDoc.logicServerId]);
			eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, memberDoc, {
				allianceId:"",
				allianceTag:""
			}])
		}
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, memberDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).then(
		function(){
			var allianceName = allianceDoc.basicInfo.name
			var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceKickMemberOffTitle")
			var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceKickMemberOffContent")
			self.dataService.sendSysMailAsync(memberId, titleKey, [allianceName], contentKey, [allianceName])
		},
		function(e){
			if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
			callback(e)
		}
	)
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
	var lockPairs = [];
	var pushFuncs = [];
	var playerObject = null;
	var memberObject = null;
	var previousTitleName = null
	var currentTitleName = null
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isEqual(playerObject.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(ErrorUtils.youAreNotTheAllianceArchon(playerId, allianceId))
		}
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		playerObject.title = Consts.AllianceTitle.Member
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".title", playerObject.title])
		previousTitleName = '__' + memberObject.title
		memberObject.title = Consts.AllianceTitle.Archon
		currentTitleName = '__' + memberObject.title
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".title", memberObject.title])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, playerObject.name, [memberObject.name]);
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).then(
		function(){
			var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedTitle")
			var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceTitleBeModifyedContent")
			self.dataService.sendSysMailAsync(memberId, titleKey, [], contentKey, [previousTitleName, currentTitleName])
		},
		function(e){
			if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
			callback(e)
		}
	)
}