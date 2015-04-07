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
var ReportUtils = require("../utils/reportUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var AllianceApiService5 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceApiService5
var pro = AllianceApiService5.prototype


/**
 * 查看协助部队行军事件详细信息
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.getHelpDefenceMarchEventDetail = function(playerId, eventId, callback){
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var attackPlayerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var marchEvent = null
	var eventDetail = null
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance))return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		marchEvent = _.find(allianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id) && _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(ErrorUtils.marchEventNotExist(playerId, allianceDoc._id, "attackMarchEvents", eventId))
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			return self.playerDao.findAsync(marchEvent.attackPlayerData.id)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			attackPlayerDoc = doc
		}else{
			attackPlayerDoc = playerDoc
		}
		eventDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, marchEvent.attackPlayerData.soldiers)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, attackPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, eventDetail)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(attackPlayerDoc) && !_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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

/**
 * 查看协防部队详细信息
 * @param callerId
 * @param playerId
 * @param helpedByPlayerId
 * @param callback
 */
pro.getHelpDefenceTroopDetail = function(callerId, playerId, helpedByPlayerId, callback){
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(helpedByPlayerId)){
		callback(new Error("helpedByPlayerId 不合法"))
		return
	}

	var self = this
	var callerDoc = null
	var playerDoc = null
	var attackPlayerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	var helpedByPlayerTroop = null
	var troopDetail = null
	this.playerDao.findAsync(callerId).then(function(doc){
		callerDoc = doc
		if(!_.isEqual(callerId, playerId)){
			return self.playerDao.findAsync(playerId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(callerId, playerId)){
			if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(callerId, playerId))
			playerDoc = doc
		}else{
			playerDoc = callerDoc
		}
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		}
		helpedByPlayerTroop = _.find(playerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, helpedByPlayerId)
		})
		if(!_.isObject(helpedByPlayerTroop)) return Promise.reject(ErrorUtils.noHelpDefenceTroopByThePlayer(callerId, playerDoc.alliance.id, playerDoc._id, helpedByPlayerId))
		if(!_.isEqual(callerId, helpedByPlayerId)){
			return self.playerDao.findAsync(helpedByPlayerId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(callerId, helpedByPlayerId)){
			if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(callerId, helpedByPlayerId))
			attackPlayerDoc = doc
		}else{
			attackPlayerDoc = callerDoc
		}

		troopDetail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, helpedByPlayerId, helpedByPlayerTroop.dragon, helpedByPlayerTroop.soldiers)
		delete troopDetail.marchEventId
		troopDetail.helpedByPlayerId = helpedByPlayerId

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, callerDoc._id])
		if(!_.isEqual(callerDoc, playerDoc)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}
		if(!_.isEqual(callerDoc, attackPlayerDoc)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, attackPlayerDoc._id])
		}
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, troopDetail)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(callerDoc)){
			funcs.push(self.playerDao.removeLockAsync(callerDoc._id))
		}
		if(_.isObject(playerDoc) && !_.isEqual(callerDoc, playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(attackPlayerDoc) && !_.isEqual(callerDoc, attackPlayerDoc)){
			funcs.push(self.playerDao.removeLockAsync(attackPlayerDoc._id))
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

/**
 * 联盟商店补充道具
 * @param playerId
 * @param itemName
 * @param count
 * @param callback
 */
pro.addItem = function(playerId, itemName, count, callback){
	if(!DataUtils.isItemNameExist(itemName)){
		callback(new Error("itemName 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "addItem")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "addItem"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(!DataUtils.isItemSellInAllianceShop(allianceDoc, itemName)) return Promise.reject(ErrorUtils.theItemNotSellInAllianceShop(playerId, allianceDoc._id, itemName))
		var itemConfig = DataUtils.getItemConfig(itemName)
		if(!itemConfig.isAdvancedItem) return Promise.reject(ErrorUtils.normalItemsNotNeedToAdd(playerId, allianceDoc._id, itemName))
		var honourNeed = itemConfig.buyPriceInAlliance * count
		if(allianceDoc.basicInfo.honour < honourNeed) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		allianceDoc.basicInfo.honour -= honourNeed
		allianceData.basicInfo = allianceDoc.basicInfo
		var resp = LogicUtils.addAllianceItem(allianceDoc, itemName, count)
		allianceData.push(["items." + allianceDoc.items.indexOf(resp.item), resp.item])

		var itemLog = LogicUtils.createAllianceItemLog(Consts.AllianceItemLogType.AddItem, playerDoc.basicInfo.name, itemName, count)
		LogicUtils.addAllianceItemLog(allianceDoc, allianceData, itemLog)

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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

/**
 * 购买联盟商店的道具
 * @param playerId
 * @param itemName
 * @param count
 * @param callback
 */
pro.buyItem = function(playerId, itemName, count, callback){
	if(!DataUtils.isItemNameExist(itemName)){
		callback(new Error("itemName 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		var itemConfig = DataUtils.getItemConfig(itemName)
		var isAdvancedItem = itemConfig.isAdvancedItem
		var eliteLevel = DataUtils.getAllianceTitleLevel("elite")
		var myLevel = DataUtils.getAllianceTitleLevel(playerDoc.alliance.title)
		if(isAdvancedItem){
			if(myLevel > eliteLevel) return Promise.reject(ErrorUtils.playerLevelNotEoughCanNotBuyAdvancedItem(playerId, allianceDoc._id, itemName))
			var item = _.find(allianceDoc.items, function(item){
				return _.isEqual(item.name, itemName)
			})
			if(!_.isObject(item) || item.count < count) return Promise.reject(ErrorUtils.itemCountNotEnough(playerId, allianceDoc._id, itemName))
		}

		var loyaltyNeed = itemConfig.buyPriceInAlliance * count
		if(playerDoc.allianceInfo.loyalty < loyaltyNeed) return Promise.reject(ErrorUtils.playerLoyaltyNotEnough(playerId, allianceDoc._id))
		playerDoc.allianceInfo.loyalty -= loyaltyNeed
		playerData.push(["allianceInfo.loyalty", playerDoc.allianceInfo.loyalty])
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.BuyItemInAllianceShop)
		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
		memberObject.loyalty -= loyaltyNeed
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".loyalty", memberObject.loyalty])

		if(isAdvancedItem){
			item.count -= count
			if(item.count <= 0){
				allianceData.push(["items." + allianceDoc.items.indexOf(item), null])
				LogicUtils.removeItemInArray(allianceDoc.items, item)
			}else{
				allianceData.push(["items." + allianceDoc.items.indexOf(item) + ".count", item.count])
			}
			var itemLog = LogicUtils.createAllianceItemLog(Consts.AllianceItemLogType.BuyItem, playerDoc.basicInfo.name, itemName, count)
			LogicUtils.addAllianceItemLog(allianceDoc, allianceData, itemLog)
		}

		var resp = LogicUtils.addPlayerItem(playerDoc, itemName, count)
		playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "giveLoyaltyToAllianceMember")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "giveLoyaltyToAllianceMember"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(allianceDoc.basicInfo.honour - count < 0) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		if(!_.isEqual(playerId, memberId)){
			return self.playerDao.findAsync(memberId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(playerId, memberId)){
			if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
			memberDoc = doc
		}else{
			memberDoc = playerDoc
		}
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
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(!_.isEqual(playerId, memberId) && _.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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