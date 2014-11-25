"use strict"

/**
 * Created by modun on 14-8-6.
 */

var ShortId = require("shortid")
var _ = require("underscore")
var sprintf = require("sprintf")
var Promise = require("bluebird")

var DataUtils = require("./dataUtils")
var MapUtils = require("./mapUtils")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var Utils = module.exports


/**
 * 获取Buff加成效果
 * @param origin
 * @param effect
 * @returns {number}
 */
Utils.getEfficiency = function(origin, effect){
	var res = 1 / (1 + effect)
	res = Math.floor(res * 1000000) / 1000000
	res = Math.floor(origin * res)
	return res
}

/**
 * 检查是否足够
 * @param need
 * @param has
 */
Utils.isEnough = function(need, has){
	for(var key in need){
		if(need.hasOwnProperty(key)){
			if(!_.isNumber(has[key]) || has[key] < need[key]) return false
		}else{
			return false
		}
	}
	return true
}

/**
 * 从Array中移除Item
 * @param array
 * @param item
 */
Utils.removeItemInArray = function(array, item){
	var index = array.indexOf(item)
	if(index >= 0){
		array.splice(index, 1)
	}
}

/**
 * 清空Array
 * @param array
 */
Utils.clearArray = function(array){
	while(array.length > 0){
		array.pop()
	}
}

/**
 * 清空Object
 * @param object
 */
Utils.clearObject = function(object){
	for(var property in object){
		if(object.hasOwnProperty(property)){
			delete object[property]
		}
	}
}

/**
 * 减少相应数值
 * @param need
 * @param has
 */
Utils.reduce = function(need, has){
	_.each(need, function(value, key){
		if(_.isNumber(has[key])){
			has[key] -= value
		}else{
			has[key] = -value
		}
	})
}

/**
 * 增加相应数量
 * @param willAdd
 * @param has
 */
Utils.increace = function(willAdd, has){
	_.each(willAdd, function(value, key){
		if(_.isNumber(has[key])){
			has[key] += value
		}else{
			has[key] = value
		}
	})
}

/**
 * 一次执行所有函数
 * @param functionObjects
 * @returns {*}
 */
Utils.excuteAll = function(functionObjects){
	var funcs = []
	_.each(functionObjects, function(functionObj){
		var caller = functionObj[0]
		var func = functionObj[1]
		funcs.push(func.apply(caller, Array.prototype.slice.call(functionObj, 2)))
	})
	return Promise.all(funcs)
}

/**
 * 检测是否有建筑和箭塔需要从-1级升级到0级
 * @param playerDoc
 */
Utils.updateBuildingsLevel = function(playerDoc){
	var buildings = playerDoc.buildings
	var towers = playerDoc.towers
	for(var i = 1; i <= _.size(buildings); i++){
		var building = buildings["location_" + i]
		if(building.level == -1){
			for(var j = i - 1; j >= 1; j--){
				var preBuilding = buildings["location_" + j]
				if(preBuilding.level <= 0){
					return false
				}
			}

			var round = this.getBuildingCurrentRound(i)
			var fromToEnd = this.getBuildingRoundFromAndEnd(round)
			for(var k = fromToEnd.from; k < fromToEnd.to; k++){
				buildings["location_" + k].level = 0
			}

			fromToEnd = this.getBuildingRoundFromAndEnd(round - 1)
			var totalActiveTowerCount = fromToEnd.to - fromToEnd.from + 2
			for(var l = totalActiveTowerCount - 2 + 1; l <= totalActiveTowerCount; l++){
				var tower = towers["location_" + l]
				tower.level = 1
			}
			return true
		}
	}
	return false
}

/**
 * 检查建筑创建时坑位是否合法
 * @param playerDoc
 * @param location
 * @returns {boolean}
 */
