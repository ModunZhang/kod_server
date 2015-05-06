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
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.logService = app.get("logService")
	this.dataService = app.get("dataService")
	this.chatServerId = app.get("chatServerId")
	this.logicServerId = app.get("logicServerId")
	this.rankServerId = app.get("rankServerId")
	this.GemUse = app.get("GemUse")
	this.Device = app.get("Device")
}
module.exports = PlayerApiService
var pro = PlayerApiService.prototype


var BindPlayerSession = function(session, deviceId, playerDoc, allianceDoc, callback){
	session.bind(playerDoc._id)
	session.set("deviceId", deviceId)
	session.set("logicServerId", this.logicServerId)
	session.set("chatServerId", this.chatServerId)
	session.set("rankServerId", this.rankServerId)
	session.set("name", playerDoc.basicInfo.name)
	session.set("icon", playerDoc.basicInfo.icon)
	session.set("allianceId", _.isObject(allianceDoc) ? allianceDoc._id : "")
	session.set("allianceTag", _.isObject(allianceDoc) ? allianceDoc.basicInfo.tag : "")
	session.set("vipExp", playerDoc.basicInfo.vipExp)
	session.on("closed", this.playerLogoutAsync.bind(this))
	session.pushAll(function(err){
		process.nextTick(function(){
			callback(err)
		})
	})
}

/**
 * 玩家登陆逻辑服务器
 * @param session
 * @param deviceId
 * @param callback
 */
