"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var ShortId = require("shortid")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var AllianceApiService5 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.dataService = app.get("dataService")
	this.cacheService = app.get('cacheService');
}
module.exports = AllianceApiService5
var pro = AllianceApiService5.prototype

/**
 * 为联盟成员添加荣耀值
 * @param playerId
 * @param allianceId
 * @param memberId
 * @param count
 * @param callback
 */
pro.giveLoyaltyToAllianceMember = function(playerId, allianceId, memberId, count, callback){
	var self = this
	var memberDoc = null
	var memberData = []
	var memberObject = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "giveLoyaltyToAllianceMember")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "giveLoyaltyToAllianceMember"))
		}

		if(allianceDoc.basicInfo.honour - count < 0) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		return self.cacheService.findPlayerAsync(memberId)
	}).then(function(doc){
		memberDoc = doc
		memberDoc.allianceInfo.loyalty += count
		memberData.push(["allianceInfo.loyalty", memberDoc.allianceInfo.loyalty])

		allianceDoc.basicInfo.honour -= count
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		memberObject.loyalty = memberDoc.allianceInfo.loyalty
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".loyalty", memberObject.loyalty])
		memberObject.lastRewardData = {
			count:count,
			time:Date.now()
		}
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".lastRewardData", memberObject.lastRewardData])

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, memberDoc._id, memberDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		var allianceName = allianceDoc.basicInfo.name
		allianceDoc = null
		memberDoc = null
		var titleKey = DataUtils.getLocalizationConfig("alliance", "giveLoyaltyToAllianceMemberTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "giveLoyaltyToAllianceMemberContent")
		return self.dataService.sendSysMailAsync(memberId, titleKey, [], contentKey, [allianceName, count])
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(memberDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 获取联盟申请列表
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getJoinRequestEvents = function(playerId, allianceId, callback){
	var allianceDoc = null
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isObject(playerObject)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "getJoinRequestEvents"))
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "getJoinRequestEvents"))

		callback(null, allianceDoc.joinRequestEvents)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取联盟圣地战历史记录
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getShrineReports = function(playerId, allianceId, callback){
	var allianceDoc = null
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isObject(playerObject)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))

		callback(null, allianceDoc.shrineReports)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取联盟战历史记录
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getAllianceFightReports = function(playerId, allianceId, callback){
	var allianceDoc = null
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isObject(playerObject)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))

		callback(null, allianceDoc.allianceFightReports)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取联盟商店买入卖出记录
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getItemLogs = function(playerId, allianceId, callback){
	var allianceDoc = null
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isObject(playerObject)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))

		callback(null, allianceDoc.itemLogs)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 移动联盟
 * @param playerId
 * @param allianceId
 * @param targetMapIndex
 * @param callback
 */
pro.moveAlliance = function(playerId, allianceId, targetMapIndex, callback){
	var self = this;
	var allianceDoc = null;
	var allianceData = [];
	var updateFuncs = [];
	var eventFuncs = [];
	var pushFuncs = [];
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc;
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "moveAlliance")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "moveAlliance"))
		}
		if(allianceDoc.basicInfo.allianceMoveTime + (DataUtils.getAllianceIntInit('allianceMoveColdMinutes') * 60 * 1000) > Date.now()){
			return Promise.reject(ErrorUtils.canNotMoveAllianceRightNow(playerId, allianceId));
		}
		if(!!allianceDoc.allianceFight){
			return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceId));
		}
		if(!!self.cacheService.getMapDataAtIndex(targetMapIndex).allianceData){
			return Promise.reject(ErrorUtils.canNotMoveToTargetMapIndex(playerId, allianceId, targetMapIndex));
		}
		allianceDoc.basicInfo.allianceMoveTime = Date.now();
		allianceData.push(['basicInfo.allianceMoveTime', allianceDoc.basicInfo.allianceMoveTime]);
		allianceDoc.mapIndex = targetMapIndex;
		allianceData.push(['mapIndex', allianceDoc.mapIndex]);
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceId, allianceDoc]);
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData]);
		pushFuncs.push([self.cacheService, self.cacheService.updateMapAllianceAsync, allianceDoc.mapIndex, null]);
		return Promise.resolve();
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 进入被观察地块
 * @param logicServerId
 * @param playerId
 * @param allianceId
 * @param mapIndex
 * @param callback
 */
pro.enterMapIndex = function(logicServerId, playerId, allianceId, mapIndex, callback){
	var mapIndexData = this.cacheService.getMapDataAtIndex(mapIndex);
	if(!!mapIndexData.alliance && mapIndexData.alliance.id === allianceId){
		return callback(ErrorUtils.canNotViewYourOwnAlliance(playerId, allianceId));
	}
	this.cacheService.enterMapIndexChannelAsync(playerId, logicServerId, mapIndex).then(function(data){
		callback(null, [data.allianceData, data.mapData]);
	}).catch(function(e){
		callback(e);
	})
}

/**
 * 进入被观察地块后的心跳
 * @param logicServerId
 * @param playerId
 * @param mapIndex
 * @param callback
 */
pro.amInMapIndex = function(logicServerId, playerId, mapIndex, callback){
	this.cacheService.amInMapIndexChannelAsync(playerId, logicServerId, mapIndex).then(function(){
		callback();
	}).catch(function(e){
		callback(e);
	})
}

/**
 * 玩家离开被观察的地块
 * @param logicServerId
 * @param playerId
 * @param mapIndex
 * @param callback
 */
pro.leaveMapIndex = function(logicServerId, playerId, mapIndex, callback){
	this.cacheService.leaveMapIndexChannelAsync(playerId, logicServerId, mapIndex).then(function(){
		callback();
	}).catch(function(e){
		callback(e);
	})
}

/**
 * 在大地图中获取联盟基础信息
 * @param playerId
 * @param mapIndexs
 * @param callback
 */
pro.getMapAllianceDatas = function(playerId, mapIndexs, callback){
	var self = this;
	var datas = {};
	_.each(mapIndexs, function(mapIndex){
			datas[mapIndexs] = self.cacheService.getMapDataAtIndex(mapIndex).allianceData;
	});

	callback(null, datas);
}