Utils.isBuildingCanCreateAtLocation = function(playerDoc, location){
	var previousLocation = this.getPreviousBuildingLocation(location)
	var nextLocation = this.getNextBuildingLocation(location)
	var frontLocation = this.getFrontBuildingLocation(location)
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

/**
 * 小屋是否能在指定位置创建
 * @param playerDoc
 * @param buildingLocation
 * @param houseType
 * @param houseLocation
 * @returns {boolean}
 */
Utils.isHouseCanCreateAtLocation = function(playerDoc, buildingLocation, houseType, houseLocation){
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

/**
 * 获取当前坐标的上一个坐标
 * @param currentLocation
 * @returns {*}
 */
Utils.getPreviousBuildingLocation = function(currentLocation){
	var round = this.getBuildingCurrentRound(currentLocation)
	var previousRound = this.getBuildingCurrentRound(currentLocation - 1)
	if(_.isEqual(round, previousRound)) return currentLocation - 1
	return null
}

/**
 * 获取当前坐标的下一个坐标
 * @param currentLocation
 * @returns {*}
 */
Utils.getNextBuildingLocation = function(currentLocation){
	var round = this.getBuildingCurrentRound(currentLocation)
	var previousRound = this.getBuildingCurrentRound(currentLocation + 1)
	if(_.isEqual(round, previousRound)) return currentLocation + 1
	return null
}

/**
 * 获取当前坐标的前一个坐标
 * @param currentLocation
 * @returns {*}
 */
Utils.getFrontBuildingLocation = function(currentLocation){
	var round = this.getBuildingCurrentRound(currentLocation)
	var middle = Math.floor(this.getBuildingRoundMiddleLocation(round))

	if(currentLocation == middle) return null
	if(currentLocation < middle){
		return currentLocation - ((round - 1) * 2) + 1
	}else if(currentLocation > middle){
		return currentLocation - ((round - 1) * 2) - 1
	}
	return null
}

/**
 *
 * @param currentLocation
 * @returns {*}
 */
Utils.getBuildingCurrentRound = function(currentLocation){
	var nextFrom = 1
	for(var i = 1; i <= 5; i++){
		var from = nextFrom
		var to = from + (i - 1) * 2 + 1
		nextFrom = to
		if(currentLocation >= from && currentLocation < to){
			return i
		}
	}

	return null
}

/**
 * 根据当前建筑坐标获取当前坐标所属圈数的起点坐标和结束坐标
 * @param currentRound
 * @returns {{from: *, to: *}}
 */
Utils.getBuildingRoundFromAndEnd = function(currentRound){
	var from = null
	var to = null
	var nextFrom = 1
	for(var i = 1; i <= currentRound; i++){
		from = nextFrom
		to = from + (i - 1) * 2 + 1
		nextFrom = to
	}

	return {from:from, to:to}
}

/**
 * 根据当前建筑坐标获取当前圈数的中间坐标
 * @param currentRound
 * @returns {*}
 */
Utils.getBuildingRoundMiddleLocation = function(currentRound){
	var fromAndTo = this.getBuildingRoundFromAndEnd(currentRound)
	var middle = fromAndTo.from + ((fromAndTo.to - fromAndTo.from) / 2)
	return middle
}

/**
 * 是否有指定坑位的建筑建造事件
 * @param playerDoc
 * @param buildingLocation
 * @returns {boolean}
 */
Utils.hasBuildingEvents = function(playerDoc, buildingLocation){
	for(var i = 0; i < playerDoc.buildingEvents.length; i++){
		var event = playerDoc.buildingEvents[i]
		if(_.isEqual(buildingLocation, event.location)) return true
	}
	return false
}

/**
 * 是否有指定坑位的小屋建造事件
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 * @returns {boolean}
 */
Utils.hasHouseEvents = function(playerDoc, buildingLocation, houseLocation){
	for(var i = 0; i < playerDoc.houseEvents.length; i++){
		var event = playerDoc.houseEvents[i]
		if(_.isEqual(event.buildingLocation, buildingLocation) && _.isEqual(event.houseLocation, houseLocation)) return true
	}
	return false
}

/**
 * 是否有指定坑位的防御塔建造事件
 * @param playerDoc
 * @param towerLocation
 * @returns {boolean}
 */
Utils.hasTowerEvents = function(playerDoc, towerLocation){
	for(var i = 0; i < playerDoc.towerEvents.length; i++){
		var event = playerDoc.towerEvents[i]
		if(_.isEqual(towerLocation, event.location)) return true
	}
	return false
}

/**
 * 是否有城墙建造事件
 * @param playerDoc
 * @returns {boolean}
 */
Utils.hasWallEvents = function(playerDoc){
	return playerDoc.wallEvents.length > 0
}

/**
 * 创建建筑建造事件
 * @param playerDoc
 * @param location
 * @param finishTime
 * @returns {{location: *, finishTime: *}}
 */
Utils.createBuildingEvent = function(playerDoc, location, finishTime){
	var event = {
		id:ShortId.generate(),
		location:location,
		finishTime:finishTime
	}
	return event
}

/**
 * 创建小屋建造事件
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 * @param finishTime
 * @returns {{buildingLocation: *, houseLocation: *, finishTime: *}}
 */
Utils.createHouseEvent = function(playerDoc, buildingLocation, houseLocation, finishTime){
	var event = {
		id:ShortId.generate(),
		buildingLocation:buildingLocation,
		houseLocation:houseLocation,
		finishTime:finishTime
	}
	return event
}

/**
 * 创建防御塔建造事件
 * @param playerDoc
 * @param location
 * @param finishTime
 * @returns {{location: *, finishTime: *}}
 */
Utils.createTowerEvent = function(playerDoc, location, finishTime){
	var event = {
		id:ShortId.generate(),
		location:location,
		finishTime:finishTime
	}
	return event
}

/**
 * 创建城墙事件
 * @param playerDoc
 * @param finishTime
 * @returns {{finishTime: *}}
 */
Utils.createWallEvent = function(playerDoc, finishTime){
	var event = {
		id:ShortId.generate(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建士兵招募事件
 * @param playerDoc
 * @param soldierName
 * @param count
 * @param finishTime
 * @returns {{name: *, count: *, finishTime: *}}
 */
Utils.createSoldierEvent = function(playerDoc, soldierName, count, finishTime){
	var event = {
		id:ShortId.generate(),
		name:soldierName,
		count:count,
		finishTime:finishTime
	}
	return event
}

/**
 * 创建龙装备制造事件
 * @param playerDoc
 * @param equipmentName
 * @param finishTime
 * @returns {{name: *, finishTime: *}}
 */
Utils.createDragonEquipmentEvent = function(playerDoc, equipmentName, finishTime){
	var event = {
		id:ShortId.generate(),
		name:equipmentName,
		finishTime:finishTime
	}
	return event
}

/**
 * 创建士兵治疗事件
 * @param playerDoc
 * @param soldiers
 * @param finishTime
 * @returns {{soldiers: *, finishTime: *}}
 */
Utils.createTreatSoldierEvent = function(playerDoc, soldiers, finishTime){
	var event = {
		id:ShortId.generate(),
		soldiers:soldiers,
		finishTime:finishTime
	}
	return event
}

/**
 * 创建收税事件
 * @param playerDoc
 * @param coin
 * @param finishTime
 * @returns {{coin: *, finishTime: *}}
 */
Utils.createCoinEvent = function(playerDoc, coin, finishTime){
	var event = {
		id:ShortId.generate(),
		coin:coin,
		finishTime:finishTime
	}
	return event
}

/**
 * 根据建筑建造事件查找建筑
 * @param playerDoc
 * @param buildingEvent
 * @returns {*}
 */
Utils.getBuildingByEvent = function(playerDoc, buildingEvent){
	return playerDoc.buildings["location_" + buildingEvent.location]
}

/**
 * 根据小屋建造事件查找小屋
 * @param playerDoc
 * @param houseEvent
 * @returns {*}
 */
Utils.getHouseByEvent = function(playerDoc, houseEvent){
	var building = playerDoc.buildings["location_" + houseEvent.buildingLocation]
	for(var i = 0; i < building.houses.length; i++){
		var house = building.houses[i]
		if(_.isEqual(house.location, houseEvent.houseLocation)){
			return house
		}
	}
	return null
}

/**
 * 根据防御塔建造事件查找防御塔
 * @param playerDoc
 * @param towerEvent
 * @returns {*}
 */
Utils.getTowerByEvent = function(playerDoc, towerEvent){
	return playerDoc.towers["location_" + towerEvent.location]
}

/**
 * 移除数组中指定的元素
 * @param array
 * @param items
 */
Utils.removeItemsInArray = function(array, items){
	for(var i = 0; i < items.length; i++){
		for(var j = 0; j < array.length; j++){
			if(_.isEqual(array[j], items[i])){
				array.splice(j, 1)
				break
			}
		}
	}
}

/**
 * 获取指定类型的建造事件
 * @param playerDoc
 * @param category
 * @returns {*}
 */
Utils.getMaterialEventByCategory = function(playerDoc, category){
	for(var i = 0; i < playerDoc.materialEvents.length; i++){
		var event = playerDoc.materialEvents[i]
		if(_.isEqual(event.category, category)) return event
	}
	return null
}

/**
 * 检查需要治疗的伤兵数据是否合法
 * @param playerDoc
 * @param soldiers
 * @returns {boolean}
 */
Utils.isTreatSoldierLegal = function(playerDoc, soldiers){
	if(soldiers.length == 0) return false
	for(var i = 0; i < soldiers.length; i++){
		var soldier = soldiers[i]
		var soldierName = soldier.name
		var count = soldier.count
		if(!_.isString(soldierName) || !_.isNumber(count)) return false
		count = Math.floor(count)
		if(count <= 0) return false
		if(!playerDoc.treatSoldiers[soldierName] || playerDoc.treatSoldiers[soldierName] < count) return false
	}
	return true
}

/**
 * 检查强化龙装备是否合法
 * @param playerDoc
 * @param equipments
 * @returns {boolean}
 */
Utils.isEnhanceDragonEquipmentLegal = function(playerDoc, equipments){
	if(equipments.length == 0) return false
	for(var i = 0; i < equipments.length; i++){
		var equipment = equipments[i]
		var equipmentName = equipment.name
		var count = equipment.count
		if(!_.isString(equipmentName) || !_.isNumber(count)) return false
		count = Math.floor(count)
		if(count <= 0) return false
		if(!playerDoc.dragonEquipments[equipmentName] || playerDoc.dragonEquipments[equipmentName] < count) return false
	}
	return true
}

/**
 * 更新玩家在联盟的属性
 * @param playerDoc
 * @param allianceDoc
 * @returns {*}
 */
Utils.updateMyPropertyInAlliance = function(playerDoc, allianceDoc){
	for(var i = 0; i < allianceDoc.members.length; i++){
		var member = allianceDoc.members[i]
		if(_.isEqual(member.id, playerDoc._id)){
			member.name = playerDoc.basicInfo.name
			member.icon = playerDoc.basicInfo.icon
			member.level = playerDoc.basicInfo.level
			member.power = playerDoc.basicInfo.power
			member.kill = playerDoc.basicInfo.kill
			member.loyalty = playerDoc.allianceInfo.loyalty
			member.lastLoginTime = playerDoc.countInfo.lastLoginTime
			member.allianceExp.woodExp = playerDoc.allianceInfo.woodExp
			member.allianceExp.stoneExp = playerDoc.allianceInfo.stoneExp
			member.allianceExp.ironExp = playerDoc.allianceInfo.ironExp
			member.allianceExp.foodExp = playerDoc.allianceInfo.foodExp
			member.allianceExp.coinExp = playerDoc.allianceInfo.coinExp
			return member
		}
	}
	return null
}

/**
 * 刷新联盟属性
 * @param allianceDoc
 */
Utils.refreshAllianceBasicInfo = function(allianceDoc){
	var totalPower = 0
	var totalKill = 0
	_.each(allianceDoc.members, function(member){
		totalPower += member.power
		totalKill += member.kill
	})
	allianceDoc.basicInfo.power = totalPower
	allianceDoc.basicInfo.kill = totalKill
}

/**
 * 刷新联盟感知力
 * @param allianceDoc
 */
Utils.refreshAlliancePerception = function(allianceDoc){
	allianceDoc.basicInfo.perception = DataUtils.getAlliancePerception(allianceDoc)
	allianceDoc.basicInfo.perceptionRefreshTime = Date.now()
}

/**
 * 联盟是否存在此玩家
 * @param allianceDoc
 * @param playerId
 * @returns {boolean}
 */
Utils.isAllianceHasMember = function(allianceDoc, playerId){
	for(var i = 0; i < allianceDoc.members.length; i++){
		var member = allianceDoc.members[i]
		if(_.isEqual(member.id, playerId)) return true
	}
	return false
}

/**
 * 根据玩家Id获取联盟成员数据
 * @param allianceDoc
 * @param memberId
 */
Utils.getAllianceMemberById = function(allianceDoc, memberId){
	for(var i = 0; i < allianceDoc.members.length; i++){
		var member = allianceDoc.members[i]
		if(_.isEqual(member.id, memberId)){
			return member
		}
	}
	return null
}

/**
 * 根据村落ID查找村落
 * @param allianceDoc
 * @param villageId
 * @returns {*}
 */
Utils.getAllianceVillageById = function(allianceDoc, villageId){
	for(var i = 0; i < allianceDoc.villages.length; i++){
		var village = allianceDoc.villages[i]
		if(_.isEqual(village.id, villageId)){
			return village
		}
	}
	return null
}

/**
 * 是否有对某联盟的有效申请存在
 * @param playerDoc
 * @param allianceId
 * @returns {boolean}
 */
Utils.hasPendingRequestEventToAlliance = function(playerDoc, allianceId){
	var has = false
	_.each(playerDoc.requestToAllianceEvents, function(event){
		if(_.isEqual(event.id, allianceId)){
			has = true
		}
	})
	return has
}

/**
 * 获取针对某个联盟的申请信息
 * @param playerDoc
 * @param allianceId
 * @returns {*}
 */
Utils.getRequestToAllianceEvent = function(playerDoc, allianceId){
	var theEvent = null
	_.each(playerDoc.requestToAllianceEvents, function(event){
		if(_.isEqual(event.id, allianceId)){
			theEvent = event
		}
	})
	return theEvent
}

/**
 * 获取联盟邀请事件
 * @param playerDoc
 * @param allianceId
 * @returns {*}
 */
Utils.getInviteToAllianceEvent = function(playerDoc, allianceId){
	var theEvent = null
	_.each(playerDoc.inviteToAllianceEvents, function(event){
		if(_.isEqual(event.id, allianceId)){
			theEvent = event
		}
	})
	return theEvent
}

/**
 * 获取联盟中某人的申请信息
 * @param allianceDoc
 * @param playerId
 * @returns {*}
 */
Utils.getPlayerRequestEventAtAlliance = function(allianceDoc, playerId){
	var theEvent = null
	_.each(allianceDoc.joinRequestEvents, function(event){
		if(_.isEqual(event.id, playerId)){
			theEvent = event
		}
	})
	return theEvent
}

/**
 * 添加联盟申请事件
 * @param allianceDoc
 * @param playerDoc
 * @param requestTime
 * @return {*}
 */
Utils.addAllianceRequestEvent = function(allianceDoc, playerDoc, requestTime){
	var event = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		icon:playerDoc.basicInfo.icon,
		level:playerDoc.basicInfo.level,
		power:playerDoc.basicInfo.power,
		requestTime:requestTime
	}
	allianceDoc.joinRequestEvents.push(event)
	return event
}

/**
 * 添加玩家对联盟的申请事件
 * @param playerDoc
 * @param allianceDoc
 * @param requestTime
 * @return {*}
 */
Utils.addPlayerJoinAllianceEvent = function(playerDoc, allianceDoc, requestTime){
	var event = {
		id:allianceDoc._id,
		name:allianceDoc.basicInfo.name,
		tag:allianceDoc.basicInfo.tag,
		flag:allianceDoc.basicInfo.flag,
		level:allianceDoc.basicInfo.level,
		members:allianceDoc.members.length,
		power:allianceDoc.basicInfo.power,
		language:allianceDoc.basicInfo.language,
		kill:allianceDoc.basicInfo.kill,
		status:Consts.AllianceJoinStatus.Pending,
		requestTime:requestTime
	}
	playerDoc.requestToAllianceEvents.push(event)
	return event
}

/**
 * 添加联盟对玩家的邀请事件
 * @param inviterId
 * @param playerDoc
 * @param allianceDoc
 * @param inviteTime
 * @return {*}
 */
Utils.addPlayerInviteAllianceEvent = function(inviterId, playerDoc, allianceDoc, inviteTime){
	var event = {
		id:allianceDoc._id,
		name:allianceDoc.basicInfo.name,
		tag:allianceDoc.basicInfo.tag,
		flag:allianceDoc.basicInfo.flag,
		terrain:allianceDoc.basicInfo.terrain,
		level:allianceDoc.basicInfo.level,
		members:allianceDoc.members.length,
		power:allianceDoc.basicInfo.power,
		language:allianceDoc.basicInfo.language,
		kill:allianceDoc.basicInfo.kill,
		inviterId:inviterId,
		inviteTime:inviteTime
	}
	playerDoc.inviteToAllianceEvents.push(event)
	return event
}

/**
 * 是否有对某联盟的邀请存在
 * @param playerDoc
 * @param allianceDoc
 * @returns {boolean}
 */
Utils.hasInviteEventToAlliance = function(playerDoc, allianceDoc){
	for(var i = 0; i < playerDoc.inviteToAllianceEvents.length; i++){
		var event = playerDoc.inviteToAllianceEvents[i]
		if(_.isEqual(event.id, allianceDoc._id)) return true
	}
	return false
}

/**
 * 获取已经使用的建筑建造队列
 * @param playerDoc
 * @returns {number}
 */
Utils.getUsedBuildQueue = function(playerDoc){
	var usedBuildQueue = 0
	usedBuildQueue += playerDoc.buildingEvents.length
	usedBuildQueue += playerDoc.houseEvents.length
	usedBuildQueue += playerDoc.towerEvents.length
	usedBuildQueue += playerDoc.wallEvents.length

	return usedBuildQueue
}

/**
 * 获取最先完成的建筑建造事件
 * @param playerDoc
 * @returns {*}
 */
Utils.getSmallestBuildEvent = function(playerDoc){
	var eventObj = null
	_.each(playerDoc.buildingEvents, function(theEvent){
		if(eventObj == null || eventObj.event.finishTime > theEvent){
			eventObj = {
				eventType:"buildingEvents",
				event:theEvent
			}
		}
	})
	_.each(playerDoc.houseEvents, function(theEvent){
		if(eventObj == null || eventObj.event.finishTime > theEvent){
			eventObj = {
				eventType:"houseEvents",
				event:theEvent
			}
		}
	})
	_.each(playerDoc.towerEvents, function(theEvent){
		if(eventObj == null || eventObj.event.finishTime > theEvent){
			eventObj = {
				eventType:"towerEvents",
				event:theEvent
			}
		}
	})
	_.each(playerDoc.wallEvents, function(theEvent){
		if(eventObj == null || eventObj.event.finishTime > theEvent){
			eventObj = {
				eventType:"wallEvents",
				event:theEvent
			}
		}
	})

	return eventObj
}

/**
 * 获取玩家建造事件
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @returns {*}
 */
Utils.getPlayerBuildEvent = function(playerDoc, eventType, eventId){
	if(_.isEqual(eventType, Consts.AllianceHelpEventType.Building)){
		return this.getEventById(playerDoc.buildingEvents, eventId)
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.House)){
		return this.getEventById(playerDoc.houseEvents, eventId)
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.Tower)){
		return this.getEventById(playerDoc.towerEvents, eventId)
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.Wall)){
		return this.getEventById(playerDoc.wallEvents, eventId)
	}
	return null
}

/**
 * 根据Id获取事件
 * @param events
 * @param id
 * @returns {*}
 */
Utils.getEventById = function(events, id){
	for(var i = 0; i < events.length; i++){
		var event = events[i]
		if(_.isEqual(event.id, id)){
			return event
		}
	}
	return null
}

/**
 * 根据协助加速类型和建造事件获取建筑
 * @param playerDoc
 * @param eventType
 * @param buildEvent
 * @returns {*}
 */
Utils.getBuildingByEventTypeAndBuildEvent = function(playerDoc, eventType, buildEvent){
	if(_.isEqual(eventType, Consts.AllianceHelpEventType.Building)){
		return playerDoc.buildings["location_" + buildEvent.location]
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.House)){
		var building = playerDoc.buildings["location_" + buildEvent.buildingLocation]
		for(var i = 0; i < building.houses.length; i++){
			var house = building.houses[i]
			if(_.isEqual(house.location, buildEvent.houseLocation)){
				return house
			}
		}
		return null
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.Tower)){
		return playerDoc.towers["location_" + buildEvent.location]
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.Wall)){
		return playerDoc.wall
	}
	return null
}

