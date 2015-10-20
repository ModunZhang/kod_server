"use strict"

/**
 * Created by modun on 14-10-28.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var NodeUtils = require("util")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var MarchUtils = require("../utils/marchUtils")
var FightUtils = require("../utils/fightUtils")
var ReportUtils = require("../utils/reportUtils")
var MapUtils = require("../utils/mapUtils");
var ErrorUtils = require("../utils/errorUtils")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var GameDatas = require('../datas/GameDatas')
var AllianceInitData = GameDatas.AllianceInitData
var AllianceMap = GameDatas.AllianceMap;

var AllianceTimeEventService = function(app){
	this.app = app
	this.env = app.get("env")
	this.apnService = app.get('apnService');
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.dataService = app.get("dataService")
	this.cacheService = app.get('cacheService');
	this.logService = app.get("logService")
}
module.exports = AllianceTimeEventService
var pro = AllianceTimeEventService.prototype

/**
 * 创建调用返回
 * @param updateFuncs
 * @param eventFuncs
 * @param pushFuncs
 * @returns {{updateFuncs: *, eventFuncs: *, pushFuncs: *}}
 * @constructor
 */
var CreateResponse = function(updateFuncs, eventFuncs, pushFuncs){
	var response = {
		updateFuncs:updateFuncs,
		eventFuncs:eventFuncs,
		pushFuncs:pushFuncs
	}
	return response
}

/**
 * 到达指定时间时,触发的消息
 * @param allianceId
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.onTimeEvent = function(allianceId, eventType, eventId, callback){
	var self = this
	var allianceDoc = null
	var event = null
	var pushFuncs = []
	var updateFuncs = []
	var eventFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId, allianceId))
		allianceDoc = doc
		if(_.isEqual(eventType, Consts.AllianceStatusEvent)){
			if(!_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
				return Promise.reject(ErrorUtils.illegalAllianceStatus(allianceDoc._id, allianceDoc.basicInfo.status))
			}
			var allianceData = []
			return self.onAllianceProtectedStatusFinishedAsync(allianceDoc, allianceData).then(function(){
				updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
				return Promise.resolve()
			})
		}else if(eventType === Consts.MonsterRefreshEvent){
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
			return self.onMonsterRefreshEventAsync(allianceDoc).then(function(params){
				updateFuncs = updateFuncs.concat(params.updateFuncs)
				eventFuncs = eventFuncs.concat(params.eventFuncs)
				pushFuncs = pushFuncs.concat(params.pushFuncs)
				return Promise.resolve()
			})
		}else{
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
			event = _.contains(Consts.AllianceMarchEventTypes, eventType)
				? LogicUtils.getEventById(allianceDoc.marchEvents[eventType], eventId)
				: LogicUtils.getEventById(allianceDoc[eventType], eventId);
			if(!_.isObject(event)) return Promise.reject(ErrorUtils.allianceEventNotExist(allianceId, eventType, eventId))
			var timeEventFuncName = "on" + eventType.charAt(0).toUpperCase() + eventType.slice(1) + "Async"
			return self[timeEventFuncName](allianceDoc, event).then(function(params){
				updateFuncs = updateFuncs.concat(params.updateFuncs)
				eventFuncs = eventFuncs.concat(params.eventFuncs)
				pushFuncs = pushFuncs.concat(params.pushFuncs)
				return Promise.resolve()
			})
		}
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
 * 联盟状态改变事件回调
 * @param allianceDoc
 * @param allianceData
 * @param callback
 */
pro.onAllianceProtectedStatusFinished = function(allianceDoc, allianceData, callback){
	allianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
	allianceDoc.basicInfo.statusStartTime = Date.now()
	allianceDoc.basicInfo.statusFinishTime = 0
	allianceData.push(["basicInfo.status", allianceDoc.basicInfo.status])
	allianceData.push(["basicInfo.statusStartTime", allianceDoc.basicInfo.statusStartTime])
	allianceData.push(["basicInfo.statusFinishTime", allianceDoc.basicInfo.statusFinishTime])
	allianceData.basicInfo = allianceDoc.basicInfo
	callback()
}

