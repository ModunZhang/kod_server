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
		if(need[key] > has[key]) return false
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
		has[key] -= value
	})
}

/**
 * 增加相应数量
 * @param willAdd
 * @param has
 */
Utils.increace = function(willAdd, has){
	_.each(willAdd, function(value, key){
		has[key] += value
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

Utils.getBuildingRoundMiddleLocation = function(currentRound){
	var fromAndTo = this.getBuildingRoundFromAndEnd(currentRound)
	var middle = fromAndTo.from + ((fromAndTo.to - fromAndTo.from) / 2)
	return middle
}