/**
 * 根据帮助时间类型获取玩家时间队列
 * @param playerDoc
 * @param eventType
 * @returns {*}
 */
Utils.getPlayerBuildEvents = function(playerDoc, eventType){
	if(_.isEqual(eventType, Consts.AllianceHelpEventType.Building)){
		return {buildingEvents:playerDoc.buildingEvents}
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.House)){
		return {houseEvents:playerDoc.houseEvents}
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.Tower)){
		return {towerEvents:towerEventsplayerDoc.towerEvents}
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.Wall)){
		return {wallEvents:playerDoc.wallEvents}
	}
	return null
}

/**
 * 为联盟添加帮助事件
 * @param allianceDoc
 * @param playerDoc
 * @param buildingLevel
 * @param helpEventType
 * @param buildingName
 * @param eventId
 * @returns {*}
 */
Utils.addAllianceHelpEvent = function(allianceDoc, playerDoc, buildingLevel, helpEventType, buildingName, eventId){
	var keep = playerDoc.buildings["location_1"]
	var event = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		vipExp:playerDoc.basicInfo.vipExp,
		helpEventType:helpEventType,
		buildingName:buildingName,
		buildingLevel:buildingLevel,
		eventId:eventId,
		maxHelpCount:keep.level,
		helpedMembers:[]
	}
	allianceDoc.helpEvents.push(event)
	return event
}

