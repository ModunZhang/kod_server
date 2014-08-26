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
	//更新资源数据
	self.refreshPlayerResources(doc)
	_.each(doc.buildings, function(building){
		//检查建筑
		if(building.finishTime > 0){
			if(building.finishTime <= Date.now()){
				building.finishTime = 0
				building.level += 1
				self.pushService.onBuildingLevelUp(doc, building.location)
			}else{
				self.callbackService.addPlayerCallback(doc._id, building.finishTime, ExcutePlayerCallback.bind(self))
			}
		}
		//检查小屋
		_.each(building.houses, function(house){
			if(house.finishTime > 0){
				if(house.finishTime <= Date.now()){
					house.finishTime = 0
					house.level += 1
					self.pushService.onHouseLevelUp(doc, building.location, house.location)
					//如果是住宅,送玩家城民
					if(_.isEqual("dwelling", house.type)){
						var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
						var next = DataUtils.getDwellingPopulationByLevel(house.level)
						doc.resources.citizen += next - previous
						self.refreshPlayerResources(doc)
					}
				}else{
					self.callbackService.addPlayerCallback(doc._id, house.finishTime, ExcutePlayerCallback.bind(self))
				}
			}
		})
	})

	//检查箭塔
	_.each(doc.towers, function(tower){
		if(tower.finishTime > 0){
			if(tower.finishTime <= Date.now()){
				tower.finishTime = 0
				tower.level += 1
				self.pushService.onTowerLevelUp(doc, tower.location)
			}else{
				self.callbackService.addPlayerCallback(doc._id, tower.finishTime, ExcutePlayerCallback.bind(self))
			}
		}
	})
	//检查城墙
	if(doc.wall.finishTime > 0){
		if(doc.wall.finishTime <= Date.now()){
			doc.wall.finishTime = 0
			doc.wall.level += 1
			self.pushService.onWallLevelUp(doc)
		}else{
			self.callbackService.addPlayerCallback(doc._id, doc.wall.finishTime, ExcutePlayerCallback.bind(self))
		}
	}
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
		if(building.finishTime > 0){
			return Promise.reject(new Error("建筑正在升级"))
		}
		//检查是否小于0级
		if(building.level < 0){
			return Promise.reject(new Error("建筑还未建造"))
		}
		//检查升级坑位是否合法
		if(building.level == 0 && !CheckBuildingCreateLocation(doc, buildingLocation)){
			return Promise.reject(new Error("建筑建造时,建筑坑位不合法"))
		}
		//检查建造数量是否超过上限
		if(building.level == 0 && DataUtils.getPlayerFreeBuildingsCount(doc) <= 0){
			return Promise.reject(new Error("建造数量已达建造上限"))
		}
		//检查升级等级是否合法
		if(building.level > 0 && !CheckBuildingUpgradeLevelLimit(doc, buildingLocation)){
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
		if(gemUsed > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//是否立即完成
		if(finishNow){
			building.level = building.level + 1
			self.pushService.onBuildingLevelUp(doc, building.location)
		}else{
			building.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, building.finishTime, ExcutePlayerCallback.bind(self))
		}
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
		//检查建造坑位是否合法
		if(houseLocation % 1 != 0 || houseLocation < 1 || houseLocation > 3){
			return Promise.reject(new Error("小屋location只能1<=location<=3"))
		}
		//建筑周围不允许建造小屋
		if(!DataUtils.isBuildingHasHouse(buildingLocation)){
			return Promise.reject(new Error("建筑周围不允许建造小屋"))
		}
		//创建小屋时,小屋坑位是否合法
		if(!CheckHouseCreateLocation(doc, buildingLocation, houseType, houseLocation)){
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
		if(gemUsed > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//创建小屋
		var house = {
			type:houseType,
			level:0,
			location:houseLocation,
			finishTime:0
		}
		//将小屋添加到大型建筑中
		building.houses.push(house)
		//是否立即完成
		if(finishNow){
			house.level += 1
			self.pushService.onHouseLevelUp(doc, building.location, house.location)
		}else{
			house.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, house.finishTime, ExcutePlayerCallback.bind(self))
		}
		//如果是住宅,送玩家城民
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			doc.resources.citizen += next - previous
			//刷新玩家数据,防止城民爆仓
			self.refreshPlayerResources(doc)
		}
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
		if(house.finishTime > 0){
			return Promise.reject(new Error("小屋正在升级"))
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
		if(gemUsed > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//是否立即完成
		if(finishNow){
			house.level += 1
			self.pushService.onHouseLevelUp(doc, building.location, house.location)
		}else{
			house.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, house.finishTime, ExcutePlayerCallback.bind(self))
		}
		//如果是住宅,送玩家城民
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			doc.resources.citizen += next - previous
			self.refreshPlayerResources(doc)
		}
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
		if(house.finishTime > 0){
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
		if(gem > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gem
		//退还资源和城民给玩家
		var returnedResources = DataUtils.getHouseDestroyReturned(house.type, house.level)
		LogicUtils.increace(returnedResources, doc.resources)
		//再次更新玩家数据,防止城民爆仓
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

		var tower = doc.towers["location_" + towerLocation]
		//检查箭塔是否存在
		if(!_.isObject(tower)){
			return Promise.reject(new Error("箭塔不存在"))
		}
		//箭塔是否正在升级中
		if(tower.finishTime > 0){
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
		if(!CheckTowerUpgradeLevelLimit(doc, towerLocation)){
			return Promise.reject(new Error("箭塔升级时,建筑等级不合法"))
		}

		var gemUsed = 0
		var upgradeRequired = DataUtils.getBuildingUpgradeRequired("tower", tower.level + 1)
		var buyedResources = null
		var buyedMaterials = null
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
		if(gemUsed > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//是否立即完成
		if(finishNow){
			tower.level = tower.level + 1
			self.pushService.onTowerLevelUp(doc, tower.location)
		}else{
			tower.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, tower.finishTime, ExcutePlayerCallback.bind(self))
		}
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
		if(wall.finishTime > 0){
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
		if(!CheckWallUpgradeLevelLimit(doc)){
			return Promise.reject(new Error("城墙升级时,城墙等级不合法"))
		}

		var gemUsed = 0
		var upgradeRequired = DataUtils.getBuildingUpgradeRequired("wall", wall.level + 1)
		var buyedResources = null
		var buyedMaterials = null
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
		if(gemUsed > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gemUsed
		//修改玩家资源数据
		LogicUtils.reduce(upgradeRequired.resources, doc.resources)
		LogicUtils.reduce(upgradeRequired.materials, doc.materials)
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//是否立即完成
		if(finishNow){
			wall.level = wall.level + 1
			self.pushService.onWallLevelUp(doc)
		}else{
			wall.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, wall.finishTime, ExcutePlayerCallback.bind(self))
		}
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

var ExcutePlayerCallback = function(playerId, finishTime){
	var self = this
	this.cacheService.getPlayerAsync(playerId).then(function(doc){
		//更新资源数据
		self.refreshPlayerResources(doc)
		//检查建筑
		_.each(doc.buildings, function(building){
			if(building.finishTime > 0 && building.finishTime <= finishTime){
				building.finishTime = 0
				building.level += 1
				self.pushService.onBuildingLevelUp(doc, building.location)
			}
			//检查小屋
			_.each(building.houses, function(house){
				if(house.finishTime > 0 && house.finishTime <= finishTime){
					house.finishTime = 0
					house.level += 1
					self.pushService.onHouseLevelUp(doc, building.location, house.location)
					//如果是住宅,送玩家城民
					if(_.isEqual("dwelling", house.type)){
						var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
						var next = DataUtils.getDwellingPopulationByLevel(house.level)
						doc.resources.citizen += next - previous
						self.refreshPlayerResources(doc)
					}
				}
			})
		})
		//检查箭塔
		_.each(doc.towers, function(tower){
			if(tower.finishTime > 0 && tower.finishTime <= finishTime){
				tower.finishTime = 0
				tower.level += 1
				self.pushService.onTowerLevelUp(doc, tower.location)
			}
		})
		//检查城墙
		if(doc.wall.finishTime > 0 && doc.wall.finishTime <= finishTime){
			doc.wall.finishTime = 0
			doc.wall.level += 1
			self.pushService.onWallLevelUp(doc)
		}

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

var CheckBuildingUpgradeLevelLimit = function(playerDoc, location){
	var building = playerDoc.buildings["location_" + location]
	var keep = playerDoc.buildings["location_1"]
	if(location == 1) return true
	return building.level + 1 <= keep.level
}

var CheckTowerUpgradeLevelLimit = function(playerDoc, location){
	var tower = playerDoc.towers["location_" + location]
	var keep = playerDoc.buildings["location_1"]
	return tower.level + 1 <= keep.level
}

var CheckWallUpgradeLevelLimit = function(playerDoc){
	var wall = playerDoc.wall
	var keep = playerDoc.buildings["location_1"]
	return wall.level + 1 <= keep.level
}

var CheckBuildingCreateLocation = function(playerDoc, location){
	var previousLocation = LogicUtils.getPreviousBuildingLocation(location)
	var nextLocation = LogicUtils.getNextBuildingLocation(location)
	var frontLocation = LogicUtils.getFrontBuildingLocation(location)
	if(previousLocation){
		var previousBuilding = playerDoc.buildings["location_" + previousLocation]
		if(previousBuilding.level > 0) return true
	}
	if(nextLocation){
		var nextBuilding = playerDoc.buildings["location_" + nextLocation]
		if(nextBuilding.level > 0) return true
	}
	if(frontLocation){
		var frontBuilding = playerDoc.buildings["location_" + frontLocation]
		if(frontBuilding.level > 0) return true
	}

	return false
}

var CheckHouseCreateLocation = function(playerDoc, buildingLocation, houseType, houseLocation){
	var conditions = {
		location_1:{
			widthMax:2,
			heightMax:1
		},
		location_2:{
			widthMax:1,
			heightMax:1
		},
		location_3:{
			widthMax:1,
			heightMax:1
		}
	}

	var building = playerDoc.buildings["location_" + buildingLocation]
	var houses = building.houses
	var willBeSize = DataUtils.getHouseSize(houseType)
	var condition = conditions["location_" + houseLocation]
	if(willBeSize.width > condition.widthMax) return false
	if(willBeSize.height > condition.heightMax) return false
	var wantUse = [houseLocation]
	if(willBeSize.width > 1 || willBeSize.height > 1){
		wantUse.push(houseLocation + 1)
	}

	var alreadyUsed = []
	for(var i = 0; i < houses.length; i++){
		var house = houses[i]
		var houseSize = DataUtils.getHouseSize(house.type)
		alreadyUsed.push(house.location)
		if(houseSize.width > 1 || houseSize.height > 1){
			wantUse.push(house.location + 1)
		}
	}

	return _.intersection(wantUse, alreadyUsed).length == 0
}