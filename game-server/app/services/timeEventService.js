"use strict"

/**
 * Created by modun on 14-10-28.
 */

var _ = require("underscore")
var Promise = require("bluebird")
var ShortId = require("shortid")

var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var ReportUtils = require("../utils/reportUtils")
var FightUtils = require("../utils/fightUtils")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var TimeEventService = function(app){
	this.app = app
	this.eventServerId = "event-server-1"
	this.pushService = app.get("pushService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = TimeEventService
var pro = TimeEventService.prototype


/**
 * 添加时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 */
pro.addTimeEvent = function(key, eventType, eventId, finishTime, callback){
	this.app.rpc.event.eventRemote.addTimeEvent.toServer(this.eventServerId, key, eventType, eventId, finishTime - Date.now(), callback)
}

/**
 * 移除时间回调
 * @param key
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(key, eventId, callback){
	this.app.rpc.event.eventRemote.removeTimeEvent.toServer(this.eventServerId, key, eventId, callback)
}

/**
 * 更新时间回调
 * @param key
 * @param eventId
 * @param newFinishTime
 * @param callback
 */
pro.updateTimeEvent = function(key, eventId, newFinishTime, callback){
	this.app.rpc.event.eventRemote.updateTimeEvent.toServer(this.eventServerId, key, eventId, newFinishTime - Date.now(), callback)
}

/**
 * 清除指定Key的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEvents = function(key, callback){
	this.app.rpc.event.eventRemote.clearTimeEventsByKey.toServer(this.eventServerId, key, callback)
}


/**
 * 添加玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addPlayerTimeEvent = function(playerDoc, eventType, eventId, finishTime, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.addTimeEvent(key, eventType, eventId, finishTime, callback)
}

/**
 * 移除玩家时间回调
 * @param playerDoc
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removePlayerTimeEvent = function(playerDoc, eventId, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.removeTimeEvent(key, eventId, callback)
}

/**
 * 更新玩家时间回调
 * @param playerDoc
 * @param eventId
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updatePlayerTimeEvent = function(playerDoc, eventId, newFinishTime, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.updateTimeEvent(key, eventId, newFinishTime, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param playerDoc
 * @param callback
 * @returns {*}
 */
pro.clearPlayerTimeEvents = function(playerDoc, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.clearTimeEvents(key, callback)
}

/**
 * 添加联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param finishTime
 * @param callback
 * @returns {*}
 */
pro.addAllianceTimeEvent = function(allianceDoc, eventType, eventId, finishTime, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.addTimeEvent(key, eventType, eventId, finishTime, callback)
}

/**
 * 移除联盟时间回调
 * @param allianceDoc
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removeAllianceTimeEvent = function(allianceDoc, eventId, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.removeTimeEvent(key, eventId, callback)
}

/**
 * 更新联盟时间回调
 * @param allianceDoc
 * @param eventId
 * @param newFinishTime
 * @param callback
 * @returns {*}
 */
pro.updateAllianceTimeEvent = function(allianceDoc, eventId, newFinishTime, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.updateTimeEvent(key, eventId, newFinishTime, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param allianceDoc
 * @param callback
 * @returns {*}
 */
pro.clearAllianceTimeEvents = function(allianceDoc, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.clearTimeEvents(key, callback)
}

/**
 * 添加联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param finishTime
 * @param callback
 */
pro.addAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, finishTime, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.addTimeEvent(key, eventType, eventId, finishTime, callback)
}

/**
 * 更新联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param newFinishTime
 * @param callback
 */
pro.updateAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, newFinishTime, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.updateTimeEvent(key, eventId, newFinishTime, callback)
}

/**
 * 移除联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param callback
 */
pro.removeAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.removeTimeEvent(key, eventId, callback)
}


/**
 * 刷新玩家时间数据
 * @param playerDoc
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @returns {{pushFuncs: Array, playerData: {}, allianceData: {}}}
 */
pro.onPlayerEvent = function(playerDoc, allianceDoc, eventType, eventId){
	var self = this
	var pushFuncs = []
	var playerData = {}
	var allianceData = {}
	var event = null
	var helpEvent = null
	LogicUtils.refreshPlayerResources(playerDoc)
	if(_.isEqual(eventType, "buildingEvents")){
		event = LogicUtils.getEventById(playerDoc.buildingEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.buildingEvents, event)
		var building = LogicUtils.getBuildingByEvent(playerDoc, event)
		building.level += 1
		LogicUtils.updateBuildingsLevel(playerDoc)
		playerData.buildings = playerDoc.buildings
		playerData.towers = playerDoc.towers
		playerData.buildingEvents = playerDoc.buildingEvents
		pushFuncs.push([self.pushService, self.pushService.onBuildingLevelUpAsync, playerDoc, event.location])
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "houseEvents")){
		event = LogicUtils.getEventById(playerDoc.houseEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.houseEvents, event)
		var house = LogicUtils.getHouseByEvent(playerDoc, event)
		house.level += 1
		playerData.buildings = playerDoc.buildings
		playerData.houseEvents = playerDoc.houseEvents
		pushFuncs.push([self.pushService, self.pushService.onHouseLevelUpAsync, playerDoc, event.buildingLocation, event.houseLocation])
		if(_.isEqual("dwelling", house.type)){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
			LogicUtils.refreshPlayerResources(playerDoc)

		}
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "towerEvents")){
		event = LogicUtils.getEventById(playerDoc.towerEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.towerEvents, event)
		var tower = LogicUtils.getTowerByEvent(playerDoc, event)
		tower.level += 1
		playerData.towers = playerDoc.towers
		playerData.towerEvents = playerDoc.towerEvents
		pushFuncs.push([self.pushService, self.pushService.onTowerLevelUpAsync, playerDoc, event.location])
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "wallEvents")){
		event = LogicUtils.getEventById(playerDoc.wallEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.wallEvents, event)
		var wall = playerDoc.wall
		wall.level += 1
		playerData.wall = playerDoc.wall
		playerData.wallEvents = playerDoc.wallEvents
		pushFuncs.push([self.pushService, self.pushService.onWallLevelUpAsync, playerDoc])
		if(_.isObject(allianceDoc)){
			helpEvent = LogicUtils.getAllianceHelpEvent(allianceDoc, event.id)
			if(_.isObject(helpEvent)){
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
				if(!_.isObject(allianceData.__helpEvents)) allianceData.__helpEvents = []
				allianceData.__helpEvents.push({
					type:Consts.DataChangedType.Remove,
					data:helpEvent
				})
			}
		}
	}else if(_.isEqual(eventType, "materialEvents")){
		event = LogicUtils.getEventById(playerDoc.materialEvents, eventId)
		event.finishTime = 0
		playerData.materialEvents = playerDoc.materialEvents
		pushFuncs.push([self.pushService, self.pushService.onMakeMaterialFinishedAsync, playerDoc, event])
	}else if(_.isEqual(eventType, "soldierEvents")){
		event = LogicUtils.getEventById(playerDoc.soldierEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.soldierEvents, event)
		playerDoc.soldiers[event.name] += event.count
		playerData.soldiers = playerDoc.soldiers
		playerData.soldierEvents = playerDoc.soldierEvents
		pushFuncs.push([self.pushService, self.pushService.onRecruitSoldierSuccessAsync, playerDoc, event.name, event.count])
	}else if(_.isEqual(eventType, "dragonEquipmentEvents")){
		event = LogicUtils.getEventById(playerDoc.dragonEquipmentEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.dragonEquipmentEvents, event)
		playerDoc.dragonEquipments[event.name] += 1
		playerData.dragonEquipments = playerDoc.dragonEquipments
		playerData.dragonEquipmentEvents = playerDoc.dragonEquipmentEvents
		pushFuncs.push([self.pushService, self.pushService.onMakeDragonEquipmentSuccessAsync, playerDoc, event.name])
	}else if(_.isEqual(eventType, "treatSoldierEvents")){
		event = LogicUtils.getEventById(playerDoc.treatSoldierEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.treatSoldierEvents, event)
		_.each(event.soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
		})
		playerData.soldiers = playerDoc.soldiers
		playerData.treatSoldierEvents = playerDoc.treatSoldierEvents
		pushFuncs.push([self.pushService, self.pushService.onTreatSoldierSuccessAsync, playerDoc, event.soldiers])
	}else if(_.isEqual(eventType, "coinEvents")){
		event = LogicUtils.getEventById(playerDoc.coinEvents, eventId)
		LogicUtils.removeItemInArray(playerDoc.coinEvents, event)
		playerDoc.resources.coin += event.coin
		playerData.resources = playerDoc.resources
		playerData.coinEvents = playerDoc.coinEvents
		pushFuncs.push([self.pushService, self.pushService.onImposeSuccessAsync, playerDoc, event.coin])
	}

	LogicUtils.refreshPlayerPower(playerDoc)
	playerData.basicInfo = playerDoc.basicInfo
	playerData.resources = playerDoc.resources

	var response = {pushFuncs:pushFuncs, playerData:playerData, allianceData:allianceData}
	return response
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
			var marchReturnEvent = LogicUtils.createAllianceShrineMarchReturnEvent(playerDoc, allianceDoc, event.playerData.dragon.type, event.playerSoldiers, [], [], 0)
			allianceDoc.shrineMarchReturnEvents.push(marchReturnEvent)
			allianceData.__shrineMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
			eventFuncs.push([self, self.addAllianceTimeEventAsync, allianceDoc, "shrineMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
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
		_.each(event.playerData.leftSoldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.soldiers = {}
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		_.each(event.playerData.treatSoldiers, function(soldier){
			playerDoc.treatSoldiers[soldier.name] += soldier.count
			playerData.treatSoldiers = {}
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
	var findPlayerDocFunc = function(playerId){
		return self.playerDao.findByIdAsync(playerId, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			playerDocs[doc._id] = doc
			return Promise.resolve()
		})
	}
	_.each(event.playerTroops, function(playerTroop){
		funcs.push(findPlayerDocFunc(playerTroop.id))
	})
	Promise.all(funcs).then(function(){
		_.each(event.playerTroops, function(playerTroop){
			var playerDoc = playerDocs[playerTroop.id]
			var soldiersForFight = []
			_.each(playerTroop.soldiers, function(soldier){
				if(DataUtils.hasNormalSoldier(soldier.name)){
					soldiersForFight.push(DataUtils.createNormalSoldierForFight(playerDoc, soldier.name, 1, soldier.count))
				}else{
					soldiersForFight.push(DataUtils.createSpecialSoldierForFight(playerDoc, soldier.name, soldier.count))
				}
			})
			var playerTroopForFight = {
				id:playerTroop.id,
				name:playerTroop.name,
				soldiers:soldiersForFight
			}
			playerTroopsForFight.push(playerTroopForFight)
		})
		var playerAvgPower = LogicUtils.getPlayerTroopsAvgPower(playerTroopsForFight)
		var stageTroops = DataUtils.getAllianceShrineStageTroops(event.stageName)
		var currentRound = 1
		var playerSuccessedTroops = []
		var stageSuccessedTroops = []
		var fightDatas = []
		while(playerTroopsForFight.length > 0 && stageTroops.length > 0){
			var playerTroopForFight = playerTroopsForFight[0]
			var stageTroop = stageTroops[0]
			var treatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(playerDocs[playerTroopForFight.id])
			var fightData = FightUtils.soldierToSoldierFight(playerTroopForFight.soldiers, treatSoldierPercent, stageTroop.soldiers, 0)
			if(_.isEqual(fightData.fightResult, Consts.FightResult.AttackWin)){
				playerSuccessedTroops.push(playerTroopForFight)
			}else{
				stageSuccessedTroops.push(stageTroop)
			}
			LogicUtils.removeItemInArray(playerTroopsForFight, playerTroopForFight)
			LogicUtils.removeItemInArray(stageTroops, stageTroop)
			LogicUtils.resetFightSoldiersByFightResult(playerTroopForFight.soldiers, fightData.attackRoundDatas)
			LogicUtils.resetFightSoldiersByFightResult(stageTroop.soldiers, fightData.defenceRoundDatas)

			var currentFightData = null
			if(fightDatas.length < currentRound){
				currentFightData = {
					round:currentRound,
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
				stageTroopNumber:stageTroop.troopNumber,
				fightResult:fightData.fightResult,
				attackRoundDatas:fightData.attackRoundDatas,
				defenceRoundDatas:fightData.defenceRoundDatas
			})

			if((playerTroopsForFight.length == 0 && playerSuccessedTroops.length > 0) || (stageTroops.length == 0 && stageSuccessedTroops.length > 0)){
				if(playerTroopsForFight.length == 0 && playerSuccessedTroops.length > 0){
					_.each(playerSuccessedTroops, function(troop){
						playerTroopsForFight.push(troop)
					})
					LogicUtils.clearArray(playerSuccessedTroops)
				}
				if(stageTroops.length == 0 && stageSuccessedTroops.length > 0){
					_.each(stageSuccessedTroops, function(troop){
						stageTroops.push(troop)
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
			stageData.maxStar = fightData
			allianceData.__shrineDatas = [{
				type:Consts.DataChangedType.Edit,
				data:stageData
			}]
		}
		_.each(event.playerTroops, function(playerTroop){
			var playerId = playerTroop.id
			var playerDoc = playerDocs[playerId]
			var treatSoldiers = _.isObject(params.treatSoldiers[playerId]) ? params.treatSoldiers[playerId] : []
			var leftSoldiers = _.isObject(params.leftSoldiers[playerId]) ? params.leftSoldiers[playerId] : []
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
			eventFuncs.push([self, self.addAllianceTimeEventAsync, allianceDoc, "shrineMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
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
 * @param attackAllianceDoc
 * @param event
 * @param callback
 */
pro.onMoonGateMarchEvents = function(attackAllianceDoc, event, callback){
	var self = this
	var defenceAllianceDoc = null
	var attackAllianceData = {}
	var defenceAllianceData = {}

	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	LogicUtils.removeItemInArray(attackAllianceDoc.moonGateMarchEvents, event)
	attackAllianceData.__moonGateMarchEvents = [{
		type:Consts.DataChangedType.Remove,
		data:event
	}]
	if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Peace) || _.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
		var playerDoc = null
		this.playerDao.findByIdAsync(event.playerData.id, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			playerDoc = doc
			var marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(playerDoc, attackAllianceDoc, event.playerData.dragon.type, event.playerSoldiers, [], [], 0)
			attackAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
			attackAllianceData.__moonGateMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
			eventFuncs.push([self, self.addAllianceTimeEventAsync, attackAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
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
		self.allianceDao.findByIdAsync(attackAllianceDoc.moonGateData.enemyAllianceId, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			defenceAllianceDoc = doc
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
			if(!_.isArray(attackAllianceDoc.moonGateData.ourTroops)) attackAllianceDoc.moonGateData.ourTroops = []
			attackAllianceDoc.moonGateData.ourTroops.push(ourTroop)
			attackAllianceData.moonGateData = {}
			attackAllianceData.moonGateData.__ourTroops = [{
				type:Consts.DataChangedType.Add,
				data:ourTroop
			}]
			if(!_.isArray(defenceAllianceDoc.moonGateData.enemyTroops)) defenceAllianceDoc.moonGateData.enemyTroops = []
			defenceAllianceDoc.moonGateData.enemyTroops.push(ourTroop)
			defenceAllianceData.moonGateData = {}
			defenceAllianceData.moonGateData.__enemyTroops = [{
				type:Consts.DataChangedType.Add,
				data:ourTroop
			}]
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
			return Promise.resolve()
		}).then(function(){
			callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
		}).catch(function(e){
			var funcs = []
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
		_.each(event.playerData.leftSoldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.soldiers = {}
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		_.each(event.playerData.treatSoldiers, function(soldier){
			playerDoc.treatSoldiers[soldier.name] += soldier.count
			playerData.treatSoldiers = {}
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
 * 联盟战战斗状态改变
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param callback
 */
pro.onAllianceFightStatusChanged = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var self = this
	var attackAllianceData = {}
	var defenceAllianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare)){
		attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
		attackAllianceDoc.basicInfo.statusStartTime = Date.now()
		attackAllianceDoc.basicInfo.statusFinishTime = Date.now() + DataUtils.getAllianceFightTotalFightTime()
		attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
		defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
		defenceAllianceDoc.basicInfo.statusStartTime = Date.now()
		defenceAllianceDoc.basicInfo.statusFinishTime = Date.now() + DataUtils.getAllianceFightTotalFightTime()
		defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
		eventFuncs.push([self, self.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, Date.now() + (5 * 1000)])
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && attackAllianceDoc.basicInfo.statusFinishTime > Date.now()){
		var nextFightTime = Date.now() + DataUtils.getAllianceFightSecondsPerFight()
		eventFuncs.push([self, self.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, nextFightTime])

		attackAllianceData.moonGateData = {}
		attackAllianceData.moonGateData.__ourTroops = []
		attackAllianceData.moonGateData.__enemyTroops = []
		defenceAllianceData.moonGateData = {}
		defenceAllianceData.moonGateData.__ourTroops = []
		defenceAllianceData.moonGateData.__enemyTroops = []

		if(!_.isObject(attackAllianceDoc.moonGateData.currentFightTroops)){
			attackAllianceDoc.moonGateData.currentFightTroops = {}
			defenceAllianceDoc.moonGateData.currentFightTroops = {}
			if(_.isArray(attackAllianceDoc.moonGateData.ourTroops) && attackAllianceDoc.moonGateData.ourTroops.length > 0){
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
				attackAllianceData.moonGateData.__ourTroops.push({
					type:Consts.DataChangedType.Remove,
					data:attackTroop
				})
				attackAllianceData.moonGateData.currentFightTroops = attackAllianceDoc.moonGateData.currentFightTroops
				defenceAllianceData.moonGateData.__enemyTroops.push({
					type:Consts.DataChangedType.Remove,
					data:attackTroop
				})
				defenceAllianceData.moonGateData.currentFightTroops = defenceAllianceDoc.moonGateData.currentFightTroops
			}
			if(_.isArray(attackAllianceDoc.moonGateData.enemyTroops) && attackAllianceDoc.moonGateData.enemyTroops.length > 0){
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
				attackAllianceData.moonGateData.__enemyTroops.push({
					type:Consts.DataChangedType.Remove,
					data:defenceTroop
				})
				attackAllianceData.moonGateData.currentFightTroops = attackAllianceDoc.moonGateData.currentFightTroops
				defenceAllianceData.moonGateData.__ourTroops.push({
					type:Consts.DataChangedType.Remove,
					data:defenceTroop
				})
				defenceAllianceData.moonGateData.currentFightTroops = defenceAllianceDoc.moonGateData.currentFightTroops
			}
		}else if(_.isObject(attackAllianceDoc.moonGateData.currentFightTroops.our) && _.isObject(attackAllianceDoc.moonGateData.currentFightTroops.enemy)){
			var funcs = []
			var attackTroop = attackAllianceDoc.moonGateData.currentFightTroops.our
			var defenceTroop = attackAllianceDoc.moonGateData.currentFightTroops.enemy
			var attackFightReport = {
				ourPlayerId:attackTroop.id,
				ourPlayerName:attackTroop.name,
				enemyPlayerId:defenceTroop.id,
				enemyPlayerName:defenceTroop.name
			}
			var defenceFightReport = {
				ourPlayerId:defenceTroop.id,
				ourPlayerName:defenceTroop.name,
				enemyPlayerId:attackTroop.id,
				enemyPlayerName:attackTroop.name
			}

			funcs.push(self.playerDao.findByIdAsync(attackTroop.id, true))
			funcs.push(self.playerDao.findByIdAsync(defenceTroop.id, true))
			Promise.all(funcs).spread(function(attackPlayerDoc, defencePlayerDoc){
				if(!_.isObject(attackPlayerDoc)) return Promise.reject(new Error("玩家不存在"))
				if(!_.isObject(defencePlayerDoc)) return Promise.reject(new Error("玩家不存在"))

				var attackDragonType = attackTroop.dragon.type
				var attackDragonForFight = {
					type:attackTroop.dragon.type,
					strength:attackPlayerDoc.dragons[attackDragonType].strength,
					vitality:attackPlayerDoc.dragons[attackDragonType].vitality,
					hp:attackPlayerDoc.dragons[attackDragonType].hp
				}
				var defenceDragonType = defenceTroop.dragon.type
				var defenceDragonForFight = {
					type:defenceTroop.dragon.type,
					strength:defencePlayerDoc.dragons[defenceDragonType].strength,
					vitality:defencePlayerDoc.dragons[defenceDragonType].vitality,
					hp:defencePlayerDoc.dragons[attackDragonType].hp
				}
				var dragonFightResult = FightUtils.dragonToDragonFight(attackDragonForFight, defenceDragonForFight)
				var attackDragonType = attackTroop.dragon.type
				var defenceDragonType = defenceTroop.dragon.type
				var attackDragonHpDecreased = dragonFightResult.attackDragonHpDecreased
				var defenceDragonHpDecreased = dragonFightResult.defenceDragonHpDecreased
				var attackDragonHp = attackPlayerDoc.dragons[attackDragonType].hp
				var defenceDragonHp = defencePlayerDoc.dragons[defenceDragonType].hp
				attackFightReport.ourDragonFightData = {
					type:attackDragonType,
					hp:attackDragonHp,
					hpDecreased:attackDragonHpDecreased
				}
				attackFightReport.enemyDragonFightData = {
					type:defenceDragonType,
					hp:defenceDragonHp,
					hpDecreased:defenceDragonHpDecreased
				}
				defenceFightReport.ourDragonFightData = {
					type:defenceDragonType,
					hp:defenceDragonHp,
					hpDecreased:defenceDragonHpDecreased
				}
				defenceFightReport.enemyDragonFightData = {
					type:attackDragonType,
					hp:attackDragonHp,
					hpDecreased:attackDragonHpDecreased
				}

				attackPlayerDoc.dragons[attackDragonType].hp = attackDragonHp - attackDragonHpDecreased
				defencePlayerDoc.dragons[defenceDragonType].hp = defenceDragonHp - defenceDragonHpDecreased
				var attackPlayerData = {}
				attackPlayerData.dragons = {}
				attackPlayerData.dragons[attackDragonType] = attackPlayerDoc.dragons[attackDragonType]
				var defencePlayerData = {}
				defencePlayerData.dragons = {}
				defencePlayerData.dragons[defenceDragonType] = defencePlayerDoc.dragons[defenceDragonType]
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, defencePlayerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, defencePlayerDoc, defencePlayerData])

				var attackPlayerSoldiersForFight = []
				_.each(attackTroop.soldiers, function(soldier){
					if(DataUtils.hasNormalSoldier(soldier.name)){
						attackPlayerSoldiersForFight.push(DataUtils.createNormalSoldierForFight(attackPlayerDoc, soldier.name, 1, soldier.count))
					}else{
						attackPlayerSoldiersForFight.push(DataUtils.createSpecialSoldierForFight(attackPlayerDoc, soldier.name, soldier.count))
					}
				})
				var defencePlayerSoldiersForFight = []
				_.each(defenceTroop.soldiers, function(soldier){
					if(DataUtils.hasNormalSoldier(soldier.name)){
						defencePlayerSoldiersForFight.push(DataUtils.createNormalSoldierForFight(defencePlayerDoc, soldier.name, 1, soldier.count))
					}else{
						defencePlayerSoldiersForFight.push(DataUtils.createSpecialSoldierForFight(defencePlayerDoc, soldier.name, soldier.count))
					}
				})

				var attackTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(attackPlayerDoc)
				var defenceTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(defencePlayerDoc)
				var soldierFightResult = FightUtils.soldierToSoldierFight(attackPlayerSoldiersForFight, attackTreatSoldierPercent, defencePlayerSoldiersForFight, defenceTreatSoldierPercent)
				fightReport.ourSoldierRoundDatas = soldierFightResult.attackRoundDatas
				fightReport.enemySoldierRoundDatas = soldierFightResult.defenceRoundDatas
				LogicUtils.updateAllianceFightCurrentTroops(attackTroop, defenceTroop, soldierFightResult)

				if(_.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult || defencePlayerDoc.dragons[defenceDragonType].hp == 0)){

				}
				if(_.isEqual(Consts.FightResult.DefenceWin, soldierFightResult.fightResult || attackPlayerDoc.dragons[attackDragonType].hp == 0)){

				}
			})
		}


		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc, defenceAllianceData])
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}else if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && attackAllianceDoc.basicInfo.statusFinishTime <= Date.now()){
		var playerDocs = []
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
				eventFuncs.push([self, self.addAllianceTimeEventAsync, allianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
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
		Promise.all(funcs).then(function(){
			attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
			attackAllianceDoc.basicInfo.statusStartTime = Date.now()
			attackAllianceDoc.basicInfo.statusFinishTime = 0
			attackAllianceDoc.moonGateData = null
			attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
			attackAllianceData.moonGateData = null
			defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
			defenceAllianceDoc.basicInfo.statusStartTime = Date.now()
			defenceAllianceDoc.basicInfo.statusFinishTime = 0
			defenceAllianceDoc.moonGateData = {}
			defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo
			defenceAllianceData.moonGateData = {}
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
	}else{
		callback(new Error("联盟状态不合法"))
	}
}


var CreateResponse = function(updateFuncs, eventFuncs, pushFuncs){
	var response = {
		updateFuncs:updateFuncs,
		eventFuncs:eventFuncs,
		pushFuncs:pushFuncs
	}
	return response
}