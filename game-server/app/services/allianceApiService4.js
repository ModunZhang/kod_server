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
}
module.exports = AllianceApiService4
var pro = AllianceApiService4.prototype


/**
 * 协助联盟其他玩家防御
 * @param playerId
 * @param dragonType
 * @param soldiers
 * @param targetPlayerId
 * @param callback
 */
pro.helpAllianceMemberDefence = function(playerId, dragonType, soldiers, targetPlayerId, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}
	if(!_.isString(targetPlayerId) || !ShortId.isValid(targetPlayerId)){
		callback(new Error("targetPlayerId 不合法"))
		return
	}
	if(_.isEqual(playerId, targetPlayerId)){
		callback(new Error("playerId, targetPlayerId 不能对自己协防"))
		return
	}

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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		playerData.push(["dragons." + dragon.type + ".hp", dragon.hp])
		playerData.push(["dragons." + dragon.type + ".hpRefreshTime", dragon.hpRefreshTime])
		playerData.push(["dragons." + dragon.type + ".status", dragon.status])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon))
		_.each(soldiers, function(soldier){
			soldier.star = 1
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return self.dataService.findAllianceAsync(playerDoc.allianceId, [], false)
	}).then(function(doc){
		allianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(playerDoc, allianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(LogicUtils.isPlayerHasTroopHelpedPlayer(allianceDoc, playerDoc, targetPlayerId)){
			return Promise.reject(ErrorUtils.playerAlreadySendHelpDefenceTroopToTargetPlayer(playerId, targetPlayerId, allianceDoc._id))
		}
		return self.dataService.directFindPlayerAsync(targetPlayerId, [])
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
 * 从被协防的联盟成员城市撤兵
 * @param playerId
 * @param beHelpedPlayerId
 * @param callback
 */
pro.retreatFromBeHelpedAllianceMember = function(playerId, beHelpedPlayerId, callback){
	if(!_.isString(beHelpedPlayerId) || !ShortId.isValid(beHelpedPlayerId)){
		callback(new Error("beHelpedPlayerId 不合法"))
		return
	}
	if(_.isEqual(playerId, beHelpedPlayerId)){
		callback(new Error("不能从自己的城市撤销协防部队"))
		return
	}

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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		if(!LogicUtils.isPlayerHasHelpedTroopInAllianceMember(playerDoc, beHelpedPlayerId)){
			return Promise.reject(ErrorUtils.noHelpDefenceTroopInTargetPlayerCity(playerId, beHelpedPlayerData, playerDoc.allianceId))
		}
		var funcs = []
		funcs.push(self.dataService.findAllianceAsync(playerDoc.allianceId, [], false))
		funcs.push(self.dataService.findPlayerAsync(beHelpedPlayerId, [], false))
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
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, beHelpedPlayerDoc, beHelpedPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])

		var helpToTroop = _.find(playerDoc.helpToTroops, function(helpToTroop){
			return _.isEqual(helpToTroop.beHelpedPlayerData.id, beHelpedPlayerId)
		})
		playerData.push(["helpToTroops." + playerDoc.helpToTroops.indexOf(helpToTroop), null])
		LogicUtils.removeItemInArray(playerDoc.helpToTroops, helpToTroop)
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])

		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerId)
		memberObject.helpedByTroopsCount -= 1
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".helpedByTroopsCount", memberObject.helpedByTroopsCount])
		var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(allianceDoc, playerDoc, beHelpedPlayerDoc, helpedByTroop.dragon, helpedByTroop.soldiers, [], helpedByTroop.rewards)
		allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		allianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		enemyAllianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(beHelpedPlayerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(beHelpedPlayerDoc, null))
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
 * 突袭玩家城市
 * @param playerId
 * @param dragonType
 * @param defencePlayerId
 * @param callback
 */
pro.strikePlayerCity = function(playerId, dragonType, defencePlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isString(defencePlayerId) || !ShortId.isValid(defencePlayerId)){
		callback(new Error("defencePlayerId 不合法"))
		return
	}

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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isString(attackPlayerDoc.allianceId)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
		return self.dataService.findAllianceAsync(attackPlayerDoc.allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
		}
		var defenceAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
		var funcs = []
		funcs.push(self.dataService.directFindAllianceAsync(defenceAllianceId, []))
		funcs.push(self.dataService.directFindPlayerAsync(defencePlayerId, []))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		if(defenceMemberObject.isProtected) return Promise.reject(ErrorUtils.playerInProtectStatus(playerId, defencePlayerId))
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
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, attackAllianceDoc, attackAllianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 进攻玩家城市
 * @param playerId
 * @param dragonType
 * @param soldiers
 * @param defencePlayerId
 * @param callback
 */
