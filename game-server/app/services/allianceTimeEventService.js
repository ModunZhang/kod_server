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
var MapUtils = require("../utils/mapUtils")
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
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
		}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && attackAllianceDoc.basicInfo.statusFinishTime > Date.now()){
			return self.onAllianceFightFightingAsync(attackAllianceDoc, defenceAllianceDoc)
		}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && attackAllianceDoc.basicInfo.statusFinishTime <= Date.now()){
			return self.onAllianceFightFightFinishedAsync(attackAllianceDoc, defenceAllianceDoc)
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
 * 联盟圣地行军事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onShrineMarchEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.shrineMarchEvents, event)
	allianceData.__shrineMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	var shrineEvent = LogicUtils.getEventById(allianceDoc.shrineEvents, event.shrineEventId)
	if(!_.isObject(shrineEvent)){
		var playerDoc = null
		this.playerDao.findByIdAsync(event.playerData.id, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			playerDoc = doc
			var marchReturnEvent = LogicUtils.createAllianceShrineMarchReturnEvent(playerDoc, allianceDoc, event.playerData.dragon.type, event.playerData.soldiers, [], [], 0)
			allianceDoc.shrineMarchReturnEvents.push(marchReturnEvent)
			allianceData.__shrineMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "shrineMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
			id:event.playerData.id,
			name:event.playerData.name,
			cityName:event.playerData.cityName,
			location:event.playerData.location,
			dragon:event.playerData.dragon,
			soldiers:event.playerData.soldiers
		}
		shrineEvent.playerTroops.push(playerTroop)
		allianceData.__shrineEvents = [{
			type:Consts.DataChangedType.Edit,
			data:shrineEvent
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}
}

/**
 * 圣地返回玩家城市事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onShrineMarchReturnEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.shrineMarchReturnEvents, event)
	allianceData.__shrineMarchReturnEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	var playerDoc = null
	this.playerDao.findByIdAsync(event.playerData.id, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var playerData = {}
		playerDoc.dragons[event.playerData.dragon.type].status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[event.playerData.dragon.type] = playerDoc.dragons[event.playerData.dragon.type]
		playerData.soldiers = {}
		_.each(event.playerData.leftSoldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		playerData.treatSoldiers = {}
		_.each(event.playerData.treatSoldiers, function(soldier){
			playerDoc.treatSoldiers[soldier.name] += soldier.count
			playerData.treatSoldiers[soldier.name] = playerDoc.treatSoldiers[soldier.name]
		})
		playerDoc.basicInfo.kill += event.playerData.kill
		playerData.basicInfo = playerDoc.basicInfo
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
			var dragonForFight = DataUtils.createDragonForFight(playerDoc, playerTroop.dragon.type)
			var soldiersForFight = DataUtils.createSoldiersForFight(playerDoc, playerTroop.soldiers)
			var playerTroopForFight = {
				id:playerTroop.id,
				name:playerTroop.name,
				dragonForFight:dragonForFight,
				soldiersForFight:soldiersForFight,
				treatSoldierPercent:DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(playerDocs[playerTroop.id])
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
			var soldierFightData = FightUtils.soldierToSoldierFight(playerTroopForFight.soldiersForFight, playerTroopForFight.treatSoldierPercent, stageTroopForFight.soldiersForFight, 0)
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
			var treatSoldiers = _.isObject(params.treatSoldiers[playerId]) ? params.treatSoldiers[playerId] : []
			var leftSoldiers = _.isObject(params.damagedSoldiers[playerId]) ? getLeftSoldiers(playerTroop.soldiers, params.damagedSoldiers[playerId]) : playerTroop.soldiers
			var rewards = _.isObject(params.playerRewards[playerId]) ? params.playerRewards[playerId] : []
			var kill = _.isNumber(params.playerKills[playerId]) ? params.playerKills[playerId] : 0
			var dragon = LogicUtils.getPlayerDragonDataFromAllianceShrineStageEvent(playerId, event)
			var marchReturnEvent = LogicUtils.createAllianceShrineMarchReturnEvent(playerDoc, allianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
			allianceDoc.shrineMarchReturnEvents.push(marchReturnEvent)
			allianceData.__shrineMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "shrineMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		})
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
 * 玩家部队到达联盟月门回调
 * @param ourAllianceDoc
 * @param event
 * @param callback
 */
pro.onMoonGateMarchEvents = function(ourAllianceDoc, event, callback){
	var self = this
	var ourAllianceData = {}
	var enemyAllianceDoc = null
	var enemyAllianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(ourAllianceDoc.moonGateMarchEvents, event)
	ourAllianceData.__moonGateMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	if(_.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace) || _.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
		var playerDoc = null
		this.playerDao.findByIdAsync(event.playerData.id, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			playerDoc = doc
			var marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(playerDoc, ourAllianceDoc, event.playerData.dragon.type, event.playerData.soldiers, [], [], 0)
			ourAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
			ourAllianceData.__moonGateMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, ourAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
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
		self.allianceDao.findByIdAsync(ourAllianceDoc.moonGateData.enemyAlliance.id, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			enemyAllianceDoc = doc
			var ourTroop = {
				id:event.playerData.id,
				name:event.playerData.name,
				level:event.playerData.level,
				cityName:event.playerData.cityName,
				location:event.playerData.location,
				dragon:event.playerData.dragon,
				soldiers:event.playerData.soldiers,
				treatSoldiers:[],
				rewards:[],
				kill:0
			}
			ourAllianceDoc.moonGateData.ourTroops.push(ourTroop)
			ourAllianceData.moonGateData = {}
			ourAllianceData.moonGateData.__ourTroops = [{
				type:Consts.DataChangedType.Add,
				data:ourTroop
			}]
			enemyAllianceDoc.moonGateData.enemyTroops.push(ourTroop)
			enemyAllianceData.moonGateData = {}
			enemyAllianceData.moonGateData.__enemyTroops = [{
				type:Consts.DataChangedType.Add,
				data:ourTroop
			}]
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			var funcs = []
			if(_.isObject(enemyAllianceDoc)){
				funcs.push(self.allianceDao.removeLockByIdAsync(enemyAllianceDoc._id))
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
 * 月门返回玩家城市事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onMoonGateMarchReturnEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.moonGateMarchReturnEvents, event)
	allianceData.__moonGateMarchReturnEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	var playerDoc = null
	this.playerDao.findByIdAsync(event.playerData.id, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var playerData = {}
		playerDoc.dragons[event.playerData.dragon.type].status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[event.playerData.dragon.type] = playerDoc.dragons[event.playerData.dragon.type]
		playerData.soldiers = {}
		_.each(event.playerData.leftSoldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		playerData.treatSoldiers = {}
		_.each(event.playerData.treatSoldiers, function(soldier){
			playerDoc.treatSoldiers[soldier.name] += soldier.count
			playerData.treatSoldiers[soldier.name] = playerDoc.treatSoldiers[soldier.name]
		})
		playerDoc.basicInfo.kill += event.playerData.kill
		playerData.basicInfo = playerDoc.basicInfo
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
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
 * 玩家进攻敌对玩家回城事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onAttackCityMarchReturnEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.attackCityMarchReturnEvents, event)
	allianceData.__attackCityMarchReturnEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	var playerDoc = null
	var defenceAllianceDoc = null
	var playerData = {}
	var defenceAllianceData = {}
	var funcs = [
		this.playerDao.findByIdAsync(event.attackPlayerData.id, true),
		this.allianceDao.findByIdAsync(event.defencePlayerData.allianceId, true)
	]
	Promise.all(funcs).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
		if(!_.isObject(doc_2)) return Promise.reject(new Error("联盟不存在"))
		playerDoc = doc_1
		defenceAllianceDoc = doc_2
		var cityBeAttackedMarchReturnEvent = _.find(defenceAllianceDoc.cityBeAttackedMarchReturnEvents, function(theEvent){
			return _.isEqual(theEvent.id, event.id)
		})
		LogicUtils.removeItemInArray(defenceAllianceDoc.cityBeAttackedMarchReturnEvents, cityBeAttackedMarchReturnEvent)
		defenceAllianceData.__cityBeAttackedMarchReturnEvents = [{
			type:Consts.DataChangedType.Remove,
			data:cityBeAttackedMarchReturnEvent
		}]

		playerDoc.dragons[event.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[event.attackPlayerData.dragon.type] = playerDoc.dragons[event.attackPlayerData.dragon.type]
		playerData.soldiers = {}
		_.each(event.attackPlayerData.leftSoldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		playerData.treatSoldiers = {}
		_.each(event.attackPlayerData.treatSoldiers, function(soldier){
			playerDoc.treatSoldiers[soldier.name] += soldier.count
			playerData.treatSoldiers[soldier.name] = playerDoc.treatSoldiers[soldier.name]
		})
		_.each(event.attackPlayerData.rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = {}
			playerData[reward.type][reward.name] = playerDoc[reward.type][reward.name]
		})
		playerDoc.basicInfo.kill += event.attackPlayerData.kill
		playerData.basicInfo = playerDoc.basicInfo
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
		return Promise.resolve()
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
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

	attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
	attackAllianceDoc.basicInfo.statusStartTime = Date.now()
	attackAllianceDoc.basicInfo.statusFinishTime = Date.now() + DataUtils.getAllianceFightTotalFightTime()
	attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
	defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
	defenceAllianceDoc.basicInfo.statusStartTime = Date.now()
	defenceAllianceDoc.basicInfo.statusFinishTime = Date.now() + DataUtils.getAllianceFightTotalFightTime()
	defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo

	attackAllianceData.moonGateData = {}
	defenceAllianceData.moonGateData = {}
	var nextFightTime = Date.now() + DataUtils.getAllianceFightSecondsPerFight()
	eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, nextFightTime])
	attackAllianceDoc.moonGateData.currentFightTroops.nextFightTime = nextFightTime
	defenceAllianceDoc.moonGateData.currentFightTroops.nextFightTime = nextFightTime
	MoveAllianceTroopToCurrentFightTroops.call(this, attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData)
	attackAllianceData.moonGateData.currentFightTroops = attackAllianceDoc.moonGateData.currentFightTroops
	defenceAllianceData.moonGateData.currentFightTroops = defenceAllianceDoc.moonGateData.currentFightTroops

	updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
	updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
	pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
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
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var attackAllianceData = {}
	var defenceAllianceData = {}
	attackAllianceData.moonGateData = {}
	defenceAllianceData.moonGateData = {}

	var nextFightTime = Date.now() + DataUtils.getAllianceFightSecondsPerFight()
	eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, nextFightTime])
	attackAllianceDoc.moonGateData.currentFightTroops.nextFightTime = nextFightTime
	defenceAllianceDoc.moonGateData.currentFightTroops.nextFightTime = nextFightTime

	var funcs = null
	if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.our) && _.isObject(attackAllianceDoc.moonGateData.currentFightTroops.enemy)){
		var attackPlayerDoc = null
		var defencePlayerDoc = null
		funcs = []
		funcs.push(self.playerDao.findByIdAsync(attackAllianceDoc.moonGateData.currentFightTroops.our.id, true))
		funcs.push(self.playerDao.findByIdAsync(attackAllianceDoc.moonGateData.currentFightTroops.enemy.id, true))
		Promise.all(funcs).spread(function(doc1, doc2){
			if(!_.isObject(doc1)) return Promise.reject(new Error("玩家不存在"))
			if(!_.isObject(doc2)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc1
			defencePlayerDoc = doc2
			var attackPlayerData = {}
			var defencePlayerData = {}
			AllianceTroopFight.call(self, attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, defenceAllianceDoc, defenceAllianceData, defencePlayerDoc, defencePlayerData, eventFuncs)
			MoveAllianceTroopToCurrentFightTroops.call(self, attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData)
			attackAllianceData.moonGateData.currentFightTroops = attackAllianceDoc.moonGateData.currentFightTroops
			defenceAllianceData.moonGateData.currentFightTroops = defenceAllianceDoc.moonGateData.currentFightTroops
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
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
			if(funcs.length > 0){
				Promise.all(funcs).then(function(){
					callback(e)
				})
			}else{
				callback(e)
			}
		})
	}else{
		if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.our)){
			attackAllianceDoc.moonGateData.currentFightTroops.our.winCount += 1
			defenceAllianceDoc.moonGateData.currentFightTroops.enemy.winCount += 1
			if(attackAllianceDoc.moonGateData.currentFightTroops.our.winCount == 3 && !_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
				attackAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Our
				defenceAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Enemy
				attackAllianceData.moonGateData.moonGateOwner = attackAllianceDoc.moonGateData.moonGateOwner
				defenceAllianceData.moonGateData.moonGateOwner = defenceAllianceDoc.moonGateData.moonGateOwner
			}

			if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
				attackAllianceDoc.moonGateData.countData.our.moonGateOwnCount += 1
				defenceAllianceDoc.moonGateData.countData.enemy = attackAllianceDoc.moonGateData.countData.our
				LogicUtils.refreshAllianceMoonGateDataCountData(attackAllianceDoc.moonGateData.countData, defenceAllianceDoc.moonGateData.countData)
				attackAllianceData.moonGateData.countData = {}
				attackAllianceData.moonGateData.countData.our = {}
				attackAllianceData.moonGateData.countData.our.moonGateOwnCount = attackAllianceDoc.moonGateData.countData.our.moonGateOwnCount
				attackAllianceData.moonGateData.countData.our.kill = attackAllianceDoc.moonGateData.countData.our.kill
				defenceAllianceData.moonGateData.countData = {}
				defenceAllianceData.moonGateData.countData.enemy = {}
				defenceAllianceData.moonGateData.countData.enemy.moonGateOwnCount = defenceAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount
				defenceAllianceData.moonGateData.countData.enemy.kill = defenceAllianceDoc.moonGateData.countData.enemy.kill
			}
		}else if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.enemy)){
			attackAllianceDoc.moonGateData.currentFightTroops.enemy.winCount += 1
			defenceAllianceDoc.moonGateData.currentFightTroops.our.winCount += 1
			if(attackAllianceDoc.moonGateData.currentFightTroops.enemy.winCount == 3 && !_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Enemy)){
				attackAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Enemy
				defenceAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Our
				attackAllianceData.moonGateData.moonGateOwner = attackAllianceDoc.moonGateData.moonGateOwner
				defenceAllianceData.moonGateData.moonGateOwner = defenceAllianceDoc.moonGateData.moonGateOwner
			}

			if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Enemy)){
				attackAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount += 1
				defenceAllianceDoc.moonGateData.countData.our = attackAllianceDoc.moonGateData.countData.enemy
				LogicUtils.refreshAllianceMoonGateDataCountData(attackAllianceDoc.moonGateData.countData, defenceAllianceDoc.moonGateData.countData)
				attackAllianceData.moonGateData.countData = {}
				attackAllianceData.moonGateData.countData.enemy = {}
				attackAllianceData.moonGateData.countData.enemy.moonGateOwnCount = attackAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount
				attackAllianceData.moonGateData.countData.enemy.kill = attackAllianceDoc.moonGateData.countData.enemy.kill
				defenceAllianceData.moonGateData.countData = {}
				defenceAllianceData.moonGateData.countData.our = {}
				defenceAllianceData.moonGateData.countData.our.moonGateOwnCount = defenceAllianceDoc.moonGateData.countData.our.moonGateOwnCount
				defenceAllianceData.moonGateData.countData.our.kill = defenceAllianceDoc.moonGateData.countData.our.kill
			}
		}else{
			if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
				attackAllianceDoc.moonGateData.countData.our.moonGateOwnCount += 1
				defenceAllianceDoc.moonGateData.countData.enemy = attackAllianceDoc.moonGateData.countData.our
				LogicUtils.refreshAllianceMoonGateDataCountData(attackAllianceDoc.moonGateData.countData, defenceAllianceDoc.moonGateData.countData)
				attackAllianceData.moonGateData.countData = {}
				attackAllianceData.moonGateData.countData.our = {}
				attackAllianceData.moonGateData.countData.our.moonGateOwnCount = attackAllianceDoc.moonGateData.countData.our.moonGateOwnCount
				attackAllianceData.moonGateData.countData.our.kill = attackAllianceDoc.moonGateData.countData.our.kill
				defenceAllianceData.moonGateData.countData = {}
				defenceAllianceData.moonGateData.countData.enemy = {}
				defenceAllianceData.moonGateData.countData.enemy.moonGateOwnCount = defenceAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount
				defenceAllianceData.moonGateData.countData.enemy.kill = defenceAllianceDoc.moonGateData.countData.enemy.kill
			}else if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Enemy)){
				attackAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount += 1
				defenceAllianceDoc.moonGateData.countData.our = attackAllianceDoc.moonGateData.countData.enemy
				LogicUtils.refreshAllianceMoonGateDataCountData(attackAllianceDoc.moonGateData.countData, defenceAllianceDoc.moonGateData.countData)
				attackAllianceData.moonGateData.countData = {}
				attackAllianceData.moonGateData.countData.enemy = {}
				attackAllianceData.moonGateData.countData.enemy.moonGateOwnCount = attackAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount
				attackAllianceData.moonGateData.countData.enemy.kill = attackAllianceDoc.moonGateData.countData.enemy.kill
				defenceAllianceData.moonGateData.countData = {}
				defenceAllianceData.moonGateData.countData.our = {}
				defenceAllianceData.moonGateData.countData.our.moonGateOwnCount = defenceAllianceDoc.moonGateData.countData.our.moonGateOwnCount
				defenceAllianceData.moonGateData.countData.our.kill = defenceAllianceDoc.moonGateData.countData.our.kill
			}
		}

		MoveAllianceTroopToCurrentFightTroops.call(self, attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData)
		attackAllianceData.moonGateData.currentFightTroops = attackAllianceDoc.moonGateData.currentFightTroops
		defenceAllianceData.moonGateData.currentFightTroops = defenceAllianceDoc.moonGateData.currentFightTroops
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}
}

