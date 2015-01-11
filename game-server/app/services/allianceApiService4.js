"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
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
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceApiService4
var pro = AllianceApiService4.prototype

/**
 * 获取联盟可视化数据
 * @param playerId
 * @param targetAllianceId
 * @param callback
 */
pro.getAllianceViewData = function(playerId, targetAllianceId, callback){
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
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceViewDataSuccessAsync, playerDoc, allianceDoc])
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
		if(!LogicUtils.isPlayerMarchSoldiersLegal(playerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(playerDoc, dragon, soldiers)) return Promise.reject(new Error("所选择的龙领导力不足"))
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
		var event = MarchUtils.createHelpDefenceMarchEvent(allianceDoc, playerDoc, playerDoc.dragons[dragonType], soldiers, targetPlayerDoc)
		allianceDoc.attackMarchEvents.push(event)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, targetPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", event.id, event.arriveTime])
		allianceData.__attackMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
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
 * @param beHelpedPlayerId
 * @param callback
 */
pro.retreatFromBeHelpedAllianceMember = function(playerId, beHelpedPlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(beHelpedPlayerId)){
		callback(new Error("beHelpedPlayerId 不合法"))
		return
	}
	if(_.isEqual(playerId, beHelpedPlayerId)){
		callback(new Error("不能从自己的城市撤销协防部队"))
		return
	}

	var self = this
	var playerDoc = null
	var beHelpedPlayerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var playerData = {}
	var beHelpedPlayerData = {}
	var allianceData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!LogicUtils.isPlayerHasHelpedTroopInAllianceMember(playerDoc, beHelpedPlayerId)) return Promise.reject(new Error("玩家没有协防部队驻扎在目标玩家城市"))
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(playerDoc.alliance.id))
		funcs.push(self.playerDao.findByIdAsync(beHelpedPlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		allianceDoc = doc_1
		beHelpedPlayerDoc = doc_2
		var helpedByTroop = _.find(beHelpedPlayerDoc.helpedByTroops, function(helpedByTroop){
			return _.isEqual(helpedByTroop.id, playerId)
		})
		LogicUtils.removeItemInArray(beHelpedPlayerDoc.helpedByTroops, helpedByTroop)
		beHelpedPlayerData.__helpedByTroops = [{
			type:Consts.DataChangedType.Remove,
			data:helpedByTroop
		}]

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, beHelpedPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])

		var helpToTroop = _.find(playerDoc.helpToTroops, function(helpToTroop){
			return _.isEqual(helpToTroop.beHelpedPlayerData.id, beHelpedPlayerId)
		})
		LogicUtils.removeItemInArray(playerDoc.helpToTroops, helpToTroop)
		playerData.__helpToTroops = [{
			type:Consts.DataChangedType.Remove,
			data:helpToTroop
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		var targetMemberInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerId)
		targetMemberInAlliance.helpedByTroopsCount -= 1
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:targetMemberInAlliance
		}]

		var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(allianceDoc, playerDoc, beHelpedPlayerDoc, helpedByTroop.dragon, helpedByTroop.soldiers, [], helpedByTroop.rewards)
		allianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		allianceData.__attackMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:marchReturnEvent
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc, allianceData])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
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
		if(_.isObject(beHelpedPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(beHelpedPlayerDoc._id))
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
 * @param defencePlayerId
 * @param callback
 */
pro.strikePlayerCity = function(playerId, dragonType, defencePlayerId, callback){
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
	if(!_.isString(defencePlayerId)){
		callback(new Error("defencePlayerId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var attackAllianceDoc = null
	var attackAllianceData = {}
	var defencePlayerDoc = null
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance) || _.isEmpty(attackPlayerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.dragons = {}
		attackPlayerData.dragons[dragonType] = attackPlayerDoc.dragons[dragonType]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
		return self.allianceDao.findByIdAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		attackAllianceDoc = doc
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟未处于战争期"))
		}
		var allianceFightData = attackAllianceDoc.allianceFight
		var defenceAllianceId = _.isEqual(attackAllianceDoc._id, allianceFightData.attackAllianceId) ? allianceFightData.defenceAllianceId : allianceFightData.attackAllianceId
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(defenceAllianceId))
		funcs.push(self.playerDao.findByIdAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		defencePlayerDoc = doc_2
		var memberInDefenceAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(memberInDefenceAlliance)) return Promise.reject(new Error("玩家不在敌对联盟中"))
		if(memberInDefenceAlliance.isProtected) return Promise.reject(new Error("玩家处于保护状态,不能突袭"))
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, defencePlayerDoc._id])
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.__members = [{
				type:Consts.DataChangedType.Edit,
				data:memberInAlliance
			}]
		}
		var event = MarchUtils.createStrikePlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.strikeMarchEvents.push(event)
		attackAllianceData.__strikeMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
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
 * 进攻玩家城市
 * @param playerId
 * @param dragonType
 * @param soldiers
 * @param defencePlayerId
 * @param callback
 */
