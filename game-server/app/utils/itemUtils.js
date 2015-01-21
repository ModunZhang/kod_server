"use strict"

/**
 * Created by modun on 15/1/17.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var Consts = require("../consts/consts")
var LogicUtils = require("./logicUtils")
var DataUtils = require("./dataUtils")
var GameDatas = require("../datas/GameDatas")
var Items = GameDatas.Items
var Buildings = GameDatas.Buildings
var AllianceInitData = GameDatas.AllianceInitData
var PlayerInitData = GameDatas.PlayerInitData

var Utils = module.exports

/**
 * 建筑移动
 * @param playerDoc
 * @param playerData
 * @param fromBuildingLocation
 * @param fromHouseLocation
 * @param toBuildingLocation
 * @param toHouseLocation
 * @returns {*}
 */
var MovingConstruction = function(playerDoc, playerData, fromBuildingLocation, fromHouseLocation, toBuildingLocation, toHouseLocation){
	var fromBuilding = playerDoc.buildings["location_" + fromBuildingLocation]
	var house = _.find(fromBuilding.houses, function(house){
		return house.location == fromHouseLocation
	})
	if(!_.isObject(house)) return Promise.reject(new Error("小屋或装饰物不存在"))
	var toBuilding = playerDoc.buildings["location_" + toBuildingLocation]
	if(toBuilding.level < 1) return Promise.reject(new Error("目标建筑未建造"))
	if(!Buildings.buildings[toBuildingLocation].hasHouse) return Promise.reject(new Error("目标建筑周围不允许建造小屋或装饰物"))
	var toHouse = _.find(toBuilding.houses, function(house){
		return house.location == toHouseLocation
	})
	if(_.isObject(toHouse)) return Promise.reject(new Error("目的地非空地"))
	if(!LogicUtils.isHouseCanCreateAtLocation(playerDoc, toBuildingLocation, house.type, toHouseLocation)) return Promise.reject(new Error("移动小屋时,小屋坑位不合法"))

	LogicUtils.removeItemInArray(fromBuilding.houses, house)
	playerData.buildings = {}
	playerData.buildings["location_" + fromBuildingLocation] = playerDoc.buildings["location_" + fromBuildingLocation]

	house.location = toHouseLocation
	toBuilding.houses.push(house)
	playerData.buildings["location_" + toBuildingLocation] = playerDoc.buildings["location_" + toBuildingLocation]

	return Promise.resolve()
}

/**
 * 使用火炬摧毁一个小屋或装饰物
 * @param playerDoc
 * @param playerData
 * @param buildingLocation
 * @param houseLocation
 * @returns {*}
 */
var Torch = function(playerDoc, playerData, buildingLocation, houseLocation){
	var building = playerDoc.buildings["location_" + buildingLocation]
	var house = _.find(building.houses, function(house){
		return _.isEqual(house.location, houseLocation)
	})
	if(!_.isObject(house)) return Promise.reject(new Error("小屋或装饰物不存在"))

	LogicUtils.removeItemInArray(building.houses, house)
	playerData.buildings = {}
	playerData.buildings["location_" + buildingLocation] = playerDoc.buildings["location_" + buildingLocation]

	return Promise.resolve()
}

/**
 * 修改玩家名称
 * @param playerDoc
 * @param playerData
 * @param newPlayerName
 * @param playerDao
 * @returns {*}
 */
var ChangePlayerName = function(playerDoc, playerData, newPlayerName, playerDao){
	if(_.isEqual(newPlayerName, playerDoc.basicInfo.name)) return Promise.reject(new Error("不能修改为相同的名称"))
	return playerDao.findByIndexAsync("basicInfo.name", newPlayerName).then(function(doc){
		if(_.isObject(doc)){
			return playerDao.removeLockByIdAsync(doc._id).then(function(){
				return Promise.reject(new Error("名称已被其他玩家占用"))
			})
		}else{
			playerDoc.basicInfo.name = newPlayerName
			playerData.basicInfo = playerDoc.basicInfo
			return Promise.resolve()
		}
	})
}

/**
 * 修改城市名称
 * @param playerDoc
 * @param playerData
 * @param newCityName
 * @returns {*}
 */
var ChangeCityName = function(playerDoc, playerData, newCityName){
	if(_.isEqual(newCityName, playerDoc.basicInfo.cityName)) return Promise.reject(new Error("不能修改为相同的城市名称"))
	playerDoc.basicInfo.cityName = newCityName
	playerData.basicInfo = playerDoc.basicInfo
	return Promise.resolve()
}


