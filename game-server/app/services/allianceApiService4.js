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
	this.remotePushService = app.get('remotePushService');
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
	var dragon = null
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		if(!!LogicUtils.getObjectById(playerDoc.helpToTroops, targetPlayerId)) return Promise.reject(ErrorUtils.playerAlreadySendHelpDefenceTroopToTargetPlayer(playerId, targetPlayerId, allianceDoc._id))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(playerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))

		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		funcs.push(self.cacheService.findPlayerAsync(targetPlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		allianceDoc = doc_1
		if(!doc_2) return Promise.reject(ErrorUtils.playerNotExist(playerId, targetPlayerId))
		targetPlayerDoc = doc_2

		lockPairs.push({key:Consts.Pairs.Alliance, value:allianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:playerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		playerData.push(["dragons." + dragon.type + ".hp", dragon.hp])
		playerData.push(["dragons." + dragon.type + ".hpRefreshTime", dragon.hpRefreshTime])
		playerData.push(["dragons." + dragon.type + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			soldier.star = 1
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(playerDoc, dragonType, soldiers);
		var playerObject = LogicUtils.getObjectById(allianceDoc.members, playerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}

		var event = MarchUtils.createHelpDefenceMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, targetPlayerDoc)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		allianceDoc.marchEvents.attackMarchEvents.push(event)
		allianceData.push(["marchEvents.attackMarchEvents." + allianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, allianceDoc._id, Consts.AllianceBannerType.HelpDefence, [playerDoc.basicInfo.name, targetPlayerDoc.basicInfo.name]]);
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	var helpToTroop = null;
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		helpToTroop = LogicUtils.getObjectById(playerDoc.helpToTroops, beHelpedPlayerId);
		if(!helpToTroop){
			return Promise.reject(ErrorUtils.noHelpDefenceTroopInTargetPlayerCity(playerId, allianceId, beHelpedPlayerId))
		}
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		funcs.push(self.cacheService.findPlayerAsync(helpToTroop.id))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		allianceDoc = doc_1
		beHelpedPlayerDoc = doc_2

		lockPairs.push({key:Consts.Pairs.Alliance, value:allianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:playerDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:beHelpedPlayerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		var helpedByTroop = beHelpedPlayerDoc.helpedByTroop;
		beHelpedPlayerDoc.helpedByTroop = null;
		beHelpedPlayerData.push(["helpedByTroop", null]);
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])

		playerData.push(["helpToTroops." + playerDoc.helpToTroops.indexOf(helpToTroop), null])
		LogicUtils.removeItemInArray(playerDoc.helpToTroops, helpToTroop);

		var memberObject = LogicUtils.getObjectById(allianceDoc.members, beHelpedPlayerId)
		memberObject.beHelped = false
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".beHelped", memberObject.beHelped])
		var fromAlliance = MarchUtils.createAllianceData(allianceDoc, LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerId).location);
		var toAlliance = MarchUtils.createAllianceData(allianceDoc, LogicUtils.getAllianceMemberMapObjectById(allianceDoc, beHelpedPlayerId).location);
		var defencePlayerData = {
			id:beHelpedPlayerDoc._id,
			name:beHelpedPlayerDoc.basicInfo.name
		}
		var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(allianceDoc, playerDoc, playerDoc.dragons[helpedByTroop.dragon.type], helpedByTroop.soldiers, helpedByTroop.woundedSoldiers, helpedByTroop.rewards, defencePlayerData, fromAlliance, toAlliance);
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
		allianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
		allianceData.push(["marchEvents.attackMarchReturnEvents." + allianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
	})
}

/**
 * 突袭玩家城市
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param defenceAllianceId
 * @param defencePlayerId
 * @param callback
 */
pro.strikePlayerCity = function(playerId, allianceId, dragonType, defenceAllianceId, defencePlayerId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defencePlayerDoc = null
	var defenceAllianceDoc = null
	var dragon = null
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(defenceAllianceId))
		funcs.push(self.cacheService.findPlayerAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!doc_1) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getObjectById(defenceAllianceDoc.members, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))

		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])

		var playerObject = LogicUtils.getObjectById(attackAllianceDoc.members, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createStrikePlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defencePlayerDoc)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchEvents', event]);
		attackAllianceDoc.marchEvents.strikeMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.strikeMarchEvents." + attackAllianceDoc.marchEvents.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.StrikePlayer, [attackPlayerDoc.basicInfo.name, defencePlayerDoc.basicInfo.name]]);
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
	})
}

