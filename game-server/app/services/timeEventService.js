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
 * @param ourAllianceDoc
 * @param enemyAllianceDoc
 * @param finishTime
 * @param callback
 */
pro.addAllianceFightTimeEvent = function(ourAllianceDoc, enemyAllianceDoc, finishTime, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = ourAllianceDoc._id + ":" + enemyAllianceDoc._id
	this.addTimeEvent(key, eventType, eventId, finishTime, callback)
}

/**
 * 更新联盟战斗时间回调
 * @param ourAllianceDoc
 * @param enemyAllianceDoc
 * @param newFinishTime
 * @param callback
 */
pro.updateAllianceFightTimeEvent = function(ourAllianceDoc, enemyAllianceDoc, newFinishTime, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventId = ourAllianceDoc._id + ":" + enemyAllianceDoc._id
	this.updateTimeEvent(key, eventId, newFinishTime, callback)
}

/**
 * 移除联盟战斗时间回调
 * @param ourAllianceDoc
 * @param enemyAllianceDoc
 * @param callback
 */
pro.removeAllianceFightTimeEvent = function(ourAllianceDoc, enemyAllianceDoc, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventId = ourAllianceDoc._id + ":" + enemyAllianceDoc._id
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
			var treatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(null)
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
 * @param ourAllianceDoc
 * @param event
 * @param callback
 */
pro.onMoonGateMarchEvents = function(ourAllianceDoc, event, callback){
	var self = this
	var enemyAllianceDoc = null
	var ourAllianceData = {}
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
			var marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(playerDoc, ourAllianceDoc, event.playerData.dragon.type, event.playerSoldiers, [], [], 0)
			ourAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
			ourAllianceData.__moonGateMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
			eventFuncs.push([self, self.addAllianceTimeEventAsync, ourAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
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
		self.allianceDao.findByIdAsync(ourAllianceDoc.moonGateData.enemyAllianceId, true).then(function(doc){
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
			if(!_.isArray(ourAllianceDoc.moonGateData.ourTroops)) ourAllianceDoc.moonGateData.ourTroops = []
			ourAllianceDoc.moonGateData.ourTroops.push(ourTroop)
			ourAllianceData.moonGateData = {}
			ourAllianceData.moonGateData.__ourTroops = [{
				type:Consts.DataChangedType.Add,
				data:ourTroop
			}]
			if(!_.isArray(enemyAllianceDoc.moonGateData.enemyTroops)) enemyAllianceDoc.moonGateData.enemyTroops = []
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
 * @param ourAllianceDoc
 * @param enemyAllianceDoc
 * @param callback
 */
pro.onAllianceFightStatusChanged = function(ourAllianceDoc, enemyAllianceDoc, callback){
	var self = this
	var ourAllianceData = {}
	var enemyAllianceData = {}
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	if(_.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare)){
		ourAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
		ourAllianceDoc.basicInfo.statusStartTime = Date.now()
		ourAllianceDoc.basicInfo.statusFinishTime = Date.now() + DataUtils.getAllianceFightTotalFightTime()
		ourAllianceData.basicInfo = ourAllianceDoc.basicInfo
		enemyAllianceDoc.basicInfo.status = Consts.AllianceStatus.Fight
		enemyAllianceDoc.basicInfo.statusStartTime = Date.now()
		enemyAllianceDoc.basicInfo.statusFinishTime = Date.now() + DataUtils.getAllianceFightTotalFightTime()
		enemyAllianceData.basicInfo = enemyAllianceDoc.basicInfo
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, ourAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc, true])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
		eventFuncs.push([self, self.addAllianceFightTimeEventAsync, ourAllianceDoc, enemyAllianceDoc, Date.now() + (5 * 1000)])
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}else if(_.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && ourAllianceDoc.basicInfo.statusFinishTime > Date.now()){
		var nextFightTime = Date.now() + DataUtils.getAllianceFightSecondsPerFight()
		eventFuncs.push([self, self.addAllianceFightTimeEventAsync, ourAllianceDoc, enemyAllianceDoc, nextFightTime])

		ourAllianceData.moonGateData = {}
		ourAllianceData.moonGateData.__ourTroops = []
		ourAllianceData.moonGateData.__enemyTroops = []
		enemyAllianceData.moonGateData = {}
		enemyAllianceData.moonGateData.__ourTroops = []
		enemyAllianceData.moonGateData.__enemyTroops = []

		if(!_.isObject(ourAllianceDoc.moonGateData.currentFightTroops)){
			ourAllianceDoc.moonGateData.currentFightTroops = {}
			enemyAllianceDoc.moonGateData.currentFightTroops = {}
			if(_.isArray(ourAllianceDoc.moonGateData.ourTroops) && ourAllianceDoc.moonGateData.ourTroops.length > 0){
				var ourTroop = ourAllianceDoc.moonGateData.ourTroops[0]
				var ourCurrentFightTroop = {
					id:ourTroop.id,
					name:ourTroop.name,
					winCount:0,
					dragon:ourTroop.dragon,
					soldiers:ourTroop.soldiers,
					treatSoldiers:ourTroop.treatSoldiers,
					rewards:ourTroop.rewards,
					kill:ourTroop.kill
				}
				ourAllianceDoc.moonGateData.currentFightTroops.our = ourCurrentFightTroop
				ourAllianceDoc.moonGateData.ourTroops.splice(0, 1)
				enemyAllianceDoc.moonGateData.currentFightTroops.enemy = ourCurrentFightTroop
				enemyAllianceDoc.moonGateData.enemyTroops.splice(0, 1)
				ourAllianceData.moonGateData.__ourTroops.push({
					type:Consts.DataChangedType.Remove,
					data:ourTroop
				})
				ourAllianceData.moonGateData.currentFightTroops = ourAllianceDoc.moonGateData.currentFightTroops
				enemyAllianceData.moonGateData.__enemyTroops.push({
					type:Consts.DataChangedType.Remove,
					data:ourTroop
				})
				enemyAllianceData.moonGateData.currentFightTroops = enemyAllianceDoc.moonGateData.currentFightTroops
			}
			if(_.isArray(ourAllianceDoc.moonGateData.enemyTroops) && ourAllianceDoc.moonGateData.enemyTroops.length > 0){
				var enemyTroop = ourAllianceDoc.moonGateData.enemyTroops[0]
				var enemyCurrentFightTroop = {
					id:enemyTroop.id,
					name:enemyTroop.name,
					winCount:0,
					dragon:enemyTroop.dragon,
					soldiers:enemyTroop.soldiers,
					treatSoldiers:enemyTroop.treatSoldiers,
					rewards:enemyTroop.rewards,
					kill:enemyTroop.kill
				}
				ourAllianceDoc.moonGateData.currentFightTroops.enemy = enemyCurrentFightTroop
				ourAllianceDoc.moonGateData.enemyTroops.splice(0, 1)
				enemyAllianceDoc.moonGateData.currentFightTroops.our = enemyCurrentFightTroop
				enemyAllianceDoc.moonGateData.ourTroops.splice(0, 1)
				ourAllianceData.moonGateData.__enemyTroops.push({
					type:Consts.DataChangedType.Remove,
					data:enemyTroop
				})
				ourAllianceData.moonGateData.currentFightTroops = ourAllianceDoc.moonGateData.currentFightTroops
				enemyAllianceData.moonGateData.__ourTroops.push({
					type:Consts.DataChangedType.Remove,
					data:enemyTroop
				})
				enemyAllianceData.moonGateData.currentFightTroops = enemyAllianceDoc.moonGateData.currentFightTroops
			}
		}else if(_.isObject(ourAllianceDoc.moonGateData.currentFightTroops.our) && _.isObject(ourAllianceDoc.moonGateData.currentFightTroops.enemy)){
			var funcs = []
			var ourTroop = ourAllianceDoc.moonGateData.currentFightTroops.our
			var enemyTroop = ourAllianceDoc.moonGateData.currentFightTroops.enemy
			funcs.push(self.playerDao.findByIdAsync(ourTroop.id, true))
			funcs.push(self.playerDao.findByIdAsync(enemyTroop.id, true))
			Promise.all(funcs).spread(function(ourPlayerDoc, enemyPlayerDoc){
				if(!_.isObject(ourPlayerDoc)) return Promise.reject(new Error("玩家不存在"))
				if(!_.isObject(enemyPlayerDoc)) return Promise.reject(new Error("玩家不存在"))



				var ourPlayerSoldiersForFight = []
				_.each(ourTroop.soldiers, function(soldier){
					if(DataUtils.hasNormalSoldier(soldier.name)){
						ourPlayerSoldiersForFight.push(DataUtils.createNormalSoldierForFight(ourPlayerDoc, soldier.name, 1, soldier.count))
					}else{
						ourPlayerSoldiersForFight.push(DataUtils.createSpecialSoldierForFight(ourPlayerDoc, soldier.name, soldier.count))
					}
				})
				var ourPlayerTroopForFight = {
					id:playerTroop.id,
					name:playerTroop.name,
					soldiers:ourPlayerSoldiersForFight
				}
				var enemyPlayerSoldiersForFight = []
				_.each(enemyTroop.soldiers, function(soldier){
					if(DataUtils.hasNormalSoldier(soldier.name)){
						enemyPlayerSoldiersForFight.push(DataUtils.createNormalSoldierForFight(enemyPlayerDoc, soldier.name, 1, soldier.count))
					}else{
						enemyPlayerSoldiersForFight.push(DataUtils.createSpecialSoldierForFight(enemyPlayerDoc, soldier.name, soldier.count))
					}
				})
				var enemyPlayerTroopForFight = {
					id:playerTroop.id,
					name:playerTroop.name,
					soldiers:enemyPlayerSoldiersForFight
				}


			})
		}


		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, ourAllianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
		callback(null, CreateResponse(updateFuncs, eventFuncs, pushFuncs))
	}else if(_.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight) && ourAllianceDoc.basicInfo.statusFinishTime <= Date.now()){
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
		_.each(ourAllianceDoc.moonGateData.ourTroops, function(playerTroop){
			funcs.push(createReturnEvent(playerTroop, ourAllianceDoc, ourAllianceData))
		})
		_.each(ourAllianceDoc.moonGateData.enemyTroops, function(playerTroop){
			funcs.push(createReturnEvent(playerTroop, enemyAllianceDoc, enemyAllianceData))
		})
		Promise.all(funcs).then(function(){
			ourAllianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
			ourAllianceDoc.basicInfo.statusStartTime = Date.now()
			ourAllianceDoc.basicInfo.statusFinishTime = 0
			ourAllianceDoc.moonGateData = null
			ourAllianceData.basicInfo = ourAllianceDoc.basicInfo
			ourAllianceData.moonGateData = null
			enemyAllianceDoc.basicInfo.status = Consts.AllianceStatus.Peace
			enemyAllianceDoc.basicInfo.statusStartTime = Date.now()
			enemyAllianceDoc.basicInfo.statusFinishTime = 0
			enemyAllianceDoc.moonGateData = {}
			enemyAllianceData.basicInfo = enemyAllianceDoc.basicInfo
			enemyAllianceData.moonGateData = {}
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, ourAllianceDoc, true])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc, true])
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