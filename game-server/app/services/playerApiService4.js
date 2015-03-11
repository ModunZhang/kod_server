"use strict"

/**
 * Created by modun on 14-7-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var ItemUtils = require("../utils/itemUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService4 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = PlayerApiService4
var pro = PlayerApiService4.prototype


/**
 * 升级生产科技
 * @param playerId
 * @param techName
 * @param finishNow
 * @param callback
 */
pro.upgradeProductionTech = function(playerId, techName, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isProductionTechNameLegal(techName)){
		callback(new Error("techName 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var tech = null
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		tech = playerDoc.productionTechs[techName]
		if(!_.isObject(tech)){
			return Promise.reject(new Error("科技不存在"))
		}
		if(tech.index > 9) return Promise.reject(new Error("此科技还未开放"))
		if(playerDoc.buildings.location_7.level <= 0) return Promise.reject(new Error("学院还未建造"))
		if(DataUtils.isProductionTechReachMaxLevel(tech.level)) return Promise.reject(new Error("科技已达最高等级"))
		if(tech.level == 0 && !DataUtils.isPlayerUnlockProductionTechLegal(playerDoc, techName)) return Promise.reject(new Error("前置科技条件不满足"))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerProductionTechUpgradeRequired(playerDoc, techName, tech.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preTechEvent = null
		var playerData = {}
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, playerDoc.buildingMaterials)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, playerDoc.buildingMaterials)
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, playerDoc.buildingMaterials)
			if(playerDoc.productionTechEvents.length > 0){
				preTechEvent = playerDoc.productionTechEvents[0]
				var timeRemain = (preTechEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}

		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)

		if(finishNow){
			tech.level += 1
			playerData.productionTechs = {}
			playerData.productionTechs[techName] = playerDoc.productionTechs[techName]
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeTech)
			TaskUtils.finishProductionTechTaskIfNeed(playerDoc, playerData, techName, tech.level)
		}else{
			if(_.isObject(preTechEvent)){
				preTechEvent.startTime -= preTechEvent.finishTime - Date.now()
				preTechEvent.finishTime = Date.now()
				eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, playerDoc, preTechEvent.id, Date.now()])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createProductionTechEvent(playerDoc, techName, finishTime)
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "productionTechEvents", event.id, finishTime])
			playerDoc.productionTechEvents.push(event)
			playerData.__productionTechEvents = [{
				type:Consts.DataChangedType.Add,
				data:event
			}]
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData.buildingMaterials = playerDoc.buildingMaterials
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * 升级军事科技
 * @param playerId
 * @param techName
 * @param finishNow
 * @param callback
 */
pro.upgradeMilitaryTech = function(playerId, techName, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isMilitaryTechNameLegal(techName)){
		callback(new Error("techName 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var tech = null
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		tech = playerDoc.militaryTechs[techName]
		if(!_.isObject(tech)){
			return Promise.reject(new Error("科技不存在"))
		}
		if(!DataUtils.isPlayerMilitaryTechBuildingCreated(playerDoc, techName)) return Promise.reject(new Error("建筑还未建造"))
		if(DataUtils.isMilitaryTechReachMaxLevel(tech.level)) return Promise.reject(new Error("科技已达最高等级"))
		var isUpgrading = _.some(playerDoc.militaryTechEvents, function(event){
			return _.isEqual(event.name, techName)
		})
		if(isUpgrading) return Promise.reject(new Error("此科技正在升级"))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerMilitaryTechUpgradeRequired(playerDoc, techName, tech.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preTechEvent = null
		var playerData = {}
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, playerDoc.technologyMaterials)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, playerDoc.technologyMaterials)
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, playerDoc.technologyMaterials)
			preTechEvent = DataUtils.getPlayerSoldierStarUpgradeEvent(playerDoc, techName)
			if(_.isObject(preTechEvent)){
				var timeRemain = (preTechEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}

		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.technologyMaterials)

		if(finishNow){
			tech.level += 1
			playerData.militaryTechs = {}
			playerData.militaryTechs[techName] = playerDoc.militaryTechs[techName]
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeTech)
			TaskUtils.finishMilitaryTechTaskIfNeed(playerDoc, playerData, techName, tech.level)
		}else{
			if(_.isObject(preTechEvent)){
				preTechEvent.startTime -= preTechEvent.finishTime - Date.now()
				preTechEvent.finishTime = Date.now()
				eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, playerDoc, preTechEvent.id, Date.now()])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createMilitaryTechEvent(playerDoc, techName, finishTime)
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "militaryTechEvents", event.id, finishTime])
			playerDoc.militaryTechEvents.push(event)
			playerData.__militaryTechEvents = [{
				type:Consts.DataChangedType.Add,
				data:event
			}]
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData.technologyMaterials = playerDoc.technologyMaterials
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * 升级士兵星级
 * @param playerId
 * @param soldierName
 * @param finishNow
 * @param callback
 */
