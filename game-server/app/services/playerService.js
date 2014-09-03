"use strict"

/**
 * Created by modun on 14-7-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require('crypto')

var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var Consts = require("../consts/consts")

var PlayerService = function(app){
	this.app = app
	this.pushService = this.app.get("pushService")
	this.callbackService = this.app.get("callbackService")
	this.cacheService = this.app.get("cacheService")
}

module.exports = PlayerService
var pro = PlayerService.prototype


/**
 * 玩家登陆逻辑服务器
 * @param playerId
 * @param frontServerId
 * @param callback
 */
pro.playerLogin = function(playerId, frontServerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(frontServerId)){
		callback(new Error("frontServerId 不合法"))
		return
	}

	var self = this
	this.cacheService.addPlayerAsync(playerId).then(function(doc){
		doc.frontServerId = frontServerId
		AfterLogin.call(self, doc)
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerLoginSuccess(doc)
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

var AfterLogin = function(doc){
	var self = this
	doc.countInfo.lastLoginTime = Date.now()
	doc.countInfo.loginCount += 1
	//刷新玩家资源数据
	self.refreshPlayerResources(doc)
	//检查建筑
	var buildingFinishedEvents = []
	_.each(doc.buildingEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= Date.now()){
			var building = LogicUtils.getBuildingByEvent(doc, event)
			building.level += 1
			self.pushService.onBuildingLevelUp(doc, event.location)
			buildingFinishedEvents.push(event)
		}else{
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(buildingFinishedEvents, doc.buildingEvents)
	//检查小屋
	var houseFinishedEvents = []
	_.each(doc.houseEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= Date.now()){
			var house = LogicUtils.getHouseByEvent(doc, event)
			house.level += 1
			self.pushService.onHouseLevelUp(doc, event.buildingLocation, event.houseLocation)
			//如果是住宅,送玩家城民
			if(_.isEqual("dwelling", house.type)){
				var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
				var next = DataUtils.getDwellingPopulationByLevel(house.level)
				doc.resources.citizen += next - previous
				//刷新玩家资源数据
				self.refreshPlayerResources(doc)
			}
			houseFinishedEvents.push(event)
		}else{
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(houseFinishedEvents, doc.houseEvents)
	//检查箭塔
	var towerFinishedEvents = []
	_.each(doc.towerEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= Date.now()){
			event.level += 1
			self.pushService.onTowerLevelUp(doc, event.location)
			towerFinishedEvents.push(event)
		}else{
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(towerFinishedEvents, doc.towerEvents)
	//检查城墙
	var wallFinishedEvents = []
	_.each(doc.wallEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= Date.now()){
			var wall = doc.wall
			wall.level += 1
			self.pushService.onWallLevelUp(doc)
			wallFinishedEvents.push(event)
		}else{
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(wallFinishedEvents, doc.wallEvents)
	//检查材料制造
	_.each(doc.materialEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= Date.now()){
			event.finishTime = 0
			self.pushService.onMakeMaterialFinished(doc, event)
		}else if(event.finishTime > 0){
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	//检查招募事件
	var soldierFinishedEvents = []
	_.each(doc.soldierEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= Date.now()){
			var soldierInfo = {
				name:event.name,
				count:event.count
			}
			LogicUtils.addSoldier(doc, soldierInfo)
			self.pushService.onRecruitSoldierSuccess(doc, soldierInfo)
			soldierFinishedEvents.push(event)
		}else{
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(soldierFinishedEvents, doc.soldierEvents)
	//刷新玩家战力
	self.refreshPlayerPower(doc)
}

/**
 * 玩家登出逻辑服
 * @param playerId
 * @param frontServerId
 * @param callback
 */
pro.playerLogout = function(playerId, frontServerId, callback){
	this.callbackService.removeAllPlayerCallback(playerId)
	this.cacheService.removePlayerAsync(playerId).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 更新玩家资源数据
 * @param doc
 */
pro.refreshPlayerResources = function(doc){
	var resources = DataUtils.getPlayerResources(doc)
	_.each(resources, function(value, key){
		doc.resources[key] = value
	})
	doc.basicInfo.resourceRefreshTime = Date.now()
}

/**
 * 刷新玩家兵力信息
 * @param doc
 */
pro.refreshPlayerPower = function(doc){
	var power = DataUtils.getPlayerPower(doc)
	doc.basicInfo.power = power
}

/**
 * 升级大型建筑
 * @param playerId
 * @param buildingLocation
 * @param finishNow
 * @param callback
 */
pro.upgradeBuilding = function(playerId, buildingLocation, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(!_.isObject(building)){
			return Promise.reject(new Error("建筑不存在"))
		}
		//建筑是否正在升级中
		if(LogicUtils.hasBuildingEvents(doc, buildingLocation)){
			return Promise.reject(new Error("建筑正在升级"))
		}
		//检查是否小于0级
		if(building.level < 0){
			return Promise.reject(new Error("建筑还未建造"))
		}
		//检查升级坑位是否合法
		if(building.level == 0 && !LogicUtils.isBuildingCanCreateAtLocation(doc, buildingLocation)){
			return Promise.reject(new Error("建筑建造时,建筑坑位不合法"))
		}
		//检查建造数量是否超过上限
		if(building.level == 0 && DataUtils.getPlayerFreeBuildingsCount(doc) <= 0){
			return Promise.reject(new Error("建造数量已达建造上限"))
		}
		//检查升级等级是否合法
		if(!_.isEqual(building.type, "keep") && building.level > 0 && building.level + 1 > DataUtils.getBuildingLevelLimit(doc)){
			return Promise.reject(new Error("建筑升级时,建筑等级不合法"))
		}
		//是否已到最高等级
		if(building.level > 0 && DataUtils.isBuildingReachMaxLevel(building.type, building.level)){
			return Promise.reject(new Error("建筑已达到最高等级"))
		}

		var gemUsed = 0
		var upgradeRequired = DataUtils.getBuildingUpgradeRequired(building.type, building.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, doc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, doc.materials)
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}

		//宝石是否足够
		if(gemUsed > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//是否立即完成
		if(finishNow){
			building.level = building.level + 1
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			self.pushService.onBuildingLevelUp(doc, building.location)
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addBuildingEvent(doc, building.location, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 创建小屋
 * @param playerId
 * @param buildingLocation
 * @param houseType
 * @param houseLocation
 * @param finishNow
 * @param callback
 */
pro.createHouse = function(playerId, buildingLocation, houseType, houseLocation, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isString(houseType)){
		callback(new Error("houseType 不合法"))
		return
	}
	if(!_.isNumber(houseLocation)){
		callback(new Error("houseLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}
	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(!_.isObject(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		//检查建筑等级是否大于1
		if(building.level <= 0){
			return Promise.reject(new Error("主体建筑必须大于等于1级"))
		}
		//检查小屋类型是否存在
		if(!DataUtils.isHouseTypeExist(houseType)){
			return Promise.reject(new Error("小屋类型不存在"))
		}
		//检查小屋个数是否超标
		if(DataUtils.getPlayerFreeHousesCount(doc, houseType) <= 0){
			return Promise.reject(new Error("小屋数量超过限制"))
		}
		//检查建造坑位是否合法
		if(houseLocation % 1 != 0 || houseLocation < 1 || houseLocation > 3){
			return Promise.reject(new Error("小屋location只能1<=location<=3"))
		}
		//建筑周围不允许建造小屋
		if(!DataUtils.isBuildingHasHouse(buildingLocation)){
			return Promise.reject(new Error("建筑周围不允许建造小屋"))
		}
		//创建小屋时,小屋坑位是否合法
		if(!LogicUtils.isHouseCanCreateAtLocation(doc, buildingLocation, houseType, houseLocation)){
			return Promise.reject(new Error("创建小屋时,小屋坑位不合法"))
		}
		//检查是否建造小屋会造成可用城民小于0
		if(!_.isEqual("dwelling", houseType)){
			var willUse = DataUtils.getPlayerHouseUsedCitizen(houseType, 1)
			if(DataUtils.getPlayerCitizen(doc) - willUse < 0){
				return Promise.reject(new Error("建造小屋会造成可用城民小于0"))
			}
		}

		var gemUsed = 0
		var upgradeRequired = DataUtils.getHouseUpgradeRequired(houseType, 1)
		var buyedResources = null
		var buyedMaterials = null
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, doc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, doc.materials)
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}

		//宝石是否足够
		if(gemUsed > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//创建小屋
		var house = {
			type:houseType,
			level:0,
			location:houseLocation
		}
		//将小屋添加到大型建筑中
		building.houses.push(house)
		//是否立即完成
		if(finishNow){
			house.level += 1
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			self.pushService.onHouseLevelUp(doc, building.location, house.location)
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addHouseEvent(doc, buildingLocation, houseLocation, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//如果是住宅,送玩家城民
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			doc.resources.citizen += next - previous
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}


/**
 * 升级小屋
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param finishNow
 * @param callback
 */
pro.upgradeHouse = function(playerId, buildingLocation, houseLocation, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isNumber(houseLocation)){
		callback(new Error("houseLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(!_.isObject(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		//检查建筑等级是否大于1
		if(building.level <= 0){
			return Promise.reject(new Error("主体建筑必须大于等于1级"))
		}
		//检查小屋是否存在
		var house = null
		_.each(building.houses, function(value){
			if(value.location == houseLocation){
				house = value
			}
		})
		if(!_.isObject(house)){
			return Promise.reject(new Error("小屋不存在"))
		}
		//检查小屋是否正在升级
		if(LogicUtils.hasHouseEvents(doc, building.location, house.location)){
			return Promise.reject(new Error("小屋正在升级"))
		}
		//检查等级是否合法
		if(house.level + 1 > DataUtils.getBuildingLevelLimit(doc)){
			return Promise.reject(new Error("小屋升级时,小屋等级不合法"))
		}
		//是否已到最高等级
		if(DataUtils.isHouseReachMaxLevel(house.type, house.level)){
			return Promise.reject(new Error("小屋已达到最高等级"))
		}
		//检查是否升级小屋会造成可用城民小于0
		if(!_.isEqual("dwelling", house.type)){
			var currentLevelUsed = DataUtils.getPlayerHouseUsedCitizen(house.type, house.level)
			var nextLevelUsed = DataUtils.getPlayerHouseUsedCitizen(house.type, house.level + 1)
			var willUse = nextLevelUsed - currentLevelUsed
			if(DataUtils.getPlayerCitizen(doc) - willUse < 0){
				return Promise.reject(new Error("升级小屋会造成可用城民小于0"))
			}
		}

		var gemUsed = 0
		var upgradeRequired = DataUtils.getHouseUpgradeRequired(house.type, house.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, doc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, doc.materials)
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}

		//宝石是否足够
		if(gemUsed > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//是否立即完成
		if(finishNow){
			house.level += 1
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			self.pushService.onHouseLevelUp(doc, building.location, house.location)
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addHouseEvent(doc, building.location, house.location, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//如果是住宅,送玩家城民
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			doc.resources.citizen += next - previous
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 拆除小屋
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param callback
 */
pro.destroyHouse = function(playerId, buildingLocation, houseLocation, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isNumber(houseLocation)){
		callback(new Error("houseLocation 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(!_.isObject(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		//检查小屋是否存在
		var house = null
		_.each(building.houses, function(value){
			if(value.location == houseLocation){
				house = value
			}
		})
		if(!_.isObject(house)){
			return Promise.reject(new Error("小屋不存在"))
		}
		//检查是否正在升级
		if(LogicUtils.hasHouseEvents(doc, building.location, house.location)){
			return Promise.reject(new Error("小屋正在升级"))
		}
		//更新资源数据
		self.refreshPlayerResources(doc)
		//删除小屋
		var index = building.houses.indexOf(house)
		building.houses.splice(index, 1)
		//更新资源数据
		self.refreshPlayerResources(doc)
		//检查是否在拆除民宅,且民宅拆除后,是否会造成城民数量小于0
		if(_.isEqual("dwelling", house.type) && DataUtils.getPlayerCitizen(doc) < 0){
			return Promise.reject(new Error("拆除此建筑后会造成可用城民数量小于0"))
		}
		//获取需要的宝石数量
		var gem = 100
		//宝石是否足够
		if(gem > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gem
		//退还资源和城民给玩家
		var returnedResources = DataUtils.getHouseDestroyReturned(house.type, house.level)
		LogicUtils.increace(returnedResources, doc.resources)
		//再次更新玩家数据,防止城民爆仓
		self.refreshPlayerResources(doc)
		//刷新玩家战力
		self.refreshPlayerPower(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 升级箭塔
 * @param playerId
 * @param towerLocation
 * @param finishNow
 * @param callback
 */
pro.upgradeTower = function(playerId, towerLocation, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(towerLocation)){
		callback(new Error("towerLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var tower = doc.towers["location_" + towerLocation]
		//检查箭塔是否存在
		if(!_.isObject(tower)){
			return Promise.reject(new Error("箭塔不存在"))
		}
		//箭塔是否正在升级中
		if(LogicUtils.hasTowerEvents(doc, tower.location)){
			return Promise.reject(new Error("箭塔正在升级"))
		}
		//检查是否小于1级
		if(tower.level < 1){
			return Promise.reject(new Error("箭塔还未建造"))
		}
		//是否已到最高等级
		if(DataUtils.isBuildingReachMaxLevel("tower", tower.level)){
			return Promise.reject(new Error("箭塔已达到最高等级"))
		}
		//检查升级等级是否合法
		if(tower.level + 1 > DataUtils.getBuildingLevelLimit(doc)){
			return Promise.reject(new Error("箭塔升级时,建筑等级不合法"))
		}

		var gemUsed = 0
		var upgradeRequired = DataUtils.getBuildingUpgradeRequired("tower", tower.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, doc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, doc.materials)
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}

		//宝石是否足够
		if(gemUsed > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//是否立即完成
		if(finishNow){
			tower.level = tower.level + 1
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			self.pushService.onTowerLevelUp(doc, tower.location)
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addTowerEvent(doc, tower.location, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 升级城墙
 * @param playerId
 * @param finishNow
 * @param callback
 */
pro.upgradeWall = function(playerId, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var wall = doc.wall
		//检查城墙是否存在
		if(!_.isObject(wall)){
			return Promise.reject(new Error("城墙不存在"))
		}
		//城墙是否正在升级中
		if(LogicUtils.hasWallEvents(doc)){
			return Promise.reject(new Error("城墙正在升级"))
		}
		//检查是否小于1级
		if(wall.level < 1){
			return Promise.reject(new Error("城墙还未建造"))
		}
		//是否已到最高等级
		if(DataUtils.isBuildingReachMaxLevel("wall", wall.level)){
			return Promise.reject(new Error("城墙已达到最高等级"))
		}
		//检查升级等级是否合法
		if(wall.level + 1 > DataUtils.getBuildingLevelLimit(doc)){
			return Promise.reject(new Error("城墙升级时,城墙等级不合法"))
		}

		var gemUsed = 0
		var upgradeRequired = DataUtils.getBuildingUpgradeRequired("wall", wall.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}else{
			buyedResources = DataUtils.buyResources(upgradeRequired.resources, doc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, doc.materials)
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, doc.materials)
		}

		//宝石是否足够
		if(gemUsed > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//是否立即完成
		if(finishNow){
			wall.level = wall.level + 1
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			self.pushService.onWallLevelUp(doc)
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addWallEvent(doc, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 制造材料
 * @param playerId
 * @param category
 * @param finishNow
 * @param callback
 */
pro.makeMaterial = function(playerId, category, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isEqual(Consts.MaterialType.Building, category) && !_.isEqual(Consts.MaterialType.Technology, category)){
		callback(new Error("category 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		var toolShop = doc.buildings["location_5"]
		if(toolShop.level < 1){
			return Promise.reject(new Error("工具作坊还未建造"))
		}
		//同类型的材料正在制造或制造完成后还未领取
		var event = LogicUtils.getMaterialEventByCategory(doc, category)
		if(event){
			if(event.finishTime > 0){
				return Promise.reject(new Error("同类型的材料正在制造"))
			}else{
				return Promise.reject(new Error("同类型的材料制作完成后还未领取"))
			}
		}

		var gemUsed = 0
		var makeRequired = DataUtils.getMakeMaterialRequired(category, toolShop.level)
		var buyedResources = null
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(makeRequired.buildTime)
			buyedResources = DataUtils.buyResources(makeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
		}else{
			buyedResources = DataUtils.buyResources(makeRequired.resources, doc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
		}

		//宝石是否足够
		if(gemUsed > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(makeRequired.resources, doc.resources)
		//产生制造事件
		event = DataUtils.generateMaterialEvent(toolShop, category, finishNow)
		doc.materialEvents.push(event)
		//是否立即完成
		if(finishNow){
			self.pushService.onMakeMaterialFinished(doc, event)
		}else{
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 领取材料
 * @param playerId
 * @param category
 * @param callback
 */
pro.getMaterials = function(playerId, category, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isEqual(Consts.MaterialType.Building, category) && !_.isEqual(Consts.MaterialType.Technology, category)){
		callback(new Error("category 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		var event = LogicUtils.getMaterialEventByCategory(doc, category)
		if(!_.isObject(event)){
			return Promise.reject(new Error("没有材料建造事件存在"))
		}
		if(event.finishTime > 0){
			return Promise.reject(new Error("同类型的材料正在制造"))
		}
		//移除制造事件
		LogicUtils.removeEvents([event], doc.materialEvents)
		self.pushService.onGetMaterialSuccess(doc, event)
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//将材料添加到材料仓库,超过仓库上限的直接丢弃
		DataUtils.addPlayerMaterials(doc, event.materials)
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 招募普通士兵
 * @param playerId
 * @param soldierName
 * @param count
 * @param finishNow
 * @param callback
 */
pro.recruitNormalSoldier = function(playerId, soldierName, count, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.hasNormalSoldier(soldierName)){
		callback(new Error("soldierName 普通兵种不存在"))
		return
	}
	if(!_.isNumber(count)){
		callback(new Error("count 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		var barracks = doc.buildings["location_8"]
		if(barracks.level < 1){
			return Promise.reject(new Error("兵营还未建造"))
		}
		if(count > DataUtils.getSoldierMaxRecruitCount(doc, soldierName)){
			return Promise.reject(new Error("招募数量超过最大上限"))
		}

		var gemUsed = 0
		var recruitRequired = DataUtils.getRecruitNormalSoldierRequired(soldierName, count)
		var buyedResources = null

		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(recruitRequired.recruitTime)
			buyedResources = DataUtils.buyResources(recruitRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
		}else{
			buyedResources = DataUtils.buyResources(recruitRequired.resources, doc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
		}

		//宝石是否足够
		if(gemUsed > doc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.resources.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(recruitRequired.resources, doc.resources)
		//是否立即完成
		if(finishNow){
			var soldierInfo = {
				name:soldierName,
				count:count
			}
			LogicUtils.addSoldier(doc, soldierInfo)
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			self.pushService.onRecruitSoldierSuccess(doc, soldierInfo)
		}else{
			var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
			LogicUtils.addSoldierEvent(doc, soldierName, count, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 招募特殊士兵
 * @param playerId
 * @param soldierName
 * @param count
 * @param callback
 */
pro.recruitSpecialSoldier = function(playerId, soldierName, count, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.hasSpecialSoldier(soldierName)){
		callback(new Error("soldierName 特殊兵种不存在"))
		return
	}
	if(!_.isNumber(count)){
		callback(new Error("count 不合法"))
		return
	}

	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		var barracks = doc.buildings["location_8"]
		if(barracks.level < 1){
			return Promise.reject(new Error("兵营还未建造"))
		}
		if(count > DataUtils.getSoldierMaxRecruitCount(doc, soldierName)){
			return Promise.reject(new Error("招募数量超过最大上限"))
		}
		var recruitRequired = DataUtils.getRecruitSpecialSoldierRequired(soldierName, count)
		if(!LogicUtils.isEnough(recruitRequired.materials, doc.soldierMaterials)){
			return Promise.reject(new Error("材料不足"))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//修改玩家资源数据
		LogicUtils.reduce(recruitRequired.materials, doc.soldierMaterials)

		var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
		LogicUtils.addSoldierEvent(doc, soldierName, count, finishTime)
		self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))

		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}


var ExcutePlayerCallback = function(playerId, finishTime){
	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		//更新资源数据
		self.refreshPlayerResources(doc)
		//检查建筑
		var buildingFinishedEvents = []
		_.each(doc.buildingEvents, function(event){
			if(event.finishTime > 0 && event.finishTime <= finishTime){
				buildingFinishedEvents.push(event)
				var building = LogicUtils.getBuildingByEvent(doc, event)
				building.level += 1
				self.pushService.onBuildingLevelUp(doc, event.location)
			}
		})
		LogicUtils.removeEvents(buildingFinishedEvents, doc.buildingEvents)
		//检查小屋
		var houseFinishedEvents = []
		_.each(doc.houseEvents, function(event){
			if(event.finishTime > 0 && event.finishTime <= finishTime){
				houseFinishedEvents.push(event)
				var house = LogicUtils.getHouseByEvent(doc, event)
				house.level += 1
				self.pushService.onHouseLevelUp(doc, event.buildingLocation, event.houseLocation)
				//如果是住宅,送玩家城民
				if(_.isEqual("dwelling", house.type)){
					var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
					var next = DataUtils.getDwellingPopulationByLevel(house.level)
					doc.resources.citizen += next - previous
					self.refreshPlayerResources(doc)
				}
			}
		})
		LogicUtils.removeEvents(houseFinishedEvents, doc.houseEvents)
		//检查箭塔
		var towerFinishedEvents = []
		_.each(doc.towerEvents, function(event){
			if(event.finishTime > 0 && event.finishTime <= finishTime){
				var tower = LogicUtils.getTowerByEvent(doc, event)
				tower.level += 1
				self.pushService.onTowerLevelUp(doc, event.location)
				towerFinishedEvents.push(event)
			}
		})
		LogicUtils.removeEvents(towerFinishedEvents, doc.towerEvents)
		//检查城墙
		var wallFinishedEvents = []
		_.each(doc.wallEvents, function(event){
			if(event.finishTime > 0 && event.finishTime <= finishTime){
				var wall = doc.wall
				wall.level += 1
				self.pushService.onWallLevelUp(doc)
				wallFinishedEvents.push(event)
			}
		})
		LogicUtils.removeEvents(wallFinishedEvents, doc.wallEvents)
		//检查材料制造
		_.each(doc.materialEvents, function(event){
			if(event.finishTime > 0 && event.finishTime <= Date.now()){
				event.finishTime = 0
				self.pushService.onMakeMaterialFinished(doc, event)
			}
		})
		//检查招募事件
		var soldierFinishedEvents = []
		_.each(doc.soldierEvents, function(event){
			if(event.finishTime > 0 && event.finishTime <= Date.now()){
				var soldierInfo = {
					name:event.name,
					count:event.count
				}
				LogicUtils.addSoldier(doc, soldierInfo)
				self.pushService.onRecruitSoldierSuccess(doc, soldierInfo)
				soldierFinishedEvents.push(event)
			}
		})
		LogicUtils.removeEvents(soldierFinishedEvents, doc.soldierEvents)
		//刷新玩家战力
		self.refreshPlayerPower(doc)
		//更新玩家数据
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		//推送玩家信息到客户端
		self.pushService.onPlayerDataChanged(doc)
	}).catch(function(e){
		errorLogger.error("handle excutePlayerCallback Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle excutePlayerCallback Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}