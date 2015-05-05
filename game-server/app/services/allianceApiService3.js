"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var ErrorUtils = require("../utils/errorUtils")
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
	this.apnService = app.get("apnService")
	this.dataService = app.get("dataService")
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
	if(!DataUtils.hasAllianceDonateType(donateType)){
		callback(new Error("donateType "))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(doc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var donateLevel = playerDoc.allianceDonate[donateType]
		var donateConfig = DataUtils.getAllianceDonateConfigByTypeAndLevel(donateType, donateLevel)
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		if(playerDoc.resources[donateType] < donateConfig.count){
			return Promise.reject(ErrorUtils.resourceNotEnough(playerId, "resources", donateType, playerDoc.resources[donateType], donateConfig.count))
		}
		playerDoc.resources[donateType] -= donateConfig.count
		playerDoc.allianceInfo.loyalty += donateConfig.loyalty * (1 + donateConfig.extra)
		playerData.push(["allianceInfo.loyalty", playerDoc.allianceInfo.loyalty])
		DataUtils.updatePlayerDonateLevel(playerDoc, playerData, donateType)

		allianceDoc.basicInfo.honour += donateConfig.honour * (1 + donateConfig.extra)
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		playerObject.loyalty = playerDoc.allianceInfo.loyalty
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".loyalty", playerObject.loyalty])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.DonateToAlliance)

		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 升级联盟建筑
 * @param playerId
 * @param buildingName
 * @param callback
 */
