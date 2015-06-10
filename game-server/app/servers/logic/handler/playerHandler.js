"use strict"

/**
 * Created by modun on 14-7-22.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")

var DataUtils = require("../../../utils/dataUtils")
var LogicUtils = require("../../../utils/logicUtils")
var ErrorUtils = require("../../../utils/errorUtils")
var ItemUtils = require("../../../utils/itemUtils")

var Consts = require("../../../consts/consts")
var Define = require("../../../consts/define")

var GameDatas = require("../../../datas/GameDatas")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.dataService = app.get('dataService')
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
	var e = null
	if(!_.isNumber(location) || location % 1 !== 0 || location < 1 || location > 22){
		e = new Error("location 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('upgradeBuilding', [session.uid, location, finishNow]).then(function(playerData){
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
	var e = null
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1){
		e = new Error("buildingLocation 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(_.values(Consts.ResourceBuildingMap), newBuildingName) || _.isEqual("townHall", newBuildingName)){
		e = new Error("newBuildingName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('switchBuilding', [session.uid, buildingLocation, newBuildingName]).then(function(playerData){
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
	var e = null
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 20){
		e = new Error("buildingLocation 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(houseType)){
		e = new Error("houseType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(houseLocation) || houseLocation % 1 !== 0 || houseLocation < 1 || houseLocation > 3){
		e = new Error("houseLocation 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('createHouse', [session.uid, buildingLocation, houseType, houseLocation, finishNow]).then(function(playerData){
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
	var e = null
	if(!_.isNumber(buildingLocation) || buildingLocation % 1 !== 0 || buildingLocation < 1 || buildingLocation > 20){
		e = new Error("buildingLocation 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(houseLocation) || houseLocation % 1 !== 0 || houseLocation < 1 || houseLocation > 3){
		e = new Error("houseLocation 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('upgradeHouse', [session.uid, buildingLocation, houseLocation, finishNow]).then(function(playerData){
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
	var e = null
	if(!_.contains(Consts.FreeSpeedUpAbleEventTypes, eventType)){
		e = new Error("eventType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(eventId)){
		e = new Error("eventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('freeSpeedUp', [session.uid, eventType, eventId]).then(function(playerData){
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
	var e = null
	if(!_.contains(Consts.MaterialType, category)){
		e = new Error("category 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('makeMaterial', [session.uid, category, finishNow]).then(function(playerData){
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
	var e = null
	if(!_.isString(eventId)){
		e = new Error("eventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getMaterials', [session.uid, eventId]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isNormalSoldier(soldierName)){
		e = new Error("soldierName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count < 1){
		e = new Error("count 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('recruitNormalSoldier', [session.uid, soldierName, count, finishNow]).then(function(playerData){
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
	var e = null
	if(!DataUtils.hasSpecialSoldier(soldierName)){
		e = new Error("soldierName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count < 1){
		e = new Error("count 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.canRecruitSpecialSoldier()){
		e = new Error("特殊兵种招募未开放")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('recruitSpecialSoldier', [session.uid, soldierName, count, finishNow]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isDragonEquipment(equipmentName)){
		e = new Error("equipmentName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('makeDragonEquipment', [session.uid, equipmentName, finishNow]).then(function(playerData){
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
	var e = null
	if(!_.isArray(soldiers)){
		e = new Error("soldiers 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('treatSoldier', [session.uid, soldiers, finishNow]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('hatchDragon', [session.uid, dragonType]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		e = new Error("equipmentCategory 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonEquipment(equipmentName)){
		e = new Error("equipmentName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonEquipmentLegalAtCategory(equipmentName, equipmentCategory)){
		e = new Error("equipmentName 不能装备到equipmentCategory")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonEquipmentLegalOnDragon(equipmentName, dragonType)){
		e = new Error("equipmentName 不能装备到dragonType")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('setDragonEquipment', [session.uid, dragonType, equipmentCategory, equipmentName]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		e = new Error("equipmentCategory 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isArray(equipments)){
		e = new Error("equipments 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('enhanceDragonEquipment', [session.uid, dragonType, equipmentCategory, equipments]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		e = new Error("equipmentCategory 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('resetDragonEquipment', [session.uid, dragonType, equipmentCategory]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(skillKey) || skillKey.trim().length > Define.InputLength.DragonSkillKey){
		e = new Error("skillKey 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('upgradeDragonSkill', [session.uid, dragonType, skillKey]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('upgradeDragonStar', [session.uid, dragonType]).then(function(playerData){
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
	this.dataService.requestAsync('getDailyQuests', [session.uid]).then(function(playerData){
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
	var e = null
	if(!_.isString(questId) || !ShortId.isValid(questId)){
		e = new Error("questId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('addDailyQuestStar', [session.uid, questId]).then(function(playerData){
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
	var e = null
	if(!_.isString(questId) || !ShortId.isValid(questId)){
		e = new Error("questId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('startDailyQuest', [session.uid, questId]).then(function(playerData){
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
	var e = null
	if(!_.isString(questEventId) || !ShortId.isValid(questEventId)){
		e = new Error("questEventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getDailyQeustReward', [session.uid, questEventId]).then(function(playerData){
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
	var e = null
	if(!_.contains(Consts.AllianceLanguage, language)){
		e = new Error("language 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('setPlayerLanguage', [session.uid, language]).then(function(playerData){
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
	var e = null
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		e = new Error("memberId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getPlayerInfo', [session.uid, memberId]).then(function(playerViewData){
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
	var e = null
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		e = new Error("memberId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, memberId)){
		e = new Error("不能给自己发邮件")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(title) || title.trim().length > Define.InputLength.MailTitle){
		e = new Error("title 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(content) || content.trim().length > Define.InputLength.MailContent){
		e = new Error("content 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('sendMail', [session.uid, memberId, title, content]).then(function(){
		next(null, {code:200})
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
	var e = null
	if(!_.isArray(mailIds) || mailIds.length == 0){
		e = new Error("mailIds 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	for(var i = 0; i < mailIds.length; i++){
		if(!ShortId.isValid(mailIds[i])){
			e = new Error("mailIds 不合法")
			next(e, ErrorUtils.getError(e))
			return
		}
	}

	this.dataService.requestAsync('readMails', [session.uid, mailIds]).then(function(playerData){
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
	var e = null
	if(!_.isString(mailId) || !ShortId.isValid(mailId)){
		e = new Error("mailId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('saveMail', [session.uid, mailId]).then(function(playerData){
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
	var e = null
	if(!_.isString(mailId) || !ShortId.isValid(mailId)){
		e = new Error("mailId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('unSaveMail', [session.uid, mailId]).then(function(playerData){
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
	var e = null
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		e = new Error("fromIndex 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getMails', [session.uid, fromIndex]).then(function(mails){
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
	var e = null
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		e = new Error("fromIndex 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getSendMails', [session.uid, fromIndex]).then(function(mails){
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
	var e = null
	if(!_.isNumber(fromIndex) || fromIndex % 10 !== 0 || fromIndex < 0){
		e = new Error("fromIndex 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getSavedMails', [session.uid, fromIndex]).then(function(mails){
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
	var e = null
	if(!_.isArray(mailIds) || mailIds.length == 0){
		e = new Error("mailIds 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	for(var i = 0; i < mailIds.length; i ++){
		if(!ShortId.isValid(mailIds[i])){
			e = new Error("mailIds 不合法")
			next(e, ErrorUtils.getError(e))
			return
		}
	}

	this.dataService.requestAsync('deleteMails', [session.uid, mailIds]).then(function(playerData){
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
	var e = null
	if(!_.isArray(reportIds) || reportIds.length == 0){
		e = new Error("reportIds 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	for(var i = 0; i < reportIds.length; i ++){
		if(!ShortId.isValid(reportIds[i])){
			e = new Error("reportIds 不合法")
			next(e, ErrorUtils.getError(e))
			return
		}
	}

	this.dataService.requestAsync('readReports', [session.uid, reportIds]).then(function(playerData){
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
	var e = null
	if(!_.isString(reportId) || !ShortId.isValid(reportId)){
		e = new Error("reportId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('saveReport', [session.uid, reportId]).then(function(playerData){
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
	var e = null
	if(!_.isString(reportId) || !ShortId.isValid(reportId)){
		e = new Error("reportId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('unSaveReport', [session.uid, reportId]).then(function(playerData){
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
	var e = null
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		e = new Error("fromIndex 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getReports', [session.uid, fromIndex]).then(function(reports){
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
	var e = null
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		e = new Error("fromIndex 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getSavedReports', [session.uid, fromIndex]).then(function(reports){
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
	var e = null
	if(!_.isArray(reportIds) || reportIds.length == 0){
		e = new Error("reportIds 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	for(var i = 0; i < reportIds.length; i ++){
		if(!ShortId.isValid(reportIds[i])){
			e = new Error("reportIds 不合法")
			next(e, ErrorUtils.getError(e))
			return
		}
	}

	this.dataService.requestAsync('deleteReports', [session.uid, reportIds]).then(function(playerData){
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
	var e = null
	if(!_.isString(targetPlayerId) || !ShortId.isValid(targetPlayerId)){
		e = new Error("targetPlayerId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, targetPlayerId)){
		e = new Error("不能查看自己的玩家数据")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getPlayerViewData', [session.uid, targetPlayerId]).then(function(playerViewData){
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
	var e = null
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('setDefenceDragon', [session.uid, dragonType]).then(function(playerData){
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
	this.dataService.requestAsync('cancelDefenceDragon', [session.uid]).then(function(playerData){
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
	var e = null
	if(!_.contains(_.values(_.keys(Consts.ResourcesCanDeal)), type)){
		e = new Error("type 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.ResourcesCanDeal[type], name)){
		e = new Error("name 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(name)){
		e = new Error("name 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		e = new Error("count 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(price) || price % 1 !== 0 || price <= 0){
		e = new Error("price 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('sellItem', [session.uid, type, name, count, price]).then(function(playerData){
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
	var e = null
	if(!_.contains(_.values(_.keys(Consts.ResourcesCanDeal)), type)){
		e = new Error("type 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.ResourcesCanDeal[type], name)){
		e = new Error("name 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(name)){
		e = new Error("name 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getSellItems', [session.uid, type, name]).then(function(itemDocs){
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
	var e = null
	if(!_.isString(itemId) || !ShortId.isValid(itemId)){
		e = new Error("itemId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('buySellItem', [session.uid, itemId]).then(function(playerData){
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
	var e = null
	if(!_.isString(itemId) || !ShortId.isValid(itemId)){
		e = new Error("itemId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getMyItemSoldMoney', [session.uid, itemId]).then(function(playerData){
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
	var e = null
	if(!_.isString(itemId) || !ShortId.isValid(itemId)){
		e = new Error("itemId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('removeMySellItem', [session.uid, itemId]).then(function(playerData){
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
	var e = null
	if(!_.isString(apnId)){
		e = new Error("apnId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('setApnId', [session.uid, apnId]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isProductionTechNameLegal(techName)){
		e = new Error("techName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('upgradeProductionTech', [session.uid, techName, finishNow]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isMilitaryTechNameLegal(techName)){
		e = new Error("techName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('upgradeMilitaryTech', [session.uid, techName, finishNow]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isNormalSoldier(soldierName)){
		e = new Error("soldierName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(finishNow)){
		e = new Error("finishNow 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('upgradeSoldierStar', [session.uid, soldierName, finishNow]).then(function(playerData){
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
	var e = null
	if(!_.contains(_.values(Consts.AllianceTerrain), terrain)){
		e = new Error("terrain 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('setTerrain', [session.uid, terrain]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isItemNameExist(itemName)){
		e = new Error("itemName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		e = new Error("count 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('buyItem', [session.uid, itemName, count]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isItemNameExist(itemName)){
		e = new Error("itemName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isObject(params) || !ItemUtils.isParamsLegal(itemName, params)){
		e = new Error("params 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('useItem', [session.uid, itemName, params]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isItemNameExist(itemName)){
		e = new Error("itemName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isObject(params) || !ItemUtils.isParamsLegal(itemName, params)){
		e = new Error("params 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('buyAndUseItem', [session.uid, itemName, params]).then(function(playerData){
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
	var e = null
	if(!_.isObject(pveData)){
		e = new Error("pveData 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isUndefined(fightData) && !_.isObject(fightData)){
		e = new Error("fightData 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isUndefined(rewards) && !_.isObject(rewards)){
		e = new Error("rewards 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('setPveData', [session.uid, pveData, fightData, rewards]).then(function(playerData){
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
	var e = null
	if(!_.contains(_.values(Consts.GachaType), type)){
		e = new Error("type 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('gacha', [session.uid, type]).then(function(playerData){
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
	var e = null
	if(!_.isString(gcId)){
		e = new Error("gcId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getGcBindStatus', [session.uid, gcId]).then(function(isBind){
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
	var e = null
	if(!_.isString(gcId)){
		e = new Error("gcId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('bindGcId', [session.uid, gcId]).then(function(playerData){
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
	var e = null
	if(!_.isString(gcId)){
		e = new Error("gcId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('switchGcId', [session.uid, session.get("deviceId"), gcId]).then(function(){
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
	var e = null
	if(!_.isString(gcId)){
		e = new Error("gcId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('forceSwitchGcId', [session.uid, session.get("deviceId"), gcId]).then(function(){
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
	this.dataService.requestAsync('getDay60Reward', [session.uid]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isOnLineTimePointExist(timePoint)){
		e = new Error("timePoint 不合法")
		next(e, ErrorUtils.getError(e))
	}

	this.dataService.requestAsync('getOnlineReward', [session.uid, timePoint]).then(function(playerData){
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
	this.dataService.requestAsync('getDay14Reward', [session.uid]).then(function(playerData){
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
	var e = null
	if(!DataUtils.isLevelupIndexExist(levelupIndex)){
		e = new Error("levelupIndex 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getLevelupReward', [session.uid, levelupIndex]).then(function(playerData){
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
	var e = null
	if(!_.isString(transactionId)){
		e = new Error("transactionId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(receiptData) || _.isEmpty(receiptData.trim())){
		e = new Error("receiptData 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('addPlayerBillingData', [session.uid, transactionId, receiptData]).spread(function(playerData, transactionId){
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
	this.dataService.requestAsync('getFirstIAPRewards', [session.uid]).then(function(playerData){
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
	this.dataService.requestAsync('passSelinasTest', [session.uid]).then(function(playerData){
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
	var e = null
	if(!_.contains(_.values(Consts.DailyTaskTypes), taskType)){
		e = new Error("taskType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getDailyTaskRewards', [session.uid, taskType]).then(function(playerData){
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
	var e = null
	if(!_.contains(Consts.GrowUpTaskTypes, taskType)){
		e = new Error("taskType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(taskId) || taskId % 1 !== 0 || taskId < 0){
		e = new Error("taskId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getGrowUpTaskRewards', [session.uid, taskType, taskId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟其他玩家赠送的礼品
 * @param msg
 * @param session
 * @param next
 */