pro.playerLogin = function(session, deviceId, callback){
	if(!_.isString(deviceId)){
		callback(new Error("deviceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceDoc = null
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	var vipExpAdd = null
	var bindPlayerSessionAsync = Promise.promisify(BindPlayerSession, this)
	this.Device.findByIdAsync(deviceId).then(function(doc){
		if(_.isObject(doc)){
			return self.dataService.findPlayerAsync(doc.playerId)
		}else{
			return Promise.reject(ErrorUtils.deviceNotExist(deviceId))
		}
	}).then(function(doc){
		playerDoc = doc
		if(!_.isEqual(playerDoc.serverId, self.app.get("cacheServerId"))) return Promise.reject(ErrorUtils.playerNotInCurrentServer(playerDoc._id, self.app.get("cacheServerId"), playerDoc.serverId))
		if(!_.isEmpty(playerDoc.logicServerId)) return Promise.reject(ErrorUtils.playerAlreadyLogin(playerDoc._id))

		var previousLoginDateString = LogicUtils.getDateString(playerDoc.countInfo.lastLoginTime)
		var todayDateString = LogicUtils.getTodayDateString()
		if(!_.isEqual(todayDateString, previousLoginDateString)){
			_.each(playerDoc.dailyTasks, function(value, key){
				playerDoc.dailyTasks[key] = []
			})
			_.each(playerDoc.allianceDonate, function(value, key){
				playerDoc.allianceDonate[key] = 1
			})

			playerDoc.countInfo.todayOnLineTime = 0
			playerDoc.countInfo.todayOnLineTimeRewards = []
			playerDoc.countInfo.todayFreeNormalGachaCount = 0
			playerDoc.countInfo.todayLoyaltyGet = 0
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
			vipExpAdd = DataUtils.getPlayerVipExpByLoginDaysCount(1)
			DataUtils.addPlayerVipExp(playerDoc, [], vipExpAdd, eventFuncs, self.timeEventService)
		}else if(_.isEqual(previousLoginDateString, yestodayString)){
			playerDoc.countInfo.vipLoginDaysCount += 1
			vipExpAdd = DataUtils.getPlayerVipExpByLoginDaysCount(playerDoc.countInfo.vipLoginDaysCount)
			DataUtils.addPlayerVipExp(playerDoc, [], vipExpAdd, eventFuncs, self.timeEventService)
		}else if(playerDoc.countInfo.loginCount == 0){
			vipExpAdd = DataUtils.getPlayerVipExpByLoginDaysCount(1)
			DataUtils.addPlayerVipExp(playerDoc, [], vipExpAdd, eventFuncs, self.timeEventService)
		}
		playerDoc.countInfo.lastLoginTime = Date.now()
		playerDoc.countInfo.loginCount += 1
		playerDoc.logicServerId = self.logicServerId

		return Promise.resolve()
	}).then(function(){
		if(_.isString(playerDoc.allianceId)){
			return self.dataService.findAllianceAsync(playerDoc.allianceId).then(function(doc){
				allianceDoc = doc
				if(_.isObject(allianceDoc.allianceFight)){
					var enemyAllianceId = LogicUtils.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
					return self.dataService.directFindAllianceAsync(enemyAllianceId).then(function(doc){
						enemyAllianceDoc = LogicUtils.getAllianceViewData(doc)
						return Promise.resolve()
					})
				}else{
					return Promise.resolve()
				}
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		if(_.isObject(allianceDoc)){
			LogicUtils.updatePlayerPropertyInAlliance(playerDoc, true, allianceDoc, allianceData)
			DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		}
		return Promise.resolve()
	}).then(function(){
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		if(_.isObject(allianceDoc)){
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
		}
		return Promise.resolve()
	}).then(function(){
		return bindPlayerSessionAsync(session, deviceId, playerDoc, allianceDoc)
	}).then(function(){
		return self.dataService.addPlayerToChannelsAsync(playerDoc)
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		self.logService.onEvent("logic.playerApiService.playerLogin", {playerId:session.uid, deviceId:deviceId, logicServerId:self.logicServerId})
		callback(null, [playerDoc, allianceDoc, enemyAllianceDoc])
	}).catch(function(e){
		self.logService.onEventError("logic.playerApiService.playerLogin", {playerId:session.uid, deviceId:deviceId, logicServerId:self.logicServerId}, e.stack)
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 玩家登出逻辑服务器
 * @param session
 * @param reason
 * @param callback
 */
pro.playerLogout = function(session, reason, callback){
	var self = this
	var playerId = session.uid
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.dataService.findPlayerAsync(playerId, true).then(function(doc){
		playerDoc = doc
		return self.dataService.removePlayerFromChannelsAsync(playerDoc)
	}).then(function(){
		playerDoc.logicServerId = null
		playerDoc.countInfo.todayOnLineTime += Date.now() - playerDoc.countInfo.lastLoginTime
		if(_.isString(playerDoc.allianceId))
			return self.dataService.findAllianceAsync(playerDoc.allianceId, true).then(function(doc){
				allianceDoc = doc
				LogicUtils.updatePlayerPropertyInAlliance(playerDoc, false, allianceDoc, allianceData)
				DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
				updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerId])
				return Promise.resolve()
			})
		else
			return Promise.resolve()
	}).then(function(){
		if(_.isEqual(playerDoc.serverId, self.app.get("cacheServerId"))){
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		}else{
			updateFuncs.push([self.dataService, self.dataService.timeoutPlayerAsync, playerDoc, playerDoc])
		}
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		self.app.set("membersCount", self.app.get("membersCount") - 1)
		self.logService.onEvent("logic.playerApiService.playerLeave", {playerId:session.uid, logicServerId:self.logicServerId, reason:reason})
		callback()
	}).catch(function(e){
		self.logService.onEventError("logic.playerApiService.playerLeave", {playerId:session.uid, logicServerId:self.logicServerId, reason:reason}, e.stack)
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updatePlayerAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			self.app.set("membersCount", self.app.get("membersCount") - 1)
			callback(e)
		})
	})
}

/**
 * 升级大型建筑
 * @param playerId
 * @param location
 * @param finishNow
 * @param callback
 */
pro.upgradeBuilding = function(playerId, location, finishNow, callback){
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
	var playerData = []
	var eventFuncs = []
	var updateFuncs = []
	var building = null
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		building = playerDoc.buildings["location_" + location]
		if(!_.isObject(building))return Promise.reject(ErrorUtils.buildingNotExist(playerId, location))
		if(LogicUtils.hasBuildingEvents(playerDoc, location))return Promise.reject(ErrorUtils.buildingUpgradingNow(playerId, location))
		if(building.level == 0 && !LogicUtils.isBuildingCanCreateAtLocation(playerDoc, location))return Promise.reject(ErrorUtils.buildingLocationNotLegal(playerId, location))
		if(building.level == 0 && DataUtils.getPlayerFreeBuildingsCount(playerDoc) <= 0)return Promise.reject(ErrorUtils.buildingCountReachUpLimit(playerId, location))
		if(building.level > 0 && DataUtils.isBuildingReachMaxLevel(building.level))return Promise.reject(ErrorUtils.buildingLevelReachUpLimit(playerId, location))
		if(!DataUtils.isPlayerBuildingUpgradeLegal(playerDoc, location)) return Promise.reject(ErrorUtils.buildingUpgradePreConditionNotMatch(playerId, location))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerBuildingUpgradeRequired(playerDoc, building.type, building.level + 1)
		var buyedResources = null
		var buyedMaterials = null
		var preBuildEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(playerDoc, upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, playerDoc.buildingMaterials)
		}else{
			buyedResources = DataUtils.buyResources(playerDoc, upgradeRequired.resources, playerDoc.resources)
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

		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"upgradeBuilding"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)
		playerData.push(["resources", playerDoc.resources])
		playerData.push(["buildingMaterials", playerDoc.buildingMaterials])

		if(finishNow){
			building.level = building.level + 1
			playerData.push(["buildings.location_" + building.location + ".level", building.level])
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerPowerTaskIfNeed(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
			TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, building.type, building.level)
		}else{
			if(_.isObject(preBuildEvent)){
				self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, preBuildEvent.type, preBuildEvent.event.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preBuildEvent.type, preBuildEvent.event.id])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createBuildingEvent(playerDoc, building.location, finishTime)
			playerDoc.buildingEvents.push(event)
			playerData.push(["buildingEvents." + playerDoc.buildingEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "buildingEvents", event.id, finishTime - Date.now()])
		}

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings["location_" + buildingLocation]
		if(!_.isObject(building) || building.level < 1) return Promise.reject(ErrorUtils.buildingNotExist(playerId, buildingLocation))
		if(!_.contains(_.values(Consts.HouseBuildingMap), building.type)) return Promise.reject(ErrorUtils.onlyProductionBuildingCanSwitch(playerId, buildingLocation))
		var gemUsed = DataUtils.getPlayerIntInit("switchProductionBuilding")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"switchBuilding"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		playerData.push(["resources.gem", playerDoc.resources.gem])

		var houseType = Consts.BuildingHouseMap[building.type]
		var maxHouseCount = DataUtils.getPlayerHouseMaxCountByType(playerDoc, houseType)
		var currentCount = DataUtils.getPlayerHouseCountByType(playerDoc, houseType)
		var buildingAddedHouseCount = DataUtils.getPlayerBuildingAddedHouseCount(playerDoc, buildingLocation)
		if(maxHouseCount - buildingAddedHouseCount < currentCount) return Promise.reject(ErrorUtils.houseTooMuchMore(playerId, buildingLocation))
		building.type = newBuildingName
		building.level -= 1
		if(!DataUtils.isPlayerBuildingUpgradeLegal(playerDoc, buildingLocation)) return Promise.reject(ErrorUtils.buildingUpgradePreConditionNotMatch(playerId, buildingLocation))
		building.level += 1
		playerData.push(["buildings.location_" + buildingLocation + ".type", newBuildingName])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 20){
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
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	var building = null
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		building = playerDoc.buildings["location_" + buildingLocation]
		if(building.level <= 0) return Promise.reject(ErrorUtils.hostBuildingLevelMustBiggerThanOne(playerId, buildingLocation, houseLocation))
		if(!DataUtils.isHouseTypeExist(houseType)) return Promise.reject(ErrorUtils.houseTypeNotExist(playerId, houseLocation, houseType))
		if(DataUtils.getPlayerFreeHousesCount(playerDoc, houseType) <= 0) return Promise.reject(ErrorUtils.houseCountTooMuchMore(playerId, buildingLocation, houseLocation, houseType))
		if(!DataUtils.isBuildingHasHouse(buildingLocation)) return Promise.reject(ErrorUtils.buildingNotAllowHouseCreate(playerId, buildingLocation, houseLocation, houseType))
		if(!LogicUtils.isHouseCanCreateAtLocation(playerDoc, buildingLocation, houseType, houseLocation)) return Promise.reject(ErrorUtils.houseLocationNotLegal(playerId, buildingLocation, houseLocation, houseType))
		if(!DataUtils.isPlayerHouseUpgradeLegal(playerDoc, buildingLocation, houseType, houseLocation)) return Promise.reject(ErrorUtils.houseUpgradePrefixNotMatch(playerId, buildingLocation, houseLocation, houseType))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerHouseUpgradeRequired(playerDoc, houseType, 1)
		var freeCitizenLimit = DataUtils.getPlayerFreeCitizenLimit(playerDoc)
		if(freeCitizenLimit < upgradeRequired.resources.citizen) return Promise.reject(ErrorUtils.noEnoughCitizenToCreateHouse(playerId, buildingLocation, houseLocation))
		var buyedResources = null
		var buyedMaterials = null
		var preBuildEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(playerDoc, upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, playerDoc.buildingMaterials)
		}else{
			buyedResources = DataUtils.buyResources(playerDoc, upgradeRequired.resources, playerDoc.resources)
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
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"createHouse"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)
		playerData.push(["buildingMaterials", playerDoc.buildingMaterials])
		var house = {
			type:houseType,
			level:0,
			location:houseLocation
		}

		if(finishNow){
			house.level += 1
			building.houses.push(house)
			DataUtils.refreshPlayerResources(playerDoc)
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerPowerTaskIfNeed(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
		}else{
			if(_.isObject(preBuildEvent)){
				self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, preBuildEvent.type, preBuildEvent.event.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preBuildEvent.type, preBuildEvent.event.id])
			}
			building.houses.push(house)
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createHouseEvent(playerDoc, buildingLocation, houseLocation, finishTime)
			playerDoc.houseEvents.push(event)
			playerData.push(["houseEvents." + playerDoc.houseEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "houseEvents", event.id, finishTime - Date.now()])
		}
		playerData.push(["buildings.location_" + building.location + ".houses." + building.houses.indexOf(house), house])

		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 20){
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
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	var building = null
	var house = null
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		building = playerDoc.buildings["location_" + buildingLocation]
		if(building.level <= 0) return Promise.reject(ErrorUtils.hostBuildingLevelMustBiggerThanOne(playerId, buildingLocation, houseLocation))
		_.each(building.houses, function(value){
			if(value.location == houseLocation){
				house = value
			}
		})
		if(!_.isObject(house))return Promise.reject(ErrorUtils.houseNotExist(playerId, buildingLocation, houseLocation))
		if(LogicUtils.hasHouseEvents(playerDoc, building.location, house.location))return Promise.reject(ErrorUtils.houseUpgradingNow(playerId, buildingLocation, houseLocation))
		if(DataUtils.isHouseReachMaxLevel(house.type, house.level))return Promise.reject(ErrorUtils.houseReachMaxLevel(playerId, buildingLocation, houseLocation))
		if(!DataUtils.isPlayerHouseUpgradeLegal(playerDoc, buildingLocation, house.type, houseLocation)) return Promise.reject(ErrorUtils.houseUpgradePrefixNotMatch(playerId, buildingLocation, houseLocation, house.type))
		return Promise.resolve()
	}).then(function(){
		var gemUsed = 0
		var upgradeRequired = DataUtils.getPlayerHouseUpgradeRequired(playerDoc, house.type, house.level + 1)
		var freeCitizenLimit = DataUtils.getPlayerFreeCitizenLimit(playerDoc)
		if(freeCitizenLimit < upgradeRequired.resources.citizen) return Promise.reject(ErrorUtils.noEnoughCitizenToCreateHouse(playerId, buildingLocation, houseLocation))
		var buyedResources = null
		var buyedMaterials = null
		var preBuildEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
			buyedResources = DataUtils.buyResources(playerDoc, upgradeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			buyedMaterials = DataUtils.buyMaterials(upgradeRequired.materials, {})
			gemUsed += buyedMaterials.gemUsed
			LogicUtils.increace(buyedMaterials.totalBuy, playerDoc.buildingMaterials)
		}else{
			buyedResources = DataUtils.buyResources(playerDoc, upgradeRequired.resources, playerDoc.resources)
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
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"upgradeHouse"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce(upgradeRequired.resources, playerDoc.resources)
		LogicUtils.reduce(upgradeRequired.materials, playerDoc.buildingMaterials)
		playerData.push(["buildingMaterials", playerDoc.buildingMaterials])
		if(finishNow){
			house.level += 1
			playerData.push(["buildings.location_" + building.location + ".houses." + building.houses.indexOf(house) + ".level", house.level])
			DataUtils.refreshPlayerResources(playerDoc)
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerPowerTaskIfNeed(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.UpgradeBuilding)
			TaskUtils.finishCityBuildTaskIfNeed(playerDoc, playerData, house.type, house.level)
		}else{
			if(_.isObject(preBuildEvent)){
				self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, preBuildEvent.type, preBuildEvent.event.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preBuildEvent.type, preBuildEvent.event.id])
			}
			var finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			var event = LogicUtils.createHouseEvent(playerDoc, building.location, house.location, finishTime)
			playerDoc.houseEvents.push(event)
			playerData.push(["houseEvents." + playerDoc.houseEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "houseEvents", event.id, finishTime - Date.now()])
		}
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			playerDoc.resources.citizen += next - previous
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	if(!_.contains(Consts.FreeSpeedUpAbleEventTypes, eventType)){
		callback(new Error("eventType 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var eventFuncs = []
	var updateFuncs = []
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var event = LogicUtils.getEventById(playerDoc[eventType], eventId)
		if(!_.isObject(event)) return Promise.reject(ErrorUtils.playerEventNotExist(playerId, eventType, eventId))
		if(event.finishTime - DataUtils.getPlayerFreeSpeedUpEffect(playerDoc) > Date.now()){
			return Promise.reject(ErrorUtils.canNotFreeSpeedupNow(playerId, eventType, eventId))
		}
		self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, eventType, eventId)
		eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, eventType, eventId])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 制造建筑,科技使用的材料
 * @param playerId
 * @param category
 * @param finishNow
 * @param callback
 */
pro.makeMaterial = function(playerId, category, finishNow, callback){
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
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings.location_16
		if(building.level < 1) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, building.location))
		var event = null
		for(var i = 0; i < playerDoc.materialEvents.length; i++){
			event = playerDoc.materialEvents[i]
			if(_.isEqual(event.category, category)){
				if(event.finishTime > 0) return Promise.reject(ErrorUtils.materialAsSameTypeIsMakeNow(playerId, category))
				else return Promise.reject(ErrorUtils.materialMakeFinishedButNotTakeAway(playerId, category))
			}else if(!finishNow && event.finishTime > 0) return Promise.reject(ErrorUtils.materialAsDifferentTypeIsMakeNow(playerId, category))
		}

		var gemUsed = 0
		var makeRequired = DataUtils.getMakeMaterialRequired(category, building.level)
		var buyedResources = null
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(makeRequired.buildTime)
			buyedResources = DataUtils.buyResources(playerDoc, makeRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources(playerDoc, makeRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"makeMaterial"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce(makeRequired.resources, playerDoc.resources)

		event = DataUtils.createMaterialEvent(building, category, finishNow)
		playerDoc.materialEvents.push(event)
		playerData.push(["materialEvents." + playerDoc.materialEvents.indexOf(event), event])
		if(finishNow){
			if(_.isEqual(category, Consts.MaterialType.BuildingMaterials)){
				TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.MakeBuildingMaterials)
			}
		}else{
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "materialEvents", event.id, event.finishTime - Date.now()])
		}
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 领取材料
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.getMaterials = function(playerId, eventId, callback){
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var event = _.find(playerDoc.materialEvents, function(event){
			return _.isEqual(event.id, eventId)
		})
		if(!_.isObject(event) || event.finishTime > 0) return Promise.reject(ErrorUtils.materialEventNotExistOrIsMakeing(playerId, eventId))
		playerData.push(["materialEvents." + playerDoc.materialEvents.indexOf(event), null])
		LogicUtils.removeItemInArray(playerDoc.materialEvents, event)
		DataUtils.addPlayerMaterials(playerDoc, event)
		playerData.push([event.category, playerDoc[event.category]])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings.location_5
		if(building.level < 1) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, building.location))
		if(DataUtils.isPlayerSoldierLocked(playerDoc, soldierName)) return Promise.reject(ErrorUtils.theSoldierIsLocked(playerId, soldierName))
		if(count > DataUtils.getPlayerSoldierMaxRecruitCount(playerDoc, soldierName)) return Promise.reject(ErrorUtils.recruitTooMuchOnce(playerId, soldierName, count))
		var gemUsed = 0
		var recruitRequired = DataUtils.getPlayerRecruitNormalSoldierRequired(playerDoc, soldierName, count)
		var buyedResources = null
		var preRecruitEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(recruitRequired.recruitTime)
			buyedResources = DataUtils.buyResources(playerDoc, recruitRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources(playerDoc, recruitRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			if(!DataUtils.playerHasFreeRecruitQueue(playerDoc)){
				preRecruitEvent = LogicUtils.getSmallestRecruitEvent(playerDoc)
				var timeRemain = (preRecruitEvent.event.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"recruitNormalSoldier"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce(recruitRequired.resources, playerDoc.resources)
		if(finishNow){
			playerDoc.soldiers[soldierName] += count
			playerData.push(["soldiers." + soldierName, playerDoc.soldiers[soldierName]])
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerPowerTaskIfNeed(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.RecruitSoldiers)
			TaskUtils.finishSoldierCountTaskIfNeed(playerDoc, playerData, soldierName)
		}else{
			if(_.isObject(preRecruitEvent)){
				self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, preRecruitEvent.type, preRecruitEvent.event.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preRecruitEvent.type, preRecruitEvent.event.id])
			}
			var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
			var event = LogicUtils.createSoldierEvent(playerDoc, soldierName, count, finishTime)
			playerDoc.soldierEvents.push(event)
			playerData.push(["soldierEvents." + playerDoc.soldierEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "soldierEvents", event.id, event.finishTime - Date.now()])
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	if(!DataUtils.canRecruitSpecialSoldier()){
		callback(new Error("特殊兵种招募未开放"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings.location_5
		if(building.level < 1) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, building.location))
		if(count > DataUtils.getPlayerSoldierMaxRecruitCount(playerDoc, soldierName)) return Promise.reject(ErrorUtils.recruitTooMuchOnce(playerId, soldierName, count))
		var gemUsed = 0
		var recruitRequired = DataUtils.getPlayerRecruitSpecialSoldierRequired(playerDoc, soldierName, count)
		var buyedResources = null
		var preRecruitEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		if(!LogicUtils.isEnough(recruitRequired.materials, playerDoc.soldierMaterials)) return Promise.reject(ErrorUtils.soldierRecruitMaterialsNotEnough(playerId, soldierName, count))
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(recruitRequired.recruitTime)
			buyedResources = DataUtils.buyResources(playerDoc, {citizen:recruitRequired.citizen}, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources(playerDoc, {citizen:recruitRequired.citizen}, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			if(!DataUtils.playerHasFreeRecruitQueue(playerDoc)){
				preRecruitEvent = LogicUtils.getSmallestRecruitEvent(playerDoc)
				var timeRemain = (preRecruitEvent.event.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"recruitSpecialSoldier"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce(recruitRequired.materials, playerDoc.soldierMaterials)
		LogicUtils.reduce({citizen:recruitRequired.citizen}, playerDoc.resources)
		playerData.push(["soldierMaterials", playerDoc.soldierMaterials])
		if(finishNow){
			playerDoc.soldiers[soldierName] += count
			playerData.push(["soldiers." + soldierName, playerDoc.soldiers[soldierName]])
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerPowerTaskIfNeed(playerDoc, playerData)
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.RecruitSoldiers)
			TaskUtils.finishSoldierCountTaskIfNeed(playerDoc, playerData, soldierName)
		}else{
			if(_.isObject(preRecruitEvent)){
				self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, preRecruitEvent.type, preRecruitEvent.event.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, preRecruitEvent.type, preRecruitEvent.event.id])
			}
			var finishTime = Date.now() + (recruitRequired.recruitTime * 1000)
			var event = LogicUtils.createSoldierEvent(playerDoc, soldierName, count, finishTime)
			playerDoc.soldierEvents.push(event)
			playerData.push(["soldierEvents." + playerDoc.soldierEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "soldierEvents", event.id, event.finishTime - Date.now()])
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}