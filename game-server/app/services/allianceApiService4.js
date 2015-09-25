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
	this.apnService = app.get('apnService');
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
		if(LogicUtils.isPlayerHasTroopHelpedPlayer(allianceDoc, playerDoc, targetPlayerId)){
			return Promise.reject(ErrorUtils.playerAlreadySendHelpDefenceTroopToTargetPlayer(playerId, targetPlayerId, allianceDoc._id))
		}
		return self.cacheService.directFindPlayerAsync(targetPlayerId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, targetPlayerId))
		targetPlayerDoc = doc

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
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])

		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}

		var event = MarchUtils.createHelpDefenceMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, targetPlayerDoc)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		allianceDoc.marchEvents.attackMarchEvents.push(event)
		allianceData.push(["marchEvents.attackMarchEvents." + allianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, allianceDoc._id, Consts.AllianceBannerType.HelpDefence, [playerDoc.basicInfo.name, targetPlayerDoc.basicInfo.name]]);
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!LogicUtils.isPlayerHasHelpedTroopInAllianceMember(playerDoc, beHelpedPlayerId)){
			return Promise.reject(ErrorUtils.noHelpDefenceTroopInTargetPlayerCity(playerId, beHelpedPlayerData, allianceId))
		}
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		funcs.push(self.cacheService.findPlayerAsync(beHelpedPlayerId))
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
		var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(allianceDoc, playerDoc, beHelpedPlayerDoc, playerDoc.dragons[helpedByTroop.dragon.type], helpedByTroop.soldiers, [], [])
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
		allianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
		allianceData.push(["marchEvents.attackMarchReturnEvents." + allianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		var funcs = []
		funcs.push(self.cacheService.directFindAllianceAsync(defenceAllianceId))
		funcs.push(self.cacheService.directFindPlayerAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!doc_1) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))

		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])

		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createStrikePlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defencePlayerDoc)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchEvents', event]);
		attackAllianceDoc.marchEvents.strikeMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.strikeMarchEvents." + attackAllianceDoc.marchEvents.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.StrikePlayer, [attackPlayerDoc.basicInfo.name, defencePlayerDoc.basicInfo.name]]);
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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		var funcs = []
		funcs.push(self.cacheService.directFindAllianceAsync(defenceAllianceId))
		funcs.push(self.cacheService.directFindPlayerAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!doc_1) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId))
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_2
		var defenceMemberObject = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))

		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, dragonType, soldiers);
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])

		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackPlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defencePlayerDoc)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		attackAllianceDoc.marchEvents.attackMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.AttackPlayer, [attackPlayerDoc.basicInfo.name, defencePlayerDoc.basicInfo.name]]);

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		self.apnService.onCityBeAttacked(defencePlayerDoc);
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
	var dragon = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(allianceId, defenceAllianceId)){
			return self.cacheService.directFindAllianceAsync(defenceAllianceId).then(function(doc){
				if(!doc) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
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

		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, dragonType, soldiers);
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])

		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceVillage)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		attackAllianceDoc.marchEvents.attackMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.AttackVillage, [attackPlayerDoc.basicInfo.name, defenceAllianceId, defenceVillage.level, defenceVillage.name]]);

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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var villageEvent = null
	var collectReport = null
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		villageEvent = LogicUtils.getEventById(attackAllianceDoc.villageEvents, villageEventId)
		if(!_.isObject(villageEvent)) return Promise.reject(ErrorUtils.villageCollectEventNotExist(playerId, attackAllianceDoc._id, villageEventId))
		if(!_.isEqual(attackAllianceDoc._id, villageEvent.villageData.alliance.id)){
			return self.cacheService.findAllianceAsync(villageEvent.villageData.alliance.id).then(function(doc){
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
		pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, villageEvent])
		attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(villageEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, villageEvent)
		eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", villageEvent.id])

		var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
		village.resource -= resourceCollected
		targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])

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
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
		attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
		collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, newRewards)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		if(_.isObject(defenceAllianceDoc)){
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
		}

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
	var dragon = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(allianceId, defenceAllianceId)){
			return self.cacheService.directFindAllianceAsync(defenceAllianceId).then(function(doc){
				if(!doc) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
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

		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])

		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createStrikeVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defenceVillage)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchEvents', event])
		attackAllianceDoc.marchEvents.strikeMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.strikeMarchEvents." + attackAllianceDoc.marchEvents.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])

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
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		attackPlayerDoc = doc
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc, attackAllianceDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		if(!_.isEqual(allianceId, defenceAllianceId)){
			return self.cacheService.directFindAllianceAsync(defenceAllianceId).then(function(doc){
				if(!doc) return Promise.reject(ErrorUtils.allianceNotExist(allianceId));
				defenceAllianceDoc = doc
				return Promise.resolve()
			})
		}else{
			defenceAllianceDoc = attackAllianceDoc
			return Promise.resolve()
		}
	}).then(function(){
		var defenceMonster = _.find(defenceAllianceDoc.monsters, function(monster){
			return _.isEqual(monster.id, defenceMonsterId)
		})
		if(!_.isObject(defenceMonster)) return Promise.reject(ErrorUtils.monsterNotExist(playerId, attackAllianceDoc._id, defenceMonsterId))

		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, dragonType, soldiers);
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])

		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(playerObject.isProtected){
			playerObject.isProtected = false
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(playerObject) + ".isProtected", playerObject.isProtected])
		}
		var event = MarchUtils.createAttackMonsterMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceMonster)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		attackAllianceDoc.marchEvents.attackMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.AttackMonster, [attackPlayerDoc.basicInfo.name, defenceMonster.level, defenceMonster.name]]);

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
	this.cacheService.directFindAllianceAsync(enemyAllianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(enemyAllianceId))
		enemyAllianceDoc = doc
		marchEvent = _.find(enemyAllianceDoc.marchEvents.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "attackMarchEvents", eventId))
		return self.cacheService.directFindPlayerAsync(marchEvent.attackPlayerData.id)
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
	this.cacheService.directFindAllianceAsync(enemyAllianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(enemyAllianceId))
		enemyAllianceDoc = doc
		marchEvent = _.find(enemyAllianceDoc.marchEvents.strikeMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, attackAllianceDoc._id, "strikeMarchEvents", eventId))
		return self.cacheService.directFindPlayerAsync(marchEvent.attackPlayerData.id)
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
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		marchEvent = _.find(allianceDoc.marchEvents.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.id, eventId) && _.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, allianceDoc._id, "attackMarchEvents", eventId))
		return self.cacheService.directFindPlayerAsync(marchEvent.attackPlayerData.id)
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
	this.cacheService.directFindPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, playerId))
		playerDoc = doc
		helpedByPlayerTroop = _.find(playerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, helpedByPlayerId)
		})
		if(!_.isObject(helpedByPlayerTroop)) return Promise.reject(ErrorUtils.noHelpDefenceTroopByThePlayer(callerId, allianceId, playerDoc._id, helpedByPlayerId))
		return self.cacheService.directFindPlayerAsync(helpedByPlayerId)
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