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
	this.cacheService = app.get('cacheService');
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
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceId));
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
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
			var villageTypeConfig = _.sample(DataUtils.getAllianceVillageTypeConfigs());
			DataUtils.createAllianceVillage(allianceDoc, allianceData, enemyAllianceData, villageTypeConfig.name, totalCount - currentCount);
		}
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "upgradeAllianceVillage")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "upgradeAllianceVillage"))
		}

		var villageLevel = allianceDoc.villageLevels[villageType]
		var upgradeRequired = DataUtils.getAllianceVillageUpgradeRequired(villageType, villageLevel + 1)
		if(upgradeRequired.honour > allianceDoc.basicInfo.honour) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		if(DataUtils.isAllianceVillageReachMaxLevel(villageType, villageLevel)) return Promise.reject(ErrorUtils.allianceBuildingReachMaxLevel(playerId, allianceDoc._id, villageType))
		allianceDoc.basicInfo.honour -= upgradeRequired.honour
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		allianceDoc.villageLevels[villageType] += 1
		allianceData.push(["villageLevels." + villageType, allianceDoc.villageLevels[villageType]])

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
		self.apnService.onAllianceShrineEventStart(allianceDoc);
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var dragon = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(playerDoc, allianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		var shrineEvent = LogicUtils.getEventById(allianceDoc.shrineEvents, shrineEventId)
		if(!_.isObject(shrineEvent)) return Promise.reject(ErrorUtils.shrineStageEventNotFound(playerId, allianceDoc._id, shrineEventId))
		if(LogicUtils.isPlayerHasTroopMarchToAllianceShrineStage(allianceDoc, shrineEvent, playerId)){
			return Promise.reject(ErrorUtils.youHadSendTroopToTheShrineStage(playerId, allianceDoc._id, shrineEvent.stageName))
		}

		dragon.status = Consts.DragonStatus.March
		playerData.push(["dragons." + dragonType, dragon])
		_.each(soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})
		DataUtils.refreshPlayerPower(playerDoc, playerData)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])

		var event = MarchUtils.createAttackAllianceShrineMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, shrineEventId)
		allianceDoc.attackMarchEvents.push(event)
		allianceData.push(["attackMarchEvents." + allianceDoc.attackMarchEvents.indexOf(event), event])
		enemyAllianceData.push(["attackMarchEvents." + allianceDoc.attackMarchEvents.indexOf(event), event])

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id))
		var findedPlayerId = _.find(allianceDoc.fightRequests, function(thePlayerId){
			return _.isEqual(thePlayerId, playerId)
		})
		if(_.isEqual(playerId, findedPlayerId)) return Promise.reject(ErrorUtils.alreadySendAllianceFightRequest(playerId, allianceDoc._id))
		allianceDoc.fightRequests.push(playerId)
		allianceData.push(["fightRequests." + allianceDoc.fightRequests.indexOf(playerId), playerId])

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		attackAllianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "findAllianceToFight")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "findAllianceToFight"))
		}
		if(_.isObject(attackAllianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, attackAllianceDoc._id))

		var funcs = []
		funcs.push(new Promise(function(resolve, reject){
			self.cacheService.getAllianceModel().collection.find({
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
			self.cacheService.getAllianceModel().collection.find({
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
		return self.cacheService.findAllianceAsync(finalDoc._id)
	}).then(function(doc){
		defenceAllianceDoc = doc
		if(!_.isEqual(defenceAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace))
			return Promise.reject(ErrorUtils.canNotFindAllianceToFight(playerId, attackAllianceDoc._id))

		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent])
		}
		var now = Date.now()
		var finishTime = now + (DataUtils.getAllianceIntInit("allianceFightPrepareMinutes") * 60 * 1000 / 60 / 2)
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		attackAllianceData.push(["basicInfo", attackAllianceDoc.basicInfo])
		attackAllianceData.push(["allianceFight", attackAllianceDoc.allianceFight])
		defenceAllianceData.push(["basicInfo", defenceAllianceDoc.basicInfo])
		defenceAllianceData.push(["allianceFight", defenceAllianceDoc.allianceFight])
		attackAllianceDoc.fightRequests = []
		attackAllianceData.push(["fightRequests", attackAllianceDoc.fightRequests])
		defenceAllianceDoc.fightRequests = []
		defenceAllianceData.push(["fightRequests", defenceAllianceDoc.fightRequests])

		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
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
		self.apnService.onAllianceFightPrepare(attackAllianceDoc, defenceAllianceDoc);
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
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
	var self = this
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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
		var enemyAllianceId = LogicUtils.getEnemyAllianceId(report, attackAllianceDoc._id)
		return self.cacheService.findAllianceAsync(enemyAllianceId)
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

		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
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
		self.apnService.onAllianceFightPrepare(attackAllianceDoc, defenceAllianceDoc);
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
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
	this.cacheService.directFindAllianceAsync(targetAllianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(targetAllianceId))
		callback(null, _.pick(doc, Consts.AllianceViewDataKeys))
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
	var self = this;
	var allianceInfos = []
	var findAlliancesAsync = new Promise(function(resolve, reject){
		self.cacheService.getAllianceModel().collection.find({
			serverId:self.app.get("cacheServerId"),
			'basicInfo.tag':{$regex:tag, $options:"i"}
		}, {
			_id:true,
			basicInfo:true,
			countInfo:true,
			buildings:true,
			members:true
		}).limit(10).toArray(function(e, docs){
			if(_.isObject(e)) reject(e)
			else resolve(docs)
		})
	})

	findAlliancesAsync.then(function(docs){
		_.each(docs, function(doc){
			var data = {
				_id:doc._id,
				basicInfo:doc.basicInfo,
				countInfo:doc.countInfo,
				archer:LogicUtils.getAllianceArchon(doc).name,
				members:doc.members.length,
				membersMax:DataUtils.getAllianceMemberMaxCount(doc)
			}
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
	this.cacheService.getAllianceModel().findByIdAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var funcs = []
		funcs.push(new Promise(function(resolve, reject){
			self.cacheService.getAllianceModel().collection.find({
				_id:{$ne:allianceDoc._id},
				serverId:self.app.get("cacheServerId"),
				'basicInfo.power':{$lt:allianceDoc.basicInfo.power}
			}, {
				basicInfo:true,
				countInfo:true,
				buildings:true,
				members:true
			}).sort({'basicInfo.power':-1}).limit(3).toArray(function(e, docs){
				if(_.isObject(e)) reject(e)
				else resolve(docs)
			})
		}))
		funcs.push(new Promise(function(resolve, reject){
			self.cacheService.getAllianceModel().collection.find({
				_id:{$ne:allianceDoc._id},
				serverId:self.app.get("cacheServerId"),
				'basicInfo.power':{$gt:allianceDoc.basicInfo.power}
			}, {
				basicInfo:true,
				countInfo:true,
				buildings:true,
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
			var data = {
				_id:doc._id,
				basicInfo:doc.basicInfo,
				countInfo:doc.countInfo,
				archer:LogicUtils.getAllianceArchon(doc).name,
				members:doc.members.length,
				membersMax:DataUtils.getAllianceMemberMaxCount(doc)
			}
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
 * 联盟商店补充道具
 * @param playerId
 * @param playerName
 * @param allianceId
 * @param itemName
 * @param count
 * @param callback
 */
pro.addShopItem = function(playerId, playerName, allianceId, itemName, count, callback){
	var self = this
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "addItem")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "addItem"))
		}
		if(!DataUtils.isItemSellInAllianceShop(allianceDoc, itemName)) return Promise.reject(ErrorUtils.theItemNotSellInAllianceShop(playerId, allianceDoc._id, itemName))
		var itemConfig = DataUtils.getItemConfig(itemName)
		if(!itemConfig.isAdvancedItem) return Promise.reject(ErrorUtils.normalItemsNotNeedToAdd(playerId, allianceDoc._id, itemName))
		var honourNeed = itemConfig.buyPriceInAlliance * count
		if(allianceDoc.basicInfo.honour < honourNeed) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))

		allianceDoc.basicInfo.honour -= honourNeed
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		var resp = LogicUtils.addAllianceItem(allianceDoc, itemName, count)
		allianceData.push(["items." + allianceDoc.items.indexOf(resp.item), resp.item])
		var itemLog = LogicUtils.createAllianceItemLog(Consts.AllianceItemLogType.AddItem, playerName, itemName, count)
		LogicUtils.addAllianceItemLog(allianceDoc, allianceData, itemLog)

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 购买联盟商店的道具
 * @param playerId
 * @param allianceId
 * @param itemName
 * @param count
 * @param callback
 */
pro.buyShopItem = function(playerId, allianceId, itemName, count, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
		var itemConfig = DataUtils.getItemConfig(itemName)
		var isAdvancedItem = itemConfig.isAdvancedItem
		var eliteLevel = DataUtils.getAllianceTitleLevel("elite")
		var myLevel = DataUtils.getAllianceTitleLevel(playerObject.title)
		if(isAdvancedItem){
			if(myLevel > eliteLevel) return Promise.reject(ErrorUtils.playerLevelNotEoughCanNotBuyAdvancedItem(playerId, allianceDoc._id, itemName))
			var item = _.find(allianceDoc.items, function(item){
				return _.isEqual(item.name, itemName)
			})
			if(!_.isObject(item) || item.count < count) return Promise.reject(ErrorUtils.itemCountNotEnough(playerId, allianceDoc._id, itemName))
		}

		var loyaltyNeed = itemConfig.buyPriceInAlliance * count
		if(playerDoc.allianceInfo.loyalty < loyaltyNeed) return Promise.reject(ErrorUtils.playerLoyaltyNotEnough(playerId, allianceDoc._id))
		playerDoc.allianceInfo.loyalty -= loyaltyNeed
		playerData.push(["allianceInfo.loyalty", playerDoc.allianceInfo.loyalty])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.BuyItemInAllianceShop)
		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
		memberObject.loyalty -= loyaltyNeed
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".loyalty", memberObject.loyalty])

		if(isAdvancedItem){
			item.count -= count
			if(item.count <= 0){
				allianceData.push(["items." + allianceDoc.items.indexOf(item), null])
				LogicUtils.removeItemInArray(allianceDoc.items, item)
			}else{
				allianceData.push(["items." + allianceDoc.items.indexOf(item) + ".count", item.count])
			}
			var itemLog = LogicUtils.createAllianceItemLog(Consts.AllianceItemLogType.BuyItem, playerDoc.basicInfo.name, itemName, count)
			LogicUtils.addAllianceItemLog(allianceDoc, allianceData, itemLog)
		}

		var resp = LogicUtils.addPlayerItem(playerDoc, itemName, count)
		playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 查看联盟信息
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getAllianceInfo = function(playerId, allianceId, callback){
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
		var allianceData = {
			id:doc._id,
			name:doc.basicInfo.name,
			tag:doc.basicInfo.tag,
			flag:doc.basicInfo.flag,
			members:doc.members.length,
			membersMax:DataUtils.getAllianceMemberMaxCount(doc),
			power:doc.basicInfo.power,
			language:doc.basicInfo.language,
			kill:doc.basicInfo.kill,
			joinType:doc.basicInfo.joinType,
			terrain:doc.basicInfo.terrain,
			desc:doc.desc,
			titles:doc.titles,
			memberList:(function(){
				var members = []
				_.each(doc.members, function(member){
					var theMember = {
						id:member.id,
						name:member.name,
						icon:member.icon,
						levelExp:member.levelExp,
						power:member.power,
						title:member.title,
						online:_.isBoolean(member.online) ? member.online : false,
						lastLogoutTime:member.lastLogoutTime
					}
					members.push(theMember)
				})
				return members
			})()
		}

		callback(null, allianceData)
	}).catch(function(e){
		callback(e)
	})
}