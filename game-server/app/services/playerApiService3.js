"use strict"

/**
 * Created by modun on 14-7-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService3 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.dataService = app.get("dataService")
	this.Deal = app.get("Deal")
}
module.exports = PlayerApiService3
var pro = PlayerApiService3.prototype


/**
 * 取消收藏邮件
 * @param playerId
 * @param mailId
 * @param callback
 */
pro.unSaveMail = function(playerId, mailId, callback){
	if(!_.isString(mailId)){
		callback(new Error("mailId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var mail = LogicUtils.getPlayerMailById(playerDoc, mailId)
		if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(playerId, mailId))
		mail.isSaved = false
		playerData.push(["mails." + playerDoc.mails.indexOf(mail) + ".isSaved", mail.isSaved])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取玩家邮件
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getMails = function(playerId, fromIndex, callback){
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var mails = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.dataService.updatePlayerAsync(playerDoc, null)
	}).then(function(){
		for(var i = playerDoc.mails.length - 1; i >= 0; i--){
			var mail = playerDoc.mails[i]
			mail.index = i
			mails.push(mail)
		}
		mails = mails.slice(fromIndex, fromIndex + Define.PlayerMaxReturnMailSize)
		return Promise.resolve()
	}).then(function(){
		callback(null, mails)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取玩家已发邮件
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getSendMails = function(playerId, fromIndex, callback){
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var mails = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.dataService.updatePlayerAsync(playerDoc, null)
	}).then(function(){
		for(var i = playerDoc.sendMails.length - 1; i >= 0; i--){
			var mail = playerDoc.sendMails[i]
			mail.index = i
			mails.push(mail)
		}
		mails = mails.slice(fromIndex, fromIndex + Define.PlayerMaxReturnMailSize)
		return Promise.resolve()
	}).then(function(){
		callback(null, mails)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取玩家已存邮件
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getSavedMails = function(playerId, fromIndex, callback){
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var mails = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.dataService.updatePlayerAsync(playerDoc, null)
	}).then(function(){
		for(var i = playerDoc.mails.length - 1; i >= 0; i--){
			var mail = playerDoc.mails[i]
			mail.index = i
			if(!!mail.isSaved) mails.push(mail)
		}
		mails = mails.slice(fromIndex, fromIndex + Define.PlayerMaxReturnMailSize)
		return Promise.resolve()
	}).then(function(){
		callback(null, mails)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 删除邮件
 * @param playerId
 * @param mailIds
 * @param callback
 */
pro.deleteMails = function(playerId, mailIds, callback){
	if(!_.isArray(mailIds) || mailIds.length == 0){
		callback(new Error("mailIds 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		for(var i = 0; i < mailIds.length; i++){
			var mail = LogicUtils.getPlayerMailById(playerDoc, mailIds[i])
			if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(playerId, mailIds[i]))
			playerData.push(["mails." + playerDoc.mails.indexOf(mail), null])
			LogicUtils.removeItemInArray(playerDoc.mails, mail)
		}

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 阅读战报
 * @param playerId
 * @param reportIds
 * @param callback
 */
pro.readReports = function(playerId, reportIds, callback){
	if(!_.isArray(reportIds) || reportIds.length == 0){
		callback(new Error("reportIds 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		for(var i = 0; i < reportIds.length; i++){
			var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
			if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(playerId, reportIds[i]))
			report.isRead = true
			playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isRead", report.isRead])
		}

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 收藏战报
 * @param playerId
 * @param reportId
 * @param callback
 */
pro.saveReport = function(playerId, reportId, callback){
	if(!_.isString(reportId)){
		callback(new Error("reportId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
		if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(playerId, reportId))
		report.isSaved = true
		playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isSaved", report.isSaved])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 取消收藏战报
 * @param playerId
 * @param reportId
 * @param callback
 */
pro.unSaveReport = function(playerId, reportId, callback){
	if(!_.isString(reportId)){
		callback(new Error("reportId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
		if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(playerId, reportId))
		report.isSaved = false
		playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isSaved", report.isSaved])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取玩家战报
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getReports = function(playerId, fromIndex, callback){
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var reports = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.dataService.updatePlayerAsync(playerDoc, null)
	}).then(function(){
		for(var i = playerDoc.reports.length - 1; i >= 0; i--){
			var report = playerDoc.reports[i]
			report.index = i
			reports.push(report)
		}
		reports = reports.slice(fromIndex, fromIndex + Define.PlayerMaxReturnReportSize)

		return Promise.resolve()
	}).then(function(){
		callback(null, reports)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取玩家已存战报
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getSavedReports = function(playerId, fromIndex, callback){
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var reports = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.dataService.updatePlayerAsync(playerDoc, null)
	}).then(function(){
		for(var i = playerDoc.reports.length - 1; i >= 0; i--){
			var report = playerDoc.reports[i]
			report.index = i
			if(!!report.isSaved) reports.push(report)
		}
		reports = reports.slice(fromIndex, fromIndex + Define.PlayerMaxReturnReportSize)

		return Promise.resolve()
	}).then(function(){
		callback(null, reports)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 删除战报
 * @param playerId
 * @param reportIds
 * @param callback
 */
pro.deleteReports = function(playerId, reportIds, callback){
	if(!_.isArray(reportIds) || reportIds.length == 0){
		callback(new Error("reportIds 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc

		for(var i = 0; i < reportIds.length; i++){
			var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
			if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(playerId, reportIds[i]))
			playerData.push(["reports." + playerDoc.reports.indexOf(report), null])
			LogicUtils.removeItemInArray(playerDoc.reports, report)
		}

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取玩家可视化数据数据
 * @param playerId
 * @param targetPlayerId
 * @param callback
 */
pro.getPlayerViewData = function(playerId, targetPlayerId, callback){
	if(!_.isString(targetPlayerId)){
		callback(new Error("targetPlayerId 不合法"))
		return
	}
	if(_.isEqual(playerId, targetPlayerId)){
		callback(new Error("playerId, targetPlayerId: 不能查看自己的玩家数据"))
		return
	}

	var self = this
	var playerDoc = null
	var targetPlayerDoc = null
	var playerViewData = {}
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.dataService.directFindPlayerAsync(targetPlayerId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, targetPlayerId))
		targetPlayerDoc = doc
		playerViewData._id = targetPlayerDoc._id
		playerViewData.basicInfo = targetPlayerDoc.basicInfo
		playerViewData.buildings = targetPlayerDoc.buildings
		playerViewData.helpedByTroops = targetPlayerDoc.helpedByTroops

		return Promise.resolve()
	}).then(function(){
		callback(null, playerViewData)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置驻防使用的龙
 * @param playerId
 * @param dragonType
 * @param callback
 */
pro.setDefenceDragon = function(playerId, dragonType, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var defenceDragon = LogicUtils.getPlayerDefenceDragon(playerDoc)
		if(_.isObject(defenceDragon)){
			DataUtils.refreshPlayerDragonsHp(playerDoc, defenceDragon)
			defenceDragon.status = Consts.DragonStatus.Free
			playerData.push(["dragons." + defenceDragon.type, defenceDragon])
		}

		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragon.type))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(ErrorUtils.dragonIsNotFree(playerId, dragon))
		if(dragon.hp <= 0) return Promise.reject(ErrorUtils.dragonSelectedIsDead(playerId, dragon))
		dragon.status = Consts.DragonStatus.Defence
		playerData.push(["dragons." + dragon.type + ".status", dragon.status])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 取消驻防
 * @param playerId
 * @param callback
 */
pro.cancelDefenceDragon = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var dragon = LogicUtils.getPlayerDefenceDragon(playerDoc)
		if(!_.isObject(dragon)) return Promise.reject(ErrorUtils.noDragonInDefenceStatus(playerId, playerDoc.dragons))
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		dragon.status = Consts.DragonStatus.Free
		playerData.push(["dragons." + dragon.type, dragon])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 出售商品
 * @param playerId
 * @param type
 * @param name
 * @param count
 * @param price
 * @param callback
 */
pro.sellItem = function(playerId, type, name, count, price, callback){
	if(!_.contains(_.values(_.keys(Consts.ResourcesCanDeal)), type)){
		callback(new Error("type 不合法"))
		return
	}
	if(!_.contains(Consts.ResourcesCanDeal[type], name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		callback(new Error("count 不合法"))
		return
	}
	if(!_.isNumber(price) || price % 1 !== 0 || price <= 0){
		callback(new Error("price 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		if(!DataUtils.isPlayerSellQueueEnough(playerDoc)) return Promise.reject(ErrorUtils.sellQueueNotEnough(playerId))
		var realCount = _.isEqual(type, "resources") ? count * 1000 : count
		if(playerDoc[type][name] < realCount) return Promise.reject(ErrorUtils.resourceNotEnough(playerId, type, name, playerDoc[type][name], realCount))
		var cartNeed = DataUtils.getPlayerCartUsedForSale(playerDoc, type, name, realCount)
		if(cartNeed > playerDoc.resources.cart) return Promise.reject(ErrorUtils.cartNotEnough(playerId, playerDoc.resources.cart, cartNeed))

		playerDoc[type][name] -= realCount
		playerData.push([type + "." + name, playerDoc[type][name]])
		playerDoc.resources.cart -= cartNeed

		var deal = LogicUtils.createDeal(playerDoc, type, name, count, price)
		playerDoc.deals.push(deal.dealForPlayer)
		playerData.push(["deals." + playerDoc.deals.indexOf(deal.dealForPlayer), deal.dealForPlayer])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		updateFuncs.push([self.Deal, self.Deal.createAsync, deal.dealForAll])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取商品列表
 * @param playerId
 * @param type
 * @param name
 * @param callback
 */
pro.getSellItems = function(playerId, type, name, callback){
	if(!_.contains(_.values(_.keys(Consts.ResourcesCanDeal)), type)){
		callback(new Error("type 不合法"))
		return
	}
	if(!_.contains(Consts.ResourcesCanDeal[type], name)){
		callback(new Error("name 不合法"))
		return
	}
	if(!_.isString(name)){
		callback(new Error("name 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var itemDocs = null
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.Deal.find({
			"playerId":{$ne:playerDoc._id},
			"serverId":playerDoc.serverId,
			"itemData.type":type, "itemData.name":name
		}).sort({
			"itemData.price":1,
			"addedTime":1
		}).limit(Define.SellItemsMaxSize).exec()
	}).then(function(docs){
		itemDocs = docs
		return Promise.resolve()
	}).then(function(){
		callback(null, itemDocs)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 购买出售的商品
 * @param playerId
 * @param itemId
 * @param callback
 */
pro.buySellItem = function(playerId, itemId, callback){
	if(!_.isString(itemId)){
		callback(new Error("itemId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var sellerDoc = null
	var sellerData = []
	var itemDoc = null
	var pushFuncs = []
	var updateFuncs = []
	var funcs = []
	funcs.push(this.dataService.findPlayerAsync(playerId))
	funcs.push(this.Deal.findOneAsync({_id:itemId}))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		playerDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.sellItemNotExist(playerId, itemId))
		itemDoc = doc_2
		if(!_.isEqual(itemDoc.serverId, playerDoc.serverId)) return Promise.reject(ErrorUtils.sellItemNotExist(playerId, itemId))

		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		var type = itemDoc.itemData.type
		var count = itemDoc.itemData.count
		var realCount = _.isEqual(type, "resources") ? count * 1000 : count
		var totalPrice = itemDoc.itemData.price * count
		var buyedResources = DataUtils.buyResources(playerDoc, {coin:totalPrice}, playerDoc.resources)
		var gemUsed = buyedResources.gemUsed
		LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"createHouse"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		playerDoc.resources.coin -= totalPrice
		playerDoc[type][itemDoc.itemData.name] += realCount
		playerData.push([type + "." + itemDoc.itemData.name, playerDoc[type][itemDoc.itemData.name]])

		return self.dataService.findPlayerAsync(itemDoc.playerId)
	}).then(function(doc){
		sellerDoc = doc
		var sellItem = _.find(sellerDoc.deals, function(deal){
			return _.isEqual(deal.id, itemId)
		})
		sellItem.isSold = true
		sellerData.push(["deals." + sellerDoc.deals.indexOf(sellItem) + ".isSold", sellItem.isSold])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, sellerDoc, sellerDoc])
		updateFuncs.push([self.Deal, self.Deal.findOneAndRemoveAsync, {_id:itemId}])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, sellerDoc, sellerData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取出售后赚取的银币
 * @param playerId
 * @param itemId
 * @param callback
 */
pro.getMyItemSoldMoney = function(playerId, itemId, callback){
	if(!_.isString(itemId)){
		callback(new Error("itemId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var sellItem = _.find(playerDoc.deals, function(deal){
			return _.isEqual(deal.id, itemId)
		})
		if(!_.isObject(sellItem)) return Promise.reject(ErrorUtils.sellItemNotExist(playerId, itemId))
		if(!sellItem.isSold) return Promise.reject(ErrorUtils.sellItemNotSold(playerId, sellItem))
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		var totalPrice = sellItem.itemData.count * sellItem.itemData.price
		playerDoc.resources.coin += totalPrice
		playerData.push(["deals." + playerDoc.deals.indexOf(sellItem), null])
		LogicUtils.removeItemInArray(playerDoc.deals, sellItem)

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 下架商品
 * @param playerId
 * @param itemId
 * @param callback
 */
pro.removeMySellItem = function(playerId, itemId, callback){
	if(!_.isString(itemId)){
		callback(new Error("itemId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var itemDoc = null
	var updateFuncs = []
	var funcs = []
	funcs.push(this.dataService.findPlayerAsync(playerId))
	funcs.push(this.Deal.findOneAsync({_id:itemId}))
	Promise.all(funcs).spread(function(doc_1, doc_2){
		playerDoc = doc_1
		if(!_.isObject(doc_2)) return Promise.reject(ErrorUtils.sellItemNotExist(playerId, itemId))
		itemDoc = doc_2
		if(!_.isEqual(itemDoc.playerId, playerDoc._id)) return Promise.reject(ErrorUtils.sellItemNotBelongsToYou(playerId, itemDoc))
		var sellItem = _.find(playerDoc.deals, function(deal){
			return _.isEqual(deal.id, itemId)
		})
		if(!!sellItem.isSold) return Promise.reject(ErrorUtils.sellItemAlreadySold(playerId, sellItem))

		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		var type = itemDoc.itemData.type
		var count = itemDoc.itemData.count
		var realCount = _.isEqual(type, "resources") ? count * 1000 : count
		playerDoc[type][itemDoc.itemData.name] += realCount
		playerData.push([type + "." + itemDoc.itemData.name, playerDoc[type][itemDoc.itemData.name]])
		playerData.push(["deals." + playerDoc.deals.indexOf(sellItem), null])
		LogicUtils.removeItemInArray(playerDoc.deals, sellItem)

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		updateFuncs.push([self.Deal, self.Deal.findOneAndRemoveAsync, {_id:itemId}])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 设置玩家Apple Push Notification Id
 * @param playerId
 * @param apnId
 * @param callback
 */
pro.setApnId = function(playerId, apnId, callback){
	if(!_.isString(apnId)){
		callback(new Error("apnId 不合法"))
		return
	}
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isEqual(apnId, playerDoc.apnId)) return Promise.reject(ErrorUtils.ApnIdAlreadySeted(playerId, apnId))
		playerDoc.apnId = apnId
		playerData.push(["apnId", playerDoc.apnId])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		if(_.isObject(playerDoc.alliance)){
			return self.dataService.findAllianceAsync(playerDoc.alliance.id)
		}
		return Promise.resolve()
	}).then(function(doc){
		if(_.isObject(playerDoc.alliance)){
			allianceDoc = doc
			var member = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id)
			member.apnId = playerDoc.apnId
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		}
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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