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
 * @param allianceId
 * @param donateType
 * @param callback
 */
pro.donateToAlliance = function(playerId, allianceId, donateType, callback){
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
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'allianceDonate', 'allianceInfo', 'dailyTasks', 'resources', 'buildings', 'soldiers', 'soldierStars', 'productionTechs', 'vipEvents', 'itemEvents', 'soldierEvents', 'houseEvents'], false).then(function(doc){
		playerDoc = doc
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'members'], false)
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
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc._id, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 升级联盟建筑
 * @param playerId
 * @param allianceId
 * @param buildingName
 * @param callback
 */
pro.upgradeAllianceBuilding = function(playerId, allianceId, buildingName, callback){
	if(!_.contains(Consts.AllianceBuildingNames, buildingName)){
		callback(new Error("buildingName 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var updateFuncs = []
	var keys = null
	if(_.isEqual(buildingName, Consts.AllianceBuildingNames.OrderHall))
		keys = ['_id', 'basicInfo', 'members', 'buildings', 'mapObjects', 'villages', 'villageCreateEvents', 'villageLevels']
	else
		keys = ['_id', 'basicInfo', 'members', 'buildings']
	this.dataService.findAllianceAsync(allianceId, keys, false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "upgradeAllianceBuilding")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "upgradeAllianceBuilding"))
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
			var totalCount = DataUtils.getAllianceVillagesTotalCount(allianceDoc)
			var currentCount = allianceDoc.villages.length + allianceDoc.villageCreateEvents.length
			DataUtils.createAllianceVillage(allianceDoc, allianceData, enemyAllianceData, totalCount - currentCount)
		}

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}

		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 升级联盟村落
 * @param playerId
 * @param allianceId
 * @param villageType
 * @param callback
 */