pro.getIapGift = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getIapGift", {playerId:session.uid, msg:msg})
	var giftId = msg.giftId
	var e = null
	if(!_.isString(giftId) || !ShortId.isValid(giftId)){
		e = new Error("giftId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getIapGift', [session.uid, giftId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取服务器列表
 * @param msg
 * @param session
 * @param next
 */
pro.getServers = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getServers", {playerId:session.uid, msg:msg})
	this.dataService.requestAsync('getServers', [session.uid]).then(function(servers){
		next(null, {code:200, servers:servers})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 切换服务器
 * @param msg
 * @param session
 * @param next
 */
pro.switchServer = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.switchServer", {playerId:session.uid, msg:msg})
	var serverId = msg.serverId
	var e = null
	if(!_.isString(serverId)){
		e = new Error("serverId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('switchServer', [session.uid, serverId]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 设置玩家头像
 * @param msg
 * @param session
 * @param next
 */
pro.setPlayerIcon = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.setPlayerIcon", {playerId:session.uid, msg:msg})
	var icon = msg.icon
	var e = null
	if(!_.isNumber(icon) || icon % 1 !== 0 || icon < 1 || icon > 11){
		e = new Error("icon 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('setPlayerIcon', [session.uid, icon]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 解锁玩家第二条队列
 * @param msg
 * @param session
 * @param next
 */
pro.unlockPlayerSecondMarchQueue = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.unlockPlayerSecondMarchQueue", {playerId:session.uid, msg:msg})
	this.dataService.requestAsync('unlockPlayerSecondMarchQueue', [session.uid]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 初始化玩家数据
 * @param msg
 * @param session
 * @param next
 */
pro.initPlayerData = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.initPlayerData", {playerId:session.uid, msg:msg})
	var terrain = msg.terrain
	var language = msg.language
	var e = null
	if(!_.contains(_.values(Consts.AllianceTerrain), terrain)){
		e = new Error("terrain 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		e = new Error("language 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('initPlayerData', [session.uid, terrain, language]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 领取首次加入联盟奖励
 * @param msg
 * @param session
 * @param next
 */
pro.getFirstJoinAllianceReward = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getFirstJoinAllianceReward", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getFirstJoinAllianceReward', [session.uid, allianceId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 完成新手引导
 * @param msg
 * @param session
 * @param next
 */
pro.finishFTE = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.finishFTE", {playerId:session.uid, msg:msg})
	this.dataService.requestAsync('finishFTE', [session.uid]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取玩家城墙血量
 * @param msg
 * @param session
 * @param next
 */
pro.getPlayerWallInfo = function(msg, session, next){
	this.logService.onRequest("logic.playerHandler.getPlayerWallInfo", {playerId:session.uid, msg:msg})
	var memberId = msg.memberId
	var e = null
	if(!ShortId.isValid(memberId)){
		e = new Error("questId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.dataService.requestAsync('getPlayerWallInfo', [session.uid, memberId]).then(function(wallInfo){
		next(null, {code:200, wallInfo:wallInfo})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}