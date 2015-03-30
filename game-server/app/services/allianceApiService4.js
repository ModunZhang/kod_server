"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
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
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
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
	if(!_.isString(targetPlayerId)){
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
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
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(playerDoc, allianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(LogicUtils.isPlayerHasTroopHelpedPlayer(allianceDoc, playerDoc, targetPlayerId)){
			return Promise.reject(ErrorUtils.playerAlreadySendHelpDefenceTroopToTargetPlayer(playerId, targetPlayerId, allianceDoc._id))
		}
		return self.playerDao.findAsync(targetPlayerId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, targetPlayerId))
		targetPlayerDoc = doc
		if(DataUtils.isAlliancePlayerBeHelpedTroopsReachMax(allianceDoc, targetPlayerDoc)){
			return Promise.reject(ErrorUtils.targetPlayersHelpDefenceTroopsCountReachMax(playerId, targetPlayerId, allianceDoc._id))
		}
		var event = MarchUtils.createHelpDefenceMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, targetPlayerDoc)
		allianceDoc.attackMarchEvents.push(event)
		allianceData.push(["attackMarchEvents." + allianceDoc.attackMarchEvents.indexOf(event), event])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, targetPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
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
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(targetPlayerDoc)){
			funcs.push(self.playerDao.removeLockAsync(targetPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
 * 从被协防的联盟成员城市撤兵
 * @param playerId
 * @param beHelpedPlayerId
 * @param callback
 */
pro.retreatFromBeHelpedAllianceMember = function(playerId, beHelpedPlayerId, callback){
	if(!_.isString(beHelpedPlayerId)){
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		if(!LogicUtils.isPlayerHasHelpedTroopInAllianceMember(playerDoc, beHelpedPlayerId)){
			return Promise.reject(ErrorUtils.noHelpDefenceTroopInTargetPlayerCity(playerId, beHelpedPlayerData, playerDoc.alliance.id))
		}
		var funcs = []
		funcs.push(self.allianceDao.findAsync(playerDoc.alliance.id))
		funcs.push(self.playerDao.findAsync(beHelpedPlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId))
		allianceDoc = doc_1
		beHelpedPlayerDoc = doc_2
		var helpedByTroop = _.find(beHelpedPlayerDoc.helpedByTroops, function(helpedByTroop){
			return _.isEqual(helpedByTroop.id, playerId)
		})
		beHelpedPlayerData.push(["helpedByTroops." + beHelpedPlayerDoc.helpedByTroops.indexOf(helpedByTroop), null])
		LogicUtils.removeItemInArray(beHelpedPlayerDoc.helpedByTroops, helpedByTroop)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, beHelpedPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])

		var helpToTroop = _.find(playerDoc.helpToTroops, function(helpToTroop){
			return _.isEqual(helpToTroop.beHelpedPlayerData.id, beHelpedPlayerId)
		})
		playerData.push(["helpToTroops." + playerDoc.helpToTroops.indexOf(helpToTroop), null])
		LogicUtils.removeItemInArray(playerDoc.helpToTroops, helpToTroop)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

		var targetMemberInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerId)
		targetMemberInAlliance.helpedByTroopsCount -= 1
		allianceData.push(["members." + allianceDoc.members.indexOf(targetMemberInAlliance) + ".helpedByTroopsCount", targetMemberInAlliance.helpedByTroopsCount])
		var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(allianceDoc, playerDoc, beHelpedPlayerDoc, helpedByTroop.dragon, helpedByTroop.soldiers, [], helpedByTroop.rewards)
		allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		allianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc, allianceData])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
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
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(beHelpedPlayerDoc)){
			funcs.push(self.playerDao.removeLockAsync(beHelpedPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	if(!_.isString(defencePlayerId)){
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		return self.allianceDao.findAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
		}
		var allianceFightData = attackAllianceDoc.allianceFight
		var defenceAllianceId = _.isEqual(attackAllianceDoc._id, allianceFightData.attackAllianceId) ? allianceFightData.defenceAllianceId : allianceFightData.attackAllianceId
		var funcs = []
		funcs.push(self.allianceDao.findAsync(defenceAllianceId))
		funcs.push(self.playerDao.findAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var memberInDefenceAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(memberInDefenceAlliance)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		if(memberInDefenceAlliance.isProtected) return Promise.reject(ErrorUtils.playerInProtectStatus(playerId, defencePlayerId))
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, defenceAllianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, defencePlayerDoc._id])
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])
		}
		var event = MarchUtils.createStrikePlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.strikeMarchEvents.push(event)
		attackAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)

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
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defencePlayerDoc)){
			funcs.push(self.playerDao.removeLockAsync(defencePlayerDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(defenceAllianceDoc._id))
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
	if(!_.isString(defencePlayerId)){
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
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
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		return self.allianceDao.findAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
		}
		var allianceFightData = attackAllianceDoc.allianceFight
		var defenceAllianceId = _.isEqual(attackAllianceDoc._id, allianceFightData.attackAllianceId) ? allianceFightData.defenceAllianceId : allianceFightData.attackAllianceId
		var funcs = []
		funcs.push(self.allianceDao.findAsync(defenceAllianceId))
		funcs.push(self.playerDao.findAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var memberInDefenceAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(memberInDefenceAlliance)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		if(memberInDefenceAlliance.isProtected) return Promise.reject(ErrorUtils.playerInProtectStatus(playerId, defencePlayerId))
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, defenceAllianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, defencePlayerDoc._id])
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])
		}
		var event = MarchUtils.createAttackPlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)

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
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defencePlayerDoc)){
			funcs.push(self.playerDao.removeLockAsync(defencePlayerDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(defenceAllianceDoc._id))
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
	if(!_.isString(defenceAllianceId)){
		callback(new Error("defenceAllianceId 不合法"))
		return
	}
	if(!_.isString(defenceVillageId)){
		callback(new Error("defenceVillageId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
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
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		return self.allianceDao.findAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackPlayerDoc.alliance.id, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
			}
			var allianceFight = attackAllianceDoc.allianceFight
			var enemyAllianceId = _.isEqual(attackAllianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(ErrorUtils.targetAllianceNotTheEnemyAlliance(playerId, attackAllianceDoc._id, defenceAllianceId))
			return self.allianceDao.findAsync(defenceAllianceId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(attackAllianceDoc._id, defenceAllianceId)){
			if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId))
			defenceAllianceDoc = doc
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
		var defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(playerId, attackAllianceDoc._id, defenceVillageId))

		if(attackAllianceDoc != defenceAllianceDoc){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, defenceAllianceDoc._id])
		}
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])
		}
		var event = MarchUtils.createAttackVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceVillage)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)

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
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc) && attackAllianceDoc != defenceAllianceDoc){
			funcs.push(self.allianceDao.removeLockAsync(defenceAllianceDoc._id))
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
 * 从村落撤兵
 * @param playerId
 * @param villageEventId
 * @param callback
 */
pro.retreatFromVillage = function(playerId, villageEventId, callback){
	if(!_.isString(villageEventId)){
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var villageEvent = null
	this.playerDao.findAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance))return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		return self.allianceDao.findAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		attackAllianceDoc = doc
		villageEvent = LogicUtils.getEventById(attackAllianceDoc.villageEvents, villageEventId)
		if(!_.isObject(villageEvent)) return Promise.reject(ErrorUtils.villageCollectEventNotExist(playerId, attackAllianceDoc._id, villageEventId))
		if(!_.isEqual(attackAllianceDoc._id, villageEvent.villageData.alliance.id)){
			return self.allianceDao.findAsync(villageEvent.villageData.alliance.id)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(attackAllianceDoc._id, villageEvent.villageData.alliance.id)){
			defenceAllianceDoc = doc
			targetAllianceDoc = defenceAllianceDoc
			targetAllianceData = defenceAllianceData
		}else{
			targetAllianceDoc = attackAllianceDoc
			targetAllianceData = attackAllianceData
		}
		var village = LogicUtils.getAllianceVillageById(targetAllianceDoc, villageEvent.villageData.id)
		attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(villageEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, villageEvent)
		eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", villageEvent.id])

		var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
		village.resource -= resourceCollected
		targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
		var originalRewards = villageEvent.playerData.rewards
		var resourceType = village.name.slice(0, -7)
		var newRewards = [{
			type:"resources",
			name:resourceType,
			count:resourceCollected
		}]
		LogicUtils.mergeRewards(originalRewards, newRewards)

		var marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, targetAllianceDoc, villageEvent.villageData, originalRewards)
		attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

		var collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, newRewards)
		LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, collectReport)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])

		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		if(_.isObject(defenceAllianceDoc)){
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)
			LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceDoc, defenceAllianceData)
		}else{
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
		}

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
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(defenceAllianceDoc._id))
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
	if(!_.isString(defenceAllianceId)){
		callback(new Error("defenceAllianceId 不合法"))
		return
	}
	if(!_.isString(defenceVillageId)){
		callback(new Error("defenceVillageId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance)) return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		return self.allianceDao.findAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(attackPlayerDoc.alliance.id, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, attackAllianceDoc._id))
			}
			var allianceFight = attackAllianceDoc.allianceFight
			var enemyAllianceId = _.isEqual(attackAllianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(ErrorUtils.targetAllianceNotTheEnemyAlliance(playerId, attackAllianceDoc._id, defenceAllianceId))
			return self.allianceDao.findAsync(defenceAllianceId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(attackAllianceDoc._id, defenceAllianceId)){
			if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId))
			defenceAllianceDoc = doc
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
		var defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(defenceVillageId))

		if(attackAllianceDoc != defenceAllianceDoc){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, defenceAllianceDoc._id])
		}
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])
		}
		var event = MarchUtils.createStrikeVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defenceVillage)
		attackAllianceDoc.strikeMarchEvents.push(event)
		attackAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)

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
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc) && attackAllianceDoc != defenceAllianceDoc){
			funcs.push(self.allianceDao.removeLockAsync(defenceAllianceDoc._id))
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
 * 查看敌方进攻行军事件详细信息
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.getAttackMarchEventDetail = function(playerId, eventId, callback){
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var allianceDoc = null
	var attackAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var marchEvent = null
	var eventDetail = null
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)){
			return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, allianceDoc._id))
		}
		var allianceFight = allianceDoc.allianceFight
		var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, allianceDoc._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		return self.allianceDao.findAsync(enemyAllianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		marchEvent = _.find(attackAllianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id) && _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "attackMarchEvents", eventId))
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			return self.playerDao.findAsync(marchEvent.attackPlayerData.id)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			attackPlayerDoc = doc
		}else{
			attackPlayerDoc = playerDoc
		}

		eventDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, marchEvent.attackPlayerData.soldiers)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, attackPlayerDoc._id])
		}
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, attackAllianceDoc._id])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, eventDetail)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(attackPlayerDoc) && !_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
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
 * 查看敌方突袭行军事件详细信息
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.getStrikeMarchEventDetail = function(playerId, eventId, callback){
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var allianceDoc = null
	var attackAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var marchEvent = null
	var eventDetail = null
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)){
			return Promise.reject(Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId)))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceNotInFightStatus(playerId, allianceDoc._id))
		}
		var allianceFight = allianceDoc.allianceFight
		var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, allianceDoc._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		return self.allianceDao.findAsync(enemyAllianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		marchEvent = _.find(attackAllianceDoc.strikeMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id) && _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "strikeMarchEvents", eventId))
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			return self.playerDao.findAsync(marchEvent.attackPlayerData.id)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			attackPlayerDoc = doc
		}else{
			attackPlayerDoc = playerDoc
		}
		eventDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, null)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, attackPlayerDoc._id])
		}
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, attackAllianceDoc._id])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, eventDetail)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(attackPlayerDoc) && !_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
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