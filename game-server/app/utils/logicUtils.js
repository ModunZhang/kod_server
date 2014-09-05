"use strict"

/**
 * Created by modun on 14-8-6.
 */

var _ = require("underscore")
var DataUtils = require("./dataUtils")

var Utils = module.exports


Utils.getEfficiency = function(origin, efficiency){
	return Math.floor(origin / (1 + efficiency) * 1000000) / 1000000
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
					return
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

			return
		}
	}
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
 * 为玩家添加建筑建造事件
 * @param playerDoc
 * @param location
 * @param finishTime
 */
Utils.addBuildingEvent = function(playerDoc, location, finishTime){
	var event = {
		location:location,
		finishTime:finishTime
	}
	playerDoc.buildingEvents.push(event)
}

/**
 * 为玩家添加小屋建造事件
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 * @param finishTime
 */
Utils.addHouseEvent = function(playerDoc, buildingLocation, houseLocation, finishTime){
	var event = {
		buildingLocation:buildingLocation,
		houseLocation:houseLocation,
		finishTime:finishTime
	}
	playerDoc.houseEvents.push(event)
}

/**
 * 为玩家添加防御塔建造事件
 * @param playerDoc
 * @param location
 * @param finishTime
 */
Utils.addTowerEvent = function(playerDoc, location, finishTime){
	var event = {
		location:location,
		finishTime:finishTime
	}

	playerDoc.towerEvents.push(event)
}

/**
 * 为玩家添加城墙事件
 * @param playerDoc
 * @param finishTime
 */
Utils.addWallEvent = function(playerDoc, finishTime){
	var event = {
		finishTime:finishTime
	}
	playerDoc.wallEvents.push(event)
}

Utils.addSoldierEvent = function(playerDoc, soldierName, count, finishTime){
	var event = {
		name:soldierName,
		count:count,
		finishTime:finishTime
	}

	playerDoc.soldierEvents.push(event)
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
 * 移除所有事件数组中指定的事件数组
 * @param eventsTobeRemoved
 * @param allEvents
 */
Utils.removeEvents = function(eventsTobeRemoved, allEvents){
	for(var i = 0; i < eventsTobeRemoved.length; i++){
		for(var j = 0; j < allEvents.length; j++){
			if(_.isEqual(allEvents[j], eventsTobeRemoved[i])){
				allEvents.splice(j, 1)
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
 * 将士兵添加到玩家数据中
 * @param playerDoc
 * @param soldierInfo
 */
Utils.addSoldier = function(playerDoc, soldierInfo){
	var hasSoldier = false
	_.each(playerDoc.soldiers, function(value){
		if(_.isEqual(value.name, soldierInfo.name)){
			hasSoldier = true
			value.count += soldierInfo.count
		}
	})

	if(!hasSoldier){
		playerDoc.soldiers.push(soldierInfo)
	}
}