pro.attackPlayerCity = function(playerId, dragonType, soldiers, defencePlayerId, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}
	if(!_.isString(defencePlayerId) || !ShortId.isValid(defencePlayerId)){
		callback(new Error("defencePlayerId 不合法"))
		return
	}

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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isString(attackPlayerDoc.allianceId)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon))
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
		return self.dataService.findAllianceAsync(attackPlayerDoc.allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
		}
		var defenceAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
		var funcs = []
		funcs.push(self.dataService.directFindAllianceAsync(defenceAllianceId, []))
		funcs.push(self.dataService.directFindPlayerAsync(defencePlayerId, []))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		if(defenceMemberObject.isProtected) return Promise.reject(ErrorUtils.playerInProtectStatus(playerId, defencePlayerId))
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
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, attackAllianceDoc, attackAllianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 进攻村落
 * @param playerId
 * @param dragonType
 * @param soldiers
 * @param defenceAllianceId
 * @param defenceVillageId
 * @param callback
 */
pro.attackVillage = function(playerId, dragonType, soldiers, defenceAllianceId, defenceVillageId, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}
	if(!_.isString(defenceAllianceId) || !ShortId.isValid(defenceAllianceId)){
		callback(new Error("defenceAllianceId 不合法"))
		return
	}
	if(!_.isString(defenceVillageId) || !ShortId.isValid(defenceVillageId)){
		callback(new Error("defenceVillageId 不合法"))
		return
	}

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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isString(attackPlayerDoc.allianceId)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon))
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
		return self.dataService.findAllianceAsync(attackPlayerDoc.allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackPlayerDoc.allianceId, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
			}
			var enemyAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(ErrorUtils.targetAllianceNotTheEnemyAlliance(playerId, attackAllianceDoc._id, defenceAllianceId))
			return self.dataService.directFindAllianceAsync(defenceAllianceId, []).then(function(doc){
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
		}
		var event = MarchUtils.createAttackVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceVillage)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		defenceAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, attackAllianceDoc, attackAllianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 从村落撤兵
 * @param playerId
 * @param villageEventId
 * @param callback
 */
