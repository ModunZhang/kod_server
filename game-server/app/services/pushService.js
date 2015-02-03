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
var VersionUtils = require("../utils/versionUtils")

var PushService = function(app){
	this.app = app
	this.channelService = app.get("channelService")
	this.globalChannelService = app.get("globalChannelService")
	this.serverId = app.getServerId()
	this.serverType = app.getServerType()
	this.maxReturnMailSize = 10
	this.maxReturnReportSize = 10
	this.serverVersion = VersionUtils.getServerVersion()
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
 * 推送信息给某部分玩家
 * @param playerDocs
 * @param eventName
 * @param data
 * @param callback
 */
pro.pushToPlayers = function(playerDocs, eventName, data, callback){
	var ids = []
	_.each(playerDocs, function(playerDoc){
		if(!_.isEmpty(playerDoc.logicServerId)){
			ids.push({
				uid:playerDoc._id,
				sid:playerDoc.logicServerId
			})
		}
	})
	this.channelService.pushMessageByUids(eventName, data, ids, callback)
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
	var data = _.omit(playerDoc, "mails", "sendMails", "reports")
	data.serverTime = Date.now()
	if(!_.isObject(data.alliance) || _.isEmpty(data.alliance.id)){
		data.alliance = {}
	}

	data.mails = []
	data.reports = []
	for(var i = playerDoc.mails.length - 1; i >= 0; i--){
		data.mails.push(playerDoc.mails[i])
	}
	for(i = playerDoc.reports.length - 1; i >= 0; i--){
		data.reports.push(playerDoc.reports[i])
	}
	data.sendMails = []
	for(i = playerDoc.sendMails.length - 1; i >= 0; i--){
		data.sendMails.push(playerDoc.sendMails[i])
	}
	data.savedMails = []
	data.savedReports = []
	var unreadMails = 0
	var unreadReports = 0
	_.each(data.mails, function(mail){
		if(!mail.isRead){
			unreadMails++
		}
		if(!!mail.isSaved && data.savedMails.length < self.maxReturnMailSize){
			data.savedMails.push(mail)
		}
	})
	_.each(data.reports, function(report){
		if(!report.isRead){
			unreadReports++
		}
		if(!!report.isSaved && data.savedReports.length < self.maxReturnReportSize){
			data.savedReports.push(report)
		}
	})
	data.mails = data.mails.slice(0, this.maxReturnMailSize)
	data.reports = data.reports.slice(0, this.maxReturnReportSize)
	data.sendMails = data.sendMails.slice(0, this.maxReturnMailSize)

	data.mailStatus = {
		unreadMails:unreadMails,
		unreadReports:unreadReports
	}
	data.countInfo.serverVersion = this.serverVersion
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
 * @param callback
 */
pro.onTowerLevelUp = function(playerDoc, callback){
	var tower = playerDoc.tower
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
 * 服务器处理玩家IAP购买订单成功
 * @param playerDoc
 * @param transactionId
 * @param callback
 */
pro.onAddPlayerBillingDataSuccess = function(playerDoc, transactionId, callback){
	var data = {
		transactionId:transactionId
	}
	this.pushToPlayer(playerDoc, Events.player.onAddPlayerBillingDataSuccess, data, callback)
}


/**
 * 查看战力相近的3个联盟的数据
 * @param playerDoc
 * @param nearedAllianceDocs
 * @param callback
 */
pro.onGetNearedAllianceInfosSuccess = function(playerDoc, nearedAllianceDocs, callback){
	var datas = []
	_.each(nearedAllianceDocs, function(doc){
		var data = {}
		data._id = doc._id
		data.basicInfo = doc.basicInfo
		data.countInfo = doc.countInfo
		data.archon = LogicUtils.getAllianceArchon(doc).name
		datas.push(data)
	})
	this.pushToPlayer(playerDoc, Events.player.onGetNearedAllianceInfosSuccess, datas, callback)
}

/**
 * 根据Tag搜索联盟战斗数据
 * @param playerDoc
 * @param nearedAllianceDocs
 * @param callback
 */
pro.onSearchAllianceInfoByTagSuccess = function(playerDoc, nearedAllianceDocs, callback){
	var datas = []
	_.each(nearedAllianceDocs, function(doc){
		var data = {}
		data._id = doc._id
		data.basicInfo = doc.basicInfo
		data.countInfo = doc.countInfo
		datas.push(data)
	})
	this.pushToPlayer(playerDoc, Events.player.onSearchAllianceInfoByTagSuccess, datas, callback)
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
 * 获取玩家战报成功
 * @param playerDoc
 * @param fromIndex
 * @param callback
 */
pro.onGetReportsSuccess = function(playerDoc, fromIndex, callback){
	var reports = []
	for(var i = playerDoc.reports.length - 1; i >= 0; i--){
		var report = playerDoc.reports[i]
		reports.push(report)
	}
	reports = reports.slice(fromIndex, fromIndex + this.maxReturnReportSize)
	var data = {
		reports:reports
	}
	this.pushToPlayer(playerDoc, Events.player.onGetReportsSuccess, data, callback)
}

/**
 * 获取玩家已存邮件成功
 * @param playerDoc
 * @param fromIndex
 * @param callback
 */
pro.onGetSavedReportsSuccess = function(playerDoc, fromIndex, callback){
	var reports = []
	for(var i = playerDoc.reports.length - 1; i >= 0; i--){
		var report = playerDoc.reports[i]
		if(!!report.isSaved) reports.push(report)
	}
	reports = reports.slice(fromIndex, fromIndex + this.maxReturnReportSize)
	var data = {
		reports:reports
	}
	this.pushToPlayer(playerDoc, Events.player.onGetSavedReportsSuccess, data, callback)
}

/**
 * 获取联盟可视化数据成功
 * @param playerDoc
 * @param allianceDoc
 * @param callback
 */
pro.onGetAllianceViewDataSuccess = function(playerDoc, allianceDoc, callback){
	var viewData = LogicUtils.getAllianceViewData(allianceDoc)
	this.pushToPlayer(playerDoc, Events.player.onGetAllianceViewDataSuccess, viewData, callback)
}

/**
 * 获取玩家可视化数据成功
 * @param playerDoc
 * @param targetPlayerDoc
 * @param callback
 */
pro.onGetPlayerViewDataSuccess = function(playerDoc, targetPlayerDoc, callback){
	var playerData = {}
	playerData._id = targetPlayerDoc._id
	playerData.basicInfo = targetPlayerDoc.basicInfo
	playerData.buildings = targetPlayerDoc.buildings
	playerData.tower = targetPlayerDoc.tower
	playerData.wall = targetPlayerDoc.wall
	playerData.helpedByTroops = targetPlayerDoc.helpedByTroops
	this.pushToPlayer(playerDoc, Events.player.onGetPlayerViewDataSuccess, playerData, callback)
}

/**
 * 获取商品列表成功
 * @param playerDoc
 * @param itemDocs
 * @param callback
 */
pro.onGetSellItemsSuccess = function(playerDoc, itemDocs, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetSellItemsSuccess, itemDocs, callback)
}

/**
 * 查看地方进攻行军事件详细信息
 * @param playerDoc
 * @param detail
 * @param callback
 */
pro.onGetAttackMarchEventDetail = function(playerDoc, detail, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetAttackMarchEventDetail, detail, callback)
}

/**
 * 查看地方进攻行军事件详细信息
 * @param playerDoc
 * @param detail
 * @param callback
 */
pro.onGetStrikeMarchEventDetail = function(playerDoc, detail, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetStrikeMarchEventDetail, detail, callback)
}

/**
 * 查看协助部队行军事件详细信息
 * @param playerDoc
 * @param detail
 * @param callback
 */
pro.onGetHelpDefenceMarchEventDetail = function(playerDoc, detail, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetHelpDefenceMarchEventDetail, detail, callback)
}