/**
 * 联盟战战斗事件结束回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param callback
 */
pro.onAllianceFightFightFinished = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var self = this
	var attackAllianceData = {}
	var defenceAllianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	var playerDocs = []
	var attackPlayerDoc = null
	var defencePlayerDoc = null
	var funcs = null
	var attackTroop = null
	var defenceTroop = null
	var treatSoldiers = null
	var leftSoldiers = null
	var rewards = null
	var kill = null
	var dragon = null
	var marchReturnEvent = null

	attackAllianceData.moonGateData = {}
	defenceAllianceData.moonGateData = {}

	Promise.resolve(function(){
		if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.our) && _.isObject(attackAllianceDoc.moonGateData.currentFightTroops.enemy)){
			funcs = []
			funcs.push(self.playerDao.findByIdAsync(attackAllianceDoc.moonGateData.currentFightTroops.our.id, true))
			funcs.push(self.playerDao.findByIdAsync(attackAllianceDoc.moonGateData.currentFightTroops.enemy.id, true))
			return Promise.all(funcs).spread(function(doc1, doc2){
				if(!_.isObject(doc1)) return Promise.reject(new Error("玩家不存在"))
				if(!_.isObject(doc2)) return Promise.reject(new Error("玩家不存在"))
				attackPlayerDoc = doc1
				defencePlayerDoc = doc2
				var attackPlayerData = {}
				var defencePlayerData = {}
				AllianceTroopFight.call(self, attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, defenceAllianceDoc, defenceAllianceData, defencePlayerDoc, defencePlayerData, eventFuncs)
				if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.our)){
					attackTroop = attackAllianceDoc.moonGateData.currentFightTroops.our
					treatSoldiers = attackTroop.treatSoldiers
					leftSoldiers = attackTroop.soldiers
					rewards = attackTroop.rewards
					kill = attackTroop.kill
					dragon = attackTroop.dragon
					marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(attackPlayerDoc, attackAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
					attackAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
					attackAllianceData.__moonGateMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:marchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				}else{
					defenceTroop = attackAllianceDoc.moonGateData.currentFightTroops.enemy
					treatSoldiers = defenceTroop.treatSoldiers
					leftSoldiers = defenceTroop.soldiers
					rewards = defenceTroop.rewards
					kill = defenceTroop.kill
					dragon = defenceTroop.dragon
					marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(defencePlayerDoc, defenceAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
					defenceAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
					defenceAllianceData.__moonGateMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:marchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				}

				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])
				return Promise.resolve()
			})
		}else{
			if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.our)){
				attackAllianceDoc.moonGateData.currentFightTroops.our.winCount += 1
				defenceAllianceDoc.moonGateData.currentFightTroops.enemy.winCount += 1
				if(attackAllianceDoc.moonGateData.currentFightTroops.our.winCount == 3 && !_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
					attackAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Our
					defenceAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Enemy
					attackAllianceData.moonGateData.moonGateOwner = attackAllianceDoc.moonGateData.moonGateOwner
					defenceAllianceData.moonGateData.moonGateOwner = defenceAllianceDoc.moonGateData.moonGateOwner
				}
				if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
					attackAllianceDoc.moonGateData.countData.our.moonGateOwnCount += 1
					defenceAllianceDoc.moonGateData.countData.enemy = attackAllianceDoc.moonGateData.countData.our
					LogicUtils.refreshAllianceMoonGateDataCountData(attackAllianceDoc.moonGateData.countData, defenceAllianceDoc.moonGateData.countData)

					attackAllianceData.moonGateData.countData = {}
					attackAllianceData.moonGateData.countData.our = {}
					attackAllianceData.moonGateData.countData.our.moonGateOwnCount = attackAllianceDoc.moonGateData.countData.our.moonGateOwnCount
					attackAllianceData.moonGateData.countData.our.kill = attackAllianceDoc.moonGateData.countData.our.kill
					defenceAllianceData.moonGateData.countData = {}
					defenceAllianceData.moonGateData.countData.enemy = {}
					defenceAllianceData.moonGateData.countData.enemy.moonGateOwnCount = defenceAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount
					defenceAllianceData.moonGateData.countData.enemy.kill = defenceAllianceDoc.moonGateData.countData.enemy.kill
				}

				return self.playerDao.findByIdAsync(attackAllianceDoc.moonGateData.currentFightTroops.our.id, true).then(function(doc){
					if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
					attackPlayerDoc = doc
					attackTroop = attackAllianceDoc.moonGateData.currentFightTroops.our
					treatSoldiers = attackTroop.treatSoldiers
					leftSoldiers = attackTroop.soldiers
					rewards = attackTroop.rewards
					kill = attackTroop.kill
					dragon = attackTroop.dragon
					marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(attackPlayerDoc, attackAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
					attackAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
					attackAllianceData.__moonGateMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:marchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
					return Promise.resolve()
				})
			}else if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.enemy)){
				attackAllianceDoc.moonGateData.currentFightTroops.enemy.winCount += 1
				defenceAllianceDoc.moonGateData.currentFightTroops.our.winCount += 1
				if(attackAllianceDoc.moonGateData.currentFightTroops.enemy.winCount == 3 && !_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Enemy)){
					attackAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Enemy
					defenceAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Our
					attackAllianceData.moonGateData.moonGateOwner = attackAllianceDoc.moonGateData.moonGateOwner
					defenceAllianceData.moonGateData.moonGateOwner = defenceAllianceDoc.moonGateData.moonGateOwner
				}
				if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Enemy)){
					attackAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount += 1
					defenceAllianceDoc.moonGateData.countData.our = attackAllianceDoc.moonGateData.countData.enemy
					LogicUtils.refreshAllianceMoonGateDataCountData(attackAllianceDoc.moonGateData.countData, defenceAllianceDoc.moonGateData.countData)

					attackAllianceData.moonGateData.countData = {}
					attackAllianceData.moonGateData.countData.enemy = {}
					attackAllianceData.moonGateData.countData.enemy.moonGateOwnCount = attackAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount
					attackAllianceData.moonGateData.countData.enemy.kill = attackAllianceDoc.moonGateData.countData.enemy.kill
					defenceAllianceData.moonGateData.countData = {}
					defenceAllianceData.moonGateData.countData.our = {}
					defenceAllianceData.moonGateData.countData.our.moonGateOwnCount = defenceAllianceDoc.moonGateData.countData.our.moonGateOwnCount
					defenceAllianceData.moonGateData.countData.our.kill = defenceAllianceDoc.moonGateData.countData.our.kill
				}

				return self.playerDao.findByIdAsync(attackAllianceDoc.moonGateData.currentFightTroops.enemy.id, true).then(function(doc){
					if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
					defencePlayerDoc = doc
					defenceTroop = attackAllianceDoc.moonGateData.currentFightTroops.enemy
					treatSoldiers = defenceTroop.treatSoldiers
					leftSoldiers = defenceTroop.soldiers
					rewards = defenceTroop.rewards
					kill = defenceTroop.kill
					dragon = defenceTroop.dragon
					marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(defencePlayerDoc, defenceAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
					defenceAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
					defenceAllianceData.__moonGateMarchReturnEvents = [{
						type:Consts.DataChangedType.Add,
						data:marchReturnEvent
					}]
					eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
					return Promise.resolve()
				})
			}else{
				return Promise.resolve()
			}
		}
	}()).then(function(){
		var createReturnEvent = function(playerTroop, allianceDoc, allianceData){
			return self.playerDao.findByIdAsync(playerTroop.id, true).then(function(doc){
				if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
				var playerDoc = doc
				playerDocs.push(playerDoc)
				var treatSoldiers = playerTroop.treatSoldiers
				var leftSoldiers = playerTroop.soldiers
				var rewards = playerTroop.rewards
				var kill = playerTroop.kill
				var dragon = playerTroop.dragon
				var marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(playerDoc, allianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
				allianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
				allianceData.__moonGateMarchReturnEvents = [{
					type:Consts.DataChangedType.Add,
					data:marchReturnEvent
				}]
				updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
				eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
				return Promise.resolve()
			})
		}
		var funcs = []
		_.each(attackAllianceDoc.moonGateData.ourTroops, function(playerTroop){
			funcs.push(createReturnEvent(playerTroop, attackAllianceDoc, attackAllianceData))
		})
		_.each(attackAllianceDoc.moonGateData.enemyTroops, function(playerTroop){
			funcs.push(createReturnEvent(playerTroop, defenceAllianceDoc, defenceAllianceData))
		})
		return Promise.all(funcs)
	}).then(function(){
		attackAllianceDoc.moonGateData.currentFightTroops.our = null
		attackAllianceDoc.moonGateData.currentFightTroops.enemy = null
		attackAllianceDoc.moonGateData.currentFightTroops.nextFightTime = 0
		defenceAllianceDoc.moonGateData.currentFightTroops.our = null
		defenceAllianceDoc.moonGateData.currentFightTroops.enemy = null
		defenceAllianceDoc.moonGateData.currentFightTroops.nextFightTime = 0

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
		if(_.size(attackAllianceData.moonGateData) == 0){
			delete attackAllianceData.moonGateData
			delete defenceAllianceData.moonGateData
		}

		var attackAllianceKill = attackAllianceDoc.moonGateData.countData.our.kill
		var defenceAllianceKill = attackAllianceDoc.moonGateData.countData.enemy.kill
		var attackAllianceFightReport = {
			id:ShortId.generate(),
			fightResult:attackAllianceKill >= defenceAllianceKill ? Consts.AllianceFightResult.OurWin : Consts.AllianceFightResult.EnemyWin,
			fightTime:now,
			ourAlliance:{
				id:attackAllianceDoc._id,
				name:attackAllianceDoc.basicInfo.name,
				tag:attackAllianceDoc.basicInfo.tag,
				flag:attackAllianceDoc.basicInfo.flag,
				kill:attackAllianceKill,
				routCount:attackAllianceDoc.moonGateData.countData.our.routCount
			},
			enemyAlliance:{
				id:defenceAllianceDoc._id,
				name:defenceAllianceDoc.basicInfo.name,
				tag:defenceAllianceDoc.basicInfo.tag,
				flag:defenceAllianceDoc.basicInfo.flag,
				kill:defenceAllianceKill,
				routCount:attackAllianceDoc.moonGateData.countData.enemy.routCount
			}
		}
		var defenceAllianceFightReport = {
			id:ShortId.generate(),
			fightResult:attackAllianceKill >= defenceAllianceKill ? Consts.AllianceFightResult.EnemyWin : Consts.AllianceFightResult.OurWin,
			fightTime:now,
			ourAlliance:attackAllianceFightReport.enemyAlliance,
			enemyAlliance:attackAllianceFightReport.ourAlliance
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
		attackAllianceDoc.allianceFightReports.push(attackAllianceFightReport)
		attackAllianceData.__allianceFightReports.push({
			type:Consts.DataChangedType.Add,
			data:attackAllianceFightReport
		})
		defenceAllianceData.__allianceFightReports = []
		if(defenceAllianceDoc.allianceFightReports.length >= Define.AllianceFightReportsMaxSize){
			willRemovedReport = defenceAllianceDoc.allianceFightReports.shift()
			defenceAllianceData.__allianceFightReports.push({
				type:Consts.DataChangedType.Remove,
				data:willRemovedReport
			})
		}
		defenceAllianceDoc.allianceFightReports.push(defenceAllianceFightReport)
		defenceAllianceData.__allianceFightReports.push({
			type:Consts.DataChangedType.Add,
			data:defenceAllianceFightReport
		})

		LogicUtils.updateAllianceCountInfo(attackAllianceDoc)
		LogicUtils.updateAllianceCountInfo(defenceAllianceDoc)
		attackAllianceData.countInfo = attackAllianceDoc.countInfo
		defenceAllianceData.countInfo = defenceAllianceDoc.countInfo

		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, attackAllianceDoc.basicInfo.statusFinishTime])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, defenceAllianceDoc.basicInfo.statusFinishTime])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
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

