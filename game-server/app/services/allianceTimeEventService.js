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
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		if(_.isEqual(eventType, Consts.AllianceStatusEvent)){
			allianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
			allianceDoc.basicInfo.statusStartTime = Date.now()
			allianceDoc.basicInfo.statusFinishTime = 0
			allianceDoc.moonGateData = null
			var allianceData = {}
			allianceData.basicInfo = allianceDoc.basicInfo
			allianceData.moonGateData = {}
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			return Promise.resolve()
		}else{
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
	var allianceData = {}
	var playerDoc = null
	var playerData = {}
	var beHelpedPlayerDoc = null
	var beHelpedPlayerData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []

	LogicUtils.removeItemInArray(allianceDoc.attackMarchEvents, event)
	allianceData.__attackMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	if(_.isEqual(event.marchType, Consts.AllianceMarchType.Shrine)){
		var shrineEvent = LogicUtils.getEventById(allianceDoc.shrineEvents, event.defenceShrineData.shrineEventId)
		if(!_.isObject(shrineEvent)){
			this.playerDao.findByIdAsync(event.attackPlayerData.id, true).then(function(doc){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				playerDoc = doc
				var marchReturnEvent = MarchUtils.createAllianceShrineMarchReturnEvent(playerDoc, allianceDoc, event.attackPlayerData.dragon, 0, event.attackPlayerData.soldiers, [], [], 0)
				allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
				allianceData.__attackMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
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
			allianceData.__shrineEvents = [{
				type:Consts.DataChangedType.Edit,
				data:shrineEvent
			}]
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}
		return
	}
	if(_.isEqual(event.marchType, Consts.AllianceMarchType.HelpDefence)){
		var funcs = []
		funcs.push(this.playerDao.findByIdAsync(event.attackPlayerData.id, true))
		funcs.push(this.playerDao.findByIdAsync(event.beHelpedPlayerData.id, true))
		Promise.all(funcs).spread(function(doc_1, doc_2){
			if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
			if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
			playerDoc = doc_1
			beHelpedPlayerDoc = doc_2

			var helpToTroop = {
				playerDragon:event.attackPlayerData.dragon.type,
				beHelpedPlayerData:{
					id:beHelpedPlayerDoc._id,
					name:beHelpedPlayerDoc.basicInfo.name,
					cityName:beHelpedPlayerDoc.basicInfo.cityName
				}
			}
			playerDoc.helpToTroops.push(helpToTroop)
			playerData.__helpToTroops = [{
				type:Consts.DataChangedType.Add,
				data:helpToTroop
			}]
			var helpedByTroop = {
				id:playerDoc._id,
				name:playerDoc.basicInfo.name,
				level:playerDoc.basicInfo.level,
				cityName:playerDoc.basicInfo.cityName,
				dragon:{
					type:event.attackPlayerData.dragon.type,
					expAdd:0
				},
				soldiers:event.attackPlayerData.soldiers,
				woundedSoldiers:[],
				rewards:[],
				kill:0
			}
			beHelpedPlayerDoc.helpedByTroops.push(helpedByTroop)
			beHelpedPlayerData.__helpedByTroops = [{
				type:Consts.DataChangedType.Add,
				data:helpedByTroop
			}]
			var helpedMemberInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerDoc._id)
			helpedMemberInAlliance.helpedByTroopsCount += 1
			allianceData.__members = [{
				type:Consts.DataChangedType.Edit,
				data:helpedMemberInAlliance
			}]
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, beHelpedPlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
			}
			if(_.isObject(beHelpedPlayerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(beHelpedPlayerDoc._id))
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
		playerDoc.dragons[event.attackPlayerData.dragon.type].exp = event.attackPlayerData.dragon.expAdd
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
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = {}
			playerData[reward.type][reward.name] = playerDoc[reward.type][reward.name]
		})
		playerDoc.basicInfo.kill += event.attackPlayerData.kill
		playerData.basicInfo = playerDoc.basicInfo
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
	var allianceData = {}
	var playerDoc = null
	var playerData = {}
	var defencePlayerDoc = null
	var defencePlayerData = {}
	var defenceAllianceDoc = null
	var defenceAllianceData = {}
	var helpDefencePlayerDoc = null
	var helpDefencePlayerData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var funcs  = null
	LogicUtils.removeItemInArray(allianceDoc.strikeMarchEvents, event)
	allianceData.__strikeMarchEvents = [{
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
			playerDoc = doc_1
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

			var attackDragon = playerDoc.dragons[event.attackPlayerData.dragon.type]
			var attackDragonForFight = DataUtils.createDragonForFight(playerDoc, attackDragon)
			var dragonFightData = null
			var reports = null
			var strikeMarchReturnEvent = null
			var attackPlayerCoinGet = null
			var rewards = null
			if(_.isObject(helpDefencePlayerDoc)){
				var helpDefenceDragon = helpDefencePlayerDoc.dragons[defencePlayerDoc.helpedByTroops[0].dragon.type]
				var helpDefenceDragonForFight = DataUtils.createDragonForFight(helpDefencePlayerDoc, helpDefenceDragon)
				dragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, helpDefenceDragonForFight, 0)
				reports = ReportUtils.createStrikeCityFightWithHelpDefenceDragonReport(allianceDoc, playerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragonForFight, dragonFightData)
				LogicUtils.addPlayerReport(playerDoc, playerData, reports.reportForAttackPlayer)
				LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, reports.reportForHelpDefencePlayer)

				attackDragon.hp -= dragonFightData.attackDragonHpDecreased
				playerData.dragons = {}
				playerData.dragons[attackDragon.type] = attackDragon
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

				helpDefenceDragon.hp -= dragonFightData.defenceDragonHpDecreased
				helpDefencePlayerData.dragons = {}
				helpDefencePlayerData.dragons[helpDefenceDragon.type] = helpDefenceDragon
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, helpDefencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])

				var sysMailTitleKey = Localizations.Alliance.HelpDefenceStrikeTitle
				var sysMailContentKey = Localizations.Alliance.HelpDefenceStrikeContent
				LogicUtils.sendSystemMail(defencePlayerDoc, defencePlayerData, sysMailTitleKey, [helpDefencePlayerDoc.basicInfo.name], sysMailContentKey, [helpDefencePlayerDoc.basicInfo.name])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(playerDoc, allianceDoc, attackDragon, defencePlayerDoc, defenceAllianceDoc, [])
				allianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
				allianceData.__strikeMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:strikeMarchReturnEvent
				}]
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
				LogicUtils.putAllianceDataToEnemyAllianceData(allianceData, defenceAllianceData)
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])

				if(helpDefenceDragon.hp <= 0){
					var helpedByTroop = defencePlayerDoc.helpedByTroops.shift()
					defencePlayerData.__helpedByTroops = {
						type:Consts.DataChangedType.Remove,
						data:helpedByTroop
					}
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
					var helpDefenceMarchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(helpDefencePlayerDoc, defencePlayerDoc, defenceAllianceDoc, helpedByTroop.dragon, helpedByTroop.dragon.expAdd, helpedByTroop.soldiers, helpedByTroop.woundedSoldiers, helpedByTroop.rewards, helpedByTroop.kill)
					defenceAllianceDoc.attackMarchReturnEvents.push(helpDefenceMarchReturnEvent)
					defenceAllianceData.__attackMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:helpDefenceMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "attackMarchReturnEvents", helpDefenceMarchReturnEvent.id, helpDefenceMarchReturnEvent.arriveTime])
					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
					LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, allianceData)
				}else{
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
				}
			}else{
				var defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
				if(!_.isObject(defenceDragon)){
					reports = ReportUtils.createStrikeCityNoDefenceDragonReport(allianceDoc, playerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc)
					LogicUtils.addPlayerReport(playerDoc, playerData, reports.reportForAttackPlayer)
					LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, reports.reportForDefencePlayer)

					attackPlayerCoinGet = reports.reportForAttackPlayer.attackPlayerData.coinGet
					defencePlayerDoc.resources.coin -= attackPlayerCoinGet
					defencePlayerData.resources = defencePlayerDoc.resources
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					rewards = []
					rewards.push({
						type:"resources",
						name:"coin",
						count:attackPlayerCoinGet
					})
					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(playerDoc, allianceDoc, attackDragon, defencePlayerDoc, defenceAllianceDoc, rewards)
					allianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					allianceData.__strikeMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:strikeMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
					LogicUtils.putAllianceDataToEnemyAllianceData(allianceData, defenceAllianceData)
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
				}else{
					var defenceDragonForFight = DataUtils.createDragonForFight(defencePlayerDoc, defenceDragon)
					dragonFightData = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight, 0)
					reports = ReportUtils.createStrikeCityFightWithDefenceDragonReport(allianceDoc, playerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc, defenceDragonForFight, dragonFightData)
					LogicUtils.addPlayerReport(playerDoc, playerData, reports.reportForAttackPlayer)
					LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, reports.reportForDefencePlayer)

					attackDragon.hp -= dragonFightData.attackDragonHpDecreased
					playerData.dragons = {}
					playerData.dragons[attackDragon.type] = attackDragon
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

					defenceDragon.hp -= dragonFightData.defenceDragonHpDecreased
					defencePlayerData.dragons = {}
					defencePlayerData.dragons[defenceDragon.type] = defenceDragon
					if(defenceDragon.hp <= 0){
						defenceDragon.status = Consts.DragonStatus.Free
					}
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

					attackPlayerCoinGet = reports.reportForAttackPlayer.attackPlayerData.coinGet
					rewards = []
					if(attackPlayerCoinGet > 0){
						defencePlayerDoc.resources.coin -= attackPlayerCoinGet
						defencePlayerData.resources = defencePlayerDoc.resources
						rewards.push({
							type:"resources",
							name:"coin",
							count:attackPlayerCoinGet
						})
					}
					strikeMarchReturnEvent = MarchUtils.createStrikePlayerCityMarchReturnEvent(playerDoc, allianceDoc, attackDragon, defencePlayerDoc, defenceAllianceDoc, rewards)
					allianceDoc.strikeMarchReturnEvents.push(strikeMarchReturnEvent)
					allianceData.__strikeMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:strikeMarchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "strikeMarchReturnEvents", strikeMarchReturnEvent.id, strikeMarchReturnEvent.arriveTime])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
					LogicUtils.putAllianceDataToEnemyAllianceData(allianceData, defenceAllianceData)
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
				}
			}
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
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
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = {}
			playerData[reward.type][reward.name] = playerDoc[reward.type][reward.name]
		})
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
			var dragonForFight = DataUtils.createDragonForFight(playerDoc, playerDoc.dragons[playerTroop.dragon.type])
			var soldiersForFight = DataUtils.createSoldiersForFight(playerDoc, playerTroop.soldiers)
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
			var marchReturnEvent = MarchUtils.createAllianceShrineMarchReturnEvent(playerDoc, allianceDoc, dragon, 0, leftSoldiers, woundedSoldiers, rewards, kill)
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
 * 玩家进攻部队到达敌对联盟玩家城市时回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onAttackCityMarchEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = {}
	var playerDoc = null
	var playerData = {}
	var defencePlayerDoc = null
	var defencePlayerData = {}
	var helpDefencePlayerDoc = null
	var helpDefencePlayerData = {}
	var defenceAllianceDoc = null
	var defenceAllianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.attackCityMarchEvents, event)
	allianceData.__attackCityMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	var updateDragonForFight = function(dragonForFight, dragonAfterFight){
		dragonForFight.currentHp = dragonAfterFight.currentHp
	}
	var updateSoldiersForFight = function(soldiersForFight, soldiersAfterFight){
		_.each(soldiersAfterFight, function(soldierAfterFight){
			var soldierForFight = _.find(soldiersForFight, function(soldierForFight){
				return _.isEqual(soldierForFight.name, soldierAfterFight.name)
			})
			soldierForFight.currentCount = soldierAfterFight.currentCount
			soldierForFight.treatCount += soldierAfterFight.treatCount
			soldierForFight.killedSoldiers = soldierForFight.killedSoldiers.concat(soldierAfterFight.killedSoldiers)
		})
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
				newSoldierForFight.treatCount = 0
				newSoldierForFight.morale = 100
				newSoldierForFight.round = 0
				newSoldierForFight.killedSoldiers = []
				newSoldiersForFight.push(newSoldierForFight)
			}
		})
		return newSoldiersForFight
	}

	var attackDragonType = null
	var originalAttackDragon = null
	var attackDragonForFight = null
	var originalAttackSoldiers = null
	var attackSoldiersForFight = null
	var attackTreatSoldierPercent = null
	var helpDefenceDragonType = null
	var helpDefenceDragonForFight = null
	var helpDefenceSoldiersForFight = null
	var helpDefenceTreatSoldierPercent = null
	var helpDefenceDragonFightFixEffect = null
	var defenceDragonType = null
	var defenceDragonForFight = null
	var defenceSoldiersForFight = null
	var defenceTreatSoldierPercent = null
	var defenceDragonFightFixEffect = null
	var defenceWallForFight = null
	var helpDefenceDragonFightResult = null
	var helpDefenceSoldierFightResult = null
	var defenceDragonFightResult = null
	var defenceSoldierFightResult = null
	var defenceWallFightResult = null
	var attackCityMarchReturnEvent = null
	var helpDefenceMarchReturnEvent = null
	var attackCityReport = null
	var continueFight = true

	var funcs = []
	funcs.push(self.allianceDao.findByIdAsync(event.defencePlayerData.allianceId, true))
	funcs.push(self.playerDao.findByIdAsync(event.defencePlayerData.id, true))
	funcs.push(self.playerDao.findByIdAsync(event.attackPlayerData.id, true))
	Promise.all(funcs).spread(function(doc_1, doc_2, doc_3){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		if(!_.isObject(doc_3)) return Promise.reject(new Error("玩家不存在"))
		defenceAllianceDoc = doc_1
		var marchEventInEnemyAlliance = _.find(defenceAllianceDoc.cityBeAttackedMarchEvents, function(theEvent){
			return _.isEqual(theEvent.id, event.id)
		})
		LogicUtils.removeItemInArray(defenceAllianceDoc.cityBeAttackedMarchEvents, marchEventInEnemyAlliance)
		defenceAllianceData.__cityBeAttackedMarchEvents = [{
			type:Consts.DataChangedType.Remove,
			data:marchEventInEnemyAlliance
		}]
		defencePlayerDoc = doc_2
		playerDoc = doc_3
		if(defencePlayerDoc.helpedByTroops.length > 0){
			return self.playerDao.findByIdAsync(defencePlayerDoc.helpedByTroops[0].id, true).then(function(doc){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				helpDefencePlayerDoc = doc
				return Promise.resolve()
			})
		}
		LogicUtils.refreshPlayerResources(defencePlayerDoc)
		LogicUtils.refreshPlayerResources(playerDoc)
		return Promise.resolve()
	}).then(function(){
		attackDragonType = event.attackPlayerData.dragon.type
		originalAttackDragon = DataUtils.createDragonForFight(playerDoc, attackDragonType)
		attackDragonForFight = CommonUtils.clone(originalAttackDragon)
		originalAttackSoldiers = DataUtils.createSoldiersForFight(playerDoc, event.attackPlayerData.soldiers)
		attackSoldiersForFight = CommonUtils.clone(originalAttackSoldiers)
		attackTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(playerDoc)
		if(_.isObject(helpDefencePlayerDoc)){
			var helpDefenceTroop = defencePlayerDoc.helpedByTroops[0]
			helpDefenceDragonType = helpDefenceTroop.dragon.type
			helpDefenceDragonForFight = DataUtils.createDragonForFight(helpDefencePlayerDoc, helpDefenceDragonType)
			helpDefenceSoldiersForFight = DataUtils.createSoldiersForFight(helpDefencePlayerDoc, helpDefenceTroop.soldiers)
			helpDefenceTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(helpDefencePlayerDoc)
			helpDefenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, helpDefenceSoldiersForFight)
		}
		var defenceDragon = LogicUtils.getPlayerDefenceDragon(defencePlayerDoc)
		var defenceSoldiers = []
		_.each(defencePlayerDoc.soldiers, function(count, name){
			if(count > 0){
				var soldier = {
					name:name,
					count:count
				}
				defenceSoldiers.push(soldier)
			}
		})
		if(_.isObject(defenceDragon) && defenceSoldiers.length > 0){
			defenceDragonType = defenceDragon.type
			defenceDragonForFight = DataUtils.createDragonForFight(defencePlayerDoc, defenceDragonType)
			defenceSoldiersForFight = DataUtils.createSoldiersForFight(defencePlayerDoc, defenceSoldiers)
			defenceTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(defencePlayerDoc)
			defenceDragonFightFixEffect = DataUtils.getDragonFightFixedEffect(attackSoldiersForFight, defenceSoldiersForFight)
		}
		if(defencePlayerDoc.resources.wallHp > 0){
			defenceWallForFight = DataUtils.createWallForFight(defencePlayerDoc)
		}
		return Promise.resolve()
	}).then(function(){
		if(_.isObject(helpDefencePlayerDoc)){
			helpDefenceDragonFightResult = FightUtils.dragonToDragonFight(attackDragonForFight, helpDefenceDragonForFight, helpDefenceDragonFightFixEffect)
			helpDefenceSoldierFightResult = FightUtils.soldierToSoldierFight(attackSoldiersForFight, attackTreatSoldierPercent, helpDefenceSoldiersForFight, helpDefenceTreatSoldierPercent)
			updateDragonForFight(attackDragonForFight, helpDefenceDragonFightResult.attackDragonAfterFight)
			updateSoldiersForFight(attackSoldiersForFight, helpDefenceSoldierFightResult.attackSoldiersAfterFight)
			updateDragonForFight(helpDefenceDragonForFight, helpDefenceDragonFightResult.defenceDragonAfterFight)
			updateSoldiersForFight(helpDefenceSoldiersForFight, helpDefenceSoldierFightResult.defenceSoldiersAfterFight)
			continueFight = _.isEqual(helpDefenceSoldierFightResult.fightResult, Consts.FightResult.AttackWin) ? true : false
		}
		return Promise.resolve()
	}).then(function(){
		if(continueFight && _.isObject(defenceDragonForFight)){
			var attackDragonForFight_1 = _.isObject(helpDefenceSoldiersForFight) ? createNewDragonForFight(attackDragonForFight) : attackDragonForFight
			var attackSoldiersForFight_1 = _.isObject(helpDefenceSoldiersForFight) ? createNewSoldiersForFight(attackSoldiersForFight) : attackSoldiersForFight
			defenceDragonFightResult = FightUtils.dragonToDragonFight(attackDragonForFight_1, defenceDragonForFight, defenceDragonFightFixEffect)
			defenceSoldierFightResult = FightUtils.soldierToSoldierFight(attackSoldiersForFight_1, attackTreatSoldierPercent, defenceSoldiersForFight, defenceTreatSoldierPercent)
			updateDragonForFight(attackDragonForFight, defenceDragonFightResult.attackDragonAfterFight)
			updateSoldiersForFight(attackSoldiersForFight, defenceSoldierFightResult.attackSoldiersAfterFight)
			updateDragonForFight(defenceDragonForFight, defenceDragonFightResult.defenceDragonAfterFight)
			updateSoldiersForFight(defenceSoldiersForFight, defenceSoldierFightResult.defenceSoldiersAfterFight)
			continueFight = _.isEqual(defenceSoldierFightResult.fightResult, Consts.FightResult.AttackWin) ? true : false
		}
		return Promise.resolve()
	}).then(function(){
		if(continueFight && _.isObject(defenceWallForFight)){
			var attackSoldiersForFight_2 = _.isObject(helpDefenceSoldiersForFight) || _.isObject(defenceSoldiersForFight) ? createNewSoldiersForFight(attackSoldiersForFight) : attackSoldiersForFight
			defenceWallFightResult = FightUtils.soldierToWallFight(attackSoldiersForFight_2, attackTreatSoldierPercent, defenceWallForFight)
			updateSoldiersForFight(attackSoldiersForFight, defenceWallFightResult.attackSoldiersAfterFight)
			updateWallForFight(defenceWallForFight, defenceWallFightResult.defenceWallAfterFight)
		}
	}).then(function(){
		playerDoc.dragons[attackDragonType].hp -= attackDragonForFight.totalHp - attackDragonForFight.currentHp
		playerData.dragons = {}
		playerData.dragons[attackDragonType] = playerDoc.dragons[attackDragonType]
		defencePlayerData.resources = defencePlayerDoc.resources
		if(_.isObject(helpDefenceSoldierFightResult)){
			helpDefencePlayerDoc.dragons[helpDefenceDragonType].hp -= helpDefenceDragonForFight.totalHp - helpDefenceDragonForFight.currentHp
			helpDefencePlayerData.dragons = {}
			helpDefencePlayerData.dragons[helpDefenceDragonType] = helpDefencePlayerDoc.dragons[helpDefenceDragonType]
		}
		if(_.isObject(defenceDragonFightResult)){
			defencePlayerDoc.dragons[defenceDragonType].hp -= defenceDragonForFight.totalHp - defenceDragonForFight.currentHp
			defencePlayerData.dragons = {}
			defencePlayerData.dragons[defenceDragonType] = defencePlayerDoc.dragons[defenceDragonType]
		}
		if(_.isObject(defenceWallFightResult)){
			defencePlayerDoc.resources.wallHp -= defenceWallForFight.totalHp - defenceWallForFight.currentHp
		}

		var theAttackPlayerData = {
			playerDoc:playerDoc,
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
			helpDefenceDragonFightResult:helpDefenceDragonFightResult,
			helpDefenceSoldierFightResult:helpDefenceSoldierFightResult,
			defenceDragonFightResult:defenceDragonFightResult,
			defenceSoldierFightResult:defenceSoldierFightResult,
			defenceWallFightResult:defenceWallFightResult
		}
		var report = ReportUtils.createAttackCityReport(defenceAllianceDoc, theAttackPlayerData, theHelpDefencePlayerData, theDefencePlayerData, fightData)
		attackCityReport = report.attackCity
		//console.log(NodeUtils.inspect(report, false, null))
		_.each(attackCityReport.attackPlayerData.rewards, function(reward){
			if(_.isEqual("resources", reward.type)){
				defencePlayerDoc.resources[reward.name] -= reward.count
			}
		})
		if(attackCityReport.attackStar > 0){
			allianceDoc.moonGateData.countData.our.attackSuccessCount += 1
			defenceAllianceDoc.moonGateData.countData.enemy.attackSuccessCount += 1
			if(attackCityReport.attackStar == 3){
				allianceDoc.moonGateData.countData.our.routCount += 1
				defenceAllianceDoc.moonGateData.countData.enemy.routCount += 1
			}
		}else{
			allianceDoc.moonGateData.countData.our.attackFailCount += 1
			defenceAllianceDoc.moonGateData.countData.enemy.attackFailCount += 1
		}

		playerData.__reports = []
		LogicUtils.addPlayerReport(playerDoc, playerData, report)
		if(_.isObject(helpDefencePlayerDoc)){
			helpDefencePlayerData.__reports = []
			LogicUtils.addPlayerReport(helpDefencePlayerDoc, helpDefencePlayerData, report)
		}
		defencePlayerData.__reports = []
		LogicUtils.addPlayerReport(defencePlayerDoc, defencePlayerData, report)

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		if(_.isObject(helpDefencePlayerDoc)){
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, helpDefencePlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, helpDefencePlayerDoc, helpDefencePlayerData])
		}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

		attackCityMarchReturnEvent = DataUtils.createAttackPlayerCityMarchReturnEvent(allianceDoc, playerDoc, defenceAllianceDoc, defencePlayerDoc, attackDragonForFight, attackSoldiersForFight, attackCityReport.attackPlayerData.rewards)
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackCityMarchReturnEvents", attackCityMarchReturnEvent.id, attackCityMarchReturnEvent.arriveTime])
		allianceDoc.attackCityMarchReturnEvents.push(attackCityMarchReturnEvent)
		allianceData.__attackCityMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:attackCityMarchReturnEvent
		}]
		defenceAllianceDoc.cityBeAttackedMarchReturnEvents.push(attackCityMarchReturnEvent)
		defenceAllianceData.__cityBeAttackedMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:attackCityMarchReturnEvent
		}]
		if(_.isObject(helpDefencePlayerDoc)){
			helpDefenceMarchReturnEvent = DataUtils.createHelpDefenceMarchReturnEvent(defenceAllianceDoc, helpDefencePlayerDoc, defencePlayerDoc, helpDefenceDragonForFight, helpDefenceSoldiersForFight)
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "helpDefenceMarchReturnEvents", helpDefenceMarchReturnEvent.id, helpDefenceMarchReturnEvent.arriveTime])
			defenceAllianceDoc.helpDefenceMarchReturnEvents.push(helpDefenceMarchReturnEvent)
			defenceAllianceData.__helpDefenceMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:helpDefenceMarchReturnEvent
			}]
		}

		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
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
	defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Protect
	defenceAllianceDoc.basicInfo.statusStartTime = now
	var defenceAllianceProtectTime = DataUtils.getAllianceProtectTimeAfterAllianceFight(defenceAllianceDoc)
	defenceAllianceDoc.basicInfo.statusFinishTime = now + defenceAllianceProtectTime
	defenceAllianceData.basicInfo = attackAllianceDoc.basicInfo

	var attackAllianceKill = attackAllianceDoc.allianceFight.attackAllianceCountData.kill
	var defenceAllianceKill = attackAllianceDoc.allianceFight.defenceAllianceCountData.kill
	var allianceFightReport = {
		id:ShortId.generate(),
		fightResult:attackAllianceKill >= defenceAllianceKill ? Consts.FightResult.AttackWin:Consts.FightResult.DefenceWin,
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