/**
 * 查看协防部队详细信息
 * @param playerDoc
 * @param detail
 * @param callback
 */
pro.onGetHelpDefenceTroopDetail = function(playerDoc, detail, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetHelpDefenceTroopDetail, detail, callback)
}

/**
 * 推送联盟数据给玩家
 * @param allianceId
 * @param data
 * @param callback
 */
pro.onAllianceDataChanged = function(allianceId, data, callback){
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + allianceId
	this.globalChannelService.pushMessage(this.serverType, eventName, data, channelName, null, callback)
}

/**
 * 推送给联盟除指定玩家之外的其他玩家
 * @param allianceId
 * @param data
 * @param memberId
 * @param callback
 */
pro.onAllianceDataChangedExceptMemberId = function(allianceId, data, memberId, callback){
	var self = this
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + allianceId
	var servers = this.app.getServersByType(this.serverType)
	var uids = []
	var getMembersFunc = function(serverId){
		return self.globalChannelService.getMembersBySidAsync(channelName, serverId).then(function(members){
			_.each(members, function(playerId){
				if(!_.isEqual(playerId, memberId)) uids.push({uid:playerId, sid:serverId})
			})
			return Promise.resolve()
		}).catch(function(e){
			return Promise.reject(e)
		})
	}
	var funcs = []
	_.each(servers, function(server){
		funcs.push(getMembersFunc(server.id))
	})
	Promise.all(funcs).then(function(){
		if(uids.length > 0){
			self.channelService.pushMessageByUids(eventName, data, uids, callback)
		}else{
			callback()
		}
	}).catch(function(e){
		callback(e)
	})
}