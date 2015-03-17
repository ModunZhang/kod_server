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
var ErrorUtils = require("../utils/errorUtils")
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
	this.User = app.get("User")
	this.Device = app.get("Device")
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
	var playerData = []
	var eventFuncs = []
	var updateFuncs = []
	var tech = null
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		tech = playerDoc.productionTechs[techName]
		if(tech.index > 9) return Promise.reject(new Error("此科技还未开放"))
		if(playerDoc.buildings.location_7.level <= 0) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, 7))
		if(DataUtils.isProductionTechReachMaxLevel(tech.level)) return Promise.reject(ErrorUtils.techReachMaxLevel(playerId, techName, tech))
		if(tech.level == 0 && !DataUtils.isPlayerUnlockProductionTechLegal(playerDoc, techName)) return Promise.reject(ErrorUtils.techUpgradePreConditionNotMatch(playerId, techName, tech))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerProductionTechUpgradeRequired(playerDoc, techName, tech.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preTechEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
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

		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)
		playerData.push(["buildingMaterials", playerDoc.buildingMaterials])
		if(finishNow){
			tech.level += 1
			playerData.push(["productionTechs." + techName + ".level", tech.level])
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeTech)
			TaskUtils.finishProductionTechTaskIfNeed(playerDoc, playerData, techName, tech.level)
		}else{
			if(_.isObject(preTechEvent) && preTechEvent.finishTime > Date.now()){
				preTechEvent.finishTime = Date.now()
				eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, playerDoc, preTechEvent.id, preTechEvent.finishTime])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createProductionTechEvent(playerDoc, techName, finishTime)
			playerDoc.productionTechEvents.push(event)
			playerData.push(["productionTechEvents." + playerDoc.productionTechEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "productionTechEvents", event.id, finishTime])
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var playerData = []
	var eventFuncs = []
	var updateFuncs = []
	var tech = null
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		tech = playerDoc.militaryTechs[techName]
		var building = DataUtils.getPlayerMilitaryTechBuilding(playerDoc, techName)
		if(building.level < 1) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, building.location))
		if(DataUtils.isMilitaryTechReachMaxLevel(tech.level)) return Promise.reject(ErrorUtils.techReachMaxLevel(playerId, techName, tech))
		var isUpgrading = _.some(playerDoc.militaryTechEvents, function(event){
			return _.isEqual(event.name, techName)
		})
		if(isUpgrading) return Promise.reject(ErrorUtils.techIsUpgradingNow(playerId, techName, tech))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerMilitaryTechUpgradeRequired(playerDoc, techName, tech.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preTechEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
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

		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.technologyMaterials)
		playerData.push(["technologyMaterials", playerDoc.technologyMaterials])

		if(finishNow){
			tech.level += 1
			playerData.push(["militaryTechs." + techName + ".level", tech.level])
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeTech)
			TaskUtils.finishMilitaryTechTaskIfNeed(playerDoc, playerData, techName, tech.level)
		}else{
			if(_.isObject(preTechEvent) && preTechEvent.finishTime > Date.now()){
				preTechEvent.finishTime = Date.now()
				eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, playerDoc, preTechEvent.id, preTechEvent.finishTime])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createMilitaryTechEvent(playerDoc, techName, finishTime)
			playerDoc.militaryTechEvents.push(event)
			playerData.push(["militaryTechEvents." + playerDoc.militaryTechEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "militaryTechEvents", event.id, finishTime])
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var playerData = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		var soldierMaxStar = DataUtils.getPlayerIntInit("soldierMaxStar")
		if(playerDoc.soldierStars[soldierName] >= soldierMaxStar) return Promise.reject(ErrorUtils.soldierReachMaxStar(playerId, soldierName))
		if(!DataUtils.isPlayerUpgradeSoldierStarTechPointEnough(playerDoc, soldierName)) return Promise.reject(ErrorUtils.techPointNotEnough(playerId, soldierName))
		var isUpgrading = _.some(playerDoc.soldierStarEvents, function(event){
			return _.isEqual(event.name, soldierName)
		})
		if(isUpgrading) return Promise.reject(ErrorUtils.soldierIsUpgradingNow(playerId, soldierName))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getSoldierStarUpgradeRequired(soldierName, playerDoc.soldierStars[soldierName] + 1)
		var buyedResources = null
		var preTechEvent = null

		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
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

		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)

		if(finishNow){
			playerDoc.soldierStars[soldierName] += 1
			playerData.push(["soldierStarts." + soldierName, playerDoc.soldierStars[soldierName]])
			TaskUtils.finishSoldierStarTaskIfNeed(playerDoc, playerData, soldierName, playerDoc.soldierStars[soldierName])
		}else{
			if(_.isObject(preTechEvent) && preTechEvent.finishTime > Date.now()){
				preTechEvent.finishTime = Date.now()
				eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, playerDoc, preTechEvent.id, preTechEvent.finishTime])
			}
			var finishTime = Date.now() + (upgradeRequired.upgradeTime * 1000)
			var event = LogicUtils.createSoldierStarEvent(playerDoc, soldierName, finishTime)
			playerDoc.soldierStarEvents.push(event)
			playerData.push(["soldierStarEvents." + playerDoc.soldierStarEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "soldierStarEvents", event.id, finishTime])
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
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
	if(!_.contains(_.values(Consts.AllianceTerrain), terrain)){
		callback(new Error("terrain 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		playerDoc.basicInfo.terrain = terrain
		playerData.push(["basicInfo.terrain", playerDoc.basicInfo.terrain])

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var playerData = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		var itemConfig = DataUtils.getItemConfig(itemName)
		if(!itemConfig.isSell) return Promise.reject(ErrorUtils.itemNotSell(playerId, itemName))
		var gemNeed = itemConfig.price * count
		if(playerDoc.resources.gem < gemNeed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemNeed
		playerData.push(["resources.gem", playerDoc.resources.gem])
		var resp = LogicUtils.addPlayerItem(playerDoc, itemName, count)
		playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.BuyItemInShop)

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		var item = _.find(playerDoc.items, function(item){
			return _.isEqual(item.name, itemName)
		})
		if(!_.isObject(item))  return Promise.reject(ErrorUtils.itemNotExist(playerId, itemName))
		item.count -= 1
		if(item.count <= 0){
			playerData.push(["items." + playerDoc.items.indexOf(item), null])
			LogicUtils.removeItemInArray(playerDoc.items, item)
		}else{
			playerData.push(["items." + playerDoc.items.indexOf(item) + ".count", item.count])
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
			if(!_.isObject(item))  return Promise.reject(ErrorUtils.itemNotExist(playerId, key))
			item.count -= 1
			if(item.count <= 0){
				playerData.push(["items." + playerDoc.items.indexOf(item), null])
				LogicUtils.removeItemInArray(playerDoc.items, item)
			}else{
				playerData.push(["items." + playerDoc.items.indexOf(item) + ".count", item.count])
			}
			return itemNameFunction(itemData, playerDoc, playerData)
		}else if(_.isEqual("chestKey_2", itemName) || _.isEqual("chestKey_3", itemName) || _.isEqual("chestKey_4", itemName)){
			return Promise.reject(ErrorUtils.itemCanNotBeUsedDirectly(playerId, itemName))
		}else if(_.isEqual("warSpeedupClass_1", itemName) || _.isEqual("warSpeedupClass_2", itemName)){
			return itemNameFunction(itemData, playerDoc, playerData, updateFuncs, self.allianceDao, eventFuncs, self.timeEventService, pushFuncs, self.pushService)
		}else{
			return itemNameFunction(itemData, playerDoc, playerData, eventFuncs, self.timeEventService)
		}
	}).then(function(){
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var playerData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		var itemConfig = DataUtils.getItemConfig(itemName)
		if(!itemConfig.isSell) return Promise.reject(ErrorUtils.itemNotSell(playerId, itemName))
		var gemNeed = itemConfig.price * 1
		if(playerDoc.resources.gem < gemNeed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemNeed
		playerData.push(["resources.gem", playerDoc.resources.gem])
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
			if(!_.isObject(item))  return Promise.reject(ErrorUtils.itemNotExist(playerId, itemName))
			item.count -= 1
			if(item.count <= 0){
				playerData.push(["items." + playerDoc.items.indexOf(item), null])
				LogicUtils.removeItemInArray(playerDoc.items, item)
			}else{
				playerData.push(["items." + playerDoc.items.indexOf(item), item])
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
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var playerData = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
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
		playerData.push(["resources.stamina", playerDoc.resources.stamina])
		playerDoc.pve.totalStep += staminaUsed
		playerData.push(["pve.totalStep", playerDoc.pve.totalStep])
		playerDoc.pve.location = location
		playerData.push(["pve.location", playerDoc.pve.location])

		var theFloor = _.find(playerDoc.pve.floors, function(theFloor){
			return _.isEqual(theFloor.level, level)
		})

		if(_.isObject(theFloor)){
			theFloor.fogs = fogs
			theFloor.objects = objects
		}else{
			theFloor = {
				level:level,
				fogs:fogs,
				objects:objects
			}
			playerDoc.pve.floors.push(theFloor)
		}
		playerData.push(["pve.floors", playerDoc.pve.floors.indexOf(theFloor), theFloor])

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
				theDragon.hp = 0
				theDragon.status = Consts.DragonStatus.Free
				playerData.push(["dragons." + theDragon.type + ".status", theDragon.status])
				var deathEvent = DataUtils.createPlayerDragonDeathEvent(playerDoc, theDragon)
				playerDoc.dragonDeathEvents.push(deathEvent)
				playerData.push(["dragonDeathEvents." + playerDoc.dragonDeathEvents.indexOf(deathEvent), deathEvent])
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
			}
			DataUtils.addPlayerDragonExp(playerDoc, playerData, theDragon, expAdd, true)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.Conqueror, Consts.DailyTaskIndexMap.Conqueror.StartPve)

			var soldiers = fightData.soldiers
			if(!_.isArray(soldiers)) return Promise.reject(new Error("fightData 不合法"))

			var name = null
			var woundedSoldiers = []
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
				playerData.push(["soldiers." + name, playerDoc.soldiers[name]])
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
					playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
				}else{
					if(_.isUndefined(playerDoc[type][name])) return Promise.reject(new Error("rewards 不合法"))
					if(count < 0 && playerDoc[type][name] + count < 0){
						return Promise.reject(new Error("rewards 不合法"))
					}
					playerDoc[type][name] += count
					playerData.push([type + "." + name, playerDoc[type][name]])
				}
			}
		}
		TaskUtils.finishPveCountTaskIfNeed(playerDoc, playerData)

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
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
	if(!_.contains(_.values(Consts.GachaType), type)){
		callback(new Error("type 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isEqual(type, Consts.GachaType.Normal) && DataUtils.isPlayerCanFreeNormalGacha(playerDoc)){
			playerDoc.countInfo.todayFreeNormalGachaCount += 1
			playerData.push(["countInfo.todayFreeNormalGachaCount", playerDoc.countInfo.todayFreeNormalGachaCount])
		}else{
			var casinoTokenNeeded = DataUtils.getCasinoTokeNeededInGachaType(type)
			if(playerDoc.resources.casinoToken - casinoTokenNeeded < 0) return Promise.reject(ErrorUtils.casinoTokenNotEnough(playerId, playerDoc.resources.casinoToken, casinoTokenNeeded))
			playerDoc.resources.casinoToken -= casinoTokenNeeded
			playerData.push(["resources.casinoToken", playerDoc.resources.casinoToken])
		}

		var count = _.isEqual(type, Consts.GachaType.Normal) ? 1 : 3
		for(var i = 0; i < count; i++){
			var item = DataUtils.getGachaItemByType(type)
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		}

		if(_.isEqual(type, Consts.GachaType.Advanced)){
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.AdvancedGachaOnce)
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
 * 绑定GameCenter账号到当前玩家数据
 * @param playerId
 * @param gcId
 * @param callback
 */
pro.bindGcId = function(playerId, gcId, callback){
	if(!_.isString(gcId)){
		callback(new Error("gcId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isEmpty(playerDoc.gcId)) return Promise.reject(ErrorUtils.playerAlreadyBindGCAId(playerId, playerDoc.userId, playerDoc.gcId, gcId))
		return self.User.findAsync({gcId:gcId, _id:{$ne:playerDoc.userId}}, {_id:true}, {limit:1})
	}).then(function(docs){
		if(docs.length > 0) return Promise.reject(ErrorUtils.theGCIdAlreadyHasDatas(playerId, playerDoc.userId, gcId))
		playerDoc.gcId = gcId
		playerData.push(["gcId", gcId])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.User, self.User.findByIdAndUpdateAsync, playerDoc.userId, {gcId:gcId}])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
 * 强制绑定GameCenter账号到当前玩家数据,放弃原GameCenter账号下的玩家数据
 * @param playerId
 * @param gcId
 * @param callback
 */
pro.forceBindGcId = function(playerId, gcId, callback){
	if(!_.isString(gcId)){
		callback(new Error("gcId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isEmpty(playerDoc.gcId)) return Promise.reject(ErrorUtils.playerAlreadyBindGCAccount(playerId, playerDoc.userId, playerDoc.gcId, gcId))
		return self.User.findOneAsync({gcId:gcId, _id:{$ne:playerDoc.userId}}, {_id:true}, {limit:1})
	}).then(function(docs){
		if(docs.length == 0) return Promise.reject(ErrorUtils.theGCAccountDoNotHasData(playerId, playerDoc.userId, gcId))


		playerDoc.gcId = gcId
		playerData.push(["gcId", gcId])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.User, self.User.findByIdAndUpdateAsync, playerDoc.userId, {gcId:gcId}])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
 * 切换GameCenter账号
 * @param playerId
 * @param gcId
 * @param callback
 */
pro.switchGcId = function(playerId, gcId, callback){
	if(!_.isString(gcId)){
		callback(new Error("gcId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isEmpty(playerDoc.gcId)) return Promise.reject(ErrorUtils.playerAlreadyBindGCAccountId(playerId, playerDoc.userId, playerDoc.gcId, gcId))
		return self.User.findAsync({gcId:gcId, _id:{$ne:playerDoc.userId}}, {_id:true}, {limit:1})
	}).then(function(docs){
		if(docs.length > 0) return Promise.reject(ErrorUtils.theGCAccountAlreadyHasDatas(playerId, playerDoc.userId, gcId))
		playerDoc.gcId = gcId
		playerData.push(["gcId", gcId])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.User, self.User.findByIdAndUpdateAsync, playerDoc.userId, {gcId:gcId}])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
 * 强制切换GameCenter账号到原GameCenter账号下的玩家数据
 * @param playerId
 * @param gcId
 * @param callback
 */
pro.forceSwitchGcId = function(playerId, gcId, callback){

}