/**
 * 协助联盟其他玩家防御回调事件回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onHelpDefenceMarchEvents = function(allianceDoc, event, callback){
	var self = this
	var playerDoc = null
	var playerData = {}
	var targetPlayerDoc = null
	var targetPlayerData = {}
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.helpDefenceMarchEvents, event)
	allianceData.__helpDefenceMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	var funcs = []
	funcs.push(this.playerDao.findByIdAsync(event.playerData.id, true))
	funcs.push(this.playerDao.findByIdAsync(event.targetPlayerData.id, true))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc_1
		targetPlayerDoc = doc_2

		var helpToTroop = {
			playerDragon:event.playerData.dragon.type,
			targetPlayerData:{
				id:targetPlayerDoc._id,
				name:targetPlayerDoc.basicInfo.name,
				cityName:targetPlayerDoc.basicInfo.cityName
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
			dragon:event.playerData.dragon,
			soldiers:event.playerData.soldiers
		}
		targetPlayerDoc.helpedByTroops.push(helpedByTroop)
		targetPlayerData.__helpedByTroops = [{
			type:Consts.DataChangedType.Add,
			data:helpedByTroop
		}]
		var helpedMemberInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, targetPlayerDoc._id)
		helpedMemberInAlliance.helpTroopsCount += 1
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:helpedMemberInAlliance
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, targetPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, targetPlayerDoc, targetPlayerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
	}).then(function(){
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(targetPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(targetPlayerDoc._id))
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
 * 协防部队回程回调
 * @param allianceDoc
 * @param event
 * @param callback
 */