pro.attackPlayerCity = function(playerId, dragonType, soldiers, defencePlayerId, callback){
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
	if(!_.isString(defencePlayerId)){
		callback(new Error("defencePlayerId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var attackAllianceDoc = null
	var attackAllianceData = {}
	var defencePlayerDoc = null
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance) || _.isEmpty(attackPlayerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.dragons = {}
		attackPlayerData.dragons[dragonType] = attackPlayerDoc.dragons[dragonType]
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(new Error("所选择的龙领导力不足"))
		attackPlayerData.soldiers = {}
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.soldiers[soldier.name] = attackPlayerDoc.soldiers[soldier.name]
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
		return self.allianceDao.findByIdAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		attackAllianceDoc = doc
		if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟未处于战争期"))
		}
		var allianceFightData = attackAllianceDoc.allianceFight
		var defenceAllianceId = _.isEqual(attackAllianceDoc._id, allianceFightData.attackAllianceId) ? allianceFightData.defenceAllianceId : allianceFightData.attackAllianceId
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(defenceAllianceId))
		funcs.push(self.playerDao.findByIdAsync(defencePlayerId))
		return Promise.all(funcs)
	}).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("联盟不存在"))
		defenceAllianceDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(new Error("玩家不存在"))
		defencePlayerDoc = doc_2
		var memberInDefenceAlliance = LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId)
		if(!_.isObject(memberInDefenceAlliance)) return Promise.reject(new Error("玩家不在敌对联盟中"))
		if(memberInDefenceAlliance.isProtected) return Promise.reject(new Error("玩家处于保护状态,不能进攻"))
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, defencePlayerDoc._id])
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.__members = [{
				type:Consts.DataChangedType.Edit,
				data:memberInAlliance
			}]
		}
		var event = MarchUtils.createAttackPlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.__attackMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
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
 * 进攻村落
 * @param playerId
 * @param dragonType
 * @param soldiers
 * @param defenceAllianceId
 * @param defenceVillageId
 * @param callback
 */