/**
 * 撤销行军事件
 * @param playerDoc
 * @param playerData
 * @param eventType
 * @param eventId
 * @param allianceDao
 * @param updateFuncs
 * @param eventFuncs
 * @param pushFuncs
 * @param pushService
 * @param timeEventService
 * @returns {*}
 */
var RetreatTroop = function(playerDoc, playerData, eventType, eventId, allianceDao, updateFuncs, eventFuncs, pushFuncs, pushService, timeEventService){
	if(!_.isObject(playerDoc.alliance)) return Promise.reject(new Error("玩家未加入联盟"))
	var allianceDoc = null
	return allianceDao.findByIdAsync(playerDoc.alliance.id).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		var allianceData = {}
		var marchEvent = _.find(allianceDoc[eventType], function(marchEvent){
			return _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(new Error("行军事件不存在"))

		if(_.isEqual(eventType, "strikeMarchEvents")){
			LogicUtils.removeItemInArray(allianceDoc.strikeMarchEvents, marchEvent)
			allianceData.__strikeMarchEvents = [{
				type:Consts.DataChangedType.Remove,
				data:marchEvent
			}]
			eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, marchEvent.id])

			DataUtils.refreshPlayerDragonsHp(playerDoc, marchEvent.attackPlayerData.dragon.type)
			playerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
			playerData.dragons = {}
			playerData.dragons[marchEvent.attackPlayerData.dragon.type] = playerDoc.dragons[marchEvent.attackPlayerData.dragon.type]
		}else{
			LogicUtils.removeItemInArray(allianceDoc.attackMarchEvents, marchEvent)
			allianceData.__attackMarchEvents = [{
				type:Consts.DataChangedType.Remove,
				data:marchEvent
			}]
			eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, marchEvent.id])

			DataUtils.refreshPlayerDragonsHp(playerDoc, marchEvent.attackPlayerData.dragon.type)
			playerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
			playerData.dragons = {}
			playerData.dragons[marchEvent.attackPlayerData.dragon.type] = playerDoc.dragons[marchEvent.attackPlayerData.dragon.type]
			playerData.soldiers = {}
			_.each(marchEvent.attackPlayerData.soldiers, function(soldier){
				playerDoc.soldiers[soldier.name] += soldier.count
				playerData.soldiers[soldier.name] = playerDoc.soldiers[soldier.name]
			})
		}

		updateFuncs.push([allianceDao, allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([pushService, pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, pushService)

		return Promise.resolve()
	}).catch(function(e){
		if(_.isObject(allianceDoc)){
			return allianceDao.removeLockByIdAsync(allianceDoc._id).then(function(){
				return Promise.reject(e)
			})
		}
		return Promise.reject(e)
	})
}

/**
 * 移城
 * @param playerDoc
 * @param playerData
 * @param locationX
 * @param locationY
 * @param allianceDao
 * @param updateFuncs
 * @param pushFuncs
 * @param pushService
 */
var MoveTheCity = function(playerDoc, playerData, locationX, locationY, allianceDao, updateFuncs, pushFuncs, pushService){
	if(!_.isObject(playerDoc.alliance)) return Promise.reject(new Error("玩家未加入联盟"))
	var allianceDoc = null
	return allianceDao.findByIdAsync(playerDoc.alliance.id).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		var allianceData = {}
		if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)) return Promise.reject(new Error("联盟正处于战争期"))
		var marchEvents = []
		marchEvents.concat(allianceDoc.attackMarchEvents)
		marchEvents.concat(allianceDoc.attackMarchReturnEvents)
		marchEvents.concat(allianceDoc.strikeMarchEvents)
		marchEvents.concat(allianceDoc.strikeMarchReturnEvents)
		var hasMarchEvent = _.some(marchEvents, function(marchEvent){
			return _.isEqual(marchEvent.attackPlayerData.id, playerDoc._id)
		})
		if(hasMarchEvent) return Promise.reject(new Error("玩家有部队正在行军中"))
		var mapObject = LogicUtils.findAllianceMapObjectByLocation(allianceDoc, {x:locationX, y:locationY})
		if(_.isObject(mapObject)) return Promise.reject(new Error("目标坐标不是空地"))

		var memberDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
		mapObject = LogicUtils.findAllianceMapObjectByLocation(allianceDoc, memberDoc.location)
		memberDoc.location = {
			x:locationX,
			y:locationY
		}
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:memberDoc
		}]
		mapObject.location = memberDoc.location
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Edit,
			data:mapObject
		}]

		updateFuncs.push([allianceDao, allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([pushService, pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, pushService)

		return Promise.resolve()
	}).catch(function(e){
		if(_.isObject(allianceDoc)){
			return allianceDao.removeLockByIdAsync(allianceDoc._id).then(function(){
				return Promise.reject(e)
			})
		}
		return Promise.reject(e)
	})
}

