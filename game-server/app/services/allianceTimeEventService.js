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
var MarchUtils = require("../utils/marchUtils")
var FightUtils = require("../utils/fightUtils")
var ReportUtils = require("../utils/reportUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

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
			allianceDoc.allianceFight = null
			var allianceData = {}
			allianceData.basicInfo = allianceDoc.basicInfo
			allianceData.allianceFight = {}
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
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var funcs = []
	var marchReturnEvent = null

	LogicUtils.removeItemInArray(attackAllianceDoc.attackMarchEvents, event)
	attackAllianceData.__attackMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	if(_.isEqual(event.marchType, Consts.AllianceMarchType.Shrine)){
		var shrineEvent = LogicUtils.getEventById(attackAllianceDoc.shrineEvents, event.defenceShrineData.shrineEventId)
		if(!_.isObject(shrineEvent)){
			this.playerDao.findByIdAsync(event.attackPlayerData.id, true).then(function(doc){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				attackPlayerDoc = doc
				var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, 0, event.attackPlayerData.soldiers, [], [], 0)
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
	if(_.isEqual(event.marchType, Consts.AllianceMarchType.HelpDefence)){
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
					cityName:defencePlayerDoc.basicInfo.cityName
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
					type:event.attackPlayerData.dragon.type,
					expAdd:0
				},
				soldiers:event.attackPlayerData.soldiers,
				woundedSoldiers:[],
				rewards:[],
				kill:0
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
	if(_.isEqual(event.marchType, Consts.AllianceMarchType.City)){
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
		var mergeSoldiers = function(soldiers, soldiersNewlyAdd){
			_.each(soldiersNewlyAdd, function(soldierNewlyAdd){
				var soldier = _.find(soldiers, function(soldier){
					return _.isEqual(soldier.name, soldierNewlyAdd.name)
				})
				if(!_.isObject(soldier)){
					soldier = {
						name:soldierNewlyAdd.name,
						count:0
					}
					soldiers.push(soldier)
				}
				soldier.count += soldierNewlyAdd.count
			})
			return soldiers
		}
		var updateWallForFight = function(wallForFight, wallAfterFight){
			wallForFight.currentHp = wallAfterFight.currentHp
		}
		var createNewDragonForFight = function(dragonForFight){
			var newDragonForFight = CommonUtils.clone(dragonForFight)
			newDragonForFight.totalHp = dragonForFight.currentHp
			return newDragonForFight
		}
		var createNewSoldiersForFight = function(soldiersForFight){
			var newSoldiersForFight = []
			_.each(soldiersForFight, function(soldierForFight){
				if(soldierForFight.currentCount >= 0){
					var newSoldierForFight = CommonUtils.clone(soldierForFight)
					newSoldierForFight.totalCount = soldierForFight.currentCount
					newSoldierForFight.woundedCount = 0
					newSoldierForFight.morale = 100
					newSoldierForFight.round = 0
					newSoldierForFight.killedSoldiers = []
					newSoldiersForFight.push(newSoldierForFight)
				}
			})
			return newSoldiersForFight
		}
		var updatePlayerKillData = function(playerKillDatas, playerId, playerName, newlyKill){
			var isNew = false
			var playerKillData = _.find(playerKillDatas, function(playerKillData){
				return _.isEqual(playerKillData.id, playerId)
			})
			if(!_.isObject(playerKillData)){
				playerKillData = {
					id:playerId,
					name:playerName,
					kill:0
				}
				playerKillDatas.push(playerKillData)
				isNew = true
			}
			playerKillData.kill += newlyKill

			return {data:playerKillData, isNew:isNew}
		}

		var attackDragon = null
		var attackDragonForFight = null
		var attackSoldiersForFight = null
		var attackTreatSoldierPercent = null
		var helpDefenceDragon = null
		var helpDefenceDragonForFight = null
		var helpDefenceSoldiersForFight = null
		var helpDefenceTreatSoldierPercent = null
		var helpDefenceDragonFightFixEffect = null
		var defenceDragon = null
		var defenceDragonForFight = null
		var defenceSoldiersForFight = null
		var defenceTreatSoldierPercent = null
		var defenceDragonFightFixEffect = null
		var defenceWallForFight = null
		var helpDefenceDragonFightData = null
		var helpDefenceSoldierFightData = null
		var defenceDragonFightData = null
		var defenceSoldierFightData = null
		var defenceWallFightData = null
		var attackCityReport = null
		var continueFight = true
		var helpedByTroop = null

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
			LogicUtils.refreshPlayerResources(defencePlayerDoc)
			defencePlayerData.resources = defencePlayerDoc.resources
			defencePlayerData.basicInfo = defencePlayerDoc.basicInfo
			return Promise.resolve()
		}).then(function(doc){
			if(defencePlayerDoc.helpedByTroops.length > 0){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				helpDefencePlayerDoc = doc
			}

			attackDragon = attackPlayerDoc.dragons[event.attackPlayerData.dragon.type]
			attackDragonForFight = DataUtils.createPlayerDragonForFight(attackPlayerDoc, attackDragon)
			attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers)
			attackTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToWoundedSoldierPercent(attackPlayerDoc)
			if(_.isObject(helpDefencePlayerDoc)){
				helpedByTroop = defencePlayerDoc.helpedByTroops[0]
				helpDefenceDragon = helpDefencePlayerDoc.dragons[helpedByTroop.dragon.type]
				helpDefenceDragonForFight = DataUtils.createPlayerDragonForFight(helpDefencePlayerDoc, helpDefenceDragon)
				helpDefenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(helpDefencePlayerDoc, helpedByTroop.soldiers)
				helpDefenceTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToWoundedSoldierPercent(helpDefencePlayerDoc)
				helpDefenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, helpDefenceSoldiersForFight)
			}
			defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
			var defenceSoldiers = DataUtils.getPlayerDefenceSoldiers(defencePlayerDoc)
			if(_.isObject(defenceDragon) && defenceSoldiers.length > 0){
				defenceDragonForFight = DataUtils.createPlayerDragonForFight(defencePlayerDoc, defenceDragon)
				defenceSoldiersForFight = DataUtils.createPlayerSoldiersForFight(defencePlayerDoc, defenceSoldiers)
				defenceTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToWoundedSoldierPercent(defencePlayerDoc)
				defenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, defenceSoldiersForFight)
			}
			if(defencePlayerDoc.resources.wallHp > 0){
				defenceWallForFight = DataUtils.createPlayerWallForFight(defencePlayerDoc)
			}
			return Promise.resolve()
		}).then(function(){
			if(_.isObject(helpDefencePlayerDoc)){
				helpDefenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, helpDefenceDragonForFight, helpDefenceDragonFightFixEffect)
				helpDefenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent, helpDefenceSoldiersForFight, helpDefenceTreatSoldierPercent)
				updateDragonForFight(attackDragonForFight, helpDefenceDragonFightData.attackDragonAfterFight)
				updateSoldiersForFight(attackSoldiersForFight, helpDefenceSoldierFightData.attackSoldiersAfterFight)
				updateDragonForFight(helpDefenceDragonForFight, helpDefenceDragonFightData.defenceDragonAfterFight)
				updateSoldiersForFight(helpDefenceSoldiersForFight, helpDefenceSoldierFightData.defenceSoldiersAfterFight)
				continueFight = _.isEqual(helpDefenceSoldierFightData.fightResult, Consts.FightResult.AttackWin) ? true : false
			}
			return Promise.resolve()
		}).then(function(){
			if(continueFight && _.isObject(defenceDragonForFight)){
				var attackDragonForFight_1 = _.isObject(helpDefenceSoldiersForFight) ? createNewDragonForFight(attackDragonForFight) : attackDragonForFight
				var attackSoldiersForFight_1 = _.isObject(helpDefenceSoldiersForFight) ? createNewSoldiersForFight(attackSoldiersForFight) : attackSoldiersForFight
				defenceDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight_1, defenceDragonForFight, defenceDragonFightFixEffect)
				defenceSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight_1, attackTreatSoldierPercent, defenceSoldiersForFight, defenceTreatSoldierPercent)
				updateDragonForFight(attackDragonForFight, defenceDragonFightData.attackDragonAfterFight)
				updateSoldiersForFight(attackSoldiersForFight, defenceSoldierFightData.attackSoldiersAfterFight)
				updateDragonForFight(defenceDragonForFight, defenceDragonFightData.defenceDragonAfterFight)
				updateSoldiersForFight(defenceSoldiersForFight, defenceSoldierFightData.defenceSoldiersAfterFight)
				continueFight = _.isEqual(defenceSoldierFightData.fightResult, Consts.FightResult.AttackWin) ? true : false
			}
			return Promise.resolve()
		}).then(function(){
			if(continueFight && _.isObject(defenceWallForFight)){
				var attackSoldiersForFight_2 = _.isObject(helpDefenceSoldiersForFight) || _.isObject(defenceSoldiersForFight) ? createNewSoldiersForFight(attackSoldiersForFight) : attackSoldiersForFight
				defenceWallFightData = FightUtils.soldierToWallFight(attackSoldiersForFight_2, attackTreatSoldierPercent, defenceWallForFight)
				updateSoldiersForFight(attackSoldiersForFight, defenceWallFightData.attackSoldiersAfterFight)
				updateWallForFight(defenceWallForFight, defenceWallFightData.defenceWallAfterFight)
			}
		}).then(function(){
			attackPlayerDoc.dragons[attackDragon.type].hp -= attackDragonForFight.totalHp - attackDragonForFight.currentHp
			attackPlayerData.dragons = {}
			attackPlayerData.dragons[attackDragon.type] = attackPlayerDoc.dragons[attackDragon.type]
			defencePlayerData.resources = defencePlayerDoc.resources
			if(_.isObject(helpDefenceSoldierFightData)){
				helpDefencePlayerDoc.dragons[helpDefenceDragon.type].hp -= helpDefenceDragonForFight.totalHp - helpDefenceDragonForFight.currentHp
				helpDefencePlayerData.dragons = {}
				helpDefencePlayerData.dragons[helpDefenceDragon.type] = helpDefencePlayerDoc.dragons[helpDefenceDragon.type]
			}
			if(_.isObject(defenceDragonFightData)){
				defencePlayerDoc.dragons[defenceDragon.type].hp -= defenceDragonForFight.totalHp - defenceDragonForFight.currentHp
				defencePlayerData.dragons = {}
				defencePlayerData.dragons[defenceDragon.type] = defencePlayerDoc.dragons[defenceDragon.type]
			}
			if(_.isObject(defenceWallFightData)){
				defencePlayerDoc.resources.wallHp -= defenceWallForFight.totalHp - defenceWallForFight.currentHp
			}

			var theAttackPlayerData = {
				playerDoc:attackPlayerDoc,
				dragon:attackDragonForFight,
				soldiers:attackSoldiersForFight
			}
			var theHelpDefencePlayerData = {
				playerDoc:helpDefencePlayerDoc,
				dragon:helpDefenceDragonForFight,
				soldiers:helpDefenceSoldiersForFight
			}
			var theDefencePlayerData = {
				playerDoc:defencePlayerDoc,
				dragon:defenceDragonForFight,
				soldiers:defenceSoldiersForFight,
				wall:defenceWallForFight
			}
			var fightData = {
				helpDefenceDragonFightData:helpDefenceDragonFightData,
				helpDefenceSoldierFightData:helpDefenceSoldierFightData,
				defenceDragonFightData:defenceDragonFightData,
				defenceSoldierFightData:defenceSoldierFightData,
				defenceWallFightData:defenceWallFightData
			}
			var report = ReportUtils.createAttackCityReport(attackAllianceDoc, theAttackPlayerData, defenceAllianceDoc, theHelpDefencePlayerData, theDefencePlayerData, fightData)
			attackCityReport = report.report.attackCity
			var countData = report.countData
			//console.log(NodeUtils.inspect(report, false, null))

			if(_.isObject(attackCityReport.defencePlayerData)){
				_.each(attackCityReport.defencePlayerData.rewards, function(reward){
					defencePlayerDoc[reward.type][reward.name] += reward.count
					if(!_.isObject(defencePlayerData[reward.type])) defencePlayerData[reward.type] = defencePlayerDoc[reward.type]
				})
			}
			if(_.isObject(defenceDragonFightData)){
				defenceDragon.exp += countData.defenceDragonExpAdd
				DataUtils.updatePlayerDragonProperty(defencePlayerDoc, defenceDragon)
				defencePlayerDoc.basicInfo.kill += countData.defencePlayerKill
			}

			attackAllianceData.allianceFight = {}
			defenceAllianceData.allianceFight = {}
			var playerKillData = null
			if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
				if(attackCityReport.attackStar >= 2){
					attackAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
					attackAllianceDoc.allianceFight.defenceAllianceCountData.defenceFailCount += 1
					defenceAllianceDoc.allianceFight.attackAllianceCountData.attackSuccessCount += 1
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.defenceFailCount += 1
					if(attackCityReport.attackStar >= 3){
						attackAllianceDoc.allianceFight.attackAllianceCountData.routCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.routCount += 1
					}
				}else{
					attackAllianceDoc.allianceFight.attackAllianceCountData.attackFailCount += 1
					attackAllianceDoc.allianceFight.defenceAllianceCountData.defenceSuccessCount += 1
					defenceAllianceDoc.allianceFight.attackAllianceCountData.attackFailCount += 1
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.defenceSuccessCount += 1
				}
				attackAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.attackPlayerKill
				playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.attackPlayerKills, attackPlayerDoc._id, attackPlayerDoc.basicInfo.name, countData.attackPlayerKill)
				defenceAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.attackPlayerKill
				updatePlayerKillData(defenceAllianceDoc.allianceFight.attackPlayerKills, attackPlayerDoc._id, attackPlayerDoc.basicInfo.name, countData.attackPlayerKill)
				attackAllianceData.allianceFight.__attackPlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]
				defenceAllianceData.allianceFight.__attackPlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]

				if(_.isObject(helpDefenceSoldierFightData)){
					attackAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.helpDefencePlayerKill
					playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.defencePlayerKills, helpDefencePlayerDoc._id, helpDefencePlayerDoc.basicInfo.name, countData.helpDefencePlayerKill)
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.helpDefencePlayerKill
					updatePlayerKillData(defenceAllianceDoc.allianceFight.defencePlayerKills, helpDefencePlayerDoc._id, helpDefencePlayerDoc.basicInfo.name, countData.helpDefencePlayerKill)
					if(!_.isObject(attackAllianceData.allianceFight.__defencePlayerKills)){
						attackAllianceData.allianceFight.__defencePlayerKills = []
						defenceAllianceData.allianceFight.__defencePlayerKills = []
					}
					attackAllianceData.allianceFight.__defencePlayerKills.push({
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					})
					defenceAllianceData.allianceFight.__defencePlayerKills.push({
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					})
				}
				if(_.isObject(defenceSoldierFightData) || _.isObject(defenceWallFightData)){
					attackAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.defencePlayerKill
					playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.defencePlayerKills, defencePlayerDoc._id, defencePlayerDoc.basicInfo.name, countData.defencePlayerKill)
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.defencePlayerKill
					updatePlayerKillData(defenceAllianceDoc.allianceFight.defencePlayerKills, defencePlayerDoc._id, defencePlayerDoc.basicInfo.name, countData.defencePlayerKill)
					if(!_.isObject(attackAllianceData.allianceFight.__defencePlayerKills)){
						attackAllianceData.allianceFight.__defencePlayerKills = []
						defenceAllianceData.allianceFight.__defencePlayerKills = []
					}
					attackAllianceData.allianceFight.__defencePlayerKills.push({
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					})
					defenceAllianceData.allianceFight.__defencePlayerKills.push({
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					})
				}
			}else{
				if(attackCityReport.attackStar >= 2){
					attackAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
					attackAllianceDoc.allianceFight.attackAllianceCountData.defenceFailCount += 1
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackSuccessCount += 1
					defenceAllianceDoc.allianceFight.attackAllianceCountData.defenceFailCount += 1
					if(attackCityReport.attackStar >= 3){
						attackAllianceDoc.allianceFight.defenceAllianceCountData.routCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.routCount += 1
					}
				}else{
					attackAllianceDoc.allianceFight.defenceAllianceCountData.attackFailCount += 1
					attackAllianceDoc.allianceFight.attackAllianceCountData.defenceSuccessCount += 1
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.attackFailCount += 1
					defenceAllianceDoc.allianceFight.attackAllianceCountData.defenceSuccessCount += 1
				}
				attackAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.attackPlayerKill
				playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.defencePlayerKills, attackPlayerDoc._id, attackPlayerDoc.basicInfo.name, countData.attackPlayerKill)
				defenceAllianceDoc.allianceFight.defenceAllianceCountData.kill += countData.attackPlayerKill
				updatePlayerKillData(defenceAllianceDoc.allianceFight.defencePlayerKills, attackPlayerDoc._id, attackPlayerDoc.basicInfo.name, countData.attackPlayerKill)
				attackAllianceData.allianceFight.__defencePlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]
				defenceAllianceData.allianceFight.__defencePlayerKills = [{
					type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
					data:playerKillData.data
				}]

				if(_.isObject(helpDefenceSoldierFightData)){
					attackAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.helpDefencePlayerKill
					playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.attackPlayerKills, helpDefencePlayerDoc._id, helpDefencePlayerDoc.basicInfo.name, countData.helpDefencePlayerKill)
					defenceAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.helpDefencePlayerKill
					updatePlayerKillData(defenceAllianceDoc.allianceFight.attackPlayerKills, helpDefencePlayerDoc._id, helpDefencePlayerDoc.basicInfo.name, countData.helpDefencePlayerKill)
					if(!_.isObject(attackAllianceData.allianceFight.__attackPlayerKills)){
						attackAllianceData.allianceFight.__attackPlayerKills = []
						defenceAllianceData.allianceFight.__attackPlayerKills = []
					}
					attackAllianceData.allianceFight.__attackPlayerKills = [{
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					}]
					defenceAllianceData.allianceFight.__attackPlayerKills = [{
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					}]
				}
				if(_.isObject(defenceSoldierFightData) || _.isObject(defenceWallFightData)){
					attackAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.defencePlayerKill
					playerKillData = updatePlayerKillData(attackAllianceDoc.allianceFight.attackPlayerKills, defencePlayerDoc._id, defencePlayerDoc.basicInfo.name, countData.defencePlayerKill)
					defenceAllianceDoc.allianceFight.attackAllianceCountData.kill += countData.helpDefencePlayerKill
					updatePlayerKillData(defenceAllianceDoc.allianceFight.attackPlayerKills, defencePlayerDoc._id, defencePlayerDoc.basicInfo.name, countData.defencePlayerKill)
					if(!_.isObject(attackAllianceData.allianceFight.__attackPlayerKills)){
						attackAllianceData.allianceFight.__attackPlayerKills = []
						defenceAllianceData.allianceFight.__attackPlayerKills = []
					}
					attackAllianceData.allianceFight.__attackPlayerKills = [{
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					}]
					defenceAllianceData.allianceFight.__attackPlayerKills = [{
						type:playerKillData.isNew ? Consts.DataChangedType.Add : Consts.DataChangedType.Edit,
						data:playerKillData.data
					}]
				}
			}
			attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
			attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
			defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
			defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData

			LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.report)
			if(_.isObject(helpDefencePlayerDoc)){
				LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, report.report)
			}
			LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.report)

			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
			if(_.isObject(helpDefencePlayerDoc)){
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])
			}
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

			var attackCityMarchReturnEvent = MarchUtils.createAttackPlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, countData.attackDragonExpAdd, getSoldiersFromSoldiersForFight(attackSoldiersForFight), getWoundedSoldiersFromSoldiersForFight(attackSoldiersForFight), defenceAllianceDoc, defencePlayerDoc, attackCityReport.attackPlayerData.rewards, countData.attackPlayerKill)
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", attackCityMarchReturnEvent.id, attackCityMarchReturnEvent.arriveTime])
			attackAllianceDoc.attackMarchReturnEvents.push(attackCityMarchReturnEvent)
			attackAllianceData.__attackMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:attackCityMarchReturnEvent
			}]
			LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)
			if(_.isObject(helpDefencePlayerDoc)){
				helpedByTroop.dragon.expAdd += countData.helpDefenceDragonExpAdd
				helpedByTroop.soldiers = getSoldiersFromSoldiersForFight(helpDefenceSoldiersForFight)
				helpedByTroop.kill += countData.helpDefencePlayerKill
				mergeSoldiers(helpedByTroop.woundedSoldiers, getWoundedSoldiersFromSoldiersForFight(helpDefenceSoldiersForFight))
				LogicUtils.mergeRewards(helpedByTroop.rewards, attackCityReport.helpDefencePlayerData.rewards)
				if(_.isEqual(Consts.FightResult.DefenceWin, helpDefenceSoldierFightData.fightResult)){
					defencePlayerData.__helpedByTroops = [{
						type:Consts.DataChangedType.Edit,
						data:helpedByTroop
					}]
				}else{
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
					var helpDefenceMarchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(defenceAllianceDoc, helpDefencePlayerDoc, defencePlayerDoc, helpedByTroop.dragon, helpedByTroop.dragon.expAdd, helpedByTroop.soldiers, helpedByTroop.woundedSoldiers, helpedByTroop.rewards, helpedByTroop.kill)
					defenceAllianceDoc.attackMarchReturnEvents.push(helpDefenceMarchReturnEvent)
					defenceAllianceData.__attackMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:helpDefenceMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", helpDefenceMarchReturnEvent.id, helpDefenceMarchReturnEvent.arriveTime])
					LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)
				}
			}

			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
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
	if(_.isEqual(event.marchType, Consts.AllianceMarchType.Village)){
		var villageEvent = null
		funcs = []
		funcs.push(self.playerDao.findByIdAsync(event.attackPlayerData.id, true))
		if(!_.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id)){
			funcs.push(self.allianceDao.findByIdAsync(event.defenceVillageData.alliance.id, true))
		}
		Promise.all(funcs).spread(function(doc_1, doc_2){
			if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc_1
			if(!_.isEqual(event.defenceVillageData.alliance.id, attackAllianceDoc._id)){
				if(!_.isObject(doc_2)) return Promise.reject(new Error("联盟不存在"))
				defenceAllianceDoc = doc_2
			}else{
				defenceAllianceDoc = attackAllianceDoc
			}
			villageEvent = _.find(attackAllianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, event.defenceVillageData.id)
			})
			if(!_.isObject(villageEvent) && attackAllianceDoc != defenceAllianceDoc){
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

			var village = LogicUtils.getAllianceVillageById(defenceAllianceDoc, event.defenceVillageData.id)
			if(!_.isObject(village)){
				marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, event.attackPlayerData.dragon, 0, event.attackPlayerData.soldiers, [], defenceAllianceDoc, village, [], 0)
				attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				attackAllianceData.__attackMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
				if(attackAllianceDoc != defenceAllianceDoc){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
				return Promise.resolve()
			}

			attackDragonForFight = DataUtils.createPlayerDragonForFight(attackPlayerDoc, attackPlayerDoc.dragons[event.attackPlayerData.dragon.type])
			attackSoldiersForFight = DataUtils.createPlayerSoldiersForFight(attackPlayerDoc, event.attackPlayerData.soldiers)
			attackTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToWoundedSoldierPercent(attackPlayerDoc)
			if(!_.isObject(villageEvent)){
				var villageDragon = {
					type:village.dragon.type,
					level:village.dragon.level,
					strength:DataUtils.getPlayerDragonStrength(null, village.dragon),
					vitality:DataUtils.getPlayerDragonVitality(null, village.dragon)
				}
				villageDragon.hp = DataUtils.getPlayerDragonHpMax(null, village.dragon)
				var villageDragonForFight = DataUtils.createPlayerDragonForFight(null, villageDragon)
				var villageSoldiersForFight = DataUtils.createPlayerSoldiersForFight(null, village.soldiers)
				var villageDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, villageSoldiersForFight)
				var villageDragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, villageDragonForFight, villageDragonFightFixEffect)
				var villageSoldierFightData = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent, villageSoldiersForFight, 0)

				attackPlayerDoc.dragons[attackDragon.type].hp -= attackDragonForFight.totalHp - attackDragonForFight.currentHp
				attackPlayerData.dragons = {}
				attackPlayerData.dragons[attackDragon.type] = attackPlayerDoc.dragons[attackDragon.type]

				var report = ReportUtils.createAttackVillageFightWithVillageTroop(attackAllianceDoc, attackPlayerDoc, defenceAllianceDoc, village, villageDragonFightData, villageSoldierFightData)
				LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report)
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])



				return Promise.resolve()
			}
			if(attackAllianceDoc == defenceAllianceDoc){
				return Promise.resolve()
			}else{
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

	var playerDoc = null
	this.playerDao.findByIdAsync(event.attackPlayerData.id, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var playerData = {}
		playerDoc.dragons[event.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
		playerDoc.dragons[event.attackPlayerData.dragon.type].exp += event.attackPlayerData.dragon.expAdd
		DataUtils.updatePlayerDragonProperty(playerDoc, playerDoc.dragons[event.attackPlayerData.dragon.type])
		playerData.dragons = {}
		playerData.dragons[event.attackPlayerData.dragon.type] = playerDoc.dragons[event.attackPlayerData.dragon.type]
		playerData.soldiers = {}
		_.each(event.attackPlayerData.soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		playerData.woundedSoldiers = {}
		_.each(event.attackPlayerData.woundedSoldiers, function(soldier){
			playerDoc.woundedSoldiers[soldier.name] += soldier.count
			playerData.woundedSoldiers[soldier.name] = playerDoc.woundedSoldiers[soldier.name]
		})
		LogicUtils.refreshPlayerResources(playerDoc)
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = playerDoc[reward.type]
		})
		playerDoc.basicInfo.kill += event.attackPlayerData.kill
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
	LogicUtils.removeItemInArray(attackAllianceDoc.strikeMarchEvents, event)
	attackAllianceData.__strikeMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	if(_.isEqual(event.marchType, Consts.AllianceMarchType.City)){
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
			var attackDragonForFight = DataUtils.createPlayerDragonForFight(attackPlayerDoc, attackDragon)
			var dragonFightData = null
			var report = null
			var strikeMarchReturnEvent = null
			var rewardsForAttackPlayer = null
			var rewardsForDefencePlayer = null
			if(_.isObject(helpDefencePlayerDoc)){
				var helpDefenceDragon = helpDefencePlayerDoc.dragons[defencePlayerDoc.helpedByTroops[0].dragon.type]
				var helpDefenceDragonForFight = DataUtils.createPlayerDragonForFight(helpDefencePlayerDoc, helpDefenceDragon)
				dragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, helpDefenceDragonForFight, 0)
				report = ReportUtils.createStrikeCityFightWithHelpDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragonForFight, dragonFightData)
				LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
				LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, report.reportForDefencePlayer)
				LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.reportForDefencePlayer)

				attackDragon.hp -= dragonFightData.attackDragonHpDecreased
				attackPlayerData.dragons = {}
				attackPlayerData.dragons[attackDragon.type] = attackDragon
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])

				helpDefenceDragon.hp -= dragonFightData.defenceDragonHpDecreased
				helpDefencePlayerData.dragons = {}
				helpDefencePlayerData.dragons[helpDefenceDragon.type] = helpDefenceDragon
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])

				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
					attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
					defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
					attackAllianceData.allianceFight = {}
					attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
					defenceAllianceData.allianceFight = {}
					defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
				}else{
					attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
					defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
					attackAllianceData.allianceFight = {}
					attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
					defenceAllianceData.allianceFight = {}
					defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData
				}

				rewardsForAttackPlayer = report.reportForAttackPlayer.strikeCity.attackPlayerData.rewards
				strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, rewardsForAttackPlayer)
				attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
				attackAllianceData.__strikeMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:strikeMarchReturnEvent
				}]
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
				LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)

				var rewardsForHelpDefencePlayer = report.reportForDefencePlayer.cityBeStriked.helpDefencePlayerData.rewards
				var helpedByTroop = defencePlayerDoc.helpedByTroops[0]
				LogicUtils.mergeRewards(helpedByTroop.rewards, rewardsForHelpDefencePlayer)
				if(helpDefenceDragon.hp <= 0){
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
					var helpDefenceMarchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(defenceAllianceDoc, helpDefencePlayerDoc, defencePlayerDoc, helpedByTroop.dragon, helpedByTroop.dragon.expAdd, helpedByTroop.soldiers, helpedByTroop.woundedSoldiers, helpedByTroop.rewards, helpedByTroop.kill)
					defenceAllianceDoc.attackMarchReturnEvents.push(helpDefenceMarchReturnEvent)
					defenceAllianceData.__attackMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:helpDefenceMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", helpDefenceMarchReturnEvent.id, helpDefenceMarchReturnEvent.arriveTime])
					LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)
				}else{
					defencePlayerData.__helpedByTroops = [{
						type:Consts.DataChangedType.Edit,
						data:helpedByTroop
					}]
				}

				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			}else{
				var defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
				if(!_.isObject(defenceDragon)){
					report = ReportUtils.createStrikeCityNoDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc)
					LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
					LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.reportForDefencePlayer)

					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
					}else{
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData
					}

					rewardsForAttackPlayer = report.reportForAttackPlayer.strikeCity.attackPlayerData.rewards
					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, rewardsForAttackPlayer)
					attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.__strikeMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:strikeMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
					LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)

					LogicUtils.refreshPlayerResources(defencePlayerDoc)
					rewardsForDefencePlayer = report.reportForDefencePlayer.cityBeStriked.defencePlayerData.rewards
					_.each(rewardsForDefencePlayer, function(reward){
						defencePlayerDoc[reward.type][reward.name] += reward.count
						if(!_.isObject(defencePlayerDoc[reward.type])) defencePlayerData[reward.type] = defencePlayerDoc[reward.type]
					})
					defencePlayerData.basicInfo = defencePlayerDoc.basicInfo
					defencePlayerData.resources = defencePlayerDoc.resources

					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
				}else{
					var defenceDragonForFight = DataUtils.createPlayerDragonForFight(defencePlayerDoc, defenceDragon)
					dragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight, 0)
					report = ReportUtils.createStrikeCityFightWithDefenceDragonReport(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc, defenceDragonForFight, dragonFightData)
					LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, report.reportForAttackPlayer)
					LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report.reportForDefencePlayer)

					attackDragon.hp -= dragonFightData.attackDragonHpDecreased
					attackPlayerData.dragons = {}
					attackPlayerData.dragons[attackDragon.type] = attackDragon
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])

					defenceDragon.hp -= dragonFightData.defenceDragonHpDecreased
					defencePlayerData.dragons = {}
					defencePlayerData.dragons[defenceDragon.type] = defenceDragon
					if(defenceDragon.hp <= 0){
						defenceDragon.status = Consts.DragonStatus.Free
					}
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					if(_.isEqual(attackAllianceDoc._id, attackAllianceDoc.allianceFight.attackAllianceId)){
						attackAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.attackAllianceCountData.strikeCount += 1
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.attackAllianceCountData = attackAllianceDoc.allianceFight.attackAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.attackAllianceCountData = defenceAllianceDoc.allianceFight.attackAllianceCountData
					}else{
						attackAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						defenceAllianceDoc.allianceFight.defenceAllianceCountData.strikeCount += 1
						attackAllianceData.allianceFight = {}
						attackAllianceData.allianceFight.defenceAllianceCountData = attackAllianceDoc.allianceFight.defenceAllianceCountData
						defenceAllianceData.allianceFight = {}
						defenceAllianceData.allianceFight.defenceAllianceCountData = defenceAllianceDoc.allianceFight.defenceAllianceCountData
					}

					rewardsForAttackPlayer = report.reportForAttackPlayer.strikeCity.attackPlayerData.rewards
					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, rewardsForAttackPlayer)
					attackAllianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					attackAllianceData.__strikeMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:strikeMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
					LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceData, defenceAllianceData)

					LogicUtils.refreshPlayerResources(defencePlayerDoc)
					rewardsForDefencePlayer = report.reportForDefencePlayer.cityBeStriked.defencePlayerData.rewards
					_.each(rewardsForDefencePlayer, function(reward){
						defencePlayerDoc[reward.type][reward.name] += reward.count
						if(!_.isObject(defencePlayerDoc[reward.type])) defencePlayerData[reward.type] = defencePlayerDoc[reward.type]
					})
					defencePlayerData.basicInfo = defencePlayerDoc.basicInfo
					defencePlayerData.resources = defencePlayerDoc.resources

					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
				}
			}
			return Promise.resolve()
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
		playerDoc.dragons[event.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[event.attackPlayerData.dragon.type] = playerDoc.dragons[event.attackPlayerData.dragon.type]
		LogicUtils.refreshPlayerResources(playerDoc)
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = playerDoc[reward.type]
		})
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
			var dragonForFight = DataUtils.createPlayerDragonForFight(playerDoc, playerDoc.dragons[playerTroop.dragon.type])
			var soldiersForFight = DataUtils.createPlayerSoldiersForFight(playerDoc, playerTroop.soldiers)
			var playerTroopForFight = {
				id:playerTroop.id,
				name:playerTroop.name,
				dragonForFight:dragonForFight,
				soldiersForFight:soldiersForFight,
				woundedSoldierPercent:DataUtils.getPlayerDamagedSoldierToWoundedSoldierPercent(playerDocs[playerTroop.id])
			}
			playerTroopsForFight.push(playerTroopForFight)
		})
		playerTroopsForFight = _.sortBy(playerTroopsForFight, function(playerTroopForFight){
			return -getTotalPower(playerTroopForFight.soldiersForFight)
		})

		var stageTroopsForFight = DataUtils.getAllianceShrineStageTroops(event.stageName)
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
			var soldierFightData = FightUtils.soldierToSoldierFight(playerTroopForFight.soldiersForFight, playerTroopForFight.woundedSoldierPercent, stageTroopForFight.soldiersForFight, 0)
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
			var dragon = LogicUtils.getPlayerDragonDataFromAllianceShrineStageEvent(playerId, event)
			var marchReturnEvent = MarchUtils.createAttackAllianceShrineMarchReturnEvent(allianceDoc, playerDoc, dragon, 0, leftSoldiers, woundedSoldiers, rewards, kill)
			allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
			allianceData.__attackMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
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
	attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Protect
	attackAllianceDoc.basicInfo.statusStartTime = now
	var attackAllianceProtectTime = DataUtils.getAllianceProtectTimeAfterAllianceFight(attackAllianceDoc)
	attackAllianceDoc.basicInfo.statusFinishTime = now + attackAllianceProtectTime
	attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
	attackAllianceData.enemyAllianceDoc = {}

	defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Protect
	defenceAllianceDoc.basicInfo.statusStartTime = now
	var defenceAllianceProtectTime = DataUtils.getAllianceProtectTimeAfterAllianceFight(defenceAllianceDoc)
	defenceAllianceDoc.basicInfo.statusFinishTime = now + defenceAllianceProtectTime
	defenceAllianceData.basicInfo = attackAllianceDoc.basicInfo
	defenceAllianceData.enemyAllianceDoc = {}

	var attackAllianceKill = attackAllianceDoc.allianceFight.attackAllianceCountData.kill
	var defenceAllianceKill = attackAllianceDoc.allianceFight.defenceAllianceCountData.kill
	var allianceFightReport = {
		id:ShortId.generate(),
		fightResult:attackAllianceKill >= defenceAllianceKill ? Consts.FightResult.AttackWin : Consts.FightResult.DefenceWin,
		fightTime:now,
		attackAlliance:{
			id:attackAllianceDoc._id,
			name:attackAllianceDoc.basicInfo.name,
			tag:attackAllianceDoc.basicInfo.tag,
			flag:attackAllianceDoc.basicInfo.flag,
			kill:attackAllianceKill,
			routCount:attackAllianceDoc.allianceFight.attackAllianceCountData.routCount
		},
		defenceAlliance:{
			id:defenceAllianceDoc._id,
			name:defenceAllianceDoc.basicInfo.name,
			tag:defenceAllianceDoc.basicInfo.tag,
			flag:defenceAllianceDoc.basicInfo.flag,
			kill:defenceAllianceKill,
			routCount:attackAllianceDoc.allianceFight.defenceAllianceCountData.routCount
		}
	}

	var willRemovedReport = null
	attackAllianceData.__allianceFightReports = []
	if(attackAllianceDoc.allianceFightReports.length >= Define.AllianceFightReportsMaxSize){
		willRemovedReport = attackAllianceDoc.allianceFightReports.shift()
		attackAllianceData.__allianceFightReports.push({
			type:Consts.DataChangedType.Remove,
			data:willRemovedReport
		})
	}
	attackAllianceDoc.allianceFightReports.push(allianceFightReport)
	attackAllianceData.__allianceFightReports.push({
		type:Consts.DataChangedType.Add,
		data:allianceFightReport
	})
	defenceAllianceData.__allianceFightReports = []
	if(defenceAllianceDoc.allianceFightReports.length >= Define.AllianceFightReportsMaxSize){
		willRemovedReport = defenceAllianceDoc.allianceFightReports.shift()
		defenceAllianceData.__allianceFightReports.push({
			type:Consts.DataChangedType.Remove,
			data:willRemovedReport
		})
	}
	defenceAllianceDoc.allianceFightReports.push(allianceFightReport)
	defenceAllianceData.__allianceFightReports.push({
		type:Consts.DataChangedType.Add,
		data:allianceFightReport
	})

	LogicUtils.updateAllianceCountInfo(attackAllianceDoc, defenceAllianceDoc)
	attackAllianceData.countInfo = attackAllianceDoc.countInfo
	defenceAllianceData.countInfo = defenceAllianceDoc.countInfo

	eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, attackAllianceDoc.basicInfo.statusFinishTime])
	eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, defenceAllianceDoc.basicInfo.statusFinishTime])
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
	updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
	updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
	callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
}