/**
 * 进攻玩家城市
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param soldiers
 * @param defenceAllianceId
 * @param defencePlayerId
 * @param callback
 */
pro.attackPlayerCity = function(playerId, allianceId, dragonType, soldiers, defenceAllianceId, defencePlayerId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defencePlayerDoc = null
	var dragon = null
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(defenceAllianceId))
		funcs.push(self.cacheService.findPlayerAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!doc_1) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId))
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getObjectById(defenceAllianceDoc.members, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))

		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, dragonType, soldiers);

		var playerObject = LogicUtils.getObjectById(attackAllianceDoc.members, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackPlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defencePlayerDoc)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		attackAllianceDoc.marchEvents.attackMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.AttackPlayer, [attackPlayerDoc.basicInfo.name, defencePlayerDoc.basicInfo.name]]);
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).then(
		function(){
			self.remotePushService.onCityBeAttacked(defencePlayerDoc);
		},
		function(e){
			if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
			callback(e)
		}
	)
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
	var dragon = null
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	var defenceVillage = null;
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!_.isEqual(allianceId, defenceAllianceId)){
			return self.cacheService.findAllianceAsync(defenceAllianceId).then(function(doc){
				if(!doc) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
				defenceAllianceDoc = doc
			})
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
	}).then(function(){
		defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(playerId, attackAllianceDoc._id, defenceVillageId))

		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, dragonType, soldiers);

		var playerObject = LogicUtils.getObjectById(attackAllianceDoc.members, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceVillage)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		attackAllianceDoc.marchEvents.attackMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.AttackVillage, [attackPlayerDoc.basicInfo.name, defenceAllianceId, defenceVillage.level, defenceVillage.name]]);
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var targetAllianceDoc = null
	var targetAllianceData = null
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	var villageEvent = null
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		villageEvent = LogicUtils.getObjectById(attackAllianceDoc.villageEvents, villageEventId)
		if(!_.isObject(villageEvent)) return Promise.reject(ErrorUtils.villageCollectEventNotExist(playerId, attackAllianceDoc._id, villageEventId))
		if(!_.isEqual(attackAllianceDoc._id, villageEvent.toAlliance.id)){
			return self.cacheService.findAllianceAsync(villageEvent.toAlliance.id).then(function(doc){
				defenceAllianceDoc = doc
				targetAllianceDoc = defenceAllianceDoc
				targetAllianceData = defenceAllianceData
			})
		}else{
			targetAllianceDoc = attackAllianceDoc
			targetAllianceData = attackAllianceData
		}
	}).then(function(){
		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		if(!!defenceAllianceDoc) lockPairs.push({key:Consts.Pairs.Alliance, value:defenceAllianceDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		var village = LogicUtils.getAllianceVillageById(targetAllianceDoc, villageEvent.villageData.id)
		pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, villageEvent])
		attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(villageEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, villageEvent)
		eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", villageEvent.id])

		var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
		village.resource -= resourceCollected
		targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
		village.villageEvent = null;
		targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".villageEvent", village.villageEvent])

		var resourceName = village.name.slice(0, -7)
		var rewards = [{
			type:"resources",
			name:resourceName,
			count:resourceCollected
		}]
		LogicUtils.mergeRewards(villageEvent.playerData.rewards, rewards)

		var marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, villageEvent.playerData.rewards, villageEvent.villageData, villageEvent.fromAlliance, villageEvent.toAlliance);
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
		attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
		var collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, rewards)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, collectReport])
		if(_.isObject(defenceAllianceDoc)){
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
		}
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback();
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
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
	var dragon = null
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	var defenceVillage = null;
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!_.isEqual(allianceId, defenceAllianceId)){
			return self.cacheService.findAllianceAsync(defenceAllianceId).then(function(doc){
				if(!doc) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
				defenceAllianceDoc = doc
			})
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
	}).then(function(){
		defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(defenceVillageId))

		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])

		var playerObject = LogicUtils.getObjectById(attackAllianceDoc.members, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createStrikeVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defenceVillage)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchEvents', event])
		attackAllianceDoc.marchEvents.strikeMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.strikeMarchEvents." + attackAllianceDoc.marchEvents.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
	})
}