/**
 * 为指定的龙增加经验
 * @param playerDoc
 * @param playerData
 * @param dragonType
 * @param itemConfig
 * @returns {*}
 */
var DragonExp = function(playerDoc, playerData, dragonType, itemConfig){
	var dragon = playerDoc.dragons[dragonType]
	if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
	DataUtils.updatePlayerDragonProperty(playerDoc, dragon, 0, parseInt(itemConfig.effect))
	playerData.dragons = {}
	playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
	return Promise.resolve()
}

/**
 * 为指定的龙增加Hp
 * @param playerDoc
 * @param playerData
 * @param dragonType
 * @param itemConfig
 * @returns {*}
 */
var DragonHp = function(playerDoc, playerData, dragonType, itemConfig){
	var dragon = playerDoc.dragons[dragonType]
	if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
	DataUtils.refreshPlayerDragonsHp(playerDoc, dragonType)
	var dragonHpMax = DataUtils.getPlayerDragonHpMax(playerDoc, dragon)
	dragon.hp += parseInt(itemConfig.effect)
	dragon.hp = dragon.hp <= dragonHpMax ? dragon.hp : dragonHpMax
	playerData.dragons = {}
	playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
	return Promise.resolve()
}

/**
 * 增加英雄之血
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @returns {*}
 */
var HeroBlood = function(playerDoc, playerData, itemConfig){
	playerDoc.resources.blood += parseInt(itemConfig.effect)
	playerData.resources = playerDoc.resources
	return Promise.resolve()
}

/**
 * 增加精力
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @returns {*}
 */
var Stamina = function(playerDoc, playerData, itemConfig){
	LogicUtils.refreshPlayerResources(playerDoc)
	playerDoc.resources.stamina += parseInt(itemConfig.effect)
	LogicUtils.refreshPlayerResources(playerDoc)
	playerData.resources = playerDoc.resources
	return Promise.resolve()
}

/**
 * 恢复城墙血量
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @returns {*}
 */
var RestoreWallHp = function(playerDoc, playerData, itemConfig){
	LogicUtils.refreshPlayerResources(playerDoc)
	playerDoc.resources.wallHp += parseInt(itemConfig.effect)
	LogicUtils.refreshPlayerResources(playerDoc)
	playerData.resources = playerDoc.resources
	return Promise.resolve()
}

/**
 * 开巨龙宝箱
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @returns {*}
 */
var DragonChest = function(playerDoc, playerData, itemConfig){
	var ParseConfig = function(config){
		var objects = []
		var configArray_1 = config.split(",")
		_.each(configArray_1, function(config_1){
			var configArray_2 = config_1.split(":")
			var object = {
				type:configArray_2[0],
				name:configArray_2[1],
				count:parseInt(configArray_2[2]),
				weight:parseInt(configArray_2[3])
			}
			objects.push(object)
		})
		return objects
	}
	var SortFunc = function(objects){
		var totalWeight = 0
		_.each(objects, function(object){
			totalWeight += object.weight + 1
		})

		_.each(objects, function(object){
			var weight = object.weight + 1 + (Math.random() * totalWeight << 0)
			object.weight = weight
		})

		return _.sortBy(objects, function(object){
			return -object.weight
		})
	}

	var items = ParseConfig(itemConfig.effect)
	items = SortFunc(items)
	var selectCount = PlayerInitData.intInit.dragonChestSelectCountPerItem.value
	for(var i = 0; i < selectCount; i ++){
		var item = items[i]
		playerDoc[item.type][item.name] += item.count
		if(!_.isObject(playerData[item.type])) playerData[item.type] = {}
		playerData[item.type][item.name] = playerDoc[item.type][item.name]
	}

	return Promise.resolve()
}

/**
 * 开宝箱,送道具
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @returns {*}
 * @constructor
 */
