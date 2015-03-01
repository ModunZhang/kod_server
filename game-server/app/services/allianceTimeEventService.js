"use strict"

/**
 * Created by modun on 14-10-28.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

var CommonUtils = require("../utils/utils")
var NodeUtils = require("util")
var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var MarchUtils = require("../utils/marchUtils")
var FightUtils = require("../utils/fightUtils")
var ReportUtils = require("../utils/reportUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")
var Localizations = require("../consts/localizations")

var AllianceTimeEventService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.globalChannelService = app.get("globalChannelService")
	this.timeEventService = app.get("timeEventService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
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
	this.allianceDao.findByIdAsync(allianceId, true).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(_.isEqual(eventType, Consts.AllianceStatusEvent)){
			allianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
			allianceDoc.basicInfo.statusStartTime = Date.now()
			allianceDoc.basicInfo.statusFinishTime = 0
			var allianceData = {}
			allianceData.basicInfo = allianceDoc.basicInfo
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc, true])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			return Promise.resolve()
		}else{
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			event = LogicUtils.getEventById(allianceDoc[eventType], eventId)
			if(!_.isObject(event)){
				return Promise.reject(new Error("联盟事件不存在"))
			}
			var timeEventFuncName = "on" + eventType.charAt(0).toUpperCase() + eventType.slice(1) + "Async"
			if(!_.isObject(self[timeEventFuncName])) return Promise.reject(new Error("未知的事件类型"))
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
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
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
	funcs.push(this.allianceDao.findByIdAsync(ourAllianceId, true))
	funcs.push(this.allianceDao.findByIdAsync(enemyAllianceId, true))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)){
			return Promise.reject(new Error("联盟不存在"))
		}
		attackAllianceDoc = doc_1
		if(!_.isObject(doc_2)){
			return Promise.reject(new Error("联盟不存在"))
		}
		defenceAllianceDoc = doc_2
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare)){
			return self.onAllianceFightPrepareAsync(attackAllianceDoc, defenceAllianceDoc)
		}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return self.onAllianceFightFightingAsync(attackAllianceDoc, defenceAllianceDoc)
		}else{
			return Promise.reject(new Error("非法的联盟状态"))
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
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
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
 * 进攻行军事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onAttackMarchEvents = function(allianceDoc, event, callback){
	var self = this
	var attackAllianceDoc = allianceDoc
	var attackAllianceData = {}
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var defenceAllianceDoc = null
	var defenceAllianceData = {}
	var defencePlayerDoc = null
	var defencePlayerData = {}
	var helpDefencePlayerDoc = null
	var helpDefencePlayerData = {}
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

	LogicUtils.removeItemInArray(attackAllianceDoc.attackMarchEvents, event)
	attackAllianceData.__attackMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	if(_.isEqual(event.marchType, Consts.MarchType.Shrine)){
		var shrineEvent = LogicUtils.getEventById(attackAllianceDoc.shrineEvents, event.defenceShrineData.shrineEventId)
		if(!_.isObject(shrineEvent)){
			this.playerDao.findByIdAsync(event.attackPlayerData.id, true).then(function(doc){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				attackPlayerDoc = doc
				var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], [])
				attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__attackMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}).then(function(){
				callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
			}).catch(function(e){
				funcs = []
				if(_.isObject(attackPlayerDoc)){
					funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
				}
				if(funcs.length > 0){
					Promise.all(funcs).then(function(){
						callback(e)
					})
				}else{
					callback(e)
				}
			})
		}else{
			var playerTroop = {
				id:event.attackPlayerData.id,
				name:event.attackPlayerData.name,
				cityName:event.attackPlayerData.cityName,
				location:event.attackPlayerData.location,
				dragon:event.attackPlayerData.dragon,
				soldiers:event.attackPlayerData.soldiers
			}
			shrineEvent.playerTroops.push(playerTroop)
			attackAllianceData.__shrineEvents = [{
				type:Consts.DataChangedType.Edit,
				data:shrineEvent
			}]
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}
		return
	}
	if(_.isEqual(event.marchType, Consts.MarchType.HelpDefence)){
		funcs = []
		funcs.push(this.playerDao.findByIdAsync(event.attackPlayerData.id, true))
		funcs.push(this.playerDao.findByIdAsync(event.defencePlayerData.id, true))
		Promise.all(funcs).spread(function(doc_1, doc_2){
			if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
			if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc_1
			defencePlayerDoc = doc_2

			var helpToTroop = {
				playerDragon:event.attackPlayerData.dragon.type,
				beHelpedPlayerData:{
					id:defencePlayerDoc._id,
					name:defencePlayerDoc.basicInfo.name,
					cityName:defencePlayerDoc.basicInfo.cityName,
					location:LogicUtils.getAllianceMemberById(attackAllianceDoc, defencePlayerDoc._id).location
				}
			}
			attackPlayerDoc.helpToTroops.push(helpToTroop)
			attackPlayerData.__helpToTroops = [{
				type:Consts.DataChangedType.Add,
				data:helpToTroop
			}]
			var helpedByTroop = {
				id:attackPlayerDoc._id,
				name:attackPlayerDoc.basicInfo.name,
				level:attackPlayerDoc.basicInfo.level,
				cityName:attackPlayerDoc.basicInfo.cityName,
				dragon:{
					type:event.attackPlayerData.dragon.type
				},
				soldiers:event.attackPlayerData.soldiers,
				rewards:[]
			}
			defencePlayerDoc.helpedByTroops.push(helpedByTroop)
			defencePlayerData.__helpedByTroops = [{
				type:Consts.DataChangedType.Add,
				data:helpedByTroop
			}]
			var beHelpedMemberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, defencePlayerDoc._id)
			beHelpedMemberInAlliance.helpedByTroopsCount += 1
			attackAllianceData.__members = [{
				type:Consts.DataChangedType.Edit,
				data:beHelpedMemberInAlliance
			}]
			TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.HelpAllianceMemberDefence)
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(defencePlayerDoc._id))
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
		var updatePlayerKillData = function(playerKillDatas, playerDoc, newlyKill){
			var isNew = false
			var playerKillData = _.find(playerKillDatas, function(playerKillData){
				return _.isEqual(playerKillData.id, playerDoc._id)
			})
			if(!_.isObject(playerKillData)){
				playerKillData = {
					id:playerDoc._id,
					name:playerDoc.basicInfo.name,
					level:playerDoc.basicInfo.level,
					kill:0
				}
				playerKillDatas.push(playerKillData)
				isNew = true
			}
			playerKillData.kill += newlyKill

			return {data:playerKillData, isNew:isNew}
		}
		var updatePlayerSoldiers = function(playerDoc, playerData, soldiersForFight){
			var soldiers = []
			if(!_.isObject(playerData.soldiers)) playerData.soldiers = {}
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
		funcs.push(self.playerDao.findByIdAsync(event.attackPlayerData.id, true))
		funcs.push(self.allianceDao.findByIdAsync(event.defencePlayerData.alliance.id, true))
		funcs.push(self.playerDao.findByIdAsync(event.defencePlayerData.id, true))
		Promise.all(funcs).spread(function(doc_1, doc_2, doc_3){
			if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc_1
			if(!_.isObject(doc_2)) return Promise.reject(new Error("联盟不存在"))
			defenceAllianceDoc = doc_2
			if(!_.isObject(doc_3)) return Promise.reject(new Error("玩家不存在"))
			defencePlayerDoc = doc_3
			if(defencePlayerDoc.helpedByTroops.length > 0){
				return self.playerDao.findByIdAsync(defencePlayerDoc.helpedByTroops[0].id)
			}
			DataUtils.refreshPlayerResources(defencePlayerDoc)
			defencePlayerData.resources = defencePlayerDoc.resources
			defencePlayerData.basicInfo = defencePlayerDoc.basicInfo
			return Promise.resolve()
		}).then(function(doc){
			if(defencePlayerDoc.helpedByTroops.length > 0){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				helpDefencePlayerDoc = doc
			}
			attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			attackDragonForFight = DataUtils.createPlayerDragonForFight(attackPlayerDoc, attackDragon, defencePlayerDoc.basicInfo.terrain)
			attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, defencePlayerDoc.basicInfo.terrain)
			attackTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(attackPlayerDoc, attackDragon)
			attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
			attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)

			if(_.isObject(helpDefencePlayerDoc)){
				helpedByTroop = defencePlayerDoc.helpedByTroops[0]
				helpDefenceDragon = helpDefencePlayerDoc.dragons[helpedByTroop.dragon.type]
				helpDefenceDragonForFight = DataUtils.createPlayerDragonForFight(helpDefencePlayerDoc, helpDefenceDragon, defencePlayerDoc.basicInfo.terrain)
				helpDefenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(helpDefencePlayerDoc, helpedByTroop.soldiers, helpDefenceDragon, defencePlayerDoc.basicInfo.terrain)
				helpDefenceTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, helpDefenceSoldiersForFight)
			}
			defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
			var defenceSoldiers = DataUtils.getPlayerDefenceSoldiers(defencePlayerDoc)
			if(_.isObject(defenceDragon) && defenceSoldiers.length > 0){
				defenceDragonForFight = DataUtils.createPlayerDragonForFight(defencePlayerDoc, defenceDragon, defencePlayerDoc.basicInfo.terrain)
				defenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(defencePlayerDoc, defenceSoldiers, defenceDragon, defencePlayerDoc.basicInfo.terrain)
				defenceTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(defencePlayerDoc, defenceDragon)
				defenceSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(defencePlayerDoc, defenceDragon)
				defenceToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(defencePlayerDoc, defenceDragon)
				defenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, defenceSoldiersForFight)
			}
			if(defencePlayerDoc.resources.wallHp > 0){
				defenceWallForFight = DataUtils.createPlayerWallForFight(defencePlayerDoc)
			}
			return Promise.resolve()
		}).then(function(){
			if(_.isObject(helpDefencePlayerDoc)){
				helpDefenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, helpDefenceDragonForFight, helpDefenceDragonFightFixEffect)
				helpDefenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent, attackSoldierMoraleDecreasedPercent + helpDefenceToEnemySoldierMoralDecreasedAddPercent, helpDefenceSoldiersForFight, helpDefenceTreatSoldierPercent, helpDefenceSoldierMoraleDecreasedPercent + attackToEnemySoldierMoralDecreasedAddPercent)
				updateDragonForFight(attackDragonForFight, helpDefenceDragonFightData.attackDragonAfterFight)
				updateSoldiersForFight(attackSoldiersForFight, helpDefenceSoldierFightData.attackSoldiersAfterFight)
				updateDragonForFight(helpDefenceDragonForFight, helpDefenceDragonFightData.defenceDragonAfterFight)
				updateSoldiersForFight(helpDefenceSoldiersForFight, helpDefenceSoldierFightData.defenceSoldiersAfterFight)
				return Promise.resolve()
			}
			if(_.isObject(defenceDragonForFight)){
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
						var attackSoldiers = CommonUtils.clone(defenceSoldierFightData.attackSoldiersAfterFight[i])
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
			}else{
				attackSoldiersLeftForFight = attackSoldiersForFight
			}
			if(_.isObject(defenceWallForFight)){
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
			TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
			memberObject = LogicUtils.addAlliancePlayerLastThreeDaysKillData(attackAllianceDoc, attackPlayerDoc._id, countData.attackPlayerKill)
			attackAllianceData.__members = [{
				type:Consts.DataChangedType.Edit,
				data:memberObject
			}]

			var attackPlayerRewards = attackCityReport.attackPlayerData.rewards
			var attackPlayerKillRewards = DataUtils.getRewardsByKillScoreAndTerrain(countData.attackPlayerKill, defenceAllianceDoc.basicInfo.terrain)
			attackPlayerRewards = attackPlayerRewards.concat(attackPlayerKillRewards)
			attackDragon.hp -= attackDragonForFight.totalHp - attackDragonForFight.currentHp
			if(attackDragon.hp <= 0){
				deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
				attackPlayerDoc.dragonDeathEvents.push(deathEvent)
				attackPlayerData.__dragonDeathEvents = [{
					type:Consts.DataChangedType.Add,
					data:deathEvent
				}]
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
			}
			var attackPlayerItemBuff = DataUtils.isPlayerHasItemEvent(attackPlayerDoc, "dragonExpBonus") ? 0.3 : 0
			DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, countData.attackDragonExpAdd * (1 + attackPlayerItemBuff))
			attackPlayerData.basicInfo = attackPlayerDoc.basicInfo
			attackPlayerData.dragons = {}
			attackPlayerData.dragons[attackDragon.type] = attackPlayerDoc.dragons[attackDragon.type]

			LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.report)

			var attackCityMarchReturnEvent = MarchUtils.createAttackPlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, getSoldiersFromSoldiersForFight(attackSoldiersForFight), getWoundedSoldiersFromSoldiersForFight(attackSoldiersForFight), defenceAllianceDoc, defencePlayerDoc, attackPlayerRewards)
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", attackCityMarchReturnEvent.id, attackCityMarchReturnEvent.arriveTime])
			attackAllianceDoc.attackMarchReturnEvents.push(attackCityMarchReturnEvent)
			attackAllianceData.__attackMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:attackCityMarchReturnEvent
			}]
			TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.AttackEnemyPlayersCity)
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])

			if(_.isObject(helpDefenceDragonFightData)){
				theDefencePlayerDoc = helpDefencePlayerDoc

				helpDefencePlayerDoc.basicInfo.kill += countData.defencePlayerKill
				TaskUtils.finishPlayerKillTaskIfNeed(helpDefencePlayerDoc, helpDefencePlayerData)
				memberObject = LogicUtils.addAlliancePlayerLastThreeDaysKillData(defenceAllianceDoc, helpDefencePlayerDoc._id, countData.defencePlayerKill)
				defenceAllianceData.__members = [{
					type:Consts.DataChangedType.Edit,
					data:memberObject
				}]
				helpDefenceDragon.hp -= helpDefenceDragonForFight.totalHp - helpDefenceDragonForFight.currentHp
				if(helpDefenceDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(helpDefencePlayerDoc, helpDefenceDragon)
					helpDefencePlayerDoc.dragonDeathEvents.push(deathEvent)
					helpDefencePlayerData.__dragonDeathEvents = [{
						type:Consts.DataChangedType.Add,
						data:deathEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, helpDefencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
				}
				var helpDefencePlayerItemBuff = DataUtils.isPlayerHasItemEvent(helpDefencePlayerDoc, "dragonExpBonus") ? 0.3 : 0
				DataUtils.addPlayerDragonExp(helpDefencePlayerDoc, helpDefencePlayerData, helpDefenceDragon, countData.defenceDragonExpAdd * (1 + helpDefencePlayerItemBuff))
				helpDefencePlayerData.basicInfo = helpDefencePlayerDoc.basicInfo
				helpDefencePlayerData.dragons = {}
				helpDefencePlayerData.dragons[helpDefenceDragon.type] = helpDefencePlayerDoc.dragons[helpDefenceDragon.type]

				LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, report.report)
				var helpDefenceMailTitle = Localizations.Alliance.HelpDefenceAttackTitle
				var helpDefenceMailContent = Localizations.Alliance.HelpDefenceAttackContent
				var helpDefenceMailParams = [helpDefencePlayerDoc.basicInfo.name, defenceAllianceDoc.basicInfo.tag]
				LogicUtils.sendSystemMail(defencePlayerDoc, defencePlayerData, helpDefenceMailTitle, helpDefenceMailParams, helpDefenceMailContent, helpDefenceMailParams)

				var soldiers = getSoldiersFromSoldiersForFight(helpDefenceSoldierFightData.defenceSoldiersAfterFight)
				var woundedSoldiers = getWoundedSoldiersFromSoldiersForFight(helpDefenceSoldiersForFight)
				var rewards = LogicUtils.mergeRewards(helpedByTroop.rewards, attackCityReport.helpDefencePlayerData.rewards)
				var helpDefencePlayerKillRewards = DataUtils.getRewardsByKillScoreAndTerrain(countData.defencePlayerKill, defenceAllianceDoc.basicInfo.terrain)
				rewards = rewards.concat(rewards, helpDefencePlayerKillRewards)
				LogicUtils.removeItemInArray(defencePlayerDoc.helpedByTroops, helpedByTroop)
				defencePlayerData.__helpedByTroops = [{
					type:Consts.DataChangedType.Remove,
					data:helpedByTroop
				}]
				var helpToTroop = _.find(helpDefencePlayerDoc.helpToTroops, function(troop){
					return _.isEqual(troop.beHelpedPlayerData.id, defencePlayerDoc._id)
				})
				LogicUtils.removeItemInArray(helpDefencePlayerDoc.helpToTroops, helpToTroop)
				helpDefencePlayerData.__helpToTroops = [{
					type:Consts.DataChangedType.Remove,
					data:helpToTroop
				}]
				var defencePlayerInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
				defencePlayerInAlliance.helpedByTroopsCount -= 1
				defenceAllianceData.__members = [{
					type:Consts.DataChangedType.Edit,
					data:defencePlayerInAlliance
				}]
				var helpDefenceMarchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(defenceAllianceDoc, helpDefencePlayerDoc, defencePlayerDoc, helpDefenceDragon, soldiers, woundedSoldiers, rewards)
				defenceAllianceDoc.attackMarchReturnEvents.push(helpDefenceMarchReturnEvent)
				defenceAllianceData.__attackMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:helpDefenceMarchReturnEvent
				}]

				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", helpDefenceMarchReturnEvent.id, helpDefenceMarchReturnEvent.arriveTime])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])
			}else{
				theDefencePlayerDoc = defencePlayerDoc

				defencePlayerDoc.basicInfo.kill += countData.defencePlayerKill
				TaskUtils.finishPlayerKillTaskIfNeed(defencePlayerDoc, defencePlayerData)
				memberObject = LogicUtils.addAlliancePlayerLastThreeDaysKillData(defenceAllianceDoc, defencePlayerDoc._id, countData.defencePlayerKill)
				defenceAllianceData.__members = [{
					type:Consts.DataChangedType.Edit,
					data:memberObject
				}]
				var defencePlayerRewards = attackCityReport.defencePlayerData.rewards
				var defencePlayerKillRewards = DataUtils.getRewardsByKillScoreAndTerrain(countData.defencePlayerKill, defenceAllianceDoc.basicInfo.terrain)
				defencePlayerRewards = defencePlayerRewards.concat(defencePlayerKillRewards)
				if(_.isObject(defenceDragonFightData)){
					defenceDragon.hp -= defenceDragonForFight.totalHp - defenceDragonForFight.currentHp
					if(defenceDragon.hp <= 0){
						deathEvent = DataUtils.createPlayerDragonDeathEvent(defencePlayerDoc, defenceDragon)
						defencePlayerDoc.dragonDeathEvents.push(deathEvent)
						defencePlayerData.__dragonDeathEvents = [{
							type:Consts.DataChangedType.Add,
							data:deathEvent
						}]
						eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, defencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
					}
					var defencePlayerItemBuff = DataUtils.isPlayerHasItemEvent(defencePlayerDoc, "dragonExpBonus") ? 0.3 : 0
					DataUtils.addPlayerDragonExp(defencePlayerDoc, defencePlayerData, defenceDragon, countData.defenceDragonExpAdd * (1 + defencePlayerItemBuff))
					defencePlayerData.basicInfo = defencePlayerDoc.basicInfo
					defencePlayerData.dragons = {}
					defencePlayerData.dragons[defenceDragon.type] = defencePlayerDoc.dragons[defenceDragon.type]

					updatePlayerSoldiers(defencePlayerDoc, defencePlayerData, defenceSoldiersForFight)
					updatePlayerWoundedSoldiers(defencePlayerDoc, defencePlayerData, defenceSoldiersForFight)
				}
				if(_.isObject(defenceWallFightData)){
					defencePlayerDoc.resources.wallHp -= defenceWallForFight.totalHp - defenceWallForFight.currentHp
				}
				_.each(defencePlayerRewards, function(reward){
					defencePlayerDoc[reward.type][reward.name] += reward.count
					if(!_.isObject(defencePlayerData[reward.type])) defencePlayerData[reward.type] = defencePlayerDoc[reward.type]
				})

				LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.report)
			}
			DataUtils.refreshPlayerResources(defencePlayerDoc)
			defencePlayerData.basicInfo = defencePlayerDoc.basicInfo
			defencePlayerData.resources = defencePlayerDoc.resources
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

			attackAllianceData.allianceFight = {}
			defenceAllianceData.allianceFight = {}
			var playerKillData = null
			if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
				attackAllianceDoc.allianceFight.attackAllianceCountData.attackCount += 1
				defenceAllianceDoc.allianceFight.attackAllianceCountData.attackCount += 1

				attackAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.attackPlayerKill
				defenceAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.attackPlayerKill
				playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.attackPlayerKills, attackPlayerDoc, countData.attackPlayerKill)
				updatePlayerKillData(defenceAllianceDoc.allianceFight.attackPlayerKills, attackPlayerDoc, countData.attackPlayerKill)
				attackAllianceData.allianceFight.__attackPlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]
				defenceAllianceData.allianceFight.__attackPlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]

				attackAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.defencePlayerKill
				defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.defencePlayerKill
				playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.defencePlayerKills, theDefencePlayerDoc, countData.defencePlayerKill)
				updatePlayerKillData(defenceAllianceDoc.allianceFight.defencePlayerKills, theDefencePlayerDoc, countData.defencePlayerKill)
				attackAllianceData.allianceFight.__defencePlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]
				defenceAllianceData.allianceFight.__defencePlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]

				if(_.isObject(helpDefenceSoldierFightData)){
					if(_.isEqual(Consts.FightResult.AttackWin, helpDefenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						attackPlayerDoc.basicInfo.attackWin += 1
						TaskUtils.finishAttackWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
				}else{
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
						attackPlayerDoc.basicInfo.attackWin += 1
						TaskUtils.finishAttackWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						if(!_.isObject(defenceWallFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceWallFightData.fightResult)){
							attackAllianceDoc.allianceFight.attackAllianceCountData.routCount += 1
							defenceAllianceDoc.allianceFight.attackAllianceCountData.routCount += 1
							memberInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
							memberInAlliance.isProtected = true
							defenceAllianceData.__members = [{
								type:Consts.DataChangedType.Edit,
								data:memberInAlliance
							}]
						}
					}
				}
			}else{
				attackAllianceDoc.allianceFight.defenceAllianceCountData.attackCount += 1
				defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackCount += 1

				attackAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.attackPlayerKill
				defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.attackPlayerKill
				playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.defencePlayerKills, attackPlayerDoc, countData.attackPlayerKill)
				updatePlayerKillData(defenceAllianceDoc.allianceFight.defencePlayerKills, attackPlayerDoc, countData.attackPlayerKill)
				attackAllianceData.allianceFight.__defencePlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]
				defenceAllianceData.allianceFight.__defencePlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]

				attackAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.defencePlayerKill
				defenceAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.defencePlayerKill
				playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.attackPlayerKills, theDefencePlayerDoc, countData.defencePlayerKill)
				updatePlayerKillData(defenceAllianceDoc.allianceFight.attackPlayerKills, theDefencePlayerDoc, countData.defencePlayerKill)
				attackAllianceData.allianceFight.__attackPlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]
				defenceAllianceData.allianceFight.__attackPlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]

				if(_.isObject(helpDefenceSoldierFightData)){
					if(_.isEqual(Consts.FightResult.AttackWin, helpDefenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
					}
				}else{
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
					}
					if(!_.isObject(defenceSoldierFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
						if(!_.isObject(defenceWallFightData) || _.isEqual(Consts.FightResult.AttackWin, defenceWallFightData.fightResult)){
							attackAllianceDoc.allianceFight.defenceAllianceCountData.routCount += 1
							defenceAllianceDoc.allianceFight.defenceAllianceCountData.routCount += 1
							memberInAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id)
							memberInAlliance.isProtected = true
							defenceAllianceData.__members = [{
								type:Consts.DataChangedType.Edit,
								data:memberInAlliance
							}]
						}
					}
				}
			}
			attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
			attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
			defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
			defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData

			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)
			LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)

			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
			}
			if(_.isObject(helpDefencePlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(helpDefencePlayerDoc._id))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(defencePlayerDoc._id))
			}
			if(_.isObject(defenceAllianceDoc)){
				funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
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
		var attackKillRewards = null
		var eventData = null
		var newVillageEvent = null
		var defenceDragonExpAdd = null
		var defencePlayerKill = null
		var defenceSoldiers = null
		var defenceWoundedSoldiers = null
		var defenceRewards = null
		var marchReturnEvent = null
		var attackPlayerItemBuff = null
		var resourceName = null
		var newRewards = null

		funcs = []
		funcs.push(self.playerDao.findByIdAsync(event.attackPlayerData.id, true))
		if(_.isObject(attackAllianceDoc.allianceFight)){
			var defenceAllianceId = _.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId) ? attackAllianceDoc.allianceFight.defenceAllianceId : attackAllianceDoc.allianceFight.attackAllianceId
			funcs.push(self.allianceDao.findByIdAsync(defenceAllianceId, true))
		}
		Promise.all(funcs).spread(function(doc_1, doc_2){
			if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc_1
			if(_.isObject(attackAllianceDoc.allianceFight)){
				if(!_.isObject(doc_2)) return Promise.reject(new Error("联盟不存在"))
				defenceAllianceDoc = doc_2
				defenceAllianceData = {}
				targetAllianceDoc = _.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id) ? attackAllianceDoc : defenceAllianceDoc
				targetAllianceData = _.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id) ? attackAllianceData : defenceAllianceData
			}else{
				targetAllianceDoc = attackAllianceDoc
				targetAllianceData = attackAllianceData
			}

			villageEvent = _.find(attackAllianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
			})
			if(!_.isObject(villageEvent) && _.isObject(defenceAllianceDoc)){
				villageEvent = _.find(defenceAllianceDoc.villageEvents, function(villageEvent){
					return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
				})
			}
			if(_.isObject(villageEvent)){
				return self.playerDao.findByIdAsync(villageEvent.playerData.id, true)
			}
			return Promise.resolve()
		}).then(function(doc){
			if(_.isObject(villageEvent)){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				defencePlayerDoc = doc
			}
			village = LogicUtils.getAllianceVillageById(targetAllianceDoc, event.defenceVillageData.id)
			resourceName = village.type.slice(0, -7)
			if(!_.isObject(village)){
				var deletedVillage = {
					id:event.defenceVillageData.id,
					type:event.defenceVillageData.type,
					level:event.defenceVillageData.level,
					location:event.defenceVillageData.location
				}
				marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], targetAllianceDoc, deletedVillage, [])
				attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__attackMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(!_.isObject(villageEvent)){
				eventData = MarchUtils.createAllianceVillageEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], targetAllianceDoc, village, [])
				newVillageEvent = eventData.event
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", newVillageEvent.id, newVillageEvent.finishTime])
				attackAllianceDoc.villageEvents.push(newVillageEvent)
				attackAllianceData.__villageEvents = [{
					type:Consts.DataChangedType.Add,
					data:newVillageEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(_.isObject(villageEvent) && _.isEqual(villageEvent.playerData.alliance.id, attackAllianceDoc._id)){
				marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, event.attackPlayerData.soldiers, [], targetAllianceDoc, village, [])
				attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__attackMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, defencePlayerDoc._id])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(_.isObject(villageEvent) && !_.isEqual(villageEvent.playerData.alliance.id, attackAllianceDoc._id)){
				attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
				attackDragonForFight = DataUtils.createPlayerDragonForFight(attackPlayerDoc, attackDragon, targetAllianceDoc.basicInfo.terrain)
				attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers, attackDragon, targetAllianceDoc.basicInfo.terrain)
				attackTreatSoldierPercent = DataUtils.getPlayerTreatSoldierPercent(attackPlayerDoc, attackDragon)
				attackSoldierMoraleDecreasedPercent = DataUtils.getPlayerSoldierMoraleDecreasedPercent(attackPlayerDoc, attackDragon)
				attackToEnemySoldierMoralDecreasedAddPercent = DataUtils.getEnemySoldierMoraleAddedPercent(attackPlayerDoc, attackDragon)

				defenceDragon = defencePlayerDoc.dragons[villageEvent.playerData.dragon.type]
				defenceDragonForFight = DataUtils.createPlayerDragonForFight(defencePlayerDoc, defenceDragon, targetAllianceDoc.basicInfo.terrain)
				defenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(defencePlayerDoc, villageEvent.playerData.soldiers, defenceDragon, targetAllianceDoc.basicInfo.terrain)
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
				attackKillRewards = DataUtils.getRewardsByKillScoreAndTerrain(attackPlayerKill, defenceAllianceDoc.basicInfo.terrain)
				LogicUtils.mergeRewards(attackRewards, attackKillRewards)

				defenceDragonExpAdd = countData.attackDragonExpAdd
				defencePlayerKill = countData.attackPlayerKill
				defenceSoldiers = createSoldiers(defenceSoldierFightData.defenceSoldiersAfterFight)
				defenceWoundedSoldiers = createWoundedSoldiers(defenceSoldierFightData.defenceSoldiersAfterFight)
				defenceRewards = report.report.attackVillage.defencePlayerData.rewards
				var defenceKillRewards = DataUtils.getRewardsByKillScoreAndTerrain(defencePlayerKill, defenceAllianceDoc.basicInfo.terrain)
				LogicUtils.mergeRewards(defenceRewards, defenceKillRewards)

				villageEvent.playerData.soldiers = defenceSoldiers
				LogicUtils.mergeRewards(villageEvent.playerData.rewards, defenceRewards)
				LogicUtils.mergeSoldiers(villageEvent.playerData.woundedSoldiers, defenceWoundedSoldiers)

				attackPlayerDoc.basicInfo.kill += attackPlayerKill
				TaskUtils.finishPlayerKillTaskIfNeed(attackPlayerDoc, attackPlayerData)
				attackDragon.hp -= defenceDragonFightData.attackDragonHpDecreased
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.__dragonDeathEvents = [{
						type:Consts.DataChangedType.Add,
						data:deathEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
				}
				attackPlayerItemBuff = DataUtils.isPlayerHasItemEvent(attackPlayerDoc, "dragonExpBonus") ? 0.3 : 0
				DataUtils.addPlayerDragonExp(attackPlayerDoc, attackPlayerData, attackDragon, attackDragonExpAdd * (1 + attackPlayerItemBuff))
				attackPlayerData.basicInfo = attackPlayerDoc.basicInfo
				attackPlayerData.dragons = {}
				attackPlayerData.dragons[attackDragon.type] = attackPlayerDoc.dragons[attackDragon.type]

				defencePlayerDoc.basicInfo.kill += defencePlayerKill
				TaskUtils.finishPlayerKillTaskIfNeed(defencePlayerDoc, defencePlayerData)
				defenceDragon.hp -= defenceDragonFightData.defenceDragonHpDecreased
				if(defenceDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(defencePlayerDoc, defenceDragon)
					defencePlayerDoc.dragonDeathEvents.push(deathEvent)
					defencePlayerData.__dragonDeathEvents = [{
						type:Consts.DataChangedType.Add,
						data:deathEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, defencePlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
				}
				var defencePlayerItemBuff = DataUtils.isPlayerHasItemEvent(defencePlayerDoc, "dragonExpBonus") ? 0.3 : 0
				DataUtils.addPlayerDragonExp(defencePlayerDoc, defencePlayerData, defenceDragon, defenceDragonExpAdd * (1 + defencePlayerItemBuff))

				defencePlayerData.basicInfo = defencePlayerDoc.basicInfo
				defencePlayerData.dragons = {}
				defencePlayerData.dragons[defenceDragon.type] = defencePlayerDoc.dragons[defenceDragon.type]

				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
				if(_.isEqual(Consts.FightResult.AttackWin, defenceSoldierFightData.fightResult)){
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, defenceAllianceDoc, villageEvent.id])
					LogicUtils.removeItemInArray(defenceAllianceDoc.villageEvents, villageEvent)
					defenceAllianceData.__villageEvents = [{
						type:Consts.DataChangedType.Remove,
						data:villageEvent
					}]
					marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(defenceAllianceDoc, defencePlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, targetAllianceDoc, village, villageEvent.playerData.rewards)
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
					defenceAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
					defenceAllianceData.__attackMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:marchReturnEvent
					}]

					eventData = MarchUtils.createAllianceVillageEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, targetAllianceDoc, village, attackRewards)
					newVillageEvent = eventData.event
					if(attackDragon.hp <= 0 || eventData.collectTotal <= resourceCollected){
						newRewards = [{
							type:"resources",
							name:resourceName,
							count:eventData.collectTotal
						}]
						LogicUtils.mergeRewards(newVillageEvent.playerData.rewards, newRewards)
						marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, newVillageEvent.playerData.dragon, newVillageEvent.playerData.soldiers, newVillageEvent.playerData.woundedSoldiers, targetAllianceDoc, village, newVillageEvent.playerData.rewards)
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
						attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
						attackAllianceData.__attackMarchReturnEvents = [{
							type:Consts.DataChangedType.Add,
							data:marchReturnEvent
						}]
						village.resource -= eventData.collectTotal
						targetAllianceData.__villages = [{
							type:Consts.DataChangedType.Edit,
							data:village
						}]
					}else{
						var timeUsed = Math.floor(eventData.collectTime * (resourceCollected / eventData.collectTotal))
						newVillageEvent.startTime -= timeUsed
						newVillageEvent.finishTime -= timeUsed
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "villageEvents", newVillageEvent.id, newVillageEvent.finishTime])
						attackAllianceDoc.villageEvents.push(newVillageEvent)
						attackAllianceData.__villageEvents = [{
							type:Consts.DataChangedType.Add,
							data:newVillageEvent
						}]
					}

					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)
					LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)
				}else{
					marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, attackSoldiers, attackWoundedSoldiers, targetAllianceDoc, village, attackRewards)
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
					attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
					attackAllianceData.__attackMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:marchReturnEvent
					}]

					var newSoldierLoadTotal = DataUtils.getPlayerSoldiersTotalLoad(defencePlayerDoc, villageEvent.playerData.soldiers)
					var newCollectInfo = DataUtils.getPlayerCollectResourceInfo(defencePlayerDoc, newSoldierLoadTotal, village)
					villageEvent.villageData.collectTotal = newCollectInfo.collectTotal
					villageEvent.finishTime = villageEvent.startTime + newCollectInfo.collectTime
					if(defenceDragon.hp <= 0 || newCollectInfo.collectTotal <= resourceCollected){
						newRewards = [{
							type:"resources",
							name:resourceName,
							count:newCollectInfo.collectTotal
						}]
						LogicUtils.mergeRewards(villageEvent.playerData.rewards, newRewards)
						eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, defenceAllianceDoc, villageEvent.id])
						LogicUtils.removeItemInArray(defenceAllianceDoc.villageEvents, villageEvent)
						defenceAllianceData.__villageEvents = [{
							type:Consts.DataChangedType.Remove,
							data:villageEvent
						}]
						marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(defenceAllianceDoc, defencePlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, targetAllianceDoc, village, villageEvent.playerData.rewards)
						eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
						defenceAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
						defenceAllianceData.__attackMarchReturnEvents = [{
							type:Consts.DataChangedType.Add,
							data:marchReturnEvent
						}]
						village.resource -= newCollectInfo.collectTotal
						targetAllianceData.__villages = [{
							type:Consts.DataChangedType.Edit,
							data:village
						}]
					}else{
						eventFuncs.push([self.timeEventService, self.timeEventService.updateAllianceTimeEventAsync, defenceAllianceDoc, villageEvent.id, villageEvent.finishTime])
						defenceAllianceData.__villageEvents = [{
							type:Consts.DataChangedType.Edit,
							data:villageEvent
						}]
					}

					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
					LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)
					LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)
				}
				return Promise.resolve()
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(defencePlayerDoc._id))
			}
			if(_.isObject(attackAllianceDoc)){
				funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
			}
			if(_.isObject(defenceAllianceDoc) && attackAllianceDoc != defenceAllianceDoc){
				funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
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
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.attackMarchReturnEvents, event)
	allianceData.__attackMarchReturnEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	//console.log(NodeUtils.inspect(event, false, null))
	var playerDoc = null
	this.playerDao.findByIdAsync(event.attackPlayerData.id, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var playerData = {}

		var dragonType = event.attackPlayerData.dragon.type
		var dragon = playerDoc.dragons[dragonType]
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		dragon.status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDoc.dragons[dragonType]

		LogicUtils.addPlayerSoldiers(playerDoc, playerData, event.attackPlayerData.soldiers)
		DataUtils.addPlayerWoundedSoldiers(playerDoc, playerData, event.attackPlayerData.woundedSoldiers)

		DataUtils.refreshPlayerResources(playerDoc)
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = playerDoc[reward.type]
		})
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
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
	var attackAllianceData = {}
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var defencePlayerDoc = null
	var defencePlayerData = {}
	var defenceAllianceDoc = null
	var defenceAllianceData = {}
	var helpDefencePlayerDoc = null
	var helpDefencePlayerData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var funcs = null
	var deathEvent = null
	LogicUtils.removeItemInArray(attackAllianceDoc.strikeMarchEvents, event)
	attackAllianceData.__strikeMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	if(_.isEqual(event.marchType, Consts.MarchType.City)){
		funcs = []
		funcs.push(self.playerDao.findByIdAsync(event.attackPlayerData.id, true))
		funcs.push(self.allianceDao.findByIdAsync(event.defencePlayerData.alliance.id, true))
		funcs.push(self.playerDao.findByIdAsync(event.defencePlayerData.id, true))
		Promise.all(funcs).spread(function(doc_1, doc_2, doc_3){
			if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc_1
			if(!_.isObject(doc_2)) return Promise.reject(new Error("联盟不存在"))
			defenceAllianceDoc = doc_2
			if(!_.isObject(doc_3)) return Promise.reject(new Error("玩家不存在"))
			defencePlayerDoc = doc_3
			if(defencePlayerDoc.helpedByTroops.length > 0){
				return self.playerDao.findByIdAsync(defencePlayerDoc.helpedByTroops[0].id)
			}
			return Promise.resolve()
		}).then(function(doc){
			if(defencePlayerDoc.helpedByTroops.length > 0){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				helpDefencePlayerDoc = doc
			}

			var attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			var report = null
			var strikeMarchReturnEvent = null
			if(_.isObject(helpDefencePlayerDoc)){
				var helpDefenceDragon = helpDefencePlayerDoc.dragons[defencePlayerDoc.helpedByTroops[0].dragon.type]
				report = ReportUtils.createStrikeCityFightWithHelpDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragon)
				LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
				LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, report.reportForDefencePlayer)
				var helpDefenceTitle = Localizations.Alliance.HelpDefenceStrikeTitle
				var helpDefenceContent = Localizations.Alliance.HelpDefenceStrikeContent
				var helpDefenceParams = [helpDefencePlayerDoc.basicInfo.name, defenceAllianceDoc.basicInfo.tag]
				LogicUtils.sendSystemMail(defencePlayerDoc, defencePlayerData, helpDefenceTitle, helpDefenceParams, helpDefenceContent, helpDefenceParams)

				attackDragon.hp -= report.reportForAttackPlayer.strikeCity.attackPlayerData.dragon.hpDecreased
				if(attackDragon.hp <= 0){
					deathEvent = DataUtils.createPlayerDragonDeathEvent(attackPlayerDoc, attackDragon)
					attackPlayerDoc.dragonDeathEvents.push(deathEvent)
					attackPlayerData.__dragonDeathEvents = [{
						type:Consts.DataChangedType.Add,
						data:deathEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
				}
				attackPlayerData.dragons = {}
				attackPlayerData.dragons[attackDragon.type] = attackDragon

				TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.StrikeEnemyPlayersCity)
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
					attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
					defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
					if(_.isEqual(report.powerCompare >= 1)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						attackPlayerDoc.basicInfo.strikeWin += 1
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
					attackAllianceData.allianceFight = {}
					attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
					defenceAllianceData.allianceFight = {}
					defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
				}else{
					attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
					if(_.isEqual(report.powerCompare >= 1)){
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						attackPlayerDoc.basicInfo.strikeWin += 1
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
					}
					attackAllianceData.allianceFight = {}
					attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
					defenceAllianceData.allianceFight = {}
					defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData
				}

				strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
				attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
				attackAllianceData.__strikeMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:strikeMarchReturnEvent
				}]
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
				LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)

				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
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
					TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.StrikeEnemyPlayersCity)
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
						attackPlayerDoc.basicInfo.strikeWin += 1
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
					}else{
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
						attackPlayerDoc.basicInfo.strikeWin += 1
						TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData
					}

					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
					attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.__strikeMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:strikeMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
					LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)

					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
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
						attackPlayerData.__dragonDeathEvents = [{
							type:Consts.DataChangedType.Add,
							data:deathEvent
						}]
						eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
					}
					attackPlayerData.dragons = {}
					attackPlayerData.dragons[attackDragon.type] = attackDragon
					TaskUtils.finishPlayerDailyTaskIfNeeded(attackPlayerDoc, attackPlayerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.StrikeEnemyPlayersCity)
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						if(_.isEqual(report.powerCompare >= 1)){
							attackAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
							defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeSuccessCount += 1
							attackPlayerDoc.basicInfo.strikeWin += 1
							TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						}
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
					}else{
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						if(_.isEqual(report.powerCompare >= 1)){
							attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
							defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeSuccessCount += 1
							attackPlayerDoc.basicInfo.strikeWin += 1
							TaskUtils.finishStrikeWinTaskIfNeed(attackPlayerDoc, attackPlayerData)
						}
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData
					}

					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc)
					attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.__strikeMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:strikeMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
					LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)

					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
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
				funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(defencePlayerDoc._id))
			}
			if(_.isObject(helpDefencePlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(helpDefencePlayerDoc._id))
			}
			if(_.isObject(defenceAllianceDoc)){
				funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
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

		funcs = []
		funcs.push(self.playerDao.findByIdAsync(event.attackPlayerData.id, true))
		if(_.isObject(attackAllianceDoc.allianceFight)){
			var defenceAllianceId = _.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId) ? attackAllianceDoc.allianceFight.defenceAllianceId : attackAllianceDoc.allianceFight.attackAllianceId
			funcs.push(self.allianceDao.findByIdAsync(defenceAllianceId, true))
		}
		Promise.all(funcs).spread(function(doc_1, doc_2){
			if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc_1
			if(_.isObject(attackAllianceDoc.allianceFight)){
				if(!_.isObject(doc_2)) return Promise.reject(new Error("联盟不存在"))
				defenceAllianceDoc = doc_2
				targetAllianceDoc = _.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id) ? attackAllianceDoc : defenceAllianceDoc
			}else{
				targetAllianceDoc = attackAllianceDoc
			}

			villageEvent = _.find(attackAllianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
			})
			if(!_.isObject(villageEvent) && _.isObject(defenceAllianceDoc)){
				villageEvent = _.find(defenceAllianceDoc.villageEvents, function(villageEvent){
					return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
				})
			}
			if(_.isObject(villageEvent)){
				return self.playerDao.findByIdAsync(villageEvent.playerData.id, true)
			}
			return Promise.resolve()
		}).then(function(doc){
			if(_.isObject(villageEvent)){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				defencePlayerDoc = doc
			}
			village = LogicUtils.getAllianceVillageById(targetAllianceDoc, event.defenceVillageData.id)
			if(!_.isObject(village)){
				var deletedVillage = {
					id:event.defenceVillageData.id,
					type:event.defenceVillageData.type,
					level:event.defenceVillageData.level,
					location:event.defenceVillageData.location
				}
				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, targetAllianceDoc, deletedVillage)
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__strikeMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(!_.isObject(villageEvent)){
				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, targetAllianceDoc, village)
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__strikeMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
			if(_.isObject(villageEvent) && _.isEqual(villageEvent.playerData.alliance.id, attackAllianceDoc._id)){
				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, targetAllianceDoc, village)
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__strikeMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, defencePlayerDoc._id])
				if(_.isObject(defenceAllianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
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
					attackPlayerData.__dragonDeathEvents = [{
						type:Consts.DataChangedType.Add,
						data:deathEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, attackPlayerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
				}
				attackPlayerData.dragons = {}
				attackPlayerData.dragons[attackDragon.type] = attackPlayerDoc.dragons[attackDragon.type]

				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				marchReturnEvent = MarchUtils.createStrikeVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, targetAllianceDoc, village)
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				attackAllianceDoc.strikeMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__attackMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]

				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			funcs = []
			if(_.isObject(attackPlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
			}
			if(_.isObject(defencePlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(defencePlayerDoc._id))
			}
			if(_.isObject(attackAllianceDoc)){
				funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
			}
			if(_.isObject(defenceAllianceDoc) && attackAllianceDoc != defenceAllianceDoc){
				funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
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
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.strikeMarchReturnEvents, event)
	allianceData.__strikeMarchReturnEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	var playerDoc = null
	this.playerDao.findByIdAsync(event.attackPlayerData.id, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var playerData = {}
		var dragonType = event.attackPlayerData.dragon.type
		var dragon = playerDoc.dragons[dragonType]
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		dragon.status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
		DataUtils.refreshPlayerResources(playerDoc)
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = playerDoc[reward.type]
		})
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
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
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.shrineEvents, event)
	allianceData.__shrineEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	var playerDocs = {}
	var playerTroopsForFight = []
	var funcs = []
	var findPlayerDoc = function(playerId){
		return self.playerDao.findByIdAsync(playerId, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
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
			var dragonForFight = DataUtils.createPlayerDragonForFight(playerDoc, playerDoc.dragons[playerTroop.dragon.type], allianceDoc.basicInfo.terrain)
			var soldiersForFight = DataUtils.createPlayerSoldiersForFight(playerDoc, playerTroop.soldiers, playerDoc.dragons[playerTroop.dragon.type], allianceDoc.basicInfo.terrain)
			var playerTroopForFight = {
				id:playerTroop.id,
				name:playerTroop.name,
				dragonForFight:dragonForFight,
				soldiersForFight:soldiersForFight,
				woundedSoldierPercent:DataUtils.getPlayerTreatSoldierPercent(playerDocs[playerTroop.id], playerDoc.dragons[playerTroop.dragon.type]),
				soldierMoraleDecreasedPercent:DataUtils.getPlayerSoldierMoraleDecreasedPercent(playerDocs[playerTroop.id], playerDoc.dragons[playerTroop.dragon.type]),
				soldierToEnemyMoraleDecreasedAddPercent:DataUtils.getEnemySoldierMoraleAddedPercent(playerDocs[playerTroop.id], playerDoc.dragons[playerTroop.dragon.type])
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

		var params = DataUtils.getAllianceShrineStageResultDatas(event.stageName, playerTroopsForFight.length > 0, fightDatas)
		var playerDatas = LogicUtils.fixAllianceShrineStagePlayerData(event.playerTroops, params.playerDatas)
		var fightStar = params.fightStar
		var shrineReport = {
			id:ShortId.generate(),
			stageName:event.stageName,
			star:fightStar,
			playerCount:event.playerTroops.length,
			playerAvgPower:playerAvgPower,
			playerDatas:playerDatas,
			fightDatas:fightDatas
		}
		allianceData.__shrineReports = []
		if(allianceDoc.shrineReports.length > Define.AllianceShrineReportsMaxSize){
			var willRemovedshrineReport = allianceDoc.shrineReports.shift()
			allianceData.__shrineReports.push({
				type:Consts.DataChangedType.Remove,
				data:willRemovedshrineReport
			})
		}
		allianceDoc.shrineReports.push(shrineReport)
		allianceData.__shrineReports.push({
			type:Consts.DataChangedType.Add,
			data:shrineReport
		})
		if(fightStar > 0){
			var honour = DataUtils.getAllianceShrineStageFightHoner(event.stageName, fightStar)
			allianceDoc.basicInfo.honour += honour
			allianceData.basicInfo = allianceDoc.basicInfo
		}

		var stageData = LogicUtils.getAllianceShrineStageData(allianceDoc, event.stageName)
		if(!_.isObject(stageData)){
			stageData = {
				stageName:event.stageName,
				maxStar:fightStar
			}
			allianceDoc.shrineDatas.push(stageData)
			allianceData.__shrineDatas = [{
				type:Consts.DataChangedType.Add,
				data:stageData
			}]
		}else if(stageData.maxStar < fightStar){
			stageData.maxStar = fightStar
			allianceData.__shrineDatas = [{
				type:Consts.DataChangedType.Edit,
				data:stageData
			}]
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
			var playerData = {}

			playerDoc.basicInfo.kill += kill
			TaskUtils.finishPlayerKillTaskIfNeed(playerDoc, playerData)
			playerData.basicInfo = playerDoc.basicInfo
			dragon.hp -= dragonHpDecreased
			if(dragon.hp <= 0){
				var deathEvent = DataUtils.createPlayerDragonDeathEvent(playerDoc, dragon)
				playerDoc.dragonDeathEvents.push(deathEvent)
				playerData.__dragonDeathEvents = [{
					type:Consts.DataChangedType.Add,
					data:deathEvent
				}]
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
			}
			var playerItemBuff = DataUtils.isPlayerHasItemEvent(playerDoc, "dragonExpBonus") ? 0.3 : 0
			DataUtils.addPlayerDragonExp(playerDoc, playerData, dragon, dragonExpAdd * (1 + playerItemBuff))

			playerData.dragons = {}
			playerData.dragons[dragon.type] = playerDoc.dragons[dragon.type]

			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.JoinAllianceShrineEvent)

			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

			var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(allianceDoc, playerDoc, dragon, leftSoldiers, woundedSoldiers, rewards)
			allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
			allianceData.__attackMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		})
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		_.each(_.values(playerDocs), function(playerDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
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
	var attackAllianceData = {}
	var defenceAllianceDoc = null
	var defenceAllianceData = null
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	LogicUtils.removeItemInArray(allianceDoc.villageEvents, event)
	attackAllianceData.__villageEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	var funcs = []
	funcs.push(self.playerDao.findByIdAsync(event.playerData.id, true))
	if(!_.isEqual(event.playerData.alliance.id, event.villageData.alliance.id)){
		funcs.push(self.allianceDao.findByIdAsync(event.villageData.alliance.id, true))
	}
	Promise.all(funcs).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc_1
		if(!_.isEqual(event.playerData.alliance.id, event.villageData.alliance.id)){
			if(!_.isObject(doc_2)) return Promise.reject(new Error("联盟不存在"))
			defenceAllianceDoc = doc_2
			defenceAllianceData = {}
		}else{
			defenceAllianceDoc = attackAllianceDoc
			defenceAllianceData = attackAllianceData
		}

		var village = LogicUtils.getAllianceVillageById(defenceAllianceDoc, event.villageData.id)
		var resourceName = village.type.slice(0, -7)
		var newRewards = [{
			type:"resources",
			name:resourceName,
			count:event.villageData.collectTotal
		}]
		LogicUtils.mergeRewards(event.playerData.rewards, newRewards)

		var marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.playerData.dragon, event.playerData.soldiers, event.playerData.woundedSoldiers, defenceAllianceDoc, village, event.playerData.rewards)
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.__attackMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:marchReturnEvent
		}]

		var collectExp = DataUtils.getCollectResourceExpAdd(resourceName, newRewards[0].count)
		attackPlayerDoc.allianceInfo[resourceName + "Exp"] += collectExp
		attackPlayerData.allianceInfo = attackPlayerDoc.allianceInfo
		var collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, newRewards)
		LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, collectReport)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])

		if(event.villageData.collectTotal >= village.resource){
			LogicUtils.removeItemInArray(defenceAllianceDoc.villages, village)
			defenceAllianceData.__villages = [{
				type:Consts.DataChangedType.Remove,
				data:village
			}]
			var villageInMap = LogicUtils.removeAllianceMapObjectByLocation(defenceAllianceDoc, village.location)
			defenceAllianceData.__mapObjects = [{
				type:Consts.DataChangedType.Remove,
				data:villageInMap
			}]
		}else{
			village.resource -= event.villageData.collectTotal
			defenceAllianceData.__villages = [{
				type:Consts.DataChangedType.Edit,
				data:village
			}]
		}

		if(attackAllianceDoc != defenceAllianceDoc){
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)
			LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceDoc, defenceAllianceData)
		}else{
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
		}
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
		}
		if(attackPlayerDoc != defenceAllianceDoc && _.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
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
pro.onAllianceFightPrepare = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var self = this
	var attackAllianceData = {}
	var defenceAllianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	var now = Date.now()
	var statusFinishTime = now + DataUtils.getAllianceFightTotalFightTime()
	attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
	attackAllianceDoc.basicInfo.statusStartTime = now
	attackAllianceDoc.basicInfo.statusFinishTime = statusFinishTime
	attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
	defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
	defenceAllianceDoc.basicInfo.statusStartTime = now
	defenceAllianceDoc.basicInfo.statusFinishTime = statusFinishTime
	defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo

	eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, statusFinishTime])
	updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
	updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
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
pro.onAllianceFightFighting = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var self = this
	var attackAllianceData = {}
	var defenceAllianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var now = Date.now()
	var playerIds = {}
	var playerDocs = []
	var funcs = []

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
		LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, villageEvent)
		if(!_.isArray(attackAllianceData.__villageEvents)) attackAllianceData.__villageEvents = []
		attackAllianceData.__villageEvents.push({
			type:Consts.DataChangedType.Remove,
			data:villageEvent
		})

		var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
		var village = LogicUtils.getAllianceVillageById(defenceAllianceDoc, villageEvent.villageData.id)
		var originalRewards = villageEvent.playerData.rewards
		var resourceName = village.type.slice(0, -7)
		var newRewards = [{
			type:"resources",
			name:resourceName,
			count:resourceCollected
		}]
		LogicUtils.mergeRewards(originalRewards, newRewards)
		DataUtils.refreshPlayerResources(attackPlayerDoc)
		_.each(originalRewards, function(reward){
			attackPlayerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(attackPlayerData[reward.type])) attackPlayerData[reward.type] = attackPlayerDoc[reward.type]
		})
		DataUtils.refreshPlayerResources(attackPlayerDoc)
		attackPlayerData.basicInfo = attackPlayerDoc.basicInfo
		attackPlayerData.resources = attackPlayerDoc.resources

		var collectExp = DataUtils.getCollectResourceExpAdd(resourceName, newRewards[0].count)
		attackPlayerDoc.allianceInfo[resourceName + "Exp"] += collectExp
		attackPlayerData.allianceInfo = attackPlayerDoc.allianceInfo
		var collectReport = ReportUtils.createCollectVillageReport(defenceAllianceDoc, village, newRewards)
		LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, collectReport)

		if(!_.isObject(attackPlayerData.dragons)) attackPlayerData.dragons = {}
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackPlayerDoc.dragons[villageEvent.playerData.dragon.type])
		attackPlayerDoc.dragons[villageEvent.playerData.dragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.dragons[villageEvent.playerData.dragon.type] = attackPlayerDoc.dragons[villageEvent.playerData.dragon.type]

		LogicUtils.addPlayerSoldiers(attackPlayerDoc, attackPlayerData, villageEvent.playerData.soldiers)
		DataUtils.addPlayerWoundedSoldiers(attackPlayerDoc, attackPlayerData, villageEvent.playerData.woundedSoldiers)
		village.resource -= resourceCollected
		if(!_.isArray(defenceAllianceData.__villages)) defenceAllianceData.__villages = []
		defenceAllianceData.__villages.push({
			type:Consts.DataChangedType.Edit,
			data:village
		})
	}
	var resolveAttackMarchEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchEvent){
		LogicUtils.removeItemInArray(attackAllianceDoc.attackMarchEvents, marchEvent)
		if(!_.isArray(attackAllianceData.__attackMarchEvents)) attackAllianceData.__attackMarchEvents = []
		attackAllianceData.__attackMarchEvents.push({
			type:Consts.DataChangedType.Remove,
			data:marchEvent
		})

		if(!_.isObject(attackPlayerData.dragons)) attackPlayerData.dragons = {}
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
		attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.dragons[marchEvent.attackPlayerData.dragon.type] = attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type]

		if(!_.isObject(attackPlayerData.soldiers)) attackPlayerData.soldiers = {}
		_.each(marchEvent.attackPlayerData.soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] += soldier.count
			attackPlayerData.soldiers[soldier.name] = attackPlayerDoc.soldiers[soldier.name]
		})
	}
	var resolveAttackMarchReturnEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchReturnEvent){
		LogicUtils.removeItemInArray(attackAllianceDoc.attackMarchReturnEvents, marchReturnEvent)
		if(!_.isArray(attackAllianceData.__attackMarchReturnEvents)) attackAllianceData.__attackMarchReturnEvents = []
		attackAllianceData.__attackMarchReturnEvents.push({
			type:Consts.DataChangedType.Remove,
			data:marchReturnEvent
		})

		if(!_.isObject(attackPlayerData.dragons)) attackPlayerData.dragons = {}
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type])
		attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.dragons[marchReturnEvent.attackPlayerData.dragon.type] = attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type]

		LogicUtils.addPlayerSoldiers(attackPlayerDoc, attackPlayerData, marchReturnEvent.attackPlayerData.soldiers)
		DataUtils.addPlayerWoundedSoldiers(attackPlayerDoc, attackPlayerData, marchReturnEvent.attackPlayerData.woundedSoldiers)

		DataUtils.refreshPlayerResources(attackPlayerDoc)
		_.each(marchReturnEvent.attackPlayerData.rewards, function(reward){
			attackPlayerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(attackPlayerData[reward.type])) attackPlayerData[reward.type] = attackPlayerDoc[reward.type]
		})
		DataUtils.refreshPlayerResources(attackPlayerDoc)
		attackPlayerData.basicInfo = attackPlayerDoc.basicInfo
		attackPlayerData.resources = attackPlayerDoc.resources
	}
	var resolveStrikeMarchEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchEvent){
		LogicUtils.removeItemInArray(attackAllianceDoc.strikeMarchEvents, marchEvent)
		if(!_.isArray(attackAllianceData.__strikeMarchEvents)) attackAllianceData.__strikeMarchEvents = []
		attackAllianceData.__strikeMarchEvents.push({
			type:Consts.DataChangedType.Remove,
			data:marchEvent
		})

		if(!_.isObject(attackPlayerData.dragons)) attackPlayerData.dragons = {}
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
		attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.dragons[marchEvent.attackPlayerData.dragon.type] = attackPlayerDoc.dragons[marchEvent.attackPlayerData.dragon.type]
	}
	var resolveStrikeMarchReturnEvent = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, marchReturnEvent){
		LogicUtils.removeItemInArray(attackAllianceDoc.strikeMarchReturnEvents, marchReturnEvent)
		if(!_.isArray(attackAllianceData.__strikeMarchReturnEvents)) attackAllianceData.__strikeMarchReturnEvents = []
		attackAllianceData.__strikeMarchReturnEvents.push({
			type:Consts.DataChangedType.Remove,
			data:marchReturnEvent
		})
		if(!_.isObject(attackPlayerData.dragons)) attackPlayerData.dragons = {}
		DataUtils.refreshPlayerDragonsHp(attackPlayerDoc, attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type])
		attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
		attackPlayerData.dragons[marchReturnEvent.attackPlayerData.dragon.type] = attackPlayerDoc.dragons[marchReturnEvent.attackPlayerData.dragon.type]

		DataUtils.refreshPlayerResources(attackPlayerDoc)
		_.each(marchReturnEvent.attackPlayerData.rewards, function(reward){
			attackPlayerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(attackPlayerData[reward.type])) attackPlayerData[reward.type] = attackPlayerDoc[reward.type]
		})
		DataUtils.refreshPlayerResources(attackPlayerDoc)
		attackPlayerData.basicInfo = attackPlayerDoc.basicInfo
		attackPlayerData.resources = attackPlayerDoc.resources
	}

	pushPlayerIds(attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData, playerIds)
	pushPlayerIds(defenceAllianceDoc, defenceAllianceData, attackAllianceDoc, attackAllianceData, playerIds)

	_.each(_.keys(playerIds), function(playerId){
		funcs.push(self.playerDao.findByIdAsync(playerId, true))
	})
	Promise.all(funcs).then(function(docs){
		for(var i = 0; i < docs.length; i++){
			var doc = docs[i]
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			playerDocs.push(doc)
		}
		_.each(playerDocs, function(playerDoc){
			var playerData = {}
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
				}else{
					throw new Error("未知的事件类型")
				}
				eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, event.attackAllianceDoc, event.eventData.id])
			})
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		})
		return Promise.resolve()
	}).then(function(){
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
		attackAllianceData.countInfo = attackAllianceDoc.countInfo
		defenceAllianceData.countInfo = defenceAllianceDoc.countInfo

		attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Protect
		attackAllianceDoc.basicInfo.statusStartTime = now
		var attackAllianceProtectTime = DataUtils.getAllianceProtectTimeAfterAllianceFight(attackAllianceDoc)
		attackAllianceDoc.basicInfo.statusFinishTime = now + attackAllianceProtectTime
		attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
		attackAllianceDoc.allianceFight = null
		attackAllianceData.allianceFight = {}
		attackAllianceData.enemyAllianceDoc = {}
		attackAllianceData.__members = []
		_.each(attackAllianceDoc.members, function(member){
			if(member.isProtected){
				member.isProtected = false
				attackAllianceData.__members.push({
					type:Consts.DataChangedType.Edit,
					data:member
				})
			}
		})
		if(_.isEmpty(attackAllianceData.__members)) delete attackAllianceData.__members

		defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Protect
		defenceAllianceDoc.basicInfo.statusStartTime = now
		var defenceAllianceProtectTime = DataUtils.getAllianceProtectTimeAfterAllianceFight(defenceAllianceDoc)
		defenceAllianceDoc.basicInfo.statusFinishTime = now + defenceAllianceProtectTime
		defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo
		defenceAllianceDoc.allianceFight = null
		defenceAllianceData.enemyAllianceDoc = {}
		defenceAllianceData.allianceFight = {}
		defenceAllianceData.__members = []
		_.each(defenceAllianceDoc.members, function(member){
			if(member.isProtected){
				member.isProtected = false
				defenceAllianceData.__members.push({
					type:Consts.DataChangedType.Edit,
					data:member
				})
			}
		})
		if(_.isEmpty(defenceAllianceData.__members)) delete defenceAllianceData.__members

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, attackAllianceDoc.basicInfo.statusFinishTime])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, defenceAllianceDoc.basicInfo.statusFinishTime])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])

		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		_.each(playerDocs, function(playerDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
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