/**
 * 更新玩家资源数据
 * @param doc
 */
Utils.refreshPlayerResources = function(doc){
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
Utils.refreshPlayerPower = function(doc){
	var power = DataUtils.getPlayerPower(doc)
	doc.basicInfo.power = power
}

/**
 * 发送系统邮件
 * @param playerDoc
 * @param playerData
 * @param titleKey
 * @param titleArgs
 * @param contentKey
 * @param contentArgs
 * @returns {*}
 */
Utils.sendSystemMail = function(playerDoc, playerData, titleKey, titleArgs, contentKey, contentArgs){
	var language = playerDoc.basicInfo.language
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
		id:ShortId.generate(),
		title:title,
		fromId:"__system",
		fromName:"__system",
		fromAllianceTag:"",
		sendTime:Date.now(),
		content:content,
		isRead:false,
		isSaved:false
	}
	playerData.__mails = []
	if(playerDoc.mails.length >= Define.PlayerMailInboxMessageMaxSize){
		var willRemovedMail = this.getPlayerFirstUnSavedMail(playerDoc)
		this.removeItemInArray(playerDoc.mails, willRemovedMail)
		playerData.__mails.push({
			type:Consts.DataChangedType.Remove,
			data:willRemovedMail
		})
		if(!!willRemovedMail.isSaved){
			playerData.__savedMails = [{
				type:Consts.DataChangedType.Remove,
				data:willRemovedMail
			}]
		}
	}
	playerDoc.mails.push(mail)
	playerData.__mails.push({
		type:Consts.DataChangedType.Add,
		data:mail
	})

	return mail
}