pro.upgradeAllianceBuilding = function(playerId, buildingName, callback){
	if(!_.contains(Consts.AllianceBuildingNames, buildingName)){
		callback(new Error("buildingName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "upgradeAllianceBuilding")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "upgradeAllianceBuilding"))
		}
		var building = DataUtils.getAllianceBuildingByName(allianceDoc, buildingName)
		var upgradeRequired = DataUtils.getAllianceBuildingUpgradeRequired(buildingName, building.level + 1)
		if(upgradeRequired.honour > allianceDoc.basicInfo.honour) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		if(DataUtils.isAllianceBuildingReachMaxLevel(buildingName, building.level)) return Promise.reject(ErrorUtils.allianceBuildingReachMaxLevel(playerId, allianceDoc._id, buildingName))
		allianceDoc.basicInfo.honour -= upgradeRequired.honour
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		if(_.isEqual("shrine", buildingName)){
			LogicUtils.refreshAlliancePerception(allianceDoc)
			allianceData.push(["basicInfo.perception", allianceDoc.basicInfo.perception])
			allianceData.push(["basicInfo.perceptionRefreshTime", allianceDoc.basicInfo.perceptionRefreshTime])
		}
		building.level += 1
		allianceData.push(["buildings." + allianceDoc.buildings.indexOf(building) + ".level", building.level])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		if(_.isEqual(Consts.AllianceBuildingNames.OrderHall, buildingName)){
			var villageNames = DataUtils.getAllianceVillageNames()
			_.each(villageNames, function(name){
				var totalCount = DataUtils.getAllianceVillagesTotalCount(allianceDoc, name)
				var currentCount = DataUtils.getAllianceVillagesCurrentCount(allianceDoc, name)
				DataUtils.createAllianceVillage(allianceDoc, allianceData, enemyAllianceData, name, totalCount - currentCount)
			})
		}

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}

		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 升级联盟村落
 * @param playerId
 * @param villageType
 * @param callback
 */
pro.upgradeAllianceVillage = function(playerId, villageType, callback){
	if(!DataUtils.isAllianceVillageTypeLegal(villageType)){
		callback(new Error("villageType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "upgradeAllianceVillage")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "upgradeAllianceVillage"))
		}
		var villageLevel = allianceDoc.villageLevels[villageType]
		var upgradeRequired = DataUtils.getAllianceVillageUpgradeRequired(villageType, villageLevel)
		if(upgradeRequired.honour > allianceDoc.basicInfo.honour) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		if(DataUtils.isAllianceVillageReachMaxLevel(villageType, villageLevel)) return Promise.reject(ErrorUtils.allianceBuildingReachMaxLevel(playerId, allianceDoc._id, villageType))
		allianceDoc.basicInfo.honour -= upgradeRequired.honour
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		allianceDoc.villageLevels[villageType] += 1
		allianceData.push(["villageLevels." + villageType, allianceDoc.villageLevels[villageType]])

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 移动联盟建筑到新的位置
 * @param playerId
 * @param mapObjectId
 * @param locationX
 * @param locationY
 * @param callback
 */
pro.moveAllianceBuilding = function(playerId, mapObjectId, locationX, locationY, callback){
	if(!_.isString(mapObjectId)){
		callback(new Error("mapObjectId 不合法"))
		return
	}
	if(!_.isNumber(locationX) || locationX % 1 !== 0){
		callback(new Error("locationX 不合法"))
		return
	}
	if(!_.isNumber(locationY) || locationY % 1 !== 0){
		callback(new Error("locationY 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "moveAllianceBuilding")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "moveAllianceBuilding"))
		}
		var mapObject = LogicUtils.getAllianceMapObjectById(allianceDoc, mapObjectId)
		if(_.isEqual(mapObject.name, "member")) return Promise.reject(ErrorUtils.theAllianceBuildingNotAllowMove(playerId, allianceDoc._id, mapObject))
		var honourNeeded = DataUtils.getAllianceMoveBuildingHonourRequired(mapObject.name)
		if(allianceDoc.basicInfo.honour < honourNeeded) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		var mapObjects = allianceDoc.mapObjects
		var buildingSizeInMap = DataUtils.getSizeInAllianceMap(mapObject.name)
		var oldRect = {
			x:mapObject.location.x,
			y:mapObject.location.y,
			width:buildingSizeInMap.width,
			height:buildingSizeInMap.height
		}
		var newRect = {x:locationX, y:locationY, width:buildingSizeInMap.width, height:buildingSizeInMap.height}
		var map = MapUtils.buildMap(mapObjects)
		if(!MapUtils.isRectLegal(map, newRect, oldRect)) return Promise.reject(ErrorUtils.theAllianceBuildingCanNotMoveToTargetPoint(playerId, allianceDoc._id, oldRect, newRect))
		mapObject.location = {x:newRect.x, y:newRect.y}
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject) + ".location", mapObject.location])
		enemyAllianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject) + ".location", mapObject.location])
		allianceDoc.basicInfo.honour -= honourNeeded
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 激活联盟圣地事件
 * @param playerId
 * @param stageName
 * @param callback
 */
pro.activateAllianceShrineStage = function(playerId, stageName, callback){
	if(!DataUtils.isAllianceShrineStageNameLegal(stageName)){
		callback(new Error("stageName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "activateAllianceShrineStage")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "activateAllianceShrineStage"))
		}
		if(DataUtils.isAllianceShrineStageLocked(allianceDoc, stageName)) return Promise.reject(ErrorUtils.theShrineStageIsLocked(playerId, allianceDoc._id, stageName))
		if(LogicUtils.isAllianceShrineStageActivated(allianceDoc, stageName)) return Promise.reject(ErrorUtils.theAllianceShrineEventAlreadyActived(playerId, allianceDoc._id, stageName))
		var activeStageRequired = DataUtils.getAllianceActiveShrineStageRequired(stageName)
		LogicUtils.refreshAlliancePerception(allianceDoc)
		if(allianceDoc.basicInfo.perception < activeStageRequired.perception) return Promise.reject(ErrorUtils.alliancePerceptionNotEnough(playerId, allianceDoc._id, stageName))
		allianceDoc.basicInfo.perception -= activeStageRequired.perception
		allianceData.push(["basicInfo.perception", allianceDoc.basicInfo.perception])
		allianceData.push(["basicInfo.perceptionRefreshTime", allianceDoc.basicInfo.perceptionRefreshTime])
		var event = DataUtils.createAllianceShrineStageEvent(stageName)
		allianceDoc.shrineEvents.push(event)
		allianceData.push(["shrineEvents." + allianceDoc.shrineEvents.indexOf(event), event])

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "shrineEvents", event.id, event.startTime - Date.now()])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}

		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		playerData.push(["dragons." + dragonType, dragon])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon))
		_.each(soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(playerDoc, allianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		var shrineEvent = LogicUtils.getEventById(allianceDoc.shrineEvents, shrineEventId)
		if(!_.isObject(shrineEvent)) return Promise.reject(ErrorUtils.shrineStageEventNotFound(playerId, allianceDoc._id, shrineEventId))
		if(LogicUtils.isPlayerHasTroopMarchToAllianceShrineStage(allianceDoc, shrineEvent, playerId)){
			return Promise.reject(ErrorUtils.youHadSendTroopToTheShrineStage(playerId, allianceDoc._id, shrineEvent.stageName))
		}
		var event = MarchUtils.createAttackAllianceShrineMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, shrineEventId)
		allianceDoc.attackMarchEvents.push(event)
		allianceData.push(["attackMarchEvents." + allianceDoc.attackMarchEvents.indexOf(event), event])
		enemyAllianceData.push(["attackMarchEvents." + allianceDoc.attackMarchEvents.indexOf(event), event])

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 请求联盟进行联盟战
 * @param playerId
 * @param callback
 */
pro.requestAllianceToFight = function(playerId, callback){
	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id))
		var findedPlayerId = _.find(allianceDoc.fightRequests, function(thePlayerId){
			return _.isEqual(thePlayerId, playerId)
		})
		if(_.isEqual(playerId, findedPlayerId)) return Promise.reject(ErrorUtils.alreadySendAllianceFightRequest(playerId, allianceDoc._id))
		allianceDoc.fightRequests.push(playerId)
		allianceData.push(["fightRequests." + allianceDoc.fightRequests.indexOf(playerId), playerId])

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 查找合适的联盟进行战斗
 * @param playerId
 * @param callback
 */