pro.attackVillage = function(playerId, dragonType, soldiers, defenceAllianceId, defenceVillageId, callback){
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
	if(!_.isString(defenceAllianceId)){
		callback(new Error("defenceAllianceId 不合法"))
		return
	}
	if(!_.isString(defenceVillageId)){
		callback(new Error("defenceVillageId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var attackAllianceDoc = null
	var attackAllianceData = {}
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance) || _.isEmpty(attackPlayerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.dragons = {}
		attackPlayerData.dragons[dragonType] = attackPlayerDoc.dragons[dragonType]
		if(!LogicUtils.isPlayerMarchSoldiersLegal(attackPlayerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		if(!LogicUtils.isPlayerDragonLeadershipEnough(attackPlayerDoc, dragon, soldiers)) return Promise.reject(new Error("所选择的龙领导力不足"))
		attackPlayerData.soldiers = {}
		_.each(soldiers, function(soldier){
			attackPlayerDoc.soldiers[soldier.name] -= soldier.count
			attackPlayerData.soldiers[soldier.name] = attackPlayerDoc.soldiers[soldier.name]
		})
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
		return self.allianceDao.findByIdAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		attackAllianceDoc = doc
		if(!_.isEqual(attackPlayerDoc.alliance.id, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(new Error("联盟未处于战争期"))
			}
			var allianceFight = attackAllianceDoc.allianceFight
			var enemyAllianceId = _.isEqual(attackAllianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(new Error("目标联盟非当前匹配的敌对联盟"))
			return self.allianceDao.findByIdAsync(defenceAllianceId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(attackAllianceDoc._id, defenceAllianceId)){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			defenceAllianceDoc = doc
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
		var defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(new Error("村落不存在"))
		var event = _.find(attackAllianceDoc.attackMarchEvents, function(event){
			return _.isEqual(event.marchType, Consts.MarchType.Village) && _.isEqual(event.defenceVillageData.id, defenceVillageId)
		})
		if(_.isObject(event)) return Promise.reject(new Error("您已有部队正在进攻此村落"))
		event = _.find(attackAllianceDoc.strikeMarchEvents, function(event){
			return _.isEqual(event.marchType, Consts.MarchType.Village) && _.isEqual(event.defenceVillageData.id, defenceVillageId)
		})
		if(_.isObject(event)) return Promise.reject(new Error("您已有部队正在突袭此村落"))
		var villageEvent = _.find(attackAllianceDoc.villageEvents, function(event){
			return _.isEqual(event.villageData.id, defenceVillageId) && _.isEqual(event.playerData.id, attackPlayerDoc._id)
		})
		if(_.isObject(villageEvent)) return Promise.reject(new Error("您有部队正在采集此村落"))

		if(attackAllianceDoc != defenceAllianceDoc){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
		}
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.__members = [{
				type:Consts.DataChangedType.Edit,
				data:memberInAlliance
			}]
		}
		event = MarchUtils.createAttackVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defenceVillage)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.__attackMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		if(attackAllianceDoc != defenceAllianceDoc){
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
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

/**
 * 从村落撤兵
 * @param playerId
 * @param villageEventId
 * @param callback
 */
pro.retreatFromVillage = function(playerId, villageEventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(villageEventId)){
		callback(new Error("villageEventId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var attackAllianceDoc = null
	var attackAllianceData = {}
	var defenceAllianceDoc = null
	var defenceAllianceData = {}
	var targetAllianceDoc = null
	var targetAllianceData = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var villageEvent = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance) || _.isEmpty(attackPlayerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		attackAllianceDoc = doc
		villageEvent = LogicUtils.getEventById(attackAllianceDoc.villageEvents, villageEventId)
		if(!_.isObject(villageEvent)) return Promise.reject(new Error("村落采集事件不存在"))

		if(!_.isEqual(attackAllianceDoc._id, villageEvent.villageData.alliance.id)){
			return self.allianceDao.findByIdAsync(villageEvent.villageData.alliance.id)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(attackAllianceDoc._id, villageEvent.villageData.alliance.id)){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			defenceAllianceDoc = doc
			targetAllianceDoc = defenceAllianceDoc
			targetAllianceData = defenceAllianceData
		}else{
			targetAllianceDoc = attackAllianceDoc
			targetAllianceData = attackAllianceData
		}

		if(villageEvent.villageData.resource <= villageEvent.villageData.collectTotal){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, villageEvent.id])
		}
		LogicUtils.removeItemInArray(attackAllianceDoc.villageEvents, villageEvent)
		attackAllianceData.__villageEvents = [{
			type:Consts.DataChangedType.Remove,
			data:villageEvent
		}]

		var resourceCollected = Math.floor(villageEvent.villageData.collectTotal * ((Date.now() - villageEvent.startTime) / (villageEvent.finishTime - villageEvent.startTime)))
		resourceCollected = resourceCollected > villageEvent.villageData.collectTotal ? villageEvent.villageData.collectTotal : resourceCollected

		var village = LogicUtils.getAllianceVillageById(targetAllianceDoc, villageEvent.villageData.id)
		var originalRewards = villageEvent.playerData.rewards
		var resourceType = village.type.slice(0, -7)
		var newRewards = [{
			type:"resources",
			name:resourceType,
			count:resourceCollected
		}]
		LogicUtils.mergeRewards(originalRewards, newRewards)

		var marchReturnEvent = MarchUtils.createAttackVillageMarchReturnEvent(attackAllianceDoc, attackPlayerDoc, villageEvent.playerData.dragon, villageEvent.playerData.soldiers, villageEvent.playerData.woundedSoldiers, targetAllianceDoc, village, originalRewards)
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchReturnEvents", marchReturnEvent.id, marchReturnEvent.arriveTime])
		attackAllianceDoc.attackMarchReturnEvents.push(marchReturnEvent)
		attackAllianceData.__attackMarchReturnEvents = [{
			type:Consts.DataChangedType.Add,
			data:marchReturnEvent
		}]

		var collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, newRewards)
		LogicUtils.addPlayerReport(attackPlayerDoc, attackPlayerData, collectReport)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])

		if(village.level > 1){
			village.level -= 1
			var dragonAndSoldiers = DataUtils.getAllianceVillageConfigedDragonAndSoldiers(village.type, village.level)
			village.dragon = dragonAndSoldiers.dragon
			village.soldiers = dragonAndSoldiers.soldiers
			village.resource = DataUtils.getAllianceVillageProduction(village.type, village.level)
			targetAllianceData.__villages = [{
				type:Consts.DataChangedType.Edit,
				data:village
			}]
		}else{
			LogicUtils.removeItemInArray(targetAllianceDoc.villages, village)
			targetAllianceData.__villages = [{
				type:Consts.DataChangedType.Remove,
				data:village
			}]
			var villageInMap = LogicUtils.removeAllianceMapObjectByLocation(targetAllianceDoc, village.location)
			targetAllianceData.__mapObjects = [{
				type:Consts.DataChangedType.Remove,
				data:villageInMap
			}]
		}

		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		if(_.isObject(defenceAllianceDoc)){
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
			LogicUtils.putAllianceDataToEnemyAllianceData(defenceAllianceData, attackAllianceData)
			LogicUtils.putAllianceDataToEnemyAllianceData(attackAllianceDoc, defenceAllianceData)
		}else{
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
		}
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
		}
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
 * 突袭村落
 * @param playerId
 * @param dragonType
 * @param defenceAllianceId
 * @param defenceVillageId
 * @param callback
 */
pro.strikeVillage = function(playerId, dragonType, defenceAllianceId, defenceVillageId, callback){
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
	if(!_.isString(defenceAllianceId)){
		callback(new Error("defenceAllianceId 不合法"))
		return
	}
	if(!_.isString(defenceVillageId)){
		callback(new Error("defenceVillageId 不合法"))
		return
	}

	var self = this
	var attackPlayerDoc = null
	var attackPlayerData = {}
	var attackAllianceDoc = null
	var attackAllianceData = {}
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		if(!_.isObject(attackPlayerDoc.alliance) || _.isEmpty(attackPlayerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var dragon = attackPlayerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		dragon.status = Consts.DragonStatus.March
		attackPlayerData.dragons = {}
		attackPlayerData.dragons[dragonType] = attackPlayerDoc.dragons[dragonType]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, attackPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, attackPlayerDoc, attackPlayerData])
		return self.allianceDao.findByIdAsync(attackPlayerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		attackAllianceDoc = doc
		if(!_.isEqual(attackPlayerDoc.alliance.id, defenceAllianceId)){
			if(!_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
				return Promise.reject(new Error("联盟未处于战争期"))
			}
			var allianceFight = attackAllianceDoc.allianceFight
			var enemyAllianceId = _.isEqual(attackAllianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
			if(!_.isEqual(enemyAllianceId, defenceAllianceId)) return Promise.reject(new Error("目标联盟非当前匹配的敌对联盟"))
			return self.allianceDao.findByIdAsync(defenceAllianceId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(attackAllianceDoc._id, defenceAllianceId)){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			defenceAllianceDoc = doc
		}else{
			defenceAllianceDoc = attackAllianceDoc
		}
		var defenceVillage = LogicUtils.getAllianceVillageById(defenceAllianceDoc, defenceVillageId)
		if(!_.isObject(defenceVillage)) return Promise.reject(new Error("村落不存在"))

		var event = _.find(attackAllianceDoc.attackMarchEvents, function(event){
			return _.isEqual(event.marchType, Consts.MarchType.Village) && _.isEqual(event.defenceVillageData.id, defenceVillageId)
		})
		if(_.isObject(event)) return Promise.reject(new Error("您已有部队正在进攻此村落"))
		event = _.find(attackAllianceDoc.strikeMarchEvents, function(event){
			return _.isEqual(event.marchType, Consts.MarchType.Village) && _.isEqual(event.defenceVillageData.id, defenceVillageId)
		})
		if(_.isObject(event)) return Promise.reject(new Error("您已有部队正在突袭此村落"))
		var villageEvent = _.find(attackAllianceDoc.villageEvents, function(event){
			return _.isEqual(event.villageData.id, defenceVillageId) && _.isEqual(event.playerData.id, attackPlayerDoc._id)
		})
		if(_.isObject(villageEvent)) return Promise.reject(new Error("您有部队正在采集此村落"))

		if(attackAllianceDoc != defenceAllianceDoc){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
		}
		var memberInAlliance = LogicUtils.getAllianceMemberById(attackAllianceDoc, attackPlayerDoc._id)
		if(memberInAlliance.isProtected){
			memberInAlliance.isProtected = false
			attackAllianceData.__members = [{
				type:Consts.DataChangedType.Edit,
				data:memberInAlliance
			}]
		}
		event = MarchUtils.createStrikeVillageMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defenceVillage)
		attackAllianceDoc.strikeMarchEvents.push(event)
		attackAllianceData.__strikeMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		if(attackAllianceDoc != defenceAllianceDoc){
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(attackAllianceDoc, attackAllianceData, pushFuncs, self.pushService)
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
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