/**
 * 根据事件类型和Index获取联盟帮助事件
 * @param allianceDoc
 * @param eventId
 * @returns {*}
 */
Utils.getAllianceHelpEvent = function(allianceDoc, eventId){
	for(var i = 0; i < allianceDoc.helpEvents.length; i++){
		var event = allianceDoc.helpEvents[i]
		if(_.isEqual(event.eventId, eventId)){
			return event
		}
	}
	return null
}

/**
 * 根据邮件Id获取邮件
 * @param playerDoc
 * @param mailId
 * @returns {*}
 */
Utils.getPlayerMailById = function(playerDoc, mailId){
	for(var i = 0; i < playerDoc.mails.length; i++){
		var mail = playerDoc.mails[i]
		if(_.isEqual(mail.id, mailId)) return mail
	}
	return null
}

/**
 * 获取第一份未保存的邮件
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerFirstUnSavedMail = function(playerDoc){
	for(var i = 0; i < playerDoc.mails.length; i++){
		var mail = playerDoc.mails[i]
		if(!mail.isSaved){
			return mail
		}
	}
	return playerDoc.mails[0]
}

/**
 * 获取升级建筑后,获取玩家被修改的数据
 * @param playerDoc
 * @param playerData
 */
Utils.refreshBuildingEventsData = function(playerDoc, playerData){
	playerData.resources = playerDoc.resources
	playerData.materials = playerDoc.materials
	playerData.basicInfo = playerDoc.basicInfo
	playerData.buildings = playerDoc.buildings
	playerData.towers = playerDoc.towers
	playerData.wall = playerDoc.wall
	playerData.buildingEvents = playerDoc.buildingEvents
	playerData.houseEvents = playerDoc.houseEvents
	playerData.towerEvents = playerDoc.towerEvents
	playerData.wallEvents = playerDoc.wallEvents
}

/**
 * 获取联盟盟主信息
 * @param allianceDoc
 * @returns {*}
 */
Utils.getAllianceArchon = function(allianceDoc){
	for(var i = 0; i < allianceDoc.members.length; i++){
		var member = allianceDoc.members[i]
		if(_.isEqual(member.title, Consts.AllianceTitle.Archon)){
			return member
		}
	}
	return null
}

/**
 * 添加联盟事件
 * @param allianceDoc
 * @param category
 * @param type
 * @param key
 * @param params
 * @returns {{category: *, type: *, key: *, time: number, params: *}}
 */
Utils.AddAllianceEvent = function(allianceDoc, category, type, key, params){
	var event = {
		category:category,
		type:type,
		key:key,
		time:Date.now(),
		params:params
	}

	if(allianceDoc.events.length >= Define.AllianceEventsMaxSize){
		allianceDoc.events.shift()
	}
	allianceDoc.events.push(event)
	return event
}

/**
 * 为联盟添加成员
 * @param allianceDoc
 * @param playerDoc
 * @param title
 * @param rect
 * @return {*}
 */
Utils.addAllianceMember = function(allianceDoc, playerDoc, title, rect){
	var member = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		icon:playerDoc.basicInfo.icon,
		level:playerDoc.basicInfo.level,
		keepLevel:playerDoc.buildings["location_1"].level,
		wallLevel:playerDoc.wall.level,
		wallHp:playerDoc.resources.wallHp,
		status:Consts.PlayerStatus.Normal,
		helpTroopsCount:0,
		power:playerDoc.basicInfo.power,
		kill:playerDoc.basicInfo.kill,
		loyalty:playerDoc.allianceInfo.loyalty,
		lastLoginTime:playerDoc.countInfo.lastLoginTime,
		title:title,
		donateStatus:{
			wood:1,
			stone:1,
			iron:1,
			food:1,
			coin:1,
			gem:1
		},
		allianceExp:{
			woodExp:playerDoc.allianceInfo.woodExp,
			stoneExp:playerDoc.allianceInfo.stoneExp,
			ironExp:playerDoc.allianceInfo.ironExp,
			foodExp:playerDoc.allianceInfo.foodExp,
			coinExp:playerDoc.allianceInfo.coinExp
		},
		location:{
			x:rect.x,
			y:rect.y
		}
	}
	allianceDoc.members.push(member)
	return member
}

/**
 * 获取联盟成员当前捐赠等级
 * @param memberDocInAlliance
 * @param donateType
 * @returns {*}
 */
Utils.getAllianceMemberDonateLevelByType = function(memberDocInAlliance, donateType){
	return memberDocInAlliance.donateStatus[donateType]
}

/**
 * 获取可用的地图坐标
 * @param mapObjects
 * @param width
 * @param height
 * @returns {{x: *, y: *, width: *, height: *}}
 */
Utils.getFreePointInAllianceMap = function(mapObjects, width, height){
	var map = MapUtils.buildMap(mapObjects)
	var rect = MapUtils.getRect(map, width, height)
	return rect
}

/**
 * 根据坐标获取联盟地图中的对象
 * @param allianceDoc
 * @param location
 * @returns {*}
 */
Utils.getAllianceMapObjectByLocation = function(allianceDoc, location){
	for(var i = 0; i < allianceDoc.mapObjects.length; i++){
		var mapObject = allianceDoc.mapObjects[i]
		if(_.isEqual(mapObject.location, location)) return mapObject
	}
	return null
}

/**
 * 根据Id获取联盟地图中的对象
 * @param allianceDoc
 * @param objectId
 * @returns {*}
 */
Utils.getAllianceMapObjectById = function(allianceDoc, objectId){
	for(var i = 0; i < allianceDoc.mapObjects.length; i++){
		var mapObject = allianceDoc.mapObjects[i]
		if(_.isEqual(mapObject.id, objectId)) return mapObject
	}
	return null
}

/**
 * 创建联盟建筑对象
 * @param buildingType
 * @param rect
 * @returns {{type: *, location: {x: (rect.x|*), y: (rect.y|*)}}}
 */
