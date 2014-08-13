/**
 * 和读取配置文件相关工具方法写在这里
 * Created by modun on 14-8-6.
 */

var _ = require("underscore")

var GameData = require("../datas/GameDatas")
var BuildingLevelUp = GameData.BuildingLevelUp
var BuildingFunction = GameData.BuildingFunction
var HouseLevelUp = GameData.HouseLevelUp
var HouseFunction = GameData.HouseFunction
var GemsPayment = GameData.GemsPayment
var Houses = GameData.Houses.houses
var Buildings = GameData.Buildings.buildings

var Utils = module.exports


/**
 * 根据所缺资源换算成宝石,并返回宝石和剩余的资源
 * @param resources
 * @returns {{gem: number, resources: {}}}
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
 * @returns {number}
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
 * @returns {number}
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
 * @returns {{resources: {wood: *, stone: *, iron: *, citizen: *}, materials: {blueprints: *, tools: *, tiles: *, pulley: *}, buildTime: *}}
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
 * 获取小屋升级时,需要的资源和道具
 * @param houseType
 * @param houseLevel
 * @returns {{resources: {wood: *, stone: *, iron: *, citizen: *}, materials: {blueprints: *, tools: *, tiles: *, pulley: *}, buildTime: *}}
 */
Utils.getHouseUpgradeRequired = function(houseType, houseLevel){
	var houseUsed = this.getPlayerHouseUsedCitizen(houseType, houseLevel - 1)
	var config = HouseLevelUp[houseType][houseLevel]
	var required = {
		resources:{
			wood:config.wood,
			stone:config.stone,
			iron:config.iron,
			citizen:config.citizen - houseUsed
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
 * @returns {boolean}
 */
Utils.isBuildingReachMaxLevel = function(buildingType, buildingLevel){
	var config = BuildingLevelUp[buildingType][buildingLevel + 1]
	return !_.isObject(config)
}

/**
 * 获取小屋尺寸
 * @param houseType
 * @returns {{width: *, height: *}}
 */
Utils.getHouseSize = function(houseType){
	var config = Houses[houseType]
	return {width:config.width, height:config.height}
}

/**
 * 检查小屋类型是否存在
 * @param houseType
 * @returns {*}
 */
Utils.isHouseTypeExist = function(houseType){
	return _.isObject(Houses[houseType])
}

/**
 * 检查大型建筑周围是否允许建造小建筑
 * @param buildingLocation
 * @returns {hasHouse|*}
 */
Utils.isBuildingHasHouse = function(buildingLocation){
	var config = Buildings[buildingLocation]
	return config.hasHouse
}

/**
 * 获取玩家资源数据
 * @param userDoc
 * @returns {{}}
 */
Utils.getPlayerResources = function(userDoc){
	var self = this
	var resources = {}
	_.each(userDoc.resources, function(value, key){
		if(_.isEqual("citizen", key)){
			resources[key] = self.getPlayerCitizen(userDoc)
		}else{
			resources[key] = self.getPlayerResource(userDoc, key)
		}
	})

	return resources
}

/**
 * 获取玩家基础资源数据
 * @param userDoc
 * @param resourceName
 * @returns {*}
 */
Utils.getPlayerResource = function(userDoc, resourceName){
	var resourceLimit = this.getResourceUpLimit(userDoc, resourceName)
	if(resourceLimit <= userDoc.resources[resourceName]){
		return userDoc.resources[resourceName]
	}

	var houseType = this.getHouseTypeByResourceName(resourceName)
	var houses = this.getPlayerHousesByType(userDoc, houseType)
	var totalPerHour = 0
	_.each(houses, function(house){
		var config = HouseFunction[house.type][house.level]
		totalPerHour += config.poduction
	})

	var totalPerSecond = totalPerHour / 60 / 60
	var totalSecond = (Date.now() - userDoc.basicInfo.resourceRefreshTime) / 1000
	var output = Math.floor(totalSecond * totalPerSecond)
	var totalResource = userDoc.resources[resourceName] + output
	if(totalResource > resourceLimit) totalResource = resourceLimit
	return totalResource
}

/**
 * 获取玩家城民数据
 * @param userDoc
 * @returns {*}
 */
Utils.getPlayerCitizen = function(userDoc){
	var citizenLimit = this.getCitizenUpLimit(userDoc)
	var usedCitizen = this.getPlayerUsedCitizen(userDoc)
	if(citizenLimit <= userDoc.resources["citizen"] + usedCitizen){
		return userDoc.resources["citizen"]
	}

	var houses = this.getPlayerHousesByType(userDoc, "dwelling")
	var totalPerHour = 0
	_.each(houses, function(house){
		var config = HouseFunction[house.type][house.level]
		totalPerHour += config.recoverycitizen
	})

	var totalPerSecond = totalPerHour / 60 / 60
	var totalSecond = (Date.now() - userDoc.basicInfo.resourceRefreshTime) / 1000
	var output = Math.floor(totalSecond * totalPerSecond)
	var totalCitizen = userDoc.resources["citizen"] + output
	if(totalCitizen - usedCitizen > resourceLimit) totalCitizen = citizenLimit - usedCitizen
	return totalCitizen
}

/**
 * 获取玩家资源上限信息
 * @param userDoc
 * @param resourceName
 * @returns {number}
 */
Utils.getResourceUpLimit = function(userDoc, resourceName){
	var buildings = this.getPlayerBuildingsByType(userDoc, "warehouse")
	var totalUpLimit = 0
	_.each(buildings, function(building){
		var config = BuildingFunction["warehouse"][building.level]
		totalUpLimit += config["max" + resourceName]
	})

	return totalUpLimit
}

/**
 * 获取玩家城民上限信息
 * @returns {number}
 */
Utils.getCitizenUpLimit = function(userDoc){
	var houses = this.getPlayerHousesByType(userDoc, "dwelling")
	var totalUpLimit = 0
	_.each(houses, function(house){
		var config = HouseFunction["dwelling"][house.level]
		totalUpLimit += config.population
	})

	return totalUpLimit
}

/**
 * 获取已经占用的城民
 * @param userDoc
 * @returns {number}
 */
Utils.getPlayerUsedCitizen = function(userDoc){
	var used = 0
	_.each(userDoc.buildings, function(building){
		_.each(building.houses, function(house){
			var config = HouseLevelUp[house.type][house.level]
			used += config.citizen
		})
	})

	return used
}

/**
 * 获取指定建筑占用的城民
 * @param house
 * @returns {number}
 */
Utils.getPlayerHouseUsedCitizen = function(houseType, houseLevel){
	return HouseLevelUp[houseType][houseLevel].citizen
}

/**
 * 根据建筑类型获取所有相关建筑
 * @param userDoc
 * @param houseType
 * @returns {Array}
 */
Utils.getPlayerBuildingsByType = function(userDoc, houseType){
	var buildings = []
	_.each(userDoc.buildings, function(building){
		if(_.isEqual(houseType, building.type)){
			buildings.push(building)
		}
	})

	return buildings
}

/**
 * 根据小屋类型获取所有相关小屋
 * @param userDoc
 * @param houseType
 * @returns {Array}
 */
Utils.getPlayerHousesByType = function(userDoc, houseType){
	var houses = []
	_.each(userDoc.buildings, function(building){
		_.each(building.houses, function(house){
			if(_.isEqual(houseType, house.type)){
				houses.push(house)
			}
		})
	})

	return houses
}

/**
 * 根据资源名称获取生产此资源的小屋类型
 * @param resourceName
 * @returns {*}
 */
Utils.getHouseTypeByResourceName = function(resourceName){
	var houseType = null
	_.each(Houses, function(house){
		if(_.isEqual(resourceName, house.output)){
			houseType = house.type
		}
	})

	return houseType
}

/**
 * 根据小屋类型获取产出资源名称
 * @param houseType
 * @returns {houses.dwelling.output|*|houses.woodcutter.output|houses.farmer.output|houses.quarrier.output|houses.miner.output}
 */
Utils.getResourceNameByHouseType = function(houseType){
	return Houses[houseType].output
}