"use strict"

/**
 * Created by modun on 14-7-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")
var sprintf = require("sprintf")

var AllianceDao = require("../dao/allianceDao")
var PlayerDao = require("../dao/playerDao")

var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var Consts = require("../consts/consts")
var Define = require("../consts/define")
var Localizations = require("../consts/localizations")

var PlayerService = function(app){
	this.app = app
	this.env = app.get("env")
	this.redis = app.get("redis")
	this.scripto = app.get("scripto")
	this.pushService = this.app.get("pushService")
	this.callbackService = this.app.get("callbackService")
	this.globalChannelService = this.app.get("globalChannelService")
	this.allianceDao = Promise.promisifyAll(new AllianceDao(this.redis, this.scripto, this.env))
	this.playerDao = Promise.promisifyAll(new PlayerDao(this.redis, this.scripto, this.env))
}

module.exports = PlayerService
var pro = PlayerService.prototype

/**
 * 清空redis中的数据
 */
pro.flushAll = function(callback){
	this.redis.flushallAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有玩家到redis
 * @param callback
 */
pro.loadAllPlayer = function(callback){
	this.playerDao.loadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有玩家保存到Mongo
 * @param callback
 */
pro.unloadAllPlayer = function(callback){
	this.playerDao.unloadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有联盟到redis
 * @param callback
 */
pro.loadAllAlliance = function(callback){
	this.allianceDao.loadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有联盟保存到Mongo
 * @param callback
 */
pro.unloadAllAlliance = function(callback){
	this.allianceDao.unloadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有数据到内存
 * @param callback
 */
pro.loadAllData = function(callback){
	var self = this
	this.flushAllAsync().then(function(){
		return self.loadAllPlayerAsync()
	}).then(function(){
		return self.loadAllAllianceAsync()
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有数据保存到Mongo
 * @param callback
 */
pro.unloadAllData = function(callback){
	var self = this
	this.unloadAllPlayerAsync().then(function(){
		return self.unloadAllAllianceAsync()
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 创建新玩家
 * @param deviceId
 * @param callback
 */
pro.createPlayer = function(deviceId, callback){
	var self = this
	Promise.promisify(crypto.randomBytes)(4).then(function(buf){
		var token = buf.toString("hex")
		var doc = {
			countInfo:{
				deviceId:deviceId
			},
			basicInfo:{
				name:"player_" + token,
				cityName:"city_" + token
			}
		}
		return self.playerDao.createAsync(doc)
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 玩家登陆逻辑服务器
 * @param playerDoc
 * @param callback
 */
pro.playerLogin = function(playerDoc, callback){
	var self = this
	var allianceDoc = null
	playerDoc.countInfo.lastLoginTime = Date.now()
	playerDoc.countInfo.loginCount += 1
	var pushFuncs = RefreshPlayerEvents.call(this, playerDoc, Date.now(), true)
	if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
		self.pushService.onPlayerLoginSuccessAsync(playerDoc).then(function(){
			callback()
		}).catch(function(e){
			callback(e)
		})
		return
	}
	this.allianceDao.findByIdAsync(playerDoc.alliance.id).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		LogicUtils.updateMyPropertyInAlliance(playerDoc, allianceDoc)
		LogicUtils.refreshAlliance(allianceDoc)
		return self.allianceDao.updateAsync(allianceDoc)
	}).then(function(){
		pushFuncs.unshift(self.pushService.onPlayerLoginSuccessAsync(playerDoc))
		pushFuncs.unshift(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		return Promise.all(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(allianceDoc)){
			self.allianceDao.removeLockByIdAsync(allianceDoc._id).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 玩家登出逻辑服
 * @param playerDoc
 * @param callback
 */
pro.playerLogout = function(playerDoc, callback){
	var self = this
	self.callbackService.removeAllPlayerCallback(playerDoc._id)
	callback()
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
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 25){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
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
		var buildEvent = null
		var pushFuncs = []
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
			if(!DataUtils.hasFreeBuildQueue(doc)){
				buildEvent = LogicUtils.getSmallestBuildEvent(doc)
				var timeRemain = (buildEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
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
			//检查是否有建筑需要从-1级升级到0级
			LogicUtils.updateBuildingsLevel(doc)
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			pushFuncs.push(self.pushService.onBuildingLevelUpAsync(doc, building.location))
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addBuildingEvent(doc, building.location, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
			if(_.isObject(buildEvent)){
				self.callbackService.removePlayerCallback(doc._id, buildEvent.finishTime)
				buildEvent.finishTime = Date.now()
				RefreshPlayerEvents.call(self, doc, buildEvent.finishTime, false)
			}
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 25){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isString(houseType)){
		callback(new Error("houseType 不合法"))
		return
	}
	if(!_.isNumber(houseLocation) || houseLocation % 1 !== 0 || houseLocation < 1 || houseLocation > 3){
		callback(new Error("houseLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}
	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
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
		var buildEvent = null
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
			if(!DataUtils.hasFreeBuildQueue(doc)){
				buildEvent = LogicUtils.getSmallestBuildEvent(doc)
				var timeRemain = (buildEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
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
			pushFuncs.push(self.pushService.onHouseLevelUpAsync(doc, building.location, house.location))
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addHouseEvent(doc, buildingLocation, houseLocation, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
			if(_.isObject(buildEvent)){
				self.callbackService.removePlayerCallback(doc._id, buildEvent.finishTime)
				buildEvent.finishTime = Date.now()
				RefreshPlayerEvents.call(self, doc, buildEvent.finishTime, false)
			}
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
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 25){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isNumber(houseLocation) || houseLocation % 1 !== 0 || houseLocation < 1 || houseLocation > 3){
		callback(new Error("houseLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
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
		var buildEvent = null
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
			if(!DataUtils.hasFreeBuildQueue(doc)){
				buildEvent = LogicUtils.getSmallestBuildEvent(doc)
				var timeRemain = (buildEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
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
			pushFuncs.push(self.pushService.onHouseLevelUpAsync(doc, building.location, house.location))
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addHouseEvent(doc, building.location, house.location, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
			if(_.isObject(buildEvent)){
				self.callbackService.removePlayerCallback(doc._id, buildEvent.finishTime)
				buildEvent.finishTime = Date.now()
				RefreshPlayerEvents.call(self, doc, buildEvent.finishTime, false)
			}
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
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 25){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isNumber(houseLocation) || houseLocation % 1 !== 0 || houseLocation < 1 || houseLocation > 3){
		callback(new Error("houseLocation 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
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
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
	if(!_.isNumber(towerLocation) || towerLocation % 1 !== 0 || towerLocation < 1 || towerLocation > 11){
		callback(new Error("towerLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
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
		var buildEvent = null
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
			if(!DataUtils.hasFreeBuildQueue(doc)){
				buildEvent = LogicUtils.getSmallestBuildEvent(doc)
				var timeRemain = (buildEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
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
			pushFuncs.push(self.pushService.onTowerLevelUpAsync(doc, tower.location))
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addTowerEvent(doc, tower.location, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
			if(_.isObject(buildEvent)){
				self.callbackService.removePlayerCallback(doc._id, buildEvent.finishTime)
				buildEvent.finishTime = Date.now()
				RefreshPlayerEvents.call(self, doc, buildEvent.finishTime, false)
			}
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
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
		var buildEvent = null
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
			if(!DataUtils.hasFreeBuildQueue(doc)){
				buildEvent = LogicUtils.getSmallestBuildEvent(doc)
				var timeRemain = (buildEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
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
			pushFuncs.push(self.pushService.onWallLevelUpAsync(doc))
		}else{
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			LogicUtils.addWallEvent(doc, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
			if(_.isObject(buildEvent)){
				self.callbackService.removePlayerCallback(doc._id, buildEvent.finishTime)
				buildEvent.finishTime = Date.now()
				RefreshPlayerEvents.call(self, doc, buildEvent.finishTime, false)
			}
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
	if(!_.contains(Consts.MaterialType, category)){
		callback(new Error("category 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var toolShop = doc.buildings["location_5"]
		if(toolShop.level < 1){
			return Promise.reject(new Error("工具作坊还未建造"))
		}
		var event = null
		for(var i = 0; i < doc.materialEvents.length; i++){
			event = doc.materialEvents[i]
			if(_.isEqual(event.category, category)){
				if(event.finishTime > 0){
					return Promise.reject(new Error("同类型的材料正在制造"))
				}else{
					return Promise.reject(new Error("同类型的材料制作完成后还未领取"))
				}
			}else{
				if(!finishNow && event.finishTime > 0){
					return Promise.reject(new Error("不同类型的材料正在制造"))
				}
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
			pushFuncs.push(self.pushService.onMakeMaterialFinishedAsync(doc, event))
		}else{
			self.callbackService.addPlayerCallback(doc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
	if(!_.contains(Consts.MaterialType, category)){
		callback(new Error("category 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var event = LogicUtils.getMaterialEventByCategory(doc, category)
		if(!_.isObject(event)){
			return Promise.reject(new Error("没有材料建造事件存在"))
		}
		if(event.finishTime > 0){
			return Promise.reject(new Error("同类型的材料正在制造"))
		}
		//移除制造事件
		LogicUtils.removeEvents([event], doc.materialEvents)
		pushFuncs.push(self.pushService.onGetMaterialSuccessAsync(doc, event))
		//将材料添加到材料仓库,超过仓库上限的直接丢弃
		DataUtils.addPlayerMaterials(doc, event.materials)
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
	if(!_.isNumber(count) || count % 1 !== 0 || count < 1){
		callback(new Error("count 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var barracks = doc.buildings["location_8"]
		if(barracks.level < 1){
			return Promise.reject(new Error("兵营还未建造"))
		}
		if(!finishNow && doc.soldierEvents.length > 0){
			return Promise.reject(new Error("已有士兵正在被招募"))
		}
		if(count > DataUtils.getSoldierMaxRecruitCount(doc, soldierName)){
			return Promise.reject(new Error("招募数量超过单次招募上限"))
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
			doc.soldiers[soldierName] += count
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			pushFuncs.push(self.pushService.onRecruitSoldierSuccessAsync(doc, soldierName, count))
		}else{
			var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
			LogicUtils.addSoldierEvent(doc, soldierName, count, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
 * 招募特殊士兵
 * @param playerId
 * @param soldierName
 * @param count
 * @param finishNow
 * @param callback
 */
pro.recruitSpecialSoldier = function(playerId, soldierName, count, finishNow, callback){
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
	if(!_.isNumber(count) || count % 1 !== 0 || count < 1){
		callback(new Error("count 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var barracks = doc.buildings["location_8"]
		if(barracks.level < 1){
			return Promise.reject(new Error("兵营还未建造"))
		}
		if(!finishNow && doc.soldierEvents.length > 0){
			return Promise.reject(new Error("已有士兵正在被招募"))
		}
		if(count > DataUtils.getSoldierMaxRecruitCount(doc, soldierName)){
			return Promise.reject(new Error("招募数量超过单次招募上限"))
		}

		var gemUsed = 0
		var recruitRequired = DataUtils.getRecruitSpecialSoldierRequired(soldierName, count)
		var buyedResources = null

		//刷新玩家资源数据
		self.refreshPlayerResources(doc)
		if(!LogicUtils.isEnough(recruitRequired.materials, doc.soldierMaterials)){
			return Promise.reject(new Error("材料不足"))
		}
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(recruitRequired.recruitTime)
			buyedResources = DataUtils.buyResources({citizen:recruitRequired.citizen}, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
		}else{
			buyedResources = DataUtils.buyResources({citizen:recruitRequired.citizen}, doc.resources)
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
		LogicUtils.reduce(recruitRequired.materials, doc.soldierMaterials)
		LogicUtils.reduce({citizen:recruitRequired.citizen}, doc.resources)
		if(finishNow){
			doc.soldiers[soldierName] += count
			//刷新玩家战力
			self.refreshPlayerPower(doc)
			pushFuncs.push(self.pushService.onRecruitSoldierSuccessAsync(doc, soldierName, count))
		}else{
			var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
			LogicUtils.addSoldierEvent(doc, soldierName, count, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
 * 制作龙的装备
 * @param playerId
 * @param equipmentName
 * @param finishNow
 * @param callback
 */
pro.makeDragonEquipment = function(playerId, equipmentName, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isDragonEquipment(equipmentName)){
		callback(new Error("equipmentName 装备不存在"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var toolShop = doc.buildings["location_9"]
		if(toolShop.level < 1){
			return Promise.reject(new Error("铁匠铺还未建造"))
		}
		if(!finishNow && doc.dragonEquipmentEvents.length > 0){
			return Promise.reject(new Error("已有装备正在制作"))
		}
		var gemUsed = 0
		var makeRequired = DataUtils.getMakeDragonEquipmentRequired(doc, equipmentName)
		var buyedResources = null
		//材料是否足够
		if(!LogicUtils.isEnough(makeRequired.materials, doc.dragonMaterials)){
			return Promise.reject(new Error("材料不足"))
		}
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(makeRequired.makeTime)
			buyedResources = DataUtils.buyResources({coin:makeRequired.coin}, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
		}else{
			buyedResources = DataUtils.buyResources({coin:makeRequired.coin}, doc.resources)
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
		LogicUtils.reduce({coin:makeRequired.coin}, doc.resources)
		//修改玩家制作龙的材料数据
		LogicUtils.reduce(makeRequired.materials, doc.dragonMaterials)
		//是否立即完成
		if(finishNow){
			doc.dragonEquipments[equipmentName] += 1
			pushFuncs.push(self.pushService.onMakeDragonEquipmentSuccessAsync(doc, equipmentName))
		}else{
			var finishTime = Date.now() + (makeRequired.makeTime * 1000)
			LogicUtils.addDragonEquipmentEvent(doc, equipmentName, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
 * 治疗伤兵
 * @param playerId
 * @param soldiers
 * @param finishNow
 * @param callback
 */
pro.treatSoldier = function(playerId, soldiers, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var hospital = doc.buildings["location_14"]
		if(hospital.level < 1){
			return Promise.reject(new Error("医院还未建造"))
		}
		if(!LogicUtils.isTreatSoldierLegal(doc, soldiers)){
			return Promise.reject(new Error("士兵不存在或士兵数量不合法"))
		}
		if(!finishNow && doc.treatSoldierEvents.length > 0){
			return Promise.reject(new Error("已有士兵正在治疗"))
		}

		var gemUsed = 0
		var treatRequired = DataUtils.getTreatSoldierRequired(doc, soldiers)
		var buyedResources = null
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(treatRequired.treatTime)
			buyedResources = DataUtils.buyResources(treatRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, doc.resources)
		}else{
			buyedResources = DataUtils.buyResources(treatRequired.resources, doc.resources)
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
		LogicUtils.reduce(treatRequired.resources, doc.resources)
		//是否立即完成
		if(finishNow){
			_.each(soldiers, function(soldier){
				doc.soldiers[soldier.name] += soldier.count
				doc.treatSoldiers[soldier.name] -= soldier.count
			})
			pushFuncs.push(self.pushService.onTreatSoldierSuccessAsync(doc, soldiers))
		}else{
			_.each(soldiers, function(soldier){
				doc.treatSoldiers[soldier.name] -= soldier.count
			})
			var finishTime = Date.now() + (treatRequired.treatTime * 1000)
			LogicUtils.addTreatSoldierEvent(doc, soldiers, finishTime)
			self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))
		}
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
		return Promise.all(pushFuncs)
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
 * 孵化龙蛋
 * @param playerId
 * @param dragonType
 * @param callback
 */
pro.hatchDragon = function(playerId, dragonType, callback){
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

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var hospital = doc.buildings["location_4"]
		if(hospital.level < 1){
			return Promise.reject(new Error("龙巢还未建造"))
		}
		self.refreshPlayerResources(doc)
		if(doc.resources.energy <= 0){
			return Promise.reject(new Error("能量不足"))
		}
		var dragon = doc.dragons[dragonType]
		if(dragon.star > 0){
			return Promise.reject(new Error("龙蛋早已成功孵化"))
		}
		var energyNeed = 100 - dragon.vitality
		if(doc.resources.energy >= energyNeed){
			dragon.star = 1
			dragon.vitality = DataUtils.getDragonMaxVitality(doc, dragon)
			dragon.strength = DataUtils.getDragonStrength(doc, dragon)
			doc.resources.energy -= energyNeed
		}else{
			dragon.vitality += doc.resources.energy
			doc.resources.energy = 0
		}
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 设置龙的某部位的装备
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param equipmentName
 * @param callback
 */
pro.setDragonEquipment = function(playerId, dragonType, equipmentCategory, equipmentName, callback){
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
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		callback(new Error("equipmentCategory 不合法"))
		return
	}
	if(!DataUtils.isDragonEquipment(equipmentName)){
		callback(new Error("equipmentName 不合法"))
		return
	}
	if(!DataUtils.isDragonEquipmentLegalAtCategory(equipmentName, equipmentCategory)){
		callback(new Error("equipmentName 不能装备到equipmentCategory"))
		return
	}
	if(!DataUtils.isDragonEquipmentLegalOnDragon(equipmentName, dragonType)){
		callback(new Error("equipmentName 不能装备到dragonType"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var dragon = doc.dragons[dragonType]
		if(dragon.star <= 0){
			return Promise.reject(new Error("龙还未孵化"))
		}
		if(!DataUtils.isDragonEquipmentStarEqualWithDragonStar(equipmentName, dragon)){
			return Promise.reject(new Error("装备与龙的星级不匹配"))
		}
		if(doc.dragonEquipments[equipmentName] <= 0){
			return Promise.reject(new Error("仓库中没有此装备"))
		}
		var equipment = dragon.equipments[equipmentCategory]
		if(!_.isEmpty(equipment.name)){
			return Promise.reject(new Error("龙身上已经存在相同类型的装备"))
		}
		equipment.name = equipmentName
		equipment.buffs = DataUtils.generateDragonEquipmentBuffs(equipmentName)
		doc.dragonEquipments[equipmentName] -= 1
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 强化龙的装备
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param equipments
 * @param callback
 */
pro.enhanceDragonEquipment = function(playerId, dragonType, equipmentCategory, equipments, callback){
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
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		callback(new Error("equipmentCategory 不合法"))
		return
	}
	if(!_.isArray(equipments)){
		callback(new Error("equipments 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var dragon = doc.dragons[dragonType]
		var equipment = dragon.equipments[equipmentCategory]
		if(_.isEmpty(equipment.name)){
			return Promise.reject(new Error("此分类还没有配置装备"))
		}
		if(DataUtils.isDragonEquipmentReachMaxStar(equipment)){
			return Promise.reject(new Error("装备已到最高星级"))
		}
		if(!LogicUtils.isEnhanceDragonEquipmentLegal(doc, equipments)){
			return Promise.reject(new Error("被强化的装备不存在或数量不足"))
		}
		DataUtils.enhanceDragonEquipment(doc, dragonType, equipmentCategory, equipments)
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 重置装备随机属性
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param callback
 */
pro.resetDragonEquipment = function(playerId, dragonType, equipmentCategory, callback){
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
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		callback(new Error("equipmentCategory 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var dragon = doc.dragons[dragonType]
		var equipment = dragon.equipments[equipmentCategory]
		if(_.isEmpty(equipment.name)){
			return Promise.reject(new Error("此分类还没有配置装备"))
		}
		if(doc.dragonEquipments[equipment.name] <= 0){
			return Promise.reject(new Error("仓库中没有此装备"))
		}
		equipment.buffs = DataUtils.generateDragonEquipmentBuffs(equipment.name)
		doc.dragonEquipments[equipment.name] -= 1
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 升级龙的技能
 * @param playerId
 * @param dragonType
 * @param skillLocation
 * @param callback
 */
pro.upgradeDragonSkill = function(playerId, dragonType, skillLocation, callback){
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
	if(!_.isNumber(skillLocation) || skillLocation % 1 !== 0 || skillLocation < 1 || skillLocation > 9){
		callback(new Error("skillLocation 不合法"))
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var dragon = doc.dragons[dragonType]
		if(dragon.star <= 0){
			return Promise.reject(new Error("龙还未孵化"))
		}
		var skill = dragon.skills["skill_" + skillLocation]
		if(!DataUtils.isDragonSkillUnlocked(dragon, skill.name)){
			return Promise.reject(new Error("此技能还未解锁"))
		}
		if(DataUtils.isDragonSkillReachMaxLevel(skill)){
			return Promise.reject(new Error("技能已达最高等级"))
		}

		var upgradeRequired = DataUtils.getDragonSkillUpgradeRequired(doc, dragon, skill)
		self.refreshPlayerResources(doc)
		if(doc.resources.energy < upgradeRequired.energy){
			return Promise.reject(new Error("能量不足"))
		}
		if(doc.resources.blood < upgradeRequired.blood){
			return Promise.reject(new Error("英雄之血不足"))
		}
		skill.level += 1
		doc.resources.energy -= upgradeRequired.energy
		doc.resources.blood -= upgradeRequired.blood
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 升级龙的星级
 * @param playerId
 * @param dragonType
 * @param callback
 */
pro.upgradeDragonStar = function(playerId, dragonType, callback){
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

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var dragon = doc.dragons[dragonType]
		if(dragon.star <= 0){
			return Promise.reject(new Error("龙还未孵化"))
		}
		if(DataUtils.isDragonReachMaxStar(dragon)){
			return Promise.reject(new Error("龙的星级已达最高"))
		}
		if(!DataUtils.isDragonReachUpgradeLevel(dragon)){
			return Promise.reject(new Error("龙的等级未达到晋级要求"))
		}
		if(!DataUtils.isDragonEquipmentsReachUpgradeLevel(dragon)){
			return Promise.reject(new Error("龙的装备未达到晋级要求"))
		}
		//晋级
		dragon.star += 1
		dragon.vitality = DataUtils.getDragonMaxVitality(doc, dragon)
		dragon.strength = DataUtils.getDragonStrength(doc, dragon)
		//清除装备
		_.each(dragon.equipments, function(equipment){
			equipment.name = ""
			equipment.star = 0
			equipment.exp = 0
			equipment.buffs = []
		})
		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 向城民收取银币
 * @param playerId
 * @param callback
 */
pro.impose = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var building = doc.buildings["location_15"]
		if(building.level <= 0){
			return Promise.reject(new Error("市政厅还未建造"))
		}
		if(doc.coinEvents.length > 0){
			return Promise.reject(new Error("正在收税中"))
		}

		self.refreshPlayerResources(doc)
		var required = DataUtils.getImposeRequired(doc)
		var imposedCoin = DataUtils.getImposedCoin(doc)
		if(required.citizen > doc.resources.citizen){
			return Promise.reject(new Error("空闲城民不足"))
		}
		doc.resources.citizen -= required.citizen
		var finishTime = Date.now() + (required.imposeTime * 1000)
		LogicUtils.addCoinEvent(doc, imposedCoin, finishTime)
		self.callbackService.addPlayerCallback(doc._id, finishTime, ExcutePlayerCallback.bind(self))

		//保存玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 设置玩家语言
 * @param playerId
 * @param language
 * @param callback
 */
pro.setPlayerLanguage = function(playerId, language, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		callback(new Error("language 不合法"))
		return
	}
	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		doc.countInfo.language = language
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 获取玩家个人信息
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.getPlayerInfo = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(memberId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		return self.pushService.onGetPlayerInfoSuccessAsync(playerDoc)
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
 * 发送个人邮件
 * @param playerId
 * @param memberId
 * @param title
 * @param content
 * @param callback
 */
pro.sendMail = function(playerId, memberId, title, content, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(!_.isString(title)){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(content)){
		callback(new Error("content 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var memberDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isEqual(doc._id, memberId)){
			return Promise.reject(new Error("不能给自己发邮件"))
		}
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		var mailToMember = {
			title:title,
			fromId:playerDoc._id,
			fromName:playerDoc.basicInfo.name,
			content:content,
			sendTime:Date.now()
		}
		if(memberDoc.mails.length >= Define.PlayerMailInboxMessageMaxSize){
			memberDoc.mails.shift()
		}
		memberDoc.mails.push(mailToMember)

		var mailToPlayer = {
			title:title,
			fromName:playerDoc.basicInfo.name,
			content:content,
			sendTime:Date.now()
		}
		if(playerDoc.sendMails.length >= Define.PlayerMailSendboxMessageMaxSize){
			playerDoc.sendMails.shift()
		}
		playerDoc.sendMails.push(mailToPlayer)

		var funcs = []
		funcs.push(self.playerDao.updateAsync(playerDoc))
		funcs.push(self.playerDao.updateAsync(memberDoc))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		if(!_.isEmpty(memberDoc.logicServerId)){
			funcs.push(self.pushService.onPlayerDataChangedAsync(memberDoc))
		}
		return Promise.all(funcs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
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
 * 保存邮件
 * @param playerId
 * @param mailIndex
 * @param callback
 */
pro.saveMail = function(playerId, mailIndex, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(mailIndex) || mailIndex % 1 !== 0 || mailIndex < 0){
		callback(new Error("mailIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var mail = doc.mails[mailIndex]
		if(!_.isObject(mail)){
			return Promise.reject(new Error("邮件不存在"))
		}
		if(doc.savedMails.length >= Define.PlayerMailFavoriteMessageMaxSize){
			doc.savedMails.shift()
		}
		doc.savedMails.push(mail)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc)
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
 * 发送联盟邮件
 * @param playerId
 * @param title
 * @param content
 * @param callback
 */
pro.sendAllianceMail = function(playerId, title, content, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(title)){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(content)){
		callback(new Error("content 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDocs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "sendAllianceMail")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var funcs = []
		funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		var mailToPlayer = {
			title:title,
			fromName:playerDoc.basicInfo.name,
			contend:content,
			sendTime:Date.now()
		}
		var mailToMember = {
			title:title,
			fromId:playerDoc._id,
			fromName:playerDoc.basicInfo.name,
			content:content,
			sendTime:Date.now()
		}

		if(playerDoc.sendMails.length >= Define.PlayerMailSendboxMessageMaxSize){
			playerDoc.sendMails.shift()
		}
		playerDoc.sendMails.push(mailToPlayer)
		if(playerDoc.mails.length >= Define.PlayerMailInboxMessageMaxSize){
			playerDoc.mails.shift()
		}
		playerDoc.mails.push(mailToMember)

		var savePlayerDoc = function(){
			return self.playerDao.updateAsync(playerDoc).then(function(){
				pushFuncs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
				return Promise.resolve()
			}).catch(function(e){
				return Promise.reject(e)
			})
		}
		funcs.push(savePlayerDoc())

		var saveMemberDoc = function(member){
			var memberDoc = null
			return self.playerDao.findByIdAsync(member.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				memberDoc = doc
				memberDocs.push(memberDoc)
				if(memberDoc.mails.length >= Define.PlayerMailInboxMessageMaxSize){
					memberDoc.mails.shift()
				}
				memberDoc.mails.push(mailToMember)
				return self.playerDao.updateAsync(memberDoc)
			}).then(function(){
				if(!_.isEmpty(memberDoc.logicServerId)){
					pushFuncs.push(self.pushService.onPlayerDataChangedAsync(memberDoc))
				}
			}).then(function(){
				return Promise.resolve()
			}).catch(function(e){
				return Promise.reject(e)
			})
		}
		_.each(allianceDoc.members, function(member){
			if(!_.isEqual(member.id, playerDoc._id)){
				funcs.push(saveMemberDoc(member))
			}
		})

		return Promise.all(funcs)
	}).then(function(){
		return Promise.all(pushFuncs)
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
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		})
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
 * 创建联盟
 * @param playerId
 * @param name
 * @param tag
 * @param language
 * @param terrain
 * @param flag
 * @param callback
 */
pro.createAlliance = function(playerId, name, tag, language, terrain, flag, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		callback(new Error("language 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		callback(new Error("terrain 不合法"))
		return
	}
	if(!_.isString(flag)){
		callback(new Error("flag 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceFinded = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!!doc.alliance && !_.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家已加入了联盟"))
		}
		var gemUsed = DataUtils.getGemByCreateAlliance()
		if(playerDoc.resources.gem < gemUsed){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		return Promise.resolve()
	}).then(function(){
		return self.allianceDao.findByIndexAsync("basicInfo.name", name)
	}).then(function(doc){
		if(_.isObject(doc)){
			allianceFinded = doc
			return Promise.reject(new Error("联盟名称已经存在"))
		}
		return self.allianceDao.findByIndexAsync("basicInfo.tag", tag)
	}).then(function(doc){
		if(_.isObject(doc)){
			allianceFinded = doc
			return Promise.reject(new Error("联盟标签已经存在"))
		}

		var alliance = {
			basicInfo:{
				name:name,
				tag:tag,
				language:language,
				terrain:terrain,
				flag:flag,
				power:playerDoc.basicInfo.power,
				kill:playerDoc.basicInfo.kill
			},
			members:[
				{
					id:playerDoc._id,
					name:playerDoc.basicInfo.name,
					level:playerDoc.basicInfo.level,
					power:playerDoc.basicInfo.power,
					kill:playerDoc.basicInfo.kill,
					title:Consts.AllianceTitle.Archon
				}
			]
		}
		return self.allianceDao.createAsync(alliance)
	}).then(function(doc){
		allianceDoc = doc
		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			title:Consts.AllianceTitle.Archon,
			titleName:allianceDoc.titles.archon
		}

		var funcs = []
		funcs.push(self.playerDao.updateAsync(playerDoc))
		funcs.push(self.globalChannelService.addAsync(Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		funcs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		return Promise.all(funcs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(allianceFinded)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceFinded._id))
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
 * 搜索联盟
 * @param playerId
 * @param tag
 * @param callback
 */
pro.searchAllianceByTag = function(playerId, tag, callback){
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
	}).spread(function(removeStatus, docs){
		return self.pushService.onSearchAllianceSuccessAsync(playerDoc, docs)
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
 * 编辑联盟基础信息
 * @param playerId
 * @param name
 * @param tag
 * @param language
 * @param terrain
 * @param flag
 * @param callback
 */
pro.editAllianceBasicInfo = function(playerId, name, tag, language, terrain, flag, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(tag)){
		callback(new Error("tag 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		callback(new Error("language 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		callback(new Error("terrain 不合法"))
		return
	}
	if(!_.isString(flag)){
		callback(new Error("flag 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceDocFinded = null
	var allianceMemberDocs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "editAllianceBasicInfo")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(_.isEqual(allianceDoc.basicInfo.name, name)){
			return Promise.resolve(allianceDoc)
		}else{
			return self.allianceDao.findByIndexAsync("basicInfo.name", name)
		}
	}).then(function(doc){
		if(_.isObject(doc) && !_.isEqual(doc._id, allianceDoc._id)){
			allianceDocFinded = doc
			return Promise.reject(new Error("联盟名称已经存在"))
		}
		if(_.isEqual(allianceDoc.basicInfo.tag, tag)){
			return Promise.resolve(allianceDoc)
		}else{
			return self.allianceDao.findByIndexAsync("basicInfo.tag", tag)
		}
	}).then(function(doc){
		if(_.isObject(doc) && !_.isEqual(doc._id, allianceDoc._id)){
			allianceDocFinded = doc
			return Promise.reject(new Error("联盟标签已经存在"))
		}
		var isNameChanged = !_.isEqual(allianceDoc.basicInfo.name, name)
		allianceDoc.basicInfo.name = name
		allianceDoc.basicInfo.tag = tag
		allianceDoc.basicInfo.language = language
		allianceDoc.basicInfo.terrain = terrain
		allianceDoc.basicInfo.flag = flag

		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		if(isNameChanged){
			var updateMember = function(member){
				return self.playerDao.findByIdAsync(member.id).then(function(doc){
					if(!_.isObject(doc)){
						return Promise.reject(new Error("玩家不存在"))
					}
					allianceMemberDocs.push(doc)
					doc.alliance.name = name
					return self.playerDao.updateAsync(doc)
				}).then(function(doc){
					if(!_.isEmpty(doc.logicServerId)){
						pushFuncs.push(self.pushService.onPlayerDataChangedAsync(doc))
					}
					return Promise.resolve()
				}).catch(function(e){
					return Promise.reject(e)
				})
			}
			_.each(allianceDoc.members, function(member){
				funcs.push(updateMember(member))
			})
		}
		return Promise.all(funcs)
	}).then(function(){
		pushFuncs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		return Promise.all(pushFuncs)
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
		if(_.isObject(allianceDocFinded)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDocFinded._id))
		}
		_.each(allianceMemberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		})
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
 * 编辑职位名称
 * @param playerId
 * @param title
 * @param titleName
 * @param callback
 */
pro.editTitleName = function(playerId, title, titleName, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTitle, title)){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(titleName)){
		callback(new Error("titleName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "editTitleName")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.titles[title] = titleName
		return self.allianceDao.updateAsync(allianceDoc)
	}).then(function(){
		var func = function(member){
			return self.playerDao.findByIdAsync(member.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				doc.alliance.titleName = titleName
				return self.playerDao.updateAsync(doc)
			}).then(function(doc){
				if(!_.isEmpty(doc.logicServerId)){
					pushFuncs.push(self.pushService.onPlayerDataChangedAsync(doc))
				}
				return Promise.resolve()
			}).catch(function(e){
				return Promise.reject(e)
			})
		}
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		_.each(allianceDoc.members, function(member){
			if(_.isEqual(member.title, title)){
				funcs.push(func(member))
			}
		})
		return Promise.all(funcs)
	}).then(function(){
		pushFuncs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		return Promise.all(pushFuncs)
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
 * 编辑联盟公告
 * @param playerId
 * @param notice
 * @param callback
 */
pro.editAllianceNotice = function(playerId, notice, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(notice)){
		callback(new Error("notice 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "editAllianceNotice")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.notice = notice
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc)
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
 * 编辑联盟描述
 * @param playerId
 * @param description
 * @param callback
 */
pro.editAllianceDescription = function(playerId, description, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(description)){
		callback(new Error("description 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "editAllianceDescription")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.desc = description
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc)
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
 * 编辑联盟加入方式
 * @param playerId
 * @param joinType
 * @param callback
 */
pro.editAllianceJoinType = function(playerId, joinType, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceJoinType, joinType)){
		callback(new Error("joinType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "editAllianceJoinType")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.basicInfo.joinType = joinType
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc)
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
 * 修改联盟某个玩家的职位
 * @param playerId
 * @param memberId
 * @param title
 * @param callback
 */
pro.modifyAllianceMemberTitle = function(playerId, memberId, title, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceTitle, title)){
		callback(new Error("title 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var memberInAllianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "modifyAllianceMemberTitle")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)){
			return Promise.reject(new Error("联盟没有此玩家"))
		}
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerInAllianceDoc.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberInAllianceDoc.title)
		var afterMemberLevel = DataUtils.getAllianceTitleLevel(title)
		if(currentMemberLevel <= myMemberLevel){
			return Promise.reject(new Error("不能对职级高于或等于自己的玩家进行升级降级操作"))
		}
		if(afterMemberLevel <= myMemberLevel){
			return Promise.reject(new Error("不能将玩家的职级调整到与自己平级或者比自己高"))
		}
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberInAllianceDoc.title = title
		memberDoc = doc
		memberDoc.alliance.title = title
		memberDoc.alliance.titleName = allianceDoc.titles[title]

		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.playerDao.updateAsync(memberDoc))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		if(!_.isEmpty(memberDoc.logicServerId)){
			funcs.push(self.pushService.onPlayerDataChangedAsync(memberDoc))
		}
		return Promise.all(funcs)
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
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
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
 * 将玩家踢出联盟
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.kickAllianceMemberOff = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var memberInAllianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "modifyAllianceMemberTitle")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)){
			return Promise.reject(new Error("联盟没有此玩家"))
		}
		var myMemberLevel = DataUtils.getAllianceTitleLevel(playerInAllianceDoc.title)
		var currentMemberLevel = DataUtils.getAllianceTitleLevel(memberInAllianceDoc.title)
		if(currentMemberLevel <= myMemberLevel){
			return Promise.reject(new Error("不能将职级高于或等于自己的玩家踢出联盟"))
		}
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		memberDoc.alliance = null
		LogicUtils.removeItemInArray(allianceDoc.members, memberInAllianceDoc)
		LogicUtils.refreshAlliance(allianceDoc)

		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		if(memberDoc.logicServerId){
			funcs.push(self.globalChannelService.leaveAsync(Consts.AllianceChannelPrefix + allianceDoc._id, memberDoc._id, memberDoc.logicServerId))
		}
		funcs.push(self.playerDao.updateAsync(memberDoc))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		if(!_.isEmpty(memberDoc.logicServerId)){
			funcs.push(self.pushService.onPlayerDataChangedAsync(memberDoc))
		}
		return Promise.all(funcs)
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
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
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
 * 移交盟主职位
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.handOverArchon = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var memberInAllianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!_.isEqual(doc.alliance.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(new Error("别逗了,你是不盟主好么"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		memberInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberInAllianceDoc)){
			return Promise.reject(new Error("联盟没有此玩家"))
		}

		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		playerInAllianceDoc.title = Consts.AllianceTitle.Member
		playerDoc.alliance.title = Consts.AllianceTitle.Member
		playerDoc.alliance.titleName = allianceDoc.titles.member

		memberInAllianceDoc.title = Consts.AllianceTitle.Archon
		memberDoc.alliance.title = Consts.AllianceTitle.Archon
		memberDoc.alliance.titleName = allianceDoc.titles.archon

		var funcs = []
		funcs.push(self.playerDao.updateAsync(playerDoc))
		funcs.push(self.playerDao.updateAsync(memberDoc))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		if(!_.isEmpty(memberDoc.logicServerId)){
			funcs.push(self.pushService.onPlayerDataChangedAsync(memberDoc))
		}
		funcs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		return Promise.all(funcs)
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
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
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
 * 退出联盟
 * @param playerId
 * @param callback
 */
pro.quitAlliance = function(playerId, callback){
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
	var playerInAlliance = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(_.isEqual(doc.alliance.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(new Error("别逗了,盟主不能直接退出联盟好么"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		playerInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		LogicUtils.removeItemInArray(allianceDoc.members, playerInAlliance)
		LogicUtils.refreshAlliance(allianceDoc)
		playerDoc.alliance = null

		var funcs = []
		funcs.push(self.playerDao.updateAsync(playerDoc))
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		funcs.push(self.globalChannelService.leaveAsync(Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		funcs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		return Promise.all(funcs)
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
 * 直接加入某联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.joinAllianceDirectly = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(doc.alliance) && !_.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(!_.isEqual(doc.basicInfo.joinType, Consts.AllianceJoinType.All)){
			return Promise.reject(new Error("联盟不允许直接加入"))
		}

		var member = {
			id:playerDoc._id,
			name:playerDoc.basicInfo.name,
			level:playerDoc.basicInfo.level,
			power:playerDoc.basicInfo.power,
			title:Consts.AllianceTitle.Member
		}
		allianceDoc.members.push(member)
		LogicUtils.refreshAlliance(allianceDoc)

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}

		var funcs = []

		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("联盟不存在"))
				}
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, playerId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.reject(new Error("玩家请求事件不存在"))
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				pushFuncs.push(self.pushService.onAllianceDataChangedAsync(doc))
				return self.allianceDao.updateAsync(doc)
			})
		}
		_.each(playerDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return SendSystemMail.call(self, inviterId, titleKey, [], contentKey, [playerDoc.basicInfo.name])
		}
		_.each(playerDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)

		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		funcs.push(self.playerDao.updateAsync(playerDoc))
		return Promise.all(funcs)
	}).then(function(){
		pushFuncs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		pushFuncs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		return Promise.all(pushFuncs)
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
 * 申请加入联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.requestToJoinAlliance = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(doc.alliance) && !_.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		if(doc.requestToAllianceEvents.length >= Define.RequestJoinAllianceMessageMaxSize){
			return Promise.reject(new Error("联盟申请已满,请撤消部分申请后再来申请"))
		}
		if(LogicUtils.hasPendingRequestEventToAlliance(doc, allianceId)){
			return Promise.reject(new Error("对此联盟的申请已发出,请耐心等候审核"))
		}
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(doc.joinRequestEvents.length >= Define.AllianceRequestMessageMaxSize){
			return Promise.reject(new Error("此联盟的申请信息已满,请等候其处理后再进行申请"))
		}
		var requestTime = Date.now()
		LogicUtils.addAllianceRequestEvent(allianceDoc, playerDoc, requestTime)
		LogicUtils.addPlayerJoinAllianceEvent(playerDoc, allianceDoc, requestTime)
		var funcs = []
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		funcs.push(self.playerDao.updateAsync(playerDoc))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		funcs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		return Promise.all(funcs)
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
 * 取消对某联盟的加入申请
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.cancelJoinAllianceRequest = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(doc.alliance) && !_.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var eventInPlayer = LogicUtils.getRequestToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(eventInPlayer)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		var eventInAlliance = LogicUtils.getPlayerRequestEventAtAlliance(allianceDoc, playerId)
		if(!_.isObject(eventInAlliance)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		LogicUtils.removeItemInArray(playerDoc.requestToAllianceEvents, eventInPlayer)
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, eventInAlliance)

		var funcs = []
		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		funcs.push(self.playerDao.updateAsync(playerDoc))
		return Promise.all(funcs)
	}).then(function(){
		var funcs = []
		funcs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		funcs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		return Promise.all(funcs)
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
 * 处理加入联盟申请
 * @param playerId
 * @param memberId
 * @param agree
 * @param callback
 */
pro.handleJoinAllianceRequest = function(playerId, memberId, agree, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(!_.isBoolean(agree)){
		callback(new Error("agree 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "handleJoinAllianceRequest")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		var eventInMember = LogicUtils.getRequestToAllianceEvent(memberDoc, allianceDoc._id)
		if(!_.isObject(eventInMember)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		var eventInAlliance = LogicUtils.getPlayerRequestEventAtAlliance(allianceDoc, memberId)
		if(!_.isObject(eventInAlliance)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		LogicUtils.removeItemInArray(memberDoc.requestToAllianceEvents, eventInMember)
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, eventInAlliance)

		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		if(!agree){
			funcs.push(self.allianceDao.updateAsync(allianceDoc))
			funcs.push(self.playerDao.updateAsync(memberDoc))
			return Promise.all(funcs)
		}

		var member = {
			id:memberDoc._id,
			name:memberDoc.basicInfo.name,
			level:memberDoc.basicInfo.level,
			power:memberDoc.basicInfo.power,
			title:Consts.AllianceTitle.Member
		}
		allianceDoc.members.push(member)
		LogicUtils.refreshAlliance(allianceDoc)

		memberDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}

		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("联盟不存在"))
				}
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, memberId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.reject(new Error("玩家请求事件不存在"))
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				pushFuncs.push(self.pushService.onAllianceDataChangedAsync(doc))
				return self.allianceDao.updateAsync(doc)
			})
		}
		_.each(memberDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(memberDoc.requestToAllianceEvents)

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return SendSystemMail.call(self, inviterId, titleKey, [], contentKey, [memberDoc.basicInfo.name])
		}
		_.each(memberDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(memberDoc.inviteToAllianceEvents)

		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		funcs.push(self.playerDao.updateAsync(memberDoc))
		return Promise.all(funcs)
	}).then(function(){
		var titleKeyApproved = Localizations.Alliance.RequestApprovedTitle
		var titleKeyRejected = Localizations.Alliance.RequestRejectedTitle
		var contentKeyApproved = Localizations.Alliance.RequestApprovedContent
		var contentKeyRejected = Localizations.Alliance.RequestRejectedContent
		var titleKey = agree ? titleKeyApproved : titleKeyRejected
		var contentKey = agree ? contentKeyApproved : contentKeyRejected
		return SendSystemMail.call(self, memberId, titleKey, [], contentKey, [allianceDoc.basicInfo.name])
	}).then(function(){
		pushFuncs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		if(!_.isEmpty(memberDoc.logicServerId)){
			pushFuncs.push(self.pushService.onPlayerDataChangedAsync(memberDoc))
		}
		return Promise.all(pushFuncs)
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
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
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
 * 邀请玩家加入联盟
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.inviteToJoinAlliance = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var memberDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(doc.alliance.title, "inviteToJoinAlliance")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(doc.alliance.id))
		funcs.push(self.playerDao.findByIdAsync(memberId))
		return Promise.all(funcs)
	}).spread(function(theAllianceDoc, theMemberDoc){
		if(!_.isObject(theAllianceDoc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = theAllianceDoc
		if(!_.isObject(theMemberDoc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = theMemberDoc
		if(_.isObject(theMemberDoc.alliance) && !_.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		if(theMemberDoc.inviteToAllianceEvents.length >= Define.InviteJoinAllianceMessageMaxSize){
			return Promise.reject(new Error("此玩家的邀请信息已满,请等候其处理后再进行邀请"))
		}
		var inviteTime = Date.now()
		LogicUtils.addPlayerInviteAllianceEvent(playerDoc._id, memberDoc, allianceDoc, inviteTime)
		var funcs = []
		funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		funcs.push(self.playerDao.updateAsync(memberDoc))
		return Promise.all(funcs)
	}).then(function(){
		if(!_.isEmpty(memberDoc.logicServerId)){
			return self.pushService.onPlayerDataChangedAsync(memberDoc)
		}
		return Promise.resolve()
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
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
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
 * 处理加入联盟邀请
 * @param playerId
 * @param allianceId
 * @param agree
 * @param callback
 */
pro.handleJoinAllianceInvite = function(playerId, allianceId, agree, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}
	if(!_.isBoolean(agree)){
		callback(new Error("agree 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var inviteEvent = null
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(doc.alliance) && !_.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		var event = LogicUtils.getInviteToAllianceEvent(doc, allianceId)
		if(!_.isObject(event)){
			return Promise.reject(new Error("邀请事件不存在"))
		}
		inviteEvent = event
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		LogicUtils.removeItemInArray(playerDoc.inviteToAllianceEvents, inviteEvent)
		var funcs = []
		if(!agree){
			funcs.push(self.playerDao.updateAsync(playerDoc))
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
			return
		}

		var member = {
			id:playerDoc._id,
			name:playerDoc.basicInfo.name,
			level:playerDoc.basicInfo.level,
			power:playerDoc.basicInfo.power,
			title:Consts.AllianceTitle.Member
		}
		allianceDoc.members.push(member)
		LogicUtils.refreshAlliance(allianceDoc)

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}

		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("联盟不存在"))
				}
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, playerId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.reject(new Error("玩家请求事件不存在"))
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				pushFuncs.push(self.pushService.onAllianceDataChangedAsync(doc))
				return self.allianceDao.updateAsync(doc)
			})
		}
		_.each(playerDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return SendSystemMail.call(self, inviterId, titleKey, [], contentKey, [playerDoc.basicInfo.name])
		}
		_.each(playerDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)

		funcs.push(self.allianceDao.updateAsync(allianceDoc))
		funcs.push(self.playerDao.updateAsync(playerDoc))
		return Promise.all(funcs)
	}).then(function(){
		var titleKeyApproved = Localizations.Alliance.InviteApprovedTitle
		var titleKeyRejected = Localizations.Alliance.InviteRejectedTitle
		var contentKeyApproved = Localizations.Alliance.InviteApprovedContent
		var contentKeyRejected = Localizations.Alliance.InviteRejectedContent
		var titleKey = agree ? titleKeyApproved : titleKeyRejected
		var contentKey = agree ? contentKeyApproved : contentKeyRejected
		return SendSystemMail.call(self, inviteEvent.inviterId, titleKey, [], contentKey, [playerDoc.basicInfo.name])
	}).then(function(){
		if(agree){
			pushFuncs.push(self.pushService.onAllianceDataChangedAsync(allianceDoc))
		}
		pushFuncs.push(self.pushService.onPlayerDataChangedAsync(playerDoc))
		return Promise.all(pushFuncs)
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
 * 刷新玩家事件
 * @param playerDoc
 * @param finishTime
 * @param isLogin
 * @returns {Array}
 * @constructor
 */
var RefreshPlayerEvents = function(playerDoc, finishTime, isLogin){
	var self = this
	var pushFuncs = []
	//更新资源数据
	this.refreshPlayerResources(playerDoc)
	//检查建筑
	var buildingFinishedEvents = []
	_.each(playerDoc.buildingEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			buildingFinishedEvents.push(event)
			var building = LogicUtils.getBuildingByEvent(playerDoc, event)
			building.level += 1
			//检查是否有建筑需要从-1级升级到0级
			LogicUtils.updateBuildingsLevel(playerDoc)
			pushFuncs.push(self.pushService.onBuildingLevelUpAsync(playerDoc, event.location))
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(buildingFinishedEvents, playerDoc.buildingEvents)
	//检查小屋
	var houseFinishedEvents = []
	_.each(playerDoc.houseEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			houseFinishedEvents.push(event)
			var house = LogicUtils.getHouseByEvent(playerDoc, event)
			house.level += 1
			pushFuncs.push(self.pushService.onHouseLevelUpAsync(playerDoc, event.buildingLocation, event.houseLocation))
			//如果是住宅,送玩家城民
			if(_.isEqual("dwelling", house.type)){
				var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
				var next = DataUtils.getDwellingPopulationByLevel(house.level)
				playerDoc.resources.citizen += next - previous
				self.refreshPlayerResources(playerDoc)
			}else if(event.finishTime > 0 && isLogin){
				self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
			}
		}
	})
	LogicUtils.removeEvents(houseFinishedEvents, playerDoc.houseEvents)
	//检查箭塔
	var towerFinishedEvents = []
	_.each(playerDoc.towerEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			var tower = LogicUtils.getTowerByEvent(playerDoc, event)
			tower.level += 1
			pushFuncs.push(self.pushService.onTowerLevelUpAsync(playerDoc, event.location))
			towerFinishedEvents.push(event)
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(towerFinishedEvents, playerDoc.towerEvents)
	//检查城墙
	var wallFinishedEvents = []
	_.each(playerDoc.wallEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			var wall = playerDoc.wall
			wall.level += 1
			pushFuncs.push(self.pushService.onWallLevelUpAsync(playerDoc))
			wallFinishedEvents.push(event)
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(wallFinishedEvents, playerDoc.wallEvents)
	//检查材料制造
	_.each(playerDoc.materialEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			event.finishTime = 0
			pushFuncs.push(self.pushService.onMakeMaterialFinishedAsync(playerDoc, event))
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	//检查招募事件
	var soldierFinishedEvents = []
	_.each(playerDoc.soldierEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			playerDoc.soldiers[event.name] += event.count
			pushFuncs.push(self.pushService.onRecruitSoldierSuccessAsync(playerDoc, event.name, event.count))
			soldierFinishedEvents.push(event)
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(soldierFinishedEvents, playerDoc.soldierEvents)
	//检查龙装备制作事件
	var dragonEquipmentFinishedEvents = []
	_.each(playerDoc.dragonEquipmentEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			playerDoc.dragonEquipments[event.name] += 1
			pushFuncs.push(self.pushService.onMakeDragonEquipmentSuccessAsync(playerDoc, event.name))
			dragonEquipmentFinishedEvents.push(event)
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(dragonEquipmentFinishedEvents, playerDoc.dragonEquipmentEvents)
	//检查医院治疗伤兵事件
	var treatSoldierFinishedEvents = []
	_.each(playerDoc.treatSoldierEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			_.each(event.soldiers, function(soldier){
				playerDoc.soldiers[soldier.name] += soldier.count
			})
			pushFuncs.push(self.pushService.onTreatSoldierSuccessAsync(playerDoc, event.soldiers))
			treatSoldierFinishedEvents.push(event)
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(treatSoldierFinishedEvents, playerDoc.treatSoldierEvents)
	//检查城民税收事件
	var coinFinishedEvents = []
	_.each(playerDoc.coinEvents, function(event){
		if(event.finishTime > 0 && event.finishTime <= finishTime){
			playerDoc.resources.coin += event.coin
			pushFuncs.push(self.pushService.onImposeSuccessAsync(playerDoc, event.coin))
			coinFinishedEvents.push(event)
		}else if(event.finishTime > 0 && isLogin){
			self.callbackService.addPlayerCallback(playerDoc._id, event.finishTime, ExcutePlayerCallback.bind(self))
		}
	})
	LogicUtils.removeEvents(coinFinishedEvents, playerDoc.coinEvents)

	//刷新玩家战力
	this.refreshPlayerPower(playerDoc)
	return pushFuncs
}

/**
 * 执行玩家延迟执行事件
 * @param playerId
 * @param finishTime
 * @constructor
 */
var ExcutePlayerCallback = function(playerId, finishTime){
	var self = this
	var pushFuncs = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		pushFuncs = RefreshPlayerEvents.call(self, doc, finishTime, false)
		//更新玩家数据
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家信息到客户端
		pushFuncs.unshift(self.pushService.onPlayerDataChangedAsync(doc))
	}).catch(function(e){
		errorLogger.error("handle excutePlayerCallback Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle excutePlayerCallback Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}


/**
 * 发送系统邮件
 * @param playerId
 * @param titleKey
 * @param titleArgs
 * @param contentKey
 * @param contentArgs
 */
var SendSystemMail = function(playerId, titleKey, titleArgs, contentKey, contentArgs){
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isObject(titleKey)){
		callback(new Error("titleKey 不合法"))
		return
	}
	if(!_.isArray(titleArgs)){
		callback(new Error("titleArgs 不合法"))
		return
	}
	if(!_.isObject(contentKey)){
		callback(new Error("contentKey 不合法"))
		return
	}
	if(!_.isArray(contentArgs)){
		callback(new Error("contentArgs 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	return this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var language = doc.countInfo.language
		var title = titleKey[language]
		var content = contentKey[language]
		if(!_.isString(title)){
			return Promise.reject(new Error("title 本地化不存在"))
		}
		if(!_.isString(content)){
			return Promise.reject(new Error("content 本地化不存在"))
		}
		if(titleArgs.length > 0){
			title = sprintf.vsprintf(title, titleArgs)
		}
		if(contentArgs.length > 0){
			content = sprintf.vsprintf(content, contentArgs)
		}

		var mail = {
			title:title,
			fromId:"system",
			fromName:"system",
			sendTime:Date.now(),
			content:content
		}
		if(doc.mails.length >= Define.PlayerMailInboxMessageMaxSize){
			doc.mails.shift()
		}
		doc.mails.push(mail)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		if(!_.isEmpty(doc.logicServerId)){
			self.pushService.onPlayerDataChanged(doc)
		}
		return Promise.resolve()
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