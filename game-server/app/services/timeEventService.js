"use strict"

/**
 * Created by modun on 14-10-28.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Consts = require("../consts/consts")


var TimeEventService = function(app){
	this.app = app
	this.eventServerId = "event-server-1"
	this.pushService = app.get("pushService")
}
module.exports = TimeEventService
var pro = TimeEventService.prototype


/**
 * 添加时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 */
pro.addTimeEvent = function(key, eventType, eventId, finishTime, callback){
	this.app.rpc.event.eventRemote.addTimeEvent.toServer(this.eventServerId, key, eventType, eventId, finishTime - Date.now(), callback)
}

/**
 * 移除时间回调
 * @param key
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(key, eventId, callback){
	this.app.rpc.event.eventRemote.removeTimeEvent.toServer(this.eventServerId, key, eventId, callback)
}

/**
 * 更新时间回调
 * @param key
 * @param eventId
 * @param newFinishTime
 * @param callback
 */
pro.updateTimeEvent = function(key, eventId, newFinishTime, callback){
	this.app.rpc.event.eventRemote.updateTimeEvent.toServer(this.eventServerId, key, eventId, newFinishTime - Date.now(), callback)
}

/**
 * 清除指定Key的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEvents = function(key, callback){
	this.app.rpc.event.eventRemote.clearTimeEventsByKey.toServer(this.eventServerId, key, callback)
}


/**
 * 添加玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addPlayerTimeEvent = function(playerDoc, eventType, eventId, finishTime, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.addTimeEvent(key, eventType, eventId, finishTime, callback)
}

/**
 * 移除玩家时间回调
 * @param playerDoc
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removePlayerTimeEvent = function(playerDoc, eventId, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.removeTimeEvent(key, eventId, callback)
}

/**
 * 更新玩家时间回调
 * @param playerDoc
 * @param eventId
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updatePlayerTimeEvent = function(playerDoc, eventId, newFinishTime, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.updateTimeEvent(key, eventId, newFinishTime, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param playerDoc
 * @param callback
 * @returns {*}
 */
pro.clearPlayerTimeEvents = function(playerDoc, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.clearTimeEvents(key, callback)
}

/**
 * 添加联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addAllianceTimeEvent = function(allianceDoc, eventType, eventId, finishTime, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.addTimeEvent(key, eventType, eventId, finishTime, callback)
}

/**
 * 移除联盟时间回调
 * @param allianceDoc
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removeAllianceTimeEvent = function(allianceDoc, eventId, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.removeTimeEvent(key, eventId, callback)
}

/**
 * 更新联盟时间回调
 * @param allianceDoc
 * @param eventId
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updateAllianceTimeEvent = function(allianceDoc, eventId, newFinishTime, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.updateTimeEvent(key, eventId, newFinishTime, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param allianceDoc
 * @param callback
 * @returns {*}
 */
pro.clearAllianceTimeEvents = function(allianceDoc, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.clearTimeEvents(key, callback)
}

/**
 * 刷新玩家时间数据
 * @param playerDoc
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @returns {{pushFuncs: Array, playerData: {}, allianceData: {}}}
 */
pro.refreshPlayerEvents = function(playerDoc, allianceDoc, eventType, eventId){
	var self = this
	var pushFuncs = []
	var playerData = {}
	var allianceData = {}
	var event = null
	var helpEvent = null
	LogicUtils.refreshPlayerResources(playerDoc)
	if(_.isEqual(eventType, "buildingEvents")){
		event = LogicUtils.getEventById(playerDoc.buildingEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.buildingEvents, event)
		var building = LogicUtils.getBuildingByEvent(playerDoc, event)
		building.level += 1
		LogicUtils.updateBuildingsLevel(playerDoc)
		playerData.buildings = playerDoc.buildings
		playerData.towers = playerDoc.towers
		playerData.buildingEvents = playerDoc.buildingEvents
		pushFuncs.push([self.pushService, self.pushService.onBuildingLevelUpAsync, playerDoc, event.location])
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
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
		pushFuncs.push([self.pushService, self.pushService.onHouseLevelUpAsync, playerDoc, event.buildingLocation, event.houseLocation])
		if(_.isEqual("dwelling", house.type)){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
			LogicUtils.refreshPlayerResources(playerDoc)

		}
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "towerEvents")){
		event = LogicUtils.getEventById(playerDoc.towerEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.towerEvents, event)
		var tower = LogicUtils.getTowerByEvent(playerDoc, event)
		tower.level += 1
		playerData.towers = playerDoc.towers
		playerData.towerEvents = playerDoc.towerEvents
		pushFuncs.push([self.pushService, self.pushService.onTowerLevelUpAsync, playerDoc, event.location])
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "wallEvents")){
		event = LogicUtils.getEventById(playerDoc.wallEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.wallEvents, event)
		var wall = playerDoc.wall
		wall.level += 1
		playerData.wall = playerDoc.wall
		playerData.wallEvents = playerDoc.wallEvents
		pushFuncs.push([self.pushService, self.pushService.onWallLevelUpAsync, playerDoc])
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
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
		pushFuncs.push([self.pushService, self.pushService.onMakeMaterialFinishedAsync, playerDoc, event])
	}else if(_.isEqual(eventType, "soldierEvents")){
		event = LogicUtils.getEventById(playerDoc.soldierEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.soldierEvents, event)
		playerDoc.soldiers[event.name] += event.count
		playerData.soldiers = playerDoc.soldiers
		playerData.soldierEvents = playerDoc.soldierEvents
		pushFuncs.push([self.pushService, self.pushService.onRecruitSoldierSuccessAsync, playerDoc, event.name, event.count])
	}else if(_.isEqual(eventType, "dragonEquipmentEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonEquipmentEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.dragonEquipmentEvents, event)
		playerDoc.dragonEquipments[event.name] += 1
		playerData.dragonEquipments = playerDoc.dragonEquipments
		playerData.dragonEquipmentEvents = playerDoc.dragonEquipmentEvents
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
	}else if(_.isEqual(eventType, "coinEvents")){
		event = LogicUtils.getEventById(playerDoc.coinEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.coinEvents, event)
		playerDoc.resources.coin += event.coin
		playerData.resources = playerDoc.resources
		playerData.coinEvents = playerDoc.coinEvents
		pushFuncs.push([self.pushService, self.pushService.onImposeSuccessAsync, playerDoc, event.coin])
	}

	LogicUtils.refreshPlayerPower(playerDoc)
	playerData.basicInfo = playerDoc.basicInfo
	playerData.resources = playerDoc.resources

	var response = {
		pushFuncs:pushFuncs, playerData:playerData, allianceData:allianceData
	}

	return response
}