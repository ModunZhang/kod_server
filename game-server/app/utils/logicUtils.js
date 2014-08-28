"use strict"

/**
 * Created by modun on 14-8-6.
 */

var _ = require("underscore")

var Utils = module.exports


/**
 * 检查是否足够
 * @param need
 * @param has
 */
Utils.isEnough = function(need, has){
	for(var key in need){
		if (need.hasOwnProperty(key)){
			if(!_.isNumber(has[key]) || has[key] < need[key]) return false
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
			for(var k = fromToEnd.from; k < fromToEnd.to; k ++){
				buildings["location_" + k].level = 0
			}

			fromToEnd = this.getBuildingRoundFromAndEnd(round - 1)
			var totalActiveTowerCount = fromToEnd.to - fromToEnd.from + 2
			for(var l = totalActiveTowerCount - 2 + 1; l <= totalActiveTowerCount; l ++){
				var tower = towers["location_" + l]
				tower.level = 1
			}

			return
		}
	}
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
	for(var i = 0; i < playerDoc.buildingEvents.length; i ++){
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
	for(var i = 0; i < playerDoc.houseEvents.length; i ++){
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
	for(var i = 0; i < playerDoc.towerEvents.length; i ++){
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
 * @param location
 * @param finishTime
 * @returns {{location: *, finishTime: *}}
 */
Utils.createBuildingEvent = function(location, finishTime){
	var event = {
		location : location,
		finishTime : finishTime
	}
	return event
}

/**
 * 为玩家添加建筑建造事件
 * @param playerDoc
 * @param location
 * @param finishTime
 */
Utils.addBuildingEvent = function(playerDoc, location, finishTime){
	playerDoc.buildingEvents.push(this.createBuildingEvent(location, finishTime))
}

/**
 * 创建小屋建造事件
 * @param buildingLocation
 * @param houseLocation
 * @param finishTime
 * @returns {{buildingLocation: *, houseLocation: *, finishTime: *}}
 */
Utils.createHouseEvent = function(buildingLocation, houseLocation, finishTime){
	var event = {
		buildingLocation:buildingLocation,
		houseLocation:houseLocation,
		finishTime:finishTime
	}
	return event
}

/**
 * 为玩家添加小屋建造事件
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 * @param finishTime
 */
Utils.addHouseEvent = function(playerDoc, buildingLocation, houseLocation, finishTime){
	playerDoc.houseEvents.push(this.createHouseEvent(buildingLocation, houseLocation, finishTime))
}

/**
 * 创建防御塔建造事件
 * @param location
 * @param finishTime
 * @returns {{location: *, finishTime: *}}
 */
Utils.createTowerEvent = function(location, finishTime){
	var event = {
		location : location,
		finishTime : finishTime
	}
	return event
}

/**
 * 为玩家添加防御塔建造事件
 * @param playerDoc
 * @param location
 * @param finishTime
 */
Utils.addTowerEvent = function(playerDoc, location, finishTime){
	playerDoc.towerEvents.push(this.createTowerEvent(location, finishTime))
}

/**
 * 创建城墙事件
 * @param finishTime
 * @returns {{finishTime: *}}
 */
Utils.createWallEvent = function(finishTime){
	var event = {
		finishTime:finishTime
	}
	return event
}

/**
 * 为玩家添加城墙事件
 * @param playerDoc
 * @param finishTime
 */
Utils.addWallEvent = function(playerDoc, finishTime){
	playerDoc.wallEvents.push(this.createWallEvent(finishTime))
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
	for(var i = 0; i < building.houses.length; i ++){
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
	for(var i = 0; i < eventsTobeRemoved.length; i ++){
		for(var j = 0; j < allEvents.length; j ++){
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
	for(var i = 0; i < playerDoc.materialEvents.length; i ++){
		var event = playerDoc.materialEvents[i]
		if(_.isEqual(event.category, category)) return event
	}
	return null
}