/**
 * 进攻野怪
 * @param playerId
 * @param allianceId
 * @param dragonType
 * @param soldiers
 * @param defenceAllianceId
 * @param defenceMonsterId
 * @param callback
 */
pro.attackMonster = function(playerId, allianceId, dragonType, soldiers, defenceAllianceId, defenceMonsterId, callback){
	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var dragon = null
	var lockPairs = [];
	var pushFuncs = []
	var eventFuncs = []
	var defenceMonster = null;
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!_.isEqual(allianceId, defenceAllianceId)){
			return self.cacheService.findAllianceAsync(defenceAllianceId).then(function(doc){
				if(!doc) return Promise.reject(ErrorUtils.allianceNotExist(allianceId));
				defenceAllianceDoc = doc
			})
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
	}).then(function(){
		defenceMonster = _.find(defenceAllianceDoc.monsters, function(monster){
			return _.isEqual(monster.id, defenceMonsterId)
		})
		if(!_.isObject(defenceMonster)) return Promise.reject(ErrorUtils.monsterNotExist(playerId, attackAllianceDoc._id, defenceMonsterId))

		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs);
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, dragonType, soldiers);

		var playerObject = LogicUtils.getObjectById(attackAllianceDoc.members, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackMonsterMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceMonster)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		attackAllianceDoc.marchEvents.attackMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.AttackMonster, [attackPlayerDoc.basicInfo.name, defenceMonster.level, defenceMonster.index]]);
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback(e)
	})
}

/**
 * 查看敌方进攻行军事件详细信息
 * @param playerId
 * @param allianceId
 * @param targetAllianceId
 * @param eventId
 * @param callback
 */
pro.getAttackMarchEventDetail = function(playerId, allianceId, targetAllianceId, eventId, callback){
	var self = this
	var targetAllianceDoc = null
	var attackPlayerDoc = null
	var marchEvent = null
	var eventDetail = null
	this.cacheService.findAllianceAsync(targetAllianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(targetAllianceId))
		targetAllianceDoc = doc
		marchEvent = _.find(targetAllianceDoc.marchEvents.attackMarchEvents, function(marchEvent){
			return marchEvent.id === eventId && (marchEvent.toAlliance.id === allianceId || marchEvent.fromAlliance.id === allianceId);
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, targetAllianceId, "attackMarchEvents", eventId))
		return self.cacheService.findPlayerAsync(marchEvent.attackPlayerData.id)
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
 * @param targetAllianceId
 * @param eventId
 * @param callback
 */
pro.getStrikeMarchEventDetail = function(playerId, allianceId, targetAllianceId, eventId, callback){
	var self = this
	var targetAllianceDoc = null
	var attackPlayerDoc = null
	var marchEvent = null
	var eventDetail = null
	this.cacheService.findAllianceAsync(targetAllianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(targetAllianceId))
		targetAllianceDoc = doc
		marchEvent = _.find(targetAllianceDoc.marchEvents.strikeMarchEvents, function(marchEvent){
			return marchEvent.id === eventId && (marchEvent.toAlliance.id === allianceId || marchEvent.fromAlliance.id === allianceId);
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, targetAllianceId, "strikeMarchEvents", eventId))
		return self.cacheService.findPlayerAsync(marchEvent.attackPlayerData.id)
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
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		marchEvent = _.find(allianceDoc.marchEvents.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, allianceDoc._id, "attackMarchEvents", eventId))
		return self.cacheService.findPlayerAsync(marchEvent.attackPlayerData.id)
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
 * @param callback
 */
pro.getHelpDefenceTroopDetail = function(callerId, allianceId, playerId, callback){
	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var troopDetail = null
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, playerId))
		playerDoc = doc
		if(!playerDoc.helpedByTroop) return Promise.reject(ErrorUtils.noHelpDefenceTroopByThePlayer(callerId, allianceId, playerDoc._id))
		return self.cacheService.findPlayerAsync(playerDoc.helpedByTroop.id)
	}).then(function(doc){
		attackPlayerDoc = doc
		troopDetail = ReportUtils.getPlayerHelpDefenceTroopDetail(attackPlayerDoc, playerDoc.helpedByTroop.dragon, playerDoc.helpedByTroop.soldiers)
		delete troopDetail.marchEventId
		troopDetail.helpedByPlayerId = playerDoc.helpedByTroop.id
		return Promise.resolve()
	}).then(function(){
		callback(null, troopDetail)
	}).catch(function(e){
		callback(e)
	})
}