Utils.createAllianceMapObject = function(buildingType, rect){
	var object = {
		id:ShortId.generate(),
		type:buildingType,
		location:{
			x:rect.x,
			y:rect.y
		}
	}
	return object
}

/**
 * 联盟某个村落是否真正被采集
 * @param allianceDoc
 * @param villageId
 * @returns {boolean}
 */
Utils.isAllianceVillageBeingCollect = function(allianceDoc, villageId){
	for(var i = 0; i < allianceDoc.collectEvents.length; i++){
		var collectEvent = allianceDoc.collectEvents[i]
		if(_.isEqual(collectEvent.villageId, villageId)) return true
	}
	return false
}

/**
 * 联盟某个圣地事件是否已经激活
 * @param allianceDoc
 * @param stageName
 * @returns {boolean}
 */
Utils.isAllianceShrineStageActivated = function(allianceDoc, stageName){
	for(var i = 0; i < allianceDoc.shrineEvents.length; i++){
		var event = allianceDoc.shrineEvents[i]
		if(_.isEqual(event.stageName, stageName)) return true
	}
	return false
}

/**
 * 获取联盟指定类型的建筑的数量类型
 * @param allianceDoc
 * @param decorateType
 * @returns {number}
 */
Utils.getAllianceDecorateObjectCountByType = function(allianceDoc, decorateType){
	var count = 0
	_.each(allianceDoc.mapObjects, function(mapObject){
		if(_.isEqual(mapObject.type, decorateType)) count++
	})

	return count
}

/**
 * 行军派出的士兵数量是否合法
 * @param playerDoc
 * @param soldiers
 * @returns {boolean}
 */
Utils.isMarchSoldierLegal = function(playerDoc, soldiers){
	if(soldiers.length == 0) return false
	for(var i = 0; i < soldiers.length; i++){
		var soldier = soldiers[i]
		var soldierName = soldier.name
		var count = soldier.count
		if(!_.isString(soldierName) || !_.isNumber(count)) return false
		count = Math.floor(count)
		if(count <= 0) return false
		if(!playerDoc.soldiers[soldierName] || playerDoc.soldiers[soldierName] < count) return false
	}
	return true
}

/**
 * 创建联盟圣地行军事件
 * @param playerDoc
 * @param allianceDoc
 * @param shrineEventId
 * @param dragonType
 * @param soldiers
 * @returns {*}
 */
Utils.createAllianceShrineMarchEvent = function(playerDoc, allianceDoc, shrineEventId, dragonType, soldiers){
	var playerLocation = this.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var shrineLocation = allianceDoc.buildings["shrine"].location
	var marchTime = DataUtils.getPlayerMarchTime(playerDoc, playerLocation, shrineLocation)
	var event = {
		id:ShortId.generate(),
		shrineEventId:shrineEventId,
		playerData:{
			id:playerDoc._id,
			name:playerDoc.basicInfo.name,
			cityName:playerDoc.basicInfo.cityName,
			dragon:{
				type:dragonType
			},
			soldiers:soldiers
		},
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime
	}
	return event
}

/**
 * 创建联盟月门行军事件
 * @param playerDoc
 * @param allianceDoc
 * @param dragonType
 * @param soldiers
 * @returns {*}
 */
Utils.createAllianceMoonGateMarchEvent = function(playerDoc, allianceDoc, dragonType, soldiers){
	var playerLocation = this.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var moonGateLocation = allianceDoc.buildings["moonGate"].location
	var marchTime = DataUtils.getPlayerMarchTime(playerDoc, playerLocation, moonGateLocation)
	var event = {
		id:ShortId.generate(),
		playerData:{
			id:playerDoc._id,
			name:playerDoc.basicInfo.name,
			level:playerDoc.basicInfo.level,
			cityName:playerDoc.basicInfo.cityName,
			dragon:{
				type:dragonType
			},
			soldiers:soldiers
		},
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime
	}
	return event
}

/**
 * 创建联盟协防事件
 * @param playerDoc
 * @param allianceDoc
 * @param dragonType
 * @param soldiers
 * @param targetPlayerDoc
 * @returns {*}
 */
Utils.createAllianceHelpFightMarchEvent = function(playerDoc, allianceDoc, dragonType, soldiers, targetPlayerDoc){
	var playerLocation = this.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var targetPlayerLocation = this.getAllianceMemberById(allianceDoc, targetPlayerDoc._id).location
	var marchTime = DataUtils.getPlayerMarchTime(playerDoc, playerLocation, targetPlayerLocation)
	var event = {
		id:ShortId.generate(),
		playerData:{
			id:playerDoc._id,
			name:playerDoc.basicInfo.name,
			level:playerDoc.basicInfo.level,
			cityName:playerDoc.basicInfo.cityName,
			dragon:{
				type:dragonType
			},
			soldiers:soldiers
		},
		targetPlayerData:{
			id:targetPlayerDoc._id,
			name:targetPlayerDoc.basicInfo.name,
			cityName:targetPlayerDoc.basicInfo.cityName
		},
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime
	}
	return event
}

/**
 * 玩家从圣地回城事件
 * @param playerDoc
 * @param allianceDoc
 * @param dragonType
 * @param leftsoldiers
 * @param treatSoldiers
 * @param rewards
 * @param kill
 * @returns {*}
 */
Utils.createAllianceShrineMarchReturnEvent = function(playerDoc, allianceDoc, dragonType, leftsoldiers, treatSoldiers, rewards, kill){
	var shrineLocation = allianceDoc.buildings["shrine"].location
	var playerLocation = this.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var marchTime = DataUtils.getPlayerMarchTime(playerDoc, shrineLocation, playerLocation)
	var event = {
		id:ShortId.generate(),
		playerData:{
			id:playerDoc._id,
			cityName:playerDoc.basicInfo.cityName,
			dragon:{
				type:dragonType
			},
			leftSoldiers:leftsoldiers,
			treatSoldiers:treatSoldiers,
			rewards:rewards,
			kill:kill
		},
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime
	}
	return event
}

/**
 * 玩家从月门回城事件
 * @param playerDoc
 * @param allianceDoc
 * @param dragonType
 * @param leftsoldiers
 * @param treatSoldiers
 * @param rewards
 * @param kill
 * @returns {*}
 */
Utils.createAllianceMoonGateMarchReturnEvent = function(playerDoc, allianceDoc, dragonType, leftsoldiers, treatSoldiers, rewards, kill){
	var moonGateLocation = allianceDoc.buildings["moonGate"].location
	var playerLocation = this.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var marchTime = DataUtils.getPlayerMarchTime(playerDoc, moonGateLocation, playerLocation)
	var event = {
		id:ShortId.generate(),
		playerData:{
			id:playerDoc._id,
			cityName:playerDoc.basicInfo.cityName,
			dragon:{
				type:dragonType
			},
			leftSoldiers:leftsoldiers,
			treatSoldiers:treatSoldiers,
			rewards:rewards,
			kill:kill
		},
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime
	}
	return event
}