var Chest = function(playerDoc, playerData, itemConfig){
	var ParseConfig = function(config){
		var objects = []
		var configArray_1 = config.split(",")
		_.each(configArray_1, function(config_1){
			var configArray_2 = config_1.split(":")
			var object = {
				type:configArray_2[0],
				name:configArray_2[1],
				count:parseInt(configArray_2[2]),
				weight:parseInt(configArray_2[3])
			}
			objects.push(object)
		})
		return objects
	}
	var SortFunc = function(objects){
		var totalWeight = 0
		_.each(objects, function(object){
			totalWeight += object.weight + 1
		})

		_.each(objects, function(object){
			var weight = object.weight + 1 + (Math.random() * totalWeight << 0)
			object.weight = weight
		})

		return _.sortBy(objects, function(object){
			return -object.weight
		})
	}

	var items = ParseConfig(itemConfig.effect)
	items = SortFunc(items)
	var selectCount = PlayerInitData.intInit.chestSelectCountPerItem.value
	for(var i = 0; i < selectCount; i ++){
		var item = items[i]
		var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
		if(resp.newlyCreated){
			playerData.__items.push({
				type:Consts.DataChangedType.Add,
				data:resp.item
			})
		}else{
			playerData.__items.push({
				type:Consts.DataChangedType.Edit,
				data:resp.item
			})
		}
	}

	return Promise.resolve()
}

/**
 * Vip激活
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @param eventFuncs
 * @param timeEventService
 * @return {*}
 */
var VipActive = function(playerDoc, playerData, itemConfig, eventFuncs, timeEventService){
	var event = playerDoc.vipEvents[0]
	var time = parseInt(itemConfig.effect) * 60 * 1000
	if(_.isObject(event)){
		event.finishTime += time
		playerData.__vipEvents = [{
			type:Consts.DataChangedType.Edit,
			data:event
		}]
		eventFuncs.push([timeEventService, timeEventService.updatePlayerTimeEventAsync, playerDoc, event.id, event.finishTime])
	}else{
		event = {
			id:ShortId.generate(),
			startTime:Date.now(),
			finishTime:Date.now() + time
		}
		playerDoc.vipEvents.push(event)
		playerData.__vipEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([timeEventService, timeEventService.addPlayerTimeEventAsync, playerDoc, "vipEvents", event.id, event.finishTime])
	}

	return Promise.resolve()
}

/**
 * 增加Vip经验值
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @returns {*}
 */
var VipPoint = function(playerDoc, playerData, itemConfig){
	var vipPoint = parseInt(itemConfig.effect)
	playerDoc.basicInfo.vipExp += vipPoint
	playerData.basicInfo = playerDoc.basicInfo

	return Promise.resolve()
}

/**
 * 使用Buff道具
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @param eventFuncs
 * @param timeEventService
 * @returns {*}
 */
var Buff = function(playerDoc, playerData, itemConfig, eventFuncs, timeEventService){
	var time = itemConfig.effect * 60 * 60 * 1000
	var event = _.find(playerDoc.itemEvents, function(itemEvent){
		return _.isEqual(itemEvent.type, itemConfig.type)
	})
	if(_.isObject(event)){
		event.finishTime += time
		playerData.__itemEvents = [{
			type:Consts.DataChangedType.Edit,
			data:event
		}]
		eventFuncs.push([timeEventService, timeEventService.updatePlayerTimeEventAsync, playerDoc, event.id, event.finishTime])
	}else{
		event = {
			id:ShortId.generate(),
			type:itemConfig.type,
			startTime:Date.now(),
			finishTime:Date.now() + time
		}
		playerDoc.itemEvents.push(event)
		playerData.__itemEvents = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		eventFuncs.push([timeEventService, timeEventService.addPlayerTimeEventAsync, playerDoc, "itemEvents", event.id, event.finishTime])
	}

	return Promise.resolve()
}

/**
 * 使用资源道具
 * @param playerDoc
 * @param playerData
 * @param itemConfig
 * @param resourceName
 * @return {*}
 */
var Resource = function(playerDoc, playerData, itemConfig, resourceName){
	var count = Math.round(itemConfig.effect * 1000)
	LogicUtils.refreshPlayerResources(playerDoc)
	playerDoc.resources[resourceName] += count
	LogicUtils.refreshPlayerResources(playerDoc)
	playerData.resources = playerDoc.resources

	return Promise.resolve()
}

/**
 * 事件加速
 * @param playerDoc
 * @param playerData
 * @param eventType
 * @param eventId
 * @param speedupTime
 * @param eventFuncs
 * @param timeEventService
 * @returns {*}
 */
