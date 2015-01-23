"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var MapUtils = require("../utils/mapUtils")
var MarchUtils = require("../utils/marchUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var AllianceApiService3 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceApiService3
var pro = AllianceApiService3.prototype

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
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
 * 进攻联盟圣地
 * @param playerId
 * @param shrineEventId
 * @param dragonType
 * @param soldiers
 * @param callback
 */
pro.attackAllianceShrine = function(playerId, shrineEventId, dragonType, soldiers, callback){
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
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		dragon.status = Consts.DragonStatus.March
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(new Error("所选择的龙领导力不足"))
		playerData.soldiers = {}
		_.each(soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] -= soldier.count
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
		var event = MarchUtils.createAttackAllianceShrineMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, shrineEventId)
		allianceDoc.attackMarchEvents.push(event)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", event.id, event.arriveTime])
		allianceData.__attackMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
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
 * 请求联盟进行联盟战
 * @param playerId
 * @param callback
 */
pro.requestAllianceToFight = function(playerId, callback){
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
	var updateFuncs = []
	var pushFuncs = []
	var eventFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc))return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)){
			return Promise.reject(new Error("联盟正处于战争准备期或战争期"))
		}
		var findedPlayerId = _.find(allianceDoc.fightRequests, function(thePlayerId){
			return _.isEqual(thePlayerId, playerId)
		})
		if(_.isEqual(playerId, findedPlayerId)) return Promise.reject(new Error("已经发送过开战请求"))
		allianceDoc.fightRequests.push(playerId)
		allianceData.__fightRequests = [{
			type:Consts.DataChangedType.Add,
			data:playerId
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
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
			return Promise.reject(new Error("联盟正在战争准备期或战争期"))
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
		attackAllianceDoc.fightRequests = []
		defenceAllianceDoc.fightRequests = []
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime])
		var attackAllianceData = {}
		attackAllianceData.fightRequests = []
		attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
		attackAllianceData.allianceFight = attackAllianceDoc.allianceFight
		attackAllianceData.enemyAllianceDoc = LogicUtils.getAllianceViewData(defenceAllianceDoc)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		var defenceAllianceData = {}
		defenceAllianceData.fightRequests = []
		defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo
		defenceAllianceData.allianceFight = defenceAllianceDoc.allianceFight
		defenceAllianceData.enemyAllianceDoc = LogicUtils.getAllianceViewData(attackAllianceDoc)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
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
 * 复仇其他联盟
 * @param playerId
 * @param reportId
 * @param callback
 */
pro.revengeAlliance = function(playerId, reportId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(reportId)){
		callback(new Error("reportId 不合法"))
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
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "revengeAlliance")){
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
			return Promise.reject(new Error("联盟正在战争准备期或战争期"))
		}
		var report = _.find(attackAllianceDoc.allianceFightReports, function(report){
			return _.isEqual(report.id, reportId)
		})
		if(!_.isObject(report)) return Promise.reject(new Error("联盟战报不存在"))
		var isWin = _.isEqual(attackAllianceDoc._id, report.attackAllianceId) && _.isEqual(report.fightResult, Consts.FightResult.AttackWin)
		isWin = isWin ? isWin : _.isEqual(attackAllianceDoc._id, report.defenceAllianceId) && _.isEqual(report.fightResult, Consts.FightResult.DefenceWin)
		if(isWin) return Promise.reject(new Error("胜利方不能发起复仇"))
		if(DataUtils.isAllianceRevengeTimeExpired(report)) return Promise.reject(new Error("超过最长复仇期限"))
		return self.allianceDao.findByIdAsync(report.enemyAlliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		defenceAllianceDoc = doc
		if(!_.isEqual(defenceAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace)) return Promise.reject(new Error("目标联盟未处于和平期,不能发起复仇"))
		var now = Date.now()
		var finishTime = now + DataUtils.getAllianceFightPrepareTime()
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		attackAllianceDoc.fightRequests = []
		defenceAllianceDoc.fightRequests = []
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime])
		var attackAllianceData = {}
		attackAllianceData.fightRequests = []
		attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
		attackAllianceData.allianceFight = attackAllianceDoc.allianceFight
		attackAllianceData.enemyAllianceDoc = LogicUtils.getAllianceViewData(defenceAllianceDoc)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		var defenceAllianceData = {}
		defenceAllianceData.fightRequests = []
		defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo
		defenceAllianceData.allianceFight = defenceAllianceDoc.allianceFight
		defenceAllianceData.enemyAllianceDoc = LogicUtils.getAllianceViewData(attackAllianceDoc)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
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