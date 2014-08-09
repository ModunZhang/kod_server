/**
 * Created by modun on 14-8-6.
 */

_ = require("underscore")

var Utils = module.exports


/**
 * 检查是否足够
 * @param need
 * @param has
 */
Utils.isEnough = function(need, has){
	_.each(need, function(value, key){
		if(value > has[key]) return false
	})

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
 * 检测是否有建筑需要从-1级升级到0级
 * @param buildings
 */
Utils.updateBuildingsLevel = function(buildings){
	for(var i = 1; i <= buildings.length; i++){
		var building = buildings["location_" + i]
		if(building.level = -1){
			for(var j = i; j >= 1; j--){
				var preBuilding = buildings["location_" + j]
				if(preBuilding.level <= 0){
					return
				}
			}
			var pre = 0
			for(var k = 1; k <= i; k++){
				var current = pre + (2 * (k - 1)) - 1
				if(current == i){
					var end = current + (2 * (k - 1))
					for(var l = current; l <= end; l++){
						var currentBuilding = buildings["location_" + l]
						currentBuilding.level = 0
					}
					return
				}
				pre = current
			}
			return
		}
		return
	}
}