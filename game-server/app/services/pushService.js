"use strict"

/**
 * Created by modun on 14-8-7.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")
var LogicUtils = require("../utils/logicUtils")

var PushService = function(app){
	this.app = app
	this.channelService = app.get("channelService")
	this.globalChannelService = Promise.promisifyAll(app.get("globalChannelService"))
	this.serverId = app.getServerId()
	this.serverType = app.getServerType()
	this.maxReturnMailSize = 10
}
module.exports = PushService
var pro = PushService.prototype

/**
 * 推送消息给单个玩家
 * @param playerDoc
 * @param eventName
 * @param data
 * @param callback
 */
pro.pushToPlayer = function(playerDoc, eventName, data, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback()
		return
	}
	this.channelService.pushMessageByUids(eventName, data, [{uid:playerDoc._id, sid:playerDoc.logicServerId}], callback)
}

/**
 * 推送玩家数据给玩家
 * @param playerDoc
 * @param data
 * @param callback
 */
pro.onPlayerDataChanged = function(playerDoc, data, callback){
	this.pushToPlayer(playerDoc, Events.player.onPlayerDataChanged, data, callback)
}

/**
 * 玩家登陆成功时,推送所有玩家数据给玩家
 * @param playerDoc
 * @param callback
 */
pro.onPlayerLoginSuccess = function(playerDoc, callback){
	var self = this
	var data = _.omit(playerDoc, "mails", "sendMails")
	data.serverTime = Date.now()
	data.mails = []
	for(var i = playerDoc.mails.length - 1; i >= 0; i--){
		data.mails.push(playerDoc.mails[i])
	}
	data.sendMails = []
	for(var i = playerDoc.sendMails.length - 1; i >= 0; i--){
		data.sendMails.push(playerDoc.sendMails[i])
	}
	data.savedMails = []
	if(!_.isObject(data.alliance) || _.isEmpty(data.alliance.id)){
		data.alliance = {}
	}

	var unreadMails = 0
	_.each(data.mails, function(mail){
		if(!mail.isRead){
			unreadMails++
		}
		if(!!mail.isSaved && data.savedMails.length < self.maxReturnMailSize){
			data.savedMails.push(mail)
		}
	})
	data.mails = data.mails.slice(0, this.maxReturnMailSize)
	data.sendMails = data.sendMails.slice(0, this.maxReturnMailSize)

	data.mailStatus = {
		unreadMails:unreadMails
	}
	this.pushToPlayer(playerDoc, Events.player.onPlayerLoginSuccess, data, callback)
}

/**
 * 成功获取联盟完整数据
 * @param playerDoc
 * @param allianceDoc
 * @param callback
 */
pro.onGetAllianceDataSuccess = function(playerDoc, allianceDoc, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetAllianceDataSuccess, allianceDoc, callback)
}

/**
 * 建筑升级成功事件推送
 * @param playerDoc
 * @param location
 * @param callback
 */
pro.onBuildingLevelUp = function(playerDoc, location, callback){
	var building = playerDoc.buildings["location_" + location]
	var data = {
		buildingType:building.type, level:building.level
	}
	this.pushToPlayer(playerDoc, Events.player.onBuildingLevelUp, data, callback)
}

/**
 * 小屋升级成功事件推送
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 * @param callback
 */
pro.onHouseLevelUp = function(playerDoc, buildingLocation, houseLocation, callback){
	var building = playerDoc.buildings["location_" + buildingLocation]
	var house = null
	_.each(building.houses, function(v){
		if(_.isEqual(houseLocation, v.location)){
			house = v
		}
	})
	var data = {
		buildingType:building.type, houseType:house.type, level:house.level
	}
	this.pushToPlayer(playerDoc, Events.player.onHouseLevelUp, data, callback)
}

/**
 * 箭塔升级成功事件推送
 * @param playerDoc
 * @param location
 * @param callback
 */