/**
 * 进攻行军事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onAttackMarchEvents = function(allianceDoc, event, callback){
	var self = this
	var attackAllianceDoc = allianceDoc
	var attackAllianceData = []
	var attackPlayerDoc = null
	var attackPlayerData = []
	var attackSoldiers = null
	var attackWoundedSoldiers = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var defencePlayerDoc = null
	var defencePlayerData = []
	var helpDefencePlayerDoc = null
	var helpDefencePlayerData = []
	var attackDragon = null
	var attackDragonForFight = null
	var attackSoldiersForFight = null
	var attackTreatSoldierPercent = null
	var attackSoldierMoraleDecreasedPercent = null
	var attackToEnemySoldierMoralDecreasedAddPercent = null
	var helpDefenceDragon = null
	var helpDefenceDragonForFight = null
	var helpDefenceDragonFightFixEffect = null
	var helpDefenceSoldiersForFight = null
	var helpDefenceTreatSoldierPercent = null
	var helpDefenceSoldierMoraleDecreasedPercent = null
	var helpDefenceToEnemySoldierMoralDecreasedAddPercent
	var defenceDragon = null
	var defenceDragonForFight = null
	var defenceDragonFightFixEffect = null
	var defenceSoldiersForFight = null
	var defenceTreatSoldierPercent = null
	var defenceSoldierMoraleDecreasedPercent = null
	var defenceToEnemySoldierMoralDecreasedAddPercent = null
	var report = null
	var countData = null
	var isInAllianceFight = null;
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var funcs = []

	pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'attackMarchEvents', event])
	attackAllianceData.push(["marchEvents.attackMarchEvents." + attackAllianceDoc.marchEvents.attackMarchEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(attackAllianceDoc.marchEvents.attackMarchEvents, event)

	var createSoldiers = function(soldiersAfterFight){
		var soldiers = []
		_.each(soldiersAfterFight, function(soldierAfterFight){
			if(soldierAfterFight.currentCount > 0){
				var soldier = {
					name:soldierAfterFight.name,
					count:soldierAfterFight.currentCount
				}
				soldiers.push(soldier)
			}
		})
		return soldiers
	}
	var createWoundedSoldiers = function(soldiersAfterFight){
		var soldiers = []
		_.each(soldiersAfterFight, function(soldierAfterFight){
			if(soldierAfterFight.woundedCount > 0){
				var soldier = {
					name:soldierAfterFight.name,
					count:soldierAfterFight.woundedCount
				}
				soldiers.push(soldier)
			}
		})
		return soldiers
	}
	var updatePlayerKillData = function(allianceFight, allianceFightData, role, playerDoc, newlyKill){
		var playerKillDatas = allianceFight[role].playerKills;
		var playerKillData = _.find(playerKillDatas, function(playerKillData){
			return _.isEqual(playerKillData.id, playerDoc._id)
		})
		if(!_.isObject(playerKillData)){
			playerKillData = {
				id:playerDoc._id,
				name:playerDoc.basicInfo.name,
				kill:newlyKill
			}
			playerKillDatas.push(playerKillData)
			allianceFightData.push(["allianceFight." + role + ".playerKills." + playerKillDatas.indexOf(playerKillData), playerKillData])
		}else{
			playerKillData.kill += newlyKill
			allianceFightData.push(["allianceFight." + role + ".playerKills." + playerKillDatas.indexOf(playerKillData) + ".kill", playerKillData.kill])
		}
	}

	if(_.isEqual(event.marchType, Consts.MarchType.Shrine)){
		var shrineEvent = LogicUtils.getEventById(attackAllianceDoc.shrineEvents, event.defenceShrineData.shrineEventId)
		this.cacheService.findPlayerAsync(event.attackPlayerData.id).then(function(doc){
			attackPlayerDoc = doc
			if(!_.isObject(shrineEvent)){
				var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], [])
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
				attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, null])
			}else{
				var playerTroop = {
					id:event.attackPlayerData.id,
					name:event.attackPlayerData.name,
					location:event.attackPlayerData.location,
					dragon:event.attackPlayerData.dragon,
					soldiers:event.attackPlayerData.soldiers
				}
				shrineEvent.playerTroops.push(playerTroop)
				attackAllianceData.push(["shrineEvents." + attackAllianceDoc.shrineEvents.indexOf(shrineEvent) + ".playerTroops." + shrineEvent.playerTroops.indexOf(playerTroop), playerTroop])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.JoinAllianceShrineEvent)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
			}
			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			callback(e)
		})
		return
	}
	if(_.isEqual(event.marchType, Consts.MarchType.HelpDefence)){
		funcs = []
		funcs.push(this.cacheService.findPlayerAsync(event.attackPlayerData.id))
		funcs.push(this.cacheService.findPlayerAsync(event.defencePlayerData.id))
		Promise.all(funcs).spread(function(doc_1, doc_2){
			attackPlayerDoc = doc_1
			defencePlayerDoc = doc_2
			var defencePlayerObject = LogicUtils.getAllianceMemberMapObjectById(attackAllianceDoc, defencePlayerDoc._id);
			if(!defencePlayerObject || !_.isEqual(defencePlayerObject.location, event.toAlliance.location) || defencePlayerDoc.helpedByTroops.length >= 1){
				var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[event.attackPlayerData.dragon.type], event.attackPlayerData.soldiers, [], [], defencePlayerDoc, event.fromAlliance, event.toAlliance);
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
				attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, null])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, null])
				return Promise.resolve()
			}else{
				var helpToTroop = {
					playerDragon:event.attackPlayerData.dragon.type,
					beHelpedPlayerData:{
						id:defencePlayerDoc._id,
						name:defencePlayerDoc.basicInfo.name,
						location:defencePlayerObject.location
					}
				}
				attackPlayerDoc.helpToTroops.push(helpToTroop)
				attackPlayerData.push(["helpToTroops." + attackPlayerDoc.helpToTroops.indexOf(helpToTroop), helpToTroop])
				var helpedByTroop = {
					id:attackPlayerDoc._id,
					name:attackPlayerDoc.basicInfo.name,
					dragon:{
						type:event.attackPlayerData.dragon.type
					},
					soldiers:event.attackPlayerData.soldiers,
					woundedSoldiers:[],
					rewards:[]
				}
				defencePlayerDoc.helpedByTroops.push(helpedByTroop)
				defencePlayerData.push(["helpedByTroops." + defencePlayerDoc.helpedByTroops.indexOf(helpedByTroop), helpedByTroop])

				var beHelpedMemberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, defencePlayerDoc._id)
				beHelpedMemberInAlliance.helpedByTroopsCount += 1
				attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(beHelpedMemberInAlliance) + ".helpedByTroopsCount", beHelpedMemberInAlliance.helpedByTroopsCount])
				TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.HelpAllianceMemberDefence)

				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				return Promise.resolve()
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(defencePlayerDoc._id, null))
			}
			if(funcs.length > 0){
				Promise.all(funcs).then(function(){
					callback(e)
				})
			}else{
				callback(e)
			}
		})
		return
	}
	if(_.isEqual(event.marchType, Consts.MarchType.City)){
		var updateDragonForFight = function(dragonForFight, dragonAfterFight){
			dragonForFight.currentHp = dragonAfterFight.currentHp
		}
		var updateSoldiersForFight = function(soldiersForFight, soldiersAfterFight){
			_.each(soldiersAfterFight, function(soldierAfterFight){
				var soldierForFight = _.find(soldiersForFight, function(soldierForFight){
					return _.isEqual(soldierForFight.name, soldierAfterFight.name)
				})
				soldierForFight.currentCount = soldierAfterFight.currentCount
				soldierForFight.woundedCount += soldierAfterFight.woundedCount
				soldierForFight.killedSoldiers = soldierForFight.killedSoldiers.concat(soldierAfterFight.killedSoldiers)
			})
		}
		var getSoldiersFromSoldiersForFight = function(soldiersForFight){
			var soldiers = []
			_.each(soldiersForFight, function(soldierForFight){
				if(soldierForFight.currentCount > 0){
					var soldier = {
						name:soldierForFight.name,
						count:soldierForFight.currentCount
					}
					soldiers.push(soldier)
				}
			})
			return soldiers
		}
		var getWoundedSoldiersFromSoldiersForFight = function(soldiersForFight){
			var soldiers = []
			_.each(soldiersForFight, function(soldierForFight){
				if(soldierForFight.woundedCount > 0){
					var soldier = {
						name:soldierForFight.name,
						count:soldierForFight.woundedCount
					}
					soldiers.push(soldier)
				}
			})
			return soldiers
		}
		var updatePlayerSoldiers = function(playerDoc, playerData, soldiersForFight){
			var soldiers = []
			_.each(soldiersForFight, function(soldierForFight){
				if(soldierForFight.totalCount > soldierForFight.currentCount){
					var soldier = {
						name:soldierForFight.name,
						count:-(soldierForFight.totalCount - soldierForFight.currentCount)
					}
					soldiers.push(soldier)
				}
			})
			LogicUtils.addPlayerSoldiers(playerDoc, playerData, soldiers)
		}
		var updatePlayerWoundedSoldiers = function(playerDoc, playerData, soldiersForFight){
			var woundedSoldiers = []
			_.each(soldiersForFight, function(soldierForFight){
				if(soldierForFight.woundedCount > 0){
					var woundedSoldier = {
						name:soldierForFight.name,
						count:soldierForFight.woundedCount
					}
					woundedSoldiers.push(woundedSoldier)
				}
			})
			DataUtils.addPlayerWoundedSoldiers(playerDoc, playerData, woundedSoldiers)
		}

		var defenceWallForFight = null
		var helpDefenceDragonFightData = null
		var helpDefenceSoldierFightData = null
		var defenceDragonFightData = null
		var defenceSoldierFightData = null
		var defenceWallFightData = null
		var attackCityReport = null
		var helpedByTroop = null
		var memberInAlliance = null
		var deathEvent = null
		var attackSoldiersLeftForFight = []
		var attackPlayer = null
		var helpDefencePlayer = null
		var defencePlayer = null
		var attackPlayerRewards = []
		var attackCityMarchReturnEvent = null

		funcs = []
		funcs.push(self.cacheService.findPlayerAsync(event.attackPlayerData.id))
		funcs.push(self.cacheService.findAllianceAsync(event.toAlliance.id))
		funcs.push(self.cacheService.findPlayerAsync(event.defencePlayerData.id))
		Promise.all(funcs).spread(function(doc_1, doc_2, doc_3){
			attackPlayerDoc = doc_1
			defenceAllianceDoc = doc_2
			defencePlayerDoc = doc_3
			if(!defenceAllianceDoc || event.toAlliance.mapIndex !== defenceAllianceDoc.mapIndex) return Promise.resolve(false);
			attackPlayer = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id);
			var defencePlayerObject = LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id);
			if(!defencePlayerObject || !_.isEqual(defencePlayerObject.location, event.toAlliance.location)) return Promise.resolve(false);
			defencePlayer = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
			if(attackAllianceDoc.basicInfo.status === Consts.AllianceStatus.Fight){
				var enemyAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id);
				isInAllianceFight = enemyAllianceId === defenceAllianceDoc._id
			}
			if(defencePlayerDoc.helpedByTroops.length > 0){
				return self.cacheService.findPlayerAsync(defencePlayerDoc.helpedByTroops[0].id).then(function(doc){
					helpDefencePlayerDoc = doc
					helpDefencePlayer = LogicUtils.getAllianceMemberById(defenceAllianceDoc, helpDefencePlayerDoc._id);
					return Promise.resolve(true)
				})
			}else{
				return Promise.resolve(true)
			}
		}).then(function(defencePlayerExist){
			if(!defencePlayerExist){
				attackCityMarchReturnEvent = MarchUtils.createAttackPlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[event.attackPlayerData.dragon.type], event.attackPlayerData.soldiers, [], [], event.fromAlliance, event.toAlliance);
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', attackCityMarchReturnEvent]);
				attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(attackCityMarchReturnEvent)
				attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(attackCityMarchReturnEvent), attackCityMarchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", attackCityMarchReturnEvent.id, attackCityMarchReturnEvent.arriveTime - Date.now()])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, null]);
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, null]);
				if(!!defenceAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, null]);
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData]);
				return Promise.resolve();
			}

			attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
			attackDragonForFight = DataUtils.createPlayerDragonForFight(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc.basicInfo.terrain)
			attackSoldiers = event.attackPlayerData.soldiers;
			if(!!helpDefencePlayerDoc){
				helpedByTroop = defencePlayerDoc.helpedByTroops[0]
				helpDefenceDragon = helpDefencePlayerDoc.dragons[helpedByTroop.dragon.type]
				DataUtils.refreshPlayerDragonsHp(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceDragonForFight = DataUtils.createPlayerDragonForFight(defenceAllianceDoc, helpDefencePlayerDoc, helpDefenceDragon, defenceAllianceDoc.basicInfo.terrain)

				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, attackSoldiers, attackDragon, defenceAllianceDoc.basicInfo.terrain, attackDragonForFight.strength > helpDefenceDragonForFight.strength)
				attackTreatSoldierPercent = DataUtils.getPlayerWoundedSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)
				helpDefenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(helpDefencePlayerDoc, helpedByTroop.soldiers, helpDefenceDragon, defenceAllianceDoc.basicInfo.terrain, attackDragonForFight.strength <= helpDefenceDragonForFight.strength)
				helpDefenceTreatSoldierPercent = DataUtils.getPlayerWoundedSoldierPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceDragonFightFixEffect = DataUtils.getFightFixedEffect(attackSoldiersForFight, helpDefenceSoldiersForFight)

				helpDefenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, helpDefenceDragonForFight, helpDefenceDragonFightFixEffect.dragon)
				helpDefenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent + helpDefenceDragonFightFixEffect.soldier.attackSoldierEffect, attackSoldierMoraleDecreasedPercent + helpDefenceToEnemySoldierMoralDecreasedAddPercent, helpDefenceSoldiersForFight, helpDefenceTreatSoldierPercent + helpDefenceDragonFightFixEffect.soldier.defenceSoldierEffect, helpDefenceSoldierMoraleDecreasedPercent + attackToEnemySoldierMoralDecreasedAddPercent)

				updateDragonForFight(attackDragonForFight, helpDefenceDragonFightData.attackDragonAfterFight);
				attackSoldiers = getSoldiersFromSoldiersForFight(helpDefenceSoldierFightData.attackSoldiersAfterFight);
				LogicUtils.mergeSoldiers(attackWoundedSoldiers, getWoundedSoldiersFromSoldiersForFight(helpDefenceSoldierFightData.attackSoldiersAfterFight));

				if(attackDragonForFight.currentHp <= 0 || helpDefenceSoldierFightData.fightResult === Consts.FightResult.DefenceWin) return Promise.resolve();
			}
			if(defencePlayer.isProtected) return Promise.resolve()
			DataUtils.refreshPlayerResources(defencePlayerDoc)
			defencePlayerData.push(["resources", defencePlayerDoc.resources])
			defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
			var defenceSoldiers = DataUtils.getPlayerDefenceSoldiers(defencePlayerDoc)
			if(_.isObject(defenceDragon) && defenceSoldiers.length > 0){
				DataUtils.refreshPlayerDragonsHp(defencePlayerDoc, defenceDragon)
				defenceDragonForFight = DataUtils.createPlayerDragonForFight(defenceAllianceDoc, defencePlayerDoc, defenceDragon, defenceAllianceDoc.basicInfo.terrain)
				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, attackSoldiers, attackDragon, defenceAllianceDoc.basicInfo.terrain, attackDragonForFight.strength > defenceDragonForFight.strength)
				attackTreatSoldierPercent = DataUtils.getPlayerWoundedSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)
				defenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(defencePlayerDoc, defenceSoldiers, defenceDragon, defenceAllianceDoc.basicInfo.terrain, attackDragonForFight.strength <= defenceDragonForFight.strength)
				defenceTreatSoldierPercent = DataUtils.getPlayerWoundedSoldierPercent(defencePlayerDoc, defenceDragon)
				defenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(defencePlayerDoc, defenceDragon)
				defenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(defencePlayerDoc, defenceDragon)
				defenceDragonFightFixEffect = DataUtils.getFightFixedEffect(attackSoldiersForFight, defenceSoldiersForFight)

				defenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight, defenceDragonFightFixEffect.dragon)
				defenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent + defenceDragonFightFixEffect.soldier.attackSoldierEffect, attackSoldierMoraleDecreasedPercent + defenceToEnemySoldierMoralDecreasedAddPercent, defenceSoldiersForFight, defenceTreatSoldierPercent + defenceDragonFightFixEffect.soldier.defenceSoldierEffect, defenceSoldierMoraleDecreasedPercent + attackToEnemySoldierMoralDecreasedAddPercent)

				updateDragonForFight(attackDragonForFight, defenceDragonFightData.attackDragonAfterFight)
				updateSoldiersForFight(attackSoldiersForFight, defenceSoldierFightData.attackSoldiersAfterFight)
				LogicUtils.mergeSoldiers(attackWoundedSoldiers, getWoundedSoldiersFromSoldiersForFight(defenceSoldierFightData.attackSoldiersAfterFight));

				if(_.isEqual(Consts.FightResult.DefenceWin, defenceSoldierFightData.fightResult) || !isInAllianceFight){
					return Promise.resolve()
				}else{
					for(var i = defenceSoldierFightData.attackSoldiersAfterFight.length - 1; i >= 0; i--){
						var attackSoldier = Utils.clone(defenceSoldierFightData.attackSoldiersAfterFight[i])
						if(attackSoldier.currentCount > 0){
							if(attackSoldier.round == 1)
								attackSoldiersLeftForFight.unshift(attackSoldier);
							else{
								if(attackSoldier.morale > 0){
									attackSoldier.totalCount = attackSoldier.currentCount
									attackSoldier.woundedCount = 0
									attackSoldier.morale = 100
									attackSoldier.round = 0
									attackSoldier.killedSoldiers = []
									attackSoldiersLeftForFight.unshift(attackSoldier);
								}
								break
							}
						}
					}
				}
			}else{
				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, attackSoldiers, attackDragon, defenceAllianceDoc.basicInfo.terrain, true)
				attackSoldiersLeftForFight = attackSoldiersForFight
			}
			if(isInAllianceFight && defencePlayerDoc.resources.wallHp > 0){
				defencePlayer.lastBeAttackedTime = Date.now()
				defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(defencePlayer) + ".lastBeAttackedTime", defencePlayer.lastBeAttackedTime]);
				defenceWallForFight = DataUtils.createPlayerWallForFight(defencePlayerDoc)
				var defencePlayerMasterOfDefenderBuffAboutDefenceWall = DataUtils.getPlayerMasterOfDefenderBuffAboutDefenceWall(defencePlayerDoc)
				defenceWallFightData = FightUtils.soldierToWallFight(attackSoldiersLeftForFight, attackTreatSoldierPercent, defenceWallForFight, defencePlayerMasterOfDefenderBuffAboutDefenceWall)
				updateSoldiersForFight(attackSoldiersForFight, defenceWallFightData.attackSoldiersAfterFight)
				attackSoldiers = getSoldiersFromSoldiersForFight(attackSoldiersForFight)
				LogicUtils.mergeSoldiers(attackWoundedSoldiers, getWoundedSoldiersFromSoldiersForFight(defenceWallFightData.attackSoldiersAfterFight));
				return Promise.resolve()
			}
			return Promise.resolve()
		}).then(function(){
			if(!defencePlayer) return Promise.resolve();

			if(isInAllianceFight){
				var allianceFight = attackAllianceDoc.allianceFight = defenceAllianceDoc.allianceFight;
				var allianceFightData = [];
				var attacker = null;
				var attackerString = null;
				var defencer = null;
				var defencerString = null;
				if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
					attacker = allianceFight.attacker;
					attackerString = 'attacker';
					defencer = allianceFight.defencer;
					defencerString = 'defencer';
				}else{
					attacker = allianceFight.defencer;
					attackerString = 'defencer';
					defencer = allianceFight.attacker;
					defencerString = 'attacker';
				}
			}

			if(!!helpDefenceDragonFightData){
				report = ReportUtils.createAttackCityFightWithHelpDefencePlayerReport(attackAllianceDoc, attackPlayerDoc, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragonFightData, helpDefenceSoldierFightData)

				attackCityReport = report.reportForAttackPlayer.attackCity
				countData = report.countData
				attackPlayerDoc.basicInfo.kill += countData.attackPlayerKill
				attackPlayerData.push(["basicInfo.kill", attackPlayerDoc.basicInfo.kill])
				attackPlayerDoc.basicInfo.attackTotal += 1
				attackPlayerData.push(["basicInfo.attackTotal", attackPlayerDoc.basicInfo.attackTotal])
				TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
				LogicUtils.addAlliancePlayerLastThreeDaysKillData(attackAllianceDoc, attackPlayer, countData.attackPlayerKill)
				attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(attackPlayer) + ".lastThreeDaysKillData", attackPlayer.lastThreeDaysKillData])
				LogicUtils.mergeRewards(attackPlayerRewards, attackCityReport.attackPlayerData.rewards);
				DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, countData.attackDragonExpAdd)
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])

				helpDefencePlayerDoc.basicInfo.kill += countData.defencePlayerKill
				helpDefencePlayerData.push(["basicInfo.kill", helpDefencePlayerDoc.basicInfo.kill])
				TaskUtils.finishPlayerKillTaskIfNeed(helpDefencePlayerDoc, helpDefencePlayerData)
				LogicUtils.addAlliancePlayerLastThreeDaysKillData(defenceAllianceDoc, helpDefencePlayer, countData.defencePlayerKill)
				defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(helpDefencePlayer) + ".lastThreeDaysKillData", helpDefencePlayer.lastThreeDaysKillData])
				helpDefenceDragon.hp = helpDefenceDragonForFight.currentHp
				if(helpDefenceDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(helpDefencePlayerDoc, helpDefenceDragon)
					helpDefencePlayerDoc.dragonDeathEvents.push(deathEvent)
					helpDefencePlayerData.push(["dragonDeathEvents." + helpDefencePlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, helpDefencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				helpDefencePlayerData.push(["dragons." + helpDefenceDragon.type + ".hp", helpDefenceDragon.hp])
				helpDefencePlayerData.push(["dragons." + helpDefenceDragon.type + ".hpRefreshTime", helpDefenceDragon.hpRefreshTime])
				DataUtils.addPlayerDragonExp(helpDefencePlayerDoc, helpDefencePlayerData, helpDefenceDragon, countData.defenceDragonExpAdd)
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, helpDefencePlayerDoc._id, report.reportForDefencePlayer])

				var soldiers = getSoldiersFromSoldiersForFight(helpDefenceSoldierFightData.defenceSoldiersAfterFight)
				var woundedSoldiers = getWoundedSoldiersFromSoldiersForFight(helpDefenceSoldierFightData.defenceSoldiersAfterFight)
				var rewards = attackCityReport.helpDefencePlayerData.rewards

				if(helpDefenceDragon.hp <= 0 || helpDefenceSoldierFightData.fightResult === Consts.FightResult.AttackWin){
					var helpToTroop = _.find(helpDefencePlayerDoc.helpToTroops, function(troop){
						return _.isEqual(troop.beHelpedPlayerData.id, defencePlayerDoc._id)
					})
					helpDefencePlayerData.push(["helpToTroops." + helpDefencePlayerDoc.helpToTroops.indexOf(helpToTroop), null])
					LogicUtils.removeItemInArray(helpDefencePlayerDoc.helpToTroops, helpToTroop)
					var fromAlliance = {
						id:defenceAllianceDoc._id,
						name:defenceAllianceDoc.basicInfo.name,
						tag:defenceAllianceDoc.basicInfo.tag,
						location:LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, helpDefencePlayerDoc._id).location,
						mapIndex:defenceAllianceDoc.mapIndex
					}
					var toAlliance = {
						id:defenceAllianceDoc._id,
						name:defenceAllianceDoc.basicInfo.name,
						tag:defenceAllianceDoc.basicInfo.tag,
						location:LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location,
						mapIndex:defenceAllianceDoc.mapIndex
					}
					var helpDefenceMarchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(defenceAllianceDoc, helpDefencePlayerDoc, helpDefenceDragon, soldiers, woundedSoldiers, rewards, defencePlayerDoc, fromAlliance, toAlliance);
					pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', helpDefenceMarchReturnEvent])
					defenceAllianceDoc.marchEvents.attackMarchReturnEvents.push(helpDefenceMarchReturnEvent)
					defenceAllianceData.push(["marchEvents.attackMarchReturnEvents." + defenceAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(helpDefenceMarchReturnEvent), helpDefenceMarchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", helpDefenceMarchReturnEvent.id, helpDefenceMarchReturnEvent.arriveTime - Date.now()])

					defencePlayerData.push(["helpedByTroops." + defencePlayerDoc.helpedByTroops.indexOf(helpedByTroop), null])
					LogicUtils.removeItemInArray(defencePlayerDoc.helpedByTroops, helpedByTroop)
					var defencePlayerInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
					defencePlayerInAlliance.helpedByTroopsCount -= 1
					defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(defencePlayerInAlliance) + ".helpedByTroopsCount", defencePlayerInAlliance.helpedByTroopsCount])
				}else{
					helpedByTroop.soldiers = soldiers;
					LogicUtils.mergeSoldiers(helpedByTroop.woundedSoldiers, woundedSoldiers);
					LogicUtils.mergeRewards(helpedByTroop.rewards, rewards);
					defencePlayerData.push(["helpedByTroops." + defencePlayerDoc.helpedByTroops.indexOf(helpedByTroop), helpedByTroop]);
				}

				if(isInAllianceFight){
					attacker.allianceCountData.attackCount += 1;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.attackCount', attacker.allianceCountData.attackCount]);
					attacker.allianceCountData.kill += countData.attackPlayerKill;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.kill', attacker.allianceCountData.kill]);
					updatePlayerKillData(allianceFight, allianceFightData, attackerString, attackPlayerDoc, countData.attackPlayerKill)
					defencer.allianceCountData.kill += countData.defencePlayerKill;
					allianceFightData.push(['allianceFight.' + defencerString + '.allianceCountData.kill', defencer.allianceCountData.kill]);
					updatePlayerKillData(allianceFight, allianceFightData, defencerString, helpDefencePlayerDoc, countData.defencePlayerKill)
					if(_.isEqual(Consts.FightResult.AttackWin, helpDefenceSoldierFightData.fightResult)){
						attacker.allianceCountData.attackSuccessCount += 1;
						allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.attackSuccessCount', attacker.allianceCountData.attackSuccessCount]);
						attackPlayerDoc.basicInfo.attackWin += 1
						attackPlayerData.push(["basicInfo.attackWin", attackPlayerDoc.basicInfo.attackWin])
						TaskUtils.finishAttackWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}else{
						helpDefencePlayerDoc.basicInfo.defenceWin += 1
						helpDefencePlayerData.push(["basicInfo.defenceWin", helpDefencePlayerDoc.basicInfo.defenceWin])
					}
					attackAllianceData = attackAllianceData.concat(allianceFightData);
					defenceAllianceData = defenceAllianceData.concat(allianceFightData);
				}
			}
			if(!!defenceDragonFightData || !!defenceWallFightData){
				report = ReportUtils.createAttackCityFightWithDefencePlayerReport(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, attackSoldiersForFight, defenceAllianceDoc, defencePlayerDoc, defenceDragonFightData, defenceSoldierFightData, defenceWallFightData)

				attackCityReport = report.reportForAttackPlayer.attackCity
				countData = report.countData
				attackPlayerDoc.basicInfo.kill += countData.attackPlayerKill
				attackPlayerData.push(["basicInfo.kill", attackPlayerDoc.basicInfo.kill])
				attackPlayerDoc.basicInfo.attackTotal += 1
				attackPlayerData.push(["basicInfo.attackTotal", attackPlayerDoc.basicInfo.attackTotal])
				TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
				LogicUtils.addAlliancePlayerLastThreeDaysKillData(attackAllianceDoc, attackPlayer, countData.attackPlayerKill)
				attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(attackPlayer) + ".lastThreeDaysKillData", attackPlayer.lastThreeDaysKillData])
				LogicUtils.mergeRewards(attackPlayerRewards, attackCityReport.attackPlayerData.rewards);
				DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, countData.attackDragonExpAdd)
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])

				defencePlayerDoc.basicInfo.kill += countData.defencePlayerKill
				defencePlayerData.push(["basicInfo.kill", defencePlayerDoc.basicInfo.kill])
				TaskUtils.finishPlayerKillTaskIfNeed(defencePlayerDoc, defencePlayerData)
				LogicUtils.addAlliancePlayerLastThreeDaysKillData(defenceAllianceDoc, defencePlayer, countData.defencePlayerKill)
				defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(defencePlayer) + ".lastThreeDaysKillData", defencePlayer.lastThreeDaysKillData])
				if(_.isObject(defenceDragonFightData)){
					defenceDragon.hp = defenceDragonForFight.currentHp
					if(defenceDragon.hp <= 0){
						defenceDragon.status = Consts.DragonStatus.Free
						defencePlayerData.push(["dragons." + defenceDragon.type + ".status", defenceDragon.status])
						deathEvent = DataUtils.createPlayerDragonDeathEvent(defencePlayerDoc, defenceDragon)
						defencePlayerDoc.dragonDeathEvents.push(deathEvent)
						defencePlayerData.push(["dragonDeathEvents." + defencePlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, defencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
					}
					defencePlayerData.push(["dragons." + defenceDragon.type + ".hp", defenceDragon.hp])
					defencePlayerData.push(["dragons." + defenceDragon.type + ".hpRefreshTime", defenceDragon.hpRefreshTime])
					DataUtils.addPlayerDragonExp(defencePlayerDoc, defencePlayerData, defenceDragon, countData.defenceDragonExpAdd)
					updatePlayerSoldiers(defencePlayerDoc, defencePlayerData, defenceSoldiersForFight)
					updatePlayerWoundedSoldiers(defencePlayerDoc, defencePlayerData, defenceSoldiersForFight)
				}
				if(_.isObject(defenceWallFightData)){
					defencePlayerDoc.resources.wallHp = defenceWallForFight.currentHp
				}
				LogicUtils.addPlayerRewards(defencePlayerDoc, defencePlayerData, attackCityReport.defencePlayerData.rewards);
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, defencePlayerDoc._id, report.reportForDefencePlayer])

				if(isInAllianceFight){
					attacker.allianceCountData.attackCount += 1;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.attackCount', attacker.allianceCountData.attackCount]);
					attacker.allianceCountData.kill += countData.attackPlayerKill;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.kill', attacker.allianceCountData.kill]);
					updatePlayerKillData(allianceFight, allianceFightData, attackerString, attackPlayerDoc, countData.attackPlayerKill)
					defencer.allianceCountData.kill += countData.defencePlayerKill;
					allianceFightData.push(['allianceFight.' + defencerString + '.allianceCountData.kill', defencer.allianceCountData.kill]);
					updatePlayerKillData(allianceFight, allianceFightData, defencerString, defencePlayerDoc, countData.defencePlayerKill)
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						attacker.allianceCountData.attackSuccessCount += 1;
						allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.attackSuccessCount', attacker.allianceCountData.attackSuccessCount]);
						attackPlayerDoc.basicInfo.attackWin += 1
						attackPlayerData.push(["basicInfo.attackWin", attackPlayerDoc.basicInfo.attackWin])
						TaskUtils.finishAttackWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						if(!_.isObject(defenceWallFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceWallFightData.fightResult)){
							attacker.allianceCountData.routCount += 1;
							allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.routCount', attacker.allianceCountData.routCount]);

							memberInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
							memberInAlliance.isProtected = true
							defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])
						}
					}
					if(_.isObject(defenceSoldierFightData) && _.isEqual(Consts.FightResult.DefenceWin, defenceSoldierFightData.fightResult)){
						defencePlayerDoc.basicInfo.defenceWin += 1
						defencePlayerData.push(["basicInfo.defenceWin", defencePlayerDoc.basicInfo.defenceWin])
					}
					attackAllianceData = attackAllianceData.concat(allianceFightData);
					defenceAllianceData = defenceAllianceData.concat(allianceFightData);
				}
			}
			if(!helpDefenceDragonFightData && !defenceDragonFightData && !defenceWallFightData){
				report = ReportUtils.createAttackCityNoFightReport(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, attackSoldiersForFight, defenceAllianceDoc, defencePlayerDoc)

				attackCityReport = report.reportForAttackPlayer.attackCity
				attackPlayerDoc.basicInfo.attackTotal += 1
				attackPlayerData.push(["basicInfo.attackTotal", attackPlayerDoc.basicInfo.attackTotal])
				TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
				LogicUtils.mergeRewards(attackPlayerRewards, attackCityReport.attackPlayerData.rewards);
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])

				LogicUtils.addPlayerRewards(defencePlayerDoc, defencePlayerData, attackCityReport.defencePlayerData.rewards);
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, defencePlayerDoc._id, report.reportForDefencePlayer])

				if(isInAllianceFight){
					attacker.allianceCountData.attackCount += 1;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.attackCount', attacker.allianceCountData.attackCount]);
					attacker.allianceCountData.attackSuccessCount += 1;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.attackSuccessCount', attacker.allianceCountData.attackSuccessCount]);
					attackPlayerDoc.basicInfo.attackWin += 1
					attackPlayerData.push(["basicInfo.attackWin", attackPlayerDoc.basicInfo.attackWin])
					TaskUtils.finishAttackWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					attacker.allianceCountData.routCount += 1;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.routCount', attacker.allianceCountData.routCount]);

					memberInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
					memberInAlliance.isProtected = true
					defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])

					attackAllianceData = attackAllianceData.concat(allianceFightData);
					defenceAllianceData = defenceAllianceData.concat(allianceFightData);
				}
			}
			if(!!helpDefenceDragonFightData || !!defenceDragonFightData || !!defenceWallFightData){
				attackDragon.hp = attackDragonForFight.currentHp
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
				attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
			}

			attackCityMarchReturnEvent = MarchUtils.createAttackPlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, attackSoldiers, attackWoundedSoldiers, attackPlayerRewards, defencePlayerDoc, event.fromAlliance, event.toAlliance);
			pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', attackCityMarchReturnEvent])
			attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(attackCityMarchReturnEvent)
			attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(attackCityMarchReturnEvent), attackCityMarchReturnEvent])
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", attackCityMarchReturnEvent.id, attackCityMarchReturnEvent.arriveTime - Date.now()])
			TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.AttackEnemyPlayersCity)

			updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
			if(!!helpDefencePlayerDoc){
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, helpDefencePlayerDoc._id, helpDefencePlayerDoc])
			}
			updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, defencePlayerDoc])
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc]);

			if(!!attackPlayerData && attackPlayerData.length > 0){
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData]);
			}
			if(!!helpDefencePlayerData && helpDefencePlayerData.length > 0){
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData]);
			}
			if(!!defencePlayerData && defencePlayerData.length > 0){
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData]);
			}
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData]);
			if(!!defenceAllianceData && defenceAllianceData.length > 0){
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData]);
			}

			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
			}
			if(_.isObject(helpDefencePlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(helpDefencePlayerDoc._id, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(defencePlayerDoc._id, null))
			}
			if(_.isObject(defenceAllianceDoc)){
				funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
			}

			if(funcs.length > 0){
				Promise.all(funcs).then(function(){
					callback(e)
				})
			}else{
				callback(e)
			}
		})
		return
	}
	if(_.isEqual(event.marchType, Consts.MarchType.Village)){
		var villageEvent = null
		var village = null
		var attackDragonExpAdd = null
		var attackPlayerKill = null
		var attackRewards = null
		var eventData = null
		var newVillageEvent = null
		var defenceDragonExpAdd = null
		var defencePlayerKill = null
		var defenceSoldiers = null
		var defenceWoundedSoldiers = null
		var defenceRewards = null
		var marchReturnEvent = null
		var resourceName = null
		var villageAllianceDoc = null;
		var villageAllianceData = [];
		var resourceMax = null;
		var lootResource = null;
		var soldiersTotalLoad = null;
		var finalLootCount = null;
		var rewards = null;
		var collectReport = null;
		var villageMapObject = null;
		var villageCreateEvent = null;

		this.cacheService.findPlayerAsync(event.attackPlayerData.id).then(function(doc){
			attackPlayerDoc = doc
			if(event.fromAlliance.id !== event.toAlliance.id){
				return self.cacheService.findAllianceAsync(event.toAlliance.id).then(function(doc){
					defenceAllianceDoc = doc
					if(!defenceAllianceDoc || event.toAlliance.mapIndex !== defenceAllianceDoc.mapIndex) return Promise.resolve();
					village = LogicUtils.getAllianceVillageById(defenceAllianceDoc, event.defenceVillageData.id)
					if(attackAllianceDoc.basicInfo.status === Consts.AllianceStatus.Fight){
						var enemyAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id);
						isInAllianceFight = enemyAllianceId === defenceAllianceDoc._id
					}
					return Promise.resolve()
				})
			}else{
				defenceAllianceDoc = attackAllianceDoc;
				defenceAllianceData = attackAllianceData;
				village = LogicUtils.getAllianceVillageById(attackAllianceDoc, event.defenceVillageData.id)
				return Promise.resolve()
			}
		}).then(function(){
			if(!village) return Promise.resolve();
			if(!!village.villageEvent){
				if(village.villageEvent.allianceId === event.fromAlliance.id) return Promise.resolve();
				else if(village.villageEvent.allianceId === event.toAlliance.id){
					villageAllianceDoc = defenceAllianceDoc;
					villageAllianceData = defenceAllianceData;
					villageEvent = _.find(defenceAllianceDoc.villageEvents, function(villageEvent){
						return villageEvent.id === village.villageEvent.eventId;
					})
					return self.cacheService.findPlayerAsync(villageEvent.playerData.id).then(function(doc){
						defencePlayerDoc = doc;
						return Promise.resolve();
					})
				}else{
					return self.cacheService.findAllianceAsync(village.villageEvent.allianceId).then(function(doc){
						villageAllianceDoc = doc;
						villageEvent = _.find(villageAllianceDoc.villageEvents, function(villageEvent){
							return villageEvent.id === village.villageEvent.eventId;
						})
						return self.cacheService.findPlayerAsync(villageEvent.playerData.id).then(function(doc){
							defencePlayerDoc = doc;
							return Promise.resolve();
						})
					})
				}
			}
		}).then(function(){
			if(!_.isObject(village) || (!!villageEvent && villageEvent.fromAlliance.id === attackAllianceDoc._id)){
				marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], [], event.defenceVillageData, event.fromAlliance, event.toAlliance)
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
				attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, null])
				if(!!defencePlayerDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, null])
				}
				if(!!defenceAllianceDoc && defenceAllianceDoc !== attackAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				return Promise.resolve()
			}
			if(isInAllianceFight){
				var allianceFight = attackAllianceDoc.allianceFight = defenceAllianceDoc.allianceFight;
				var allianceFightData = [];
				var attacker = null;
				var attackerString = null;
				var defencer = null;
				var defencerString = null;
				if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
					attacker = allianceFight.attacker;
					attackerString = 'attacker';
					defencer = allianceFight.defencer;
					defencerString = 'defencer';
				}else{
					attacker = allianceFight.defencer;
					attackerString = 'defencer';
					defencer = allianceFight.attacker;
					defencerString = 'attacker';
				}
			}
			resourceName = village.name.slice(0, -7);
			if(!_.isObject(villageEvent)){
				if(!isInAllianceFight || attackAllianceDoc === defenceAllianceDoc){
					eventData = MarchUtils.createAllianceVillageEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], [], defenceAllianceDoc, village)
					newVillageEvent = eventData.event
					pushFuncs.push([self.cacheService, self.cacheService.addVillageEventAsync, newVillageEvent]);
					village.villageEvent = {eventId:newVillageEvent.id, allianceId:newVillageEvent.fromAlliance.id};
					defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + '.villageEvent', village.villageEvent]);
					attackAllianceDoc.villageEvents.push(newVillageEvent)
					attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(newVillageEvent), newVillageEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", newVillageEvent.id, newVillageEvent.finishTime - Date.now()])
					TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.OccupyVillage)

					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					if(defenceAllianceDoc !== attackAllianceDoc){
						updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc]);
						pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData]);
					}
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
					return Promise.resolve()
				}else{
					resourceMax = DataUtils.getAllianceVillageResourceMax(village.name, village.level);
					lootResource = Math.floor(resourceMax * DataUtils.getAllianceIntInit('LootVillagePercent') / 100);
					lootResource = lootResource > village.resource ? village.resource : lootResource
					soldiersTotalLoad = DataUtils.getPlayerSoldiersTotalLoad(attackPlayerDoc, event.attackPlayerData.soldiers);
					finalLootCount = lootResource > soldiersTotalLoad ? soldiersTotalLoad : lootResource;
					rewards = [{
						type:"resources",
						name:resourceName,
						count:finalLootCount
					}]

					marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], rewards, event.defenceVillageData, event.fromAlliance, event.toAlliance)
					pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
					attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
					attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

					collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, rewards)
					pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, collectReport])

					defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village), null])
					LogicUtils.removeItemInArray(defenceAllianceDoc.villages, village)
					villageMapObject = LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, village.id)
					defenceAllianceData.push(["mapObjects." + defenceAllianceDoc.mapObjects.indexOf(villageMapObject), null])
					LogicUtils.removeItemInArray(defenceAllianceDoc.mapObjects, villageMapObject)
					villageCreateEvent = DataUtils.createVillageCreateEvent(village.name);
					defenceAllianceDoc.villageCreateEvents.push(villageCreateEvent)
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "villageCreateEvents", villageCreateEvent.id, villageCreateEvent.finishTime - Date.now()])

					attacker.allianceCountData.distroyVillageCount += 1;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.distroyVillageCount', attacker.allianceCountData.distroyVillageCount]);
					attackAllianceData = attackAllianceData.concat(allianceFightData);
					defenceAllianceData = defenceAllianceData.concat(allianceFightData);

					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc]);
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData]);
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData]);
					return Promise.resolve()
				}
			}else{
				attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
				DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
				attackDragonForFight = DataUtils.createPlayerDragonForFight(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc.basicInfo.terrain)
				defenceDragon = defencePlayerDoc.dragons[villageEvent.playerData.dragon.type]
				DataUtils.refreshPlayerDragonsHp(defencePlayerDoc, defenceDragon)
				defenceDragonForFight = DataUtils.createPlayerDragonForFight(defenceAllianceDoc, defencePlayerDoc, defenceDragon, defenceAllianceDoc.basicInfo.terrain)

				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, defenceAllianceDoc.basicInfo.terrain, attackDragonForFight.strength > defenceDragonForFight.strength)
				attackTreatSoldierPercent = DataUtils.getPlayerWoundedSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)
				defenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(defencePlayerDoc, villageEvent.playerData.soldiers, defenceDragon, defenceAllianceDoc.basicInfo.terrain, attackDragonForFight.strength <= defenceDragonForFight.strength)
				defenceTreatSoldierPercent = DataUtils.getPlayerWoundedSoldierPercent(defencePlayerDoc, defenceDragon)
				defenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(defencePlayerDoc, defenceDragon)
				defenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(defencePlayerDoc, defenceDragon)
				defenceDragonFightFixEffect = DataUtils.getFightFixedEffect(attackSoldiersForFight, defenceSoldiersForFight)
				var defenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight, defenceDragonFightFixEffect.dragon)
				var defenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent + defenceDragonFightFixEffect.soldier.attackSoldierEffect, attackSoldierMoraleDecreasedPercent + defenceToEnemySoldierMoralDecreasedAddPercent, defenceSoldiersForFight, defenceTreatSoldierPercent + defenceDragonFightFixEffect.soldier.defenceSoldierEffect, defenceSoldierMoraleDecreasedPercent + attackToEnemySoldierMoralDecreasedAddPercent)

				report = ReportUtils.createAttackVillageFightWithDefenceTroopReport(attackAllianceDoc, attackPlayerDoc, defenceAllianceDoc, village, villageAllianceDoc, defencePlayerDoc, defenceDragonFightData, defenceSoldierFightData)
				countData = report.countData
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, defencePlayerDoc._id, report.reportForDefencePlayer])

				attackDragonExpAdd = countData.attackDragonExpAdd
				attackPlayerKill = countData.attackPlayerKill
				attackSoldiers = createSoldiers(defenceSoldierFightData.attackSoldiersAfterFight)
				attackWoundedSoldiers = createWoundedSoldiers(defenceSoldierFightData.attackSoldiersAfterFight)
				attackRewards = report.reportForAttackPlayer.attackVillage.attackPlayerData.rewards

				defenceDragonExpAdd = countData.defenceDragonExpAdd
				defencePlayerKill = countData.defencePlayerKill
				defenceSoldiers = createSoldiers(defenceSoldierFightData.defenceSoldiersAfterFight)
				defenceWoundedSoldiers = createWoundedSoldiers(defenceSoldierFightData.defenceSoldiersAfterFight)
				defenceRewards = report.reportForAttackPlayer.attackVillage.defencePlayerData.rewards

				villageEvent.playerData.soldiers = defenceSoldiers
				LogicUtils.mergeRewards(villageEvent.playerData.rewards, defenceRewards)
				LogicUtils.mergeSoldiers(villageEvent.playerData.woundedSoldiers, defenceWoundedSoldiers)

				attackPlayerDoc.basicInfo.kill += attackPlayerKill
				attackPlayerData.push(["basicInfo.kill", attackPlayerDoc.basicInfo.kill])
				TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
				attackDragon.hp -= defenceDragonFightData.attackDragonHpDecreased
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, attackDragonExpAdd)
				attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
				attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])

				defencePlayerDoc.basicInfo.kill += defencePlayerKill
				defencePlayerData.push(["basicInfo.kill", defencePlayerDoc.basicInfo.kill])
				TaskUtils.finishPlayerKillTaskIfNeed(defencePlayerDoc, defencePlayerData)
				defenceDragon.hp -= defenceDragonFightData.defenceDragonHpDecreased
				if(defenceDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(defencePlayerDoc, defenceDragon)
					defencePlayerDoc.dragonDeathEvents.push(deathEvent)
					defencePlayerData.push(["dragonDeathEvents." + defencePlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, defencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				DataUtils.addPlayerDragonExp(defencePlayerDoc, defencePlayerData, defenceDragon, defenceDragonExpAdd)
				defencePlayerData.push(["dragons." + defenceDragon.type + ".hp", defenceDragon.hp])
				defencePlayerData.push(["dragons." + defenceDragon.type + ".hpRefreshTime", defenceDragon.hpRefreshTime])

				var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
				if(defenceSoldierFightData.fightResult === Consts.FightResult.AttackWin){
					pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, villageEvent]);
					villageAllianceData.push(["villageEvents." + villageAllianceDoc.villageEvents.indexOf(villageEvent), null])
					LogicUtils.removeItemInArray(villageAllianceDoc.villageEvents, villageEvent)
					TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.OccupyVillage)

					marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(defenceAllianceDoc, defencePlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, villageEvent.playerData.rewards, event.defenceVillageData, villageEvent.fromAlliance, villageEvent.toAlliance);
					pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
					villageAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
					villageAllianceData.push(["marchEvents.attackMarchReturnEvents." + villageAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, villageAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

					if(!isInAllianceFight){
						eventData = MarchUtils.createAllianceVillageEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, attackRewards, defenceAllianceDoc, village)
						newVillageEvent = eventData.event
						if(attackDragon.hp <= 0 || eventData.collectTotal <= resourceCollected){
							rewards = [{
								type:"resources",
								name:resourceName,
								count:eventData.collectTotal > resourceCollected ? resourceCollected : eventData.collectTotal
							}]
							LogicUtils.mergeRewards(newVillageEvent.playerData.rewards, rewards)
							marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, newVillageEvent.playerData.dragon, newVillageEvent.playerData.soldiers, newVillageEvent.playerData.woundedSoldiers, newVillageEvent.playerData.rewards, event.defenceVillageData, newVillageEvent.fromAlliance, newVillageEvent.toAlliance)
							pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
							attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
							attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
							eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
							collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, rewards)
							pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, collectReport])

							village.resource -= eventData.collectTotal > resourceCollected ? resourceCollected : eventData.collectTotal;
							defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						}else{
							var timeUsed = Math.floor(eventData.collectTime * (resourceCollected / eventData.collectTotal))
							newVillageEvent.startTime -= timeUsed
							newVillageEvent.finishTime -= timeUsed
							pushFuncs.push([self.cacheService, self.cacheService.addVillageEventAsync, newVillageEvent]);
							attackAllianceDoc.villageEvents.push(newVillageEvent)
							attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(newVillageEvent), newVillageEvent])
							eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", newVillageEvent.id, newVillageEvent.finishTime - Date.now()])

							village.villageEvent = {eventId:newVillageEvent.id, allianceId:newVillageEvent.fromAlliance.id};
							defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".villageEvent", village.villageEvent])
						}
					}else{
						resourceMax = DataUtils.getAllianceVillageResourceMax(village.name, village.level);
						lootResource = Math.floor(resourceMax * DataUtils.getAllianceIntInit('LootVillagePercent') / 100);
						lootResource = lootResource > village.resource ? village.resource : lootResource
						soldiersTotalLoad = DataUtils.getPlayerSoldiersTotalLoad(attackPlayerDoc, event.attackPlayerData.soldiers);
						finalLootCount = lootResource > soldiersTotalLoad ? soldiersTotalLoad : lootResource;
						rewards = [{
							type:"resources",
							name:resourceName,
							count:finalLootCount
						}]
						LogicUtils.mergeRewards(attackRewards, rewards);
						marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, attackRewards, event.defenceVillageData, event.fromAlliance, event.toAlliance)
						pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
						attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
						attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

						collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, rewards)
						pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, collectReport])

						defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village), null])
						LogicUtils.removeItemInArray(defenceAllianceDoc.villages, village)
						villageMapObject = LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, village.id)
						defenceAllianceData.push(["mapObjects." + defenceAllianceDoc.mapObjects.indexOf(villageMapObject), null])
						LogicUtils.removeItemInArray(defenceAllianceDoc.mapObjects, villageMapObject)
						villageCreateEvent = DataUtils.createVillageCreateEvent(village.name);
						defenceAllianceDoc.villageCreateEvents.push(villageCreateEvent)
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "villageCreateEvents", villageCreateEvent.id, villageCreateEvent.finishTime - Date.now()])

						attacker.allianceCountData.distroyVillageCount += 1;
						allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.distroyVillageCount', attacker.allianceCountData.distroyVillageCount]);
						attackAllianceData = attackAllianceData.concat(allianceFightData);
						defenceAllianceData = defenceAllianceData.concat(allianceFightData);
					}
				}else{
					marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, attackRewards, event.defenceVillageData, event.fromAlliance, event.toAlliance);
					pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
					attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
					attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

					var newSoldierLoadTotal = DataUtils.getPlayerSoldiersTotalLoad(defencePlayerDoc, villageEvent.playerData.soldiers)
					var newCollectInfo = DataUtils.getPlayerCollectResourceInfo(defencePlayerDoc, newSoldierLoadTotal, village)
					villageEvent.villageData.collectTotal = newCollectInfo.collectTotal
					villageEvent.finishTime = villageEvent.startTime + newCollectInfo.collectTime
					if(defenceDragon.hp <= 0 || newCollectInfo.collectTotal <= resourceCollected || LogicUtils.willFinished(villageEvent.finishTime)){
						rewards = [{
							type:"resources",
							name:resourceName,
							count:newCollectInfo.collectTotal
						}]
						LogicUtils.mergeRewards(villageEvent.playerData.rewards, rewards)
						pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, villageEvent]);
						villageAllianceData.push(["villageEvents." + villageAllianceDoc.villageEvents.indexOf(villageEvent), null])
						LogicUtils.removeItemInArray(villageAllianceDoc.villageEvents, villageEvent)
						eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, villageAllianceDoc, "villageEvents", villageEvent.id])
						marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(defenceAllianceDoc, defencePlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, villageEvent.playerData.rewards, event.defenceVillageData, villageEvent.fromAlliance, villageEvent.toAlliance);
						pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
						villageAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
						villageAllianceData.push(["marchEvents.attackMarchReturnEvents." + villageAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
						collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, rewards)
						pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, defencePlayerDoc._id, collectReport])

						village.resource -= newCollectInfo.collectTotal
						defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
					}else{
						pushFuncs.push([self.cacheService, self.cacheService.updateVillageEventAsync, villageEvent]);
						villageAllianceData.push(["villageEvents." + villageAllianceDoc.villageEvents.indexOf(villageEvent), villageEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.updateAllianceTimeEventAsync, villageAllianceDoc, "villageEvents", villageEvent.id, villageEvent.finishTime - Date.now()])
					}
				}
				if(isInAllianceFight){
					attacker.allianceCountData.kill += attackPlayerKill;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.kill', attacker.allianceCountData.kill]);
					updatePlayerKillData(allianceFight, allianceFightData, attackerString, attackPlayerDoc, attackPlayerKill)
					defencer.allianceCountData.kill += defencePlayerKill;
					allianceFightData.push(['allianceFight.' + defencerString + '.allianceCountData.kill', defencer.allianceCountData.kill]);
					updatePlayerKillData(allianceFight, allianceFightData, defencerString, defencePlayerDoc, defencePlayerKill)
					attackAllianceData = attackAllianceData.concat(allianceFightData);
					defenceAllianceData = defenceAllianceData.concat(allianceFightData);
				}

				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				if(defenceAllianceDoc !== attackAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
					if(defenceAllianceData.length > 0){
						pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
					}
				}
				if(villageAllianceDoc !== defenceAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, villageAllianceDoc._id, villageAllianceDoc])
					if(villageAllianceData.length > 0){
						pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, villageAllianceDoc, villageAllianceData])
					}
				}
				return Promise.resolve()
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(defencePlayerDoc._id, null))
			}
			if(_.isObject(defenceAllianceDoc) && attackAllianceDoc !== defenceAllianceDoc){
				funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
			}
			if(!!villageAllianceDoc && villageAllianceDoc !== defenceAllianceDoc){
				funcs.push(self.cacheService.updateAllianceAsync(villageAllianceDoc._id, null))
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
	if(_.isEqual(event.marchType, Consts.MarchType.Monster)){
		var defenceMonster = null;

		this.cacheService.findPlayerAsync(event.attackPlayerData.id).then(function(doc){
			attackPlayerDoc = doc
			if(event.fromAlliance.id !== event.toAlliance.id){
				return self.cacheService.findAllianceAsync(event.toAlliance.id).then(function(doc){
					defenceAllianceDoc = doc
					if(!defenceAllianceDoc || event.toAlliance.mapIndex !== defenceAllianceDoc.mapIndex) return Promise.resolve();
					defenceMonster = _.find(defenceAllianceDoc.monsters, function(monster){
						return _.isEqual(monster.id, event.defenceMonsterData.id)
					})
					return Promise.resolve()
				})
			}else{
				defenceAllianceDoc = attackAllianceDoc;
				defenceAllianceData = attackAllianceData;
				defenceMonster = _.find(defenceAllianceDoc.monsters, function(monster){
					return _.isEqual(monster.id, event.defenceMonsterData.id)
				})
				return Promise.resolve()
			}
		}).then(function(){
			if(!_.isObject(defenceMonster)){
				var marchReturnEvent = MarchUtils.createAttackMonsterMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], [], event.defenceMonsterData, event.fromAlliance, event.toAlliance);
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
				attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, null])
				if(!!defenceAllianceDoc && defenceAllianceDoc !== attackAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				return Promise.resolve()
			}else{
				var defenceMonsterForFight = DataUtils.createAllianceMonsterForFight(defenceAllianceDoc, defenceMonster)
				attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
				attackDragonForFight = DataUtils.createPlayerDragonForFight(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc.basicInfo.terrain)
				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, defenceAllianceDoc.basicInfo.terrain, true)
				attackTreatSoldierPercent = DataUtils.getPlayerWoundedSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)
				defenceDragonFightFixEffect = DataUtils.getFightFixedEffect(attackSoldiersForFight, defenceMonsterForFight.soldiersForFight)
				var defenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, defenceMonsterForFight.dragonForFight, defenceDragonFightFixEffect.dragon)
				var defenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent + defenceDragonFightFixEffect.soldier.attackSoldierEffect, attackSoldierMoraleDecreasedPercent, defenceMonsterForFight.soldiersForFight, 0, 1 + attackToEnemySoldierMoralDecreasedAddPercent)
				report = ReportUtils.createAttackMonsterReport(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, attackSoldiersForFight, defenceAllianceDoc, defenceMonster, defenceDragonFightData, defenceSoldierFightData)
				var attackMonsterReport = report.reportForAttackPlayer.attackMonster
				countData = report.countData
				attackPlayerDoc.basicInfo.kill += countData.attackPlayerKill
				attackPlayerData.push(["basicInfo.kill", attackPlayerDoc.basicInfo.kill])
				attackPlayerDoc.basicInfo.attackTotal += 1
				attackPlayerData.push(["basicInfo.attackTotal", attackPlayerDoc.basicInfo.attackTotal])
				TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
				attackSoldiers = createSoldiers(defenceSoldierFightData.attackSoldiersAfterFight)
				attackWoundedSoldiers = createWoundedSoldiers(defenceSoldierFightData.attackSoldiersAfterFight)
				attackPlayerRewards = attackMonsterReport.attackPlayerData.rewards
				attackDragon.hp -= defenceDragonFightData.attackDragonAfterFight.totalHp - defenceDragonFightData.attackDragonAfterFight.currentHp
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, countData.attackDragonExpAdd)
				attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
				attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])
				var attackMonsterMarchReturnEvent = MarchUtils.createAttackMonsterMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, attackPlayerRewards, event.defenceMonsterData, event.fromAlliance, event.toAlliance)
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', attackMonsterMarchReturnEvent]);
				attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(attackMonsterMarchReturnEvent)
				attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(attackMonsterMarchReturnEvent), attackMonsterMarchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", attackMonsterMarchReturnEvent.id, attackMonsterMarchReturnEvent.arriveTime - Date.now()])
				if(_.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
					defenceAllianceData.push(['monsters.' + defenceAllianceDoc.monsters.indexOf(defenceMonster), null])
					var defenceMonsterMapObject = _.find(defenceAllianceDoc.mapObjects, function(mapObject){
						return _.isEqual(mapObject.id, defenceMonster.id);
					})
					defenceAllianceData.push(['mapObjects.' + defenceAllianceDoc.mapObjects.indexOf(defenceMonsterMapObject), null])
					LogicUtils.removeItemInArray(defenceAllianceDoc.monsters, defenceMonster)
					LogicUtils.removeItemInArray(defenceAllianceDoc.mapObjects, defenceMonsterMapObject)
				}

				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData]);
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				if(defenceAllianceDoc !== attackAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData]);
				}
				return Promise.resolve();
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
			}
			if(_.isObject(defenceAllianceDoc) && attackAllianceDoc != defenceAllianceDoc){
				funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
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
}

/**
 * 进攻返回玩家城市事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onAttackMarchReturnEvents = function(allianceDoc, event, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'attackMarchReturnEvents', event]);
	allianceData.push(["marchEvents.attackMarchReturnEvents." + allianceDoc.marchEvents.attackMarchReturnEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(allianceDoc.marchEvents.attackMarchReturnEvents, event)

	this.cacheService.findPlayerAsync(event.attackPlayerData.id).then(function(doc){
		playerDoc = doc

		var dragonType = event.attackPlayerData.dragon.type
		var dragon = playerDoc.dragons[dragonType]
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		dragon.status = Consts.DragonStatus.Free
		playerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		playerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		playerData.push(["dragons." + dragonType + ".status", dragon.status])
		LogicUtils.removePlayerTroopOut(playerDoc, dragonType);
		LogicUtils.addPlayerSoldiers(playerDoc, playerData, event.attackPlayerData.soldiers);
		DataUtils.addPlayerWoundedSoldiers(playerDoc, playerData, event.attackPlayerData.woundedSoldiers);
		DataUtils.refreshPlayerPower(playerDoc, playerData);
		DataUtils.refreshPlayerResources(playerDoc);
		playerData.push(["resources", playerDoc.resources])
		LogicUtils.addPlayerRewards(playerDoc, playerData, event.attackPlayerData.rewards)

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
 * 突袭行军事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onStrikeMarchEvents = function(allianceDoc, event, callback){
	var self = this
	var attackAllianceDoc = allianceDoc
	var attackAllianceData = []
	var attackPlayerDoc = null
	var attackPlayerData = []
	var defencePlayerDoc = null
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var helpDefencePlayerDoc = null
	var helpDefencePlayerData = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = [];
	var funcs = null
	var deathEvent = null
	var isInAllianceFight = null;

	pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'strikeMarchEvents', event])
	attackAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.marchEvents.strikeMarchEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(attackAllianceDoc.marchEvents.strikeMarchEvents, event)
	if(_.isEqual(event.marchType, Consts.MarchType.City)){
		var defencePlayer = null
		funcs = []
		funcs.push(self.cacheService.findPlayerAsync(event.attackPlayerData.id))
		funcs.push(self.cacheService.findPlayerAsync(event.defencePlayerData.id))
		funcs.push(self.cacheService.findAllianceAsync(event.toAlliance.id))
		Promise.all(funcs).spread(function(doc_1, doc_2, doc_3){
			attackPlayerDoc = doc_1
			defencePlayerDoc = doc_2
			defenceAllianceDoc = doc_3
			if(!defenceAllianceDoc || event.toAlliance.mapIndex !== defenceAllianceDoc.mapIndex) return Promise.resolve(false);
			var defencePlayerObject = LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id);
			if(!defencePlayerObject || !_.isEqual(defencePlayerObject.location, event.toAlliance.location)) return Promise.resolve(false);
			defencePlayer = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
			if(attackAllianceDoc.basicInfo.status === Consts.AllianceStatus.Fight){
				var enemyAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id);
				isInAllianceFight = enemyAllianceId === defenceAllianceDoc._id
			}

			if(defencePlayerDoc.helpedByTroops.length > 0){
				return self.cacheService.findPlayerAsync(defencePlayerDoc.helpedByTroops[0].id).then(function(doc){
					helpDefencePlayerDoc = doc
					return Promise.resolve(true)
				})
			}else{
				return Promise.resolve(true)
			}
		}).then(function(defencePlayerExist){
			if(!defencePlayerExist){
				strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackPlayerDoc, attackPlayerDoc.dragons[event.attackPlayerData.dragon.type], defencePlayerDoc, event.fromAlliance, event.toAlliance)
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchReturnEvents', strikeMarchReturnEvent]);
				attackAllianceDoc.marchEvents.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
				attackAllianceData.push(["marchEvents.strikeMarchReturnEvents." + attackAllianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime - Date.now()])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, null]);
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, null]);
				if(!!defenceAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, null]);
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				return Promise.resolve()
			}
			if(isInAllianceFight){
				var allianceFight = attackAllianceDoc.allianceFight = defenceAllianceDoc.allianceFight;
				var allianceFightData = [];
				var attacker = null;
				var attackerString = null;
				if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
					attacker = allianceFight.attacker;
					attackerString = 'attacker';
				}else{
					attacker = allianceFight.defencer;
					attackerString = 'defencer';
				}
			}

			var attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
			var report = null
			var strikeMarchReturnEvent = null
			if(_.isObject(helpDefencePlayerDoc)){
				var helpDefenceDragon = helpDefencePlayerDoc.dragons[defencePlayerDoc.helpedByTroops[0].dragon.type]
				DataUtils.refreshPlayerDragonsHp(defencePlayerDoc, helpDefenceDragon)
				report = ReportUtils.createStrikeCityFightWithHelpDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragon)
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])
				pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, helpDefencePlayerDoc._id, report.reportForDefencePlayer])
				var helpDefenceTitle = DataUtils.getLocalizationConfig("alliance", "HelpDefenceStrikeTitle")
				var helpDefenceContent = DataUtils.getLocalizationConfig("alliance", "HelpDefenceStrikeContent")
				var helpDefenceParams = [defenceAllianceDoc.basicInfo.tag, helpDefencePlayerDoc.basicInfo.name]
				pushFuncs.push([self.dataService, self.dataService.sendSysMailAsync, defencePlayerDoc._id, helpDefenceTitle, helpDefenceParams, helpDefenceContent, helpDefenceParams])

				attackDragon.hp -= report.reportForAttackPlayer.strikeCity.attackPlayerData.dragon.hpDecreased
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
				attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, helpDefencePlayerDoc._id, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])

				if(isInAllianceFight){
					attacker.allianceCountData.strikeCount += 1;
					allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.strikeCount', attacker.allianceCountData.strikeCount]);
					if(report.powerCompare >= 1){
						attacker.allianceCountData.strikeSuccessCount += 1;
						allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.strikeSuccessCount', attacker.allianceCountData.strikeSuccessCount]);
						attackPlayerDoc.basicInfo.strikeWin += 1
						attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
					attackAllianceData = attackAllianceData.concat(allianceFightData);
					defenceAllianceData = defenceAllianceData.concat(allianceFightData);
				}
			}

			if(attackDragon.hp <= 0 || defencePlayer.isProtected){
				strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackPlayerDoc, attackDragon, defencePlayerDoc, event.fromAlliance, event.toAlliance);
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchReturnEvents', strikeMarchReturnEvent]);
				attackAllianceDoc.marchEvents.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
				attackAllianceData.push(["marchEvents.strikeMarchReturnEvents." + attackAllianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime - Date.now()])
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc]);
				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, defencePlayerDoc]);
				updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc]);
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
				return Promise.resolve()
			}else{
				DataUtils.refreshPlayerResources(defencePlayerDoc)
				var defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
				if(!_.isObject(defenceDragon)){
					report = ReportUtils.createStrikeCityNoDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
					pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])
					pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, defencePlayerDoc._id, report.reportForDefencePlayer])
					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, defencePlayerDoc])

					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackPlayerDoc, attackDragon, defencePlayerDoc, event.fromAlliance, event.toAlliance);
					pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchReturnEvents', strikeMarchReturnEvent]);
					attackAllianceDoc.marchEvents.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.push(["marchEvents.strikeMarchReturnEvents." + attackAllianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime - Date.now()])

					if(isInAllianceFight){
						attacker.allianceCountData.strikeCount += 1;
						allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.strikeCount', attacker.allianceCountData.strikeCount]);
						attacker.allianceCountData.strikeSuccessCount += 1;
						allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.strikeSuccessCount', attacker.allianceCountData.strikeSuccessCount]);
						attackPlayerDoc.basicInfo.strikeWin += 1
						attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						attackAllianceData = attackAllianceData.concat(allianceFightData);
						defenceAllianceData = defenceAllianceData.concat(allianceFightData);
					}

					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
				}else{
					report = ReportUtils.createStrikeCityFightWithDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, defenceDragon)
					pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])
					pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, defencePlayerDoc._id, report.reportForDefencePlayer])
					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, defencePlayerDoc])

					attackDragon.hp -= report.reportForAttackPlayer.strikeCity.attackPlayerData.dragon.hpDecreased
					if(attackDragon.hp <= 0){
						deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
						attackPlayerDoc.dragonDeathEvents.push(deathEvent)
						attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
					}
					attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
					attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])

					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackPlayerDoc, attackDragon, defencePlayerDoc, event.fromAlliance, event.toAlliance);
					pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchReturnEvents', strikeMarchReturnEvent]);
					attackAllianceDoc.marchEvents.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.push(["marchEvents.strikeMarchReturnEvents." + attackAllianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime - Date.now()])
					if(isInAllianceFight){
						attacker.allianceCountData.strikeCount += 1;
						allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.strikeCount', attacker.allianceCountData.strikeCount]);
						if(report.powerCompare >= 1){
							attacker.allianceCountData.strikeSuccessCount += 1;
							allianceFightData.push(['allianceFight.' + attackerString + '.allianceCountData.strikeSuccessCount', attacker.allianceCountData.strikeSuccessCount]);
							attackPlayerDoc.basicInfo.strikeWin += 1
							attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
							TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						}
						attackAllianceData = attackAllianceData.concat(allianceFightData);
						defenceAllianceData = defenceAllianceData.concat(allianceFightData);
					}

					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
					return Promise.resolve()
				}
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			var funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(defencePlayerDoc._id, null))
			}
			if(_.isObject(helpDefencePlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(helpDefencePlayerDoc._id, null))
			}
			if(_.isObject(defenceAllianceDoc)){
				funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
			}
			if(funcs.length > 0){
				Promise.all(funcs).then(function(){
					callback(e)
				})
			}else{
				callback(e)
			}
		})
		return
	}
	if(_.isEqual(event.marchType, Consts.MarchType.Village)){
		var villageEvent = null
		var village = null
		var report = null
		var marchReturnEvent = null
		var villageAllianceDoc = null;

		this.cacheService.findPlayerAsync(event.attackPlayerData.id).then(function(doc){
			attackPlayerDoc = doc
			if(event.fromAlliance.id !== event.toAlliance.id){
				return self.cacheService.findAllianceAsync(event.toAlliance.id).then(function(doc){
					defenceAllianceDoc = doc
					if(!defenceAllianceDoc || event.toAlliance.mapIndex !== defenceAllianceDoc.mapIndex) return Promise.resolve();
					village = LogicUtils.getAllianceVillageById(defenceAllianceDoc, event.defenceVillageData.id)
					return Promise.resolve()
				})
			}else{
				defenceAllianceDoc = attackAllianceDoc;
				village = LogicUtils.getAllianceVillageById(attackAllianceDoc, event.defenceVillageData.id)
				return Promise.resolve()
			}
		}).then(function(){
			if(!village || !village.villageEvent || village.villageEvent.allianceId === event.fromAlliance.id) return Promise.resolve();

			if(village.villageEvent.allianceId === event.toAlliance.id){
				villageEvent = _.find(defenceAllianceDoc.villageEvents, function(villageEvent){
					return villageEvent.id === village.villageEvent.eventId;
				})
				return self.cacheService.findPlayerAsync(villageEvent.playerData.id).then(function(doc){
					defencePlayerDoc = doc;
					return Promise.resolve();
				})
			}else{
				return self.cacheService.findAllianceAsync(village.villageEvent.allianceId).then(function(doc){
					villageAllianceDoc = doc;
					villageEvent = _.find(villageAllianceDoc.villageEvents, function(villageEvent){
						return villageEvent.id === village.villageEvent.eventId;
					})
					return self.cacheService.findPlayerAsync(villageEvent.playerData.id).then(function(doc){
						defencePlayerDoc = doc;
						return Promise.resolve();
					})
				})
			}
		}).then(function(){
			if(!village || !villageEvent){
				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackPlayerDoc, event.attackPlayerData.dragon, event.defenceVillageData, event.fromAlliance, event.toAlliance);
				pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchReturnEvents', marchReturnEvent]);
				attackAllianceDoc.marchEvents.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["marchEvents.strikeMarchReturnEvents." + attackAllianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, null])
				if(attackAllianceDoc !== defenceAllianceDoc && !!defenceAllianceDoc){
					updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
				return Promise.resolve()
			}

			var attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			var defenceDragon = defencePlayerDoc.dragons[villageEvent.playerData.dragon.type]
			report = ReportUtils.createStrikeVillageFightWithDefencePlayerDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, village, !!villageAllianceDoc ? villageAllianceDoc : defenceAllianceDoc, villageEvent, defencePlayerDoc, defenceDragon)
			pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, report.reportForAttackPlayer])
			pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, defencePlayerDoc._id, report.reportForDefencePlayer])
			attackDragon.hp -= report.reportForAttackPlayer.strikeVillage.attackPlayerData.dragon.hpDecreased
			if(attackDragon.hp <= 0){
				deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
				attackPlayerDoc.dragonDeathEvents.push(deathEvent)
				attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
			}
			attackPlayerData.dragons = {}
			attackPlayerData.dragons[attackDragon.type] = attackPlayerDoc.dragons[attackDragon.type]

			updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
			updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, defencePlayerDoc._id, null])

			marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackPlayerDoc, attackDragon, event.defenceVillageData, event.fromAlliance, event.toAlliance);
			pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'strikeMarchReturnEvents', marchReturnEvent]);
			attackAllianceDoc.marchEvents.strikeMarchReturnEvents.push(marchReturnEvent)
			attackAllianceData.push(["marchEvents.strikeMarchReturnEvents." + attackAllianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

			if(attackAllianceDoc !== defenceAllianceDoc){
				updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, null])
			}
			if(!!villageAllianceDoc){
				updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, villageAllianceDoc._id, null])
			}
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(defencePlayerDoc._id, null))
			}
			if(attackAllianceDoc != defenceAllianceDoc && !!defenceAllianceDoc){
				funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
			}
			if(!!villageAllianceDoc){
				funcs.push(self.cacheService.updateAllianceAsync(villageAllianceDoc._id, null))
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
}

/**
 * 突袭返回玩家城市事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onStrikeMarchReturnEvents = function(allianceDoc, event, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'strikeMarchReturnEvents', event]);
	allianceData.push(["marchEvents.strikeMarchReturnEvents." + allianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(allianceDoc.marchEvents.strikeMarchReturnEvents, event)

	this.cacheService.findPlayerAsync(event.attackPlayerData.id).then(function(doc){
		playerDoc = doc
		var dragonType = event.attackPlayerData.dragon.type
		var dragon = playerDoc.dragons[dragonType]
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		dragon.status = Consts.DragonStatus.Free
		playerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		playerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		playerData.push(["dragons." + dragonType + ".status", dragon.status])

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
 * 联盟圣地事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onShrineEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	allianceData.push(["shrineEvents." + allianceDoc.shrineEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(allianceDoc.shrineEvents, event)
	if(event.playerTroops.length == 0){
		var shrineReport = ReportUtils.createAttackShrineEmptyReport(event.stageName);
		if(allianceDoc.shrineReports.length >= Define.AllianceShrineReportsMaxSize){
			var willRemovedshrineReport = allianceDoc.shrineReports[0]
			allianceData.push(["shrineReports." + allianceDoc.shrineReports.indexOf(willRemovedshrineReport), null])
			LogicUtils.removeItemInArray(allianceDoc.shrineReports, willRemovedshrineReport)
		}
		allianceDoc.shrineReports.push(shrineReport)
		allianceData.push(["shrineReports." + allianceDoc.shrineReports.indexOf(shrineReport), shrineReport])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}else{
		var playerDocs = {}
		var playerTroopsForFight = []
		var funcs = []
		var findPlayerDoc = function(playerId){
			return self.cacheService.findPlayerAsync(playerId).then(function(doc){
				playerDocs[doc._id] = doc
				return Promise.resolve()
			})
		}
		_.each(event.playerTroops, function(playerTroop){
			funcs.push(findPlayerDoc(playerTroop.id))
		})
		Promise.all(funcs).then(function(){
			_.each(event.playerTroops, function(playerTroop){
				var playerDoc = playerDocs[playerTroop.id]
				playerTroop.playerDoc = playerDoc
				var dragon = playerDoc.dragons[playerTroop.dragon.type]
				DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
				var dragonForFight = DataUtils.createPlayerDragonForFight(allianceDoc, playerDoc, dragon, allianceDoc.basicInfo.terrain)
				var soldiersForFight = DataUtils.createPlayerSoldiersForFight(playerDoc, playerTroop.soldiers, dragon, allianceDoc.basicInfo.terrain, true)
				var playerTroopForFight = {
					playerDoc:playerDoc,
					dragonForFight:dragonForFight,
					soldiersForFight:soldiersForFight,
					woundedSoldierPercent:DataUtils.getPlayerWoundedSoldierPercent(playerDocs[playerTroop.id], dragon),
					soldierMoraleDecreasedPercent:DataUtils.getPlayerSoldierMoraleDecreasedPercent(playerDocs[playerTroop.id], dragon),
					soldierToEnemyMoraleDecreasedAddPercent:DataUtils.getEnemySoldierMoraleAddedPercent(playerDocs[playerTroop.id], dragon)
				}
				playerTroopsForFight.push(playerTroopForFight)
			})
			//playerTroopsForFight = _.sortBy(playerTroopsForFight, function(playerTroopForFight){
			//	return -getTotalPower(playerTroopForFight.soldiersForFight)
			//})

			var stageTroopsForFight = DataUtils.getAllianceShrineStageTroops(allianceDoc, event.stageName)
			var playerAvgPower = LogicUtils.getPlayerTroopsAvgPower(playerTroopsForFight)
			var currentRound = 1
			var playerSuccessedTroops = []
			var stageSuccessedTroops = []
			var fightDatas = [];
			while(playerTroopsForFight.length > 0 && stageTroopsForFight.length > 0){
				(function(){
					var playerTroopForFight = playerTroopsForFight[0]
					var stageTroopForFight = stageTroopsForFight[0]
					var dragonFightFixedEffect = DataUtils.getFightFixedEffect(playerTroopForFight.soldiersForFight, stageTroopForFight.soldiersForFight)
					var dragonFightData = FightUtils.dragonToDragonFight(playerTroopForFight.dragonForFight, stageTroopForFight.dragonForFight, dragonFightFixedEffect.dragon)
					var soldierFightData = FightUtils.soldierToSoldierFight(playerTroopForFight.soldiersForFight, playerTroopForFight.woundedSoldierPercent + dragonFightFixedEffect.soldier.attackSoldierEffect, playerTroopForFight.soldierMoraleDecreasedPercent, stageTroopForFight.soldiersForFight, 0, 1 + playerTroopForFight.soldierToEnemyMoraleDecreasedAddPercent)
					if(_.isEqual(soldierFightData.fightResult, Consts.FightResult.AttackWin)){
						playerSuccessedTroops.push(playerTroopForFight)
					}else{
						stageSuccessedTroops.push(stageTroopForFight)
					}

					LogicUtils.removeItemInArray(playerTroopsForFight, playerTroopForFight)
					LogicUtils.removeItemInArray(stageTroopsForFight, stageTroopForFight)
					LogicUtils.resetFightSoldiersByFightResult(playerTroopForFight.soldiersForFight, soldierFightData.attackRoundDatas)
					LogicUtils.resetFightSoldiersByFightResult(stageTroopForFight.soldiersForFight, soldierFightData.defenceRoundDatas)
					playerTroopForFight.dragonForFight.totalHp = dragonFightData.attackDragonAfterFight.currentHp
					playerTroopForFight.dragonForFight.currentHp = dragonFightData.attackDragonAfterFight.currentHp
					stageTroopForFight.dragonForFight.totalHp = dragonFightData.defenceDragonAfterFight.currentHp
					stageTroopForFight.dragonForFight.currentHp = dragonFightData.defenceDragonAfterFight.currentHp

					var currentFightData = null
					if(fightDatas.length < currentRound){
						currentFightData = {
							roundDatas:[]
						}
						fightDatas.push(currentFightData)
					}else{
						currentFightData = fightDatas[currentRound - 1]
					}
					var currentRoundDatas = currentFightData.roundDatas
					currentRoundDatas.push({
						playerDoc:playerTroopForFight.playerDoc,
						stageTroopNumber:stageTroopForFight.troopNumber,
						dragonFightData:dragonFightData,
						soldierFightData:soldierFightData
					})

					if((playerTroopsForFight.length == 0 && playerSuccessedTroops.length > 0) || (stageTroopsForFight.length == 0 && stageSuccessedTroops.length > 0)){
						if(playerTroopsForFight.length == 0 && playerSuccessedTroops.length > 0){
							_.each(playerSuccessedTroops, function(troop){
								if(troop.dragonForFight.maxHp > 0) playerTroopsForFight.push(troop)
							})
							LogicUtils.clearArray(playerSuccessedTroops)
						}
						if(stageTroopsForFight.length == 0 && stageSuccessedTroops.length > 0){
							_.each(stageSuccessedTroops, function(troop){
								if(troop.dragonForFight.maxHp > 0) stageTroopsForFight.push(troop)
							})
							LogicUtils.clearArray(stageSuccessedTroops)
						}
						currentRound += 1
					}
				})();
			}

			var report = ReportUtils.createAttackShrineReport(allianceDoc, event.stageName, event.playerTroops, playerAvgPower, fightDatas, playerTroopsForFight.length > 0)
			//console.log(NodeUtils.inspect(report, false, null))
			var shrineReport = report.shrineReport;
			var fightStar = report.fightStar;
			if(allianceDoc.shrineReports.length >= Define.AllianceShrineReportsMaxSize){
				var willRemovedshrineReport = allianceDoc.shrineReports[0]
				allianceData.push(["shrineReports." + allianceDoc.shrineReports.indexOf(willRemovedshrineReport), null])
				LogicUtils.removeItemInArray(allianceDoc.shrineReports, willRemovedshrineReport)
			}
			allianceDoc.shrineReports.push(shrineReport)
			allianceData.push(["shrineReports." + allianceDoc.shrineReports.indexOf(shrineReport), shrineReport])
			allianceDoc.basicInfo.honour += report.allianceHonourGet;
			allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
			var stageData = LogicUtils.getAllianceShrineStageData(allianceDoc, event.stageName)
			if(!_.isObject(stageData)){
				stageData = {
					stageName:event.stageName,
					maxStar:fightStar
				}
				allianceDoc.shrineDatas.push(stageData)
				allianceData.push(["shrineDatas." + allianceDoc.shrineDatas.indexOf(stageData), stageData])
			}else if(stageData.maxStar < fightStar){
				stageData.maxStar = fightStar
				allianceData.push(["shrineDatas." + allianceDoc.shrineDatas.indexOf(stageData) + ".maxStar", stageData.maxStar])
			}

			_.each(event.playerTroops, function(playerTroop){
				(function(){
					var playerId = playerTroop.id;
					var playerDoc = playerTroop.playerDoc;
					var playerReport = report.playerFullReports[playerId];
					var soldiers = report.playersSoldiersAndWoundedSoldiers[playerId].soldiers;
					var woundedSoldiers = report.playersSoldiersAndWoundedSoldiers[playerId].woundedSoldiers;
					var rewards = report.playerRewards[playerId];
					var kill = report.playerKills[playerId];
					var dragon = playerDoc.dragons[playerTroop.dragon.type];
					var dragonHpDecreased = report.playerDragons[playerId].hpDecreased;
					var dragonExpAdd = report.playerDragons[playerId].expAdd;
					var playerData = [];

					playerDoc.basicInfo.kill += kill
					playerData.push(["basicInfo.kill", playerDoc.basicInfo.kill])
					TaskUtils.finishPlayerKillTaskIfNeed(playerDoc, playerData)
					dragon.hp -= dragonHpDecreased
					if(dragon.hp <= 0){
						var deathEvent = DataUtils.createPlayerDragonDeathEvent(playerDoc, dragon)
						playerDoc.dragonDeathEvents.push(deathEvent)
						playerData.push(["dragonDeathEvents." + playerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
					}
					DataUtils.addPlayerDragonExp(playerDoc, playerData, dragon, dragonExpAdd)
					playerData.push(["dragons." + dragon.type + ".hp", dragon.hp])
					playerData.push(["dragons." + dragon.type + ".hpRefreshTime", dragon.hpRefreshTime])
					updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
					pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, playerDoc._id, playerReport])

					var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(allianceDoc, playerDoc, dragon, soldiers, woundedSoldiers, rewards)
					pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
					allianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
					allianceData.push(["marchEvents.attackMarchReturnEvents." + allianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
				})();
			})
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			var funcs = []
			_.each(_.values(playerDocs), function(playerDoc){
				funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
			})
			if(funcs.length > 0){
				Promise.all(funcs).then(function(){
					callback(e)
				})
			}else{
				callback(e)
			}
		})
	}
}

/**
 * 村落采集事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onVillageEvents = function(allianceDoc, event, callback){
	var self = this
	var attackPlayerDoc = null
	var attackAllianceDoc = allianceDoc
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = null
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, event]);
	attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, event)

	this.cacheService.findPlayerAsync(event.playerData.id).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isEqual(event.fromAlliance.id, event.toAlliance.id)){
			return self.cacheService.findAllianceAsync(event.toAlliance.id).then(function(doc){
				defenceAllianceDoc = doc
				defenceAllianceData = []
				return Promise.resolve()
			})
		}else{
			defenceAllianceDoc = attackAllianceDoc
			defenceAllianceData = attackAllianceData
			return Promise.resolve()
		}
	}).then(function(){
		var village = LogicUtils.getAllianceVillageById(defenceAllianceDoc, event.villageData.id)
		village.villageEvent = null;
		var resourceName = village.name.slice(0, -7)
		var rewards = [{
			type:"resources",
			name:resourceName,
			count:event.villageData.collectTotal
		}]
		LogicUtils.mergeRewards(event.playerData.rewards, rewards)

		var marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.playerData.dragon, event.playerData.soldiers, event.playerData.woundedSoldiers, event.playerData.rewards, event.villageData, event.fromAlliance, event.toAlliance);
		pushFuncs.push([self.cacheService, self.cacheService.addMarchEventAsync, 'attackMarchReturnEvents', marchReturnEvent]);
		attackAllianceDoc.marchEvents.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.push(["marchEvents.attackMarchReturnEvents." + attackAllianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

		var collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, rewards)
		pushFuncs.push([self.dataService, self.dataService.sendSysReportAsync, attackPlayerDoc._id, collectReport])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, attackPlayerDoc._id, attackPlayerDoc])

		if(event.villageData.collectTotal >= village.resource){
			defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village), null])
			LogicUtils.removeItemInArray(defenceAllianceDoc.villages, village)
			var villageMapObject = LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, village.id)
			defenceAllianceData.push(["mapObjects." + defenceAllianceDoc.mapObjects.indexOf(villageMapObject), null])
			LogicUtils.removeItemInArray(defenceAllianceDoc.mapObjects, villageMapObject)
			var villageCreateEvent = DataUtils.createVillageCreateEvent(village.name);
			defenceAllianceDoc.villageCreateEvents.push(villageCreateEvent)
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "villageCreateEvents", villageCreateEvent.id, villageCreateEvent.finishTime - Date.now()])
		}else{
			village.resource -= event.villageData.collectTotal
			village.villageEvent = null;
			defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
			defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".villageEvent", village.villageEvent])
		}

		if(attackAllianceDoc != defenceAllianceDoc){
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
		}
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(attackPlayerDoc._id, null))
		}
		if(attackAllianceDoc != defenceAllianceDoc && _.isObject(defenceAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
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
 * 联盟村落刷新事件触发
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onVillageCreateEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var eventFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.villageCreateEvents, event)
	var totalCount = DataUtils.getAllianceVillagesTotalCount(allianceDoc)
	var currentCount = allianceDoc.villages.length + allianceDoc.villageCreateEvents.length
	DataUtils.createAllianceVillage(allianceDoc, allianceData, event.name, totalCount - currentCount);
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
	callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
}

/**
 * 联盟野怪刷新事件触发
 * @param allianceDoc
 * @param callback
 */
