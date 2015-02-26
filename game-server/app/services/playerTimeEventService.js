"use strict"

/**
 * Created by modun on 14-7-23.
 */
var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var PlayerTimeEventService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = PlayerTimeEventService
var pro = PlayerTimeEventService.prototype

/**
 * 到达指定时间时,触发的消息
 * @param playerId
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.onTimeEvent = function(playerId, eventType, eventId, callback){
	var self = this
	var pushFuncs = []
	var updateFuncs = []
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId, true).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var event = LogicUtils.getEventById(playerDoc[eventType], eventId)
		if(!_.isObject(event)){
			return Promise.reject(new Error("玩家事件不存在"))
		}
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return self.allianceDao.findByIdAsync(playerDoc.alliance.id, true).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("联盟不存在"))
				}
				allianceDoc = doc
				return Promise.resolve()
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		var playerData = {}
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		var params = self.onPlayerEvent(playerDoc, allianceDoc, eventType, eventId)
		pushFuncs = pushFuncs.concat(params.pushFuncs)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		_.extend(playerData, params.playerData)
		var allianceData = params.allianceData
		if(!_.isEmpty(allianceData)){
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		}else if(_.isObject(allianceDoc)){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		}
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
 * 刷新玩家时间数据
 * @param playerDoc
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @returns {{pushFuncs: Array, playerData: {}, allianceData: {}}}
 */
