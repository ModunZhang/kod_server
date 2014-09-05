"use strict"

/**
 * 和读取配置文件相关工具方法写在这里
 * Created by modun on 14-8-6.
 */

var _ = require("underscore")

var Consts = require("../consts/consts")
var CommonUtils = require("./utils")
var LogicUtils = require("./logicUtils")
var GameData = require("../datas/GameDatas")
var BuildingLevelUp = GameData.BuildingLevelUp
var BuildingFunction = GameData.BuildingFunction
var HouseLevelUp = GameData.HouseLevelUp
var HouseReturn = GameData.HouseReturn
var HouseFunction = GameData.HouseFunction
var GemsPayment = GameData.GemsPayment
var Houses = GameData.Houses.houses
var Buildings = GameData.Buildings.buildings
var HouseInit = GameData.PlayerInitData.houses[1]
var UnitConfig = GameData.UnitsConfig
var SoldierConfig = UnitConfig.normal
var SpecialSoldierConfig = UnitConfig.special
var DragonEquipmentConfig = GameData.SmithConfig.equipments

var Utils = module.exports

/**
 * 购买资源
 * @param need
 * @param has
 * @returns {{gemUsed: number, totalBuy: {}}}
 */
Utils.buyResources = function(need, has){
	var gemUsed = 0
	var totalBuy = {}
	_.each(need, function(value, key){
		var config = GemsPayment[key]
		var required = null
		if(_.isNumber(has[key])){
			required = has[key] - value
		}else{
			required = -value
		}
		required = -required
		if(required > 0){
			var currentBuy = 0
			while(required > 0){
				for(var i = config.length; i >= 1; i--){
					var item = config[i]
					console.log(item)
					console.log(item.min + "---------" + item.gem)
					if(!_.isObject(item)) continue
					if(item.min < required){
						gemUsed += item.gem
						required -= item.resource
						currentBuy += item.resource
						break
					}
				}
			}
			totalBuy[key] = currentBuy
		}
	})

	return {gemUsed:gemUsed, totalBuy:totalBuy}
}

/**
 * 购买材料
 * @param need
 * @param has
 */
