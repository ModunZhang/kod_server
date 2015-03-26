"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var ErrorUtils = require("../../../utils/errorUtils")

var GameDatas = require("../../../datas/GameDatas")
var Errors = GameDatas.Errors.errors

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.apnService = app.get("apnService")
	this.logService = app.get("logService")
	this.playerIAPService = app.get("playerIAPService")
	this.playerApiService = app.get("playerApiService")
	this.playerApiService2 = app.get("playerApiService2")
	this.playerApiService3 = app.get("playerApiService3")
	this.playerApiService4 = app.get("playerApiService4")
	this.playerApiService5 = app.get("playerApiService5")
}
var pro = Handler.prototype

/**
 * 升级大建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeBuilding = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.upgradeBuilding", {playerId:session.uid, msg:msg})
	var location = msg.location
	var finishNow = msg.finishNow

	this.playerApiService.upgradeBuildingAsync(session.uid, location, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 转换生产建筑类型
 * @param msg
 * @param session
 * @param next
 */
pro.switchBuilding = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.switchBuilding", {playerId:session.uid, msg:msg})
	var buildingLocation = msg.buildingLocation
	var newBuildingName = msg.newBuildingName
	this.playerApiService.switchBuildingAsync(session.uid, buildingLocation, newBuildingName).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 创建小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.createHouse = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.createHouse", {playerId:session.uid, msg:msg})
	var buildingLocation = msg.buildingLocation
	var houseType = msg.houseType
	var houseLocation = msg.houseLocation
	var finishNow = msg.finishNow

	this.playerApiService.createHouseAsync(session.uid, buildingLocation, houseType, houseLocation, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeHouse = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.upgradeHouse", {playerId:session.uid, msg:msg})
	var buildingLocation = msg.buildingLocation
	var houseLocation = msg.houseLocation
	var finishNow = msg.finishNow

	this.playerApiService.upgradeHouseAsync(session.uid, buildingLocation, houseLocation, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 建筑升级加速
 * @param msg
 * @param session
 * @param next
 */
pro.freeSpeedUp = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.freeSpeedUp", {playerId:session.uid, msg:msg})
	var eventType = msg.eventType
	var eventId = msg.eventId

	this.playerApiService.freeSpeedUpAsync(session.uid, eventType, eventId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 制作材料
 * @param msg
 * @param session
 * @param next
 */
pro.makeMaterial = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.makeMaterial", {playerId:session.uid, msg:msg})
	var category = msg.category
	var finishNow = msg.finishNow
	this.playerApiService.makeMaterialAsync(session.uid, category, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 领取制作完成
 * @param msg
 * @param session
 * @param next
 */
pro.getMaterials = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getMaterials", {playerId:session.uid, msg:msg})
	var eventId = msg.eventId
	this.playerApiService.getMaterialsAsync(session.uid, eventId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 招募普通士兵
 * @param msg
 * @param session
 * @param next
 */
pro.recruitNormalSoldier = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.recruitNormalSoldier", {playerId:session.uid, msg:msg})
	var soldierName = msg.soldierName
	var count = msg.count
	var finishNow = msg.finishNow

	this.playerApiService.recruitNormalSoldierAsync(session.uid, soldierName, count, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 招募特殊士兵
 * @param msg
 * @param session
 * @param next
 */
pro.recruitSpecialSoldier = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.recruitSpecialSoldier", {playerId:session.uid, msg:msg})
	var soldierName = msg.soldierName
	var count = msg.count
	var finishNow = msg.finishNow

	this.playerApiService.recruitSpecialSoldierAsync(session.uid, soldierName, count, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 制作龙装备
 * @param msg
 * @param session
 * @param next
 */
pro.makeDragonEquipment = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.makeDragonEquipment", {playerId:session.uid, msg:msg})
	var equipmentName = msg.equipmentName
	var finishNow = msg.finishNow
	this.playerApiService2.makeDragonEquipmentAsync(session.uid, equipmentName, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 治疗士兵
 * @param msg
 * @param session
 * @param next
 */
pro.treatSoldier = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.treatSoldier", {playerId:session.uid, msg:msg})
	var soldiers = msg.soldiers
	var finishNow = msg.finishNow
	this.playerApiService2.treatSoldierAsync(session.uid, soldiers, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 孵化龙蛋
 * @param msg
 * @param session
 * @param next
 */
pro.hatchDragon = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.hatchDragon", {playerId:session.uid, msg:msg})
	var dragonType = msg.dragonType
	this.playerApiService2.hatchDragonAsync(session.uid, dragonType).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 设置龙的装备
 * @param msg
 * @param session
 * @param next
 */
pro.setDragonEquipment = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.setDragonEquipment", {playerId:session.uid, msg:msg})
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	var equipmentName = msg.equipmentName
	this.playerApiService2.setDragonEquipmentAsync(session.uid, dragonType, equipmentCategory, equipmentName).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 强化龙的装备
 * @param msg
 * @param session
 * @param next
 */
pro.enhanceDragonEquipment = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.enhanceDragonEquipment", {playerId:session.uid, msg:msg})
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	var equipments = msg.equipments
	this.playerApiService2.enhanceDragonEquipmentAsync(session.uid, dragonType, equipmentCategory, equipments).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 重置龙的装备的随机Buff
 * @param msg
 * @param session
 * @param next
 */
pro.resetDragonEquipment = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.resetDragonEquipment", {playerId:session.uid, msg:msg})
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	this.playerApiService2.resetDragonEquipmentAsync(session.uid, dragonType, equipmentCategory).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级龙的技能
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeDragonSkill = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.upgradeDragonSkill", {playerId:session.uid, msg:msg})
	var dragonType = msg.dragonType
	var skillKey = msg.skillKey
	this.playerApiService2.upgradeDragonSkillAsync(session.uid, dragonType, skillKey).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级龙的星级
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeDragonStar = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.upgradeDragonStar", {playerId:session.uid, msg:msg})
	var dragonType = msg.dragonType
	this.playerApiService2.upgradeDragonStarAsync(session.uid, dragonType).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取每日任务列表
 * @param msg
 * @param session
 * @param next
 */
pro.getDailyQuests = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getDailyQuests", {playerId:session.uid, msg:msg})
	this.playerApiService2.getDailyQuestsAsync(session.uid).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 为每日任务中某个任务增加星级
 * @param msg
 * @param session
 * @param next
 */
pro.addDailyQuestStar = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.addDailyQuestStar", {playerId:session.uid, msg:msg})
	var questId = msg.questId
	this.playerApiService2.addDailyQuestStarAsync(session.uid, questId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 开始一个每日任务
 * @param msg
 * @param session
 * @param next
 */
pro.startDailyQuest = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.startDailyQuest", {playerId:session.uid, msg:msg})
	var questId = msg.questId
	this.playerApiService2.startDailyQuestAsync(session.uid, questId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 领取每日任务奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getDailyQeustReward = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getDailyQeustReward", {playerId:session.uid, msg:msg})
	var questEventId = msg.questEventId
	this.playerApiService2.getDailyQeustRewardAsync(session.uid, questEventId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 设置玩家语言
 * @param msg
 * @param session
 * @param next
 */
pro.setPlayerLanguage = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.setPlayerLanguage", {playerId:session.uid, msg:msg})
	var language = msg.language
	this.playerApiService2.setPlayerLanguageAsync(session.uid, language).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家个人信息
 * @param msg
 * @param session
 * @param next
 */
pro.getPlayerInfo = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getPlayerInfo", {playerId:session.uid, msg:msg})
	var memberId = msg.memberId
	this.playerApiService2.getPlayerInfoAsync(session.uid, memberId).then(function(playerViewData){
		next(null, {code:200, playerViewData:playerViewData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 发送个人邮件
 * @param msg
 * @param session
 * @param next
 */
pro.sendMail = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.sendMail", {playerId:session.uid, msg:msg})
	var memberId = msg.memberId
	var title = msg.title
	var content = msg.content
	this.playerApiService2.sendMailAsync(session.uid, memberId, title, content).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 阅读邮件
 * @param msg
 * @param session
 * @param next
 */
pro.readMails = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.readMails", {playerId:session.uid, msg:msg})
	var mailIds = msg.mailIds
	this.playerApiService2.readMailsAsync(session.uid, mailIds).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 收藏邮件
 * @param msg
 * @param session
 * @param next
 */
pro.saveMail = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.saveMail", {playerId:session.uid, msg:msg})
	var mailId = msg.mailId
	this.playerApiService2.saveMailAsync(session.uid, mailId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 取消收藏邮件
 * @param msg
 * @param session
 * @param next
 */
pro.unSaveMail = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.unSaveMail", {playerId:session.uid, msg:msg})
	var mailId = msg.mailId
	this.playerApiService3.unSaveMailAsync(session.uid, mailId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家邮件
 * @param msg
 * @param session
 * @param next
 */
pro.getMails = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getMails", {playerId:session.uid, msg:msg})
	var fromIndex = msg.fromIndex
	this.playerApiService3.getMailsAsync(session.uid, fromIndex).then(function(mails){
		next(null, {code:200, mails:mails})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家已发邮件
 * @param msg
 * @param session
 * @param next
 */
pro.getSendMails = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getSendMails", {playerId:session.uid, msg:msg})
	var fromIndex = msg.fromIndex
	this.playerApiService3.getSendMailsAsync(session.uid, fromIndex).then(function(mails){
		next(null, {code:200, mails:mails})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家已存邮件
 * @param msg
 * @param session
 * @param next
 */
pro.getSavedMails = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getSavedMails", {playerId:session.uid, msg:msg})
	var fromIndex = msg.fromIndex
	this.playerApiService3.getSavedMailsAsync(session.uid, fromIndex).then(function(mails){
		next(null, {code:200, mails:mails})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 删除邮件
 * @param msg
 * @param session
 * @param next
 */
pro.deleteMails = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.deleteMails", {playerId:session.uid, msg:msg})
	var mailIds = msg.mailIds
	this.playerApiService3.deleteMailsAsync(session.uid, mailIds).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 阅读战报
 * @param msg
 * @param session
 * @param next
 */
pro.readReports = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.readReports", {playerId:session.uid, msg:msg})
	var reportIds = msg.reportIds
	this.playerApiService3.readReportsAsync(session.uid, reportIds).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 收藏战报
 * @param msg
 * @param session
 * @param next
 */
pro.saveReport = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.saveReport", {playerId:session.uid, msg:msg})
	var reportId = msg.reportId
	this.playerApiService3.saveReportAsync(session.uid, reportId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 取消收藏战报
 * @param msg
 * @param session
 * @param next
 */
pro.unSaveReport = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.unSaveReport", {playerId:session.uid, msg:msg})
	var reportId = msg.reportId
	this.playerApiService3.unSaveReportAsync(session.uid, reportId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家战报
 * @param msg
 * @param session
 * @param next
 */
pro.getReports = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getReports", {playerId:session.uid, msg:msg})
	var fromIndex = msg.fromIndex
	this.playerApiService3.getReportsAsync(session.uid, fromIndex).then(function(reports){
		next(null, {code:200, reports:reports})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家已存战报
 * @param msg
 * @param session
 * @param next
 */
pro.getSavedReports = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getSavedReports", {playerId:session.uid, msg:msg})
	var fromIndex = msg.fromIndex
	this.playerApiService3.getSavedReportsAsync(session.uid, fromIndex).then(function(reports){
		next(null, {code:200, reports:reports})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 删除战报
 * @param msg
 * @param session
 * @param next
 */
pro.deleteReports = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.deleteReports", {playerId:session.uid, msg:msg})
	var reportIds = msg.reportIds
	this.playerApiService3.deleteReportsAsync(session.uid, reportIds).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家可视化数据数据
 * @param msg
 * @param session
 * @param next
 */
pro.getPlayerViewData = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getPlayerViewData", {playerId:session.uid, msg:msg})
	var targetPlayerId = msg.targetPlayerId
	this.playerApiService3.getPlayerViewDataAsync(session.uid, targetPlayerId).then(function(playerViewData){
		next(null, {code:200, playerViewData:playerViewData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 设置驻防使用的龙
 * @param msg
 * @param session
 * @param next
 */
pro.setDefenceDragon = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.setDefenceDragon", {playerId:session.uid, msg:msg})
	var dragonType = msg.dragonType
	this.playerApiService3.setDefenceDragonAsync(session.uid, dragonType).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 取消驻防
 * @param msg
 * @param session
 * @param next
 */
pro.cancelDefenceDragon = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.cancelDefenceDragon", {playerId:session.uid, msg:msg})
	this.playerApiService3.cancelDefenceDragonAsync(session.uid).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 出售商品
 * @param msg
 * @param session
 * @param next
 */
pro.sellItem = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.sellItem", {playerId:session.uid, msg:msg})
	var type = msg.type
	var name = msg.name
	var count = msg.count
	var price = msg.price
	this.playerApiService3.sellItemAsync(session.uid, type, name, count, price).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取商品列表
 * @param msg
 * @param session
 * @param next
 */
pro.getSellItems = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getSellItems", {playerId:session.uid, msg:msg})
	var type = msg.type
	var name = msg.name
	this.playerApiService3.getSellItemsAsync(session.uid, type, name).then(function(itemDocs){
		next(null, {code:200, itemDocs:itemDocs})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 购买出售的商品
 * @param msg
 * @param session
 * @param next
 */
pro.buySellItem = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.buySellItem", {playerId:session.uid, msg:msg})
	var itemId = msg.itemId
	this.playerApiService3.buySellItemAsync(session.uid, itemId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取出售后赚取的银币
 * @param msg
 * @param session
 * @param next
 */
pro.getMyItemSoldMoney = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getMyItemSoldMoney", {playerId:session.uid, msg:msg})
	var itemId = msg.itemId
	this.playerApiService3.getMyItemSoldMoneyAsync(session.uid, itemId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 下架商品
 * @param msg
 * @param session
 * @param next
 */
pro.removeMySellItem = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.removeMySellItem", {playerId:session.uid, msg:msg})
	var itemId = msg.itemId
	this.playerApiService3.removeMySellItemAsync(session.uid, itemId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 设置玩家Apple Push Notification Id
 * @param msg
 * @param session
 * @param next
 */
pro.setApnId = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.setApnId", {playerId:session.uid, msg:msg})
	var apnId = msg.apnId
	this.playerApiService3.setApnIdAsync(session.uid, apnId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级生产科技
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeProductionTech = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.upgradeProductionTech", {playerId:session.uid, msg:msg})
	var techName = msg.techName
	var finishNow = msg.finishNow
	this.playerApiService4.upgradeProductionTechAsync(session.uid, techName, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级军事科技
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeMilitaryTech = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.upgradeMilitaryTech", {playerId:session.uid, msg:msg})
	var techName = msg.techName
	var finishNow = msg.finishNow
	this.playerApiService4.upgradeMilitaryTechAsync(session.uid, techName, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级士兵星级
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeSoldierStar = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.upgradeSoldierStar", {playerId:session.uid, msg:msg})
	var soldierName = msg.soldierName
	var finishNow = msg.finishNow
	this.playerApiService4.upgradeSoldierStarAsync(session.uid, soldierName, finishNow).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 设置玩家地形
 * @param msg
 * @param session
 * @param next
 */
pro.setTerrain = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.setTerrain", {playerId:session.uid, msg:msg})
	var terrain = msg.terrain
	this.playerApiService4.setTerrainAsync(session.uid, terrain).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 购买道具
 * @param msg
 * @param session
 * @param next
 */
pro.buyItem = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.buyItem", {playerId:session.uid, msg:msg})
	var itemName = msg.itemName
	var count = msg.count
	this.playerApiService4.buyItemAsync(session.uid, itemName, count).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 使用道具
 * @param msg
 * @param session
 * @param next
 */
pro.useItem = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.useItem", {playerId:session.uid, msg:msg})
	var itemName = msg.itemName
	var params = msg.params
	this.playerApiService4.useItemAsync(session.uid, itemName, params).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 购买并使用道具
 * @param msg
 * @param session
 * @param next
 */
pro.buyAndUseItem = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.buyAndUseItem", {playerId:session.uid, msg:msg})
	var itemName = msg.itemName
	var params = msg.params
	this.playerApiService4.buyAndUseItemAsync(session.uid, itemName, params).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 上传玩家PVE数据
 * @param msg
 * @param session
 * @param next
 */
pro.setPveData = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.setPveData", {playerId:session.uid, msg:msg})
	var pveData = msg.pveData
	var fightData = msg.fightData
	var rewards = msg.rewards
	this.playerApiService4.setPveDataAsync(session.uid, pveData, fightData, rewards).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * gacha
 * @param msg
 * @param session
 * @param next
 */
pro.gacha = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.gacha", {playerId:session.uid, msg:msg})
	var type = msg.type
	this.playerApiService4.gachaAsync(session.uid, type).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取GameCenter账号绑定状态
 * @param msg
 * @param session
 * @param next
 */
pro.getGcBindStatus = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getGcBindStatus", {playerId:session.uid, msg:msg})
	var gcId = msg.gcId
	this.playerApiService4.getGcBindStatusAsync(session.uid, gcId).then(function(isBind){
		next(null, {code:200, isBind:isBind})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 设置GameCenter Id
 * @param msg
 * @param session
 * @param next
 */
pro.bindGcId = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.bindGcId", {playerId:session.uid, msg:msg})
	var gcId = msg.gcId
	this.playerApiService4.bindGcIdAsync(session.uid, gcId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 强制绑定GameCenter账号到当前玩家数据,取消原GameCenter账号下的玩家数据绑定
 * @param msg
 * @param session
 * @param next
 */
pro.forceBindGcId = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.forceBindGcId", {playerId:session.uid, msg:msg})
	var gcId = msg.gcId
	this.playerApiService4.forceBindGcIdAsync(session.uid, gcId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 切换GameCenter账号
 * @param msg
 * @param session
 * @param next
 */
pro.switchGcId = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.switchGcId", {playerId:session.uid, msg:msg})
	var gcId = msg.gcId
	this.playerApiService4.switchGcIdAsync(session.uid, session.get("deviceId"), gcId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 强制切换GameCenter账号到原GameCenter账号下的玩家数据,当前未绑定的玩家账号数据会丢失
 * @param msg
 * @param session
 * @param next
 */
pro.forceSwitchGcId = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.forceSwitchGcId", {playerId:session.uid, msg:msg})
	var gcId = msg.gcId
	this.playerApiService4.forceSwitchGcIdAsync(session.uid, session.get("deviceId"), gcId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取每日登陆奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getDay60Reward = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getDay60Reward", {playerId:session.uid, msg:msg})
	this.playerApiService5.getDay60RewardAsync(session.uid).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取每日在线奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getOnlineReward = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getOnlineReward", {playerId:session.uid, msg:msg})
	var timePoint = msg.timePoint
	this.playerApiService5.getOnlineRewardAsync(session.uid, timePoint).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取14日登陆奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getDay14Reward = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getDay14Reward", {playerId:session.uid, msg:msg})
	this.playerApiService5.getDay14RewardAsync(session.uid).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取新玩家冲级奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getLevelupReward = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getLevelupReward", {playerId:session.uid, msg:msg})
	var levelupIndex = msg.levelupIndex
	this.playerApiService5.getLevelupRewardAsync(session.uid, levelupIndex).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 上传IAP信息
 * @param msg
 * @param session
 * @param next
 */
pro.addPlayerBillingData = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.addPlayerBillingData", {playerId:session.uid, msg:msg})
	var transactionId = msg.transactionId
	var receiptData = msg.receiptData
	this.playerIAPService.addPlayerBillingDataAsync(session.uid, transactionId, receiptData).spread(function(playerData, transactionId){
		next(null, {code:200, playerData:playerData, transactionId:transactionId})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取新玩家冲级奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getFirstIAPRewards = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getFirstIAPRewards", {playerId:session.uid, msg:msg})
	this.playerApiService5.getFirstIAPRewardsAsync(session.uid).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 通过Selina的考验
 * @param msg
 * @param session
 * @param next
 */
pro.passSelinasTest = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.passSelinasTest", {playerId:session.uid, msg:msg})
	this.playerApiService5.passSelinasTestAsync(session.uid).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 领取日常任务奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getDailyTaskRewards = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getDailyTaskRewards", {playerId:session.uid, msg:msg})
	var taskType = msg.taskType
	this.playerApiService5.getDailyTaskRewardsAsync(session.uid, taskType).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 领取成就任务奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getGrowUpTaskRewards = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getGrowUpTaskRewards", {playerId:session.uid, msg:msg})
	var taskType = msg.taskType
	var taskId = msg.taskId
	this.playerApiService5.getGrowUpTaskRewardsAsync(session.uid, taskType, taskId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家排名信息
 * @param msg
 * @param session
 * @param next
 */
pro.getPlayerRankList = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getPlayerRankList", {playerId:session.uid, msg:msg})
	var rankType = msg.rankType
	var fromRank = msg.fromRank
	this.playerApiService5.getPlayerRankListAsync(session.uid, rankType, fromRank).spread(function(myRank, rankData){
		next(null, {code:200, myRank:myRank, rankData:rankData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟排名信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAllianceRankList = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getAllianceRankList", {playerId:session.uid, msg:msg})
	var rankType = msg.rankType
	var fromRank = msg.fromRank
	this.playerApiService5.getAllianceRankListAsync(session.uid, rankType, fromRank).spread(function(myRank, rankData){
		next(null, {code:200, myRank:myRank, rankData:rankData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}