pro.retreatFromVillage = function(playerId, villageEventId, callback){
	if(!_.isString(villageEventId) || !ShortId.isValid(villageEventId)){
		callback(new Error("villageEventId 不合法"))
		return
	}

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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isString(attackPlayerDoc.allianceId))return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		return self.dataService.findAllianceAsync(attackPlayerDoc.allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		villageEvent = LogicUtils.getEventById(attackAllianceDoc.villageEvents, villageEventId)
		if(!_.isObject(villageEvent)) return Promise.reject(ErrorUtils.villageCollectEventNotExist(playerId, attackAllianceDoc._id, villageEventId))
		if(!_.isEqual(attackAllianceDoc._id, villageEvent.villageData.alliance.id)){
			return self.dataService.findAllianceAsync(villageEvent.villageData.alliance.id, [], false).then(function(doc){
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

		var collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, newRewards)
		LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, collectReport)
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, attackAllianceDoc, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		if(_.isObject(defenceAllianceDoc)){
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
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
		callback(null, attackPlayerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
		}
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
 * 突袭村落
 * @param playerId
 * @param dragonType
 * @param defenceAllianceId
 * @param defenceVillageId
 * @param callback
 */
pro.strikeVillage = function(playerId, dragonType, defenceAllianceId, defenceVillageId, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isString(defenceAllianceId) || !ShortId.isValid(defenceAllianceId)){
		callback(new Error("defenceAllianceId 不合法"))
		return
	}
	if(!_.isString(defenceVillageId) || !ShortId.isValid(defenceVillageId)){
		callback(new Error("defenceVillageId 不合法"))
		return
	}

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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isString(attackPlayerDoc.allianceId)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
		return self.dataService.findAllianceAsync(attackPlayerDoc.allianceId, [], false)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackPlayerDoc.allianceId, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
			}
			var enemyAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(ErrorUtils.targetAllianceNotTheEnemyAlliance(playerId, attackAllianceDoc._id, defenceAllianceId))
			return self.dataService.directFindAllianceAsync(defenceAllianceId, []).then(function(doc){
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
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, attackAllianceDoc, attackAllianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 查看敌方进攻行军事件详细信息
 * @param playerId
 * @param enemyAllianceId
 * @param eventId
 * @param callback
 */
pro.getAttackMarchEventDetail = function(playerId, enemyAllianceId, eventId, callback){
	if(!_.isString(enemyAllianceId) || !ShortId.isValid(enemyAllianceId)){
		callback(new Error("enemyAllianceId 不合法"))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var enemyAllianceDoc = null
	var attackPlayerDoc = null
	var marchEvent = null
	var eventDetail = null
	this.dataService.directFindAllianceAsync(enemyAllianceId, []).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(enemyAllianceId))
		enemyAllianceDoc = doc
		marchEvent = _.find(enemyAllianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "attackMarchEvents", eventId))
		return self.dataService.directFindPlayerAsync(marchEvent.attackPlayerData.id, [])
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
 * @param enemyAllianceId
 * @param eventId
 * @param callback
 */
pro.getStrikeMarchEventDetail = function(playerId, enemyAllianceId, eventId, callback){
	if(!_.isString(enemyAllianceId) || !ShortId.isValid(enemyAllianceId)){
		callback(new Error("enemyAllianceId 不合法"))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var enemyAllianceDoc = null
	var attackPlayerDoc = null
	var marchEvent = null
	var eventDetail = null
	this.dataService.directFindAllianceAsync(enemyAllianceId, []).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(enemyAllianceId))
		enemyAllianceDoc = doc
		marchEvent = _.find(enemyAllianceDoc.strikeMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "strikeMarchEvents", eventId))
		return self.dataService.directFindPlayerAsync(marchEvent.attackPlayerData.id, [])
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
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var allianceDoc = null
	var marchEvent = null
	var eventDetail = null
	this.dataService.directFindAllianceAsync(allianceId, []).then(function(doc){
		allianceDoc = doc
		marchEvent = _.find(allianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, allianceDoc._id, "attackMarchEvents", eventId))
		return self.dataService.directFindPlayerAsync(marchEvent.attackPlayerData.id, [])
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
 * @param playerId
 * @param helpedByPlayerId
 * @param callback
 */
pro.getHelpDefenceTroopDetail = function(callerId, playerId, helpedByPlayerId, callback){
	if(!_.isString(playerId) || !ShortId.isValid(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(helpedByPlayerId) || !ShortId.isValid(helpedByPlayerId)){
		callback(new Error("helpedByPlayerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var helpedByPlayerTroop = null
	var troopDetail = null
	this.dataService.directFindPlayerAsync(playerId, []).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, playerId))
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)){
			return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		}
		helpedByPlayerTroop = _.find(playerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, helpedByPlayerId)
		})
		if(!_.isObject(helpedByPlayerTroop)) return Promise.reject(ErrorUtils.noHelpDefenceTroopByThePlayer(callerId, playerDoc.allianceId, playerDoc._id, helpedByPlayerId))
		return self.dataService.directFindPlayerAsync(helpedByPlayerId, [])
	}).then(function(doc){
		attackPlayerDoc = doc
		troopDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, null, helpedByPlayerTroop.dragon, helpedByPlayerTroop.soldiers)
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
 * @param itemName
 * @param count
 * @param callback
 */
pro.addItem = function(playerId, itemName, count, callback){
	if(!DataUtils.isItemNameExist(itemName)){
		callback(new Error("itemName 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId, []).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId, [], false)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "addItem")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "addItem"))
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
		var itemLog = LogicUtils.createAllianceItemLog(Consts.AllianceItemLogType.AddItem, playerDoc.basicInfo.name, itemName, count)
		LogicUtils.addAllianceItemLog(allianceDoc, allianceData, itemLog)

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
 * 购买联盟商店的道具
 * @param playerId
 * @param itemName
 * @param count
 * @param callback
 */
pro.buyItem = function(playerId, itemName, count, callback){
	if(!DataUtils.isItemNameExist(itemName)){
		callback(new Error("itemName 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId, [], false)
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

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
