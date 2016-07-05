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
	this.activityService = app.get('activityService');
}
module.exports = AllianceApiService4
var pro = AllianceApiService4.prototype


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
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		funcs.push(self.cacheService.findAllianceAsync(defenceAllianceId))
		funcs.push(self.cacheService.findPlayerAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2, doc_3){
		attackAllianceDoc = doc_1;
		if(!doc_2) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
		defenceAllianceDoc = doc_2
		if(!_.isObject(doc_3)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_3
		if(!attackPlayerDoc.allianceId) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId));
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		var defenceMemberObject = LogicUtils.getObjectById(defenceAllianceDoc.members, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])

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
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
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
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		funcs.push(self.cacheService.findAllianceAsync(defenceAllianceId))
		funcs.push(self.cacheService.findPlayerAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2, doc_3){
		attackAllianceDoc = doc_1;
		if(!doc_2) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
		defenceAllianceDoc = doc_2
		if(!_.isObject(doc_3)) return Promise.reject(ErrorUtils.playerNotExist(playerId, defencePlayerId))
		defencePlayerDoc = doc_3
		if(!attackPlayerDoc.allianceId) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId));
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		var defenceMemberObject = LogicUtils.getObjectById(defenceAllianceDoc.members, defencePlayerId)
		if(!_.isObject(defenceMemberObject)) return Promise.reject(ErrorUtils.playerNotInEnemyAlliance(playerId, attackAllianceDoc._id, defencePlayerId, defenceAllianceDoc._id))
		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, attackPlayerData, dragonType, soldiers);

		var event = MarchUtils.createAttackPlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defencePlayerDoc)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchEvents', event]);
		attackAllianceDoc.marchEvents.attackMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), event])

		var masterOfDefenderEvent = LogicUtils.getPlayerMasterOfDefenderItemEvent(attackPlayerDoc);
		if(!!masterOfDefenderEvent){
			self.app.get('playerTimeEventService').onPlayerEvent(attackPlayerDoc, attackPlayerData, 'itemEvents', masterOfDefenderEvent.id);
		}

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceNoticeAsync, attackAllianceDoc._id, Consts.AllianceBannerType.AttackPlayer, [attackPlayerDoc.basicInfo.name, defencePlayerDoc.basicInfo.name]]);
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
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
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		if(allianceId !== defenceAllianceId){
			funcs.push(self.cacheService.findAllianceAsync(defenceAllianceId))
		}
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		attackAllianceDoc = doc_1;
		if(allianceId !== defenceAllianceId){
			if(!doc_2) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
			defenceAllianceDoc = doc_2
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
		if(!attackPlayerDoc.allianceId) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId));
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
		defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(playerId, attackAllianceDoc._id, defenceVillageId))
		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, attackPlayerData, dragonType, soldiers);

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
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
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
	var attackPlayerData = [];
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
	}).then(function(){
		if(!attackPlayerDoc.allianceId) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId));
		villageEvent = LogicUtils.getObjectById(attackAllianceDoc.villageEvents, villageEventId)
		if(!_.isObject(villageEvent)) return Promise.reject(ErrorUtils.villageCollectEventNotExist(playerId, attackAllianceDoc._id, villageEventId));
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
		_.each(villageEvent.playerData.rewards, function(reward){
			if(_.contains(Consts.BasicResource, reward.name) || reward.name === 'coin'){
				self.activityService.addPlayerActivityScore(attackPlayerDoc, attackPlayerData, 'collectResource', 'collectOne_' + reward.name, reward.count);
				self.activityService.addAllianceActivityScoreByDoc(attackAllianceDoc, attackAllianceData, 'collectResource', 'collectOne_' + reward.name, reward.count);
			}else if(reward.name === 'blood'){
				self.activityService.addPlayerActivityScore(attackPlayerDoc, attackPlayerData, 'collectHeroBlood', 'getOneBlood', reward.count);
				self.activityService.addAllianceActivityScoreByDoc(attackAllianceDoc, attackAllianceData, 'collectHeroBlood', 'getOneBlood', reward.count);
			}
		})
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
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData);
	}).catch(function(e){
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
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		if(allianceId !== defenceAllianceId){
			funcs.push(self.cacheService.findAllianceAsync(defenceAllianceId))
		}
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		attackAllianceDoc = doc_1;
		if(allianceId !== defenceAllianceId){
			if(!doc_2) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
			defenceAllianceDoc = doc_2
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
		if(!attackPlayerDoc.allianceId) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId));
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
	}).then(function(){
		defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(ErrorUtils.villageNotExist(defenceVillageId))
		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])

		var event = MarchUtils.createStrikeVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defenceVillage)
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchEvents', event])
		attackAllianceDoc.marchEvents.strikeMarchEvents.push(event)
		attackAllianceData.push(["marchEvents.strikeMarchEvents." + attackAllianceDoc.marchEvents.strikeMarchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
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
		var funcs = []
		funcs.push(self.cacheService.findAllianceAsync(allianceId))
		if(allianceId !== defenceAllianceId){
			funcs.push(self.cacheService.findAllianceAsync(defenceAllianceId))
		}
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		attackAllianceDoc = doc_1;
		if(allianceId !== defenceAllianceId){
			if(!doc_2) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId));
			defenceAllianceDoc = doc_2
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
		if(!attackPlayerDoc.allianceId) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId));
		dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon.type))
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, dragon)
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon.type))
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(ErrorUtils.dragonLeaderShipNotEnough(playerId, dragon.type))
		if(!LogicUtils.isPlayerHasFreeMarchQueue(attackPlayerDoc)) return Promise.reject(ErrorUtils.noFreeMarchQueue(playerId))
	}).then(function(){
		defenceMonster = _.find(defenceAllianceDoc.monsters, function(monster){
			return _.isEqual(monster.id, defenceMonsterId)
		})
		if(!_.isObject(defenceMonster)) return Promise.reject(ErrorUtils.monsterNotExist(playerId, attackAllianceDoc._id, defenceMonsterId))

		lockPairs.push({key:Consts.Pairs.Alliance, value:attackAllianceDoc._id});
		lockPairs.push({key:Consts.Pairs.Player, value:attackPlayerDoc._id});
	}).then(function(){
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		attackPlayerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + dragonType + ".status", dragon.status])
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
		LogicUtils.addPlayerTroopOut(attackPlayerDoc, attackPlayerData, dragonType, soldiers);

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
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, attackPlayerData)
	}).catch(function(e){
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