"use strict"

/**
 * Created by modun on 15/1/17.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var Consts = require("../consts/consts")
var LogicUtils = require("./logicUtils")
var DataUtils = require("./dataUtils")
var GameDatas = require("../datas/GameDatas")
var Items = GameDatas.Items
var Buildings = GameDatas.Buildings

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
	if(toBuilding.level < 1) return Promise.reject( new Error("目标建筑未建造"))
	if(!Buildings.buildings[toBuildingLocation].hasHouse) return Promise.reject( new Error("目标建筑周围不允许建造小屋或装饰物"))
	var toHouse = _.find(toBuilding.houses, function(house){
		return house.location == toHouseLocation
	})
	if(_.isObject(toHouse)) return Promise.reject( new Error("目的地非空地"))
	if(!LogicUtils.isHouseCanCreateAtLocation(playerDoc, toBuildingLocation, house.type, toHouseLocation)) return Promise.reject( new Error("移动小屋时,小屋坑位不合法"))

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
	if(!_.isObject(house)) return Promise.reject( new Error("小屋或装饰物不存在"))

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
		var newPlayerName = itemData.newPlayerName
		return ChangePlayerName(playerDoc, playerData, newPlayerName, playerDao)
	},
	changeCityName:function(itemData, playerDoc, playerData){
		var newCityName = itemData.newCityName
		return ChangeCityName(playerDoc, playerData, newCityName)
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
		var newPlayerName = itemData.newPlayerName
		return !(!_.isString(newPlayerName) || _.isEmpty(newPlayerName))
	}
	if(_.isEqual(itemName, "changeCityName")){
		if(!_.isObject(itemData)) return false
		var newCityName = itemData.newCityName
		return !(!_.isString(newCityName) || _.isEmpty(newCityName))
	}
	return false
}

/**
 * 获取道具调用方法名
 * @param itemName
 * @returns {*}
 */
Utils.getItemNameFunction = function(itemName){
	return ItemNameFunctionMap[itemName]
}