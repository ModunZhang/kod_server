"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
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
}
module.exports = AllianceApiService5
var pro = AllianceApiService5.prototype

/**
 * 为联盟成员添加荣耀值
 * @param playerId
 * @param memberId
 * @param count
 * @param callback
 */
pro.giveLoyaltyToAllianceMember = function(playerId, memberId, count, callback){
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var memberDoc = null
	var memberData = []
	var memberObject = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.allianceDao.findAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "giveLoyaltyToAllianceMember")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "giveLoyaltyToAllianceMember"))
		}
		if(allianceDoc.basicInfo.honour - count < 0) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		if(!_.isEqual(playerId, memberId)){
			return self.dataService.findPlayerAsync(memberId).then(function(doc){
				memberDoc = doc
				return Promise.resolve()
			})
		}else{
			memberDoc = playerDoc
			return Promise.resolve()
		}
	}).then(function(){
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

		if(!_.isEqual(playerId, memberId)){
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, null])
		}
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, memberDoc, memberDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(!_.isEqual(playerId, memberId) && _.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}