pro.onHelpDefenceMarchReturnEvents = function(allianceDoc, event, callback){
	var self = this
	var allianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(allianceDoc.helpDefenceMarchReturnEvents, event)
	allianceData.__helpDefenceMarchReturnEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]

	var playerDoc = null
	this.playerDao.findByIdAsync(event.playerData.id, true).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var playerData = {}
		playerDoc.dragons[event.playerData.dragon.type].status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[event.playerData.dragon.type] = playerDoc.dragons[event.playerData.dragon.type]
		playerData.soldiers = {}
		_.each(event.playerData.leftSoldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		playerData.treatSoldiers = {}
		_.each(event.playerData.treatSoldiers, function(soldier){
			playerDoc.treatSoldiers[soldier.name] += soldier.count
			playerData.treatSoldiers[soldier.name] = playerDoc.treatSoldiers[soldier.name]
		})
		playerDoc.basicInfo.kill += event.playerData.kill
		playerData.basicInfo = playerDoc.basicInfo
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
 * 将战斗等待队列的玩家部队移动到正在战斗的部队中
 * @param attackAllianceDoc
 * @param attackAllianceData
 * @param defenceAllianceDoc
 * @param defenceAllianceData
 * @constructor
 */
var MoveAllianceTroopToCurrentFightTroops = function(attackAllianceDoc, attackAllianceData, defenceAllianceDoc, defenceAllianceData){
	if(_.isArray(attackAllianceDoc.moonGateData.ourTroops) && attackAllianceDoc.moonGateData.ourTroops.length > 0 && !_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.our)){
		var attackTroop = attackAllianceDoc.moonGateData.ourTroops[0]
		var attackCurrentFightTroop = {
			id:attackTroop.id,
			name:attackTroop.name,
			winCount:0,
			dragon:attackTroop.dragon,
			soldiers:attackTroop.soldiers,
			treatSoldiers:attackTroop.treatSoldiers,
			rewards:attackTroop.rewards,
			kill:attackTroop.kill
		}
		attackAllianceDoc.moonGateData.currentFightTroops.our = attackCurrentFightTroop
		attackAllianceDoc.moonGateData.ourTroops.splice(0, 1)
		defenceAllianceDoc.moonGateData.currentFightTroops.enemy = attackCurrentFightTroop
		defenceAllianceDoc.moonGateData.enemyTroops.splice(0, 1)
		attackAllianceData.moonGateData.__ourTroops = [{
			type:Consts.DataChangedType.Remove,
			data:attackTroop
		}]
		defenceAllianceData.moonGateData.__enemyTroops = [{
			type:Consts.DataChangedType.Remove,
			data:attackTroop
		}]
	}
	if(_.isArray(attackAllianceDoc.moonGateData.enemyTroops) && attackAllianceDoc.moonGateData.enemyTroops.length > 0 && !_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.enemy)){
		var defenceTroop = attackAllianceDoc.moonGateData.enemyTroops[0]
		var defenceCurrentFightTroop = {
			id:defenceTroop.id,
			name:defenceTroop.name,
			winCount:0,
			dragon:defenceTroop.dragon,
			soldiers:defenceTroop.soldiers,
			treatSoldiers:defenceTroop.treatSoldiers,
			rewards:defenceTroop.rewards,
			kill:defenceTroop.kill
		}
		attackAllianceDoc.moonGateData.currentFightTroops.enemy = defenceCurrentFightTroop
		attackAllianceDoc.moonGateData.enemyTroops.splice(0, 1)
		defenceAllianceDoc.moonGateData.currentFightTroops.our = defenceCurrentFightTroop
		defenceAllianceDoc.moonGateData.ourTroops.splice(0, 1)
		attackAllianceData.moonGateData.__enemyTroops = [{
			type:Consts.DataChangedType.Remove,
			data:defenceTroop
		}]
		defenceAllianceData.moonGateData.__ourTroops = [{
			type:Consts.DataChangedType.Remove,
			data:defenceTroop
		}]
	}
}