var Speedup = function(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService){
	var event = _.find(playerDoc[eventType], function(event){
		return _.isEqual(event.id, eventId)
	})
	if(!_.isObject(event)) return Promise.reject(new Error("所要加速的事件不存在"))
	event.startTime -= speedupTime
	event.finishTime -= speedupTime
	if(event.finishTime > Date.now()){
		playerData[eventType] = [{
			type:Consts.DataChangedType.Edit,
			data:event
		}]
	}
	eventFuncs.push([timeEventService, timeEventService.updatePlayerTimeEventAsync, playerDoc, event.id, event.finishTime])
	return Promise.resolve()
}

/**
 * 道具和方法的映射
 */
var ItemNameFunctionMap = {
	movingConstruction:function(itemData, playerDoc, playerData){
		var fromBuildingLocation = itemData.fromBuildingLocation
		var fromHouseLocation = itemData.fromHouseLocation
		var toBuildingLocation = itemData.toBuildingLocation
		var toHouseLocation = itemData.toHouseLocation
		return MovingConstruction(playerDoc, playerData, fromBuildingLocation, fromHouseLocation, toBuildingLocation, toHouseLocation)
	},
	torch:function(itemData, playerDoc, playerData){
		var buildingLocation = itemData.buildingLocation
		var houseLocation = itemData.houseLocation
		return Torch(playerDoc, playerData, buildingLocation, houseLocation)
	},
	changePlayerName:function(itemData, playerDoc, playerData, playerDao){
		var playerName = itemData.playerName
		return ChangePlayerName(playerDoc, playerData, playerName, playerDao)
	},
	changeCityName:function(itemData, playerDoc, playerData){
		var cityName = itemData.cityName
		return ChangeCityName(playerDoc, playerData, cityName)
	},
	retreatTroop:function(itemData, playerDoc, playerData, allianceDao, updateFuncs, eventFuncs, pushFuncs, pushService, timeEventService){
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return RetreatTroop(playerDoc, playerData, eventType, eventId, allianceDao, updateFuncs, eventFuncs, pushFuncs, pushService, timeEventService)
	},
	moveTheCity:function(itemData, playerDoc, playerData, allianceDao, updateFuncs, pushFuncs, pushService){
		var locationX = itemData.locationX
		var locationY = itemData.locationY
		return MoveTheCity(playerDoc, playerData, locationX, locationY, allianceDao, updateFuncs, pushFuncs, pushService)
	},
	dragonExp_1:function(itemData, playerDoc, playerData){
		var dragonType = itemData.dragonType
		var itemConfig = Items.special.dragonExp_1
		return DragonExp(playerDoc, playerData, dragonType, itemConfig)
	},
	dragonExp_2:function(itemData, playerDoc, playerData){
		var dragonType = itemData.dragonType
		var itemConfig = Items.special.dragonExp_2
		return DragonExp(playerDoc, playerData, dragonType, itemConfig)
	},
	dragonExp_3:function(itemData, playerDoc, playerData){
		var dragonType = itemData.dragonType
		var itemConfig = Items.special.dragonExp_3
		return DragonExp(playerDoc, playerData, dragonType, itemConfig)
	},
	dragonHp_1:function(itemData, playerDoc, playerData){
		var dragonType = itemData.dragonType
		var itemConfig = Items.special.dragonHp_1
		return DragonExp(playerDoc, playerData, dragonType, itemConfig)
	},
	dragonHp_2:function(itemData, playerDoc, playerData){
		var dragonType = itemData.dragonType
		var itemConfig = Items.special.dragonHp_2
		return DragonHp(playerDoc, playerData, dragonType, itemConfig)
	},
	dragonHp_3:function(itemData, playerDoc, playerData){
		var dragonType = itemData.dragonType
		var itemConfig = Items.special.dragonHp_3
		return DragonHp(playerDoc, playerData, dragonType, itemConfig)
	},
	heroBlood_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.heroBlood_1
		return HeroBlood(playerDoc, playerData, itemConfig)
	},
	heroBlood_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.heroBlood_2
		return HeroBlood(playerDoc, playerData, itemConfig)
	},
	heroBlood_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.heroBlood_3
		return HeroBlood(playerDoc, playerData, itemConfig)
	},
	stamina_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.stamina_1
		return Stamina(playerDoc, playerData, itemConfig)
	},
	stamina_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.stamina_2
		return Stamina(playerDoc, playerData, itemConfig)
	},
	stamina_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.stamina_3
		return Stamina(playerDoc, playerData, itemConfig)
	},
	restoreWall_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.restoreWall_1
		return RestoreWallHp(playerDoc, playerData, itemConfig)
	},
	restoreWall_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.restoreWall_2
		return RestoreWallHp(playerDoc, playerData, itemConfig)
	},
	restoreWall_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.restoreWall_3
		return RestoreWallHp(playerDoc, playerData, itemConfig)
	},
	dragonChest_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.dragonChest_1
		return DragonChest(playerDoc, playerData, itemConfig)
	},
	dragonChest_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.dragonChest_2
		return DragonChest(playerDoc, playerData, itemConfig)
	},
	dragonChest_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.dragonChest_3
		return DragonChest(playerDoc, playerData, itemConfig)
	},
	chest_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.chest_1
		return Chest(playerDoc, playerData, itemConfig)
	},
	chest_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.chest_2
		return Chest(playerDoc, playerData, itemConfig)
	},
	chest_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.chest_3
		return Chest(playerDoc, playerData, itemConfig)
	},
	chest_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.chest_4
		return Chest(playerDoc, playerData, itemConfig)
	},
	vipActive_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.special.vipActive_1
		return VipActive(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	vipActive_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.special.vipActive_2
		return VipActive(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	vipActive_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.special.vipActive_3
		return VipActive(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	vipActive_4:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.special.vipActive_4
		return VipActive(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	vipActive_5:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.special.vipActive_5
		return VipActive(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	vipPoint_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.vipPoint_1
		return VipPoint(playerDoc, playerData, itemConfig)
	},
	vipPoint_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.vipPoint_2
		return VipPoint(playerDoc, playerData, itemConfig)
	},
	vipPoint_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.vipPoint_3
		return VipPoint(playerDoc, playerData, itemConfig)
	},
	vipPoint_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.special.vipPoint_4
		return VipPoint(playerDoc, playerData, itemConfig)
	},
	masterOfDefender_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.masterOfDefender_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	masterOfDefender_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.masterOfDefender_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	masterOfDefender_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.masterOfDefender_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	quarterMaster_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.quarterMaster_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	quarterMaster_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.quarterMaster_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	quarterMaster_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.quarterMaster_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	fogOfTrick_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.fogOfTrick_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	fogOfTrick_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.fogOfTrick_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	fogOfTrick_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.fogOfTrick_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	woodBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.woodBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	woodBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.woodBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	woodBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.woodBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	stoneBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.stoneBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	stoneBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.stoneBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	stoneBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.stoneBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	ironBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.ironBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	ironBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.ironBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	ironBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.ironBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	foodBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.foodBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	foodBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.foodBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	foodBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.foodBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	taxesBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.taxesBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	taxesBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.taxesBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	taxesBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.taxesBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	citizenBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.citizenBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	citizenBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.citizenBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	citizenBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.citizenBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	dragonExpBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.dragonExpBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	dragonExpBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.dragonExpBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	dragonExpBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.dragonExpBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	troopSizeBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.troopSizeBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	troopSizeBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.troopSizeBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	troopSizeBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.troopSizeBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	dragonHpBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.dragonHpBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	dragonHpBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.dragonHpBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	dragonHpBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.dragonHpBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	marchSpeedBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.marchSpeedBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	marchSpeedBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.marchSpeedBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	marchSpeedBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.marchSpeedBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	unitHpBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.unitHpBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	unitHpBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.unitHpBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	unitHpBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.unitHpBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	infantryAtkBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.infantryAtkBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	infantryAtkBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.infantryAtkBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	infantryAtkBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.infantryAtkBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	archerAtkBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.archerAtkBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	archerAtkBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.archerAtkBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	archerAtkBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.archerAtkBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	cavalryAtkBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.cavalryAtkBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	cavalryAtkBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.cavalryAtkBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	cavalryAtkBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.cavalryAtkBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	siegeAtkBonus_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.siegeAtkBonus_1
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	siegeAtkBonus_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.siegeAtkBonus_2
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	siegeAtkBonus_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.buff.siegeAtkBonus_3
		return Buff(playerDoc, playerData, itemConfig, eventFuncs, timeEventService)
	},
	woodClass_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.woodClass_1
		return Resource(playerDoc, playerData, itemConfig, "wood")
	},
	woodClass_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.woodClass_2
		return Resource(playerDoc, playerData, itemConfig, "wood")
	},
	woodClass_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.woodClass_3
		return Resource(playerDoc, playerData, itemConfig, "wood")
	},
	woodClass_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.woodClass_4
		return Resource(playerDoc, playerData, itemConfig, "wood")
	},
	woodClass_5:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.woodClass_5
		return Resource(playerDoc, playerData, itemConfig, "wood")
	},
	woodClass_6:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.woodClass_6
		return Resource(playerDoc, playerData, itemConfig, "wood")
	},
	woodClass_7:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.woodClass_7
		return Resource(playerDoc, playerData, itemConfig, "wood")
	},
	stoneClass_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.stoneClass_1
		return Resource(playerDoc, playerData, itemConfig, "stone")
	},
	stoneClass_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.stoneClass_2
		return Resource(playerDoc, playerData, itemConfig, "stone")
	},
	stoneClass_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.stoneClass_3
		return Resource(playerDoc, playerData, itemConfig, "stone")
	},
	stoneClass_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.stoneClass_4
		return Resource(playerDoc, playerData, itemConfig, "stone")
	},
	stoneClass_5:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.stoneClass_5
		return Resource(playerDoc, playerData, itemConfig, "stone")
	},
	stoneClass_6:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.stoneClass_6
		return Resource(playerDoc, playerData, itemConfig, "stone")
	},
	stoneClass_7:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.stoneClass_7
		return Resource(playerDoc, playerData, itemConfig, "stone")
	},
	ironClass_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.ironClass_1
		return Resource(playerDoc, playerData, itemConfig, "iron")
	},
	ironClass_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.ironClass_2
		return Resource(playerDoc, playerData, itemConfig, "iron")
	},
	ironClass_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.ironClass_3
		return Resource(playerDoc, playerData, itemConfig, "iron")
	},
	ironClass_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.ironClass_4
		return Resource(playerDoc, playerData, itemConfig, "iron")
	},
	ironClass_5:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.ironClass_5
		return Resource(playerDoc, playerData, itemConfig, "iron")
	},
	ironClass_6:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.ironClass_6
		return Resource(playerDoc, playerData, itemConfig, "iron")
	},
	ironClass_7:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.ironClass_7
		return Resource(playerDoc, playerData, itemConfig, "iron")
	},
	foodClass_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.foodClass_1
		return Resource(playerDoc, playerData, itemConfig, "food")
	},
	foodClass_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.foodClass_2
		return Resource(playerDoc, playerData, itemConfig, "food")
	},
	foodClass_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.foodClass_3
		return Resource(playerDoc, playerData, itemConfig, "food")
	},
	foodClass_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.foodClass_4
		return Resource(playerDoc, playerData, itemConfig, "food")
	},
	foodClass_5:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.foodClass_5
		return Resource(playerDoc, playerData, itemConfig, "food")
	},
	foodClass_6:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.foodClass_6
		return Resource(playerDoc, playerData, itemConfig, "food")
	},
	foodClass_7:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.foodClass_7
		return Resource(playerDoc, playerData, itemConfig, "food")
	},
	coinClass_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.coinClass_1
		return Resource(playerDoc, playerData, itemConfig, "coin")
	},
	coinClass_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.coinClass_2
		return Resource(playerDoc, playerData, itemConfig, "coin")
	},
	coinClass_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.coinClass_3
		return Resource(playerDoc, playerData, itemConfig, "coin")
	},
	coinClass_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.coinClass_4
		return Resource(playerDoc, playerData, itemConfig, "coin")
	},
	coinClass_5:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.coinClass_5
		return Resource(playerDoc, playerData, itemConfig, "coin")
	},
	coinClass_6:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.coinClass_6
		return Resource(playerDoc, playerData, itemConfig, "coin")
	},
	casinoTokenClass_1:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.casinoTokenClass_1
		return Resource(playerDoc, playerData, itemConfig, "casinoToken")
	},
	casinoTokenClass_2:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.casinoTokenClass_2
		return Resource(playerDoc, playerData, itemConfig, "casinoToken")
	},
	casinoTokenClass_3:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.casinoTokenClass_3
		return Resource(playerDoc, playerData, itemConfig, "casinoToken")
	},
	casinoTokenClass_4:function(itemData, playerDoc, playerData){
		var itemConfig = Items.resource.casinoTokenClass_4
		return Resource(playerDoc, playerData, itemConfig, "casinoToken")
	},
	speedup_1:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_1
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	},
	speedup_2:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_2
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	},
	speedup_3:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_3
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	},
	speedup_4:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_4
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	},
	speedup_5:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_5
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	},
	speedup_6:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_6
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	},
	speedup_7:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_7
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	},
	speedup_8:function(itemData, playerDoc, playerData, eventFuncs, timeEventService){
		var itemConfig = Items.speedup.speedup_8
		var speedupTime = Math.round(itemConfig.effect * 60 * 1000)
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		return Speedup(playerDoc, playerData, eventType, eventId, speedupTime, eventFuncs, timeEventService)
	}
}

