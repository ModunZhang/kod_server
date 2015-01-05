"use strict"

/**
 * 和读取配置文件相关工具方法写在这里
 * Created by modun on 14-8-6.
 */

var _ = require("underscore")
var ShortId = require("shortid")

var Consts = require("../consts/consts")
var CommonUtils = require("./utils")
var LogicUtils = require("./logicUtils")
var GameDatas = require("../datas/GameDatas")
var BuildingLevelUp = GameDatas.BuildingLevelUp
var BuildingFunction = GameDatas.BuildingFunction
var HouseLevelUp = GameDatas.HouseLevelUp
var HouseReturn = GameDatas.HouseReturn
var HouseFunction = GameDatas.HouseFunction
var GemsPayment = GameDatas.GemsPayment
var Houses = GameDatas.Houses.houses
var Buildings = GameDatas.Buildings.buildings
var PlayerInitData = GameDatas.PlayerInitData
var HouseInit = PlayerInitData.houses[1]
var UnitConfig = GameDatas.UnitsConfig
var DragonEquipmentConfig = GameDatas.SmithConfig.equipments
var DragonEyrie = GameDatas.DragonEyrie
var AllianceInit = GameDatas.AllianceInitData
var AllianceRight = AllianceInit.right
var AllianceBuildingConfig = GameDatas.AllianceBuilding
var AllianceVillageConfig = GameDatas.AllianceVillage
var AllianceShrineConfig = GameDatas.AllianceShrine.shrineStage
var Vip = GameDatas.Vip


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
	var houseUsed = this.getHouseUsedCitizen(houseType, houseLevel - 1)
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
		if(_.contains(Consts.BasicResource, key)){
			resources[key] = self.getPlayerResource(playerDoc, key)
		}else if(_.isEqual("citizen", key)){
			resources[key] = self.getPlayerCitizen(playerDoc)
		}else if(_.isEqual("energy", key)){
			resources[key] = self.getPlayerEnergy(playerDoc)
		}else if(_.isEqual("wallHp", key)){
			resources[key] = self.getPlayerWallHp(playerDoc)
		}else{
			resources[key] = playerDoc.resources[key]
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
		totalUpLimit += config.citizen
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
Utils.getHouseUsedCitizen = function(houseType, houseLevel){
	return HouseLevelUp[houseType][houseLevel].citizen
}

/**
 * 获取玩家能量值
 * @param playerDoc
 * @returns {energyMax|*}
 */
Utils.getPlayerEnergy = function(playerDoc){
	var building = playerDoc.buildings["location_4"]
	if(building.level < 1) return playerDoc.resources["energy"]

	var config = BuildingFunction.dragonEyrie[building.level]
	var energyLimit = config.energyMax
	if(energyLimit <= playerDoc.resources["energy"]){
		return energyLimit
	}

	var totalPerSecond = 1 / config.perEnergyTime
	var totalSecond = (Date.now() - playerDoc.basicInfo.resourceRefreshTime) / 1000
	var output = Math.floor(totalSecond * totalPerSecond)
	var totalEnergy = playerDoc.resources["energy"] + output
	return totalEnergy > energyLimit ? energyLimit : totalEnergy
}

/**
 * 获取玩家城墙血量
 * @param playerDoc
 */
Utils.getPlayerWallHp = function(playerDoc){
	var building = playerDoc.wall
	if(building.level < 1) return playerDoc.resources["wallHp"]

	var config = BuildingFunction.wall[building.level]
	var hpLimit = config.wallHp
	if(hpLimit <= playerDoc.resources["wallHp"]){
		return hpLimit
	}

	var totalPerSecond = config.wallRecovery / 60 / 60
	var totalSecond = (Date.now() - playerDoc.basicInfo.resourceRefreshTime) / 1000
	var output = Math.floor(totalSecond * totalPerSecond)
	var totalHp = playerDoc.resources["wallHp"] + output
	return totalHp > hpLimit ? hpLimit : totalHp
}

/**
 * 获取玩家能量值上限
 * @param playerDoc
 * @returns {energyMax|*}
 */
Utils.getPlayerEnergyUpLimit = function(playerDoc){
	var building = playerDoc.buildings["location_4"]
	var config = BuildingFunction.dragonEyrie[building.level]
	var energyLimit = config.energyMax
	return energyLimit
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
 * @returns {citizen|*}
 */
Utils.getDwellingPopulationByLevel = function(houseLevel){
	var config = HouseFunction["dwelling"][houseLevel]
	return config.citizen
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

/**
 * 获取材料仓库单个材料上限
 * @param playerDoc
 * @returns {number}
 */
Utils.getMaterialUpLimit = function(playerDoc){
	var buildings = this.getPlayerBuildingsByType(playerDoc, "materialDepot")
	var totalUpLimit = 0
	_.each(buildings, function(building){
		var config = BuildingFunction["materialDepot"][building.level]
		totalUpLimit += config.maxMaterial
	})

	return totalUpLimit
}

/**
 * 将材料添加到材料仓库中,超过仓库上限后直接丢弃
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
Utils.createMaterialEvent = function(toolShop, category, finishNow){
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
		id:ShortId.generate(),
		category:category,
		materials:materials,
		startTime:Date.now(),
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
	var buildingPower = this.getPlayerBuildingsPower(playerDoc)
	var housePower = this.getPlayerHousesPower(playerDoc)
	var soldierPower = this.getPlayerSoldiersPower(playerDoc)

	return buildingPower + housePower + soldierPower
}

/**
 * 获取建筑战斗力
 * @param playerDoc
 * @returns {number}
 */
Utils.getPlayerBuildingsPower = function(playerDoc){
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
Utils.getPlayerHousesPower = function(playerDoc){
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
Utils.getPlayerSoldiersPower = function(playerDoc){
	var totalPower = 0
	var config = null
	_.each(playerDoc.soldiers, function(soldierCount, soldierName){
		if(Utils.hasSpecialSoldier(soldierName)){
			config = UnitConfig.special[soldierName]
		}else{
			var fullName = soldierName + "_" + 1
			config = UnitConfig.normal[fullName]
		}
		totalPower += config.power * soldierCount
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
Utils.getPlayerBuildingLevelLimit = function(playerDoc){
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
	return _.some(UnitConfig.normal, function(config){
		if(_.isEqual(config.name, soldierName)) return true
	})
}

/**
 * 是否有特殊兵种
 * @param soldierName
 * @returns {boolean}
 */
Utils.hasSpecialSoldier = function(soldierName){
	var keys = _.keys(UnitConfig.special)
	return _.contains(keys, soldierName)
}

/**
 * 获取招募普通兵种所需的资源
 * @param soldierName
 * @param count
 * @returns {{resources: {wood: number, stone: number, iron: number, food: number}, recruitTime: (*|Array)}}
 */
Utils.getRecruitNormalSoldierRequired = function(soldierName, count){
	var star = 1
	var fullSoldierName = soldierName + "_" + star
	var config = UnitConfig.normal[fullSoldierName]
	var resources = {
		wood:config.wood * count,
		stone:config.stone * count,
		iron:config.iron * count,
		food:config.food * count,
		citizen:config.citizen * count
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
	var config = UnitConfig.special[soldierName]
	var materialNames = config.specialMaterials.split(",")
	var materials = {}
	_.each(materialNames, function(value){
		materials[value] = count
	})
	var totalNeed = {
		materials:materials,
		recruitTime:this.getRecruitSoldierTime(soldierName, count),
		citizen:config.citizen * count
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
	if(this.hasSpecialSoldier(soldierName)){
		config = UnitConfig.special[soldierName]
	}else{
		var star = 1
		var fullSoldierName = soldierName + "_" + star
		config = UnitConfig.normal[fullSoldierName]
	}
	return config.recruitTime * count
}

/**
 * 获取士兵招募单次最大数量
 * @param playerDoc
 * @param soldierName
 * @returns {number}
 */
Utils.getPlayerSoldierMaxRecruitCount = function(playerDoc, soldierName){
	var building = playerDoc.buildings["location_8"]
	var config = BuildingFunction[building.type][building.level]
	var maxRecruit = config.maxRecruit
	var soldierConfig = null
	if(this.hasSpecialSoldier(soldierName)){
		soldierConfig = UnitConfig.special[soldierName]
	}else{
		var fullSoldierName = soldierName + "_" + 1
		soldierConfig = UnitConfig.normal[fullSoldierName]
	}
	var maxCount = Math.floor(maxRecruit / soldierConfig.citizen)
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
Utils.getPlayerMakeDragonEquipmentRequired = function(playerDoc, equipmentName){
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
	required.makeTime = this.getPlayerMakeDragonEquipmentTime(playerDoc, equipmentName)
	return required
}

/**
 * 获取龙装备制造时间
 * @param playerDoc
 * @param equipmentName
 * @returns {*}
 */
Utils.getPlayerMakeDragonEquipmentTime = function(playerDoc, equipmentName){
	var building = playerDoc.buildings["location_9"]
	var smithConfig = BuildingFunction[building.type][building.level]
	var dragonEquipmentConfig = DragonEquipmentConfig[equipmentName]
	var makeTime = dragonEquipmentConfig.makeTime
	return LogicUtils.getEfficiency(makeTime, smithConfig.efficiency)
}

/**
 * 是否还有可用的建筑建造队列
 * @param playerDoc
 */
Utils.playerHasFreeBuildQueue = function(playerDoc){
	return playerDoc.basicInfo.buildQueue - LogicUtils.getUsedBuildQueue(playerDoc) > 0
}

/**
 * 获取治疗指定伤兵所需时间
 * @param soldierName
 * @param count
 * @returns {number}
 */
Utils.getTreatSoldierTime = function(soldierName, count){
	var star = 1
	var fullSoldierName = soldierName + "_" + star
	var config = UnitConfig.normal[fullSoldierName]
	return config.treatTime * count
}

/**
 * 获取招募普通兵种所需的资源
 * @param playerDoc
 * @param soldiers
 * @returns {{resources: {wood: number, stone: number, iron: number, food: number}, recruitTime: (*|Array)}}
 */
Utils.getPlayerTreatSoldierRequired = function(playerDoc, soldiers){
	var self = this
	var totalNeed = {
		resources:{
			wood:0,
			stone:0,
			iron:0,
			food:0
		},
		treatTime:0
	}
	_.each(soldiers, function(soldier){
		var soldierName = soldier.name
		var count = soldier.count
		var star = 1
		var fullSoldierName = soldierName + "_" + star
		var config = UnitConfig.normal[fullSoldierName]
		totalNeed.resources.wood += config.treatWood * count
		totalNeed.resources.stone += config.treatStone * count
		totalNeed.resources.iron += config.treatIron * count
		totalNeed.resources.food += config.treatFood * count
		totalNeed.treatTime += self.getTreatSoldierTime(soldierName, count)
	})
	return totalNeed
}

/**
 * 获取龙的活力值
 * @param playerDoc
 * @param dragon
 * @returns {*}
 */
Utils.getPlayerDragonVitality = function(playerDoc, dragon){
	var config = DragonEyrie.dragonAttribute[dragon.star]
	var vitality = config.initVitality + (config.perLevelVitality * dragon.level)
	return vitality
}

/**
 * 获取龙的力量
 * @param playerDoc
 * @param dragon
 * @returns {*}
 */
Utils.getPlayerDragonStrength = function(playerDoc, dragon){
	var config = DragonEyrie.dragonAttribute[dragon.star]
	var vitality = config.initStrength + (config.perLevelStrength * dragon.level)
	return vitality
}

/**
 * 随机生成Buff加成类型
 * @param equipmentName
 * @returns {Array}
 */
Utils.generateDragonEquipmentBuffs = function(equipmentName){
	var generatedBuffs = []
	var star = DragonEquipmentConfig[equipmentName].maxStar
	var buffs = DragonEyrie.equipmentBuff
	var buffKeys = Object.keys(buffs)
	for(var i = 0; i < star; i++){
		buffKeys = CommonUtils.shuffle(buffKeys)
		var key = buffKeys[0]
		generatedBuffs.push(key)
	}

	return generatedBuffs
}

/**
 * 检查某装备是否能装配到龙的制定位置上
 * @param equipmentName
 * @param equipmentCategory
 * @returns {boolean}
 */
Utils.isDragonEquipmentLegalAtCategory = function(equipmentName, equipmentCategory){
	var config = DragonEquipmentConfig[equipmentName]
	var categories = config.category.split(",")
	return _.contains(categories, equipmentCategory)

}

/**
 * 检查装备是否是属于此龙的类型
 * @param equipmentName
 * @param dragonType
 * @returns {*}
 */
Utils.isDragonEquipmentLegalOnDragon = function(equipmentName, dragonType){
	var config = DragonEquipmentConfig[equipmentName]
	return _.isEqual(dragonType, config.usedFor)
}

/**
 * 检查龙的装备的星级是否和龙的星级匹配
 * @param equipmentName
 * @param dragon
 * @returns {*}
 */
Utils.isDragonEquipmentStarEqualWithDragonStar = function(equipmentName, dragon){
	var config = DragonEquipmentConfig[equipmentName]
	return _.isEqual(config.maxStar, dragon.star)
}

/**
 * 龙装备是否已强化到最高等级
 * @param equipment
 * @returns {boolean}
 */
Utils.isDragonEquipmentReachMaxStar = function(equipment){
	var config = DragonEquipmentConfig[equipment.name]
	return config.maxStar <= equipment.star
}

/**
 * 获取指龙装备的最大星级
 * @param equipmentName
 * @returns {*}
 */
Utils.getDragonEquipmentMaxStar = function(equipmentName){
	var config = DragonEquipmentConfig[equipmentName]
	return config.maxStar
}

/**
 * 检查对龙技能的升级是否合法
 * @param dragon
 * @param skillName
 * @returns {boolean}
 */
Utils.isDragonSkillUnlocked = function(dragon, skillName){
	var config = DragonEyrie.dragonSkill[skillName]
	return config.unlockStar <= dragon.star
}

/**
 * 此龙类型是否存在
 * @param dragonType
 * @returns {*}
 */
Utils.isDragonTypeExist = function(dragonType){
	var config = DragonEyrie.dragons
	return _.contains(Object.keys(config), dragonType)
}

/**
 * 获取升级龙的技能所需的资源
 * @param dragon
 * @param skill
 * @returns {{}}
 */
Utils.getDragonSkillUpgradeRequired = function(dragon, skill){
	var config = DragonEyrie.dragonSkill[skill.name]
	var totalNeed = {}
	totalNeed.energy = config.energyCostPerLevel
	totalNeed.blood = config.heroBloodCostPerLevel * (skill.level + 1) * (skill.level + 1)
	return totalNeed
}

/**
 * 技能是否以达到最高等级
 * @param skill
 * @returns {boolean}
 */
Utils.isDragonSkillReachMaxLevel = function(skill){
	var config = DragonEyrie.dragonSkill[skill.name]
	return skill.level >= config.maxLevel
}

/**
 * 获取龙的指定技能的最高等级
 * @param skill
 * @returns {dragonSkill.dragonBlood.maxLevel|*|dragonSkill.infantryEnhance.maxLevel|dragonSkill.dragonBreath.maxLevel|dragonSkill.siegeEnhance.maxLevel|dragonSkill.cavalryEnhance.maxLevel}
 */
Utils.getDragonSkillMaxLevel = function(skill){
	var config = DragonEyrie.dragonSkill[skill.name]
	return config.maxLevel
}

/**
 * 强化龙的装备
 * @param playerDoc
 * @param playerData
 * @param dragonType
 * @param category
 * @param equipments
 */
Utils.enhancePlayerDragonEquipment = function(playerDoc, playerData, dragonType, category, equipments){
	var dragon = playerDoc.dragons[dragonType]
	var equipmentInDragon = dragon.equipments[category]
	var config = DragonEquipmentConfig[equipmentInDragon.name]
	var maxStar = config.maxStar
	var currentStar = equipmentInDragon.star
	var currentExp = Number(equipmentInDragon.exp)
	var totalExp = this.getDragonEquipmentsExp(dragonType, equipmentInDragon, equipments)
	while(totalExp > 0 && currentStar < maxStar){
		var nextStar = currentStar + 1
		var categoryConfig = DragonEyrie[category][maxStar + "_" + nextStar]
		var expNeeded = categoryConfig.enhanceExp - currentExp
		if(expNeeded <= totalExp){
			currentStar += 1
			currentExp = 0
			totalExp -= expNeeded
		}else{
			currentExp += totalExp
			totalExp = 0
		}
	}
	equipmentInDragon.star = currentStar
	equipmentInDragon.exp = currentExp

	playerData.dragonEquipments = {}
	_.each(equipments, function(equipment){
		playerDoc.dragonEquipments[equipment.name] -= equipment.count
		playerData.dragonEquipments[equipment.name] = playerDoc.dragonEquipments[equipment.name]
	})
}

/**
 * 获取龙装备的经验值
 * @param dragonType
 * @param equipmentInDragon
 * @param equipments
 * @returns {number}
 */
Utils.getDragonEquipmentsExp = function(dragonType, equipmentInDragon, equipments){
	var self = this
	var totalExp = 0
	_.each(equipments, function(equipment){
		var exp = self.getDragonEquipmentExp(dragonType, equipmentInDragon, equipment.name, equipment.count)
		totalExp += exp
	})
	return totalExp
}

/**
 * 获取单个龙装备的经验值
 * @param dragonType
 * @param equipmentInDragon
 * @param equipmentName
 * @param count
 * @returns {number}
 */
Utils.getDragonEquipmentExp = function(dragonType, equipmentInDragon, equipmentName, count){
	var config = DragonEquipmentConfig[equipmentName]
	var usedFor = config.usedFor
	if(_.isEqual(equipmentInDragon.name, equipmentName)){
		return config.resolveLExp * count
	}else if(_.isEqual(dragonType, usedFor)){
		return config.resolveMExp * count
	}else{
		return config.resolveSExp * count
	}
}

/**
 * 龙的等级是否达到让龙晋级的条件
 * @param dragon
 * @returns {boolean}
 */
Utils.isDragonReachUpgradeLevel = function(dragon){
	var config = DragonEyrie.dragonAttribute[dragon.star + 1]
	return dragon.level >= config.promotionLevel
}

/**
 * 获取指定龙的星级下的最小等级
 * @param dragon
 * @returns {promotionLevel|*}
 */
Utils.getDragonLowestLevelOnStar = function(dragon){
	var config = DragonEyrie.dragonAttribute[dragon.star]
	return config.promotionLevel
}

/**
 * 获取指定龙的星级下的最大等级
 * @param dragon
 * @returns {levelMax|*}
 */
Utils.getDragonHighestLevelOnStar = function(dragon){
	var config = DragonEyrie.dragonAttribute[dragon.star]
	return config.levelMax
}

/**
 * 龙的装备是否达到让龙晋级的条件
 * @param dragon
 */
Utils.isDragonEquipmentsReachUpgradeLevel = function(dragon){
	var allCategory = DragonEyrie.dragonAttribute[dragon.star + 1].allCategory.split(",")
	return _.every(allCategory, function(category){
		var equipment = dragon.equipments[category]
		if(_.isEmpty(equipment.name)) return false
		var maxStar = DragonEquipmentConfig[equipment.name].maxStar
		return equipment.star >= maxStar
	})
}

/**
 * 获取龙的最大星级
 * @returns {number}
 */
Utils.getDragonMaxStar = function(){
	return 4
}

/**
 *龙是否已达到最高星级
 * @param dragon
 * @returns {boolean}
 */
Utils.isDragonReachMaxStar = function(dragon){
	return dragon.star >= 4
}

/**
 * 获取收税所需的城民
 * @param playerDoc
 * @returns {{citizen: (taxCitizen|*), imposeTime: (taxTime|*)}}
 */
Utils.getPlayerImposeRequired = function(playerDoc){
	var building = playerDoc.buildings["location_15"]
	var config = BuildingFunction.townHall[building.level]
	var required = {
		citizen:config.taxCitizen,
		imposeTime:config.taxTime
	}
	return required
}

/**
 * 获取收税将要获得的银币
 * @param playerDoc
 * @returns {totalTax|*}
 */
Utils.getPlayerImposedCoin = function(playerDoc){
	var building = playerDoc.buildings["location_15"]
	var config = BuildingFunction.townHall[building.level]
	return config.totalTax
}

/**
 * 获取建造联盟所消耗的宝石
 * @returns {*}
 */
Utils.getGemByCreateAlliance = function(){
	return AllianceInit.intInit.createAllianceGem.value
}

/**
 * 获取购买盟主职位所需要的宝石
 * @returns {*}
 */
Utils.getGemByBuyAllianceArchon = function(){
	return AllianceInit.intInit.buyArchonGem.value
}

/**
 * 检查操作联盟相关API的权限是否足够
 * @param title
 * @param api
 * @returns {*}
 */
Utils.isAllianceOperationLegal = function(title, api){
	var config = AllianceRight[title]
	return config[api]
}

/**
 * 获取联盟职称等级
 * @param title
 * @returns {*}
 */
Utils.getAllianceTitleLevel = function(title){
	return AllianceRight[title].titleLevel
}

/**
 * 获取玩家Vip等级
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerVipLevel = function(playerDoc){
	var vipExpConfig = PlayerInitData.vipLevel
	var vipExp = playerDoc.basicInfo.vipExp
	for(var i = vipExpConfig.length; i >= 1; i++){
		var minExp = vipExpConfig[i].expFrom
		if(vipExp >= minExp) return i
	}
	return 1
}

/**
 * 获取玩家协助加速效果
 * @param playerDoc
 * @returns {number}
 */
Utils.getPlayerHelpAllianceMemberSpeedUpEffect = function(playerDoc){
	return 2 * 60 * 1000
}

/**
 * 获取免费加速效果
 * @param playerDoc
 * @returns {number}
 */
Utils.getPlayerFreeSpeedUpEffect = function(playerDoc){
	return 5 * 60 * 1000
}

/**
 * 联盟捐赠是否含有此捐赠类型
 * @param donateType
 * @returns {boolean}
 */
Utils.hasAllianceDonateType = function(donateType){
	var has = false
	_.each(AllianceInit.donate, function(config){
		if(_.isEqual(config.type, donateType)){
			has = true
		}
	})
	return has
}

/**
 * 根据捐赠类型和捐赠级别获取捐赠配置
 * @param donateType
 * @param donateLevel
 * @returns {*}
 */
Utils.getAllianceDonateConfigByTypeAndLevel = function(donateType, donateLevel){
	var donateConfig = null
	_.each(AllianceInit.donate, function(config){
		if(_.isEqual(config.type, donateType) && _.isEqual(config.level, donateLevel)){
			donateConfig = config
		}
	})
	return donateConfig
}

/**
 * 更新联盟玩家指定捐赠类型的下次捐赠等级
 * @param memberInAllianceDoc
 * @param donateType
 * @returns {*}
 */
Utils.updateAllianceMemberDonateLevel = function(memberInAllianceDoc, donateType){
	var currentLevel = memberInAllianceDoc.donateStatus[donateType]
	var hasFound = false
	_.each(AllianceInit.donate, function(config){
		if(!hasFound && _.isEqual(config.type, donateType)){
			if(config.level > currentLevel){
				currentLevel += 1
				hasFound = true
			}
		}
	})
	memberInAllianceDoc.donateStatus[donateType] = currentLevel
}

/**
 * 获取升级联盟建筑所需的资源
 * @param buildingName
 * @param buildingLevel
 * @returns {{keepLevel: (needKeep|*), honour: (needHonour|*)}}
 */
Utils.getAllianceBuildingUpgradeRequired = function(buildingName, buildingLevel){
	var config = AllianceBuildingConfig[buildingName][buildingLevel]
	var required = {
		keepLevel:config.needKeep,
		honour:config.needHonour
	}
	return required
}

/**
 * 获取升级联盟村落所需要的资源
 * @param villageType
 * @param villageLevel
 * @returns {{honour: (needHonour|*)}}
 */
Utils.getAllianceVillageUpgradeRequired = function(villageType, villageLevel){
	var config = AllianceVillageConfig[villageType][villageLevel]
	var required = {
		honour:config.needHonour
	}
	return required
}

/**
 * 获取移动联盟建筑需要的资源
 * @param buildingName
 * @param buildingLevel
 * @returns {{honour: (moveNeedHonour|*)}}
 */
Utils.getAllianceMoveBuildingRequired = function(buildingName, buildingLevel){
	var config = AllianceBuildingConfig[buildingName][buildingLevel]
	var required = {
		honour:config.moveNeedHonour
	}
	return required
}

/**
 *
 * @param decorateType
 * @returns {*}
 */
Utils.getAllianceDistroyDecorateRequired = function(decorateType){
	var config = AllianceInit.buildingType[decorateType]
	var required = {
		honour:config.distroyNeedHonour
	}
	return required
}

/**
 * 指定联盟建筑是否到达最高等级
 * @param buildingName
 * @param buildingLevel
 * @returns {boolean}
 */
Utils.isAllianceBuildingReachMaxLevel = function(buildingName, buildingLevel){
	var config = AllianceBuildingConfig[buildingName][buildingLevel + 1]
	return !_.isObject(config)
}

/**
 * 指定联盟村落类型是否到达最高等级
 * @param allianceType
 * @param allianceLevel
 * @returns {boolean}
 */
Utils.isAllianceVillageReachMaxLevel = function(allianceType, allianceLevel){
	var config = AllianceVillageConfig[allianceType][allianceLevel + 1]
	return !_.isObject(config)
}

/**
 * 获取编辑联盟基础信息消耗的宝石
 * @returns {*}
 */
Utils.getEditAllianceBasicInfoGem = function(){
	return AllianceInit.intInit.editAllianceBasicInfoGem.value
}

/**
 * 获取改变联盟地形所消耗的荣耀值
 * @returns {*}
 */
Utils.getEditAllianceTerrianHonour = function(){
	return AllianceInit.intInit.editAllianceTerrianHonour.value
}

/**
 * 获取村落配置
 * @returns {*}
 */
Utils.getAllianceVillageTypeConfigs = function(){
	var config = AllianceInit.buildingType
	var villages = _.filter(config, function(configObj){
		return _.isEqual(configObj.category, "village")
	})
	return villages
}

/**
 * 村落类型是否合法
 * @param villageType
 * @returns {*}
 */
Utils.isAllianceVillageTypeLegal = function(villageType){
	var keys = _.keys(AllianceVillageConfig)
	return _.contains(keys, villageType)
}

/**
 * 获取村落士兵信息
 * @param villageType
 * @param villageLevel
 * @returns {*}
 */
Utils.getAllianceVillageConfigedDragonAndSoldiers = function(villageType, villageLevel){
	var soldiers = []
	var config = AllianceVillageConfig[villageType][villageLevel]
	var soldierConfigs = config.soldiers.split(",")
	var dragonConfig = soldierConfigs.shift()
	var dragonParams = dragonConfig.split("_")
	var dragon = {
		type:dragonParams[0],
		star:parseInt(dragonParams[1]),
		level:parseInt(dragonParams[2])
	}
	_.each(soldierConfigs, function(soldierConfig){
		var params = soldierConfig.split("_")
		var soldierName = params[0]
		var soldierStar = parseInt(params[1])
		var soldierCount = parseInt(params[2])
		var soldierCountMax = Math.round(soldierCount * 1.2)
		var soldierCountMin = Math.round(soldierCount * 0.8)
		soldierCount = soldierCountMin + ((Math.random() * (soldierCountMax - soldierCountMin)) << 0)
		var soldier = {
			name:soldierName,
			star:soldierStar,
			count:soldierCount
		}
		soldiers.push(soldier)
	})
	return {dragon:dragon, soldiers:soldiers}
}

Utils.getAllianceVillageProduction = function(villageType, villageLevel){
	var config = AllianceVillageConfig[villageType][villageLevel]
	return config.production
}

/**
 * 获取联盟村落建筑等级
 * @param allianceDoc
 * @param villageType
 * @returns {*}
 */
Utils.getAllianceVillageLevelByType = function(allianceDoc, villageType){
	return allianceDoc.villageLevels[villageType]
}

/**
 * 创建联盟村落
 * @param mapObjects
 * @returns {Array}
 */
Utils.createMapVillages = function(mapObjects){
	var self = this
	var villages = []
	var villageObjects = _.filter(mapObjects, function(mapObject){
		var buildingType = mapObject.type
		var config = AllianceInit.buildingType[buildingType]
		return _.isEqual(config.category, "village")
	})
	_.each(villageObjects, function(villageObject){
		var dragonAndSoldiers = self.getAllianceVillageConfigedDragonAndSoldiers(villageObject.type, 1)
		var village = {
			id:ShortId.generate(),
			type:villageObject.type,
			level:1,
			resource:self.getAllianceVillageProduction(villageObject.type, 1),
			dragon:dragonAndSoldiers.dragon,
			soldiers:dragonAndSoldiers.soldiers,
			location:villageObject.location
		}
		villages.push(village)
	})
	return villages
}

/**
 * 为联盟添加村落
 * @param allianceDoc
 * @param mapObject
 * @returns {{id: *, type: *, level: *, resource: *, dragon: *, soldiers: *, location: *}}
 */
Utils.addAllianceVillageObject = function(allianceDoc, mapObject){
	var villageType = mapObject.type
	var villageLevel = allianceDoc.villageLevels[villageType]
	var dragonAndSoldiers = this.getAllianceVillageConfigedDragonAndSoldiers(villageType, villageLevel)
	var village = {
		id:ShortId.generate(),
		type:mapObject.type,
		level:villageLevel,
		resource:this.getAllianceVillageProduction(villageType, villageLevel),
		dragon:dragonAndSoldiers.dragon,
		soldiers:dragonAndSoldiers.soldiers,
		location:mapObject.location
	}
	allianceDoc.villages.push(village)
	return village
}

/**
 * 获取建筑类型在联盟的宽高
 * @param buildingType
 * @returns {{width: *, height: *}}
 */
Utils.getSizeInAllianceMap = function(buildingType){
	var config = AllianceInit.buildingType[buildingType]
	return {width:config.width, height:config.height}
}

/**
 * 联盟地图对象是否为装饰对象
 * @param objectType
 * @returns {*}
 */
Utils.isAllianceMapObjectTypeADecorateObject = function(objectType){
	var config = AllianceInit.buildingType[objectType]
	return _.isEqual(config.category, "decorate")
}

/**
 * 刷新联盟感知力
 * @param allianceDoc
 * @returns {perception|*|allianceSchema.basicInfo.perception}
 */
Utils.getAlliancePerception = function(allianceDoc){
	var shrine = allianceDoc.buildings.shrine
	var config = AllianceBuildingConfig.shrine[shrine.level]
	var perception = allianceDoc.basicInfo.perception
	var addPerSecond = config.pRecovery / 60 / 60
	var totalSeconds = Date.now() - allianceDoc.basicInfo.perceptionRefreshTime
	var perceptionAdd = Math.floor(addPerSecond * totalSeconds)
	return perception + perceptionAdd > config.perception ? config.perception : perception + perceptionAdd
}

/**
 * 联盟圣地事件名称是否合法
 * @param stageName
 * @returns {*}
 */
Utils.isAllianceShrineStageNameLegal = function(stageName){
	var config = AllianceShrineConfig
	return _.contains(_.keys(config), stageName)
}

/**
 * 创建联盟圣地事件
 * @param stageName
 * @returns {*}
 */
Utils.createAllianceShrineStageEvent = function(stageName){
	var event = {
		id:ShortId.generate(),
		stageName:stageName,
		createTime:Date.now(),
		startTime:Date.now() + (AllianceInit.intInit.activeShrineStageEventTime.value * 1000),
		playerTroops:[]
	}
	return event
}

/**
 * 获取激活圣地事件需要的感知力
 * @param stageName
 * @returns {{perception: *}}
 */
Utils.getAllianceActiveShrineStageRequired = function(stageName){
	var config = AllianceShrineConfig[stageName]
	var required = {
		perception:config.needPerception
	}
	return required
}

/**
 * 创建战斗用普通军队信息
 * @param playerDoc
 * @param soldierName
 * @param soldierStar
 * @param soldierCount
 * @returns {*}
 */
Utils.createPlayerNormalSoldierForFight = function(playerDoc, soldierName, soldierStar, soldierCount){
	var soldierFullKey = soldierName + "_" + soldierStar
	var config = UnitConfig.normal[soldierFullKey]
	var soldier = {
		name:soldierName,
		star:soldierStar,
		type:config.type,
		currentCount:soldierCount,
		totalCount:soldierCount,
		woundedCount:0,
		power:config.power,
		hp:config.hp,
		load:config.load,
		citizen:config.citizen,
		morale:100,
		round:0,
		attackPower:{
			infantry:config.infantry,
			archer:config.archer,
			cavalry:config.cavalry,
			siege:config.siege,
			wall:config.wall
		},
		killedSoldiers:[]
	}
	return soldier
}

/**
 * 创建战斗用特殊军队信息
 * @param playerDoc
 * @param soldierName
 * @param soldierCount
 * @returns {*}
 */
Utils.createPlayerSpecialSoldierForFight = function(playerDoc, soldierName, soldierCount){
	var config = UnitConfig.special[soldierName]
	var soldier = {
		name:soldierName,
		star:config.star,
		type:config.type,
		currentCount:soldierCount,
		totalCount:soldierCount,
		woundedCount:0,
		power:config.power,
		hp:config.hp,
		load:config.load,
		citizen:config.citizen,
		morale:100,
		round:0,
		attackPower:{
			infantry:config.infantry,
			archer:config.archer,
			cavalry:config.cavalry,
			siege:config.siege,
			wall:config.wall
		},
		killedSoldiers:[]
	}
	return soldier
}

/**
 * 创建战斗用军队
 * @param playerDoc
 * @param soldiers
 * @returns {Array}
 */
Utils.createPlayerSoldiersForFight = function(playerDoc, soldiers){
	var self = this
	var soldiersForFight = []
	_.each(soldiers, function(soldier){
		if(self.hasNormalSoldier(soldier.name)){
			soldiersForFight.push(self.createPlayerNormalSoldierForFight(playerDoc, soldier.name, 1, soldier.count))
		}else{
			soldiersForFight.push(self.createPlayerSpecialSoldierForFight(playerDoc, soldier.name, soldier.count))
		}
	})
	soldiersForFight = _.sortBy(soldiersForFight, function(soldier){
		return -(soldier.power * soldier.totalCount)
	})
	return soldiersForFight
}

/**
 * 创建战斗用龙
 * @param playerDoc
 * @param dragon
 * @returns {*}
 */
Utils.createPlayerDragonForFight = function(playerDoc, dragon){
	var dragonForFight = {
		type:dragon.type,
		level:dragon.level,
		strength:dragon.strength,
		vitality:dragon.vitality,
		maxHp:this.getPlayerDragonHpMax(playerDoc, dragon),
		totalHp:dragon.hp,
		currentHp:dragon.hp,
		isWin:false
	}
	return dragonForFight
}

/**
 * 创建战斗用的城墙
 * @param playerDoc
 * @returns {*}
 */
Utils.createPlayerWallForFight = function(playerDoc){
	var getProperty = function(type, level, key){
		return BuildingFunction[type][level][key]
	}
	var getPowersByType = function(type){
		var power = 0
		_.each(playerDoc.towers, function(tower){
			if(tower.level > 0){
				power += getProperty("tower", tower.level, type)
			}
		})
		return power
	}

	var wall = {
		maxHp:getProperty("wall", playerDoc.wall.level, "wallHp"),
		totalHp:playerDoc.resources.wallHp,
		currentHp:playerDoc.resources.wallHp,
		round:0,
		attackPower:{
			infantry:getPowersByType("infantry"),
			archer:getPowersByType("archer"),
			cavalry:getPowersByType("cavalry"),
			siege:getPowersByType("siege")
		},
		defencePower:getPowersByType("defencePower"),
		killedSoldiers:[]
	}
	return wall
}

/**
 * 获取圣地部队信息
 * @param stageName
 * @returns {Array}
 */
Utils.getAllianceShrineStageTroops = function(stageName){
	var troops = []
	var troopStrings = AllianceShrineConfig[stageName].troops.split("&")
	for(var i = 0; i < troopStrings.length; i++){
		var troopString = troopStrings[i]
		var soldierConfigStrings = troopString.split(",")
		var dragonConfig = soldierConfigStrings.shift()
		var dragonParams = dragonConfig.split("_")
		var dragon = {
			type:dragonParams[0],
			star:parseInt(dragonParams[1]),
			level:parseInt(dragonParams[2])
		}
		var dragonVitality = this.getPlayerDragonVitality(null, dragon)
		dragon.vitality = dragonVitality
		var dragonHp = this.getPlayerDragonHpMax(null, dragon)
		var dragonForFight = {
			type:dragonParams[0],
			strength:this.getPlayerDragonStrength(null, dragon),
			vitality:dragonVitality,
			maxHp:dragonHp,
			totalHp:dragonHp,
			currentHp:dragonHp,
			isWin:false
		}
		var soldiersForFight = []
		_.each(soldierConfigStrings, function(soldierConfigString){
			var params = soldierConfigString.split("_")
			var soldierName = params[0]
			var soldierStar = parseInt(params[1])
			var soldierCount = parseInt(params[2])
			var unitConfig = UnitConfig.normal[soldierName + "_" + soldierStar]
			var soldierForFight = {
				name:soldierName,
				star:unitConfig.star,
				type:unitConfig.type,
				currentCount:soldierCount,
				totalCount:soldierCount,
				woundedCount:0,
				power:unitConfig.power,
				hp:unitConfig.hp,
				load:unitConfig.load,
				citizen:unitConfig.citizen,
				morale:100,
				round:0,
				attackPower:{
					infantry:unitConfig.infantry,
					archer:unitConfig.archer,
					cavalry:unitConfig.cavalry,
					siege:unitConfig.siege,
					wall:unitConfig.wall
				},
				killedSoldiers:[]
			}
			soldiersForFight.push(soldierForFight)
		})
		troops.push({
			stageName:stageName,
			troopNumber:i + 1,
			dragonForFight:dragonForFight,
			soldiersForFight:soldiersForFight
		})
	}
	_.each(troops, function(troop){
		_.sortBy(troop.soldiersForFight, function(soldier){
			return -soldier.power * soldier.count
		})
	})

	var getSoldiersTotalPower = function(soldiers){
		var totalPower = 0
		_.each(soldiers, function(soldier){
			totalPower += soldier.power * soldier.count
		})
	}
	troops = _.sortBy(troops, function(troop){
		return -getSoldiersTotalPower(troop.soldiersForFight)
	})
	return troops
}

/**
 * 获取玩家战损兵力去医院的数量
 * @param playerDoc
 * @returns {number}
 */
Utils.getPlayerDamagedSoldierToWoundedSoldierPercent = function(playerDoc){
	return 0.4
}

/**
 * 月门战斗结束后,获取需要的结果
 * @param stageName
 * @param isWin
 * @param fightDatas
 * @returns {*}
 */
Utils.getAllianceShrineStageResultDatas = function(stageName, isWin, fightDatas){
	var self = this
	var playerDatas = {}
	var woundedSoldiers = {}
	var damagedSoldiers = {}
	var playerRewards = {}
	var playerKills = {}
	var playerDragonHps = {}
	var fightStar = 0
	var totalDeath = 0
	_.each(fightDatas, function(fightData){
		_.each(fightData.roundDatas, function(roundData){
			if(!_.isObject(playerDatas[roundData.playerId])){
				playerDatas[roundData.playerId] = {
					id:roundData.playerId,
					name:roundData.playerName,
					kill:0,
					rewards:[]
				}
				woundedSoldiers[roundData.playerId] = {}
				damagedSoldiers[roundData.playerId] = {}
				playerKills[roundData.playerId] = 0
				playerDragonHps[roundData.playerId] = 0
			}
			var playerData = playerDatas[roundData.playerId]
			playerDragonHps[roundData.playerId] += roundData.attackDragonFightData.hpDecreased
			_.each(roundData.defenceSoldierRoundDatas, function(defenceSoldierRoundData){
				var soldierConfig = UnitConfig.normal[defenceSoldierRoundData.soldierName + "_" + defenceSoldierRoundData.soldierStar]
				var kill = defenceSoldierRoundData.soldierDamagedCount * soldierConfig.citizen
				playerData.kill += kill
				playerKills[roundData.playerId] += kill
			})
			_.each(roundData.attackSoldierRoundDatas, function(attackSoldierRoundData){
				var soldierConfig = function(){
					if(self.hasNormalSoldier(attackSoldierRoundData.soldierName)){
						soldierConfig = UnitConfig.normal[attackSoldierRoundData.soldierName + "_" + attackSoldierRoundData.soldierStar]
					}else{
						soldierConfig = UnitConfig.special[attackSoldierRoundData.soldierName]
					}
					return soldierConfig
				}()
				totalDeath += attackSoldierRoundData.soldierDamagedCount * soldierConfig.citizen
				if(!_.isObject(woundedSoldiers[roundData.playerId][attackSoldierRoundData.soldierName])){
					woundedSoldiers[roundData.playerId][attackSoldierRoundData.soldierName] = {
						name:attackSoldierRoundData.soldierName,
						count:0
					}
					damagedSoldiers[roundData.playerId][attackSoldierRoundData.soldierName] = {
						name:attackSoldierRoundData.soldierName,
						count:0
					}
				}
				var woundedSoldier = woundedSoldiers[roundData.playerId][attackSoldierRoundData.soldierName]
				woundedSoldier.count += attackSoldierRoundData.soldierWoundedCount
				var damagedSoldier = damagedSoldiers[roundData.playerId][attackSoldierRoundData.soldierName]
				damagedSoldier.count += attackSoldierRoundData.soldierDamagedCount
			})
		})
	})

	if(isWin){
		fightStar += 1
		if(fightDatas.length <= 1){
			fightStar += 1
			if(totalDeath <= AllianceShrineConfig[stageName].star2DeathCitizen){
				fightStar += 1
			}
		}
	}

	var stageConfig = AllianceShrineConfig[stageName]
	_.each(playerDatas, function(playerData, playerId){
		var rewardStrings = null
		if(playerData.kill >= stageConfig.goldKill){
			rewardStrings = stageConfig.goldRewards.split(",")
			_.each(rewardStrings, function(rewardString){
				var param = rewardString.split(":")
				var type = param[0]
				var name = param[1]
				var count = parseInt(param[2])
				playerData.rewards.push({
					type:type,
					name:name,
					count:count
				})
			})
		}else if(playerData.kill >= stageConfig.silverKill){
			rewardStrings = stageConfig.silverRewards.split(",")
			_.each(rewardStrings, function(rewardString){
				var param = rewardString.split(":")
				var type = param[0]
				var name = param[1]
				var count = parseInt(param[2])
				playerData.rewards.push({
					type:type,
					name:name,
					count:count
				})
			})
		}else if(playerData.kill >= stageConfig.bronzeKill){
			rewardStrings = stageConfig.bronzeRewards.split(",")
			_.each(rewardStrings, function(rewardString){
				var param = rewardString.split(":")
				var type = param[0]
				var name = param[1]
				var count = parseInt(param[2])
				playerData.rewards.push({
					type:type,
					name:name,
					count:count
				})
			})
		}
		playerRewards[playerId] = playerData.rewards
	})

	playerDatas = _.values(playerDatas)
	playerDatas.sort(function(a, b){
		return b.kill - a.kill
	})

	_.each(damagedSoldiers, function(damagedSoldier, playerId){
		damagedSoldiers[playerId] = _.values(damagedSoldier)
	})
	_.each(woundedSoldiers, function(woundedSoldier, playerId){
		woundedSoldiers[playerId] = _.values(woundedSoldier)
	})
	var params = {
		playerDatas:playerDatas,
		fightStar:fightStar,
		damagedSoldiers:damagedSoldiers,
		woundedSoldiers:woundedSoldiers,
		playerRewards:playerRewards,
		playerKills:playerKills,
		playerDragonHps:playerDragonHps
	}
	return params
}

/**
 * 联盟圣地关卡是否解锁
 * @param allianceDoc
 * @param stageName
 */
Utils.isAllianceShrineStageLocked = function(allianceDoc, stageName){
	var config = AllianceShrineConfig[stageName]
	if(config.index == 1) return false
	var previousStageName = null
	_.each(AllianceShrineConfig, function(theConfig){
		if(theConfig.index == config.index - 1) previousStageName = theConfig.stageName
	})

	var stageData = LogicUtils.getAllianceShrineStageData(allianceDoc, stageName)
	return !_.isObject(stageData)
}

/**
 * 获取联盟圣地战争联盟获得的荣耀
 * @param stageName
 * @param fightStar
 * @returns {*}
 */
Utils.getAllianceShrineStageFightHoner = function(stageName, fightStar){
	var config = AllianceShrineConfig[stageName]
	var honerName = "star" + fightStar + "Honour"
	return config[honerName]
}

/**
 * 获取联盟战准备期总时间
 * @returns {number}
 */
Utils.getAllianceFightPrepareTime = function(){
	return AllianceInit.intInit.allianceFightPrepareTime.value * 1000
}

/**
 * 获取联盟战战争期总时间
 * @returns {number}
 */
Utils.getAllianceFightTotalFightTime = function(){
	return AllianceInit.intInit.allianceFightTotalFightTime.value * 1000
}

/**
 * 获取联盟战单场战斗所需的时间
 * @returns {number}
 */
Utils.getAllianceFightSecondsPerFight = function(){
	return AllianceInit.intInit.allianceFightTimePerFight.value * 1000
}

/**
 * 获取联盟战后联盟获得的保护时间
 * @param allianceDoc
 * @returns {number}
 */
Utils.getAllianceProtectTimeAfterAllianceFight = function(allianceDoc){
	return 10 * 1000
}

/**
 * 获取玩家龙的血量的最大值
 * @param playerDoc
 * @param dragon
 * @returns {number}
 */
Utils.getPlayerDragonHpMax = function(playerDoc, dragon){
	return dragon.vitality * 2
}

/**
 * 联盟协防部队是否已达最大数量
 * @param allianceDoc
 * @param playerDoc
 * @returns {boolean}
 */
Utils.isAlliancePlayerBeHelpedTroopsReachMax = function(allianceDoc, playerDoc){
	var currentCount = LogicUtils.getAlliancePlayerBeHelpedTroopsCount(allianceDoc, playerDoc)
	return currentCount >= AllianceInit.intInit.allianceHelpDefenceTroopsMaxCount.value
}

/**
 * 联盟复仇时间是否过期
 * @param allianceFightReport
 * @returns {boolean}
 */
Utils.isAllianceRevengeTimeExpired = function(allianceFightReport){
	return Date.now() > allianceFightReport.fightTime + (AllianceInit.intInit.allianceRevengeMaxTime.value * 1000)
}

/**
 * 获取龙的力量修正  结果大于0,防御方力量降低返回值的百分比, 结果小于0,攻击方防御降低返回值绝对值的百分比
 * @param attackSoldiersForFight
 * @param defenceSoldiersForFight
 * @returns {number}
 */
Utils.getDragonFightFixedEffect = function(attackSoldiersForFight, defenceSoldiersForFight){
	var getSumPower = function(soldiersForFight){
		var power = 0
		_.each(soldiersForFight, function(soldierForFight){
			power += soldierForFight.power * soldierForFight.totalCount
		})
		return power
	}
	var getEffectPercent = function(multiple){
		var configs = DragonEyrie.fightFix
		for(var i = 0; i < configs.length; i++){
			var config = configs[i]
			if(config.multipleMax > multiple){
				return config.effect
			}
		}
		return configs[configs.length - 1].effect
	}

	var attackSumPower = getSumPower(attackSoldiersForFight)
	var defenceSumPower = getSumPower(defenceSoldiersForFight)
	var effect = attackSumPower >= defenceSumPower ? getEffectPercent(attackSumPower / defenceSumPower) : -getEffectPercent(defenceSumPower / attackSumPower)
	return effect
}

/**
 * 更新龙的属性
 * @param playerDoc
 * @param dragon
 * @param hpDecreased
 * @param expAdd
 */
Utils.updatePlayerDragonProperty = function(playerDoc, dragon, hpDecreased, expAdd){
	dragon.hp -= hpDecreased
	dragon.exp += expAdd
	var currentStarMaxLevel = DragonEyrie.dragonAttribute[dragon.star].levelMax
	var nextLevelExpNeed = DragonEyrie.dragonAttribute[dragon.star].perLevelExp * Math.pow(dragon.level, 2)
	if(dragon.exp >= nextLevelExpNeed){
		if(dragon.level >= currentStarMaxLevel) dragon.exp = nextLevelExpNeed
		else{
			dragon.level += 1
			dragon.exp -= nextLevelExpNeed
			dragon.vitality = this.getPlayerDragonVitality(playerDoc, dragon)
			dragon.strength = this.getPlayerDragonStrength(playerDoc, dragon)
		}
	}
}

/**
 * 获取士兵占用人口
 * @param playerDoc
 * @param soldiers
 */
Utils.getPlayerSoldiersCitizen = function(playerDoc, soldiers){
	var self = this
	var config = null
	var totalCitizen = 0
	_.each(soldiers, function(soldier){
		var name = soldier.name
		var count = soldier.count
		if(count > 0){
			if(self.hasSpecialSoldier(name)){
				config = UnitConfig.special[name]
			}else{
				var fullSoldierName = name + "_" + 1
				config = UnitConfig.normal[fullSoldierName]
			}
			totalCitizen += config.citizen * count
		}
	})
	return totalCitizen
}

/**
 * 获取龙的最大带兵量
 * @param playerDoc
 * @param dragon
 */
Utils.getPlayerDragonMaxCitizen = function(playerDoc, dragon){
	var config = DragonEyrie.dragonAttribute[dragon.star]
	var leaderShip = config.initLeadership + (config.perLevelLeadership * dragon.level)
	return leaderShip * AllianceInit.intInit.citizenPerLeadership.value
}

/**
 * 获取防守部队类型和数量
 * @param playerDoc
 * @returns {Array}
 */
Utils.getPlayerDefenceSoldiers = function(playerDoc){
	var self = this
	var defenceSoldiers = []
	var defenceDragon = LogicUtils.getPlayerDefenceDragon(playerDoc)
	if(!_.isObject(defenceDragon)) return defenceSoldiers

	var getSoldiers = function(soldiers){
		var theSoldiers = []
		_.each(soldiers, function(count, name){
			if(count > 0){
				var theSoldier = {
					name:name,
					count:count
				}
				theSoldiers.push(theSoldier)
			}
		})
		return theSoldiers
	}

	var defenceDragonMaxCitizen = this.getPlayerDragonMaxCitizen(playerDoc, defenceDragon)
	var playerSoldiersTotalCitizen = this.getPlayerSoldiersCitizen(playerDoc, getSoldiers(playerDoc.soldiers))
	var citizenPercent = playerSoldiersTotalCitizen > 0 ? defenceDragonMaxCitizen / playerSoldiersTotalCitizen : 0
	citizenPercent = citizenPercent > 1 ? 1 : citizenPercent
	_.each(playerDoc.soldiers, function(count, name){
		if(count > 0){
			var config = null
			if(self.hasSpecialSoldier(name)){
				config = UnitConfig.special[name]
			}else{
				var fullSoldierName = name + "_" + 1
				config = UnitConfig.normal[fullSoldierName]
			}
			var totalCitizen = config.citizen * count
			var defenceSoldier = {
				name:name,
				count:Math.floor(totalCitizen * citizenPercent / config.citizen)
			}
			defenceSoldiers.push(defenceSoldier)
		}
	})
	return defenceSoldiers
}

/**
 * 获取玩家部队负重
 * @param playerDoc
 * @param soldiers
 * @returns {number}
 */
Utils.getPlayerSoldiersTotalLoad = function(playerDoc, soldiers){
	var self = this
	var totalLoad = 0
	var config = null
	_.each(soldiers, function(soldier){
		if(self.hasSpecialSoldier(soldier.name)){
			config = UnitConfig.special[soldier.name]
		}else{
			var soldierFullName = soldier.name + "_" + 1
			config = UnitConfig.normal[soldierFullName]
		}
		totalLoad += config.load * soldier.count
	})
	return totalLoad
}

/**
 * 获取玩家对某资源的采集熟练度等级
 * @param playerDoc
 * @param resourceType
 * @returns {*}
 */
Utils.getPlayerCollectLevel = function(playerDoc, resourceType){
	var collectExp = playerDoc.allianceInfo[resourceType + "Exp"]
	var collectExpConfig = PlayerInitData.collectLevel
	for(var i = collectExpConfig.length - 1; i >= 1; i--){
		var expFrom = collectExpConfig[i].expFrom
		if(collectExp >= expFrom) return i
	}
	return 1
}

/**
 * 获取采集资源需要消耗的时间
 * @param playerDoc
 * @param soldierLoadTotal
 * @param allianceVillage
 * @returns {*}
 */
Utils.getPlayerCollectResourceInfo = function(playerDoc, soldierLoadTotal, allianceVillage){
	var villageResourceMax = this.getAllianceVillageResourceMax(allianceVillage.type, allianceVillage.level)
	var villageResourceCurrent = allianceVillage.resource
	var collectTotal = soldierLoadTotal > villageResourceCurrent ? villageResourceCurrent : soldierLoadTotal
	var resourceType = allianceVillage.type.slice(0, -7)
	var playerCollectLevel = this.getPlayerCollectLevel(playerDoc, resourceType)
	var collectPerHour = PlayerInitData.collectLevel[playerCollectLevel].collectPercentPerHour * villageResourceMax
	var totalHour = collectTotal / collectPerHour
	return {collectTime:Math.ceil(totalHour * 60 * 60 * 1000), collectTotal:collectTotal}
}

/**
 * 获取联盟村落最大产量
 * @param villageType
 * @param villageLevel
 * @returns {production|*}
 */
Utils.getAllianceVillageResourceMax = function(villageType, villageLevel){
	return AllianceVillageConfig[villageType][villageLevel].production
}

/**
 * 龙经验获取数量
 * @param kill
 * @returns {number}
 */
Utils.getDragonExpAdd = function(kill){
	return Math.floor(kill * AllianceInit.floatInit.dragonExpByKilledCitizen.value)
}

/**
 * 获取采集的资源增值的经验
 * @param name
 * @param count
 * @returns {number}
 */
Utils.getCollectResourceExpAdd = function(name, count){
	name = name.charAt(0).toUpperCase() + name.slice(1)
	var resourceCountPerExp = AllianceInit.intInit["collected" + name +"CountPerExp"].value
	var exp = Math.floor(count / resourceCountPerExp)
	return exp
}

/**
 * 创建龙孵化事件
 * @param playerDoc
 * @param dragonType
 * @returns {{id: *, dragonType: *, finishTime: number}}
 */
Utils.createPlayerHatchDragonEvent = function(playerDoc, dragonType){
	var needTime = AllianceInit.floatInit.playerHatchDragonNeedHours.value * 60 * 60 * 1000
	var event = {
		id:ShortId.generate(),
		dragonType:dragonType,
		startTime:Date.now(),
		finishTime:Date.now() + needTime
	}
	return event
}