Utils.buyMaterials = function(need, has){
	var gemUsed = 0
	var totalBuy = {}
	var config = GemsPayment.material[1]
	_.each(need, function(value, key){
		var required = null
		if(_.isNumber(has[key])){
			required = has[key] - value
		}else{
			required = -value
		}
		required = -required
		if(required > 0){
			gemUsed += config[key] * required
			totalBuy[key] = required
		}
	})
	return {gemUsed:gemUsed, totalBuy:totalBuy}
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
		for(var i = config.length; i >= 1; i--){
			var item = config[i]
			if(!_.isObject(item)) continue
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
 * 拆除小屋时,返还的资源
 * @param houseType
 * @param houseLevel
 * @returns {{wood: *, stone: *, iron: *, citizen: *}}
 */
Utils.getHouseDestroyReturned = function(houseType, houseLevel){
	var config = HouseReturn[houseType][houseLevel]
	var returned = {
		wood:config.wood,
		stone:config.stone,
		iron:config.iron,
		citizen:config.citizen
	}

	return returned
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
 * 获取建筑最高等级
 * @param buildingType
 * @returns {*}
 */
Utils.getBuildingMaxLevel = function(buildingType){
	var configs = BuildingLevelUp[buildingType]
	var config = configs[configs.length - 1]
	return config.level
}

/**
 * 建筑是否达到最高等级
 * @param houseType
 * @param houseLevel
 * @returns {boolean}
 */
Utils.isHouseReachMaxLevel = function(houseType, houseLevel){
	var config = HouseLevelUp[houseType][houseLevel + 1]
	return !_.isObject(config)
}

/**
 * 获取小屋最高等级
 * @param houseType
 * @returns {*}
 */
Utils.getHouseMaxLevel = function(houseType){
	var configs = HouseLevelUp[houseType]
	var config = configs[configs.length - 1]
	return config.level
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
 * @param playerDoc
 * @returns {{}}
 */
Utils.getPlayerResources = function(playerDoc){
	var self = this
	var resources = {}
	_.each(playerDoc.resources, function(value, key){
		if(_.isEqual("citizen", key)){
			resources[key] = self.getPlayerCitizen(playerDoc)
		}else if(_.isEqual("coin", key)){
			resources["coin"] = playerDoc.resources.coin
		}else if(_.isEqual("cart", key)){
			resources["coin"] = playerDoc.resources.cart
		}else if(_.isEqual("gem", key)){
			resources["gem"] = playerDoc.resources.gem
		}else{
			resources[key] = self.getPlayerResource(playerDoc, key)
		}
	})

	return resources
}

/**
 * 获取玩家基础资源数据
 * @param playerDoc
 * @param resourceName
 * @returns {*}
 */
Utils.getPlayerResource = function(playerDoc, resourceName){
	var resourceLimit = this.getPlayerResourceUpLimit(playerDoc, resourceName)
	if(resourceLimit <= playerDoc.resources[resourceName]){
		return playerDoc.resources[resourceName]
	}

	var houseType = this.getHouseTypeByResourceName(resourceName)
	var houses = this.getPlayerHousesByType(playerDoc, houseType)
	var totalPerHour = 0
	_.each(houses, function(house){
		var config = HouseFunction[house.type][house.level]
		totalPerHour += config.poduction
	})

	var totalPerSecond = totalPerHour / 60 / 60
	var totalSecond = (Date.now() - playerDoc.basicInfo.resourceRefreshTime) / 1000
	var output = Math.floor(totalSecond * totalPerSecond)
	var totalResource = playerDoc.resources[resourceName] + output
	if(totalResource > resourceLimit) totalResource = resourceLimit
	return totalResource
}

/**
 * 获取玩家可用城民数据
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerCitizen = function(playerDoc){
	var citizenLimit = this.getPlayerCitizenUpLimit(playerDoc)
	var usedCitizen = this.getPlayerUsedCitizen(playerDoc)
	if(citizenLimit <= playerDoc.resources["citizen"] + usedCitizen){
		return citizenLimit - usedCitizen
	}

	var houses = this.getPlayerHousesByType(playerDoc, "dwelling")
	var totalPerHour = 0
	_.each(houses, function(house){
		var config = HouseFunction[house.type][house.level]
		totalPerHour += config.recoveryCitizen
	})

	var totalPerSecond = totalPerHour / 60 / 60
	var totalSecond = (Date.now() - playerDoc.basicInfo.resourceRefreshTime) / 1000
	var output = Math.floor(totalSecond * totalPerSecond)
	var totalCitizen = playerDoc.resources["citizen"] + output
	if(totalCitizen - usedCitizen > citizenLimit) totalCitizen = citizenLimit - usedCitizen
	return totalCitizen
}

/**
 * 获取玩家资源上限信息
 * @param playerDoc
 * @param resourceName
 * @returns {number}
 */
Utils.getPlayerResourceUpLimit = function(playerDoc, resourceName){
	var buildings = this.getPlayerBuildingsByType(playerDoc, "warehouse")
	var totalUpLimit = 0
	_.each(buildings, function(building){
		var config = BuildingFunction["warehouse"][building.level]
		resourceName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
		resourceName = "max" + resourceName
		totalUpLimit += config[resourceName]

	})

	return totalUpLimit
}

/**
 * 获取玩家城民上限信息
 * @returns {number}
 */
Utils.getPlayerCitizenUpLimit = function(playerDoc){
	var houses = this.getPlayerHousesByType(playerDoc, "dwelling")
	var totalUpLimit = 0
	_.each(houses, function(house){
		var config = HouseFunction["dwelling"][house.level]
		totalUpLimit += config.population
	})
	return totalUpLimit
}

/**
 * 获取已经占用的城民
 * @param playerDoc
 * @returns {number}
 */
Utils.getPlayerUsedCitizen = function(playerDoc){
	var used = 0
	_.each(playerDoc.buildings, function(building){
		_.each(building.houses, function(house){
			var houseLevel = LogicUtils.hasHouseEvents(playerDoc, building.location, house.location) ? house.level + 1 : house.level
			var config = HouseLevelUp[house.type][houseLevel]
			used += config.citizen
		})
	})

	return used
}

/**
 * 获取指定建筑占用的城民
 * @param houseType
 * @param houseLevel
 * @returns {number}
 */
Utils.getPlayerHouseUsedCitizen = function(houseType, houseLevel){
	return HouseLevelUp[houseType][houseLevel].citizen
}

/**
 * 根据建筑类型获取所有相关建筑
 * @param playerDoc
 * @param buildingType
 * @returns {Array}
 */
Utils.getPlayerBuildingsByType = function(playerDoc, buildingType){
	var buildings = []
	_.each(playerDoc.buildings, function(building){
		if(_.isEqual(buildingType, building.type)){
			buildings.push(building)
		}
	})

	return buildings
}

/**
 * 根据小屋类型获取所有相关小屋
 * @param playerDoc
 * @param houseType
 * @returns {Array}
 */
Utils.getPlayerHousesByType = function(playerDoc, houseType){
	var houses = []
	_.each(playerDoc.buildings, function(building){
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

/**
 * 获取住宅城民上限
 * @param houseLevel
 * @returns {population|*}
 */
Utils.getDwellingPopulationByLevel = function(houseLevel){
	var config = HouseFunction["dwelling"][houseLevel]
	return config.population
}

/**
 * 获取建筑数量
 * @param playerDoc
 * @returns {number}
 */
Utils.getPlayerBuildingsCount = function(playerDoc){
	var count = 0
	_.each(playerDoc.buildings, function(building){
		if(building.level > 0 || (building.level == 0 && LogicUtils.hasBuildingEvents(playerDoc, building.location))){
			count += 1
		}
	})
	return count
}

/**
 * 获取可建建筑总数量
 * @param playerDoc
 * @returns {unlock|*}
 */
Utils.getPlayerMaxBuildingsCount = function(playerDoc){
	var building = playerDoc.buildings["location_1"]
	var config = BuildingFunction[building.type][building.level]
	return config.unlock
}

/**
 * 获取可造建筑数量
 * @param playerDoc
 * @returns {number}
 */
Utils.getPlayerFreeBuildingsCount = function(playerDoc){
	return this.getPlayerMaxBuildingsCount(playerDoc) - this.getPlayerBuildingsCount(playerDoc)
}

Utils.getMaterialUpLimit = function(playerDoc){
	var buildings = this.getPlayerBuildingsByType(playerDoc, "materialDepot")
	var totalUpLimit = 0
	_.each(buildings, function(building){
		var config = BuildingFunction["materialDepot"][building.level]
		totalUpLimit += config.maxmaterial
	})

	return totalUpLimit
}

/**
 * 将材料添加到材料仓库中,超过仓库上限后直接丢失
 * @param playerDoc
 * @param materials
 */
Utils.addPlayerMaterials = function(playerDoc, materials){
	var materialUpLimit = this.getMaterialUpLimit(playerDoc)
	_.each(materials, function(material){
		var currentMaterial = playerDoc.materials[material.type]
		if(currentMaterial < materialUpLimit){
			currentMaterial += material.count
			currentMaterial = currentMaterial > materialUpLimit ? materialUpLimit : currentMaterial
			playerDoc.materials[material.type] = currentMaterial
		}
	})
}

/**
 * 获取制造材料所需的资源
 * @param category
 * @param toolShopLevel
 * @returns {{}}
 */
Utils.getMakeMaterialRequired = function(category, toolShopLevel){
	var required = {}
	var config = BuildingFunction["toolShop"][toolShopLevel]
	if(_.isEqual(Consts.MaterialType.Building, category)){
		required.resources = {
			wood:config.productBmWood,
			stone:config.productBmStone,
			iron:config.productBmIron
		}
		required.buildTime = config.productBmtime
	}else if(_.isEqual(Consts.MaterialType.Technology, category)){
		required.resources = {
			wood:config.productAmWood,
			stone:config.productAmStone,
			iron:config.productAmIron
		}
		required.buildTime = config.productAmtime
	}
	return required
}

/**
 * 产生制作材料的事件
 * @param toolShop
 * @param category
 * @param finishNow
 */
Utils.generateMaterialEvent = function(toolShop, category, finishNow){
	var categoryConfig = {}
	categoryConfig[Consts.MaterialType.Building] = [
		"blueprints", "tools", "tiles", "pulley"
	]
	categoryConfig[Consts.MaterialType.Technology] = [
		"trainingFigure", "bowTarget", "saddle", "ironPart"
	]

	var config = BuildingFunction["toolShop"][toolShop.level]
	var poduction = config.poduction
	var materialTypeCount = config.poductionType
	var materialTypes = categoryConfig[category]
	materialTypes = CommonUtils.shuffle(materialTypes)
	var materialCountArray = []
	for(var i = 1; i <= poduction; i++){
		materialCountArray.push(i)
	}
	materialCountArray = CommonUtils.shuffle(materialCountArray)

	var materials = []
	var totalGenerated = 0
	for(i = 0; i < materialTypeCount; i++){
		var material = {
			type:materialTypes[i],
			count:materialCountArray[i]
		}
		materials.push(material)
		totalGenerated += materialCountArray[i]

		if(poduction <= totalGenerated){
			material.count -= totalGenerated - poduction
			break
		}

		if(i == materialTypeCount - 1 && poduction > totalGenerated){
			material.count += poduction - totalGenerated
		}
	}

	var buildTime = _.isEqual(Consts.MaterialType.Building, category) ? config.productBmtime : config.productAmtime
	var event = {
		category:category,
		materials:materials,
		finishTime:finishNow ? 0 : (Date.now() + (buildTime * 1000))
	}
	return event
}

/**
 * 获取玩家战斗力
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerPower = function(playerDoc){
	var buildingPower = this.getBuildingPower(playerDoc)
	var housePower = this.getHousePower(playerDoc)
	var soldierPower = this.getSoldierPower(playerDoc)

	return buildingPower + housePower + soldierPower
}

/**
 * 获取建筑战斗力
 * @param playerDoc
 * @returns {number}
 */
Utils.getBuildingPower = function(playerDoc){
	var totalPower = 0
	_.each(playerDoc.buildings, function(building){
		if(building.level > 0){
			var config = BuildingFunction[building.type][building.level]
			totalPower += config.power
		}
	})

	return totalPower
}

/**
 * 获取小屋战斗力
 * @param playerDoc
 * @returns {number}
 */
Utils.getHousePower = function(playerDoc){
	var totalPower = 0
	_.each(playerDoc.buildings, function(building){
		_.each(building.houses, function(house){
			var config = HouseFunction[house.type][house.level]
			totalPower += config.power
		})
	})

	return totalPower
}

/**
 * 获取士兵战斗力
 * @param playerDoc
 * @returns {number}
 */
Utils.getSoldierPower = function(playerDoc){
	var totalPower = 0
	var config = null
	_.each(playerDoc.soldiers, function(soldier){
		if(Utils.isSpecialSoldier(soldier.name)){
			config = SpecialSoldierConfig[soldier.name]
		}else{
			var fullName = soldier.name + "_" + Utils.getSoldierStar(soldier.name)
			config = SoldierConfig[fullName]
		}
		totalPower += config.power * soldier.count
	})

	return totalPower
}

/**
 * 获取玩家城堡等级
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerKeepLevel = function(playerDoc){
	return playerDoc.buildings["location_1"].level
}

/**
 * 获取玩家建筑等级限制
 * @param playerDoc
 * @returns {*}
 */
Utils.getBuildingLevelLimit = function(playerDoc){
	return this.getPlayerKeepLevel(playerDoc)
}

/**
 * 根据建筑类型获取建筑
 * @param playerDoc
 * @param buildingType
 * @returns {*}
 */
Utils.getPlayerBuildingByType = function(playerDoc, buildingType){
	var buildings = this.getPlayerBuildingsByType(playerDoc, buildingType)
	return buildings.length > 0 ? buildings[0] : null
}

/**
 * 获取指定小屋最大建造数量
 * @param playerDoc
 * @param houseType
 * @returns {*}
 */
Utils.getPlayerHouseMaxCountByType = function(playerDoc, houseType){
	var config = Houses[houseType]
	var limitBy = config.limitBy
	var totalCount = HouseInit[houseType]
	var building = this.getPlayerBuildingByType(playerDoc, limitBy)

	if(building.level > 0){
		var buildingFunction = BuildingFunction[limitBy][building.level]
		totalCount += buildingFunction[houseType]
	}
	return totalCount
}

/**
 * 获取指定小屋建造数量
 * @param playerDoc
 * @param houseType
 * @returns {number}
 */
Utils.getPlayerHouseCountByType = function(playerDoc, houseType){
	var count = 0
	_.each(playerDoc.buildings, function(building){
		_.each(building.houses, function(house){
			if(_.isEqual(houseType, house.type)){
				count += 1
			}
		})
	})

	return count
}

/**
 * 获取指定小屋可建造数量
 * @param playerDoc
 * @param houseType
 * @returns {number}
 */
Utils.getPlayerFreeHousesCount = function(playerDoc, houseType){
	var maxCount = this.getPlayerHouseMaxCountByType(playerDoc, houseType)
	var currentCount = this.getPlayerHouseCountByType(playerDoc, houseType)
	return maxCount - currentCount
}

/**
 * 是否有普通兵种
 * @param soldierName
 */
Utils.hasNormalSoldier = function(soldierName){
	var hasSoldier = false
	var fullSoldierName = soldierName + "_" + this.getSoldierStar(soldierName)
	_.each(SoldierConfig, function(value, key){
		if(_.isEqual(fullSoldierName, key)){
			hasSoldier = true
		}
	})

	return hasSoldier
}

/**
 * 是否有特殊兵种
 * @param soldierName
 * @returns {boolean}
 */
Utils.hasSpecialSoldier = function(soldierName){
	var hasSoldier = false
	_.each(SpecialSoldierConfig, function(value, key){
		if(_.isEqual(soldierName, key)){
			hasSoldier = true
		}
	})

	return hasSoldier
}

/**
 * 获取英雄星级
 * @param soldierName
 * @returns {number}
 */
Utils.getSoldierStar = function(soldierName){
	if(this.isSpecialSoldier(soldierName)) return 3
	return 1
}

/**
 * 是否特殊兵种
 * @param soldierName
 * @returns {boolean}
 */
Utils.isSpecialSoldier = function(soldierName){
	var isSpecial = false
	_.each(SpecialSoldierConfig, function(value, key){
		if(_.isEqual(soldierName, key)){
			isSpecial = true
		}
	})

	return isSpecial
}

/**
 * 获取招募普通兵种所需的资源
 * @param soldierName
 * @param count
 * @returns {{resources: {wood: number, stone: number, iron: number, food: number}, recruitTime: (*|Array)}}
 */
Utils.getRecruitNormalSoldierRequired = function(soldierName, count){
	var star = this.getSoldierStar(soldierName)
	var fullSoldierName = soldierName + "_" + star
	var config = SoldierConfig[fullSoldierName]
	var resources = {
		wood:config.wood * count,
		stone:config.stone * count,
		iron:config.iron * count,
		food:config.food * count
	}
	var totalNeed = {
		resources:resources,
		recruitTime:this.getRecruitSoldierTime(soldierName, count)
	}
	return totalNeed
}

/**
 * 获取招募特殊兵种所需的材料
 * @param soldierName
 * @param count
 * @returns {{materials: (*|Array), recruitTime: *}}
 */
Utils.getRecruitSpecialSoldierRequired = function(soldierName, count){
	var config = SpecialSoldierConfig[soldierName]
	var materialNames = config.specialMaterials.split(",")
	var materials = {}
	_.each(materialNames, function(value){
		materials[value] = count
	})
	var totalNeed = {
		materials:materials,
		recruitTime:this.getRecruitSoldierTime(soldierName, count)
	}
	return totalNeed
}

/**
 * 获取招募士兵时需要的时间
 * @param soldierName
 * @param count
 * @returns {number}
 */
Utils.getRecruitSoldierTime = function(soldierName, count){
	var config = null
	if(this.isSpecialSoldier(soldierName)){
		config = SpecialSoldierConfig[soldierName]
	}else{
		var star = this.getSoldierStar(soldierName)
		var fullSoldierName = soldierName + "_" + star
		config = SoldierConfig[fullSoldierName]
	}
	return config.recruitTime * count
}

/**
 * 获取士兵招募单次最大数量
 * @param playerDoc
 * @param soldierName
 * @returns {number}
 */
Utils.getSoldierMaxRecruitCount = function(playerDoc, soldierName){
	var building = playerDoc.buildings["location_8"]
	var config = BuildingFunction[building.type][building.level]
	var maxRecruit = config.maxRecruit
	var soldierConfig = null
	if(this.isSpecialSoldier(soldierName)){
		soldierConfig = SpecialSoldierConfig[soldierName]
	}else{
		var fullSoldierName = soldierName + "_" + this.getSoldierStar(soldierName)
		soldierConfig = SoldierConfig[fullSoldierName]
	}
	var maxCount = Math.floor(maxRecruit / soldierConfig.population)
	return maxCount
}

/**
 * 龙装备是否存在
 * @param equipmentName
 * @returns {boolean}
 */
Utils.isDragonEquipment = function(equipmentName){
	var has = false
	_.each(DragonEquipmentConfig, function(value, key){
		if(_.isEqual(equipmentName, key)){
			has = true
		}
	})
	return has
}

/**
 * 获取龙装备制造需求
 * @param playerDoc
 * @param equipmentName
 * @returns {{}}
 */
Utils.getMakeDragonEquipmentRequired = function(playerDoc, equipmentName){
	var required = {}
	var config = DragonEquipmentConfig[equipmentName]
	var materialNameArray = config.materials.split(",")
	var materials = {}
	_.each(materialNameArray, function(materialName){
		var nameAndCountArray = materialName.split(":")
		materials[nameAndCountArray[0]] = Number(nameAndCountArray[1])
	})
	required.materials = materials
	required.coin = config.coin
	required.buildTime = this.getMakeDragonEquipmentTime(playerDoc, equipmentName)
	return required
}

/**
 * 获取龙装备制造时间
 * @param playerDoc
 * @param equipmentName
 * @returns {*}
 */
Utils.getMakeDragonEquipmentTime = function(playerDoc, equipmentName){
	var building = playerDoc.buildings["location_9"]
	var smithConfig = BuildingFunction[building.type][building.level]
	var dragonEquipmentConfig = DragonEquipmentConfig[equipmentName]
	var makeTime = dragonEquipmentConfig.makeTime
	return LogicUtils.getEfficiency(makeTime, smithConfig.efficiency)
}