pro.onTowerLevelUp = function(playerDoc, location, callback){
	var tower = playerDoc.towers["location_" + location]
	var data = {
		level:tower.level
	}
	this.pushToPlayer(playerDoc, Events.player.onTowerLevelUp, data, callback)
}

/**
 * 城墙成绩成功事件推送
 * @param playerDoc
 * @param callback
 */
pro.onWallLevelUp = function(playerDoc, callback){
	var wall = playerDoc.wall
	var data = {
		level:wall.level
	}
	this.pushToPlayer(playerDoc, Events.player.onWallLevelUp, data, callback)
}

/**
 * 材料制作完成事件推送
 * @param playerDoc
 * @param event
 * @param callback
 */
pro.onMakeMaterialFinished = function(playerDoc, event, callback){
	var data = {
		category:event.category
	}
	this.pushToPlayer(playerDoc, Events.player.onMakeMaterialFinished, data, callback)
}

/**
 * 获取由工具作坊制作的材料成功
 * @param playerDoc
 * @param event
 * @param callback
 */
pro.onGetMaterialSuccess = function(playerDoc, event, callback){
	var data = {
		category:event.category
	}
	this.pushToPlayer(playerDoc, Events.player.onGetMaterialSuccess, data, callback)
}

/**
 * 士兵招募成功推送
 * @param playerDoc
 * @param soldierName
 * @param count
 * @param callback
 */
pro.onRecruitSoldierSuccess = function(playerDoc, soldierName, count, callback){
	var data = {
		soldierName:soldierName, count:count
	}
	this.pushToPlayer(playerDoc, Events.player.onRecruitSoldierSuccess, data, callback)
}

/**
 * 龙装备制作完成
 * @param playerDoc
 * @param equipmentName
 * @param callback
 */
pro.onMakeDragonEquipmentSuccess = function(playerDoc, equipmentName, callback){
	var data = {
		equipmentName:equipmentName
	}
	this.pushToPlayer(playerDoc, Events.player.onMakeDragonEquipmentSuccess, data, callback)
}

/**
 * 治疗士兵成功通知
 * @param playerDoc
 * @param soldiers
 * @param callback
 */
pro.onTreatSoldierSuccess = function(playerDoc, soldiers, callback){
	var data = {
		soldiers:soldiers
	}
	this.pushToPlayer(playerDoc, Events.player.onTreatSoldierSuccess, data, callback)
}

/**
 * 收税完成通知
 * @param playerDoc
 * @param coinCount
 * @param callback
 */
pro.onImposeSuccess = function(playerDoc, coinCount, callback){
	var data = {
		coinCount:coinCount
	}
	this.pushToPlayer(playerDoc, Events.player.onImposeSuccess, data, callback)
}

/**
 * 查看玩家个人信息通知
 * @param playerDoc
 * @param memberDoc
 * @param callback
 */
pro.onGetPlayerInfoSuccess = function(playerDoc, memberDoc, callback){
	var hasAlliance = _.isObject(memberDoc.alliance) && !_.isEmpty(memberDoc.alliance.id)
	var data = {
		id:memberDoc._id,
		name:memberDoc.basicInfo.name,
		power:memberDoc.basicInfo.power,
		level:memberDoc.basicInfo.level,
		exp:memberDoc.basicInfo.exp,
		vipExp:memberDoc.basicInfo.vipExp,
		alliance:hasAlliance ? memberDoc.alliance.name : "",
		title:hasAlliance ? memberDoc.alliance.title : "",
		titleName:hasAlliance ? memberDoc.alliance.titleName : "",
		lastLoginTime:memberDoc.countInfo.lastLoginTime
	}
	this.pushToPlayer(playerDoc, Events.player.onGetPlayerInfoSuccess, data, callback)
}

/**
 * 联盟搜索数据返回
 * @param playerDoc
 * @param allianceDocs
 * @param callback
 */
