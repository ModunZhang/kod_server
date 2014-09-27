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
 * @param playerDoc
 * @param eventName
 * @param data
 */
pro.pushToPlayer = function(playerDoc, eventName, data){
	this.channelService.pushMessageByUids(eventName, data, [
		{uid:playerDoc._id, sid:playerDoc.logicServerId}
	])
}

/**
 * 推送玩家数据给玩家
 * @param playerDoc
 */
pro.onPlayerDataChanged = function(playerDoc){
	this.pushToPlayer(playerDoc, Events.player.onPlayerDataChanged, Utils.filter(playerDoc))
}

/**
 * 玩家登陆成功时,推送数据给玩家
 * @param playerDoc
 */
pro.onPlayerLoginSuccess = function(playerDoc){
	playerDoc.serverTime = Date.now()
	this.pushToPlayer(playerDoc, Events.player.onPlayerLoginSuccess, Utils.filter(playerDoc))
}

/**
 * 建筑升级成功事件推送
 * @param playerDoc
 * @param location
 */
pro.onBuildingLevelUp = function(playerDoc, location){
	var building = playerDoc.buildings["location_" + location]
	var data = {
		buildingType:building.type,
		level:building.level
	}
	this.pushToPlayer(playerDoc, Events.player.onBuildingLevelUp, data)
}

/**
 * 小屋升级成功事件推送
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 */
pro.onHouseLevelUp = function(playerDoc, buildingLocation, houseLocation){
	var building = playerDoc.buildings["location_" + buildingLocation]
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
	this.pushToPlayer(playerDoc, Events.player.onHouseLevelUp, data)
}

/**
 * 箭塔升级成功事件推送
 * @param playerDoc
 * @param location
 */
pro.onTowerLevelUp = function(playerDoc, location){
	var tower = playerDoc.towers["location_" + location]
	var data = {
		level:tower.level
	}
	this.pushToPlayer(playerDoc, Events.player.onTowerLevelUp, data)
}

/**
 * 城墙成绩成功事件推送
 * @param playerDoc
 */
pro.onWallLevelUp = function(playerDoc){
	var wall = playerDoc.wall
	var data = {
		level:wall.level
	}
	this.pushToPlayer(playerDoc, Events.player.onWallLevelUp, data)
}

/**
 * 材料制作完成事件推送
 * @param playerDoc
 * @param event
 */
pro.onMakeMaterialFinished = function(playerDoc, event){
	var data = {
		category:event.category
	}
	this.pushToPlayer(playerDoc, Events.player.onMakeMaterialFinished, data)
}

/**
 * 获取由工具作坊制作的材料成功
 * @param playerDoc
 * @param event
 */
pro.onGetMaterialSuccess = function(playerDoc, event){
	var data = {
		category:event.category
	}
	this.pushToPlayer(playerDoc, Events.player.onGetMaterialSuccess, data)
}

/**
 * 士兵招募成功推送
 * @param playerDoc
 * @param soldierName
 * @param count
 */
pro.onRecruitSoldierSuccess = function(playerDoc, soldierName, count){
	var data = {
		soldierName:soldierName,
		count:count
	}
	this.pushToPlayer(playerDoc, Events.player.onRecruitSoldierSuccess, data)
}

/**
 * 龙装备制作完成
 * @param playerDoc
 * @param equipmentName
 */
pro.onMakeDragonEquipmentSuccess = function(playerDoc, equipmentName){
	var data = {
		equipmentName:equipmentName
	}
	this.pushToPlayer(playerDoc, Events.player.onMakeDragonEquipmentSuccess, data)
}

/**
 * 治疗士兵成功通知
 * @param playerDoc
 * @param soldiers
 */
pro.onTreatSoldierSuccess = function(playerDoc, soldiers){
	var data = {
		soldiers:soldiers
	}
	this.pushToPlayer(playerDoc, Events.player.onTreatSoldierSuccess, data)
}

/**
 * 收税完成通知
 * @param playerDoc
 * @param coinCount
 */
pro.onImposeSuccess = function(playerDoc, coinCount){
	var data = {
		coinCount:coinCount
	}
	this.pushToPlayer(playerDoc, Events.player.onImposeSuccess, data)
}

/**
 * 查看玩家个人信息通知
 * @param playerDoc
 */
pro.onGetPlayerInfoSuccess = function(playerDoc){
	var hasAlliance = _.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)
	var data = {
		name:playerDoc.basicInfo.name,
		power:playerDoc.basicInfo.power,
		level:playerDoc.basicInfo.level,
		exp:playerDoc.basicInfo.exp,
		vip:playerDoc.basicInfo.vip,
		alliance:hasAlliance ? playerDoc.alliance.name : "",
		title:hasAlliance ? playerDoc.alliance.title : "",
		titleName:hasAlliance ? playerDoc.alliance.titleName : "",
		lastLoginTime:playerDoc.countInfo.lastLoginTime
	}
	this.pushToPlayer(playerDoc, Events.player.onGetPlayerInfoSuccess, data)
}

/**
 * 推送联盟数据给玩家
 * @param allianceDoc
 */
pro.onAllianceDataChanged = function(allianceDoc){
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + allianceDoc._id
	this.globalChannelService.pushMessage(this.serverType, eventName, allianceDoc, channelName)
}

/**
 * 联盟搜索数据返回
 * @param playerDoc
 * @param allianceDocs
 */
pro.onSearchAllianceSuccess = function(playerDoc, allianceDocs){
	var data = {
		alliances:allianceDocs
	}
	this.pushToPlayer(playerDoc, Events.player.onSearchAllianceSuccess, data)
}