pro.findAllianceToFight = function(playerId, callback){
	var self = this
	var playerDoc = null
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "findAllianceToFight")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "findAllianceToFight"))
		}
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, attackAllianceDoc._id))
		}
		return self.dataService.getAllianceModel().findOneAsync({
			"_id":{$ne:attackAllianceDoc._id},
			"serverId":self.app.get("cacheServerId"),
			"basicInfo.status":Consts.AllianceStatus.Peace
			//"basicInfo.power":{$gte:attackAllianceDoc.basicInfo.power * 0.8, $lt:attackAllianceDoc.basicInfo.power * 1.2}
		})
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.canNotFindAllianceToFight(playerId, attackAllianceDoc._id))
		return self.dataService.findAllianceAsync(doc._id)
	}).then(function(doc){
		defenceAllianceDoc = doc
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent])
		}
		var now = Date.now()
		var finishTime = now + (DataUtils.getAllianceIntInit("allianceFightPrepareMinutes") * 1 * 1000)
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		attackAllianceData.push(["basicInfo", attackAllianceDoc.basicInfo])
		attackAllianceData.push(["allianceFight", attackAllianceDoc.allianceFight])
		defenceAllianceData.push(["basicInfo", defenceAllianceDoc.basicInfo])
		defenceAllianceData.push(["allianceFight", defenceAllianceDoc.allianceFight])
		attackAllianceDoc.fightRequests = []
		attackAllianceData.push(["fightRequests", attackAllianceDoc.fightRequests])
		defenceAllianceDoc.fightRequests = []
		defenceAllianceData.push(["fightRequests", defenceAllianceDoc.fightRequests])

		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, attackAllianceDoc, attackAllianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, attackAllianceDoc._id, attackAllianceData, LogicUtils.getAllianceViewData(defenceAllianceDoc)])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, defenceAllianceDoc._id, defenceAllianceData, LogicUtils.getAllianceViewData(attackAllianceDoc)])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		self.apnService.pushApnMessageToAllianceMembers(attackAllianceDoc, DataUtils.getLocalizationConfig("alliance", "AttackAllianceMessage"), [])
		self.apnService.pushApnMessageToAllianceMembers(defenceAllianceDoc, DataUtils.getLocalizationConfig("alliance", "AllianceBeAttackedMessage"), [attackAllianceDoc.basicInfo.name])
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 复仇其他联盟
 * @param playerId
 * @param reportId
 * @param callback
 */
