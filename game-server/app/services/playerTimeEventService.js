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
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var PlayerTimeEventService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.dataService = app.get("dataService")
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
	var playerData = []
	this.dataService.findPlayerAsync(playerId, true).then(function(doc){
		playerDoc = doc
		var event = LogicUtils.getEventById(playerDoc[eventType], eventId)
		if(!_.isObject(event)) return Promise.reject(ErrorUtils.playerEventNotExist(playerId, eventType, eventId))

		self.onPlayerEvent(playerDoc, playerData, eventType, eventId)

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * @param playerData
 * @param eventType
 * @param eventId
 * @returns {{playerData: Array, allianceData: Array}}
 */
pro.onPlayerEvent = function(playerDoc, playerData, eventType, eventId){
	var event = null
	var dragon = null
	var building = null

	DataUtils.refreshPlayerResources(playerDoc)
	playerData.push(["resources", playerDoc.resources])

	if(_.isEqual(eventType, "buildingEvents")){
		event = LogicUtils.getEventById(playerDoc.buildingEvents, eventId)
		playerData.push(["buildingEvents." + playerDoc.buildingEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.buildingEvents, event)
		building = LogicUtils.getBuildingByEvent(playerDoc, event)
		building.level += 1
		playerData.push(["buildings.location_" + building.location + ".level", building.level])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
		TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, building.type, building.level)
	}else if(_.isEqual(eventType, "houseEvents")){
		event = LogicUtils.getEventById(playerDoc.houseEvents, eventId)
		building = playerDoc.buildings["location_" + event.buildingLocation]
		playerData.push(["houseEvents." + playerDoc.houseEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.houseEvents, event)
		var house = LogicUtils.getHouseByEvent(playerDoc, event)
		house.level += 1
		playerData.push(["buildings.location_" + event.buildingLocation + ".houses." + building.houses.indexOf(house) + ".level", house.level])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
		TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, house.type, house.level)
		if(_.isEqual("dwelling", house.type)){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
			DataUtils.refreshPlayerResources(playerDoc)
		}
	}else if(_.isEqual(eventType, "materialEvents")){
		event = LogicUtils.getEventById(playerDoc.materialEvents, eventId)
		event.finishTime = 0
		playerData.push(["materialEvents." + playerDoc.materialEvents.indexOf(event) + ".finishTime", 0])
		if(_.isEqual(event.category, Consts.MaterialType.BuildingMaterials)){
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.MakeBuildingMaterials)
		}
	}else if(_.isEqual(eventType, "soldierEvents")){
		event = LogicUtils.getEventById(playerDoc.soldierEvents, eventId)
		playerData.push(["soldierEvents." + playerDoc.soldierEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.soldierEvents, event)
		playerDoc.soldiers[event.name] += event.count
		playerData.push(["soldiers." + event.name, playerDoc.soldiers[event.name]])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.RecruitSoldiers)
		TaskUtils.finishSoldierCountTaskIfNeed(playerDoc, playerData, event.name)
	}else if(_.isEqual(eventType, "dragonEquipmentEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonEquipmentEvents, eventId)
		playerData.push(["dragonEquipmentEvents." + playerDoc.dragonEquipmentEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.dragonEquipmentEvents, event)
		playerDoc.dragonEquipments[event.name] += 1
		playerData.push(["dragonEquipments." + event.name, playerDoc.dragonEquipments[event.name]])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.MakeDragonEquipment)
	}else if(_.isEqual(eventType, "treatSoldierEvents")){
		event = LogicUtils.getEventById(playerDoc.treatSoldierEvents, eventId)
		playerData.push(["treatSoldierEvents." + playerDoc.treatSoldierEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.treatSoldierEvents, event)
		_.each(event.soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})
	}else if(_.isEqual(eventType, "dragonHatchEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonHatchEvents, eventId)
		playerData.push(["dragonHatchEvents." + playerDoc.dragonHatchEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.dragonHatchEvents, event)
		dragon = playerDoc.dragons[event.dragonType]
		dragon.star = 1
		dragon.level = 1
		dragon.hp = DataUtils.getDragonMaxHp(dragon)
		dragon.hpRefreshTime = Date.now()
		playerData.push(["dragons." + dragon.type, dragon])
	}else if(_.isEqual(eventType, "dragonDeathEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonDeathEvents, eventId)
		playerData.push(["dragonDeathEvents." + playerDoc.dragonDeathEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.dragonDeathEvents, event)
		dragon = playerDoc.dragons[event.dragonType]
		dragon.hp = 1
		dragon.hpRefreshTime = Date.now()
		playerData.push(["dragons." + dragon.type + ".hp", dragon.hp])
		playerData.push(["dragons." + dragon.type + ".hpRefreshTime", dragon.hpRefreshTime])
	}else if(_.isEqual(eventType, "dailyQuestEvents")){
		event = LogicUtils.getEventById(playerDoc.dailyQuestEvents, eventId)
		event.finishTime = 0
		playerData.push(["dailyQuestEvents." + playerDoc.dailyQuestEvents.indexOf(event) + ".finishTime", event.finishTime])
	}else if(_.isEqual(eventType, "productionTechEvents")){
		event = LogicUtils.getEventById(playerDoc.productionTechEvents, eventId)
		playerData.push(["productionTechEvents." + playerDoc.productionTechEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.productionTechEvents, event)
		var productionTech = playerDoc.productionTechs[event.name]
		productionTech.level += 1
		playerData.push(["productionTechs." + event.name + ".level", productionTech.level])
		TaskUtils.finishProductionTechTaskIfNeed(playerDoc, playerData, event.name, productionTech.level)
	}else if(_.isEqual(eventType, "militaryTechEvents")){
		event = LogicUtils.getEventById(playerDoc.militaryTechEvents, eventId)
		playerData.push(["militaryTechEvents." + playerDoc.militaryTechEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.militaryTechEvents, event)
		var militaryTech = playerDoc.militaryTechs[event.name]
		militaryTech.level += 1
		playerData.push(["militaryTechs." + event.name + ".level", militaryTech.level])
		TaskUtils.finishMilitaryTechTaskIfNeed(playerDoc, playerData, event.name, militaryTech.level)
	}else if(_.isEqual(eventType, "soldierStarEvents")){
		event = LogicUtils.getEventById(playerDoc.soldierStarEvents, eventId)
		playerData.push(["soldierStarEvents." + playerDoc.soldierStarEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.soldierStarEvents, event)
		playerDoc.soldierStars[event.name]+= 1
		playerData.push(["soldierStars." + event.name, playerDoc.soldierStars[event.name]])
		TaskUtils.finishSoldierStarTaskIfNeed(playerDoc, playerData, event.name, playerDoc.soldierStars[event.name])
	}else if(_.isEqual(eventType, "vipEvents")){
		event = LogicUtils.getEventById(playerDoc.vipEvents, eventId)
		playerData.push(["vipEvents." + playerDoc.vipEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.vipEvents, event)
	}else if(_.isEqual(eventType, "itemEvents")){
		event = LogicUtils.getEventById(playerDoc.itemEvents, eventId)
		playerData.push(["itemEvents." + playerDoc.itemEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.itemEvents, event)
	}

	DataUtils.refreshPlayerPower(playerDoc, playerData)
	TaskUtils.finishPlayerPowerTaskIfNeed(playerDoc, playerData)
}