/**
 * 创建玩家协助防御回城事件
 * @param playerDoc
 * @param helpedPlayerDoc
 * @param allianceDoc
 * @param dragonType
 * @param leftsoldiers
 * @param treatSoldiers
 * @param rewards
 * @param kill
 * @returns {*}
 */
Utils.createAllianceHelpFightMarchReturnEvent = function(playerDoc, helpedPlayerDoc, allianceDoc, dragonType, leftsoldiers, treatSoldiers, rewards, kill){
	var helpedPlayerLocation = this.getAllianceMemberById(allianceDoc, helpedPlayerDoc._id).location
	var playerLocation = this.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var marchTime = DataUtils.getPlayerMarchTime(playerDoc, helpedPlayerLocation, playerLocation)
	var event = {
		id:ShortId.generate(),
		playerData:{
			id:playerDoc._id,
			cityName:playerDoc.basicInfo.cityName,
			dragon:{
				type:dragonType
			},
			leftSoldiers:leftsoldiers,
			treatSoldiers:treatSoldiers,
			rewards:rewards,
			kill:kill
		},
		fromPlayerData:{
			id:helpedPlayerDoc._id,
			name:helpedPlayerDoc.basicInfo.name,
			cityName:helpedPlayerDoc.basicInfo.cityName
		},
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime
	}
	return event
}

/**
 * 重置玩家部队战斗数据
 * @param soldiers
 * @param fightRoundData
 */
Utils.resetFightSoldiersByFightResult = function(soldiers, fightRoundData){
	_.each(fightRoundData, function(fightResult){
		for(var i = 0; i < soldiers.length; i++){
			var soldier = soldiers[i]
			if(_.isEqual(soldier.name, fightResult.soldierName)){
				soldier.totalCount -= fightResult.solderDamagedCount
				soldier.currentCount = soldier.totalCount
				soldier.morale = 100
			}
		}
	})
}

/**
 * 从联盟圣地时间中获取玩家龙的信息
 * @param playerId
 * @param event
 * @returns {*}
 */
Utils.getPlayerDragonDataFromAllianceShrineStageEvent = function(playerId, event){
	for(var i = 0; i < event.playerTroops.length; i++){
		var playerTroop = event.playerTroops[i]
		if(_.isEqual(playerTroop.id, playerId)) return playerTroop.dragon
	}
	return null
}

/**
 * 圣地指定关卡是否已经有玩家部队存在
 * @param allianceDoc
 * @param shrineEvent
 * @param playerId
 * @returns {boolean}
 */
Utils.isPlayerHasTroopMarchToAllianceShrineStage = function(allianceDoc, shrineEvent, playerId){
	for(var i = 0; i < allianceDoc.shrineMarchEvents.length; i++){
		var marchEvent = allianceDoc.shrineMarchEvents[i]
		if(_.isEqual(marchEvent.shrineEventId, shrineEvent.id) && _.isEqual(marchEvent.playerData.id, playerId)) return true
	}
	for(i = 0; i < shrineEvent.playerTroops.length; i++){
		var playerTroop = shrineEvent.playerTroops[i]
		if(_.isEqual(playerTroop.id, playerId)) return true
	}
	return false
}

/**
 * 月门是否已经有玩家的部队存在
 * @param allianceDoc
 * @param playerId
 * @returns {boolean}
 */
Utils.isPlayerHasTroopMarchToMoonGate = function(allianceDoc, playerId){
	for(var i = 0; i < allianceDoc.moonGateMarchEvents.length; i++){
		var marchEvent = allianceDoc.moonGateMarchEvents[i]
		if(_.isEqual(marchEvent.playerData.id, playerId)) return true
	}
	var playerTroop = null
	for(i = 0; i < allianceDoc.moonGateData.ourTroops.length; i++){
		playerTroop = allianceDoc.moonGateData.ourTroops[i]
		if(_.isEqual(playerTroop.id, playerId)) return true
	}
	if(_.isObject(allianceDoc.moonGateData.currentFightTroops.our)){
		playerTroop = allianceDoc.moonGateData.currentFightTroops.our
		if(_.isEqual(playerTroop.id, playerId)) return true
	}
	return false
}

/**
 * 查看玩家是否已经对联盟某玩家协防
 * @param allianceDoc
 * @param playerDoc
 * @param targetPlayerId
 * @returns {boolean}
 */
Utils.isPlayerHasTroopHelpedPlayer = function(allianceDoc, playerDoc, targetPlayerId){
	for(var i = 0; i < allianceDoc.helpDefenceMarchEvents.length; i++){
		var marchEvent = allianceDoc.helpDefenceMarchEvents[i]
		if(_.isEqual(marchEvent.playerData.id, playerDoc._id) && _.isEqual(marchEvent.targetPlayerData.id, targetPlayerId)) return true
	}
	var playerTroop = null
	for(i = 0; i < playerDoc.helpToTroops.length; i++){
		playerTroop = playerDoc.helpToTroops[i]
		if(_.isEqual(playerTroop.targetPlayerData.id, targetPlayerId)) return true
	}
	return false
}

/**
 * 协助某指定玩家的部队的数量
 * @param allianceDoc
 * @param playerDoc
 * @returns {number}
 */
Utils.getAlliancePlayerBeHelpedTroopsCount = function(allianceDoc, playerDoc){
	var count = 0
	for(var i = 0; i < allianceDoc.helpDefenceMarchEvents.length; i++){
		var marchEvent = allianceDoc.helpDefenceMarchEvents[i]
		if(_.isEqual(marchEvent.targetPlayerData.id, playerDoc._id)) count += 1
	}
	count += playerDoc.helpedByTroops.length
	return count
}

/**
 * 获取玩家在我方月门的部队
 * @param allianceDoc
 * @param playerId
 * @returns {*}
 */
Utils.getPlayerTroopInOurMoonGate = function(allianceDoc, playerId){
	if(_.isObject(allianceDoc.moonGateData.ourTroops)){
		for(var i = 0; i < allianceDoc.moonGateData.ourTroops.length; i++){
			var playerTroop = allianceDoc.moonGateData.ourTroops[i]
			if(_.isEqual(playerTroop.id, playerId)) return playerTroop
		}
	}
	return null
}

/**
 * 玩家是否有协防部队驻扎在某玩家城市中
 * @param playerDoc
 * @param targetPlayerId
 * @returns {boolean}
 */
Utils.isPlayerHasHelpedTroopInAllianceMember = function(playerDoc, targetPlayerId){
	for(var i = 0; i < playerDoc.helpToTroops.length; i++){
		var troop = playerDoc.helpToTroops[i]
		if(_.isEqual(troop.targetPlayerData.id, targetPlayerId)) return true
	}
	return false
}