pro.onSearchAlliancesSuccess = function(playerDoc, allianceDocs, callback){
	var alliances = []
	_.each(allianceDocs, function(allianceDoc){
		var shortDoc = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag,
			level:allianceDoc.basicInfo.level,
			members:allianceDoc.members.length,
			power:allianceDoc.basicInfo.power,
			language:allianceDoc.basicInfo.language,
			kill:allianceDoc.basicInfo.kill,
			archon:LogicUtils.getAllianceArchon(allianceDoc).name,
			joinType:allianceDoc.basicInfo.joinType,
			terrain:allianceDoc.basicInfo.terrain
		}
		alliances.push(shortDoc)
	})
	var data = {
		alliances:alliances
	}
	this.pushToPlayer(playerDoc, Events.player.onSearchAlliancesSuccess, data, callback)
}

/**
 * 联盟搜索数据返回
 * @param playerDoc
 * @param allianceDocs
 * @param callback
 */
pro.onGetCanDirectJoinAlliancesSuccess = function(playerDoc, allianceDocs, callback){
	var alliances = []
	_.each(allianceDocs, function(allianceDoc){
		var shortDoc = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag,
			level:allianceDoc.basicInfo.level,
			members:allianceDoc.members.length,
			power:allianceDoc.basicInfo.power,
			language:allianceDoc.basicInfo.language,
			kill:allianceDoc.basicInfo.kill,
			archon:LogicUtils.getAllianceArchon(allianceDoc).name,
			joinType:allianceDoc.basicInfo.joinType,
			terrain:allianceDoc.basicInfo.terrain
		}
		alliances.push(shortDoc)
	})
	var data = {
		alliances:alliances
	}
	this.pushToPlayer(playerDoc, Events.player.onGetCanDirectJoinAlliancesSuccess, data, callback)
}

/**
 * 获取玩家邮件成功
 * @param playerDoc
 * @param fromIndex
 * @param callback
 */
pro.onGetMailsSuccess = function(playerDoc, fromIndex, callback){
	var mails = []
	for(var i = playerDoc.mails.length - 1; i >= 0; i--){
		var mail = playerDoc.mails[i]
		mails.push(mail)
	}
	mails = mails.slice(fromIndex, fromIndex + this.maxReturnMailSize)
	var data = {
		mails:mails
	}
	this.pushToPlayer(playerDoc, Events.player.onGetMailsSuccess, data, callback)
}

/**
 * 获取玩家已发邮件成功
 * @param playerDoc
 * @param fromIndex
 * @param callback
 */
pro.onGetSendMailsSuccess = function(playerDoc, fromIndex, callback){
	var mails = []
	for(var i = playerDoc.sendMails.length - 1; i >= 0; i--){
		var mail = playerDoc.sendMails[i]
		mails.push(mail)
	}
	mails = mails.slice(fromIndex, fromIndex + this.maxReturnMailSize)
	var data = {
		mails:mails
	}
	this.pushToPlayer(playerDoc, Events.player.onGetSendMailsSuccess, data, callback)
}

/**
 * 获取玩家已存邮件成功
 * @param playerDoc
 * @param fromIndex
 * @param callback
 */
pro.onGetSavedMailsSuccess = function(playerDoc, fromIndex, callback){
	var mails = []
	for(var i = playerDoc.mails.length - 1; i >= 0; i--){
		var mail = playerDoc.mails[i]
		if(!!mail.isSaved) mails.push(mail)
	}
	mails = mails.slice(fromIndex, fromIndex + this.maxReturnMailSize)
	var data = {
		mails:mails
	}
	this.pushToPlayer(playerDoc, Events.player.onGetSavedMailsSuccess, data, callback)
}


/**
 * 推送联盟数据给玩家
 * @param allianceDoc
 * @param data
 * @param callback
 */
pro.onAllianceDataChanged = function(allianceDoc, data, callback){
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + allianceDoc._id
	this.globalChannelService.pushMessage(this.serverType, eventName, data, channelName, null, callback)
}