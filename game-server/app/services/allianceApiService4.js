"use strict"

/**
 * Created by modun on 14/12/10.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var ErrorUtils = require("../utils/errorUtils")
var MarchUtils = require("../utils/marchUtils")
var ReportUtils = require("../utils/reportUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var AllianceApiService4 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.dataService = app.get("dataService")
	this.cacheService = app.get('cacheService');
}
module.exports = AllianceApiService4
var pro = AllianceApiService4.prototype


/**
 * 协助联盟其他玩家防御
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param soldiers
 * @param targetPlayerId
 * @param callback
 */
pro.helpAllianceMemberDefence = function(playerId, allianceId, dragonType, soldiers, targetPlayerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var targetPlayerDoc = null
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		dragon.status = Consts.DragonStatus.March
		playerData.push(["dragons." + dragon.type + ".hp", dragon.hp])
		playerData.push(["dragons." + dragon.type + ".hpRefreshTime", dragon.hpRefreshTime])
		playerData.push(["dragons." + dragon.type + ".status", dragon.status])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		_.each(soldiers, function(soldier){
			soldier.star = 1
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})
		DataUtils.refreshPlayerPower(playerDoc, playerData)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return self.cacheService.findAllianceAsync(allianceId, [], false)
	}).then(function(doc){
		allianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(playerDoc, allianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(LogicUtils.isPlayerHasTroopHelpedPlayer(allianceDoc, playerDoc, targetPlayerId)){
			return Promise.reject(ErrorUtils.playerAlreadySendHelpDefenceTroopToTargetPlayer(playerId, targetPlayerId, allianceDoc._id))
		}
		return self.cacheService.directFindPlayerAsync(targetPlayerId, [], false)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, targetPlayerId))
		targetPlayerDoc = doc
		if(DataUtils.isAlliancePlayerBeHelpedTroopsReachMax(allianceDoc, targetPlayerDoc)){
			return Promise.reject(ErrorUtils.targetPlayersHelpDefenceTroopsCountReachMax(playerId, targetPlayerId, allianceDoc._id))
		}
		var event = MarchUtils.createHelpDefenceMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, targetPlayerDoc)
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
 * 从被协防的联盟成员城市撤兵
 * @param playerId
 * @param allianceId
 * @param beHelpedPlayerId
 * @param callback
 */
pro.retreatFromBeHelpedAllianceMember = function(playerId, allianceId, beHelpedPlayerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var beHelpedPlayerDoc = null
	var beHelpedPlayerData = []
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(!LogicUtils.isPlayerHasHelpedTroopInAllianceMember(playerDoc, beHelpedPlayerId)){
			return Promise.reject(ErrorUtils.noHelpDefenceTroopInTargetPlayerCity(playerId, beHelpedPlayerData, allianceId))
		}
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId, [], false))
		funcs.push(self.cacheService.findPlayerAsync(beHelpedPlayerId, [], false))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		allianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, beHelpedPlayerId))
		beHelpedPlayerDoc = doc_2
		var helpedByTroop = _.find(beHelpedPlayerDoc.helpedByTroops, function(helpedByTroop){
			return _.isEqual(helpedByTroop.id, playerId)
		})
		beHelpedPlayerData.push(["helpedByTroops." + beHelpedPlayerDoc.helpedByTroops.indexOf(helpedByTroop), null])
		LogicUtils.removeItemInArray(beHelpedPlayerDoc.helpedByTroops, helpedByTroop)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, beHelpedPlayerDoc._id, beHelpedPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])

		var helpToTroop = _.find(playerDoc.helpToTroops, function(helpToTroop){
			return _.isEqual(helpToTroop.beHelpedPlayerData.id, beHelpedPlayerId)
		})
		playerData.push(["helpToTroops." + playerDoc.helpToTroops.indexOf(helpToTroop), null])
		LogicUtils.removeItemInArray(playerDoc.helpToTroops, helpToTroop)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])

		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerId)
		memberObject.helpedByTroopsCount -= 1
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".helpedByTroopsCount", memberObject.helpedByTroopsCount])
		enemyAllianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".helpedByTroopsCount", memberObject.helpedByTroopsCount])
		var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(allianceDoc, playerDoc, beHelpedPlayerDoc, helpedByTroop.dragon, helpedByTroop.soldiers, [], helpedByTroop.rewards)
		allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		allianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		enemyAllianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
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
		if(_.isObject(beHelpedPlayerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(beHelpedPlayerDoc._id, null))
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
 * 突袭玩家城市
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param defencePlayerId
 * @param callback
 */
pro.strikePlayerCity = function(playerId, allianceId, dragonType, defencePlayerId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defencePlayerDoc = null
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
		return self.cacheService.findAllianceAsync(allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
		}
		var defenceAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
		var funcs = []
		funcs.push(self.cacheService.directFindAllianceAsync(defenceAllianceId, [], false))
		funcs.push(self.cacheService.directFindPlayerAsync(defencePlayerId, [], false))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
			defenceAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createStrikePlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.strikeMarchEvents.push(event)
		attackAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), event])
		defenceAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceAllianceData, pushFuncs, self.pushService)

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 进攻玩家城市
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param soldiers
 * @param defencePlayerId
 * @param callback
 */
