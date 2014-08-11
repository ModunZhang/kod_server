/**
 * 和读取配置文件相关工具方法写在这里
 * Created by modun on 14-8-6.
 */

var _ = require("underscore")

var GameData = require("../datas/GameDatas")
var BuildingLevelUp = GameData.BuildingLevelUp
var GemsPayment = GameData.GemsPayment


var Utils = module.exports


/**
 * 根据所缺资源换算成宝石,并返回宝石和剩余的资源
 * @param resource
 */
Utils.getGemByResources = function(resources){
	var gem = 0
	var returned = {}
	_.each(resources, function(value, key){
		var config = GemsPayment[key]
		while(value > 0){
			for(var i = config.length; i = 1; i--){
				var item = config[i]
				if(item.min < value){
					gem += item.gem
					value -= item.resource
					break
				}
			}
		}
		returned[key] = value
	})

	return {gem:gem, resources:returned}
}

/**
 * 根据所缺道具换算成宝石,并返回宝石
 * @param equipments
 */
Utils.getGemByMaterials = function(equipments){
	var gem = 0
	var config = GemsPayment.material[1]
	_.each(equipments, function(value, key){
		gem += config[key] * value
	})
	return gem
}

/**
 * 根据所缺时间换算成宝石,并返回宝石数量
 * @param interval
 */
Utils.getGemByTimeInterval = function(interval){
	var gem = 0
	var config = GemsPayment.time
	while(interval > 0){
		for(var i = config.length; i = 1; i--){
			var item = config[i]
			if(!_.isObject(item))
			console.log(item)
			if(item.min < interval){
				gem += item.gem
				interval -= item.speedup
				break
			}
		}
	}

	return gem
}

/**
 * 获取建筑升级时,需要的资源和道具
 * @param buildingType
 * @param buildingLevel
 */
Utils.getBuildingUpgradeRequired = function(buildingType, buildingLevel){
	var config = BuildingLevelUp[buildingType][buildingLevel]
	var required = {
		resources:{
			wood:config.wood,
			stone:config.stone,
			iron:config.iron,
			citizen:config.citizen
		},
		materials:{
			blueprints:config.blueprints,
			tools:config.tools,
			tiles:config.tiles,
			pulley:config.pulley
		},
		buildTime:config.buildTime
	}

	return required
}

/**
 * 建筑是否达到最高等级
 * @param buildingType
 * @param buildingLevel
 */
Utils.isBuildingReachMaxLevel = function(buildingType, buildingLevel){
	var config = BuildingLevelUp[buildingType][buildingLevel + 1]
	if(_.isEqual(config)){
		return true
	}

	return false
}