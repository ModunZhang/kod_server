"use strict"

var _ = require("underscore")
var Promise = require("bluebird")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var MapUtils = require("../../../utils/mapUtils")
var LogicUtils = require("../../../utils/logicUtils")
var DataUtils = require("../../../utils/dataUtils")
var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")

var GameDatas = require("../../../datas/GameDatas")
var AllianceInit = GameDatas.AllianceInitData
var AllianceBuildingConfig = GameDatas.AllianceBuilding

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
 * 重置联盟地图装饰物
 * @param allianceDoc
 * @param allianceData
 */
var ResetMapDecorates = function(allianceDoc, allianceData){
	var mapObjects = allianceDoc.mapObjects
	var map = MapUtils.buildMap(mapObjects)
	_.each(AllianceInit.decorateCount, function(countConfig, key){
		var countHas = LogicUtils.getAllianceDecorateObjectCountByType(allianceDoc, key)
		var config = AllianceInit.buildingType[key]
		var width = config.width
		var height = config.height
		var count = countConfig.count - countHas
		for(var i = 0; i < count; i++){
			var rect = MapUtils.getRect(map, width, height)
			if(_.isObject(rect)){
				var mapObject = MapUtils.addMapObject(map, mapObjects, {
					x:rect.x,
					y:rect.y,
					width:rect.width,
					height:rect.height
				}, key)
				allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject), mapObject])
			}
		}
	})
}

/**
 * 重置联盟村落
 * @param allianceDoc
 * @param allianceData
 * @param enemyAllianceDoc
 */
var ResetVillages = function(allianceDoc, allianceData, enemyAllianceDoc){
	var getVillageCountByType = function(villageType){
		var count = 0
		_.each(allianceDoc.villages, function(village){
			if(_.isEqual(village.type, villageType)) count += 1
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
		var mapObject = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, village.location)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject), null])
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, mapObject)
	})

	var orderHallLevel = allianceDoc.buildings.orderHall.level
	var orderHallConfig = AllianceBuildingConfig.orderHall[orderHallLevel]
	var villageTypeConfigs = DataUtils.getAllianceVillageTypeConfigs()
	var map = MapUtils.buildMap(allianceDoc.mapObjects)
	var mapObjects = allianceDoc.mapObjects
	_.each(villageTypeConfigs, function(config){
		var villageWidth = config.width
		var villageHeight = config.height
		var villageTotalCount = orderHallConfig[config.type + "Count"]
		var villageCurrentCount = getVillageCountByType(config.type)
		var villageNeedTobeCreated = villageTotalCount - villageCurrentCount
		for(var i = 0; i < villageNeedTobeCreated; i++){
			var rect = MapUtils.getRect(map, villageWidth, villageHeight)
			var mapObject = MapUtils.addMapObject(map, mapObjects, {
				x:rect.x,
				y:rect.y,
				width:rect.width,
				height:rect.height
			}, config.type)
			allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject), mapObject])
			var villageObject = DataUtils.addAllianceVillageObject(allianceDoc, mapObject)
			allianceData.push(["villages." + allianceDoc.villages.indexOf(villageObject), villageObject])
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
		ResetMapDecorates(allianceDoc, allianceData)
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
	this.allianceDao.findAllKeysAsync().then(function(allianceIds){
		return ResolveAllAlliances.call(self, allianceIds)
	}).then(function(){
	}).catch(function(e){
		errorLogger.error("handle time.cron.timeCron:resetAllianceStatus Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle time.cron.timeCron:resetAllianceStatus Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}