pro.attackPlayerCity = function(playerId, allianceId, dragonType, soldiers, defencePlayerId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defencePlayerDoc = null
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		DataUtils.refreshPlayerPower(attackPlayerDoc, attackPlayerData)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
		return self.cacheService.findAllianceAsync(allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
		}
		var defenceAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
		var funcs = []
		funcs.push(self.cacheService.directFindAllianceAsync(defenceAllianceId, [], false))
		funcs.push(self.cacheService.directFindPlayerAsync(defencePlayerId, [], false))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
			defenceAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackPlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		defenceAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceAllianceData, pushFuncs, self.pushService)

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 进攻村落
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param soldiers
 * @param defenceAllianceId
 * @param defenceVillageId
 * @param callback
 */
pro.attackVillage = function(playerId, allianceId, dragonType, soldiers, defenceAllianceId, defenceVillageId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		DataUtils.refreshPlayerPower(attackPlayerDoc, attackPlayerData)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
		return self.cacheService.findAllianceAsync(allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(allianceId, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
			}
			var enemyAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(ErrorUtils.targetAllianceNotTheEnemyAlliance(playerId, attackAllianceDoc._id, defenceAllianceId))
			return self.cacheService.directFindAllianceAsync(defenceAllianceId, [], false).then(function(doc){
				defenceAllianceDoc = doc
				return Promise.resolve()
			})
		}else{
			defenceAllianceDoc = attackAllianceDoc
			return Promise.resolve()
		}
	}).then(function(){
		var defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(playerId, attackAllianceDoc._id, defenceVillageId))
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
			defenceAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceVillage)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		defenceAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceAllianceData, pushFuncs, self.pushService)

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 从村落撤兵
 * @param playerId
 * @param allianceId
 * @param villageEventId
 * @param callback
 */
pro.retreatFromVillage = function(playerId, allianceId, villageEventId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var targetAllianceDoc = null
	var targetAllianceData = null
	var attackEnemyAllianceData = []
	var defenceEnemyAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var villageEvent = null
	var collectReport = null
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		villageEvent = LogicUtils.getEventById(attackAllianceDoc.villageEvents, villageEventId)
		if(!_.isObject(villageEvent)) return Promise.reject(ErrorUtils.villageCollectEventNotExist(playerId, attackAllianceDoc._id, villageEventId))
		if(!_.isEqual(attackAllianceDoc._id, villageEvent.villageData.alliance.id)){
			return self.cacheService.findAllianceAsync(villageEvent.villageData.alliance.id, [], false).then(function(doc){
				defenceAllianceDoc = doc
				targetAllianceDoc = defenceAllianceDoc
				targetAllianceData = defenceAllianceData
				return Promise.resolve()
			})
		}else{
			targetAllianceDoc = attackAllianceDoc
			targetAllianceData = attackAllianceData
			return Promise.resolve()
		}
	}).then(function(){
		var village = LogicUtils.getAllianceVillageById(targetAllianceDoc, villageEvent.villageData.id)
		attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(villageEvent), null])
		defenceEnemyAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(villageEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, villageEvent)
		eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", villageEvent.id])

		var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
		village.resource -= resourceCollected
		targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
		if(_.isEqual(targetAllianceDoc, attackAllianceDoc)){
			defenceEnemyAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
		}else{
			attackEnemyAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
		}
		var originalRewards = villageEvent.playerData.rewards
		var resourceName = village.name.slice(0, -7)
		var newRewards = [{
			type:"resources",
			name:resourceName,
			count:resourceCollected
		}]
		LogicUtils.mergeRewards(originalRewards, newRewards)
		var collectExp = DataUtils.getCollectResourceExpAdd(resourceName, newRewards[0].count)
		attackPlayerDoc.allianceInfo[resourceName + "Exp"] += collectExp
		attackPlayerData.push(["allianceInfo." + resourceName + "Exp", attackPlayerDoc.allianceInfo[resourceName + "Exp"]])

		var marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, targetAllianceDoc, villageEvent.villageData, originalRewards)
		attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		defenceEnemyAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
		collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, newRewards)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		if(_.isObject(defenceAllianceDoc)){
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			LogicUtils.pushDataToEnemyAlliance(defenceAllianceDoc, attackEnemyAllianceData, pushFuncs, self.pushService)
		}
		LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		return self.dataService.sendSysReportAsync(playerId, collectReport)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
		}
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
 * 突袭村落
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param defenceAllianceId
 * @param defenceVillageId
 * @param callback
 */
