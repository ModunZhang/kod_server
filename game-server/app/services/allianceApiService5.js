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


var AllianceApiService5 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceApiService5
var pro = AllianceApiService5.prototype

/**
 * 查看敌方进攻行军事件详细信息
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.getAttackMarchEventDetail = function(playerId, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var allianceDoc = null
	var attackAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	var marchEvent = null
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
		var allianceFight = allianceDoc.allianceFight
		var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, allianceDoc._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		return self.allianceDao.findByIdAsync(enemyAllianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		attackAllianceDoc = doc

		marchEvent = _.find(attackAllianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id) && _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(new Error("行军事件不存在"))
		return self.playerDao.findByIdAsync(marchEvent.attackPlayerData.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		var detail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, marchEvent.attackPlayerData.soldiers)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, attackAllianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetAttackMarchEventDetailAsync, playerDoc, detail])
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
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
 * 查看敌方突袭行军事件详细信息
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.getStrikeMarchEventDetail = function(playerId, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var allianceDoc = null
	var attackAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	var marchEvent = null
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
		var allianceFight = allianceDoc.allianceFight
		var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, allianceDoc._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		return self.allianceDao.findByIdAsync(enemyAllianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		attackAllianceDoc = doc

		marchEvent = _.find(attackAllianceDoc.strikeMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.marchType, Consts.MarchType.City) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id) && _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(new Error("行军事件不存在"))
		return self.playerDao.findByIdAsync(marchEvent.attackPlayerData.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		var detail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, null)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, attackAllianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetStrikeMarchEventDetailAsync, playerDoc, detail])
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
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
 * 查看协助部队行军事件详细信息
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.getHelpDefenceMarchEventDetail = function(playerId, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	var marchEvent = null
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
		marchEvent = _.find(allianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id) && _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(new Error("行军事件不存在"))
		return self.playerDao.findByIdAsync(marchEvent.attackPlayerData.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		var detail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, marchEvent.attackPlayerData.soldiers)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetHelpDefenceMarchEventDetailAsync, playerDoc, detail])
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
		if(_.isObject(attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(attackPlayerDoc._id))
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
 * 查看协防部队详细信息
 * @param playerId
 * @param helpedByPlayerId
 * @param callback
 */
pro.getHelpDefenceTroopDetail = function(playerId, helpedByPlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(helpedByPlayerId)){
		callback(new Error("helpedByPlayerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	var helpedByPlayerTroop = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		helpedByPlayerTroop = _.find(playerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, helpedByPlayerId)
		})
		if(!_.isObject(helpedByPlayerTroop)) return Promise.reject(new Error("没有此玩家的协防部队"))

		return self.playerDao.findByIdAsync(helpedByPlayerId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		attackPlayerDoc = doc
		var detail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, helpedByPlayerId, helpedByPlayerTroop.dragon, helpedByPlayerTroop.soldiers)
		delete detail.marchEventId
		detail.helpedByPlayerId = helpedByPlayerId
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, attackPlayerDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetHelpDefenceTroopDetailAsync, playerDoc, detail])
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
}