/**
 * 联盟部队战斗
 * @param attackAllianceDoc
 * @param attackAllianceData
 * @param attackPlayerDoc
 * @param attackPlayerData
 * @param defenceAllianceDoc
 * @param defenceAllianceData
 * @param defencePlayerDoc
 * @param defencePlayerData
 * @param eventFuncs
 * @constructor
 */
var AllianceTroopFight = function(attackAllianceDoc, attackAllianceData, attackPlayerDoc, attackPlayerData, defenceAllianceDoc, defenceAllianceData, defencePlayerDoc, defencePlayerData, eventFuncs){
	var self = this
	var attackTroop = attackAllianceDoc.moonGateData.currentFightTroops.our
	var defenceTroop = attackAllianceDoc.moonGateData.currentFightTroops.enemy
	var now = Date.now()
	var attackFightReport = {
		fightTime:now,
		ourPlayerId:attackTroop.id,
		ourPlayerName:attackTroop.name,
		enemyPlayerId:defenceTroop.id,
		enemyPlayerName:defenceTroop.name
	}
	var defenceFightReport = {
		fightTime:now,
		ourPlayerId:defenceTroop.id,
		ourPlayerName:defenceTroop.name,
		enemyPlayerId:attackTroop.id,
		enemyPlayerName:attackTroop.name
	}
	attackAllianceDoc.moonGateData.fightReports.push(attackFightReport)
	defenceAllianceDoc.moonGateData.fightReports.push(defenceFightReport)
	attackAllianceData.moonGateData.__fightReports = [{
		type:Consts.DataChangedType.Add,
		data:attackFightReport
	}]
	defenceAllianceData.moonGateData.__fightReports = [{
		type:Consts.DataChangedType.Add,
		data:defenceFightReport
	}]

	var attackDragonType = attackTroop.dragon.type
	var attackDragonForFight = DataUtils.createDragonForFight(attackPlayerDoc, attackDragonType)
	var defenceDragonType = defenceTroop.dragon.type
	var defenceDragonForFight = DataUtils.createDragonForFight(defencePlayerDoc, defenceDragonType)
	var attackPlayerSoldiersForFight = DataUtils.createSoldiersForFight(attackPlayerDoc, attackTroop.soldiers)
	var defencePlayerSoldiersForFight = DataUtils.createSoldiersForFight(defencePlayerDoc, defenceTroop.soldiers)
	var dragonFightFixedEffect = DataUtils.getDragonFightFixedEffect(attackPlayerSoldiersForFight, defencePlayerSoldiersForFight)
	var dragonFightResult = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight, dragonFightFixedEffect)
	var attackDragonHpDecreased = dragonFightResult.attackDragonHpDecreased
	var defenceDragonHpDecreased = dragonFightResult.defenceDragonHpDecreased
	var attackDragonHp = attackPlayerDoc.dragons[attackDragonType].hp
	var defenceDragonHp = defencePlayerDoc.dragons[defenceDragonType].hp
	attackFightReport.ourDragonFightData = {
		type:attackDragonType,
		hpMax:DataUtils.getPlayerDragonHpMax(attackPlayerDoc, attackPlayerDoc.dragons[attackDragonType]),
		hp:attackDragonHp,
		hpDecreased:attackDragonHpDecreased,
		isWin:_.isEqual(dragonFightResult.fightResult, Consts.FightResult.AttackWin) ? true : false
	}
	attackFightReport.enemyDragonFightData = {
		type:defenceDragonType,
		hpMax:DataUtils.getPlayerDragonHpMax(defencePlayerDoc, defencePlayerDoc.dragons[defenceDragonType]),
		hp:defenceDragonHp,
		hpDecreased:defenceDragonHpDecreased,
		isWin:_.isEqual(dragonFightResult.fightResult, Consts.FightResult.AttackWin) ? false : true
	}
	defenceFightReport.ourDragonFightData = attackFightReport.enemyDragonFightData
	defenceFightReport.enemyDragonFightData = attackFightReport.ourDragonFightData

	attackPlayerDoc.dragons[attackDragonType].hp = attackDragonHp - attackDragonHpDecreased
	defencePlayerDoc.dragons[defenceDragonType].hp = defenceDragonHp - defenceDragonHpDecreased
	attackPlayerData.dragons = {}
	attackPlayerData.dragons[attackDragonType] = attackPlayerDoc.dragons[attackDragonType]
	defencePlayerData.dragons = {}
	defencePlayerData.dragons[defenceDragonType] = defencePlayerDoc.dragons[defenceDragonType]

	var attackTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(attackPlayerDoc)
	var defenceTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(defencePlayerDoc)
	var soldierFightResult = FightUtils.soldierToSoldierFight(attackPlayerSoldiersForFight, attackTreatSoldierPercent, defencePlayerSoldiersForFight, defenceTreatSoldierPercent)

	attackFightReport.ourSoldierRoundDatas = soldierFightResult.attackRoundDatas
	attackFightReport.enemySoldierRoundDatas = soldierFightResult.defenceRoundDatas
	defenceFightReport.ourSoldierRoundDatas = soldierFightResult.defenceRoundDatas
	defenceFightReport.enemySoldierRoundDatas = soldierFightResult.attackRoundDatas

	var treatSoldiers = null
	var leftSoldiers = null
	var rewards = null
	var kill = null
	var dragon = null
	var marchReturnEvent = null

	if(_.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult)){
		attackAllianceDoc.moonGateData.currentFightTroops.our.winCount += 1
		attackFightReport.fightResult = Consts.AllianceFightResult.OurWin
		defenceFightReport.fightResult = Consts.AllianceFightResult.EnemyWin
		if(attackAllianceDoc.moonGateData.currentFightTroops.our.winCount == 3 && !_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
			attackAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Our
			defenceAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Enemy
			attackAllianceData.moonGateData.moonGateOwner = attackAllianceDoc.moonGateData.moonGateOwner
			defenceAllianceData.moonGateData.moonGateOwner = defenceAllianceDoc.moonGateData.moonGateOwner
		}
		if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
			attackAllianceDoc.moonGateData.countData.our.moonGateOwnCount += 1
			defenceAllianceDoc.moonGateData.countData.enemy = attackAllianceDoc.moonGateData.countData.our
		}
	}else{
		attackAllianceDoc.moonGateData.currentFightTroops.enemy.winCount += 1
		attackFightReport.fightResult = Consts.AllianceFightResult.EnemyWin
		defenceFightReport.fightResult = Consts.AllianceFightResult.OurWin
		if(attackAllianceDoc.moonGateData.currentFightTroops.enemy.winCount == 3 && !_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Enemy)){
			attackAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Enemy
			defenceAllianceDoc.moonGateData.moonGateOwner = Consts.AllianceMoonGateOwner.Our
			attackAllianceData.moonGateData.moonGateOwner = attackAllianceDoc.moonGateData.moonGateOwner
			defenceAllianceData.moonGateData.moonGateOwner = defenceAllianceDoc.moonGateData.moonGateOwner
		}
		if(_.isEqual(attackAllianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Enemy)){
			attackAllianceDoc.moonGateData.countData.enemy.moonGateOwnCount += 1
			defenceAllianceDoc.moonGateData.countData.our = attackAllianceDoc.moonGateData.countData.enemy
		}
	}
	DataUtils.updateAllianceMoonGateData(attackAllianceDoc.moonGateData.countData, attackTroop, defenceAllianceDoc.moonGateData.countData, defenceTroop, soldierFightResult)
	LogicUtils.refreshAllianceMoonGateDataCountData(attackAllianceDoc.moonGateData.countData, defenceAllianceDoc.moonGateData.countData)

	attackAllianceData.moonGateData.countData = attackAllianceDoc.moonGateData.countData
	defenceAllianceData.moonGateData.countData = defenceAllianceDoc.moonGateData.countData

	defenceAllianceDoc.moonGateData.currentFightTroops.our = defenceTroop
	defenceAllianceDoc.moonGateData.currentFightTroops.enemy = attackTroop

	if(_.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) || defencePlayerDoc.dragons[defenceDragonType].hp <= 0){
		treatSoldiers = defenceTroop.treatSoldiers
		leftSoldiers = defenceTroop.soldiers
		rewards = defenceTroop.rewards
		kill = defenceTroop.kill
		dragon = defenceTroop.dragon
		marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(defencePlayerDoc, defenceAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
		defenceAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
		defenceAllianceData.__moonGateMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:marchReturnEvent
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, defenceAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])

		attackAllianceDoc.moonGateData.currentFightTroops.enemy = null
		defenceAllianceDoc.moonGateData.currentFightTroops.our = null
	}
	if(_.isEqual(Consts.FightResult.DefenceWin, soldierFightResult.fightResult) || attackPlayerDoc.dragons[attackDragonType].hp <= 0){
		treatSoldiers = attackTroop.treatSoldiers
		leftSoldiers = attackTroop.soldiers
		rewards = attackTroop.rewards
		kill = attackTroop.kill
		dragon = attackTroop.dragon
		marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(attackPlayerDoc, attackAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
		attackAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.__moonGateMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:marchReturnEvent
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])

		attackAllianceDoc.moonGateData.currentFightTroops.our = null
		defenceAllianceDoc.moonGateData.currentFightTroops.enemy = null
	}
}