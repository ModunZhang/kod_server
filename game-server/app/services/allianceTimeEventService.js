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
var ErrorUtils = require("../utils/errorUtils")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var AllianceTimeEventService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.dataService = app.get("dataService")
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
	this.dataService.findAllianceAsync(allianceId, true).then(function(doc){
		allianceDoc = doc
		if(_.isEqual(eventType, Consts.AllianceStatusEvent)){
			if(!_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
				return Promise.reject(ErrorUtils.illegalAllianceStatus(allianceDoc._id, allianceDoc.basicInfo.status))
			}

			var allianceData = []
			return self.onAllianceProtectedStatusFinishedAsync(allianceDoc, allianceData).then(function(){
				updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
				return Promise.resolve()
			})
		}else{
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
			event = LogicUtils.getEventById(allianceDoc[eventType], eventId)
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
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
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
	var attackEnemyAllianceData = []
	var attackPlayerDoc = null
	var attackPlayerData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var defenceEnemyAllianceData = []
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
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var funcs = []

	attackAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), null])
	defenceEnemyAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(attackAllianceDoc.attackMarchEvents, event)

	if(_.isEqual(event.marchType, Consts.MarchType.Shrine)){
		var shrineEvent = LogicUtils.getEventById(attackAllianceDoc.shrineEvents, event.defenceShrineData.shrineEventId)
		if(!_.isObject(shrineEvent)){
			this.dataService.directFindPlayerAsync(event.attackPlayerData.id).then(function(doc){
				attackPlayerDoc = doc
				var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], [])
				attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				defenceEnemyAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}).then(function(){
				callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
			}).catch(function(e){
				callback(e)
			})
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

			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
			LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}
		return
	}
	if(_.isEqual(event.marchType, Consts.MarchType.HelpDefence)){
		funcs = []
		funcs.push(this.dataService.findPlayerAsync(event.attackPlayerData.id, true))
		funcs.push(this.dataService.findPlayerAsync(event.defencePlayerData.id, true))
		Promise.all(funcs).spread(function(doc_1, doc_2){
			attackPlayerDoc = doc_1
			defencePlayerDoc = doc_2

			var helpToTroop = {
				playerDragon:event.attackPlayerData.dragon.type,
				beHelpedPlayerData:{
					id:defencePlayerDoc._id,
					name:defencePlayerDoc.basicInfo.name,
					location:LogicUtils.getAllianceMemberMapObjectById(attackAllianceDoc, defencePlayerDoc._id).location
				}
			}
			attackPlayerDoc.helpToTroops.push(helpToTroop)
			attackPlayerData.push(["helpToTroops." + attackPlayerDoc.helpToTroops.indexOf(helpToTroop), helpToTroop])
			var helpedByTroop = {
				id:attackPlayerDoc._id,
				name:attackPlayerDoc.basicInfo.name,
				levelExp:attackPlayerDoc.basicInfo.levelExp,
				dragon:{
					type:event.attackPlayerData.dragon.type
				},
				soldiers:event.attackPlayerData.soldiers,
				rewards:[]
			}
			defencePlayerDoc.helpedByTroops.push(helpedByTroop)
			defencePlayerData.push(["helpedByTroops." + defencePlayerDoc.helpedByTroops.indexOf(helpedByTroop), helpedByTroop])

			var beHelpedMemberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, defencePlayerDoc._id)
			beHelpedMemberInAlliance.helpedByTroopsCount += 1
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(beHelpedMemberInAlliance) + ".helpedByTroopsCount", beHelpedMemberInAlliance.helpedByTroopsCount])
			TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.HelpAllianceMemberDefence)

			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, defencePlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
			LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(defencePlayerDoc, null))
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
		var updateWallForFight = function(wallForFight, wallAfterFight){
			wallForFight.currentHp = wallAfterFight.currentHp
		}
		var updatePlayerKillData = function(allianceDoc, allianceData, key, playerDoc, newlyKill){
			var playerKillDatas = allianceDoc.allianceFight[key]
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
				allianceData.push(["allianceFight." + key + "." + allianceDoc.allianceFight[key].indexOf(playerKillData), playerKillData])
			}else{
				playerKillData.kill += newlyKill
				allianceData.push(["allianceFight." + key + "." + allianceDoc.allianceFight[key].indexOf(playerKillData) + ".kill", playerKillData.kill])
			}
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
		var theDefencePlayerDoc = null
		var memberInAlliance = null
		var deathEvent = null
		var attackSoldiersLeftForFight = []
		var memberObject

		funcs = []
		funcs.push(self.dataService.findPlayerAsync(event.attackPlayerData.id, true))
		funcs.push(self.dataService.findAllianceAsync(event.defencePlayerData.alliance.id, true))
		funcs.push(self.dataService.findPlayerAsync(event.defencePlayerData.id, true))
		Promise.all(funcs).spread(function(doc_1, doc_2, doc_3){
			attackPlayerDoc = doc_1
			defenceAllianceDoc = doc_2
			defencePlayerDoc = doc_3
			if(defencePlayerDoc.helpedByTroops.length > 0){
				return self.dataService.findPlayerAsync(defencePlayerDoc.helpedByTroops[0].id, true).then(function(doc){
					helpDefencePlayerDoc = doc
					return Promise.resolve()
				})
			}else{
				DataUtils.refreshPlayerResources(defencePlayerDoc)
				defencePlayerData.push(["resources", defencePlayerDoc.resources])
				return Promise.resolve()
			}
		}).then(function(){
			attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
			attackDragonForFight = DataUtils.createPlayerDragonForFight(attackPlayerDoc, attackDragon, defencePlayerDoc.basicInfo.terrain)
			if(_.isObject(helpDefencePlayerDoc)){
				helpedByTroop = defencePlayerDoc.helpedByTroops[0]
				helpDefenceDragon = helpDefencePlayerDoc.dragons[helpedByTroop.dragon.type]
				DataUtils.refreshPlayerDragonsHp(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceDragonForFight = DataUtils.createPlayerDragonForFight(helpDefencePlayerDoc, helpDefenceDragon, defencePlayerDoc.basicInfo.terrain)

				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, defencePlayerDoc.basicInfo.terrain, attackDragonForFight.strength > helpDefenceDragonForFight.strength)
				attackTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)
				helpDefenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(helpDefencePlayerDoc, helpedByTroop.soldiers, helpDefenceDragon, defencePlayerDoc.basicInfo.terrain, attackDragonForFight.strength <= helpDefenceDragonForFight.strength)
				helpDefenceTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, helpDefenceSoldiersForFight)

				helpDefenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, helpDefenceDragonForFight, helpDefenceDragonFightFixEffect)
				helpDefenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent, attackSoldierMoraleDecreasedPercent + helpDefenceToEnemySoldierMoralDecreasedAddPercent, helpDefenceSoldiersForFight, helpDefenceTreatSoldierPercent, helpDefenceSoldierMoraleDecreasedPercent + attackToEnemySoldierMoralDecreasedAddPercent)
				updateDragonForFight(attackDragonForFight, helpDefenceDragonFightData.attackDragonAfterFight)
				updateSoldiersForFight(attackSoldiersForFight, helpDefenceSoldierFightData.attackSoldiersAfterFight)
				updateDragonForFight(helpDefenceDragonForFight, helpDefenceDragonFightData.defenceDragonAfterFight)
				updateSoldiersForFight(helpDefenceSoldiersForFight, helpDefenceSoldierFightData.defenceSoldiersAfterFight)
				return Promise.resolve()
			}
			defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
			defenceSoldiers = DataUtils.getPlayerDefenceSoldiers(defencePlayerDoc)
			if(_.isObject(defenceDragon) && defenceSoldiers.length > 0){
				DataUtils.refreshPlayerDragonsHp(defencePlayerDoc, defenceDragon)
				defenceDragonForFight = DataUtils.createPlayerDragonForFight(defencePlayerDoc, defenceDragon, defencePlayerDoc.basicInfo.terrain)
				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, defencePlayerDoc.basicInfo.terrain, attackDragonForFight.strength > defenceDragonForFight.strength)
				attackTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)
				defenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(defencePlayerDoc, defenceSoldiers, defenceDragon, defencePlayerDoc.basicInfo.terrain, attackDragonForFight.strength <= defenceDragonForFight.strength)
				defenceTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(defencePlayerDoc, defenceDragon)
				defenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(defencePlayerDoc, defenceDragon)
				defenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(defencePlayerDoc, defenceDragon)
				defenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, defenceSoldiersForFight)

				defenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight, defenceDragonFightFixEffect)
				defenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent, attackSoldierMoraleDecreasedPercent + defenceToEnemySoldierMoralDecreasedAddPercent, defenceSoldiersForFight, defenceTreatSoldierPercent, defenceSoldierMoraleDecreasedPercent + attackToEnemySoldierMoralDecreasedAddPercent)
				updateDragonForFight(attackDragonForFight, defenceDragonFightData.attackDragonAfterFight)
				updateSoldiersForFight(attackSoldiersForFight, defenceSoldierFightData.attackSoldiersAfterFight)
				updateDragonForFight(defenceDragonForFight, defenceDragonFightData.defenceDragonAfterFight)
				updateSoldiersForFight(defenceSoldiersForFight, defenceSoldierFightData.defenceSoldiersAfterFight)
				if(_.isEqual(Consts.FightResult.DefenceWin, defenceSoldierFightData.fightResult)){
					return Promise.resolve()
				}else{
					for(var i = defenceSoldierFightData.attackSoldiersAfterFight.length - 1; i >= 0; i--){
						var attackSoldiers = Utils.clone(defenceSoldierFightData.attackSoldiersAfterFight[i])
						if(attackSoldiers.currentCount > 0){
							attackSoldiersLeftForFight.unshift(attackSoldiers)
							if(attackSoldiers.round > 0){
								attackSoldiers.totalCount = attackSoldiers.currentCount
								attackSoldiers.woundedCount = 0
								attackSoldiers.morale = 100
								attackSoldiers.round = 0
								attackSoldiers.killedSoldiers = []
								break
							}
						}
					}
				}
			}else{
				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, defencePlayerDoc.basicInfo.terrain, true)
				attackSoldiersLeftForFight = attackSoldiersForFight
			}
			if(defencePlayerDoc.resources.wallHp > 0){
				defenceWallForFight = DataUtils.createPlayerWallForFight(defencePlayerDoc)
				var defencePlayerMasterOfDefenderBuffAboutDefenceWall = DataUtils.getPlayerMasterOfDefenderBuffAboutDefenceWall(defencePlayerDoc)
				defenceWallFightData = FightUtils.soldierToWallFight(attackSoldiersLeftForFight, attackTreatSoldierPercent, defenceWallForFight, defencePlayerMasterOfDefenderBuffAboutDefenceWall)
				updateSoldiersForFight(attackSoldiersForFight, defenceWallFightData.attackSoldiersAfterFight)
				updateWallForFight(defenceWallForFight, defenceWallFightData.defenceWallAfterFight)
				return Promise.resolve()
			}
			return Promise.resolve()
		}).then(function(){
			var report = null
			if(_.isObject(helpDefencePlayerDoc)){
				report = ReportUtils.createAttackCityFightWithHelpDefencePlayerReport(attackAllianceDoc, attackPlayerDoc, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragonFightData, helpDefenceSoldierFightData)
			}else{
				report = ReportUtils.createAttackCityFightWithDefencePlayerReport(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, attackSoldiersForFight, defenceAllianceDoc, defencePlayerDoc, defenceDragonFightData, defenceSoldierFightData, defenceWallFightData)
			}
			attackCityReport = report.report.attackCity
			var countData = report.countData
			//console.log(NodeUtils.inspect(report, false, null))

			attackPlayerDoc.basicInfo.kill += countData.attackPlayerKill
			attackPlayerData.push(["basicInfo.kill", attackPlayerDoc.basicInfo.kill])
			attackPlayerDoc.basicInfo.attackTotal += 1
			attackPlayerData.push(["basicInfo.attackTotal", attackPlayerDoc.basicInfo.attackTotal])
			TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
			memberObject = LogicUtils.addAlliancePlayerLastThreeDaysKillData(attackAllianceDoc, attackPlayerDoc._id, countData.attackPlayerKill)
			attackAllianceData.push(["members." + attackAllianceDoc.members.indexOf(memberObject) + ".lastThreeDaysKillData", memberObject.lastThreeDaysKillData])

			var attackPlayerRewards = attackCityReport.attackPlayerData.rewards
			attackDragon.hp -= attackDragonForFight.totalHp - attackDragonForFight.currentHp
			if(attackDragon.hp <= 0){
				deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
				attackPlayerDoc.dragonDeathEvents.push(deathEvent)
				attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
			}
			DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, countData.attackDragonExpAdd, true)
			attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
			attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
			LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.report)

			var attackCityMarchReturnEvent = MarchUtils.createAttackPlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, getSoldiersFromSoldiersForFight(attackSoldiersForFight), getWoundedSoldiersFromSoldiersForFight(attackSoldiersForFight), defenceAllianceDoc, defencePlayerDoc, attackPlayerRewards)
			attackAllianceDoc.attackMarchReturnEvents.push(attackCityMarchReturnEvent)
			attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(attackCityMarchReturnEvent), attackCityMarchReturnEvent])
			defenceEnemyAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(attackCityMarchReturnEvent), attackCityMarchReturnEvent])
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", attackCityMarchReturnEvent.id, attackCityMarchReturnEvent.arriveTime - Date.now()])
			TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.AttackEnemyPlayersCity)
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])

			if(_.isObject(helpDefenceDragonFightData)){
				theDefencePlayerDoc = helpDefencePlayerDoc
				helpDefencePlayerDoc.basicInfo.kill += countData.defencePlayerKill
				helpDefencePlayerData.push(["basicInfo.kill", helpDefencePlayerDoc.basicInfo.kill])
				TaskUtils.finishPlayerKillTaskIfNeed(helpDefencePlayerDoc, helpDefencePlayerData)
				memberObject = LogicUtils.addAlliancePlayerLastThreeDaysKillData(defenceAllianceDoc, helpDefencePlayerDoc._id, countData.defencePlayerKill)
				defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberObject) + ".lastThreeDaysKillData", memberObject.lastThreeDaysKillData])
				helpDefenceDragon.hp -= helpDefenceDragonForFight.totalHp - helpDefenceDragonForFight.currentHp
				if(helpDefenceDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(helpDefencePlayerDoc, helpDefenceDragon)
					helpDefencePlayerDoc.dragonDeathEvents.push(deathEvent)
					helpDefencePlayerData.push(["dragonDeathEvents." + helpDefencePlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, helpDefencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				DataUtils.addPlayerDragonExp(helpDefencePlayerDoc, helpDefencePlayerData, helpDefenceDragon, countData.defenceDragonExpAdd, true)
				helpDefencePlayerData.push(["dragons." + helpDefenceDragon.type + ".hp", helpDefenceDragon.hp])
				helpDefencePlayerData.push(["dragons." + helpDefenceDragon.type + ".hpRefreshTime", helpDefenceDragon.hpRefreshTime])
				LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, report.report)
				var helpDefenceMailTitle = DataUtils.getLocalizationConfig("alliance", "HelpDefenceAttackTitle")
				var helpDefenceMailContent = DataUtils.getLocalizationConfig("alliance", "HelpDefenceAttackContent")
				var helpDefenceMailParams = [helpDefencePlayerDoc.basicInfo.name, defenceAllianceDoc.basicInfo.tag]
				LogicUtils.sendSystemMail(defencePlayerDoc, defencePlayerData, helpDefenceMailTitle, helpDefenceMailParams, helpDefenceMailContent, helpDefenceMailParams)

				var soldiers = getSoldiersFromSoldiersForFight(helpDefenceSoldierFightData.defenceSoldiersAfterFight)
				var woundedSoldiers = getWoundedSoldiersFromSoldiersForFight(helpDefenceSoldiersForFight)
				var rewards = LogicUtils.mergeRewards(helpedByTroop.rewards, attackCityReport.helpDefencePlayerData.rewards)
				defencePlayerData.push(["helpedByTroops." + defencePlayerDoc.helpedByTroops.indexOf(helpedByTroop), null])
				LogicUtils.removeItemInArray(defencePlayerDoc.helpedByTroops, helpedByTroop)
				var helpToTroop = _.find(helpDefencePlayerDoc.helpToTroops, function(troop){
					return _.isEqual(troop.beHelpedPlayerData.id, defencePlayerDoc._id)
				})
				helpDefencePlayerData.push(["helpToTroops." + helpDefencePlayerDoc.helpToTroops.indexOf(helpToTroop), null])
				LogicUtils.removeItemInArray(helpDefencePlayerDoc.helpToTroops, helpToTroop)

				var defencePlayerInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
				defencePlayerInAlliance.helpedByTroopsCount -= 1
				defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(defencePlayerInAlliance) + ".helpedByTroopsCount", defencePlayerInAlliance.helpedByTroopsCount])
				var helpDefenceMarchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(defenceAllianceDoc, helpDefencePlayerDoc, defencePlayerDoc, helpDefenceDragon, soldiers, woundedSoldiers, rewards)
				defenceAllianceDoc.attackMarchReturnEvents.push(helpDefenceMarchReturnEvent)
				defenceAllianceData.push(["attackMarchReturnEvents." + defenceAllianceDoc.attackMarchReturnEvents.indexOf(helpDefenceMarchReturnEvent), helpDefenceMarchReturnEvent])
				attackEnemyAllianceData.push(["attackMarchReturnEvents." + defenceAllianceDoc.attackMarchReturnEvents.indexOf(helpDefenceMarchReturnEvent), helpDefenceMarchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", helpDefenceMarchReturnEvent.id, helpDefenceMarchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, helpDefencePlayerDoc, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])
			}else{
				theDefencePlayerDoc = defencePlayerDoc
				defencePlayerDoc.basicInfo.kill += countData.defencePlayerKill
				defencePlayerData.push(["basicInfo.kill", defencePlayerDoc.basicInfo.kill])
				TaskUtils.finishPlayerKillTaskIfNeed(defencePlayerDoc, defencePlayerData)
				memberObject = LogicUtils.addAlliancePlayerLastThreeDaysKillData(defenceAllianceDoc, defencePlayerDoc._id, countData.defencePlayerKill)
				defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberObject) + ".lastThreeDaysKillData", memberObject.lastThreeDaysKillData])

				var defencePlayerRewards = attackCityReport.defencePlayerData.rewards
				if(_.isObject(defenceDragonFightData)){
					defenceDragon.hp -= defenceDragonForFight.totalHp - defenceDragonForFight.currentHp
					if(defenceDragon.hp <= 0){
						deathEvent = DataUtils.createPlayerDragonDeathEvent(defencePlayerDoc, defenceDragon)
						defencePlayerDoc.dragonDeathEvents.push(deathEvent)
						defencePlayerData.push(["dragonDeathEvents." + defencePlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, defencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
					}
					DataUtils.addPlayerDragonExp(defencePlayerDoc, defencePlayerData, defenceDragon, countData.defenceDragonExpAdd, true)
					defencePlayerData.push(["dragons." + defenceDragon.type + ".hp", defenceDragon.hp])
					defencePlayerData.push(["dragons." + defenceDragon.type + ".hpRefreshTime", defenceDragon.hpRefreshTime])

					updatePlayerSoldiers(defencePlayerDoc, defencePlayerData, defenceSoldiersForFight)
					updatePlayerWoundedSoldiers(defencePlayerDoc, defencePlayerData, defenceSoldiersForFight)
				}
				if(_.isObject(defenceWallFightData)){
					defencePlayerDoc.resources.wallHp -= defenceWallForFight.totalHp - defenceWallForFight.currentHp
				}
				_.each(defencePlayerRewards, function(reward){
					defencePlayerDoc[reward.type][reward.name] += reward.count
					defencePlayerData.push([reward.type + "." + reward.name, defencePlayerDoc[reward.type][reward.name]])
				})
				LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.report)
			}
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, defencePlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

			if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
				attackAllianceDoc.allianceFight.attackAllianceCountData.attackCount += 1
				attackAllianceData.push(["allianceFight.attackAllianceCountData.attackCount", attackAllianceDoc.allianceFight.attackAllianceCountData.attackCount])
				defenceAllianceDoc.allianceFight.attackAllianceCountData.attackCount += 1
				defenceAllianceData.push(["allianceFight.attackAllianceCountData.attackCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.attackCount])
				attackAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.attackPlayerKill
				attackAllianceData.push(["allianceFight.attackAllianceCountData.kill", attackAllianceDoc.allianceFight.attackAllianceCountData.kill])
				defenceAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.attackPlayerKill
				defenceAllianceData.push(["allianceFight.attackAllianceCountData.kill", defenceAllianceDoc.allianceFight.attackAllianceCountData.kill])
				updatePlayerKillData(attackAllianceDoc, attackAllianceData, "attackPlayerKills", attackPlayerDoc, countData.attackPlayerKill)
				updatePlayerKillData(defenceAllianceDoc, defenceAllianceData, "attackPlayerKills", attackPlayerDoc, countData.attackPlayerKill)
				attackAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.defencePlayerKill
				attackAllianceData.push(["allianceFight.defenceAllianceCountData.kill", attackAllianceDoc.allianceFight.defenceAllianceCountData.kill])
				defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.defencePlayerKill
				defenceAllianceData.push(["allianceFight.defenceAllianceCountData.kill", defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill])
				updatePlayerKillData(attackAllianceDoc, attackAllianceData, "defencePlayerKills", theDefencePlayerDoc, countData.defencePlayerKill)
				updatePlayerKillData(defenceAllianceDoc, defenceAllianceData, "defencePlayerKills", theDefencePlayerDoc, countData.defencePlayerKill)

				if(_.isObject(helpDefenceSoldierFightData)){
					if(_.isEqual(Consts.FightResult.AttackWin, helpDefenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						attackAllianceData.push(["allianceFight.attackAllianceCountData.attackSuccessCount", attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount])
						defenceAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						defenceAllianceData.push(["allianceFight.attackAllianceCountData.attackSuccessCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount])
						attackPlayerDoc.basicInfo.attackWin += 1
						attackPlayerData.push(["basicInfo.attackWin", attackPlayerDoc.basicInfo.attackWin])
						TaskUtils.finishAttackWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}else{
						helpDefencePlayerDoc.basicInfo.defenceWin += 1
						helpDefencePlayerData.push(["basicInfo.defenceWin", helpDefencePlayerDoc.basicInfo.defenceWin])
					}
				}else{
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						attackAllianceData.push(["allianceFight.attackAllianceCountData.attackSuccessCount", attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount])
						defenceAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						defenceAllianceData.push(["allianceFight.attackAllianceCountData.attackSuccessCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount])
						attackPlayerDoc.basicInfo.attackWin += 1
						attackPlayerData.push(["basicInfo.attackWin", attackPlayerDoc.basicInfo.attackWin])
						TaskUtils.finishAttackWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
					if(_.isObject(defenceSoldierFightData) && _.isEqual(Consts.FightResult.DefenceWin, defenceSoldierFightData.fightResult)){
						defencePlayerDoc.basicInfo.defenceWin += 1
						defencePlayerData.push(["basicInfo.defenceWin", defencePlayerDoc.basicInfo.defenceWin])
					}
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						if(!_.isObject(defenceWallFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceWallFightData.fightResult)){
							attackAllianceDoc.allianceFight.attackAllianceCountData.routCount += 1
							attackAllianceData.push(["allianceFight.attackAllianceCountData.routCount", attackAllianceDoc.allianceFight.attackAllianceCountData.routCount])
							defenceAllianceDoc.allianceFight.attackAllianceCountData.routCount += 1
							defenceAllianceData.push(["allianceFight.attackAllianceCountData.routCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.routCount])
							memberInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
							memberInAlliance.isProtected = true
							defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])
							attackEnemyAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberInAlliance) + ".isProtected", memberInAlliance.isProtected])
						}
					}
				}
			}else{
				attackAllianceDoc.allianceFight.defenceAllianceCountData.attackCount += 1
				attackAllianceData.push(["allianceFight.defenceAllianceCountData.attackCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.attackCount])
				defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackCount += 1
				defenceAllianceData.push(["allianceFight.defenceAllianceCountData.attackCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackCount])
				attackAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.attackPlayerKill
				attackAllianceData.push(["allianceFight.defenceAllianceCountData.kill", attackAllianceDoc.allianceFight.defenceAllianceCountData.kill])
				defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.attackPlayerKill
				defenceAllianceData.push(["allianceFight.defenceAllianceCountData.kill", defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill])
				updatePlayerKillData(attackAllianceDoc, attackAllianceData, "defencePlayerKills", attackPlayerDoc, countData.attackPlayerKill)
				updatePlayerKillData(defenceAllianceDoc, defenceAllianceData, "defencePlayerKills", attackPlayerDoc, countData.attackPlayerKill)
				attackAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.defencePlayerKill
				attackAllianceData.push(["allianceFight.attackAllianceCountData.kill", attackAllianceDoc.allianceFight.attackAllianceCountData.kill])
				defenceAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.defencePlayerKill
				defenceAllianceData.push(["allianceFight.attackAllianceCountData.kill", defenceAllianceDoc.allianceFight.attackAllianceCountData.kill])
				updatePlayerKillData(attackAllianceDoc, attackAllianceData, "attackPlayerKills", theDefencePlayerDoc, countData.defencePlayerKill)
				updatePlayerKillData(defenceAllianceDoc, defenceAllianceData, "attackPlayerKills", theDefencePlayerDoc, countData.defencePlayerKill)

				if(_.isObject(helpDefenceSoldierFightData)){
					if(_.isEqual(Consts.FightResult.AttackWin, helpDefenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
						attackAllianceData.push(["allianceFight.defenceAllianceCountData.attackSuccessCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount])
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
						defenceAllianceData.push(["allianceFight.defenceAllianceCountData.attackSuccessCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount])
					}
				}else{
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
						attackAllianceData.push(["allianceFight.defenceAllianceCountData.attackSuccessCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount])
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
						defenceAllianceData.push(["allianceFight.defenceAllianceCountData.attackSuccessCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount])
					}
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						if(!_.isObject(defenceWallFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceWallFightData.fightResult)){
							attackAllianceDoc.allianceFight.defenceAllianceCountData.routCount += 1
							attackAllianceData.push(["allianceFight.defenceAllianceCountData.routCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.routCount])
							defenceAllianceDoc.allianceFight.defenceAllianceCountData.routCount += 1
							defenceAllianceData.push(["allianceFight.defenceAllianceCountData.routCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.routCount])
							memberInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
							memberInAlliance.isProtected = true
							defenceAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberInAlliance) + ".isProtechted", memberInAlliance.isProtected])
							attackEnemyAllianceData.push(["members." + defenceAllianceDoc.members.indexOf(memberInAlliance) + ".isProtechted", memberInAlliance.isProtected])
						}
					}
				}
			}

			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
			LogicUtils.pushDataToEnemyAlliance(defenceAllianceDoc, attackEnemyAllianceData, pushFuncs, self.pushService)

			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
			}
			if(_.isObject(helpDefencePlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(helpDefencePlayerDoc, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(defencePlayerDoc, null))
			}
			if(_.isObject(defenceAllianceDoc)){
				funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
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

		var villageEvent = null
		var village = null
		var targetAllianceDoc = null
		var targetAllianceData = null
		var report = null
		var countData = null
		var attackDragonExpAdd = null
		var attackPlayerKill = null
		var attackSoldiers = null
		var attackWoundedSoldiers = null
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
		var newRewards = null

		this.dataService.findPlayerAsync(event.attackPlayerData.id, true).then(function(doc){
			attackPlayerDoc = doc
			if(_.isObject(attackAllianceDoc.allianceFight)){
				var defenceAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
				return self.dataService.findAllianceAsync(defenceAllianceId, true).then(function(doc){
					defenceAllianceDoc = doc
					targetAllianceDoc = _.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id) ? attackAllianceDoc : defenceAllianceDoc
					targetAllianceData = _.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id) ? attackAllianceData : defenceAllianceData
					return Promise.resolve()
				})
			}else{
				targetAllianceDoc = attackAllianceDoc
				targetAllianceData = attackAllianceData
				return Promise.resolve()
			}
		}).then(function(){
			villageEvent = _.find(attackAllianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
			})
			if(!_.isObject(villageEvent) && _.isObject(defenceAllianceDoc)){
				villageEvent = _.find(defenceAllianceDoc.villageEvents, function(villageEvent){
					return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
				})
			}
			if(_.isObject(villageEvent)){
				return self.dataService.findPlayerAsync(villageEvent.playerData.id, true).then(function(doc){
					defencePlayerDoc = doc
					return Promise.resolve()
				})
			}else{
				return Promise.resolve()
			}
		}).then(function(){
			village = LogicUtils.getAllianceVillageById(targetAllianceDoc, event.defenceVillageData.id)
			if(!_.isObject(village)){
				marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], targetAllianceDoc, event.defenceVillageData, [])
				attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push("attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent)
				defenceEnemyAllianceData.push("attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent)
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, null])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			resourceName = village.name.slice(0, -7)
			if(!_.isObject(villageEvent)){
				eventData = MarchUtils.createAllianceVillageEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], targetAllianceDoc, village, [])
				newVillageEvent = eventData.event
				attackAllianceDoc.villageEvents.push(newVillageEvent)
				attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(newVillageEvent), newVillageEvent])
				defenceEnemyAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(newVillageEvent), newVillageEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", newVillageEvent.id, newVillageEvent.finishTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, null])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(_.isObject(villageEvent) && _.isEqual(villageEvent.playerData.alliance.id, attackAllianceDoc._id)){
				marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], targetAllianceDoc, event.defenceVillageData, [])
				attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				defenceEnemyAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, null])
				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, null])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(_.isObject(villageEvent) && !_.isEqual(villageEvent.playerData.alliance.id, attackAllianceDoc._id)){
				attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
				DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
				attackDragonForFight = DataUtils.createPlayerDragonForFight(attackPlayerDoc, attackDragon, targetAllianceDoc.basicInfo.terrain)
				defenceDragon = defencePlayerDoc.dragons[villageEvent.playerData.dragon.type]
				DataUtils.refreshPlayerDragonsHp(defencePlayerDoc, defenceDragon)
				defenceDragonForFight = DataUtils.createPlayerDragonForFight(defencePlayerDoc, defenceDragon, targetAllianceDoc.basicInfo.terrain)

				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, targetAllianceDoc.basicInfo.terrain, attackDragonForFight.strength > defenceDragonForFight.strength)
				attackTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)
				defenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(defencePlayerDoc, villageEvent.playerData.soldiers, defenceDragon, targetAllianceDoc.basicInfo.terrain, attackDragonForFight.strength <= defenceDragonForFight.strength)
				defenceTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(defencePlayerDoc, defenceDragon)
				defenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(defencePlayerDoc, defenceDragon)
				defenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(defencePlayerDoc, defenceDragon)

				defenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, defenceSoldiersForFight)
				var defenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight, defenceDragonFightFixEffect)
				var defenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent, attackSoldierMoraleDecreasedPercent + defenceToEnemySoldierMoralDecreasedAddPercent, defenceSoldiersForFight, defenceTreatSoldierPercent, defenceSoldierMoraleDecreasedPercent + attackToEnemySoldierMoralDecreasedAddPercent)

				report = ReportUtils.createAttackVillageFightWithDefenceTroopReport(attackAllianceDoc, attackPlayerDoc, targetAllianceDoc, village, defenceAllianceDoc, defencePlayerDoc, defenceDragonFightData, defenceSoldierFightData)
				countData = report.countData
				LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.report)
				LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.report)

				attackDragonExpAdd = countData.attackDragonExpAdd
				attackPlayerKill = countData.attackPlayerKill
				attackSoldiers = createSoldiers(defenceSoldierFightData.attackSoldiersAfterFight)
				attackWoundedSoldiers = createWoundedSoldiers(defenceSoldierFightData.attackSoldiersAfterFight)
				attackRewards = report.report.attackVillage.attackPlayerData.rewards

				defenceDragonExpAdd = countData.attackDragonExpAdd
				defencePlayerKill = countData.attackPlayerKill
				defenceSoldiers = createSoldiers(defenceSoldierFightData.defenceSoldiersAfterFight)
				defenceWoundedSoldiers = createWoundedSoldiers(defenceSoldierFightData.defenceSoldiersAfterFight)
				defenceRewards = report.report.attackVillage.defencePlayerData.rewards

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
				DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, attackDragonExpAdd, true)
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
				DataUtils.addPlayerDragonExp(defencePlayerDoc, defencePlayerData, defenceDragon, defenceDragonExpAdd, true)
				defencePlayerData.push(["dragons." + defenceDragon.type + ".hp", defenceDragon.hp])
				defencePlayerData.push(["dragons." + defenceDragon.type + ".hpRefreshTime", defenceDragon.hpRefreshTime])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
				if(_.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
					defenceAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent), null])
					attackEnemyAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent), null])
					LogicUtils.removeItemInArray(defenceAllianceDoc.villageEvents, villageEvent)
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, defenceAllianceDoc, "villageEvents", villageEvent.id])
					marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(defenceAllianceDoc, defencePlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, targetAllianceDoc, event.defenceVillageData, villageEvent.playerData.rewards)
					defenceAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
					defenceAllianceData.push(["attackMarchReturnEvents." + defenceAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					attackEnemyAllianceData.push(["attackMarchReturnEvents." + defenceAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

					eventData = MarchUtils.createAllianceVillageEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, targetAllianceDoc, village, attackRewards)
					newVillageEvent = eventData.event
					if(attackDragon.hp <= 0 || eventData.collectTotal <= resourceCollected){
						newRewards = [{
							type:"resources",
							name:resourceName,
							count:eventData.collectTotal
						}]
						LogicUtils.mergeRewards(newVillageEvent.playerData.rewards, newRewards)
						marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, newVillageEvent.playerData.dragon, newVillageEvent.playerData.soldiers, newVillageEvent.playerData.woundedSoldiers, targetAllianceDoc, event.defenceVillageData, newVillageEvent.playerData.rewards)
						attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
						attackAllianceData.push(["attackMarchReturnEvents", attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
						defenceEnemyAllianceData.push(["attackMarchReturnEvents", attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
						village.resource -= eventData.collectTotal
						targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						if(_.isEqual(attackAllianceDoc, targetAllianceDoc)){
							defenceEnemyAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						}else{
							attackEnemyAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						}
					}else{
						var timeUsed = Math.floor(eventData.collectTime * (resourceCollected / eventData.collectTotal))
						newVillageEvent.startTime -= timeUsed
						newVillageEvent.finishTime -= timeUsed
						attackAllianceDoc.villageEvents.push(newVillageEvent)
						attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(newVillageEvent), newVillageEvent])
						defenceEnemyAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(newVillageEvent), newVillageEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", newVillageEvent.id, newVillageEvent.finishTime - Date.now()])
					}

					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
					LogicUtils.pushDataToEnemyAlliance(defenceAllianceDoc, attackEnemyAllianceData, pushFuncs, self.pushService)
				}else{
					marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, targetAllianceDoc, event.defenceVillageData, attackRewards)
					attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
					attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					defenceEnemyAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

					var newSoldierLoadTotal = DataUtils.getPlayerSoldiersTotalLoad(defencePlayerDoc, villageEvent.playerData.soldiers)
					var newCollectInfo = DataUtils.getPlayerCollectResourceInfo(defencePlayerDoc, newSoldierLoadTotal, village)
					villageEvent.villageData.collectTotal = newCollectInfo.collectTotal
					villageEvent.finishTime = villageEvent.startTime + newCollectInfo.collectTime
					if(defenceDragon.hp <= 0 || newCollectInfo.collectTotal <= resourceCollected || LogicUtils.willFinished(villageEvent.finishTime)){
						newRewards = [{
							type:"resources",
							name:resourceName,
							count:newCollectInfo.collectTotal
						}]
						LogicUtils.mergeRewards(villageEvent.playerData.rewards, newRewards)
						defenceAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent), null])
						attackEnemyAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent), null])
						LogicUtils.removeItemInArray(defenceAllianceDoc.villageEvents, villageEvent)
						eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, defenceAllianceDoc, "villageEvents", villageEvent.id])

						marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(defenceAllianceDoc, defencePlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, targetAllianceDoc, event.defenceVillageData, villageEvent.playerData.rewards)
						defenceAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
						defenceAllianceData.push(["attackMarchReturnEvents." + defenceAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
						attackEnemyAllianceData.push(["attackMarchReturnEvents." + defenceAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

						village.resource -= newCollectInfo.collectTotal
						targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						if(_.isEqual(attackAllianceDoc, targetAllianceDoc)){
							defenceEnemyAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						}else{
							attackEnemyAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						}
					}else{
						defenceAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent) + ".villageData.collectTotal", villageEvent.villageData.collectTotal])
						attackEnemyAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent) + ".villageData.collectTotal", villageEvent.villageData.collectTotal])
						defenceAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent) + ".finishTime", villageEvent.finishTime])
						attackEnemyAllianceData.push(["villageEvents." + defenceAllianceDoc.villageEvents.indexOf(villageEvent) + ".finishTime", villageEvent.finishTime])
						eventFuncs.push([self.timeEventService, self.timeEventService.updateAllianceTimeEventAsync, defenceAllianceDoc, "villageEvents", villageEvent.id, villageEvent.finishTime - Date.now()])
					}

					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
					LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
					LogicUtils.pushDataToEnemyAlliance(defenceAllianceDoc, attackEnemyAllianceData, pushFuncs, self.pushService)
				}
				return Promise.resolve()
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(defencePlayerDoc, null))
			}
			if(_.isObject(defenceAllianceDoc) && attackAllianceDoc != defenceAllianceDoc){
				funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
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
	var allianceData = []
	var enemyAllianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	allianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(event), null])
	enemyAllianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(allianceDoc.attackMarchReturnEvents, event)
	//console.log(NodeUtils.inspect(event, false, null))
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(event.attackPlayerData.id, true).then(function(doc){
		playerDoc = doc

		var dragonType = event.attackPlayerData.dragon.type
		var dragon = playerDoc.dragons[dragonType]
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		dragon.status = Consts.DragonStatus.Free
		playerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		playerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		playerData.push(["dragons." + dragonType + ".status", dragon.status])

		LogicUtils.addPlayerSoldiers(playerDoc, playerData, event.attackPlayerData.soldiers)
		DataUtils.addPlayerWoundedSoldiers(playerDoc, playerData, event.attackPlayerData.woundedSoldiers)

		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
		})

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
	var defencePlayerData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var defenceEnemyAllianceData = []
	var helpDefencePlayerDoc = null
	var helpDefencePlayerData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var funcs = null
	var deathEvent = null

	attackAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), null])
	defenceEnemyAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(attackAllianceDoc.strikeMarchEvents, event)
	if(_.isEqual(event.marchType, Consts.MarchType.City)){
		funcs = []
		funcs.push(self.dataService.findPlayerAsync(event.attackPlayerData.id, true))
		funcs.push(self.dataService.findAllianceAsync(event.defencePlayerData.alliance.id, true))
		funcs.push(self.dataService.findPlayerAsync(event.defencePlayerData.id, true))
		Promise.all(funcs).spread(function(doc_1, doc_2, doc_3){
			attackPlayerDoc = doc_1
			defenceAllianceDoc = doc_2
			defencePlayerDoc = doc_3
			if(defencePlayerDoc.helpedByTroops.length > 0){
				return self.dataService.findPlayerAsync(defencePlayerDoc.helpedByTroops[0].id, true).then(function(doc){
					helpDefencePlayerDoc = doc
					return Promise.resolve()
				})
			}else{
				return Promise.resolve()
			}

		}).then(function(){
			var attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
			var report = null
			var strikeMarchReturnEvent = null
			if(_.isObject(helpDefencePlayerDoc)){
				var helpDefenceDragon = helpDefencePlayerDoc.dragons[defencePlayerDoc.helpedByTroops[0].dragon.type]
				DataUtils.refreshPlayerDragonsHp(defencePlayerDoc, helpDefenceDragon)
				report = ReportUtils.createStrikeCityFightWithHelpDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragon)
				LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
				LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, report.reportForDefencePlayer)
				var helpDefenceTitle = DataUtils.getLocalizationConfig("alliance", "HelpDefenceStrikeTitle")
				var helpDefenceContent = DataUtils.getLocalizationConfig("alliance", "HelpDefenceStrikeContent")
				var helpDefenceParams = [helpDefencePlayerDoc.basicInfo.name, defenceAllianceDoc.basicInfo.tag]
				LogicUtils.sendSystemMail(defencePlayerDoc, defencePlayerData, helpDefenceTitle, helpDefenceParams, helpDefenceContent, helpDefenceParams)

				attackDragon.hp -= report.reportForAttackPlayer.strikeCity.attackPlayerData.dragon.hpDecreased
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
				attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, helpDefencePlayerDoc, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])
				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
					attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
					attackAllianceData.push(["allianceFight.attackAllianceCountData.strikeCount", attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount])
					defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
					defenceAllianceData.push(["allianceFight.attackAllianceCountData.strikeCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount])
					if(_.isEqual(report.powerCompare >= 1)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						attackAllianceData.push(["allianceFight.attackAllianceCountData.strikeSuccessCount", attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount])
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						defenceAllianceData.push(["allianceFight.attackAllianceCountData.strikeSuccessCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount])
						attackPlayerDoc.basicInfo.strikeWin += 1
						attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
				}else{
					attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
					attackAllianceData.push(["allianceFight.defenceAllianceCountData.strikeCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount])
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
					defenceAllianceData.push(["allianceFight.defenceAllianceCountData.strikeCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount])
					if(_.isEqual(report.powerCompare >= 1)){
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						attackAllianceData.push(["allianceFight.defenceAllianceCountData.strikeSuccessCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount])
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						defenceAllianceData.push(["allianceFight.defenceAllianceCountData.strikeSuccessCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount])
						attackPlayerDoc.basicInfo.strikeWin += 1
						attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
				}

				strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
				attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
				attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
				defenceEnemyAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime - Date.now()])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)

				updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
				return Promise.resolve()
			}
			if(!_.isObject(helpDefencePlayerDoc)){
				var defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
				if(!_.isObject(defenceDragon)){
					report = ReportUtils.createStrikeCityNoDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
					LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
					LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.reportForDefencePlayer)
					updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						attackAllianceData.push(["allianceFight.attackAllianceCountData.strikeCount", attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount])
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						defenceAllianceData.push(["allianceFight.attackAllianceCountData.strikeCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount])
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						attackAllianceData.push(["allianceFight.attackAllianceCountData.strikeSuccessCount", attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount])
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						defenceAllianceData.push(["allianceFight.attackAllianceCountData.strikeSuccessCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount])
						attackPlayerDoc.basicInfo.strikeWin += 1
						attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}else{
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						attackAllianceData.push(["allianceFight.defenceAllianceCountData.strikeCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount])
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						defenceAllianceData.push(["allianceFight.defenceAllianceCountData.strikeCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount])
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						attackAllianceData.push(["allianceFight.defenceAllianceCountData.strikeSuccessCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount])
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						defenceAllianceData.push(["allianceFight.defenceAllianceCountData.strikeSuccessCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount])
						attackPlayerDoc.basicInfo.strikeWin += 1
						attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}

					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
					attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
					defenceEnemyAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime - Date.now()])
					LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)

					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
				}
				if(_.isObject(defenceDragon)){
					report = ReportUtils.createStrikeCityFightWithDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, defenceDragon)
					LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
					LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.reportForDefencePlayer)

					attackDragon.hp -= report.reportForAttackPlayer.strikeCity.attackPlayerData.dragon.hpDecreased
					if(attackDragon.hp <= 0){
						deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
						attackPlayerDoc.dragonDeathEvents.push(deathEvent)
						attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
						eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
					}
					attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
					attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
					updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						attackAllianceData.push(["allianceFight.attackAllianceCountData.strikeCount", attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount])
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						defenceAllianceData.push(["allianceFight.attackAllianceCountData.strikeCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount])
						if(_.isEqual(report.powerCompare >= 1)){
							attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
							attackAllianceData.push(["allianceFight.attackAllianceCountData.strikeSuccessCount", attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount])
							defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
							defenceAllianceData.push(["allianceFight.attackAllianceCountData.strikeSuccessCount", defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount])
							attackPlayerDoc.basicInfo.strikeWin += 1
							attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
							TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						}

					}else{
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						attackAllianceData.push(["allianceFight.defenceAllianceCountData.strikeCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount])
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						defenceAllianceData.push(["allianceFight.defenceAllianceCountData.strikeCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount])
						if(_.isEqual(report.powerCompare >= 1)){
							attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
							attackAllianceData.push(["allianceFight.defenceAllianceCountData.strikeSuccessCount", attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount])
							defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
							defenceAllianceData.push(["allianceFight.defenceAllianceCountData.strikeSuccessCount", defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount])
							attackPlayerDoc.basicInfo.strikeWin += 1
							attackPlayerData.push(["basicInfo.strikeWin", attackPlayerDoc.basicInfo.strikeWin])
							TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						}
					}

					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
					attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
					defenceEnemyAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(strikeMarchReturnEvent), strikeMarchReturnEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime - Date.now()])
					LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)

					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
				}
				return Promise.resolve()
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			var funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(defencePlayerDoc, null))
			}
			if(_.isObject(helpDefencePlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(helpDefencePlayerDoc, null))
			}
			if(_.isObject(defenceAllianceDoc)){
				funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
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
		var targetAllianceDoc = null
		var report = null
		var marchReturnEvent = null

		this.dataService.findPlayerAsync(event.attackPlayerData.id, true).then(function(doc){
			attackPlayerDoc = doc
			if(_.isObject(attackAllianceDoc.allianceFight)){
				var defenceAllianceId = LogicUtils.getEnemyAllianceId(attackAllianceDoc.allianceFight, attackAllianceDoc._id)
				return self.dataService.findAllianceAsync(defenceAllianceId, true).then(function(doc){
					defenceAllianceDoc = doc
					targetAllianceDoc = _.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id) ? attackAllianceDoc : defenceAllianceDoc
					return Promise.resolve()
				})
			}else{
				targetAllianceDoc = attackAllianceDoc
				return Promise.resolve()
			}
		}).then(function(){
			villageEvent = _.find(attackAllianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
			})
			if(!_.isObject(villageEvent) && _.isObject(defenceAllianceDoc)){
				villageEvent = _.find(defenceAllianceDoc.villageEvents, function(villageEvent){
					return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
				})
			}
			if(_.isObject(villageEvent)){
				return self.dataService.findPlayerAsync(villageEvent.playerData.id, true).then(function(doc){
					defencePlayerDoc = doc
					return Promise.resolve()
				})
			}else{
				return Promise.resolve()
			}
		}).then(function(){
			village = LogicUtils.getAllianceVillageById(targetAllianceDoc, event.defenceVillageData.id)
			if(!_.isObject(village)){
				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, targetAllianceDoc, event.defenceVillageData)
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				defenceEnemyAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, null])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(!_.isObject(villageEvent)){
				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, targetAllianceDoc, event.defenceVillageData)
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				defenceEnemyAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, null])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(_.isObject(villageEvent) && _.isEqual(villageEvent.playerData.alliance.id, attackAllianceDoc._id)){
				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, targetAllianceDoc, event.defenceVillageData)
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				defenceEnemyAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, null])
				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, null])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, null])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(_.isObject(villageEvent) && !_.isEqual(villageEvent.playerData.alliance.id, attackAllianceDoc._id)){
				var attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
				var defenceDragon = defencePlayerDoc.dragons[villageEvent.playerData.dragon.type]
				report = ReportUtils.createStrikeVillageFightWithDefencePlayerDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, targetAllianceDoc, village, defenceAllianceDoc, villageEvent, defencePlayerDoc, defenceDragon)
				LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
				LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.reportForDefencePlayer)
				attackDragon.hp -= report.reportForAttackPlayer.strikeVillage.attackPlayerData.dragon.hpDecreased
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.push(["dragonDeathEvents." + attackPlayerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
				}
				attackPlayerData.dragons = {}
				attackPlayerData.dragons[attackDragon.type] = attackPlayerDoc.dragons[attackDragon.type]

				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, defencePlayerDoc, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, targetAllianceDoc, event.defenceVillageData)
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				defenceEnemyAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

				updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, null])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.dataService.updatePlayerAsync(defencePlayerDoc, null))
			}
			if(_.isObject(defenceAllianceDoc) && attackAllianceDoc != defenceAllianceDoc){
				funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
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
	var allianceData = []
	var enemyAllianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	allianceData.push(["strikeMarchReturnEvents." + allianceDoc.strikeMarchReturnEvents.indexOf(event), null])
	enemyAllianceData.push(["strikeMarchReturnEvents." + allianceDoc.strikeMarchReturnEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(allianceDoc.strikeMarchReturnEvents, event)

	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(event.attackPlayerData.id, true).then(function(doc){
		playerDoc = doc
		var dragonType = event.attackPlayerData.dragon.type
		var dragon = playerDoc.dragons[dragonType]
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		dragon.status = Consts.DragonStatus.Free
		playerData.push(["dragons." + dragonType + ".hp", dragon.hp])
		playerData.push(["dragons." + dragonType + ".hpRefreshTime", dragon.hpRefreshTime])
		playerData.push(["dragons." + dragonType + ".status", dragon.status])
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
		})

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
	var enemyAllianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	allianceData.push(["shrineEvents." + allianceDoc.shrineEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(allianceDoc.shrineEvents, event)

	var playerDocs = {}
	var playerTroopsForFight = []
	var funcs = []
	var findPlayerDoc = function(playerId){
		return self.dataService.findPlayerAsync(playerId, true).then(function(doc){
			playerDocs[doc._id] = doc
			return Promise.resolve()
		})
	}
	var getTotalPower = function(soldiersForFight){
		var power = 0
		_.each(soldiersForFight, function(soldierForFight){
			power += soldierForFight.power * soldierForFight.totalCount
		})
		return power
	}
	var createDragonFightData = function(dragonAfterFight){
		var data = {
			type:dragonAfterFight.type,
			level:dragonAfterFight.level,
			hpMax:dragonAfterFight.maxHp,
			hp:dragonAfterFight.totalHp,
			hpDecreased:dragonAfterFight.totalHp - dragonAfterFight.currentHp,
			isWin:dragonAfterFight.isWin
		}
		return data
	}
	_.each(event.playerTroops, function(playerTroop){
		funcs.push(findPlayerDoc(playerTroop.id))
	})
	Promise.all(funcs).then(function(){
		_.each(event.playerTroops, function(playerTroop){
			var playerDoc = playerDocs[playerTroop.id]
			playerTroop.icon = playerDoc.basicInfo.icon
			var dragon = playerDoc.dragons[playerTroop.dragon.type]
			DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
			var dragonForFight = DataUtils.createPlayerDragonForFight(playerDoc, dragon, allianceDoc.basicInfo.terrain)
			var soldiersForFight = DataUtils.createPlayerSoldiersForFight(playerDoc, playerTroop.soldiers, dragon, allianceDoc.basicInfo.terrain, true)
			var playerTroopForFight = {
				id:playerTroop.id,
				name:playerTroop.name,
				icon:playerTroop.icon,
				dragonForFight:dragonForFight,
				soldiersForFight:soldiersForFight,
				woundedSoldierPercent:DataUtils.getPlayerTreatSoldierPercent(playerDocs[playerTroop.id], dragon),
				soldierMoraleDecreasedPercent:DataUtils.getPlayerSoldierMoraleDecreasedPercent(playerDocs[playerTroop.id], dragon),
				soldierToEnemyMoraleDecreasedAddPercent:DataUtils.getEnemySoldierMoraleAddedPercent(playerDocs[playerTroop.id], dragon)
			}
			playerTroopsForFight.push(playerTroopForFight)
		})
		playerTroopsForFight = _.sortBy(playerTroopsForFight, function(playerTroopForFight){
			return -getTotalPower(playerTroopForFight.soldiersForFight)
		})

		var stageTroopsForFight = DataUtils.getAllianceShrineStageTroops(allianceDoc, event.stageName)
		var playerAvgPower = LogicUtils.getPlayerTroopsAvgPower(playerTroopsForFight)
		var currentRound = 1
		var playerSuccessedTroops = []
		var stageSuccessedTroops = []
		var fightDatas = []
		while(playerTroopsForFight.length > 0 && stageTroopsForFight.length > 0){
			var playerTroopForFight = playerTroopsForFight[0]
			var stageTroopForFight = stageTroopsForFight[0]
			var dragonFightFixedEffect = DataUtils.getDragonFightFixedEffect(playerTroopForFight.soldiersForFight, stageTroopForFight.soldiersForFight)
			var dragonFightData = FightUtils.dragonToDragonFight(playerTroopForFight.dragonForFight, stageTroopForFight.dragonForFight, dragonFightFixedEffect)
			var soldierFightData = FightUtils.soldierToSoldierFight(playerTroopForFight.soldiersForFight, playerTroopForFight.woundedSoldierPercent, playerTroopForFight.soldierMoraleDecreasedPercent, stageTroopForFight.soldiersForFight, 0, 1 + playerTroopForFight.soldierToEnemyMoraleDecreasedAddPercent)
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
				playerId:playerTroopForFight.id,
				playerName:playerTroopForFight.name,
				playerIcon:playerTroopForFight.icon,
				stageTroopNumber:stageTroopForFight.troopNumber,
				fightResult:soldierFightData.fightResult,
				attackDragonFightData:createDragonFightData(dragonFightData.attackDragonAfterFight),
				defenceDragonFightData:createDragonFightData(dragonFightData.defenceDragonAfterFight),
				attackSoldierRoundDatas:soldierFightData.attackRoundDatas,
				defenceSoldierRoundDatas:soldierFightData.defenceRoundDatas
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
		}

		var params = DataUtils.getAllianceShrineStageResultDatas(allianceDoc.basicInfo.terrain, event.stageName, playerTroopsForFight.length > 0, fightDatas)
		var playerDatas = LogicUtils.fixAllianceShrineStagePlayerData(event.playerTroops, params.playerDatas)
		var fightStar = params.fightStar
		var shrineReport = {
			id:ShortId.generate(),
			stageName:event.stageName,
			star:fightStar,
			time:Date.now(),
			playerCount:event.playerTroops.length,
			playerAvgPower:playerAvgPower,
			playerDatas:playerDatas,
			fightDatas:fightDatas
		}
		if(allianceDoc.shrineReports.length > Define.AllianceShrineReportsMaxSize){
			var willRemovedshrineReport = allianceDoc.shrineReports[0]
			allianceData.push(["shrineReports." + allianceDoc.shrineReports.indexOf(willRemovedshrineReport), null])
			LogicUtils.removeItemInArray(allianceDoc.shrineReports, willRemovedshrineReport)
		}
		allianceDoc.shrineReports.push(shrineReport)
		allianceData.push(["shrineReports." + allianceDoc.shrineReports.indexOf(shrineReport), shrineReport])
		if(fightStar > 0){
			var honour = DataUtils.getAllianceShrineStageFightHoner(event.stageName, fightStar)
			allianceDoc.basicInfo.honour += honour
			allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		}

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
		var getLeftSoldiers = function(soldiers, damagedSoldiers){
			var leftSoldiers = []
			_.each(soldiers, function(soldier){
				var damagedSoldier = _.find(damagedSoldiers, function(damagedSoldier){
					return _.isEqual(soldier.name, damagedSoldier.name)
				})
				if(_.isObject(damagedSoldier)) soldier.count -= damagedSoldier.count
				if(soldier.count > 0) leftSoldiers.push(soldier)
			})
			return leftSoldiers
		}

		_.each(event.playerTroops, function(playerTroop){
			var playerId = playerTroop.id
			var playerDoc = playerDocs[playerId]
			var woundedSoldiers = _.isObject(params.woundedSoldiers[playerId]) ? params.woundedSoldiers[playerId] : []
			var leftSoldiers = _.isObject(params.damagedSoldiers[playerId]) ? getLeftSoldiers(playerTroop.soldiers, params.damagedSoldiers[playerId]) : playerTroop.soldiers
			var rewards = _.isObject(params.playerRewards[playerId]) ? params.playerRewards[playerId] : []
			var kill = _.isNumber(params.playerKills[playerId]) ? params.playerKills[playerId] : 0
			var killRewards = DataUtils.getRewardsByKillScoreAndTerrain(kill, allianceDoc.basicInfo.terrain)
			rewards = rewards.concat(killRewards)
			var dragon = playerDoc.dragons[playerTroop.dragon.type]
			var dragonHpDecreased = _.isNumber(params.playerDragonHps[playerId]) ? params.playerDragonHps[playerId] : 0
			var dragonExpAdd = DataUtils.getDragonExpAdd(kill)
			var playerData = []

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
			DataUtils.addPlayerDragonExp(playerDoc, playerData, dragon, dragonExpAdd, true)
			playerData.push(["dragons." + dragon.type + ".hp", dragon.hp])
			playerData.push(["dragons." + dragon.type + ".hpRefreshTime", dragon.hpRefreshTime])
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.JoinAllianceShrineEvent)
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

			var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(allianceDoc, playerDoc, dragon, leftSoldiers, woundedSoldiers, rewards)
			allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
			allianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
			enemyAllianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])
		})
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		_.each(_.values(playerDocs), function(playerDoc){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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

/**
 * 村落采集事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onVillageEvents = function(allianceDoc, event, callback){
	var self = this
	var attackAllianceDoc = allianceDoc
	var attackAllianceData = []
	var attackEnemyAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = null
	var defenceEnemyAllianceData = []
	var attackPlayerDoc = null
	var attackPlayerData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(event), null])
	defenceEnemyAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(event), null])
	LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, event)

	this.dataService.findPlayerAsync(event.playerData.id, true).then(function(doc){
		attackPlayerDoc = doc
		if(!_.isEqual(event.playerData.alliance.id, event.villageData.alliance.id)){
			return self.dataService.findAllianceAsync(event.villageData.alliance.id, true).then(function(doc){
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
		var resourceName = village.name.slice(0, -7)
		var newRewards = [{
			type:"resources",
			name:resourceName,
			count:event.villageData.collectTotal
		}]
		LogicUtils.mergeRewards(event.playerData.rewards, newRewards)

		var marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.playerData.dragon, event.playerData.soldiers, event.playerData.woundedSoldiers, defenceAllianceDoc, event.villageData, event.playerData.rewards)
		attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		defenceEnemyAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), marchReturnEvent])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime - Date.now()])

		var collectExp = DataUtils.getCollectResourceExpAdd(resourceName, newRewards[0].count)
		attackPlayerDoc.allianceInfo[resourceName + "Exp"] += collectExp
		attackPlayerData.push(["allianceInfo." + resourceName + "Exp", attackPlayerDoc.allianceInfo[resourceName + "Exp"]])
		var collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, newRewards)
		LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, collectReport)
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, attackPlayerDoc, attackPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])

		if(event.villageData.collectTotal >= village.resource){
			defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village), null])
			if(attackAllianceDoc == defenceAllianceDoc){
				defenceEnemyAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village), null])
			}else{
				attackEnemyAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village), null])
			}
			LogicUtils.removeItemInArray(defenceAllianceDoc.villages, village)
			var villageMapObject = LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, village.id)
			defenceAllianceData.push(["mapObjects." + defenceAllianceDoc.mapObjects.indexOf(villageMapObject), null])
			if(attackAllianceDoc == defenceAllianceDoc){
				defenceEnemyAllianceData.push(["mapObjects." + defenceAllianceDoc.mapObjects.indexOf(villageMapObject), null])
			}else{
				attackEnemyAllianceData.push(["mapObjects." + defenceAllianceDoc.mapObjects.indexOf(villageMapObject), null])
			}
			LogicUtils.removeItemInArray(defenceAllianceDoc.mapObjects, villageMapObject)
			var villageCreateEvent = DataUtils.createVillageCreateEvent(village.name)
			defenceAllianceDoc.villageCreateEvents.push(villageCreateEvent)
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "villageCreateEvents", villageCreateEvent.id, villageCreateEvent.finishTime - Date.now()])
		}else{
			village.resource -= event.villageData.collectTotal
			defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
			if(attackAllianceDoc == defenceAllianceDoc){
				defenceEnemyAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
			}else{
				attackEnemyAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
			}
		}

		if(attackAllianceDoc != defenceAllianceDoc){
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			LogicUtils.pushDataToEnemyAlliance(defenceAllianceDoc, attackEnemyAllianceData, pushFuncs, self.pushService)
		}
		LogicUtils.pushDataToEnemyAlliance(attackAllianceDoc, defenceEnemyAllianceData, pushFuncs, self.pushService)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(attackPlayerDoc, null))
		}
		if(attackAllianceDoc != defenceAllianceDoc && _.isObject(defenceAllianceDoc)){
			funcs.push(self.dataService.updatePlayerAsync(defenceAllianceDoc, null))
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
	var enemyAllianceData = []
	var updateFuncs = []
	var pushFuncs = []
	var eventFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.villageCreateEvents, event)
	DataUtils.createAllianceVillage(allianceDoc, allianceData, enemyAllianceData, event.name, 1)
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
	LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
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
	funcs.push(this.dataService.findAllianceAsync(ourAllianceId, true))
	funcs.push(this.dataService.findAllianceAsync(enemyAllianceId, true))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		attackAllianceDoc = doc_1
		defenceAllianceDoc = doc_2
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, attackAllianceDoc, attackAllianceDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
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
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
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
	var self = this
	var attackAllianceData = []
	var defenceAllianceData = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	var now = Date.now()
	var statusFinishTime = now + (DataUtils.getAllianceIntInit("allianceFightTotalFightMinutes") * 60 * 1000)
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

	eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, statusFinishTime - Date.now()])
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
	callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
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
	var playerIds = {}
	var attackDragon = null

	var pushPlayerIds = function(attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData, playerIds){
		var pushEvent = function(playerId, eventType, eventData){
			if(!_.isObject(playerIds[playerId])) playerIds[playerId] = []
			playerIds[playerId].push({
				attackAllianceDoc:attackAllianceDoc,
				attackAllianceData:attackAllianceData,
				defenceAllianceDoc:defenceAllianceDoc,
				defenceAllianceData:defenceAllianceData,
				eventType:eventType,
				eventData:eventData
			})
		}
		_.each(attackAllianceDoc.villageEvents, function(villageEvent){
			if(!_.isEqual(villageEvent.villageData.alliance.id, attackAllianceDoc._id)){
				pushEvent(villageEvent.playerData.id, "villageEvents", villageEvent)
			}
		})
		_.each(attackAllianceDoc.attackMarchEvents, function(marchEvent){
			if(_.isEqual(Consts.MarchType.City, marchEvent.marchType)){
				pushEvent(marchEvent.attackPlayerData.id, "attackMarchEvents", marchEvent)
			}else if(_.isEqual(Consts.MarchType.Village, marchEvent.marchType) && !_.isEqual(marchEvent.defenceVillageData.alliance.id, attackAllianceDoc._id)){
				pushEvent(marchEvent.attackPlayerData.id, "attackMarchEvents", marchEvent)
			}
		})
		_.each(attackAllianceDoc.attackMarchReturnEvents, function(marchEvent){
			if(_.isEqual(Consts.MarchType.City, marchEvent.marchType)){
				pushEvent(marchEvent.attackPlayerData.id, "attackMarchReturnEvents", marchEvent)
			}else if(_.isEqual(Consts.MarchType.Village, marchEvent.marchType) && !_.isEqual(marchEvent.defenceVillageData.alliance.id, attackAllianceDoc._id)){
				pushEvent(marchEvent.attackPlayerData.id, "attackMarchReturnEvents", marchEvent)
			}
		})
		_.each(attackAllianceDoc.strikeMarchEvents, function(marchEvent){
			if(_.isEqual(Consts.MarchType.City, marchEvent.marchType)){
				pushEvent(marchEvent.attackPlayerData.id, "strikeMarchEvents", marchEvent)
			}else if(_.isEqual(Consts.MarchType.Village, marchEvent.marchType) && !_.isEqual(marchEvent.defenceVillageData.alliance.id, attackAllianceDoc._id)){
				pushEvent(marchEvent.attackPlayerData.id, "strikeMarchEvents", marchEvent)
			}
		})
		_.each(attackAllianceDoc.strikeMarchReturnEvents, function(marchEvent){
			if(_.isEqual(Consts.MarchType.City, marchEvent.marchType)){
				pushEvent(marchEvent.attackPlayerData.id, "strikeMarchReturnEvents", marchEvent)
			}else if(_.isEqual(Consts.MarchType.Village, marchEvent.marchType) && !_.isEqual(marchEvent.defenceVillageData.alliance.id, attackAllianceDoc._id)){
				pushEvent(marchEvent.attackPlayerData.id, "strikeMarchReturnEvents", marchEvent)
			}
		})
	}
	var resolveVillageEvent = function(attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData, attackPlayerDoc, attackPlayerData, villageEvent){
		attackAllianceData.push(["villageEvents." + attackAllianceDoc.villageEvents.indexOf(villageEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, villageEvent)

		var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
		var village = LogicUtils.getAllianceVillageById(defenceAllianceDoc, villageEvent.villageData.id)
		var originalRewards = villageEvent.playerData.rewards
		var resourceName = village.name.slice(0, -7)
		var newRewards = [{
			type:"resources",
			name:resourceName,
			count:resourceCollected
		}]
		LogicUtils.mergeRewards(originalRewards, newRewards)
		DataUtils.refreshPlayerResources(attackPlayerDoc)
		attackPlayerData.push(["resources." + attackPlayerDoc.resources])
		_.each(originalRewards, function(reward){
			attackPlayerDoc[reward.type][reward.name] += reward.count
			attackPlayerData.push([reward.type + "." + reward.name, attackPlayerDoc[reward.type][reward.name]])
		})

		var collectExp = DataUtils.getCollectResourceExpAdd(resourceName, newRewards[0].count)
		attackPlayerDoc.allianceInfo[resourceName + "Exp"] += collectExp
		attackPlayerData.push(["allianceInfo." + resourceName + "Exp", attackPlayerDoc.allianceInfo[resourceName + "Exp"]])
		var collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, newRewards)
		LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, collectReport)

		attackDragon = attackPlayerDoc.dragons[villageEvent.playerData.dragon.type]
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
		attackPlayerDoc.dragons[attackDragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
		attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + attackDragon.type + ".status", attackDragon.status])

		LogicUtils.addPlayerSoldiers(attackPlayerDoc, attackPlayerData, villageEvent.playerData.soldiers)
		DataUtils.addPlayerWoundedSoldiers(attackPlayerDoc, attackPlayerData, villageEvent.playerData.woundedSoldiers)
		village.resource -= resourceCollected
		defenceAllianceData.push(["villages." + defenceAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
	}
	var resolveAttackMarchEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchEvent){
		attackAllianceData.push(["attackMarchEvents." + attackAllianceDoc.attackMarchEvents.indexOf(marchEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.attackMarchEvents, marchEvent)
		attackDragon = attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type]
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
		attackPlayerDoc.dragons[attackDragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
		attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + attackDragon.type + ".status", attackDragon.status])

		if(!_.isObject(attackPlayerData.soldiers)) attackPlayerData.soldiers = {}
		_.each(marchEvent.attackPlayerData.soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] += soldier.count
			attackPlayerData.push(["soldiers." + soldier.name, attackPlayerDoc.soldiers[soldier.name]])
		})
	}
	var resolveAttackMarchReturnEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchReturnEvent){
		attackAllianceData.push(["attackMarchReturnEvents." + attackAllianceDoc.attackMarchReturnEvents.indexOf(marchReturnEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.attackMarchReturnEvents, marchReturnEvent)
		attackDragon = attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type]
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
		attackPlayerDoc.dragons[attackDragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
		attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + attackDragon.type + ".status", attackDragon.status])

		LogicUtils.addPlayerSoldiers(attackPlayerDoc, attackPlayerData, marchReturnEvent.attackPlayerData.soldiers)
		DataUtils.addPlayerWoundedSoldiers(attackPlayerDoc, attackPlayerData, marchReturnEvent.attackPlayerData.woundedSoldiers)

		DataUtils.refreshPlayerResources(attackPlayerDoc)
		attackPlayerData.push(["resoruces", attackPlayerDoc.resources])
		_.each(marchReturnEvent.attackPlayerData.rewards, function(reward){
			attackPlayerDoc[reward.type][reward.name] += reward.count
			attackPlayerData.push([reward.type + "." + reward.name, attackPlayerDoc[reward.type][reward.name]])
		})
	}
	var resolveStrikeMarchEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchEvent){
		attackAllianceData.push(["strikeMarchEvents." + attackAllianceDoc.strikeMarchEvents.indexOf(marchEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.strikeMarchEvents, marchEvent)
		attackDragon = attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type]
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
		attackPlayerDoc.dragons[attackDragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
		attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + attackDragon.type + ".status", attackDragon.status])
	}
	var resolveStrikeMarchReturnEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchReturnEvent){
		attackAllianceData.push(["strikeMarchReturnEvents." + attackAllianceDoc.strikeMarchReturnEvents.indexOf(marchReturnEvent), null])
		LogicUtils.removeItemInArray(attackAllianceDoc.strikeMarchReturnEvents, marchReturnEvent)
		attackDragon = attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type]
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackDragon)
		attackPlayerDoc.dragons[attackDragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.push(["dragons." + attackDragon.type + ".hp", attackDragon.hp])
		attackPlayerData.push(["dragons." + attackDragon.type + ".hpRefreshTime", attackDragon.hpRefreshTime])
		attackPlayerData.push(["dragons." + attackDragon.type + ".status", attackDragon.status])

		DataUtils.refreshPlayerResources(attackPlayerDoc)
		attackPlayerData.push(["resoruces", attackPlayerDoc.resources])
		_.each(marchReturnEvent.attackPlayerData.rewards, function(reward){
			attackPlayerDoc[reward.type][reward.name] += reward.count
			attackPlayerData.push([reward.type + "." + reward.name, attackPlayerDoc[reward.type][reward.name]])
		})
	}

	pushPlayerIds(attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData, playerIds)
	pushPlayerIds(defenceAllianceDoc, defenceAllianceData, attackAllianceDoc, attackAllianceData, playerIds)

	var releasePlayerDataAsync = function(playerId){
		var playerDoc = null
		var playerData = []
		var funcs = []
		return self.dataService.findPlayerAsync(playerId, true).then(function(doc){
			playerDoc = doc
			var events = playerIds[playerDoc._id]
			_.each(events, function(event){
				if(_.isEqual(event.eventType, "villageEvents")){
					resolveVillageEvent(event.attackAllianceDoc, event.attackAllianceData, event.defenceAllianceDoc, event.defenceAllianceData, playerDoc, playerData, event.eventData)
				}else if(_.isEqual(event.eventType, "attackMarchEvents")){
					resolveAttackMarchEvent(event.attackAllianceDoc, event.attackAllianceData, playerDoc, playerData, event.eventData)
				}else if(_.isEqual(event.eventType, "attackMarchReturnEvents")){
					resolveAttackMarchReturnEvent(event.attackAllianceDoc, event.attackAllianceData, playerDoc, playerData, event.eventData)
				}else if(_.isEqual(event.eventType, "strikeMarchEvents")){
					resolveStrikeMarchEvent(event.attackAllianceDoc, event.attackAllianceData, playerDoc, playerData, event.eventData)
				}else if(_.isEqual(event.eventType, "strikeMarchReturnEvents")){
					resolveStrikeMarchReturnEvent(event.attackAllianceDoc, event.attackAllianceData, playerDoc, playerData, event.eventData)
				}
				funcs.push(self.timeEventService.removeAllianceTimeEventAsync(event.attackAllianceDoc, event.eventType, event.eventData.id))
			})
			return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
		}).then(function(){
			return Promise.all(funcs)
		}).then(function(){
			return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
		}).catch(function(e){
			self.logService.onEventError("logic.allianceTimeEventService.onAllianceFightStatusFinished.releasePlayerDataAsync", {
				playerId:playerId,
				events:events
			}, e.stack)
			if(_.isObject(playerDoc)){
				return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
					return Promise.resolve()
				})
			}else{
				return Promise.resolve()
			}
		})
	}

	var funcs = []
	_.each(_.keys(playerIds), function(playerId){
		funcs.push(releasePlayerDataAsync(playerId))
	})

	Promise.all(funcs).then(function(){
		var attackAllianceKill = attackAllianceDoc.allianceFight.attackAllianceCountData.kill
		var defenceAllianceKill = attackAllianceDoc.allianceFight.defenceAllianceCountData.kill
		var allianceFightReport = {
			id:ShortId.generate(),
			mergeStyle:attackAllianceDoc.allianceFight.mergeStyle,
			attackAllianceId:attackAllianceDoc.allianceFight.attackAllianceId,
			defenceAllianceId:attackAllianceDoc.allianceFight.defenceAllianceId,
			fightResult:attackAllianceKill >= defenceAllianceKill ? Consts.FightResult.AttackWin : Consts.FightResult.DefenceWin,
			fightTime:now,
			attackAlliance:{
				name:attackAllianceDoc.basicInfo.name,
				tag:attackAllianceDoc.basicInfo.tag,
				flag:attackAllianceDoc.basicInfo.flag,
				kill:attackAllianceKill,
				routCount:attackAllianceDoc.allianceFight.attackAllianceCountData.routCount,
				strikeCount:attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount,
				strikeSuccessCount:attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount,
				attackCount:attackAllianceDoc.allianceFight.attackAllianceCountData.attackCount,
				attackSuccessCount:attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount
			},
			defenceAlliance:{
				name:defenceAllianceDoc.basicInfo.name,
				tag:defenceAllianceDoc.basicInfo.tag,
				flag:defenceAllianceDoc.basicInfo.flag,
				kill:defenceAllianceKill,
				routCount:attackAllianceDoc.allianceFight.defenceAllianceCountData.routCount,
				strikeCount:attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount,
				strikeSuccessCount:attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount,
				attackCount:attackAllianceDoc.allianceFight.defenceAllianceCountData.attackCount,
				attackSuccessCount:attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount
			}
		}

		LogicUtils.addAllianceFightReport(attackAllianceDoc, attackAllianceData, allianceFightReport)
		LogicUtils.addAllianceFightReport(defenceAllianceDoc, defenceAllianceData, allianceFightReport)

		LogicUtils.updateAllianceCountInfo(attackAllianceDoc, defenceAllianceDoc)
		attackAllianceData.push(["countInfo", attackAllianceDoc.countInfo])
		defenceAllianceData.push(["countInfo", defenceAllianceDoc.countInfo])

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
		})

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
		})

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, attackAllianceDoc.basicInfo.statusFinishTime - Date.now()])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, defenceAllianceDoc.basicInfo.statusFinishTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, attackAllianceDoc._id, attackAllianceData, null])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, defenceAllianceDoc._id, defenceAllianceData, null])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		callback(e)
	})
}