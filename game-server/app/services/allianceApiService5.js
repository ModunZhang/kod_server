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
var MarchUtils = require("../utils/marchUtils")
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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
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
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		marchEvent = _.find(allianceDoc.attackMarchEvents, function(marchEvent){
			return _.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id) && _.isEqual(marchEvent.id, eventId)
		})
		if(!_.isObject(marchEvent)) return Promise.reject(new Error("行军事件不存在"))
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			return self.playerDao.findAsync(marchEvent.attackPlayerData.id)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(playerId, marchEvent.attackPlayerData.id)){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc
		}else{
			attackPlayerDoc = playerDoc
		}
		var detail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, eventId, marchEvent.attackPlayerData.dragon, marchEvent.attackPlayerData.soldiers)
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, attackPlayerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetHelpDefenceMarchEventDetailAsync, playerDoc, detail])
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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(callerId)){
		callback(new Error("callerId 不合法"))
		return
	}
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
	this.playerDao.findAsync(callerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		callerDoc = doc
		if(!_.isEqual(callerId, playerId)){
			return self.playerDao.findAsync(playerId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(callerId, playerId)){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			playerDoc = doc
		}else{
			playerDoc = callerDoc
		}
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		helpedByPlayerTroop = _.find(playerDoc.helpedByTroops, function(troop){
			return _.isEqual(troop.id, helpedByPlayerId)
		})
		if(!_.isObject(helpedByPlayerTroop)) return Promise.reject(new Error("没有此玩家的协防部队"))
		if(!_.isEqual(callerId, helpedByPlayerId)){
			return self.playerDao.findAsync(helpedByPlayerId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(callerId, helpedByPlayerId)){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			attackPlayerDoc = doc
		}else{
			attackPlayerDoc = callerDoc
		}

		var detail = ReportUtils.getPlayerMarchTroopDetail(attackPlayerDoc, helpedByPlayerId, helpedByPlayerTroop.dragon, helpedByPlayerTroop.soldiers)
		delete detail.marchEventId
		detail.helpedByPlayerId = helpedByPlayerId

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, callerDoc._id])
		if(!_.isEqual(callerDoc, playerDoc)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}
		if(!_.isEqual(callerDoc, attackPlayerDoc)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, attackPlayerDoc._id])
		}
		pushFuncs.push([self.pushService, self.pushService.onGetHelpDefenceTroopDetailAsync, callerDoc, detail])
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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
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
	var allianceData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(new Error("玩家未加入联盟"))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "addItem")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc

		var itemConfig = DataUtils.getItemConfig(itemName)
		if(!itemConfig.isSellInAlliance) return Promise.reject(new Error("此道具未在联盟商店出售"))
		if(!itemConfig.isAdvancedItem) return Promise.reject(new Error("普通道具不需要进货补充"))
		var honourNeed = itemConfig.buyPriceInAlliance * count
		if(allianceDoc.basicInfo.honour < honourNeed) return Promise.reject(new Error("联盟荣誉值不足"))
		allianceDoc.basicInfo.honour -= honourNeed
		allianceData.basicInfo = allianceDoc.basicInfo
		var resp = LogicUtils.addAllianceItem(allianceDoc, itemName, count)
		if(resp.newlyCreated){
			allianceData.__items = [{
				type:Consts.DataChangedType.Add,
				data:resp.item
			}]
		}else{
			allianceData.__items = [{
				type:Consts.DataChangedType.Edit,
				data:resp.item
			}]
		}

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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
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
	var playerData = {}
	var allianceDoc = null
	var allianceData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(new Error("玩家未加入联盟"))
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc

		var itemConfig = DataUtils.getItemConfig(itemName)
		var isAdvancedItem = itemConfig.isAdvancedItem
		var eliteLevel = DataUtils.getAllianceTitleLevel("elite")
		var myLevel = DataUtils.getAllianceTitleLevel(playerDoc.alliance.title)
		if(isAdvancedItem){
			if(myLevel > eliteLevel) return Promise.reject(new Error("玩家级别不足,不能购买高级道具"))
			var item = _.find(allianceDoc.items, function(item){
				return _.isEqual(item.name, itemName)
			})
			if(!_.isObject(item) || item.count < count) return Promise.reject(new Error("道具数量不足"))
		}

		var loyaltyNeed = itemConfig.buyPriceInAlliance * count
		if(playerDoc.allianceInfo.loyalty < loyaltyNeed) return Promise.reject(new Error("玩家忠诚值不足"))
		playerDoc.allianceInfo.loyalty -= loyaltyNeed
		playerData.allianceInfo = playerDoc.basicInfo
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.BuyItemInAllianceShop)
		var memberObject = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
		memberObject.loyalty -= loyaltyNeed
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:memberObject
		}]

		if(isAdvancedItem){
			item.count -= count
			if(item.count <= 0){
				LogicUtils.removeItemInArray(allianceDoc.items, item)
				allianceData.__items = [{
					type:Consts.DataChangedType.Remove,
					data:item
				}]
			}else{
				allianceData.__items = [{
					type:Consts.DataChangedType.Edit,
					data:item
				}]
			}

			var itemLog = LogicUtils.createAllianceItemLog(Consts.AllianceItemLogType.BuyItem, playerDoc.basicInfo.name, itemName, count)
			LogicUtils.addAllianceItemLog(allianceDoc, allianceData, itemLog)
		}

		var resp = LogicUtils.addPlayerItem(playerDoc, itemName, count)
		if(resp.newlyCreated){
			playerData.__items = [{
				type:Consts.DataChangedType.Add,
				data:resp.item
			}]
		}else{
			playerData.__items = [{
				type:Consts.DataChangedType.Edit,
				data:resp.item
			}]
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
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
 * 为联盟成员添加荣耀值
 * @param playerId
 * @param memberId
 * @param count
 * @param callback
 */
pro.giveLoyaltyToAllianceMember = function(playerId, memberId, count, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
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
	var memberData = {}
	var memberObject = null
	var allianceDoc = null
	var allianceData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(new Error("玩家未加入联盟"))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "giveLoyaltyToAllianceMember")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		allianceDoc = doc
		if(allianceDoc.basicInfo.honour - count < 0) return Promise.reject(new Error("联盟荣耀值不足"))
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(new Error("联盟成员不存在"))
		if(!_.isEqual(playerId, memberId)){
			return self.playerDao.findAsync(memberId)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(!_.isEqual(playerId, memberId)){
			if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
			memberDoc = doc
		}else{
			memberDoc = playerDoc
		}
		memberDoc.allianceInfo.loyalty += count
		memberData.allianceInfo = memberDoc.allianceInfo

		allianceDoc.basicInfo.honour -= count
		allianceData.basicInfo = allianceDoc.basicInfo
		memberObject.loyalty = memberDoc.allianceInfo.loyalty
		memberObject.lastRewardData = {
			count:count,
			time:Date.now()
		}
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:memberObject
		}]

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