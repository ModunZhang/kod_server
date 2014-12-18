"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var ReportUtils = require("../utils/reportUtils")
var MarchUtils = require("../utils/marchUtils")
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
		var helpTroop = _.find(beHelpedPlayerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, playerId)
		})
		LogicUtils.removeItemInArray(beHelpedPlayerDoc.helpedByTroops, helpTroop)
		beHelpedPlayerData.__helpedByTroops = {
			type:Consts.DataChangedType.Remove,
			data:helpTroop
		}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, beHelpedPlayerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, beHelpedPlayerDoc, beHelpedPlayerData])

		var helpToTroop = _.find(playerDoc.helpToTroops, function(troop){
			return _.isEqual(troop.beHelpedPlayerData.id, beHelpedPlayerDoc._id)
		})
		LogicUtils.removeItemInArray(playerDoc.helpToTroops, helpToTroop)
		playerData.__helpToTroops = [{
			type:Consts.DataChangedType.Remove,
			data:helpToTroop
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		var targetMemberInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerDoc._id)
		targetMemberInAlliance.helpedByTroopsCount -= 1
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:targetMemberInAlliance
		}]

		var marchReturnEvent = MarchUtils.createHelpDefenceMarchReturnEvent(allianceDoc, playerDoc, beHelpedPlayerDoc, helpTroop.dragon, helpTroop.dragon.expAdd, helpTroop.soldiers, helpTroop.woundedSoldiers, helpTroop.rewards, helpTroop.kill)
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
		if(!_.isObject(LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId))) return Promise.reject(new Error("玩家不在敌对联盟中"))
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, defencePlayerDoc._id])
		var event = MarchUtils.createStrikePlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.strikeMarchEvents.push(event)
		attackAllianceData.__strikeMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "strikeMarchEvents", event.id, event.arriveTime])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
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
		if(!LogicUtils.isMarchSoldierLegal(playerDoc, soldiers)) return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		playerData.soldiers = {}
		_.each(soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] -= soldier.count
			playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
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
		if(!_.isObject(LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerId))) return Promise.reject(new Error("玩家不在敌对联盟中"))
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, defenceAllianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, defencePlayerDoc._id])
		var event = MarchUtils.createAttackPlayerCityMarchEvent(attackAllianceDoc, attackPlayerDoc, attackPlayerDoc.dragons[dragonType], soldiers, defenceAllianceDoc, defencePlayerDoc)
		attackAllianceDoc.attackMarchEvents.push(event)
		attackAllianceData.__attackMarchEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceTimeEventAsync, attackAllianceDoc, "attackMarchEvents", event.id, event.arriveTime])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc, attackAllianceData])
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