pro.onPlayerEvent = function(playerDoc, allianceDoc, eventType, eventId){
	var self = this
	var pushFuncs = []
	var playerData = {}
	var allianceData = {}
	var event = null
	var helpEvent = null
	var dragon = null
	var getAllianceHelpEvent = function(eventId){
		return _.find(allianceDoc.helpEvents, function(helpEvent){
			return _.isEqual(helpEvent.eventData.id, eventId)
		})
	}
	DataUtils.refreshPlayerResources(playerDoc)
	if(_.isEqual(eventType, "buildingEvents")){
		event = LogicUtils.getEventById(playerDoc.buildingEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.buildingEvents, event)
		var building = LogicUtils.getBuildingByEvent(playerDoc, event)
		building.level += 1
		LogicUtils.updateBuildingsLevel(playerDoc)
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
		TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, building.type, building.level)
		playerData.buildings = playerDoc.buildings
		playerData.buildingEvents = playerDoc.buildingEvents
		pushFuncs.push([self.pushService, self.pushService.onBuildingLevelUpAsync, playerDoc, event.location])
		if(_.isObject(allianceDoc)){
			helpEvent = getAllianceHelpEvent(event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "houseEvents")){
		event = LogicUtils.getEventById(playerDoc.houseEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.houseEvents, event)
		var house = LogicUtils.getHouseByEvent(playerDoc, event)
		house.level += 1
		playerData.buildings = playerDoc.buildings
		playerData.houseEvents = playerDoc.houseEvents
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
		TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, house.type, house.level)
		pushFuncs.push([self.pushService, self.pushService.onHouseLevelUpAsync, playerDoc, event.buildingLocation, event.houseLocation])
		if(_.isEqual("dwelling", house.type)){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
			DataUtils.refreshPlayerResources(playerDoc)

		}
		if(_.isObject(allianceDoc)){
			helpEvent = getAllianceHelpEvent(event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "materialEvents")){
		event = LogicUtils.getEventById(playerDoc.materialEvents, eventId)
		event.finishTime = 0
		playerData.materialEvents = playerDoc.materialEvents
		if(_.isEqual(event.category, Consts.MaterialType.BuildingMaterials)){
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.MakeBuildingMaterials)
		}
		pushFuncs.push([self.pushService, self.pushService.onMakeMaterialFinishedAsync, playerDoc, event])
	}else if(_.isEqual(eventType, "soldierEvents")){
		event = LogicUtils.getEventById(playerDoc.soldierEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.soldierEvents, event)
		playerDoc.soldiers[event.name] += event.count
		playerData.soldiers = playerDoc.soldiers
		playerData.soldierEvents = playerDoc.soldierEvents
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.RecruitSoldiers)
		TaskUtils.finishSoldierCountTaskIfNeed(playerDoc, playerData, event.name)
		pushFuncs.push([self.pushService, self.pushService.onRecruitSoldierSuccessAsync, playerDoc, event.name, event.count])
	}else if(_.isEqual(eventType, "dragonEquipmentEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonEquipmentEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.dragonEquipmentEvents, event)
		playerDoc.dragonEquipments[event.name] += 1
		playerData.dragonEquipments = playerDoc.dragonEquipments
		playerData.dragonEquipmentEvents = playerDoc.dragonEquipmentEvents
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.MakeDragonEquipment)
		pushFuncs.push([self.pushService, self.pushService.onMakeDragonEquipmentSuccessAsync, playerDoc, event.name])
	}else if(_.isEqual(eventType, "treatSoldierEvents")){
		event = LogicUtils.getEventById(playerDoc.treatSoldierEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.treatSoldierEvents, event)
		_.each(event.soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
		})
		playerData.soldiers = playerDoc.soldiers
		playerData.treatSoldierEvents = playerDoc.treatSoldierEvents
		pushFuncs.push([self.pushService, self.pushService.onTreatSoldierSuccessAsync, playerDoc, event.soldiers])
	}else if(_.isEqual(eventType, "dragonHatchEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonHatchEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.dragonHatchEvents, event)
		playerData.__dragonHatchEvents = [{
			type:Consts.DataChangedType.Remove,
			data:event
		}]
		dragon = playerDoc.dragons[event.dragonType]
		dragon.star = 1
		dragon.level = 1
		dragon.hp = DataUtils.getDragonHpMax(dragon)
		dragon.hpRefreshTime = Date.now()
		playerData.dragons = {}
		playerData.dragons[event.dragonType] = playerDoc.dragons[event.dragonType]
	}else if(_.isEqual(eventType, "dragonDeathEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonDeathEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.dragonDeathEvents, event)
		playerData.__dragonDeathEvents = [{
			type:Consts.DataChangedType.Remove,
			data:event
		}]
		dragon = playerDoc.dragons[event.dragonType]
		dragon.hp = 1
		dragon.hpRefreshTime = Date.now()
		playerData.dragons = {}
		playerData.dragons[event.dragonType] = playerDoc.dragons[event.dragonType]
	}else if(_.isEqual(eventType, "dailyQuestEvents")){
		event = LogicUtils.getEventById(playerDoc.dailyQuestEvents, eventId)
		event.finishTime = 0
		playerData.__dailyQuestEvents = [{
			type:Consts.DataChangedType.Edit,
			data:event
		}]
	}else if(_.isEqual(eventType, "productionTechEvents")){
		event = LogicUtils.getEventById(playerDoc.productionTechEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.productionTechEvents, event)
		var productionTech = playerDoc.productionTechs[event.name]
		productionTech.level += 1
		playerData.productionTechs = {}
		playerData.productionTechs[event.name] = productionTech
		playerData.__productionTechEvents = [{
			type:Consts.DataChangedType.Remove,
			data:event
		}]
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeTech)
		TaskUtils.finishProductionTechTaskIfNeed(playerDoc, playerData, event.name, productionTech.level)
		if(_.isObject(allianceDoc)){
			helpEvent = getAllianceHelpEvent(event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				allianceData.__helpEvents = [{
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				}]
			}
		}
	}else if(_.isEqual(eventType, "militaryTechEvents")){
		event = LogicUtils.getEventById(playerDoc.militaryTechEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.militaryTechEvents, event)
		var militaryTech = playerDoc.militaryTechs[event.name]
		militaryTech.level += 1
		playerData.militaryTechs = {}
		playerData.militaryTechs[event.name] = militaryTech
		playerData.__militaryTechEvents = [{
			type:Consts.DataChangedType.Remove,
			data:event
		}]
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeTech)
		TaskUtils.finishMilitaryTechTaskIfNeed(playerDoc, playerData, event.name, militaryTech.level)
		if(_.isObject(allianceDoc)){
			helpEvent = getAllianceHelpEvent(event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				allianceData.__helpEvents = [{
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				}]
			}
		}
	}else if(_.isEqual(eventType, "soldierStarEvents")){
		event = LogicUtils.getEventById(playerDoc.soldierStarEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.soldierStarEvents, event)
		playerDoc.soldierStars[event.name]+= 1
		playerData.soldierStars = {}
		playerData.soldierStars[event.name] = playerDoc.soldierStars[event.name]
		playerData.__soldierStarEvents = [{
			type:Consts.DataChangedType.Remove,
			data:event
		}]
		TaskUtils.finishSoldierStarTaskIfNeed(playerDoc, playerData, event.name, playerDoc.soldierStars[event.name])
		if(_.isObject(allianceDoc)){
			helpEvent = getAllianceHelpEvent(event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				allianceData.__helpEvents = [{
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				}]
			}
		}
	}else if(_.isEqual(eventType, "vipEvents")){
		event = LogicUtils.getEventById(playerDoc.vipEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.vipEvents, event)
		playerData.__vipEvents = [{
			type:Consts.DataChangedType.Remove,
			data:event
		}]
	}else if(_.isEqual(eventType, "itemEvents")){
		event = LogicUtils.getEventById(playerDoc.itemEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.itemEvents, event)
		playerData.__itemEvents = [{
			type:Consts.DataChangedType.Remove,
			data:event
		}]
	}

	DataUtils.refreshPlayerPower(playerDoc, playerData)
	playerData.basicInfo = playerDoc.basicInfo
	playerData.resources = playerDoc.resources

	var response = {pushFuncs:pushFuncs, playerData:playerData, allianceData:allianceData}
	return response
}