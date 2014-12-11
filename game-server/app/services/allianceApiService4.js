"use strict"

/**
 * Created by modun on 14/12/10.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

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


var AllianceApiService4 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceApiService4
var pro = AllianceApiService4.prototype


/**
 * 联盟战月门挑战
 * @param playerId
 * @param callback
 */
pro.challengeMoonGateEnemyTroop = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var ourPlayerDoc = null
	var enemyPlayerDoc = null
	var ourPlayerData = {}
	var enemyPlayerData = {}
	var ourAllianceDoc = null
	var enemyAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var ourAllianceData = {}
	ourAllianceData.moonGateData = {}
	var enemyAllianceData = {}
	enemyAllianceData.moonGateData = {}
	var ourTroop = null
	var enemyTroop = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		ourPlayerDoc = doc
		if(!_.isObject(ourPlayerDoc.alliance) || _.isEmpty(ourPlayerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(ourPlayerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		ourAllianceDoc = doc
		if(!_.isEqual(ourAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟未处于战争期"))
		}
		ourTroop = LogicUtils.getPlayerTroopInOurMoonGate(ourAllianceDoc, playerId)
		if(!_.isObject(ourTroop)) return Promise.reject(new Error("玩家没有部队驻扎在月门"))
		if(!_.isArray(ourAllianceDoc.moonGateData.enemyTroops) || ourAllianceDoc.moonGateData.enemyTroops.length == 0){
			return Promise.reject(new Error("你脑壳被门夹了啊,敌对方没得部队驻扎在月门"))
		}
		var enemyTroops = ourAllianceDoc.moonGateData.enemyTroops
		enemyTroop = enemyTroops[(Math.random() * enemyTroops.length) << 0]
		var funcs = []
		funcs.push(self.playerDao.findByIdAsync(enemyTroop.id))
		funcs.push(self.allianceDao.findByIdAsync(ourAllianceDoc.moonGateData.enemyAlliance.id))
		return Promise.all(funcs)
	}).spread(function(doc1, doc2){
		if(!_.isObject(doc1)) return Promise.reject(new Error("玩家不存在"))
		if(!_.isObject(doc2)) return Promise.reject(new Error("联盟不存在"))
		enemyPlayerDoc = doc1
		enemyAllianceDoc = doc2
		var now = Date.now()
		var ourFightReport = {
			fightTime:now,
			ourPlayerId:ourTroop.id,
			ourPlayerName:ourTroop.name,
			enemyPlayerId:enemyTroop.id,
			enemyPlayerName:enemyTroop.name
		}
		var enemyFightReport = {
			fightTime:now,
			ourPlayerId:enemyTroop.id,
			ourPlayerName:enemyTroop.name,
			enemyPlayerId:ourTroop.id,
			enemyPlayerName:ourTroop.name
		}
		if(!_.isObject(ourAllianceDoc.moonGateData.fightReports)){
			ourAllianceDoc.moonGateData.fightReports = []
			enemyAllianceDoc.moonGateData.fightReports = []
		}
		ourAllianceDoc.moonGateData.fightReports.push(ourFightReport)
		enemyAllianceDoc.moonGateData.fightReports.push(enemyFightReport)
		ourAllianceData.moonGateData.__fightReports = [{
			type:Consts.DataChangedType.Add,
			data:ourFightReport
		}]
		enemyAllianceData.moonGateData.__fightReports = [{
			type:Consts.DataChangedType.Add,
			data:enemyFightReport
		}]

		var ourDragonType = ourTroop.dragon.type
		var ourDragonForFight = DataUtils.createDragonForFight(ourPlayerDoc, ourDragonType)
		var enemyDragonType = enemyTroop.dragon.type
		var enemyDragonForFight = DataUtils.createDragonForFight(enemyPlayerDoc, enemyDragonType)
		var ourSoldiersForFight = DataUtils.createSoldiersForFight(ourPlayerDoc, ourTroop.soldiers)
		var enemySoldiersForFight = DataUtils.createSoldiersForFight(enemyPlayerDoc, enemyTroop.soldiers)
		var dragonFightFixedEffect = null
		var dragonFightResult = null
		if(_.isEqual(ourAllianceDoc.moonGateData.activeBy, ourAllianceDoc._id)){
			dragonFightFixedEffect = DataUtils.getDragonFightFixedEffect(ourSoldiersForFight, enemySoldiersForFight)
			dragonFightResult = FightUtils.dragonToDragonFight(ourDragonForFight, enemyDragonForFight, dragonFightFixedEffect)
		}else{
			dragonFightFixedEffect = DataUtils.getDragonFightFixedEffect(enemySoldiersForFight, ourSoldiersForFight)
			dragonFightResult = FightUtils.dragonToDragonFight(enemyDragonForFight, ourDragonForFight, dragonFightFixedEffect)
		}
		var ourDragonHpDecreased = null
		var enemyDragonHpDecreased = null
		if(_.isEqual(ourAllianceDoc._id, ourAllianceDoc.moonGateData.activeBy)){
			ourDragonHpDecreased = dragonFightResult.attackDragonHpDecreased
			enemyDragonHpDecreased = dragonFightResult.defenceDragonHpDecreased
		}else{
			ourDragonHpDecreased = dragonFightResult.defenceDragonHpDecreased
			enemyDragonHpDecreased = dragonFightResult.attackDragonHpDecreased
		}
		var ourDragonHp = ourPlayerDoc.dragons[ourDragonType].hp
		var enemyDragonHp = enemyPlayerDoc.dragons[enemyDragonType].hp
		ourFightReport.ourDragonFightData = {
			type:ourDragonType,
			hp:ourDragonHp,
			hpDecreased:ourDragonHpDecreased
		}
		ourFightReport.enemyDragonFightData = {
			type:enemyDragonType,
			hp:enemyDragonHp,
			hpDecreased:enemyDragonHpDecreased
		}
		enemyFightReport.ourDragonFightData = ourFightReport.enemyDragonFightData
		enemyFightReport.enemyDragonFightData = ourFightReport.ourDragonFightData

		ourPlayerDoc.dragons[ourDragonType].hp = ourDragonHp - ourDragonHpDecreased
		enemyPlayerDoc.dragons[enemyDragonType].hp = enemyDragonHp - enemyDragonHpDecreased
		ourPlayerData.dragons = {}
		ourPlayerData.dragons[ourDragonType] = ourPlayerDoc.dragons[ourDragonType]
		enemyPlayerData.dragons = {}
		enemyPlayerData.dragons[enemyDragonType] = enemyPlayerDoc.dragons[enemyDragonType]

		var ourTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(ourPlayerDoc)
		var enemyTreatSoldierPercent = DataUtils.getPlayerDamagedSoldierToTreatSoldierPercent(enemyPlayerDoc)
		var soldierFightResult = null
		if(_.isEqual(ourAllianceDoc.moonGateData.activeBy, ourAllianceDoc._id)){
			soldierFightResult = FightUtils.soldierToSoldierFight(ourSoldiersForFight, ourTreatSoldierPercent, enemySoldiersForFight, enemyTreatSoldierPercent)
			DataUtils.updateAllianceMoonGateData(ourAllianceDoc.moonGateData.countData, ourTroop, enemyAllianceDoc.moonGateData.countData, enemyTroop, soldierFightResult)
			LogicUtils.refreshAllianceMoonGateDataCountData(ourAllianceDoc.moonGateData.countData, enemyAllianceDoc.moonGateData.countData)
			ourFightReport.ourSoldierRoundDatas = soldierFightResult.attackRoundDatas
			ourFightReport.enemySoldierRoundDatas = soldierFightResult.defenceRoundDatas
			enemyFightReport.ourSoldierRoundDatas = soldierFightResult.defenceRoundDatas
			enemyFightReport.enemySoldierRoundDatas = soldierFightResult.attackRoundDatas
		}else{
			soldierFightResult = FightUtils.soldierToSoldierFight(enemySoldiersForFight, enemyTreatSoldierPercent, ourSoldiersForFight, ourTreatSoldierPercent)
			DataUtils.updateAllianceMoonGateData(enemyAllianceDoc.moonGateData.countData, enemyTroop, ourAllianceDoc.moonGateData.countData, ourTroop, soldierFightResult)
			LogicUtils.refreshAllianceMoonGateDataCountData(enemyAllianceDoc.moonGateData.countData, ourAllianceDoc.moonGateData.countData)
			ourFightReport.ourSoldierRoundDatas = soldierFightResult.defenceRoundDatas
			ourFightReport.enemySoldierRoundDatas = soldierFightResult.attackRoundDatas
			enemyFightReport.ourSoldierRoundDatas = soldierFightResult.attackRoundDatas
			enemyFightReport.enemySoldierRoundDatas = soldierFightResult.defenceRoundDatas
		}

		if(_.isEqual(ourAllianceDoc.moonGateData.activeBy, ourAllianceDoc._id)){
			ourFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.OurWin : Consts.AllianceFightResult.EnemyWin
			enemyFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.EnemyWin : Consts.AllianceFightResult.OurWin
		}else{
			ourFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.EnemyWin : Consts.AllianceFightResult.OurWin
			enemyFightReport.fightResult = _.isEqual(Consts.FightResult.AttackWin, soldierFightResult.fightResult) ? Consts.AllianceFightResult.OurWin : Consts.AllianceFightResult.EnemyWin
		}
		ourAllianceData.moonGateData.countData = ourAllianceDoc.moonGateData.countData
		enemyAllianceData.moonGateData.countData = enemyAllianceDoc.moonGateData.countData

		var treatSoldiers = null
		var leftSoldiers = null
		var rewards = null
		var kill = null
		var dragon = null
		var marchReturnEvent = null
		enemyAllianceDoc.moonGateData.ourTroops = ourAllianceDoc.moonGateData.enemyTroops
		enemyAllianceDoc.moonGateData.enemyTroops = ourAllianceDoc.moonGateData.ourTroops
		if(_.isEqual(Consts.AllianceFightResult.OurWin, ourFightReport.fightResult) || enemyPlayerDoc.dragons[enemyDragonType].hp){
			LogicUtils.removeItemInArray(ourAllianceDoc.moonGateData.enemyTroops, enemyTroop)
			ourAllianceData.moonGateData.__enemyTroops = [{
				type:Consts.DataChangedType.Remove,
				data:enemyTroop
			}]
			enemyAllianceData.moonGateData.__ourTroops = ourAllianceData.moonGateData.__enemyTroops

			treatSoldiers = enemyTroop.treatSoldiers
			leftSoldiers = enemyTroop.soldiers
			rewards = enemyTroop.rewards
			kill = enemyTroop.kill
			dragon = enemyTroop.dragon
			marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(enemyPlayerDoc, enemyAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
			enemyAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
			enemyAllianceData.__moonGateMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, enemyAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		}
		if(_.isEqual(Consts.AllianceFightResult.EnemyWin, ourFightReport.fightResult) || ourPlayerDoc.dragons[ourDragonType].hp){
			LogicUtils.removeItemInArray(ourAllianceDoc.moonGateData.ourTroops, ourTroop)
			ourAllianceData.moonGateData.__ourTroops = [{
				type:Consts.DataChangedType.Remove,
				data:ourTroop
			}]
			enemyAllianceData.moonGateData.__enemyTroops = ourAllianceData.moonGateData.__ourTroops

			treatSoldiers = ourTroop.treatSoldiers
			leftSoldiers = ourTroop.soldiers
			rewards = ourTroop.rewards
			kill = ourTroop.kill
			dragon = ourTroop.dragon
			marchReturnEvent = LogicUtils.createAllianceMoonGateMarchReturnEvent(ourPlayerDoc, ourAllianceDoc, dragon.type, leftSoldiers, treatSoldiers, rewards, kill)
			ourAllianceDoc.moonGateMarchReturnEvents.push(marchReturnEvent)
			ourAllianceData.__moonGateMarchReturnEvents = [{
				type:Consts.DataChangedType.Add,
				data:marchReturnEvent
			}]
			eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, ourAllianceDoc, "moonGateMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, ourPlayerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, enemyPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, ourPlayerDoc, ourPlayerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, enemyPlayerDoc, enemyPlayerData])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, ourAllianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, ourAllianceDoc, ourAllianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
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
		if(_.isObject(ourPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(ourPlayerDoc._id))
		}
		if(_.isObject(enemyPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(enemyPlayerDoc._id))
		}
		if(_.isObject(ourAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(ourAllianceDoc._id))
		}
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

/**
 * 获取联盟可视化数据
 * @param playerId
 * @param targetAllianceId
 * @param includeMoonGateData
 * @param callback
 */
pro.getAllianceViewData = function(playerId, targetAllianceId, includeMoonGateData, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(targetAllianceId)){
		callback(new Error("targetAllianceId 不合法"))
		return
	}
	if(!_.isBoolean(includeMoonGateData)){
		callback(new Error("includeMoonGateData 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		return self.allianceDao.findByIdAsync(targetAllianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceViewDataSuccessAsync, playerDoc, allianceDoc, includeMoonGateData])
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
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
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
 * 查看战力相近的3个联盟的数据
 * @param playerId
 * @param callback
 */
pro.getNearedAllianceInfos = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		var funcs = []
		funcs.push(self.allianceDao.getModel().find({"basicInfo.power":{$lt:allianceDoc.basicInfo.power}}).sort({"basicInfo.power": -1}).limit(3).exec())
		funcs.push(self.allianceDao.getModel().find({"basicInfo.power":{$gt:allianceDoc.basicInfo.power}}).sort({"basicInfo.power": 1}).limit(3).exec())
		return Promise.all(funcs)
	}).spread(function(docsSmall, docsBig){
		var allianceDocs = []
		allianceDocs.push(allianceDoc)
		allianceDocs.concat(docsSmall)
		allianceDocs.concat(docsBig)
		pushFuncs.push([self.pushService, self.pushService.onGetNearedAllianceInfosSuccessAsync, playerDoc, allianceDocs])
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
 * 根据Tag搜索联盟战斗数据
 * @param playerId
 * @param tag
 * @param callback
 */
pro.searchAllianceInfoByTag = function(playerId, tag, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.searchByIndexAsync("basicInfo.tag", tag))
		return Promise.all(funcs)
	}).spread(function(tmp, docs){
		return self.pushService.onSearchAllianceInfoByTagSuccessAsync(playerDoc, docs)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			self.playerDao.removeLockByIdAsync(playerDoc._id).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 协助联盟其他玩家防御
 * @param playerId
 * @param dragonType
 * @param soldiers
 * @param targetPlayerId
 * @param callback
 */
pro.helpAllianceMemberDefence = function(playerId, dragonType, soldiers, targetPlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}
	if(!_.isString(targetPlayerId)){
		callback(new Error("targetPlayerId 不合法"))
		return
	}
	if(_.isEqual(playerId, targetPlayerId)){
		callback(new Error("不能对自己协防"))
		return
	}

	var self = this
	var playerDoc = null
	var targetPlayerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var playerData = {}
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		dragon.status = Consts.DragonStatus.March
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
		if(!LogicUtils.isMarchSoldierLegal(playerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		playerData.soldiers = {}
		_.each(soldiers, function(soldier){
			soldier.star = 1
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(LogicUtils.isPlayerHasTroopHelpedPlayer(allianceDoc, playerDoc, targetPlayerId)) return Promise.reject(new Error("玩家已经对目标玩家派出了协防部队"))
		return self.playerDao.findByIdAsync(targetPlayerId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		targetPlayerDoc = doc
		if(DataUtils.isAlliancePlayerBeHelpedTroopsReachMax(allianceDoc, targetPlayerDoc)) return Promise.reject(new Error("目标玩家协防部队数量已达最大"))
		var event = LogicUtils.createHelpDefenceMarchEvent(playerDoc, allianceDoc, dragonType, soldiers, targetPlayerDoc)
		allianceDoc.helpDefenceMarchEvents.push(event)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, targetPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "helpDefenceMarchEvents", event.id, event.arriveTime])
		allianceData.__helpDefenceMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(targetPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(targetPlayerDoc._id))
		}
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
 * 从被协防的联盟成员城市撤兵
 * @param playerId
 * @param targetPlayerId
 * @param callback
 */
pro.retreatFromHelpedAllianceMember = function(playerId, targetPlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var targetPlayerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var playerData = {}
	var targetPlayerData = {}
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!LogicUtils.isPlayerHasHelpedTroopInAllianceMember(playerDoc, targetPlayerId)) return Promise.reject(new Error("玩家没有协防部队驻扎在目标玩家城市"))
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(playerDoc.alliance.id))
		funcs.push(self.playerDao.findByIdAsync(targetPlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		allianceDoc = doc_1
		targetPlayerDoc = doc_2
		var helpTroop = _.find(targetPlayerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, playerId)
		})
		LogicUtils.removeItemInArray(targetPlayerDoc.helpedByTroops, helpTroop)
		targetPlayerData.__helpedByTroops = {
			type:Consts.DataChangedType.Remove,
			data:helpTroop
		}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, targetPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, targetPlayerDoc, targetPlayerData])

		var helpToTroop = _.find(playerDoc.helpToTroops, function(troop){
			return _.isEqual(troop.targetPlayerData.id, targetPlayerDoc._id)
		})
		LogicUtils.removeItemInArray(playerDoc.helpToTroops, helpToTroop)
		playerData.__helpToTroops = [{
			type:Consts.DataChangedType.Remove,
			data:helpToTroop
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		var targetMemberInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, targetPlayerDoc._id)
		targetMemberInAlliance.helpTroopsCount -= 1
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:targetMemberInAlliance
		}]

		var marchReturnEvent = LogicUtils.createAllianceHelpFightMarchReturnEvent(playerDoc, targetPlayerDoc, allianceDoc, helpTroop.dragon.type, helpTroop.soldiers, [], [], 0)
		allianceDoc.helpDefenceMarchReturnEvents.push(marchReturnEvent)
		allianceData.__helpDefenceMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:marchReturnEvent
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc, allianceData])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "helpDefenceMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(targetPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(targetPlayerDoc._id))
		}
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
 * 突袭玩家城市
 * @param playerId
 * @param dragonType
 * @param enemyPlayerId
 * @param callback
 */
pro.strikePlayerCity = function(playerId, dragonType, enemyPlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isString(enemyPlayerId)){
		callback(new Error("enemyPlayerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var enemyPlayerDoc = null
	var enemyPlayerData = {}
	var allianceDoc = null
	var allianceData = {}
	var enemyAllianceDoc = null
	var enemyAllianceData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟未处于战争期"))
		}
		if(!_.isEqual(allianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
			return Promise.reject(new Error("占领月门后才能突袭玩家城市"))
		}
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(allianceDoc.moonGateData.enemyAlliance.id))
		funcs.push(self.playerDao.findByIdAsync(enemyPlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		enemyAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		enemyPlayerDoc = doc_2
		if(!_.isObject(LogicUtils.getAllianceMemberById(enemyAllianceDoc, enemyPlayerId))) return Promise.reject(new Error("玩家不在敌对联盟中"))

		LogicUtils.refreshPlayerResources(enemyPlayerDoc)
		var playerDragon = playerDoc.dragons[dragonType]
		var enemyPlayerDragon = LogicUtils.getPlayerDefenceDragon(enemyPlayerDoc)
		var params = ReportUtils.createDragonStrikeCityReport(playerDoc, playerDragon, enemyAllianceDoc, enemyPlayerDoc, enemyPlayerDragon)
		var reportForPlayer = params.reportForPlayer
		var reportForEnemyPlayer = params.reportForEnemyPlayer
		var strikeReport = reportForPlayer.strikeCity
		playerDragon.hp -= strikeReport.playerData.dragon.hpDecreased
		playerDoc.resources.coin += strikeReport.playerData.coinGet
		playerData.resources = playerDoc.resources
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDragon
		playerData.__reports = []
		var willRemovedReport = null
		if(playerDoc.reports.length >= Define.PlayerReportsMaxSize){
			willRemovedReport = LogicUtils.getPlayerFirstUnSavedReport(playerDoc)
			LogicUtils.removeItemInArray(playerDoc.reports, willRemovedReport)
			playerData.__reports.push({
				type:Consts.DataChangedType.Remove,
				data:willRemovedReport
			})
			if(!!willRemovedReport.isSaved){
				playerData.__savedReports = [{
					type:Consts.DataChangedType.Remove,
					data:willRemovedReport
				}]
			}
		}
		playerDoc.reports.push(reportForPlayer)
		playerData.__reports.push({
			type:Consts.DataChangedType.Add,
			data:reportForPlayer
		})
		enemyPlayerDoc.resources.coin -= strikeReport.playerData.coinGet
		enemyPlayerData.basicInfo = enemyPlayerDoc.basicInfo
		enemyPlayerData.resources = enemyPlayerDoc.resources
		if(_.isObject(enemyPlayerDragon)){
			enemyPlayerDragon.hp -= strikeReport.enemyPlayerData.dragon.hpDecreased
			if(enemyPlayerDragon.hp == 0) enemyPlayerDragon.status = Consts.DragonStatus.Free
			enemyPlayerData.dragons = []
			enemyPlayerData.dragons[dragonType] = enemyPlayerDragon
		}
		enemyPlayerData.__reports = []
		if(enemyPlayerDoc.reports.length >= Define.PlayerReportsMaxSize){
			willRemovedReport = LogicUtils.getPlayerFirstUnSavedReport(enemyPlayerDoc)
			LogicUtils.removeItemInArray(enemyPlayerDoc.reports, willRemovedReport)
			enemyPlayerData.__reports.push({
				type:Consts.DataChangedType.Remove,
				data:willRemovedReport
			})
			if(!!willRemovedReport.isSaved){
				enemyPlayerData.__savedReports = [{
					type:Consts.DataChangedType.Remove,
					data:willRemovedReport
				}]
			}
		}
		enemyPlayerDoc.reports.push(reportForEnemyPlayer)
		enemyPlayerData.__reports.push({
			type:Consts.DataChangedType.Add,
			data:reportForEnemyPlayer
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, enemyPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, enemyPlayerDoc, enemyPlayerData])

		allianceDoc.moonGateData.countData.our.strikeCount += 1
		enemyAllianceDoc.moonGateData.countData.enemy.strikeCount += 1
		allianceData.moonGateData = {}
		allianceData.moonGateData.countData = {}
		allianceData.moonGateData.countData.our = allianceDoc.moonGateData.countData.our
		enemyAllianceData.moonGateData = {}
		enemyAllianceData.moonGateData.countData = {}
		enemyAllianceData.moonGateData.countData.our = enemyAllianceDoc.moonGateData.countData.our
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
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
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(enemyPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(enemyPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
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

/**
 * 进攻玩家城市
 * @param playerId
 * @param enemyPlayerId
 * @param callback
 */
pro.attackPlayerCity = function(playerId, enemyPlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(enemyPlayerId)){
		callback(new Error("enemyPlayerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var enemyPlayerDoc = null
	var allianceDoc = null
	var allianceData = {}
	var enemyAllianceDoc = null
	var enemyAllianceData = {}
	var playerTroop = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟未处于战争期"))
		}
		if(!_.isEqual(allianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
			return Promise.reject(new Error("占领月门后才能进攻玩家城市"))
		}
		playerTroop = _.find(allianceDoc.moonGateData.ourTroops, function(troop){
			return _.isEqual(troop.id, playerId)
		})
		if(!_.isObject(playerTroop)) return Promise.reject(new Error("玩家没有部队驻扎在月门"))
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(allianceDoc.moonGateData.enemyAlliance.id))
		funcs.push(self.playerDao.findByIdAsync(enemyPlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		enemyAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		enemyPlayerDoc = doc_2
		if(!_.isObject(LogicUtils.getAllianceMemberById(enemyAllianceDoc, enemyPlayerId))) return Promise.reject(new Error("玩家不在敌对联盟中"))

		var event = LogicUtils.createAttackPlayerCityMarchEvent(playerDoc, playerTroop, enemyAllianceDoc, enemyPlayerDoc)
		allianceDoc.attackCityMarchEvents.push(event)
		enemyAllianceDoc.cityBeAttackedMarchEvents.push(event)
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackCityMarchEvents", event.id, event.arriveTime])
		allianceData.__attackCityMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		enemyAllianceData.__cityBeAttackedMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		LogicUtils.removeItemInArray(allianceDoc.moonGateData.ourTroops, playerTroop)
		allianceData.moonGateData = {}
		allianceData.moonGateData.__ourTroops = [{
			type:Consts.DataChangedType.Remove,
			data:playerTroop
		}]

		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, enemyPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
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
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(enemyPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(enemyPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
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

/**
 * 侦查村落
 * @param playerId
 * @param dragonType
 * @param targetAllianceId
 * @param targetVillageId
 * @param callback
 */
pro.strikeVillage = function(playerId, dragonType, targetAllianceId, targetVillageId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isString(targetAllianceId)){
		callback(new Error("targetAllianceId 不合法"))
		return
	}
	if(!_.isString(targetVillageId)){
		callback(new Error("targetVillageId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var enemyPlayerDoc = null
	var enemyPlayerData = {}
	var allianceDoc = null
	var allianceData = {}
	var enemyAllianceDoc = null
	var enemyAllianceData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		if(!_.isEqual(allianceDoc._id, targetAllianceId)){
			if(!_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(new Error("联盟未处于战争期"))
			}
			if(!_.isEqual(allianceDoc.moonGateData.moonGateOwner, Consts.AllianceMoonGateOwner.Our)){
				return Promise.reject(new Error("占领月门后才能突袭敌方村落"))
			}
			if(!_.isEqual(allianceDoc.moonGateData.enemyAlliance.id, targetAllianceId)){
				return Promise.reject(new Error("目标联盟非敌对联盟或我方联盟"))
			}
		}

		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(allianceDoc.moonGateData.enemyAlliance.id))
		funcs.push(self.playerDao.findByIdAsync(enemyPlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		enemyAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		enemyPlayerDoc = doc_2
		if(!_.isObject(LogicUtils.getAllianceMemberById(enemyAllianceDoc, enemyPlayerId))) return Promise.reject(new Error("玩家不在敌对联盟中"))

		LogicUtils.refreshPlayerResources(enemyPlayerDoc)
		var playerDragon = playerDoc.dragons[dragonType]
		var enemyPlayerDragon = LogicUtils.getPlayerDefenceDragon(enemyPlayerDoc)
		var params = ReportUtils.createDragonStrikeCityReport(playerDoc, playerDragon, enemyAllianceDoc, enemyPlayerDoc, enemyPlayerDragon)
		var reportForPlayer = params.reportForPlayer
		var reportForEnemyPlayer = params.reportForEnemyPlayer
		var strikeReport = reportForPlayer.strikeCity
		playerDragon.hp -= strikeReport.playerData.dragon.hpDecreased
		playerDoc.resources.coin += strikeReport.playerData.coinGet
		playerData.resources = playerDoc.resources
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDragon
		playerData.__reports = []
		var willRemovedReport = null
		if(playerDoc.reports.length >= Define.PlayerReportsMaxSize){
			willRemovedReport = LogicUtils.getPlayerFirstUnSavedReport(playerDoc)
			LogicUtils.removeItemInArray(playerDoc.reports, willRemovedReport)
			playerData.__reports.push({
				type:Consts.DataChangedType.Remove,
				data:willRemovedReport
			})
			if(!!willRemovedReport.isSaved){
				playerData.__savedReports = [{
					type:Consts.DataChangedType.Remove,
					data:willRemovedReport
				}]
			}
		}
		playerDoc.reports.push(reportForPlayer)
		playerData.__reports.push({
			type:Consts.DataChangedType.Add,
			data:reportForPlayer
		})
		enemyPlayerDoc.resources.coin -= strikeReport.playerData.coinGet
		enemyPlayerData.basicInfo = enemyPlayerDoc.basicInfo
		enemyPlayerData.resources = enemyPlayerDoc.resources
		if(_.isObject(enemyPlayerDragon)){
			enemyPlayerDragon.hp -= strikeReport.enemyPlayerData.dragon.hpDecreased
			if(enemyPlayerDragon.hp == 0) enemyPlayerDragon.status = Consts.DragonStatus.Free
			enemyPlayerData.dragons = []
			enemyPlayerData.dragons[dragonType] = enemyPlayerDragon
		}
		enemyPlayerData.__reports = []
		if(enemyPlayerDoc.reports.length >= Define.PlayerReportsMaxSize){
			willRemovedReport = LogicUtils.getPlayerFirstUnSavedReport(enemyPlayerDoc)
			LogicUtils.removeItemInArray(enemyPlayerDoc.reports, willRemovedReport)
			enemyPlayerData.__reports.push({
				type:Consts.DataChangedType.Remove,
				data:willRemovedReport
			})
			if(!!willRemovedReport.isSaved){
				enemyPlayerData.__savedReports = [{
					type:Consts.DataChangedType.Remove,
					data:willRemovedReport
				}]
			}
		}
		enemyPlayerDoc.reports.push(reportForEnemyPlayer)
		enemyPlayerData.__reports.push({
			type:Consts.DataChangedType.Add,
			data:reportForEnemyPlayer
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, enemyPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, enemyPlayerDoc, enemyPlayerData])

		allianceDoc.moonGateData.countData.our.strikeCount += 1
		enemyAllianceDoc.moonGateData.countData.enemy.strikeCount += 1
		allianceData.moonGateData = {}
		allianceData.moonGateData.countData = {}
		allianceData.moonGateData.countData.our = allianceDoc.moonGateData.countData.our
		enemyAllianceData.moonGateData = {}
		enemyAllianceData.moonGateData.countData = {}
		enemyAllianceData.moonGateData.countData.our = enemyAllianceDoc.moonGateData.countData.our
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, enemyAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData])
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
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(enemyPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(enemyPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
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