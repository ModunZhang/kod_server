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
var TaskUtils = require("../utils/taskUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = PlayerApiService
var pro = PlayerApiService.prototype

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
			countInfo:{deviceId:deviceId},
			basicInfo:{name:"player_" + token, cityName:"city_" + token}
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
	var enemyAllianceDoc = null
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	var memberDoc = null
	var expAdd = null

	var previousLoginDateString = LogicUtils.getDateString(playerDoc.countInfo.lastLoginTime)
	var todayDateString = LogicUtils.getTodayDateString()
	if(!_.isEqual(todayDateString, previousLoginDateString)){
		_.each(playerDoc.dailyTasks, function(value, key){
			playerDoc.dailyTasks[key] = []
		})

		playerDoc.countInfo.todayOnLineTime = 0
		playerDoc.countInfo.todayOnLineTimeRewards = []
		playerDoc.countInfo.todayFreeNormalGachaCount = 0
		if(_.isEqual(playerDoc.countInfo.day60, playerDoc.countInfo.day60RewardsCount)){
			if(playerDoc.countInfo.day60 == 60){
				playerDoc.countInfo.day60 = 1
				playerDoc.countInfo.day60RewardsCount = 0
			}else{
				playerDoc.countInfo.day60 += 1
			}
		}
		if(_.isEqual(playerDoc.countInfo.day14, playerDoc.countInfo.day14RewardsCount) && playerDoc.countInfo.day14 < 14){
			playerDoc.countInfo.day14 += 1
		}
	}
	var yestodayString = LogicUtils.getYesterdayDateString()
	if(!_.isEqual(previousLoginDateString, yestodayString) && !_.isEqual(previousLoginDateString, todayDateString)){
		playerDoc.countInfo.vipLoginDaysCount = 1
		expAdd = DataUtils.getPlayerVipExpByLoginDaysCount(1)
		DataUtils.addPlayerVipExp(playerDoc, {}, expAdd, eventFuncs, self.timeEventService)
	}else if(_.isEqual(previousLoginDateString, yestodayString)){
		playerDoc.countInfo.vipLoginDaysCount += 1
		expAdd = DataUtils.getPlayerVipExpByLoginDaysCount(playerDoc.countInfo.vipLoginDaysCount)
		DataUtils.addPlayerVipExp(playerDoc, {}, expAdd, eventFuncs, self.timeEventService)
	}else if(playerDoc.countInfo.loginCount == 0){
		expAdd = DataUtils.getPlayerVipExpByLoginDaysCount(1)
		DataUtils.addPlayerVipExp(playerDoc, {}, expAdd, eventFuncs, self.timeEventService)
	}
	playerDoc.countInfo.lastLoginTime = Date.now()
	playerDoc.countInfo.loginCount += 1
	DataUtils.refreshPlayerResources(playerDoc)
	DataUtils.refreshPlayerPower(playerDoc, {})
	DataUtils.refreshPlayerDragonsHp(playerDoc)

	if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
		pushFuncs.push([self.pushService, self.pushService.onPlayerLoginSuccessAsync, playerDoc])
		LogicUtils.excuteAll(updateFuncs).then(function(){
			return LogicUtils.excuteAll(eventFuncs)
		}).then(function(){
			return LogicUtils.excuteAll(pushFuncs)
		}).then(function(){
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
		if(_.isObject(allianceDoc.allianceFight) && !_.isEmpty(allianceDoc.allianceFight)){
			if(_.isEqual(allianceDoc.allianceFight.attackAllianceId, allianceDoc._id)){
				return self.allianceDao.findByIdAsync(allianceDoc.allianceFight.defenceAllianceId)
			}
			return self.allianceDao.findByIdAsync(allianceDoc.allianceFight.attackAllianceId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(_.isObject(allianceDoc.allianceFight) && !_.isEmpty(allianceDoc.allianceFight)){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			enemyAllianceDoc = doc
			allianceDoc.enemyAllianceDoc = LogicUtils.getAllianceViewData(enemyAllianceDoc)
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, enemyAllianceDoc._id])
		}
		memberDoc = LogicUtils.updateMyPropertyInAlliance(playerDoc, allianceDoc)
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		return Promise.resolve()
	}).then(function(){
		pushFuncs.push([self.pushService, self.pushService.onPlayerLoginSuccessAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, playerDoc, allianceDoc])
		var allianceData = {
			basicInfo:allianceDoc.basicInfo,
			__members:[{
				type:Consts.DataChangedType.Edit,
				data:memberDoc
			}]
		}
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(enemyAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(enemyAllianceDoc._id))
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
 * 玩家登出逻辑服务器
 * @param playerDoc
 * @param callback
 */
pro.playerLogout = function(playerDoc, callback){

}

/**
 * 升级大型建筑
 * @param playerId
 * @param location
 * @param finishNow
 * @param callback
 */
pro.upgradeBuilding = function(playerId, location, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(location) || location % 1 !== 0 || location < 1 || location > 22){
		callback(new Error("location 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var building = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		building = playerDoc.buildings["location_" + location]
		if(!_.isObject(building))return Promise.reject(new Error("建筑不存在"))
		if(LogicUtils.hasBuildingEvents(playerDoc, location))return Promise.reject(new Error("建筑正在升级"))
		if(building.level < 0)return Promise.reject(new Error("建筑还未建造"))
		if(building.level == 0 && !LogicUtils.isBuildingCanCreateAtLocation(playerDoc, location))return Promise.reject(new Error("建筑建造时,建筑坑位不合法"))
		if(building.level == 0 && DataUtils.getPlayerFreeBuildingsCount(playerDoc) <= 0)return Promise.reject(new Error("建造数量已达建造上限"))
		if(building.level > 0 && DataUtils.isBuildingReachMaxLevel(building.level))return Promise.reject(new Error("建筑已达到最高等级"))
		if(!DataUtils.isPlayerBuildingUpgradeLegal(playerDoc, location)) return Promise.reject(new Error("升级前置条件未满足"))
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return self.allianceDao.findByIdAsync(playerDoc.alliance.id).then(function(doc){
				if(!_.isObject(doc))return Promise.reject(new Error("联盟不存在"))
				allianceDoc = doc
				return Promise.resolve()
			})
		}
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerBuildingUpgradeRequired(playerDoc, building.type, building.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preBuildEvent = null
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
			if(!DataUtils.playerHasFreeBuildQueue(playerDoc)){
				preBuildEvent = LogicUtils.getSmallestBuildEvent(playerDoc)
				var timeRemain = (preBuildEvent.event.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}

		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

		if(finishNow){
			building.level = building.level + 1
			LogicUtils.updateBuildingsLevel(playerDoc)
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
			TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, building.type, building.level)
			pushFuncs.push([self.pushService, self.pushService.onBuildingLevelUpAsync, playerDoc, building.location])
			if(_.isObject(allianceDoc)){
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			}
		}else{
			if(_.isObject(preBuildEvent)){
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preBuildEvent.event.id])
				preBuildEvent.event.finishTime = Date.now()
				var params = self.playerTimeEventService.onPlayerEvent(playerDoc, allianceDoc, preBuildEvent.eventType, preBuildEvent.event.id)
				_.extend(playerData, params.playerData)
				pushFuncs = pushFuncs.concat(params.pushFuncs)
				if(!_.isEmpty(params.allianceData)){
					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, params.allianceData])
					LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, params.allianceData, pushFuncs, self.pushService)
				}else if(_.isObject(allianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
				}
			}else if(_.isObject(allianceDoc)){
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createBuildingEvent(playerDoc, building.location, finishTime)
			playerDoc.buildingEvents.push(event)
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "buildingEvents", event.id, finishTime])
		}
		LogicUtils.refreshBuildingEventsData(playerDoc, playerData)
		DataUtils.refreshPlayerResources(playerDoc)
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
 * 转换生产建筑类型
 * @param playerId
 * @param buildingLocation
 * @param newBuildingName
 * @param callback
 */
pro.switchBuilding = function(playerId, buildingLocation, newBuildingName, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.contains(_.values(Consts.ResourceBuildingMap), newBuildingName) || _.isEqual("townHall", newBuildingName)){
		callback(new Error("newBuildingName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc

		var building = playerDoc.buildings["location_" + buildingLocation]
		if(!_.isObject(building) || building.level < 1) return Promise.reject(new Error("建筑不存在或还未建造"))
		if(!_.contains(_.values(Consts.HouseBuildingMap), building.type)){
			return Promise.reject(new Error("只有生产建筑才能转换"))
		}
		var gemNeed = DataUtils.getPlayerIntInit("switchProductionBuilding")
		if(playerDoc.resources.gem < gemNeed) return Promise.reject(new Error("宝石不足"))
		var houseType = Consts.BuildingHouseMap[building.type]
		var maxHouseCount = DataUtils.getPlayerHouseMaxCountByType(playerDoc, houseType)
		var currentCount = DataUtils.getPlayerHouseCountByType(playerDoc, houseType)
		var buildingAddedHouseCount = DataUtils.getPlayerBuildingAddedHouseCount(playerDoc, buildingLocation)
		if(maxHouseCount - buildingAddedHouseCount < currentCount) return Promise.reject(new Error("小屋数量过多"))
		building.type = newBuildingName
		building.level -= 1
		if(!DataUtils.isPlayerBuildingUpgradeLegal(playerDoc, buildingLocation)) return Promise.reject(new Error("前置条件未满足"))
		building.level += 1
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		var playerData = {}
		playerData.buildings = {}
		playerData.buildings["location_" + buildingLocation] = playerDoc.buildings["location_" + buildingLocation]
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
	var allianceDoc = null
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	var building = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		building = playerDoc.buildings["location_" + buildingLocation]
		if(!_.isObject(building))return Promise.reject(new Error("主体建筑不存在"))
		if(building.level <= 0)return Promise.reject(new Error("主体建筑必须大于等于1级"))
		if(!DataUtils.isHouseTypeExist(houseType))return Promise.reject(new Error("小屋类型不存在"))
		if(DataUtils.getPlayerFreeHousesCount(playerDoc, houseType) <= 0)return Promise.reject(new Error("小屋数量超过限制"))
		if(!DataUtils.isBuildingHasHouse(buildingLocation))return Promise.reject(new Error("建筑周围不允许建造小屋"))
		if(!LogicUtils.isHouseCanCreateAtLocation(playerDoc, buildingLocation, houseType, houseLocation)){
			return Promise.reject(new Error("创建小屋时,小屋坑位不合法"))
		}
		if(!_.isEqual("dwelling", houseType)){
			var willUse = DataUtils.getHouseUsedCitizen(houseType, 1)
			if(DataUtils.getPlayerCitizen(playerDoc) - willUse < 0){
				return Promise.reject(new Error("建造小屋会造成可用城民小于0"))
			}
		}
		if(!DataUtils.isPlayerHouseUpgradeLegal(playerDoc, buildingLocation, houseType, houseLocation)) return Promise.reject(new Error("升级前置条件不满足"))
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return self.allianceDao.findByIdAsync(playerDoc.alliance.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("联盟不存在"))
				}
				allianceDoc = doc
				return Promise.resolve()
			})
		}
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerHouseUpgradeRequired(playerDoc, houseType, 1)
		var buyedResources = null
		var buyedMaterials = null
		var preBuildEvent = null
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
			if(!DataUtils.playerHasFreeBuildQueue(playerDoc)){
				preBuildEvent = LogicUtils.getSmallestBuildEvent(playerDoc)
				var timeRemain = (preBuildEvent.event.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}
		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)
		var house = {
			type:houseType,
			level:0,
			location:houseLocation
		}
		building.houses.push(house)
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

		if(finishNow){
			house.level += 1
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
			pushFuncs.push([self.pushService, self.pushService.onHouseLevelUpAsync, playerDoc, building.location, house.location])
			if(_.isObject(allianceDoc)){
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			}
		}else{
			if(_.isObject(preBuildEvent)){
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preBuildEvent.event.id])
				preBuildEvent.event.finishTime = Date.now()
				var params = self.playerTimeEventService.onPlayerEvent(playerDoc, allianceDoc, preBuildEvent.eventType, preBuildEvent.event.id)
				_.extend(playerData, params.playerData)
				pushFuncs = pushFuncs.concat(params.pushFuncs)
				if(!_.isEmpty(params.allianceData)){
					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, params.allianceData])
					LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, params.allianceData, pushFuncs, self.pushService)
				}else if(_.isObject(allianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
				}
			}else if(_.isObject(allianceDoc)){
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createHouseEvent(playerDoc, buildingLocation, houseLocation, finishTime)
			playerDoc.houseEvents.push(event)
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "houseEvents", event.id, finishTime])
		}
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
		}
		LogicUtils.refreshBuildingEventsData(playerDoc, playerData)
		DataUtils.refreshPlayerResources(playerDoc)
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
	var allianceDoc = null
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	var building = null
	var house = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		building = playerDoc.buildings["location_" + buildingLocation]
		if(!_.isObject(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		if(building.level <= 0){
			return Promise.reject(new Error("主体建筑必须大于等于1级"))
		}
		_.each(building.houses, function(value){
			if(value.location == houseLocation){
				house = value
			}
		})
		if(!_.isObject(house))return Promise.reject(new Error("小屋不存在"))
		if(LogicUtils.hasHouseEvents(playerDoc, building.location, house.location))return Promise.reject(new Error("小屋正在升级"))
		if(house.level + 1 > DataUtils.getPlayerBuildingLevelLimit(playerDoc))return Promise.reject(new Error("小屋升级时,小屋等级不合法"))
		if(DataUtils.isHouseReachMaxLevel(house.type, house.level))return Promise.reject(new Error("小屋已达到最高等级"))
		if(!DataUtils.isPlayerHouseUpgradeLegal(playerDoc, buildingLocation, house.type, houseLocation)) return Promise.reject(new Error("升级前置条件不满足"))
		if(!_.isEqual("dwelling", house.type)){
			var currentLevelUsed = DataUtils.getHouseUsedCitizen(house.type, house.level)
			var nextLevelUsed = DataUtils.getHouseUsedCitizen(house.type, house.level + 1)
			var willUse = nextLevelUsed - currentLevelUsed
			if(DataUtils.getPlayerCitizen(playerDoc) - willUse < 0){
				return Promise.reject(new Error("升级小屋会造成可用城民小于0"))
			}
		}
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return self.allianceDao.findByIdAsync(playerDoc.alliance.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("联盟不存在"))
				}
				allianceDoc = doc
				return Promise.resolve()
			})
		}
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerHouseUpgradeRequired(playerDoc, house.type, house.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preBuildEvent = null
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
			if(!DataUtils.playerHasFreeBuildQueue(playerDoc)){
				preBuildEvent = LogicUtils.getSmallestBuildEvent(playerDoc)
				var timeRemain = (preBuildEvent.event.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}
		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

		if(finishNow){
			house.level += 1
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
			TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, house.type, house.level)
			pushFuncs.push([self.pushService, self.pushService.onHouseLevelUpAsync, playerDoc, building.location, house.location])
			if(_.isObject(allianceDoc)){
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			}
		}else{
			if(_.isObject(preBuildEvent)){
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preBuildEvent.event.id])
				preBuildEvent.event.finishTime = Date.now()
				var params = self.playerTimeEventService.onPlayerEvent(playerDoc, allianceDoc, preBuildEvent.eventType, preBuildEvent.event.id)
				_.extend(playerData, params.playerData)
				pushFuncs = pushFuncs.concat(params.pushFuncs)
				if(!_.isEmpty(params.allianceData)){
					updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, params.allianceData])
					LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, params.allianceData, pushFuncs, self.pushService)
				}else if(_.isObject(allianceDoc)){
					updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
				}
			}else if(_.isObject(allianceDoc)){
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createHouseEvent(playerDoc, building.location, house.location, finishTime)
			playerDoc.houseEvents.push(event)
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "houseEvents", event.id, finishTime])
		}
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
		}
		LogicUtils.refreshBuildingEventsData(playerDoc, playerData)
		DataUtils.refreshPlayerResources(playerDoc)
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
 * 免费加速
 * @param playerId
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.freeSpeedUp = function(playerId, eventType, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.FreeSpeedUpAbleEventTypes, eventType)){
		callback(new Error("eventType 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var event = LogicUtils.getEventById(playerDoc[eventType], eventId)
		if(!_.isObject(event)){
			return Promise.reject(new Error("玩家事件不存在"))
		}
		if(event.finishTime - DataUtils.getPlayerFreeSpeedUpEffect(playerDoc) > Date.now()){
			return Promise.reject(new Error("还不能进行免费加速"))
		}
		eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, event.id])
		event.finishTime = Date.now()
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return self.allianceDao.findByIdAsync(playerDoc.alliance.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("联盟不存在"))
				}
				allianceDoc = doc
				return Promise.resolve()
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		var playerData = {}
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		var params = self.playerTimeEventService.onPlayerEvent(playerDoc, allianceDoc, eventType, eventId)
		pushFuncs = pushFuncs.concat(params.pushFuncs)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		_.extend(playerData, params.playerData)
		if(!_.isEmpty(params.allianceData)){
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, params.allianceData])
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, params.allianceData, pushFuncs, self.pushService)
		}else if(_.isObject(allianceDoc)){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		}
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
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var toolShop = playerDoc.buildings.location_15
		if(toolShop.level < 1){
			return Promise.reject(new Error("工具作坊还未建造"))
		}
		var event = null
		for(var i = 0; i < playerDoc.materialEvents.length; i++){
			event = playerDoc.materialEvents[i]
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
		var playerData = {}
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(makeRequired.buildTime)
			buyedResources = DataUtils.buyResources(makeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources(makeRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}
		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(makeRequired.resources, playerDoc.resources)
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		event = DataUtils.createMaterialEvent(toolShop, category, finishNow)
		playerDoc.materialEvents.push(event)
		if(finishNow){
			if(_.isEqual(category, Consts.MaterialType.BuildingMaterials)){
				TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.MakeBuildingMaterials)
			}
			pushFuncs.push([self.pushService, self.pushService.onMakeMaterialFinishedAsync, playerDoc, event])
		}else{
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "materialEvents", event.id, event.finishTime])
		}
		DataUtils.refreshPlayerResources(playerDoc)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData.materialEvents = playerDoc.materialEvents
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
		var event = LogicUtils.getMaterialEventByCategory(playerDoc, category)
		if(!_.isObject(event)){
			return Promise.reject(new Error("没有材料建造事件存在"))
		}
		if(event.finishTime > 0){
			return Promise.reject(new Error("同类型的材料正在制造"))
		}
		var playerData = {}
		LogicUtils.removeItemInArray(playerDoc.materialEvents, event)
		DataUtils.addPlayerMaterials(playerDoc, event)
		playerData.materialEvents = playerDoc.materialEvents
		playerData[event.category] = playerDoc[event.category]
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onGetMaterialSuccessAsync, playerDoc, event])

		return self.playerDao.updateAsync(playerDoc)
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
	if(!DataUtils.isNormalSoldier(soldierName)){
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
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var barracks = playerDoc.buildings.location_5
		if(barracks.level < 1){
			return Promise.reject(new Error("兵营还未建造"))
		}
		if(!finishNow && playerDoc.soldierEvents.length > 0){
			return Promise.reject(new Error("已有士兵正在被招募"))
		}
		if(count > DataUtils.getPlayerSoldierMaxRecruitCount(playerDoc, soldierName)){
			return Promise.reject(new Error("招募数量超过单次招募上限"))
		}

		var gemUsed = 0
		var recruitRequired = DataUtils.getPlayerRecruitNormalSoldierRequired(playerDoc, soldierName, count)
		var buyedResources = null
		var playerData = {}
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(recruitRequired.recruitTime)
			buyedResources = DataUtils.buyResources(recruitRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources(recruitRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}
		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(recruitRequired.resources, playerDoc.resources)
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		if(finishNow){
			playerDoc.soldiers[soldierName] += count
			playerData.soldiers = {}
			playerData.soldiers[soldierName] = playerDoc.soldiers[soldierName]
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.RecruitSoldiers)
			TaskUtils.finishSoldierCountTaskIfNeed(playerDoc, playerData, soldierName)
			pushFuncs.push([self.pushService, self.pushService.onRecruitSoldierSuccessAsync, playerDoc, soldierName, count])
		}else{
			var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
			var event = LogicUtils.createSoldierEvent(playerDoc, soldierName, count, finishTime)
			playerDoc.soldierEvents.push(event)
			playerData.soldierEvents = playerDoc.soldierEvents
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "soldierEvents", event.id, event.finishTime])
		}
		DataUtils.refreshPlayerResources(playerDoc)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
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
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var barracks = playerDoc.buildings.location_5
		if(barracks.level < 1){
			return Promise.reject(new Error("兵营还未建造"))
		}
		if(!finishNow && playerDoc.soldierEvents.length > 0){
			return Promise.reject(new Error("已有士兵正在被招募"))
		}
		if(count > DataUtils.getPlayerSoldierMaxRecruitCount(playerDoc, soldierName)){
			return Promise.reject(new Error("招募数量超过单次招募上限"))
		}

		var gemUsed = 0
		var recruitRequired = DataUtils.getPlayerRecruitSpecialSoldierRequired(playerDoc, soldierName, count)
		var buyedResources = null
		var playerData = {}
		DataUtils.refreshPlayerResources(playerDoc)
		if(!LogicUtils.isEnough(recruitRequired.materials, playerDoc.soldierMaterials)){
			return Promise.reject(new Error("材料不足"))
		}
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(recruitRequired.recruitTime)
			buyedResources = DataUtils.buyResources({citizen:recruitRequired.citizen}, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources({citizen:recruitRequired.citizen}, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}
		if(gemUsed > playerDoc.resources.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		LogicUtils.reduce(recruitRequired.materials, playerDoc.soldierMaterials)
		LogicUtils.reduce({citizen:recruitRequired.citizen}, playerDoc.resources)
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		if(finishNow){
			playerDoc.soldiers[soldierName] += count
			playerData.soldiers = {}
			playerData.soldiers[soldierName] = playerDoc.soldiers[soldierName]
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.RecruitSoldiers)
			TaskUtils.finishSoldierCountTaskIfNeed(playerDoc, playerData, soldierName)
			pushFuncs.push([self.pushService, self.pushService.onRecruitSoldierSuccessAsync, playerDoc, soldierName, count])
		}else{
			var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
			var event = LogicUtils.createSoldierEvent(playerDoc, soldierName, count, finishTime)
			playerDoc.soldierEvents.push(event)
			playerData.soldierEvents = playerDoc.soldierEvents
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "soldierEvents", event.id, event.finishTime])
		}
		DataUtils.refreshPlayerResources(playerDoc)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		playerData.basicInfo = playerDoc.basicInfo
		playerData.resources = playerDoc.resources
		playerData.soldierMaterials = playerDoc.soldierMaterials
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