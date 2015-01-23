"use strict"

/**
 * Created by modun on 14-7-23.
 */
var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService5 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
	this.Deal = app.get("Deal")
}
module.exports = PlayerApiService5
var pro = PlayerApiService5.prototype

/**
 * 上传玩家PVE数据
 * @param playerId
 * @param pveData
 * @param fightData
 * @param rewards
 * @param callback
 */
pro.setPveData = function(playerId, pveData, fightData, rewards, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isObject(pveData)){
		callback(new Error("pveData 不合法"))
		return
	}
	if(!_.isUndefined(fightData) && !_.isObject(fightData)){
		callback(new Error("fightData 不合法"))
		return
	}
	if(!_.isUndefined(rewards) && !_.isObject(rewards)){
		callback(new Error("rewards 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var staminaUsed = pveData.staminaUsed
		if(!_.isNumber(staminaUsed)) return Promise.reject(new Error("pveData 不合法"))
		if(playerDoc.resources.stamina - staminaUsed < 0) return Promise.reject(new Error("pveData 不合法"))
		var location = pveData.location
		if(!_.isNumber(location.x) || !_.isNumber(location.y) || !_.isNumber(location.z)) return Promise.reject(new Error("pveData 不合法"))
		var floor = pveData.floor
		if(!_.isObject(floor)) return Promise.reject(new Error("pveData 不合法"))
		var level = floor.level
		if(!_.isNumber(level)) return Promise.reject(new Error("pveData 不合法"))
		var fogs = floor.fogs
		if(!_.isString(fogs)) return Promise.reject(new Error("pveData 不合法"))
		var objects = floor.objects
		if(!_.isString(objects)) return Promise.reject(new Error("pveData 不合法"))

		playerDoc.resources.stamina -= staminaUsed
		playerData.resources = playerDoc.resources
		playerData.pve = {}
		playerDoc.pve.location = location
		playerData.pve.location = playerDoc.pve.location

		var theFloor = _.find(playerDoc.pve.floors, function(theFloor){
			return _.isEqual(theFloor.level, level)
		})

		if(_.isObject(theFloor)){
			theFloor.fogs = fogs
			theFloor.objects = objects
			playerData.pve.__floors = [{
				type:Consts.DataChangedType.Edit,
				data:theFloor
			}]
		}else{
			theFloor = {
				level:level,
				fogs:fogs,
				objects:objects
			}
			playerDoc.pve.floors.push(theFloor)
			playerData.pve.__floors = [{
				type:Consts.DataChangedType.Add,
				data:theFloor
			}]
		}

		if(_.isObject(fightData)){
			var dragon = fightData.dragon
			if(!_.isObject(dragon)) return Promise.reject(new Error("pveData 不合法"))
			var dragonType = dragon.type
			if(!DataUtils.isDragonTypeExist(dragonType)) return Promise.reject(new Error("pveData 不合法"))
			var hpDecreased = dragon.hpDecreased
			if(!_.isNumber(hpDecreased)) return Promise.reject(new Error("pveData 不合法"))
			var expAdd = dragon.expAdd
			if(!_.isNumber(expAdd)) return Promise.reject(new Error("pveData 不合法"))
			var theDragon = playerDoc.dragons[dragonType]
			if(theDragon.star <= 0) return Promise.reject(new Error("pveData 不合法"))

			theDragon.hp -= hpDecreased
			if(theDragon.hp <= 0){
				var deathEvent = DataUtils.createPlayerDragonDeathEvent(playerDoc, theDragon)
				playerDoc.dragonDeathEvents.push(deathEvent)
				playerData.__dragonDeathEvents = [{
					type:Consts.DataChangedType.Add,
					data:deathEvent
				}]
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
			}
			DataUtils.addPlayerDragonExp(playerDoc, theDragon, expAdd)

			playerData.dragons = {}
			playerData.dragons[dragonType] = playerDoc.dragons[dragonType]

			var soldiers = fightData.soldiers
			if(!_.isArray(soldiers)) return Promise.reject(new Error("fightData 不合法"))

			var name = null
			playerData.soldiers = {}
			playerData.woundedSoldiers = {}
			for(var i = 0; i < soldiers.length; i++){
				var soldier = soldiers[i]
				name = soldier.name
				if(_.isUndefined(playerDoc.soldiers[name])) return Promise.reject(new Error("fightData 不合法"))
				var damagedCount = soldier.damagedCount
				if(!_.isNumber(damagedCount)) return Promise.reject(new Error("fightData 不合法"))
				var wounedCount = soldier.woundedCount
				if(!_.isNumber(wounedCount)) return Promise.reject(new Error("fightData 不合法"))
				if(playerDoc.soldiers[name] - damagedCount < 0) return Promise.reject(new Error("fightData 不合法"))
				playerDoc.soldiers[name] -= damagedCount
				playerDoc.woundedSoldiers[name] += wounedCount
				playerData.soldiers[name] = playerDoc.soldiers[name]
				playerData.woundedSoldiers[name] = playerDoc.woundedSoldiers[name]
			}
		}

		if(_.isObject(rewards)){
			for(i = 0; i < rewards.length; i++){
				var reward = rewards[i]
				var type = reward.type
				if(_.isUndefined(playerDoc[type])) return Promise.reject(new Error("rewards 不合法"))
				name = reward.name
				if(_.isUndefined(playerDoc[type][name])) return Promise.reject(new Error("rewards 不合法"))
				var count = reward.count
				playerDoc[type][name] += count
				if(!_.isObject(playerData[type]))playerData[type] = {}
				playerData[type][name] = playerDoc[type][name]
			}
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
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