pro.upgradeSoldierStar = function(playerId, soldierName, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isNormalSoldier(soldierName)){
		callback(new Error("soldierName 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var soldierMaxStar = DataUtils.getPlayerIntInit("soldierMaxStar")
		if(playerDoc.soldierStars[soldierName] >= soldierMaxStar) return Promise.reject(new Error("士兵已达最高星级"))
		if(!DataUtils.isPlayerUpgradeSoldierStarTechPointEnough(playerDoc, soldierName)) return Promise.reject(new Error("科技点不足"))
		var isUpgrading = _.some(playerDoc.soldierStarEvents, function(event){
			return _.isEqual(event.name, soldierName)
		})
		if(isUpgrading) return Promise.reject(new Error("此兵种正在升级中"))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getSoldierStarUpgradeRequired(soldierName, playerDoc.soldierStars[soldierName] + 1)
		var buyedResources = null
		var preTechEvent = null
		var playerData = {}
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.upgradeTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			preTechEvent = DataUtils.getPlayerMilitaryTechUpgradeEvent(playerDoc, soldierName)
			if(_.isObject(preTechEvent)){
				var timeRemain = (preTechEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}

		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)

		if(finishNow){
			playerDoc.soldierStars[soldierName] += 1
			playerData.soldierStars = {}
			playerData.soldierStars[soldierName] = playerDoc.soldierStars[soldierName]
			TaskUtils.finishSoldierStarTaskIfNeed(playerDoc, playerData, soldierName, playerDoc.soldierStars[soldierName])
		}else{
			if(_.isObject(preTechEvent)){
				eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, playerDoc, preTechEvent.id, Date.now()])
			}
			var finishTime = Date.now() + (upgradeRequired.upgradeTime * 1000)
			var event = LogicUtils.createSoldierStarEvent(playerDoc, soldierName, finishTime)
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "soldierStarEvents", event.id, finishTime])
			playerDoc.soldierStarEvents.push(event)
			playerData.__soldierStarEvents = [{
				type:Consts.DataChangedType.Add,
				data:event
			}]
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * 设置玩家地形
 * @param playerId
 * @param terrain
 * @param callback
 */