pro.onMonsterRefreshEvent = function(allianceDoc, callback){
	var self = this
	var allianceData = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []

	var minMonsterCount = DataUtils.getAllianceIntInit('minMonsterCount')
	var monstersPerPlayer = DataUtils.getAllianceIntInit('monstersPerPlayer')
	var allianceMembers = allianceDoc.members;
	var monsterCount = (function(){
		var count = allianceMembers.length * monstersPerPlayer
		return count > minMonsterCount ? count : minMonsterCount
	})();
	var monsterMapObjects = _.filter(allianceDoc.mapObjects, function(mapObject){
		return _.isEqual(mapObject.name, 'monster')
	});
	LogicUtils.removeItemsInArray(allianceDoc.mapObjects, monsterMapObjects);
	allianceDoc.monsters.length = 0;

	var mapRound = LogicUtils.getAllianceMapRound(allianceDoc);
	var monsterLevelConfigString = AllianceMap.buff[mapRound].monsterLevel;
	var monsterLevels = monsterLevelConfigString.split('_');
	var monsterLevelMin = parseInt(monsterLevels[0]);
	var monsterLevelMax = parseInt(monsterLevels[1]);

	var buildingConfig = AllianceMap.buildingName['monster'];
	var width = buildingConfig.width
	var height = buildingConfig.height
	var map = MapUtils.buildMap(allianceDoc.basicInfo.terrainStyle, allianceDoc.mapObjects);
	var mapObjects = allianceDoc.mapObjects;
	for(var i = 0; i < monsterCount; i++){
		(function(){
			var monsterLevel = _.random(monsterLevelMin, monsterLevelMax);
			var rect = MapUtils.getRect(map, width, height)
			var monsterConfig = AllianceInitData.monsters[monsterLevel];
			var soldiersConfigStrings = monsterConfig.soldiers.split(';');
			var soldiersConfigString = _.sample(soldiersConfigStrings);
			var soldierName = soldiersConfigString.split(':')[0];
			if(_.isObject(rect)){
				var monsterMapObject = MapUtils.addMapObject(map, mapObjects, rect, buildingConfig.name)
				var monster = {
					id:monsterMapObject.id,
					name:soldierName,
					level:monsterLevel
				}
				allianceDoc.monsters.push(monster)
			}
		})();
	}

	var monsterRefreshTime = DataUtils.getAllianceIntInit('monsterRefreshMinutes') * 60 * 1000;
	allianceDoc.basicInfo.monsterRefreshTime = Date.now() + monsterRefreshTime;
	eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, Consts.MonsterRefreshEvent, Consts.MonsterRefreshEvent, monsterRefreshTime]);

	allianceData.push(['basicInfo.monsterRefreshTime', allianceDoc.basicInfo.monsterRefreshTime])
	allianceData.push(['monsters', allianceDoc.monsters])
	allianceData.push(['mapObjects', allianceDoc.mapObjects])
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])

	callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
}

