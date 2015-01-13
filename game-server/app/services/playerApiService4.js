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

var PlayerApiService4 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
	this.Deal = app.get("Deal")
}
module.exports = PlayerApiService4
var pro = PlayerApiService4.prototype

/**
 * 出售商品
 * @param playerId
 * @param type
 * @param name
 * @param count
 * @param price
 * @param callback
 */
pro.sellItem = function(playerId, type, name, count, price, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(_.values(Consts.ResourceTypesCanDeal), type)){
		callback(new Error("type 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}
	if(!_.isNumber(price) || price % 1 !== 0 || price <= 0){
		callback(new Error("price 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		LogicUtils.refreshPlayerResources(playerDoc)
		if(!DataUtils.isPlayerSellQueueEnough(playerDoc)) return Promise.reject(new Error("没有足够的出售队列"))
		if(!DataUtils.isPlayerResourceEnough(playerDoc, type, name, count)) return Promise.reject(new Error("玩家资源不足"))
		var cartNeed = DataUtils.getPlayerCartUsedForSale(playerDoc, type, name, count)
		if(cartNeed > playerDoc.resources.cart) return Promise.reject(new Error("马车数量不足"))

		playerDoc[type][name] -= count
		playerData[type] = playerDoc[type]
		playerDoc.resources.cart -= cartNeed
		playerData.resoruces = playerDoc.resources
		playerData.basicInfo = playerDoc.basicInfo
		LogicUtils.refreshPlayerResources(playerDoc)

		var deal = LogicUtils.createDeal(playerDoc._id, type, name, count, price)
		playerDoc.deals.push(deal.dealForPlayer)
		playerData.__deals = [{
			type:Consts.DataChangedType.Add,
			data:deal.dealForPlayer
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.Deal, self.Deal.createAsync, deal.dealForAll])
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

/**
 * 获取商品列表
 * @param playerId
 * @param type
 * @param name
 * @param callback
 */
pro.getSellItems = function(playerId, type, name, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(_.values(Consts.ResourceTypesCanDeal), type)){
		callback(new Error("type 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		return self.Deal.find({"itemData.type":type, "itemData.name":name}).sort({"itemData.price":1}).limit(Define.SellItemsMaxSize).exec()
	}).then(function(docs){
		pushFuncs.push([self.pushService, self.pushService.onGetSellItemsSuccessAsync, playerDoc, docs])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
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
 * 购买出售的商品
 * @param playerId
 * @param itemId
 * @param callback
 */
pro.buySellItem = function(playerId, itemId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(itemId)){
		callback(new Error("itemId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var sellerDoc = null
	var sellerData = {}
	var itemDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	var funcs = []
	funcs.push(this.playerDao.findByIdAsync(playerId))
	funcs.push(this.Deal.findOneAsync({_id:itemId}))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(new Error("商品不存在"))
		itemDoc = doc_2

		LogicUtils.refreshPlayerResources(playerDoc)

		var totalPrice = itemDoc.itemData.price * itemDoc.itemData.count
		if(playerDoc.resources.coin < totalPrice) return Promise.reject(new Error("银币不足"))
		playerDoc.resources.coin -= totalPrice
		playerDoc[itemDoc.itemData.type][itemDoc.itemData.name] += itemDoc.itemData.count

		return self.playerDao.findByIdAsync(itemDoc.playerId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		sellerDoc = doc

		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData[itemDoc.itemData.type] = playerDoc[itemDoc.itemData.type]
		LogicUtils.refreshPlayerResources(playerDoc)

		var sellItem = _.find(sellerDoc.deals, function(deal){
			return _.isEqual(deal.id, itemId)
		})
		sellItem.isSold = true
		sellerData.__deals = [{
			type:Consts.DataChangedType.Edit,
			data:sellItem
		}]

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, sellerDoc])
		updateFuncs.push([self.Deal, self.Deal.findOneAndRemoveAsync, {_id:itemId}])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, sellerDoc, sellerData])
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
 * 获取出售后赚取的银币
 * @param playerId
 * @param itemId
 * @param callback
 */
pro.getMyItemSoldMoney = function(playerId, itemId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(itemId)){
		callback(new Error("itemId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []


	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var sellItem = _.find(playerDoc.deals, function(deal){
			return _.isEqual(deal.id, itemId)
		})
		if(!_.isObject(sellItem)) return Promise.reject(new Error("商品不存在"))
		if(!sellItem.isSold) return Promise.reject(new Error("商品还未卖出"))

		LogicUtils.refreshPlayerResources(playerDoc)
		var totalPrice = sellItem.itemData.count * sellItem.itemData.price
		playerDoc.resources.coin += totalPrice
		LogicUtils.removeItemInArray(playerDoc.deals, sellItem)
		LogicUtils.refreshPlayerResources(playerDoc)

		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData.__deals = [{
			type:Consts.DataChangedType.Remove,
			data:sellItem
		}]

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

/**
 * 下架商品
 * @param playerId
 * @param itemId
 * @param callback
 */
pro.removeMySellItem = function(playerId, itemId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(itemId)){
		callback(new Error("itemId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var itemDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	var funcs = []
	funcs.push(this.playerDao.findByIdAsync(playerId))
	funcs.push(this.Deal.findOneAsync({_id:itemId}))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		if(!_.isObject(doc_1)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(new Error("商品不存在"))
		itemDoc = doc_2
		if(!_.isEqual(itemDoc.playerId, playerDoc._id)) return Promise.reject(new Error("您未出售此商品"))

		LogicUtils.refreshPlayerResources(playerDoc)
		playerDoc[itemDoc.itemData.type][itemDoc.itemData.name] += itemDoc.itemData.count
		var sellItem = _.find(playerDoc.deals, function(deal){
			return _.isEqual(deal.id, itemId)
		})
		LogicUtils.removeItemInArray(playerDoc.deals, sellItem)

		LogicUtils.refreshPlayerResources(playerDoc)
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData[itemDoc.itemData.type] = playerDoc[itemDoc.itemData.type]
		playerData.__deals = [{
			type:Consts.DataChangedType.Remove,
			data:sellItem
		}]

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.Deal, self.Deal.findOneAndRemoveAsync, {_id:itemId}])
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

	var self = this
	var playerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var tech = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		tech = playerDoc.productionTechs[techName]
		if(!_.isObject(tech)){
			return Promise.reject(new Error("科技不存在"))
		}
		if(playerDoc.buildings.location_7.level <= 0) return Promise.reject(new Error("学院还未建造"))
		if(DataUtils.isProductionTechReachMaxLevel(tech.level)) return Promise.reject(new Error("科技已达最高等级"))
		if(tech.level == 0 && !DataUtils.isPlayerUnlockProductionTechLegal(playerDoc, techName)) return Promise.reject(new Error("前置科技条件不满足"))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getProductionTechUpgradeRequired(techName, tech.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preTechEvent = null
		var playerData = {}
		LogicUtils.refreshPlayerResources(playerDoc)
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
		}else{
			if(_.isObject(preTechEvent)){
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
		LogicUtils.refreshPlayerResources(playerDoc)
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