pro.revengeAlliance = function(playerId, reportId, callback){
	if(!_.isString(reportId)){
		callback(new Error("reportId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "revengeAlliance")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "revengeAlliance"))
		}
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, attackAllianceDoc._id))
		}
		var report = _.find(attackAllianceDoc.allianceFightReports, function(report){
			return _.isEqual(report.id, reportId)
		})
		if(!_.isObject(report)) return Promise.reject(ErrorUtils.allianceFightReportNotExist(playerId, attackAllianceDoc._id, reportId))
		var isWin = _.isEqual(attackAllianceDoc._id, report.attackAllianceId) && _.isEqual(report.fightResult, Consts.FightResult.AttackWin)
		isWin = isWin ? isWin : _.isEqual(attackAllianceDoc._id, report.defenceAllianceId) && _.isEqual(report.fightResult, Consts.FightResult.DefenceWin)
		if(isWin) return Promise.reject(ErrorUtils.winnerOfAllianceFightCanNotRevenge(playerId, attackAllianceDoc._id, reportId))
		if(DataUtils.isAllianceRevengeTimeExpired(report)) return Promise.reject(ErrorUtils.allianceFightRevengeTimeExpired(playerId, attackAllianceDoc._id, reportId))
		return self.dataService.findAllianceAsync(report.enemyAlliance.id)
	}).then(function(doc){
		defenceAllianceDoc = doc
		if(!_.isEqual(defenceAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace)) return Promise.reject(ErrorUtils.targetAllianceNotInPeaceStatus(playerId, attackAllianceDoc._id, reportId))
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent])
		}
		var now = Date.now()
		var finishTime = now + (DataUtils.getAllianceIntInit("allianceFightPrepareMinutes") * 1 * 1000)
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		attackAllianceData.push(["basicInfo", attackAllianceDoc.basicInfo])
		attackAllianceData.push(["allianceFight", attackAllianceDoc.allianceFight])
		defenceAllianceData.push(["basicInfo", defenceAllianceDoc.basicInfo])
		defenceAllianceData.push(["allianceFight", defenceAllianceDoc.allianceFight])
		attackAllianceDoc.fightRequests = []
		attackAllianceData.push(["fightRequests", attackAllianceDoc.fightRequests])
		defenceAllianceDoc.fightRequests = []
		defenceAllianceData.push(["fightRequests", defenceAllianceDoc.fightRequests])

		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, attackAllianceDoc, attackAllianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, attackAllianceDoc._id, attackAllianceData, LogicUtils.getAllianceViewData(defenceAllianceDoc)])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, defenceAllianceDoc._id, defenceAllianceData, LogicUtils.getAllianceViewData(attackAllianceDoc)])

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
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 获取联盟可视化数据
 * @param playerId
 * @param targetAllianceId
 * @param callback
 */
pro.getAllianceViewData = function(playerId, targetAllianceId, callback){
	if(!_.isString(targetAllianceId)){
		callback(new Error("targetAllianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceViewData = null
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.dataService.directFindAllianceAsync(targetAllianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(targetAllianceId))
		allianceDoc = doc
		allianceViewData = LogicUtils.getAllianceViewData(allianceDoc)
		return Promise.resolve()
	}).then(function(){
		callback(null, allianceViewData)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 根据Tag搜索联盟战斗数据
 * @param playerId
 * @param tag
 * @param callback
 */
pro.searchAllianceInfoByTag = function(playerId, tag, callback){
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}

	var self = this
	var allianceInfos = []
	this.dataService.getAllianceModel().findAsync({
		"serverId":self.app.get("cacheServerId"),
		"basicInfo.tag":{$regex:tag, $options:"i"}
	}, null, {limit:10}).then(function(docs){
		_.each(docs, function(doc){
			var data = {}
			data._id = doc._id
			data.basicInfo = doc.basicInfo
			data.countInfo = doc.countInfo
			data.archer = LogicUtils.getAllianceArchon(doc).name
			allianceInfos.push(data)
		})
		return Promise.resolve()
	}).then(function(){
		callback(null, allianceInfos)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 查看战力相近的3个联盟的数据
 * @param playerId
 * @param callback
 */
pro.getNearedAllianceInfos = function(playerId, callback){
	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceInfos = []

	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.directFindAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var funcs = []
		funcs.push(self.dataService.getAllianceModel().findAsync({
			"serverId":self.app.get("cacheServerId"),
			"basicInfo.power":{$lt:allianceDoc.basicInfo.power}
		}, null, {
			"sort":{"basicInfo.power":-1},
			"limit":3
		}))
		funcs.push(self.dataService.getAllianceModel().findAsync({
			"serverId":self.app.get("cacheServerId"),
			"basicInfo.power":{$gt:allianceDoc.basicInfo.power}
		}, null, {
			"sort":{"basicInfo.power":1},
			"limit":3
		}))
		return Promise.all(funcs)
	}).spread(function(docsSmall, docsBig){
		var allianceDocs = []
		allianceDocs.push(allianceDoc)
		allianceDocs = allianceDocs.concat(docsSmall, docsBig)
		_.each(allianceDocs, function(doc){
			var data = {}
			data._id = doc._id
			data.basicInfo = doc.basicInfo
			data.countInfo = doc.countInfo
			data.archer = LogicUtils.getAllianceArchon(doc).name
			allianceInfos.push(data)
		})
		return Promise.resolve()
	}).then(function(){
		callback(null, allianceInfos)
	}).catch(function(e){
		callback(e)
	})
}