/**
 * 到达指定时间时,联盟战斗触发的消息
 * @param ourAllianceId
 * @param enemyAllianceId
 * @param callback
 */
pro.onFightTimeEvent = function(ourAllianceId, enemyAllianceId, callback){
	var self = this
	var attackAllianceDoc = null
	var defenceAllianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	var eventFuncs = []
	var funcs = []
	funcs.push(this.cacheService.findAllianceAsync(ourAllianceId))
	funcs.push(this.cacheService.findAllianceAsync(enemyAllianceId))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		attackAllianceDoc = doc_1
		defenceAllianceDoc = doc_2
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, attackAllianceDoc._id, attackAllianceDoc])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, defenceAllianceDoc._id, defenceAllianceDoc])
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare)){
			return self.onAlliancePrepareStatusFinishedAsync(attackAllianceDoc, defenceAllianceDoc)
		}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return self.onAllianceFightStatusFinishedAsync(attackAllianceDoc, defenceAllianceDoc)
		}else{
			return Promise.reject(ErrorUtils.illegalAllianceStatus(attackAllianceDoc._id, attackAllianceDoc.basicInfo.status))
		}
	}).then(function(params){
		updateFuncs = updateFuncs.concat(params.updateFuncs)
		eventFuncs = eventFuncs.concat(params.eventFuncs)
		pushFuncs = pushFuncs.concat(params.pushFuncs)
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
			funcs.push(self.cacheService.updateAllianceAsync(attackAllianceDoc._id, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(defenceAllianceDoc._id, null))
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
 * 联盟战斗准备状态事件回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param callback
 */
pro.onAlliancePrepareStatusFinished = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var attackAllianceData = []
	var defenceAllianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	var now = Date.now()
	var statusFinishTime = now + (DataUtils.getAllianceIntInit("allianceFightTotalFightMinutes") * 60 * 1000 / 10)
	attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
	attackAllianceData.push(["basicInfo.status", attackAllianceDoc.basicInfo.status])
	attackAllianceDoc.basicInfo.statusStartTime = now
	attackAllianceData.push(["basicInfo.statusStartTime", attackAllianceDoc.basicInfo.statusStartTime])
	attackAllianceDoc.basicInfo.statusFinishTime = statusFinishTime
	attackAllianceData.push(["basicInfo.statusFinishTime", attackAllianceDoc.basicInfo.statusFinishTime])
	defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
	defenceAllianceData.push(["basicInfo.status", defenceAllianceDoc.basicInfo.status])
	defenceAllianceDoc.basicInfo.statusStartTime = now
	defenceAllianceData.push(["basicInfo.statusStartTime", defenceAllianceDoc.basicInfo.statusStartTime])
	defenceAllianceDoc.basicInfo.statusFinishTime = statusFinishTime
	defenceAllianceData.push(["basicInfo.statusFinishTime", defenceAllianceDoc.basicInfo.statusFinishTime])

	eventFuncs.push([this.timeEventService, this.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, statusFinishTime - Date.now()])
	pushFuncs.push([this.pushService, this.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
	pushFuncs.push([this.pushService, this.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
	callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	this.apnService.onAllianceFightStart(attackAllianceDoc, defenceAllianceDoc);
}

/**
 * 联盟战战斗中事件回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param callback
 */
pro.onAllianceFightStatusFinished = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var self = this
	var attackAllianceData = []
	var defenceAllianceData = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	var now = Date.now()
	var killMaxPlayer = (function(){
		var maxPlayerKill = null
		var playerKills = attackAllianceDoc.allianceFight.attacker.playerKills.concat(attackAllianceDoc.allianceFight.defencer.playerKills)
		_.each(playerKills, function(playerKill){
			if(maxPlayerKill == null || maxPlayerKill.kill < playerKill.kill) maxPlayerKill = playerKill
		})
		return _.isObject(maxPlayerKill) ? maxPlayerKill : null
	})();
	var killMaxPlayerGemGet = (function(){
		if(!_.isObject(killMaxPlayer)) return 0
		var serverConfig = self.app.getServerById(self.app.get("cacheServerId"))
		return DataUtils.getAllianceFightKillFirstGemCount(serverConfig.level)
	})();
	var allianceFightInitHonour = (function(){
		var serverConfig = self.app.getServerById(self.app.get("cacheServerId"))
		return DataUtils.getAllianceFightInitHonourCount(serverConfig.level)
	})();

	(function(){
		return new Promise(function(resolve){
			if(_.isObject(killMaxPlayer)){
				var memberDoc = null
				var memberData = []
				self.cacheService.findPlayerAsync(killMaxPlayer.id).then(function(doc){
					memberDoc = doc
					memberDoc.resources.gem += killMaxPlayerGemGet
					memberData.push(["resources.gem", memberDoc.resources.gem])
					return self.cacheService.updatePlayerAsync(memberDoc._id, memberDoc)
				}).then(function(){
					return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData)
				}).then(function(){
					var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceFightKillFirstRewardTitle")
					var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceFightKillFirstRewardContent")
					return self.dataService.sendSysMailAsync(memberDoc._id, titleKey, [], contentKey, [killMaxPlayerGemGet])
				}).then(function(){
					resolve()
				}).catch(function(e){
					self.logService.onEventError("logic.allianceTimeEventService.onAllianceFightStatusFinished.allianceFightKillFirstGemGet", {
						playerId:killMaxPlayer.id,
						gemGet:killMaxPlayerGemGet
					}, e.stack)
					if(_.isObject(memberDoc)){
						return self.cacheService.updatePlayerAsync(memberDoc._id, null).then(function(){
							resolve()
						})
					}else resolve()
				})
			}else resolve()
		})
	})().then(function(){
		var attackAllianceKill = attackAllianceDoc.allianceFight.attacker.allianceCountData.kill
		var defenceAllianceKill = attackAllianceDoc.allianceFight.defencer.allianceCountData.kill
		var allianceFightResult = attackAllianceKill >= defenceAllianceKill ? Consts.FightResult.AttackWin : Consts.FightResult.DefenceWin
		var allianceFightHonourTotal = allianceFightInitHonour + ((attackAllianceKill + defenceAllianceKill) * 2)
		var attackAllianceRoutCount = attackAllianceDoc.allianceFight.attacker.allianceCountData.routCount
		var defenceAllianceRoutCount = attackAllianceDoc.allianceFight.defencer.allianceCountData.routCount
		var allianceFightRoutResult = attackAllianceRoutCount - defenceAllianceRoutCount
		var attackAllianceHonourGetPercent = (_.isEqual(allianceFightResult, Consts.FightResult.AttackWin) ? 0.7 : 0.3) + (0.01 * allianceFightRoutResult)
		if(attackAllianceHonourGetPercent > 1) attackAllianceHonourGetPercent = 1
		else if(attackAllianceHonourGetPercent < 0) attackAllianceHonourGetPercent = 0
		var attackAllianceHonourGet = Math.floor(allianceFightHonourTotal * attackAllianceHonourGetPercent)
		var defenceAllianceHonourGet = allianceFightHonourTotal - attackAllianceHonourGet

		var allianceFightReport = {
			id:ShortId.generate(),
			mergeStyle:attackAllianceDoc.allianceFight.mergeStyle,
			attackAllianceId:attackAllianceDoc.allianceFight.attackAllianceId,
			defenceAllianceId:attackAllianceDoc.allianceFight.defenceAllianceId,
			fightResult:allianceFightResult,
			fightTime:now,
			killMax:{
				allianceId:_.isNull(killMaxPlayer) ? null : _.contains(attackAllianceDoc.allianceFight.attacker.playerKills, killMaxPlayer) ? attackAllianceDoc.allianceFight.attackAllianceId : attackAllianceDoc.allianceFight.defenceAllianceId,
				playerId:_.isNull(killMaxPlayer) ? null : killMaxPlayer.id,
				playerName:_.isNull(killMaxPlayer) ? null : killMaxPlayer.name
			},
			attackAlliance:{
				name:attackAllianceDoc.basicInfo.name,
				tag:attackAllianceDoc.basicInfo.tag,
				flag:attackAllianceDoc.basicInfo.flag,
				kill:attackAllianceKill,
				honour:attackAllianceHonourGet,
				routCount:attackAllianceDoc.allianceFight.attacker.allianceCountData.routCount,
				strikeCount:attackAllianceDoc.allianceFight.attacker.allianceCountData.strikeCount,
				strikeSuccessCount:attackAllianceDoc.allianceFight.attacker.allianceCountData.strikeSuccessCount,
				attackCount:attackAllianceDoc.allianceFight.attacker.allianceCountData.attackCount,
				attackSuccessCount:attackAllianceDoc.allianceFight.attacker.allianceCountData.attackSuccessCount
			},
			defenceAlliance:{
				name:defenceAllianceDoc.basicInfo.name,
				tag:defenceAllianceDoc.basicInfo.tag,
				flag:defenceAllianceDoc.basicInfo.flag,
				kill:defenceAllianceKill,
				honour:defenceAllianceHonourGet,
				routCount:attackAllianceDoc.allianceFight.defencer.allianceCountData.routCount,
				strikeCount:attackAllianceDoc.allianceFight.defencer.allianceCountData.strikeCount,
				strikeSuccessCount:attackAllianceDoc.allianceFight.defencer.allianceCountData.strikeSuccessCount,
				attackCount:attackAllianceDoc.allianceFight.defencer.allianceCountData.attackCount,
				attackSuccessCount:attackAllianceDoc.allianceFight.defencer.allianceCountData.attackSuccessCount
			}
		}

		LogicUtils.addAllianceFightReport(attackAllianceDoc, attackAllianceData, allianceFightReport)
		LogicUtils.addAllianceFightReport(defenceAllianceDoc, defenceAllianceData, allianceFightReport)

		LogicUtils.updateAllianceCountInfo(attackAllianceDoc, defenceAllianceDoc)
		attackAllianceData.push(["countInfo", attackAllianceDoc.countInfo])
		defenceAllianceData.push(["countInfo", defenceAllianceDoc.countInfo])

		attackAllianceDoc.basicInfo.honour += attackAllianceHonourGet
		attackAllianceData.push(["basicInfo.honour", attackAllianceDoc.basicInfo.honour])
		attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Protect
		attackAllianceData.push(["basicInfo.status", attackAllianceDoc.basicInfo.status])
		attackAllianceDoc.basicInfo.statusStartTime = now
		attackAllianceData.push(["basicInfo.statusStartTime", attackAllianceDoc.basicInfo.statusStartTime])
		var attackAllianceProtectTime = DataUtils.getAllianceIntInit(attackAllianceKill >= defenceAllianceKill ? "allianceFightSuccessProtectMinutes" : "allianceFightFaiedProtectMinutes") * 60 * 1000
		attackAllianceDoc.basicInfo.statusFinishTime = now + attackAllianceProtectTime
		attackAllianceData.push(["basicInfo.statusFinishTime", attackAllianceDoc.basicInfo.statusFinishTime])
		attackAllianceDoc.allianceFight = null
		attackAllianceData.push(["allianceFight", null])
		_.each(attackAllianceDoc.members, function(member){
			if(member.isProtected){
				member.isProtected = false
				attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(member) + ".isProtected", member.isProtected])
			}
			if(member.lastBeAttackedTime > 0){
				member.lastBeAttackedTime = 0
				attackAllianceData.push(['members.' + attackAllianceDoc.members.indexOf(member) + '.lastBeAttackedTime', member.lastBeAttackedTime])
			}
		})

		defenceAllianceDoc.basicInfo.honour += defenceAllianceHonourGet
		defenceAllianceData.push(["basicInfo.honour", defenceAllianceDoc.basicInfo.honour])
		defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Protect
		defenceAllianceData.push(["basicInfo.status", defenceAllianceDoc.basicInfo.status])
		defenceAllianceDoc.basicInfo.statusStartTime = now
		defenceAllianceData.push(["basicInfo.statusStartTime", defenceAllianceDoc.basicInfo.statusStartTime])
		var defenceAllianceProtectTime = DataUtils.getAllianceIntInit(attackAllianceKill < defenceAllianceKill ? "allianceFightSuccessProtectMinutes" : "allianceFightFaiedProtectMinutes") * 60 * 1000
		defenceAllianceDoc.basicInfo.statusFinishTime = now + defenceAllianceProtectTime
		defenceAllianceData.push(["basicInfo.statusFinishTime", defenceAllianceDoc.basicInfo.statusFinishTime])
		defenceAllianceDoc.allianceFight = null
		defenceAllianceData.push(["allianceFight", null])
		_.each(defenceAllianceDoc.members, function(member){
			if(member.isProtected){
				member.isProtected = false
				defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(member) + ".isProtected", member.isProtected])
			}
			if(member.lastBeAttackedTime > 0){
				member.lastBeAttackedTime = 0
				defenceAllianceData.push(['members.' + defenceAllianceDoc.members.indexOf(member) + '.lastBeAttackedTime', member.lastBeAttackedTime])
			}
		})

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, attackAllianceDoc.basicInfo.statusFinishTime - Date.now()])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, defenceAllianceDoc.basicInfo.statusFinishTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData]);
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData]);
		pushFuncs.push([self.dataService, self.dataService.deleteAllianceFightChannelAsync, attackAllianceDoc._id, defenceAllianceDoc._id])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		callback(e)
	})
}