pro.upgradeAllianceVillage = function(playerId, allianceId, villageType, callback){
	if(!DataUtils.isAllianceVillageTypeLegal(villageType)){
		callback(new Error("villageType 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'members', 'villageLevels'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "upgradeAllianceVillage")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "upgradeAllianceVillage"))
		}
		var villageLevel = allianceDoc.villageLevels[villageType]
		var upgradeRequired = DataUtils.getAllianceVillageUpgradeRequired(villageType, villageLevel)
		if(upgradeRequired.honour > allianceDoc.basicInfo.honour) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		if(DataUtils.isAllianceVillageReachMaxLevel(villageType, villageLevel)) return Promise.reject(ErrorUtils.allianceBuildingReachMaxLevel(playerId, allianceDoc._id, villageType))
		allianceDoc.basicInfo.honour -= upgradeRequired.honour
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		allianceDoc.villageLevels[villageType] += 1
		allianceData.push(["villageLevels." + villageType, allianceDoc.villageLevels[villageType]])

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 移动联盟建筑到新的位置
 * @param playerId
 * @param allianceId
 * @param mapObjectId
 * @param locationX
 * @param locationY
 * @param callback
 */
pro.moveAllianceBuilding = function(playerId, allianceId, mapObjectId, locationX, locationY, callback){
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
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'members', 'mapObjects'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "moveAllianceBuilding")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "moveAllianceBuilding"))
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

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 激活联盟圣地事件
 * @param playerId
 * @param allianceId
 * @param stageName
 * @param callback
 */
pro.activateAllianceShrineStage = function(playerId, allianceId, stageName, callback){
	if(!DataUtils.isAllianceShrineStageNameLegal(stageName)){
		callback(new Error("stageName 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'buildings', 'members', 'shrineDatas', 'shrineEvents'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "activateAllianceShrineStage")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "activateAllianceShrineStage"))
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

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}

		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 进攻联盟圣地
 * @param playerId
 * @param allianceId
 * @param shrineEventId
 * @param dragonType
 * @param soldiers
 * @param callback
 */
pro.attackAllianceShrine = function(playerId, allianceId, shrineEventId, dragonType, soldiers, callback){
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
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'buildings', 'soldiers', 'soldierStars', 'dragons', 'helpToTroops', 'vipEvents', 'itemEvents'], false).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		dragon.status = Consts.DragonStatus.March
		playerData.push(["dragons." + dragonType, dragon])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		_.each(soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc._id, playerDoc])
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'mapObjects', 'members', 'buildings', 'strikeMarchEvents', 'strikeMarchReturnEvents', 'attackMarchEvents', 'attackMarchReturnEvents', 'villageEvents', 'shrineEvents'], false)
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

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 请求联盟进行联盟战
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.requestAllianceToFight = function(playerId, allianceId, callback){
	var self = this
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'allianceFight', 'fightRequests'], false).then(function(doc){
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id))
		var findedPlayerId = _.find(allianceDoc.fightRequests, function(thePlayerId){
			return _.isEqual(thePlayerId, playerId)
		})
		if(_.isEqual(playerId, findedPlayerId)) return Promise.reject(ErrorUtils.alreadySendAllianceFightRequest(playerId, allianceDoc._id))
		allianceDoc.fightRequests.push(playerId)
		allianceData.push(["fightRequests." + allianceDoc.fightRequests.indexOf(playerId), playerId])

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 查找合适的联盟进行战斗
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.findAllianceToFight = function(playerId, allianceId, callback){
	var self = this
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.findAllianceAsync(allianceId, Consts.AllianceViewDataKeys.concat('allianceFight', 'fightRequests'), false).then(function(doc){
		attackAllianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "findAllianceToFight")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "findAllianceToFight"))
		}
		if(_.isObject(attackAllianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, attackAllianceDoc._id))

		var funcs = []
		funcs.push(new Promise(function(resolve, reject){
			self.dataService.getAllianceModel().collection.find({
				_id:{$ne:allianceId},
				serverId:self.app.get("cacheServerId"),
				'basicInfo.power':{$lte:attackAllianceDoc.basicInfo.power}
			}, {
				_id:true,
				basicInfo:true
			}).sort({'basicInfo.power':-1}).limit(1).toArray(function(e, docs){
				if(_.isObject(e)) reject(e)
				else resolve(docs.length > 0 ? docs[0] : null)
			})
		}))
		funcs.push(new Promise(function(resolve, reject){
			self.dataService.getAllianceModel().collection.find({
				_id:{$ne:allianceId},
				serverId:self.app.get("cacheServerId"),
				'basicInfo.power':{$gt:attackAllianceDoc.basicInfo.power}
			}, {
				_id:true,
				basicInfo:true
			}).sort({'basicInfo.power':1}).limit(1).toArray(function(e, docs){
				if(_.isObject(e)) reject(e)
				else resolve(docs.length > 0 ? docs[0] : null)
			})
		}))
		return Promise.all(funcs)
	}).spread(function(docSmall, docBig){
		if(!_.isObject(docSmall) && !_.isObject(docBig)) return Promise.reject(ErrorUtils.canNotFindAllianceToFight(playerId, attackAllianceDoc._id))
		var powerSmall = _.isObject(docSmall) ? attackAllianceDoc.basicInfo.power - docSmall.basicInfo.power : null
		var powerBig = _.isObject(docBig) ? docBig.basicInfo.power - attackAllianceDoc.basicInfo.power : null
		var finalDoc = _.isNull(docSmall) ? docBig : _.isNull(docBig) ? docSmall : powerBig >= powerSmall ? docSmall : docBig
		if(attackAllianceDoc.basicInfo.power * 1.9 < finalDoc.basicInfo.power || attackAllianceDoc.basicInfo.power * 0.1 > finalDoc.basicInfo.power)
			return Promise.reject(ErrorUtils.canNotFindAllianceToFight(playerId, attackAllianceDoc._id))
		return self.dataService.findAllianceAsync(finalDoc._id, Consts.AllianceViewDataKeys.concat('allianceFight', 'fightRequests'), false)
	}).then(function(doc){
		defenceAllianceDoc = doc
		if(!_.isEqual(defenceAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace))
			return Promise.reject(ErrorUtils.canNotFindAllianceToFight(playerId, attackAllianceDoc._id))

		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent])
		}
		var now = Date.now()
		var finishTime = now + (DataUtils.getAllianceIntInit("allianceFightPrepareMinutes") * 60 * 1000)
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		attackAllianceData.push(["basicInfo", attackAllianceDoc.basicInfo])
		attackAllianceData.push(["allianceFight", attackAllianceDoc.allianceFight])
		defenceAllianceData.push(["basicInfo", defenceAllianceDoc.basicInfo])
		defenceAllianceData.push(["allianceFight", defenceAllianceDoc.allianceFight])
		attackAllianceDoc.fightRequests = []
		attackAllianceData.push(["fightRequests", attackAllianceDoc.fightRequests])
		defenceAllianceDoc.fightRequests = []
		defenceAllianceData.push(["fightRequests", defenceAllianceDoc.fightRequests])

		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, attackAllianceDoc._id, attackAllianceData, _.pick(defenceAllianceDoc, Consts.AllianceViewDataKeys)])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, defenceAllianceDoc._id, defenceAllianceData, _.pick(attackAllianceDoc, Consts.AllianceViewDataKeys)])
		pushFuncs.push([self.dataService, self.dataService.createAllianceFightChannelAsync, attackAllianceDoc._id, defenceAllianceDoc._id])
		self.apnService.pushApnMessageToAllianceMembers(attackAllianceDoc, DataUtils.getLocalizationConfig("alliance", "AttackAllianceMessage"), [])
		self.apnService.pushApnMessageToAllianceMembers(defenceAllianceDoc, DataUtils.getLocalizationConfig("alliance", "AllianceBeAttackedMessage"), [attackAllianceDoc.basicInfo.name])
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
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 复仇其他联盟
 * @param playerId
 * @param allianceId
 * @param reportId
 * @param callback
 */
