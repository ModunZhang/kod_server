"use strict"

var _ = require("underscore")
var Promise = require("bluebird")

var CommonUtils = require("../../../utils/utils")
var LogicUtils = require("../../../utils/logicUtils")
var DataUtils = require("../../../utils/dataUtils")
var MapUtils = require("../../../utils/mapUtils")
var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")

var GameDatas = require("../../../datas/GameDatas")
var AllianceBuilding = GameDatas.AllianceBuilding
var AllianceInitData = GameDatas.AllianceInitData

/**
 * Created by modun on 14-10-22.
 */

module.exports = function(app){
	return new Cron(app)
}
var Cron = function(app){
	this.app = app
	this.redis = app.get("redis")
	this.playerDao = app.get("playerDao")
	this.allianceDao = app.get("allianceDao")
	this.channelService = app.get("channelService")
	this.globalChannelService = app.get("globalChannelService")
	this.logService = app.get("logService")
}
var pro = Cron.prototype

/**
 * 重置联盟玩家捐赠状态
 * @param allianceDoc
 * @param allianceData
 */
var ResetDonateStatus = function(allianceDoc, allianceData){
	if(!_.isArray(allianceData.__members)) allianceData.__members = []
	_.each(allianceDoc.members, function(member){
		var donateStatus = {
			wood:1,
			stone:1,
			iron:1,
			food:1,
			coin:1,
			gem:1
		}
		member.donateStatus = donateStatus
		allianceData.push(["members." + allianceDoc.members.indexOf(member) + ".donateStatus", member.donateStatus])
	})
}

/**
 * 重置联盟村落
 * @param allianceDoc
 * @param allianceData
 * @param enemyAllianceDoc
 */
var ResetVillages = function(allianceDoc, allianceData, enemyAllianceDoc){
	var getVillageCountByName = function(villageName){
		var count = 0
		_.each(allianceDoc.villages, function(village){
			if(_.isEqual(village.name, villageName)) count += 1
		})
		return count
	}

	var villageTobeRemoved = []
	_.each(allianceDoc.villages, function(village){
		var villageEvent = _.find(allianceDoc.villageEvents, function(villageEvent){
			return _.isEqual(villageEvent.villageData.id, village.id)
		})
		if(!_.isObject(villageEvent) && _.isObject(enemyAllianceDoc)){
			villageEvent = _.find(enemyAllianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, village.id)
			})
		}
		if(!_.isObject(villageEvent)) villageTobeRemoved.push(village)
	})
	_.each(villageTobeRemoved, function(village){
		allianceData.push(["villages." + allianceDoc.villages.indexOf(village), null])
		LogicUtils.removeItemInArray(allianceDoc.villages, village)
		var villageMapObject = LogicUtils.getAllianceMapObjectById(allianceDoc, village.id)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(villageMapObject), null])
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, villageMapObject)
	})

	var mapObjects = allianceDoc.mapObjects
	var map = MapUtils.buildMap(mapObjects)
	var orderHallLevel = _.find(allianceDoc.buildings, function(building){
		return _.isEqual(building.name, Consts.AllianceBuildingNames.OrderHall)
	}).level
	var orderHallConfig = AllianceBuilding.orderHall[orderHallLevel]
	var villageTypeConfigs = DataUtils.getAllianceVillageTypeConfigs()
	_.each(villageTypeConfigs, function(typeConfig){
		var villageTotalCount = orderHallConfig[typeConfig.name + "Count"]
		var villageCurrentCount = getVillageCountByName(typeConfig.name)
		var villageNeedTobeCreated = villageTotalCount - villageCurrentCount
		var config = AllianceInitData.buildingName[typeConfig.name]
		var width = config.width
		var height = config.height
		for(var i = 0; i < villageNeedTobeCreated; i ++){
			var rect = MapUtils.getRect(map, width, height)
			if(_.isObject(rect)){
				var villageMapObject = MapUtils.addMapObject(map, mapObjects, rect, typeConfig.name)
				allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(villageMapObject), villageMapObject])
				var village = DataUtils.addAllianceVillageObject(allianceDoc, villageMapObject)
				allianceData.push(["villages." + allianceDoc.villages.indexOf(village), village])
			}
		}
	})
}

/**
 * 重置某个联盟的状态
 * @param allianceId
 * @returns {*}
 */
var ResolveOneAlliance = function(allianceId){
	var self = this
	var allianceDoc = null
	var enemyAllianceDoc = null
	var allianceData = []
	var enemyAllianceData = {}
	var updateFuncs = []
	var pushFuncs = []
	return this.allianceDao.findAsync(allianceId, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)){
			var allianceFight = allianceDoc.allianceFight
			var enemyAllianceId = _.isEqual(allianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
			return self.allianceDao.findAsync(enemyAllianceId, true)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(_.isObject(allianceDoc.allianceFight)){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			enemyAllianceDoc = doc
		}
		ResetDonateStatus(allianceDoc, allianceData)
		ResetVillages(allianceDoc, allianceData, enemyAllianceDoc)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var eventName = Events.alliance.onAllianceDataChanged
		var channelName = Consts.AllianceChannelPrefix + allianceDoc._id
		pushFuncs.push([self.globalChannelService, self.globalChannelService.pushMessageAsync, "logic", eventName, allianceData, channelName, null])
		if(_.isObject(enemyAllianceDoc)){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, enemyAllianceDoc._id])
			LogicUtils.putAllianceDataToEnemyAllianceData(allianceData, enemyAllianceData)
			channelName = Consts.AllianceChannelPrefix + enemyAllianceDoc._id
			pushFuncs.push([self.globalChannelService, self.globalChannelService.pushMessageAsync, "logic", eventName, enemyAllianceData, channelName, null])
		}
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	})
}

/**
 * 重置所有联盟状态
 * @param allianceIds
 * @returns {*}
 * @constructor
 */
var ResolveAllAlliances = function(allianceIds){
	var self = this
	if(allianceIds.length > 0){
		var allianceId = allianceIds.shift()
		return ResolveOneAlliance.call(self, allianceId).then(function(){
			return ResolveAllAlliances.call(self, allianceIds)
		})
	}else{
		return Promise.resolve()
	}
}

/**
 * 重置联盟状态
 */
pro.resetAllianceStatus = function(){
	var self = this
	self.logService.onCron("time.timeCron.resetAllianceStatus start", {})
	this.allianceDao.findAllKeysAsync().then(function(allianceIds){
		return ResolveAllAlliances.call(self, allianceIds)
	}).then(function(){
		self.logService.onCron("time.timeCron.resetAllianceStatus finished", {})
	}).catch(function(e){
		self.logService.onCronError("time.timeCron.resetAllianceStatus finished with error", {}, e.stack)
	})
}