/**
 * 获取玩家在地方月门的部队
 * @param allianceDoc
 * @param playerId
 * @returns {*}
 */
Utils.getPlayerTroopInEnemyMoonGate = function(allianceDoc, playerId){
	for(var i = 0; i < allianceDoc.moonGateData.enemyTroops.length; i++){
		var playerTroop = allianceDoc.moonGateData.enemyTroops[i]
		if(_.isEqual(playerTroop.id, playerId)) return playerTroop
	}
	return null
}

/**
 * 获取联盟某关卡的历史星级数据
 * @param allianceDoc
 * @param stageName
 * @returns {*}
 */
Utils.getAllianceShrineStageData = function(allianceDoc, stageName){
	for(var i = 0; i < allianceDoc.shrineDatas.length; i++){
		var stageData = allianceDoc.shrineDatas[i]
		if(_.isEqual(stageData.stageName, stageName)){
			return stageData
		}
	}
	return null
}

/**
 * 获取所有部队平均战斗力
 * @param playerTroops
 * @returns {number}
 */
Utils.getPlayerTroopsAvgPower = function(playerTroops){
	var totalPower = 0
	_.each(playerTroops, function(playerTroop){
		_.each(playerTroop.soldiers, function(soldier){
			totalPower += soldier.power * soldier.totalCount
		})
	})
	var avgPower = playerTroops.length > 0 ? Math.floor(totalPower / playerTroops.length) : 0
	return avgPower
}

/**
 * 修复联盟圣地战战报中的未参战的玩家的数据
 * @param playerTroops
 * @param playerDatas
 * @return {*}
 */
Utils.fixAllianceShrineStagePlayerData = function(playerTroops, playerDatas){
	var playerIds = {}
	_.each(playerTroops, function(playerTroop){
		playerIds[playerTroop.id] = playerTroop.name
	})
	_.each(playerDatas, function(playerData){
		delete playerIds[playerData.id]
	})
	_.each(playerIds, function(playerName, playerId){
		var playerData = {
			id:playerId,
			name:playerName,
			kill:0,
			rewards:[]
		}
		playerDatas.push(playerData)
	})
	return playerDatas
}

/**
 * 联盟战匹配成功后,创建初始数据结构
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param prepareTime
 */
Utils.prepareForAllianceFight = function(attackAllianceDoc, defenceAllianceDoc, prepareTime){
	var now = Date.now()
	attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Prepare
	attackAllianceDoc.basicInfo.statusStartTime = now
	attackAllianceDoc.basicInfo.statusFinishTime = prepareTime
	attackAllianceDoc.moonGateData = {}
	attackAllianceDoc.moonGateData.activeBy = attackAllianceDoc._id
	attackAllianceDoc.moonGateData.moonGateOwner = Consts.None
	attackAllianceDoc.moonGateData.enemyAlliance = {
		id:defenceAllianceDoc._id,
		name:defenceAllianceDoc.basicInfo.name,
		tag:defenceAllianceDoc.basicInfo.tag,
		power:defenceAllianceDoc.basicInfo.power,
		flag:defenceAllianceDoc.basicInfo.flag,
		terrain:defenceAllianceDoc.basicInfo.terrain
	}
	attackAllianceDoc.moonGateData.ourTroops = []
	attackAllianceDoc.moonGateData.enemyTroops = []
	attackAllianceDoc.moonGateData.currentFightTroops = {}
	attackAllianceDoc.moonGateData.fightReports = []
	attackAllianceDoc.moonGateData.countData = {
		our:{
			kill:0,
			moonGateOwnCount:0,
			routCount:0,
			challengeCount:0,
			attackSuccessCount:0,
			attackFailCount:0,
			defenceSuccessCount:0,
			defenceFailCount:0,
			playerKills:[]
		},
		enemy:{
			kill:0,
			moonGateOwnCount:0,
			routCount:0,
			challengeCount:0,
			attackSuccessCount:0,
			attackFailCount:0,
			defenceSuccessCount:0,
			defenceFailCount:0,
			playerKills:[]
		}
	}

	defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Prepare
	defenceAllianceDoc.basicInfo.statusStartTime = now
	defenceAllianceDoc.basicInfo.statusFinishTime = prepareTime
	defenceAllianceDoc.moonGateData = {}
	defenceAllianceDoc.moonGateData.activeBy = attackAllianceDoc._id
	defenceAllianceDoc.moonGateData.moonGateOwner = Consts.None
	defenceAllianceDoc.moonGateData.enemyAlliance = {
		id:attackAllianceDoc._id,
		name:attackAllianceDoc.basicInfo.name,
		tag:attackAllianceDoc.basicInfo.tag,
		power:attackAllianceDoc.basicInfo.power,
		flag:attackAllianceDoc.basicInfo.flag,
		terrain:attackAllianceDoc.basicInfo.terrain
	}
	defenceAllianceDoc.moonGateData.ourTroops = []
	defenceAllianceDoc.moonGateData.enemyTroops = []
	defenceAllianceDoc.moonGateData.currentFightTroops = {}
	defenceAllianceDoc.moonGateData.fightReports = []
	defenceAllianceDoc.moonGateData.countData = {
		our:{
			kill:0,
			moonGateOwnCount:0,
			routCount:0,
			challengeCount:0,
			attackSuccessCount:0,
			attackFailCount:0,
			defenceSuccessCount:0,
			defenceFailCount:0,
			playerKills:[]
		},
		enemy:{
			kill:0,
			moonGateOwnCount:0,
			routCount:0,
			challengeCount:0,
			attackSuccessCount:0,
			attackFailCount:0,
			defenceSuccessCount:0,
			defenceFailCount:0,
			playerKills:[]
		}
	}
}

/**
 * 刷新联盟战斗数据统计信息
 * @param attackCountData
 * @param defenceCountData
 */
Utils.refreshAllianceMoonGateDataCountData = function(attackCountData, defenceCountData){
	var attackTotalKill = 0
	var defenceTotalKill = 0
	_.each(attackCountData.our.playerKills, function(playerKill){
		attackTotalKill += playerKill.kill
	})
	_.each(attackCountData.enemy.playerKills, function(playerKill){
		defenceTotalKill += playerKill.kill
	})

	attackCountData.our.kill = Math.round(attackTotalKill * (1 + ((attackCountData.our.moonGateOwnCount * 30 / 60) * 0.1) + (attackCountData.our.routCount * 0.1)))
	attackCountData.enemy.kill = Math.round(defenceTotalKill * (1 + ((attackCountData.enemy.moonGateOwnCount * 30 / 60) * 0.1) + (attackCountData.enemy.routCount * 0.1)))
	defenceCountData.our = attackCountData.enemy
	defenceCountData.enemy = attackCountData.our
}