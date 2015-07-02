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
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
 * 查看联盟信息
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getAllianceInfo = function(playerId, allianceId, callback){
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
		var allianceData = {
			id:doc._id,
			name:doc.basicInfo.name,
			tag:doc.basicInfo.tag,
			flag:doc.basicInfo.flag,
			members:doc.members.length,
			membersMax:DataUtils.getAllianceMemberMaxCount(doc),
			power:doc.basicInfo.power,
			language:doc.basicInfo.language,
			kill:doc.basicInfo.kill,
			joinType:doc.basicInfo.joinType,
			terrain:doc.basicInfo.terrain,
			desc:doc.desc,
			titles:doc.titles,
			memberList:(function(){
				var members = []
				_.each(doc.members, function(member){
					var theMember = {
						id:member.id,
						name:member.name,
						icon:member.icon,
						levelExp:member.levelExp,
						power:member.power,
						title:member.title,
						online:_.isBoolean(member.online) ? member.online : false,
						lastLoginTime:member.lastLoginTime
					}
					members.push(theMember)
				})
				return members
			})()
		}

		callback(null, allianceData)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取联盟申请列表
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getJoinRequestEvents = function(playerId, allianceId, callback){
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

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
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

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
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

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
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

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