pro.strikeVillage = function(playerId, allianceId, dragonType, defenceAllianceId, defenceVillageId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceEnemyAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
		return self.cacheService.findAllianceAsync(allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(allianceId, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
			}
			var enemyAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(ErrorUtils.targetAllianceNotTheEnemyAlliance(playerId, attackAllianceDoc._id, defenceAllianceId))
			return self.cacheService.directFindAllianceAsync(defenceAllianceId, [], false).then(function(doc){
				defenceAllianceDoc = doc
				return Promise.resolve()
			})
		}else{
			defenceAllianceDoc = attackAllianceDoc
			return Promise.resolve()
		}
	}).then(function(){
		var defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(defenceVillageId))
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
			defenceEnemyAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createStrikeVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defenceVillage)
		attackAllianceDoc.strikeMarchEvents.push(event)
		attackAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), event])
		defenceEnemyAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 查看敌方进攻行军事件详细信息
 * @param playerId
 * @param allianceId
 * @param enemyAllianceId
 * @param eventId
 * @param callback
 */
pro.getAttackMarchEventDetail = function(playerId, allianceId, enemyAllianceId, eventId, callback){
	var self = this
	var enemyAllianceDoc = null
	var attackPlayerDoc = null
	var marchEvent = null
	var eventDetail = null
	this.cacheService.directFindAllianceAsync(enemyAllianceId, [], false).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(enemyAllianceId))
		enemyAllianceDoc = doc
		marchEvent = _.find(enemyAllianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "attackMarchEvents", eventId))
		return self.cacheService.directFindPlayerAsync(marchEvent.attackPlayerData.id, [], false)
	}).then(function(doc){
		attackPlayerDoc = doc
		eventDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, marchEvent.attackPlayerData.soldiers)
	}).then(function(){
		callback(null, eventDetail)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 查看敌方突袭行军事件详细信息
 * @param playerId
 * @param allianceId
 * @param enemyAllianceId
 * @param eventId
 * @param callback
 */
pro.getStrikeMarchEventDetail = function(playerId, allianceId, enemyAllianceId, eventId, callback){
	var self = this
	var enemyAllianceDoc = null
	var attackPlayerDoc = null
	var marchEvent = null
	var eventDetail = null
	this.cacheService.directFindAllianceAsync(enemyAllianceId, [], false).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(enemyAllianceId))
		enemyAllianceDoc = doc
		marchEvent = _.find(enemyAllianceDoc.strikeMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "strikeMarchEvents", eventId))
		return self.cacheService.directFindPlayerAsync(marchEvent.attackPlayerData.id, [], false)
	}).then(function(doc){
		attackPlayerDoc = doc
		eventDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, null)
	}).then(function(){
		callback(null, eventDetail)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 查看协助部队行军事件详细信息
 * @param playerId
 * @param allianceId
 * @param eventId
 * @param callback
 */
pro.getHelpDefenceMarchEventDetail = function(playerId, allianceId, eventId, callback){
	var self = this
	var attackPlayerDoc = null
	var allianceDoc = null
	var marchEvent = null
	var eventDetail = null
	this.cacheService.directFindAllianceAsync(allianceId, [], false).then(function(doc){
		allianceDoc = doc
		marchEvent = _.find(allianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, allianceDoc._id, "attackMarchEvents", eventId))
		return self.cacheService.directFindPlayerAsync(marchEvent.attackPlayerData.id, [], false)
	}).then(function(doc){
		attackPlayerDoc = doc
		eventDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, marchEvent.attackPlayerData.soldiers)
		return Promise.resolve()
	}).then(function(){
		callback(null, eventDetail)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 查看协防部队详细信息
 * @param callerId
 * @param allianceId
 * @param playerId
 * @param helpedByPlayerId
 * @param callback
 */
pro.getHelpDefenceTroopDetail = function(callerId, allianceId, playerId, helpedByPlayerId, callback){
	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var helpedByPlayerTroop = null
	var troopDetail = null
	this.cacheService.directFindPlayerAsync(playerId, [], false).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, playerId))
		playerDoc = doc
		helpedByPlayerTroop = _.find(playerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, helpedByPlayerId)
		})
		if(!_.isObject(helpedByPlayerTroop)) return Promise.reject(ErrorUtils.noHelpDefenceTroopByThePlayer(callerId, allianceId, playerDoc._id, helpedByPlayerId))
		return self.cacheService.directFindPlayerAsync(helpedByPlayerId, [], false)
	}).then(function(doc){
		attackPlayerDoc = doc
		troopDetail = ReportUtils.getPlayerHelpDefenceTroopDetail(attackPlayerDoc, helpedByPlayerTroop.dragon, helpedByPlayerTroop.soldiers)
		delete troopDetail.marchEventId
		troopDetail.helpedByPlayerId = helpedByPlayerId
		return Promise.resolve()
	}).then(function(){
		callback(null, troopDetail)
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
	this.cacheService.findAllianceAsync(allianceId, [], false).then(function(doc){
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
	this.cacheService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId, [], false)
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