/**
 * 参数是否合法
 * @param itemName
 * @param params
 * @returns {*}
 */
Utils.isParamsLegal = function(itemName, params){
	var itemData = _.isObject(params[itemName]) ? params[itemName] : null
	if(_.isEqual(itemName, "movingConstruction")){
		if(!_.isObject(itemData)) return false
		var fromBuildingLocation = itemData.fromBuildingLocation
		var fromHouseLocation = itemData.fromHouseLocation
		var toBuildingLocation = itemData.toBuildingLocation
		var toHouseLocation = itemData.toHouseLocation

		if(!_.isNumber(fromBuildingLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 20) return false
		if(!_.isNumber(fromHouseLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 3) return false
		if(!_.isNumber(toBuildingLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 20) return false
		if(!_.isNumber(toHouseLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 3) return false
		return !(fromBuildingLocation == toBuildingLocation && fromHouseLocation == toHouseLocation)
	}
	if(_.isEqual(itemName, "torch")){
		if(!_.isObject(itemData)) return false
		var buildingLocation = itemData.buildingLocation
		var houseLocation = itemData.houseLocation

		if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 20) return false
		return !(!_.isNumber(houseLocation) || houseLocation % 1 !== 0 || houseLocation < 1 || houseLocation > 3)
	}
	if(_.isEqual(itemName, "changePlayerName")){
		if(!_.isObject(itemData)) return false
		var playerName = itemData.playerName
		return !(!_.isString(playerName) || _.isEmpty(playerName))
	}
	if(_.isEqual(itemName, "changeCityName")){
		if(!_.isObject(itemData)) return false
		var cityName = itemData.cityName
		return !(!_.isString(cityName) || _.isEmpty(cityName))
	}
	if(_.isEqual(itemName, "retreatTroop")){
		if(!_.isObject(itemData)) return false
		var eventType = itemData.eventType
		var eventId = itemData.eventId
		if(!_.isString(eventType)) return false
		if(!_.isEqual(eventType, "strikeMarchEvents") && !_.isEqual(eventType, "attackMarchEvents")) return false
		return _.isString(eventId)
	}
	if(_.isEqual(itemName, "moveTheCity")){
		if(!_.isObject(itemData)) return false
		var locationX = itemData.locationX
		var locationY = itemData.locationY
		var locationXMax = AllianceInitData.intInit.allianceRegionMapWidth.value - 1
		var locationYMax = AllianceInitData.intInit.allianceRegionMapHeight.value - 1

		if(!_.isNumber(locationX) || locationX % 1 !== 0 || locationX < 0 || locationX > locationXMax) return false
		return !(!_.isNumber(locationY) || locationY % 1 !== 0 || locationY < 0 || locationY > locationYMax)
	}
	var dragonType = null
	if(_.isEqual(itemName, "dragonExp_1") || _.isEqual(itemName, "dragonExp_2") || _.isEqual(itemName, "dragonExp_3")){
		if(!_.isObject(itemData)) return false
		dragonType = itemData.dragonType
		return DataUtils.isDragonTypeExist(dragonType)
	}
	if(_.isEqual(itemName, "dragonHp_1") || _.isEqual(itemName, "dragonHp_2") || _.isEqual(itemName, "dragonHp_3")){
		if(!_.isObject(itemData)) return false
		dragonType = itemData.dragonType
		return DataUtils.isDragonTypeExist(dragonType)
	}
	if(_.isEqual(itemName, "speedup_1") || _.isEqual(itemName, "speedup_2") || _.isEqual(itemName, "speedup_3")
		|| _.isEqual(itemName, "speedup_4") || _.isEqual(itemName, "speedup_5") || _.isEqual(itemName, "speedup_6")
		|| _.isEqual(itemName, "speedup_7") || _.isEqual(itemName, "speedup_8")
	)
	{
		if(!_.isObject(itemData)) return false
		eventType = itemData.eventType
		eventId = itemData.eventId
		if(!_.contains(_.values(Consts.SpeedUpEventTypes), eventType)) return false
		return _.isString(eventId)
	}
	return true
}

/**
 * 获取道具调用方法名
 * @param itemName
 * @returns {*}
 */
Utils.getItemNameFunction = function(itemName){
	return ItemNameFunctionMap[itemName]
}