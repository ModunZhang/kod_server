"use strict"

/**
 * Created by modun on 14-8-7.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")

var PushService = function(app){
	this.app = app
	this.channelService = app.get("channelService")
	this.globalChannelService = Promise.promisifyAll(app.get("globalChannelService"))
	this.serverId = app.getServerId()
	this.serverType = app.getServerType()
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
		{uid:playerData._id, sid:playerData.logicServerId}
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

/**
 * 材料制作完成事件推送
 * @param playerData
 * @param event
 */
pro.onMakeMaterialFinished = function(playerData, event){
	var data = {
		category:event.category
	}
	this.pushToPlayer(playerData, Events.player.onMakeMaterialFinished, data)
}

/**
 * 获取由工具作坊制作的材料成功
 * @param playerData
 * @param event
 */
pro.onGetMaterialSuccess = function(playerData, event){
	var data = {
		category:event.category
	}
	this.pushToPlayer(playerData, Events.player.onGetMaterialSuccess, data)
}

/**
 * 士兵招募成功推送
 * @param playerData
 * @param soldierName
 * @param count
 */
pro.onRecruitSoldierSuccess = function(playerData, soldierName, count){
	var data = {
		soldierName:soldierName,
		count:count
	}
	this.pushToPlayer(playerData, Events.player.onRecruitSoldierSuccess, data)
}

/**
 * 龙装备制作完成
 * @param playerData
 * @param equipmentName
 */
pro.onMakeDragonEquipmentSuccess = function(playerData, equipmentName){
	var data = {
		equipmentName:equipmentName
	}
	this.pushToPlayer(playerData, Events.player.onMakeDragonEquipmentSuccess, data)
}

/**
 * 治疗士兵成功通知
 * @param playerData
 * @param soldiers
 */
pro.onTreatSoldierSuccess = function(playerData, soldiers){
	var data = {
		soldiers:soldiers
	}
	this.pushToPlayer(playerData, Events.player.onTreatSoldierSuccess, data)
}

/**
 * 收税完成通知
 * @param playerData
 * @param coinCount
 */
pro.onImposeSuccess = function(playerData, coinCount){
	var data = {
		coinCount:coinCount
	}
	this.pushToPlayer(playerData, Events.player.onImposeSuccess, data)
}

/**
 * 查看玩家个人信息通知
 * @param playerData
 */
pro.onGetPlayerInfoSuccess = function(playerData){
	var data = {
		name:playerData.basicInfo.name,
		power:playerData.basicInfo.power,
		level:playerData.basicInfo.level,
		exp:playerData.basicInfo.exp,
		vip:playerData.basicInfo.vip,
		alliance:playerData.alliance.name,
		title:playerData.alliance.title,
		titleName:playerData.alliance.titleName,
		lastLoginTime:playerData.countInfo.lastLoginTime
	}
	this.pushToPlayer(playerData, Events.player.onGetPlayerInfoSuccess, data)
}

/**
 * 推送联盟数据给玩家
 * @param allianceData
 */
pro.onAllianceDataChanged = function(allianceData){
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + allianceData._id
	this.globalChannelService.pushMessage(this.serverType, eventName, allianceData, channelName)
}