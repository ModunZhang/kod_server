"use strict"

/**
 * Created by modun on 14-8-7.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Events = require("../consts/events")
var Utils = require("../utils/utils")

var PushService = function(app){
	this.app = app
	this.channelService = this.app.get("channelService")
	this.serverId = this.app.getServerId()
}

module.exports = PushService
var pro = PushService.prototype

/**
 * 推送消息给单个玩家
 * @param playerData
 * @param eventName
 * @param data
 */
pro.pushToPlayer = function(playerData, eventName, data){
	this.channelService.pushMessageByUids(eventName, data, [
		{uid:playerData._id, sid:playerData.frontServerId}
	])
}

/**
 * 推送玩家数据给玩家
 * @param playerData
 */
pro.onPlayerDataChanged = function(playerData){
	this.pushToPlayer(playerData, Events.player.onPlayerDataChanged, Utils.filter(playerData))
}

/**
 * 玩家登陆成功时,推送数据给玩家
 * @param playerData
 */
pro.onPlayerLoginSuccess = function(playerData){
	playerData.serverTime = Date.now()
	this.pushToPlayer(playerData, Events.player.onPlayerLoginSuccess, Utils.filter(playerData))
}

/**
 * 建筑升级成功事件推送
 * @param playerData
 * @param location
 */
pro.onBuildingLevelUp = function(playerData, location){
	var building = playerData.buildings["location_" + location]
	var data = {
		buildingType:building.type,
		level:building.level
	}
	this.pushToPlayer(playerData, Events.player.onBuildingLevelUp, data)
}

/**
 * 小屋升级成功事件推送
 * @param playerData
 * @param buildingLocation
 * @param houseLocation
 */
pro.onHouseLevelUp = function(playerData, buildingLocation, houseLocation){
	var building = playerData.buildings["location_" + buildingLocation]
	var house = null
	_.each(building.houses, function(v){
		if(_.isEqual(houseLocation, v.location)){
			house = v
		}
	})
	var data = {
		buildingType:building.type,
		houseType:house.type,
		level:house.level
	}
	this.pushToPlayer(playerData, Events.player.onHouseLevelUp, data)
}

/**
 * 箭塔升级成功事件推送
 * @param playerData
 * @param location
 */
pro.onTowerLevelUp = function(playerData, location){
	var tower = playerData.towers["location_" + location]
	var data = {
		level:tower.level
	}
	this.pushToPlayer(playerData, Events.player.onTowerLevelUp, data)
}

/**
 * 城墙成绩成功事件推送
 * @param playerData
 */
pro.onWallLevelUp = function(playerData){
	var wall = playerData.wall
	var data = {
		level:wall.level
	}
	this.pushToPlayer(playerData, Events.player.onWallLevelUp, data)
}