pro.revengeAlliance = function(playerId, allianceId, reportId, callback){
	if(!_.isString(reportId)){
		callback(new Error("reportId 不合法"))
		return
	}

	var self = this
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.findAllianceAsync(allianceId, Consts.AllianceViewDataKeys.concat('allianceFight', 'fightRequests', 'allianceFightReports'), false).then(function(doc){
		attackAllianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "revengeAlliance")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "revengeAlliance"))
		}
		if(_.isObject(attackAllianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, attackAllianceDoc._id))

		var report = _.find(attackAllianceDoc.allianceFightReports, function(report){
			return _.isEqual(report.id, reportId)
		})
		if(!_.isObject(report)) return Promise.reject(ErrorUtils.allianceFightReportNotExist(playerId, attackAllianceDoc._id, reportId))
		var isWin = _.isEqual(attackAllianceDoc._id, report.attackAllianceId) && _.isEqual(report.fightResult, Consts.FightResult.AttackWin)
		isWin = isWin ? isWin : _.isEqual(attackAllianceDoc._id, report.defenceAllianceId) && _.isEqual(report.fightResult, Consts.FightResult.DefenceWin)
		if(isWin) return Promise.reject(ErrorUtils.winnerOfAllianceFightCanNotRevenge(playerId, attackAllianceDoc._id, reportId))
		if(DataUtils.isAllianceRevengeTimeExpired(report)) return Promise.reject(ErrorUtils.allianceFightRevengeTimeExpired(playerId, attackAllianceDoc._id, reportId))
		return self.dataService.findAllianceAsync(report.enemyAlliance.id, Consts.AllianceViewDataKeys.concat('allianceFight', 'fightRequests'), false)
	}).then(function(doc){
		defenceAllianceDoc = doc
		if(!_.isEqual(defenceAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace)) return Promise.reject(ErrorUtils.targetAllianceNotInPeaceStatus(playerId, attackAllianceDoc._id, reportId))
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent])
		}
		var now = Date.now()
		var finishTime = now + (DataUtils.getAllianceIntInit("allianceFightPrepareMinutes") * 60 * 1000)
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		attackAllianceData.push(["basicInfo", attackAllianceDoc.basicInfo])
		attackAllianceData.push(["allianceFight", attackAllianceDoc.allianceFight])
		defenceAllianceData.push(["basicInfo", defenceAllianceDoc.basicInfo])
		defenceAllianceData.push(["allianceFight", defenceAllianceDoc.allianceFight])
		attackAllianceDoc.fightRequests = []
		attackAllianceData.push(["fightRequests", attackAllianceDoc.fightRequests])
		defenceAllianceDoc.fightRequests = []
		defenceAllianceData.push(["fightRequests", defenceAllianceDoc.fightRequests])

		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, attackAllianceDoc._id, attackAllianceData, _.pick(defenceAllianceDoc, Consts.AllianceViewDataKeys)])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, defenceAllianceDoc._id, defenceAllianceData, _.pick(attackAllianceDoc, Consts.AllianceViewDataKeys)])
		pushFuncs.push([self.dataService, self.dataService.createAllianceFightChannelAsync, attackAllianceDoc._id, defenceAllianceDoc._id])
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
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc._id, null))
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

	this.dataService.directFindAllianceAsync(targetAllianceId, Consts.AllianceViewDataKeys, false).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(targetAllianceId))
		callback(null, doc)
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

	var self = this;
	var allianceInfos = []
	var findAlliancesAsync = new Promise(function(resolve, reject){
		self.dataService.getAllianceModel().collection.find({
			serverId:self.app.get("cacheServerId"),
			'basicInfo.tag':{$regex:tag, $options:"i"}
		}, {
			_id:true,
			basicInfo:true,
			countInfo:true,
			members:true
		}).limit(10).toArray(function(e, docs){
			if(_.isObject(e)) reject(e)
			else resolve(docs)
		})
	})

	findAlliancesAsync.then(function(docs){
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
 * @param allianceId
 * @param callback
 */
pro.getNearedAllianceInfos = function(playerId, allianceId, callback){
	var self = this
	var allianceDoc = null
	var allianceInfos = []
	this.dataService.getAllianceModel().findByIdAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var funcs = []
		funcs.push(new Promise(function(resolve, reject){
			self.dataService.getAllianceModel().collection.find({
				_id:{$ne:allianceDoc._id},
				serverId:self.app.get("cacheServerId"),
				'basicInfo.power':{$lt:allianceDoc.basicInfo.power}
			}, {
				basicInfo:true,
				countInfo:true,
				members:true
			}).sort({'basicInfo.power':-1}).limit(3).toArray(function(e, docs){
				if(_.isObject(e)) reject(e)
				else resolve(docs)
			})
		}))
		funcs.push(new Promise(function(resolve, reject){
			self.dataService.getAllianceModel().collection.find({
				_id:{$ne:allianceDoc._id},
				serverId:self.app.get("cacheServerId"),
				'basicInfo.power':{$gt:allianceDoc.basicInfo.power}
			}, {
				basicInfo:true,
				countInfo:true,
				members:true
			}).sort({'basicInfo.power':1}).limit(3).toArray(function(e, docs){
				if(_.isObject(e)) reject(e)
				else resolve(docs)
			})
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