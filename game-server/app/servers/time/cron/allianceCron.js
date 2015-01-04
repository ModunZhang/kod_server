"use strict"

var _ = require("underscore")
var Promise = require("bluebird")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var MapUtils = require("../../../utils/mapUtils")
var LogicUtils = require("../../../utils/logicUtils")
var DataUtils = require("../../../utils/dataUtils")
var Consts = require("../../../consts/consts")

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
	this.playerDao = app.get("playerDao")
	this.allianceDao = app.get("allianceDao")
	this.channelService = app.get("channelService")
	this.pushService = app.get("pushService")
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
		allianceData.__members.push({
			type:Consts.DataChangedType.Edit,
			data:member
		})
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
	if(!_.isArray(allianceData.__mapObjects)) allianceData.__mapObjects = []
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
				allianceData.__mapObjects.push({
					type:Consts.DataChangedType.Add,
					data:mapObject
				})
			}
		}
	})
	if(_.isEmpty(allianceData.mapObjects)) delete allianceData.mapObjects
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
	if(!_.isArray(allianceData.__villages)) allianceData.__villages = []
	if(!_.isArray(allianceData.__mapObjects)) allianceData.__mapObjects = []
	var villageTobeRemoved = []
	_.each(allianceDoc.villages, function(village){
		var villageEvent = _.find(allianceDoc.villageEvents, function(villageEvent){
			return _.isEqual(villageEvent.villageData.id, village.id)
		})
		if(!_.isObject(villageEvent)){
			villageEvent = _.find(enemyAllianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, village.id)
			})
		}
		if(!_.isObject(villageEvent)) villageTobeRemoved.push(village)
	})
	_.each(villageTobeRemoved, function(village){
		LogicUtils.removeItemInArray(allianceDoc.villages, village)
		var mapObject = LogicUtils.removeAllianceMapObjectByLocation(allianceDoc, village.location)
		allianceData.__villages.push({
			type:Consts.DataChangedType.Remove,
			data:village
		})
		allianceData.__mapObjects.push({
			type:Consts.DataChangedType.Remove,
			data:mapObject
		})
	})

	var villageTypeConfigs = DataUtils.getAllianceVillageTypeConfigs()
	_.each(villageTypeConfigs, function(config){
		var villageWidth = config.width
		var villageHeight = config.height
		var villageTotalCount = orderHallConfig[config.type + "Count"]
		var villageCurrentCount = getVillageCountByType(config.type)
		var villageNeedTobeCreated = villageTotalCount - villageCurrentCount
		for(var i = 0; i < villageNeedTobeCreated; i++){
			var rect = self.getRect(map, villageWidth, villageHeight)
			var mapObject = self.addMapObject(map, mapObjects, {x:rect.x, y:rect.y, width:rect.width, height:rect.height}, config.type)
			allianceData.__mapObjects.push({
				type:Consts.DataChangedType.Add,
				data:mapObject
			})
		}
	})
}

/**
 * 重置某个联盟的状态
 * @param allianceId
 * @returns {*}
 */
var resolveOneAlliance = function(allianceId){
	var allianceDoc = null
	var enemyAllianceDoc = null
	var allianceData = {}
	var enemyAllianceData = {}
	var updateFuncs = []
	var pushFuncs = []
	return self.allianceDao.findByIdAsync(allianceId, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)){
			var allianceFight = allianceDoc.allianceFight
			var enemyAllianceId = _.isEqual(allianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
			return self.allianceDao.findByIdAsync(enemyAllianceId, true)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(_.isObject(allianceDoc.allianceFight)){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			enemyAllianceDoc = doc
		}
		ResetDonateStatus(allianceDoc, allianceData)
		ResetMapDecorates(allianceDoc, allianceData, enemyAllianceDoc, enemyAllianceData)
		ResetVillages(allianceDoc, allianceData, enemyAllianceDoc, enemyAllianceData)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, enemyAllianceDoc._id])
		if(!_.isEmpty(enemyAllianceData)){
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc._id, enemyAllianceData])
		}
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	})
}

pro.resetAllianceStatus = function(){
	var self = this
	this.allianceDao.findAllKeysAsync().then(function(allianceIds){
		var funcs = []
		_.each(allianceIds, function(allianceId){
			funcs.push(resolveOneAlliance(allianceId))
		})
		return Promise.all(funcs)
	}).catch(function(e){
		errorLogger.error("handle time.cron.resetDonateStatus Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle time.cron.resetDonateStatus Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}