pro.setTerrain = function(playerId, terrain, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(_.values(Consts.AllianceTerrain), terrain)){
		callback(new Error("terrain 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		playerDoc.basicInfo.terrain = terrain
		playerData.basicInfo = playerDoc.basicInfo
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * 购买道具
 * @param playerId
 * @param itemName
 * @param count
 * @param callback
 */
pro.buyItem = function(playerId, itemName, count, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isItemNameExist(itemName)){
		callback(new Error("itemName 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var itemConfig = DataUtils.getItemConfig(itemName)
		if(!itemConfig.isSell) return Promise.reject(new Error("此道具未出售"))
		var gemNeed = itemConfig.price * count
		if(playerDoc.resources.gem < gemNeed) return Promise.reject(new Error("宝石不足"))
		playerDoc.resources.gem -= gemNeed
		playerData.resources = playerDoc.resources
		var resp = LogicUtils.addPlayerItem(playerDoc, itemName, count)
		if(resp.newlyCreated){
			playerData.__items = [{
				type:Consts.DataChangedType.Add,
				data:resp.item
			}]
		}else{
			playerData.__items = [{
				type:Consts.DataChangedType.Edit,
				data:resp.item
			}]
		}
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.BuyItemInShop)
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * 使用道具
 * @param playerId
 * @param itemName
 * @param params
 * @param callback
 */
pro.useItem = function(playerId, itemName, params, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isItemNameExist(itemName)){
		callback(new Error("itemName 不合法"))
		return
	}
	if(!_.isObject(params) || !ItemUtils.isParamsLegal(itemName, params)){
		callback(new Error("params 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc

		var item = _.find(playerDoc.items, function(item){
			return _.isEqual(item.name, itemName)
		})
		if(!_.isObject(item))  return Promise.reject(new Error("道具不存在"))
		if(item.count <= 0) return Promise.reject(new Error("道具数量不足"))
		item.count -= 1
		if(item.count <= 0){
			LogicUtils.removeItemInArray(playerDoc.items, item)
			playerData.__items = [{
				type:Consts.DataChangedType.Remove,
				data:item
			}]
		}else{
			playerData.__items = [{
				type:Consts.DataChangedType.Edit,
				data:item
			}]
		}
		return Promise.resolve()
	}).then(function(){
		var itemNameFunction = ItemUtils.getItemNameFunction(itemName)
		var itemData = params[itemName]
		if(_.isEqual("changePlayerName", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, self.playerDao)
		}else if(_.isEqual("retreatTroop", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, updateFuncs, self.allianceDao, eventFuncs, self.timeEventService, pushFuncs, self.pushService)
		}else if(_.isEqual("moveTheCity", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, self.allianceDao, updateFuncs, pushFuncs, self.pushService)
		}else if(_.isEqual("chest_2", itemName) || _.isEqual("chest_3", itemName) || _.isEqual("chest_4", itemName)){
			var key = "chestKey_" + itemName.slice(-1)
			var item = _.find(playerDoc.items, function(item){
				return _.isEqual(item.name, key)
			})
			if(!_.isObject(item) || item.count <= 0)  return Promise.reject(new Error("道具不存在或数量不足"))
			item.count -= 1
			if(item.count <= 0){
				LogicUtils.removeItemInArray(playerDoc.items, item)
				playerData.__items.push({
					type:Consts.DataChangedType.Remove,
					data:item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:item
				})
			}
			return itemNameFunction(itemData, playerDoc, playerData)
		}else if(_.isEqual("chestKey_2", itemName) || _.isEqual("chestKey_3", itemName) || _.isEqual("chestKey_4", itemName)){
			return Promise.reject(new Error("此道具不允许直接使用"))
		}else if(_.isEqual("warSpeedupClass_1", itemName) || _.isEqual("warSpeedupClass_2", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, updateFuncs, self.allianceDao, eventFuncs, self.timeEventService, pushFuncs, self.pushService)
		}else{
			return itemNameFunction(itemData, playerDoc, playerData, eventFuncs, self.timeEventService)
		}
	}).then(function(){
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * 购买并使用道具
 * @param playerId
 * @param itemName
 * @param params
 * @param callback
 */
pro.buyAndUseItem = function(playerId, itemName, params, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isItemNameExist(itemName)){
		callback(new Error("itemName 不合法"))
		return
	}
	if(!_.isObject(params) || !ItemUtils.isParamsLegal(itemName, params)){
		callback(new Error("params 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var itemConfig = DataUtils.getItemConfig(itemName)
		if(!itemConfig.isSell) return Promise.reject(new Error("此道具未出售"))
		var gemNeed = itemConfig.price * 1
		if(playerDoc.resources.gem < gemNeed) return Promise.reject(new Error("宝石不足"))
		playerDoc.resources.gem -= gemNeed
		playerData.resources = playerDoc.resources
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.BuyItemInShop)
		return Promise.resolve()
	}).then(function(){
		var itemNameFunction = ItemUtils.getItemNameFunction(itemName)
		var itemData = params[itemName]
		if(_.isEqual("changePlayerName", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, self.playerDao)
		}else if(_.isEqual("retreatTroop", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, updateFuncs, self.allianceDao, eventFuncs, self.timeEventService, pushFuncs, self.pushService)
		}else if(_.isEqual("moveTheCity", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, self.allianceDao, updateFuncs, pushFuncs, self.pushService)
		}else if(_.isEqual("chest_2", itemName) || _.isEqual("chest_3", itemName) || _.isEqual("chest_4", itemName)){
			var key = "chestKey_" + itemName.slice(-1)
			var item = _.find(playerDoc.items, function(item){
				return _.isEqual(item.name, key)
			})
			if(!_.isObject(item) || item.count <= 0)  return Promise.reject(new Error("道具不存在或数量不足"))
			item.count -= 1
			if(item.count <= 0){
				LogicUtils.removeItemInArray(playerDoc.items, item)
				playerData.__items = [{
					type:Consts.DataChangedType.Remove,
					data:item
				}]
			}else{
				playerData.__items = [{
					type:Consts.DataChangedType.Edit,
					data:item
				}]
			}
			return itemNameFunction(itemData, playerDoc, playerData)
		}else if(_.isEqual("chestKey_2", itemName) || _.isEqual("chestKey_3", itemName) || _.isEqual("chestKey_4", itemName)){
			return Promise.reject(new Error("此道具不允许直接使用"))
		}else if(_.isEqual("warSpeedupClass_1", itemName) || _.isEqual("warSpeedupClass_2", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, updateFuncs, self.allianceDao, eventFuncs, self.timeEventService, pushFuncs, self.pushService)
		}else{
			return itemNameFunction(itemData, playerDoc, playerData, eventFuncs, self.timeEventService)
		}
	}).then(function(){
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
	this.playerDao.findAsync(playerId).then(function(doc){
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
		playerDoc.pve.totalStep += staminaUsed
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
			DataUtils.addPlayerDragonExp(playerDoc, playerData, theDragon, expAdd, true)

			playerData.dragons = {}
			playerData.dragons[dragonType] = playerDoc.dragons[dragonType]

			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.StartPve)

			var soldiers = fightData.soldiers
			if(!_.isArray(soldiers)) return Promise.reject(new Error("fightData 不合法"))

			var name = null
			var woundedSoldiers = []
			playerData.soldiers = {}
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
				var soldierTreatPercent = DataUtils.getPlayerTreatSoldierPercent(playerDoc, theDragon)
				woundedSoldiers.push({
					name:name,
					count:Math.floor(damagedCount * soldierTreatPercent)
				})
				playerData.soldiers[name] = playerDoc.soldiers[name]
			}
			DataUtils.addPlayerWoundedSoldiers(playerDoc, playerData, woundedSoldiers)
		}

		if(_.isObject(rewards)){
			for(i = 0; i < rewards.length; i++){
				var reward = rewards[i]
				var type = reward.type
				if(_.isUndefined(playerDoc[type])) return Promise.reject(new Error("rewards 不合法"))
				name = reward.name
				var count = reward.count
				if(_.isEqual("items", type)){
					if(!DataUtils.isItemNameExist(name)){
						return Promise.reject(new Error("rewards 不合法"))
					}
					var resp = LogicUtils.addPlayerItem(playerDoc, name, count)
					if(resp.newlyCreated){
						playerData.__items = [{
							type:Consts.DataChangedType.Add,
							data:resp.item
						}]
					}else{
						playerData.__items = [{
							type:Consts.DataChangedType.Edit,
							data:resp.item
						}]
					}
				}else{
					if(_.isUndefined(playerDoc[type][name])) return Promise.reject(new Error("rewards 不合法"))
					if(count < 0 && playerDoc[type][name] + count < 0){
						return Promise.reject(new Error("rewards 不合法"))
					}
					playerDoc[type][name] += count
					if(!_.isObject(playerData[type]))playerData[type] = {}
					playerData[type][name] = playerDoc[type][name]
				}
			}
		}

		TaskUtils.finishPveCountTaskIfNeed(playerDoc, playerData)

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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * gacha
 * @param playerId
 * @param type
 * @param callback
 */
pro.gacha = function(playerId, type, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(_.values(Consts.GachaType), type)){
		callback(new Error("type 不合法"))
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		if(_.isEqual(type, Consts.GachaType.Normal) && DataUtils.isPlayerCanFreeNormalGacha(playerDoc)){
			playerDoc.countInfo.todayFreeNormalGachaCount += 1
			playerData.countInfo = playerDoc.countInfo
		}else{
			var casinoTokenNeeded = DataUtils.getCasinoTokeNeededInGachaType(type)
			if(playerDoc.resources.casinoToken - casinoTokenNeeded < 0) return Promise.reject("赌币不足")
			playerDoc.resources.casinoToken -= casinoTokenNeeded
			playerData.resources = playerDoc.resources
		}

		playerData.__items = []
		var count = _.isEqual(type, Consts.GachaType.Normal) ? 1 : 3
		for(var i = 0; i < count; i++){
			var item = DataUtils.getGachaItemByType(type)
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			if(resp.newlyCreated){
				playerData.__items.push({
					type:Consts.DataChangedType.Add,
					data:resp.item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:resp.item
				})
			}
		}

		if(_.isEqual(type, Consts.GachaType.Advanced)){
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.AdvancedGachaOnce)
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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