"use strict"

/**
 * Created by modun on 14-10-24.
 */

var _ = require("underscore")
var ShortId = require("shortid")

var Consts = require("../consts/consts")
var GameDatas = require("../datas/GameDatas")
var DataUtils = require("./dataUtils")
var AllianceInit = GameDatas.AllianceInitData
var AllianceBuildingConfig = GameDatas.AllianceBuilding
var AllianceVillageConfig = GameDatas.AllianceVillage

var Utils = module.exports

var MapSize = {
	width:21,
	height:21
}

/**
 * 创建联盟时,生成联盟地图
 * @returns {Array}
 */
Utils.create = function(){
	var self = this
	var map = []
	var mapObjects = []
	this.initMap(map)
	this.markMap(map, mapObjects, {x:10, y:7, width:3, height:3}, "building")
	this.markMap(map, mapObjects, {x:7, y:10, width:3, height:3}, "building")
	this.markMap(map, mapObjects, {x:10, y:10, width:3, height:3}, "building")
	this.markMap(map, mapObjects, {x:13, y:10, width:3, height:3}, "building")
	this.markMap(map, mapObjects, {x:10, y:13, width:3, height:3}, "building")

	var orderHallConfig = AllianceBuildingConfig.orderHall[1]
	//生成装饰物
	_.each(AllianceInit.decorateCount, function(countConfig, key){
		var config = AllianceInit.buildingType[key]
		var width = config.width
		var height = config.height
		for(var i = 0; i < countConfig.count; i++){
			var rect = self.getRect(map, width, height)
			if(_.isObject(rect)){
				self.markMap(map, mapObjects, {x:rect.x, y:rect.y, width:rect.width, height:rect.height}, key)
			}
		}
	})
	//生成村落
	var villageTypeConfigs = DataUtils.getAllianceVillageTypeConfigs()
	_.each(villageTypeConfigs, function(config){
		var villageWidth = config.width
		var villageHeight = config.height
		var villageCount = orderHallConfig[config.type + "Count"]
		for(var i = 0; i < villageCount; i++){
			var rect = self.getRect(map, villageWidth, villageHeight)
			self.markMap(map, mapObjects, {x:rect.x, y:rect.y, width:rect.width, height:rect.height}, config.type)
		}
	})
	return mapObjects
}

/**
 * 初始化地图
 * @param map
 */
Utils.initMap = function(map){
	for(var i = 0; i < MapSize.width; i++){
		map[i] = []
		for(var j = 0; j < MapSize.height; j++){
			map[i][j] = false
		}
	}
}

/**
 * 打印地图
 * @param map
 */
Utils.outputMap = function(map){
	for(var i = 0; i < MapSize.width; i++){
		var str = ""
		for(var j = 0; j < MapSize.height; j++){
			if(!!map[j][i]){
				str += "* "
			}else{
				str += ". "
			}
		}
		console.log(str)
	}
}

/**
 * 标记已使用的地图
 * @param map
 * @param mapObjects
 * @param rect
 * @param buildingType
 */
Utils.markMap = function(map, mapObjects, rect, buildingType){
	for(var i = rect.x; i < rect.x + rect.width; i++){
		for(var j = rect.y; j < rect.y + rect.height; j++){
			map[i][j] = true
		}
	}
	var object = {
		type:buildingType,
		location:{
			x:rect.x,
			y:rect.y
		}
	}
	mapObjects.push(object)
}

/**
 * 获取可用的地图点位
 * @param map
 * @returns {Array}
 */
Utils.getFreePoints = function(map){
	var points = []
	for(var i = 0; i < MapSize.width; i++){
		for(var j = 0; j < MapSize.height; j++){
			if(!map[i][j]){
				points.push({x:i, y:j})
			}
		}
	}
	return points
}

/**
 * 根据width,height获取地图某个可用点位
 * @param map
 * @param width
 * @param height
 * @returns {{x: *, y: *, width: *, height: *}}
 */
Utils.getRect = function(map, width, height){
	var freePoints = this.getFreePoints(map)
	while(freePoints.length > 0){
		var location = 0
		if(freePoints.length > 1){
			location = Math.round(Math.random() * 1000000000000 % (freePoints.length - 1))
		}
		var point = freePoints[location]
		if(point.x + width > MapSize.width || point.y + height > MapSize.height){
			freePoints.splice(location, 1)
			continue
		}
		var hasFound = true
		for(var i = point.x; i < point.x + width; i++){
			for(var j = point.y; j < point.y + height; j++){
				if(!!map[i][j]){
					freePoints.splice(location, 1)
					hasFound = false
					break
				}
			}
			if(!hasFound) break
		}
		if(hasFound){
			return {x:point.x, y:point.y, width:width, height:height}
		}
	}
}

/**
 * 生成地图结构
 * @param mapObjects
 * @returns {Array}
 */
Utils.buildMap = function(mapObjects){
	var map = []
	this.initMap(map)
	_.each(mapObjects, function(mapObject){
		var config = AllianceInit.buildingType[mapObject.type]
		var rect = {x:mapObject.location.x, y:mapObject.location.y, width:config.width, height:config.height}
		for(var i = rect.x; i < rect.x + rect.width; i++){
			for(var j = rect.y; j < rect.y + rect.height; j++){
				map[i][j] = true
			}
		}
	})
	return map
}