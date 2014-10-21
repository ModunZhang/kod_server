"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.playerService = this.app.get("playerService")
}

var pro = Handler.prototype

/**
 * 主动获取玩家联盟的信息
 * @param msg
 * @param session
 * @param next
 */
pro.getMyAllianceData = function(msg, session, next){
	this.playerService.getMyAllianceDataAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级大建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeBuilding = function(msg, session, next){
	var location = msg.location
	var finishNow = msg.finishNow

	this.playerService.upgradeBuildingAsync(session.uid, location, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 建筑升级加速
 * @param msg
 * @param session
 * @param next
 */
pro.speedupBuildingBuild = function(msg, session, next){
	var location = msg.location

	this.playerService.speedupBuildingBuildAsync(session.uid, location).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 创建小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.createHouse = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseType = msg.houseType
	var houseLocation = msg.houseLocation
	var finishNow = msg.finishNow

	this.playerService.createHouseAsync(session.uid, buildingLocation, houseType, houseLocation, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeHouse = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseLocation = msg.houseLocation
	var finishNow = msg.finishNow

	this.playerService.upgradeHouseAsync(session.uid, buildingLocation, houseLocation, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 加速小屋建造和升级
 * @param msg
 * @param session
 * @param next
 */
pro.speedupHouseBuild = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseLocation = msg.houseLocation
	this.playerService.speedupHouseBuildAsync(session.uid, buildingLocation, houseLocation).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 拆除小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.destroyHouse = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseLocation = msg.houseLocation
	this.playerService.destroyHouseAsync(session.uid, buildingLocation, houseLocation).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级箭塔
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeTower = function(msg, session, next){
	var location = msg.location
	var finishNow = msg.finishNow

	this.playerService.upgradeTowerAsync(session.uid, location, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 箭塔升级加速
 * @param msg
 * @param session
 * @param next
 */
pro.speedupTowerBuild = function(msg, session, next){
	var location = msg.location

	this.playerService.speedupTowerBuildAsync(session.uid, location).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级城墙
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeWall = function(msg, session, next){
	var finishNow = msg.finishNow

	this.playerService.upgradeWallAsync(session.uid, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 城墙升级加速
 * @param msg
 * @param session
 * @param next
 */
pro.speedupWallBuild = function(msg, session, next){
	this.playerService.speedupWallBuildAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 制作材料
 * @param msg
 * @param session
 * @param next
 */
pro.makeMaterial = function(msg, session, next){
	var category = msg.category
	var finishNow = msg.finishNow
	this.playerService.makeMaterialAsync(session.uid, category, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 领取制作完成
 * @param msg
 * @param session
 * @param next
 */
pro.getMaterials = function(msg, session, next){
	var category = msg.category
	this.playerService.getMaterialsAsync(session.uid, category).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 招募普通士兵
 * @param msg
 * @param session
 * @param next
 */
pro.recruitNormalSoldier = function(msg, session, next){
	var soldierName = msg.soldierName
	var count = msg.count
	var finishNow = msg.finishNow

	this.playerService.recruitNormalSoldierAsync(session.uid, soldierName, count, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 招募特殊士兵
 * @param msg
 * @param session
 * @param next
 */
pro.recruitSpecialSoldier = function(msg, session, next){
	var soldierName = msg.soldierName
	var count = msg.count
	var finishNow = msg.finishNow

	this.playerService.recruitSpecialSoldierAsync(session.uid, soldierName, count, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 制作龙装备
 * @param msg
 * @param session
 * @param next
 */
pro.makeDragonEquipment = function(msg, session, next){
	var equipmentName = msg.equipmentName
	var finishNow = msg.finishNow
	this.playerService.makeDragonEquipmentAsync(session.uid, equipmentName, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 治疗士兵
 * @param msg
 * @param session
 * @param next
 */
pro.treatSoldier = function(msg, session, next){
	var soldiers = msg.soldiers
	var finishNow = msg.finishNow
	this.playerService.treatSoldierAsync(session.uid, soldiers, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 孵化龙蛋
 * @param msg
 * @param session
 * @param next
 */
pro.hatchDragon = function(msg, session, next){
	var dragonType = msg.dragonType
	this.playerService.hatchDragonAsync(session.uid, dragonType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 设置龙的装备
 * @param msg
 * @param session
 * @param next
 */
pro.setDragonEquipment = function(msg, session, next){
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	var equipmentName = msg.equipmentName
	this.playerService.setDragonEquipmentAsync(session.uid, dragonType, equipmentCategory, equipmentName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 强化龙的装备
 * @param msg
 * @param session
 * @param next
 */
pro.enhanceDragonEquipment = function(msg, session, next){
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	var equipments = msg.equipments
	this.playerService.enhanceDragonEquipmentAsync(session.uid, dragonType, equipmentCategory, equipments).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 重置龙的装备的随机Buff
 * @param msg
 * @param session
 * @param next
 */
pro.resetDragonEquipment = function(msg, session, next){
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	this.playerService.resetDragonEquipmentAsync(session.uid, dragonType, equipmentCategory).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级龙的技能
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeDragonSkill = function(msg, session, next){
	var dragonType = msg.dragonType
	var skillLocation = msg.skillLocation
	this.playerService.upgradeDragonSkillAsync(session.uid, dragonType, skillLocation).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级龙的星级
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeDragonStar = function(msg, session, next){
	var dragonType = msg.dragonType
	this.playerService.upgradeDragonStarAsync(session.uid, dragonType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 向城民收取税收
 * @param msg
 * @param session
 * @param next
 */
pro.impose = function(msg, session, next){
	this.playerService.imposeAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 获取玩家个人信息
 * @param msg
 * @param session
 * @param next
 */
pro.getPlayerInfo = function(msg, session, next){
	var memberId = msg.memberId
	this.playerService.getPlayerInfoAsync(session.uid, memberId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 发送个人邮件
 * @param msg
 * @param session
 * @param next
 */
pro.sendMail = function(msg, session, next){
	var memberName = msg.memberName
	var title = msg.title
	var content = msg.content
	this.playerService.sendMailAsync(session.uid, memberName, title, content).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 阅读邮件
 * @param msg
 * @param session
 * @param next
 */
pro.readMail = function(msg, session, next){
	var mailId = msg.mailId
	this.playerService.readMailAsync(session.uid, mailId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}


/**
 * 收藏邮件
 * @param msg
 * @param session
 * @param next
 */
pro.saveMail = function(msg, session, next){
	var mailId = msg.mailId
	this.playerService.saveMailAsync(session.uid, mailId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 取消收藏邮件
 * @param msg
 * @param session
 * @param next
 */
pro.unSaveMail = function(msg, session, next){
	var mailId = msg.mailId
	this.playerService.unSaveMailAsync(session.uid, mailId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 获取玩家邮件
 * @param msg
 * @param session
 * @param next
 */
pro.getMails = function(msg, session, next){
	var fromIndex = msg.fromIndex
	this.playerService.getMailsAsync(session.uid, fromIndex).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 获取玩家已发邮件
 * @param msg
 * @param session
 * @param next
 */
pro.getSendMails = function(msg, session, next){
	var fromIndex = msg.fromIndex
	this.playerService.getSendMailsAsync(session.uid, fromIndex).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 获取玩家已存邮件
 * @param msg
 * @param session
 * @param next
 */
pro.getSavedMails = function(msg, session, next){
	var fromIndex = msg.fromIndex
	this.playerService.getSavedMailsAsync(session.uid, fromIndex).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 删除邮件
 * @param msg
 * @param session
 * @param next
 */
pro.deleteMail = function(msg, session, next){
	var mailId = msg.mailId
	this.playerService.deleteMailAsync(session.uid, mailId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 发送联盟邮件
 * @param msg
 * @param session
 * @param next
 */
pro.sendAllianceMail = function(msg, session, next){
	var title = msg.title
	var content = msg.content
	this.playerService.sendAllianceMailAsync(session.uid, title, content).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 创建联盟
 * @param msg
 * @param session
 * @param next
 */
pro.createAlliance = function(msg, session, next){
	var name = msg.name
	var tag = msg.tag
	var language = msg.language
	var terrain = msg.terrain
	var flag = msg.flag
	this.playerService.createAllianceAsync(session.uid, name, tag, language, terrain, flag).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 根据Tag搜索联盟
 * @param msg
 * @param session
 * @param next
 */
pro.getCanDirectJoinAlliances = function(msg, session, next){
	this.playerService.getCanDirectJoinAlliancesAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 根据Tag搜索联盟
 * @param msg
 * @param session
 * @param next
 */
pro.searchAllianceByTag = function(msg, session, next){
	var tag = msg.tag
	this.playerService.searchAllianceByTagAsync(session.uid, tag).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 编辑联盟基础信息
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceBasicInfo = function(msg, session, next){
	var name = msg.name
	var tag = msg.tag
	var language = msg.language
	var terrain = msg.terrain
	var flag = msg.flag
	this.playerService.editAllianceBasicInfoAsync(session.uid, name, tag, language, terrain, flag).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 编辑职位名称
 * @param msg
 * @param session
 * @param next
 */
pro.editTitleName = function(msg, session, next){
	var title = msg.title
	var titleName = msg.titleName
	this.playerService.editTitleNameAsync(session.uid, title, titleName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 编辑联盟公告
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceNotice = function(msg, session, next){
	var notice = msg.notice
	this.playerService.editAllianceNoticeAsync(session.uid, notice).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 编辑联盟描述
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceDescription = function(msg, session, next){
	var description = msg.description
	this.playerService.editAllianceDescriptionAsync(session.uid, description).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 编辑联盟加入方式
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceJoinType = function(msg, session, next){
	var joinType = msg.joinType
	this.playerService.editAllianceJoinTypeAsync(session.uid, joinType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 修改联盟某个玩家的职位
 * @param msg
 * @param session
 * @param next
 */
pro.modifyAllianceMemberTitle = function(msg, session, next){
	var memberId = msg.memberId
	var title = msg.title
	this.playerService.modifyAllianceMemberTitleAsync(session.uid, memberId, title).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 将玩家踢出联盟
 * @param msg
 * @param session
 * @param next
 */
pro.kickAllianceMemberOff = function(msg, session, next){
	var memberId = msg.memberId
	this.playerService.kickAllianceMemberOffAsync(session.uid, memberId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 移交盟主职位
 * @param msg
 * @param session
 * @param next
 */
pro.handOverArchon = function(msg, session, next){
	var memberId = msg.memberId
	this.playerService.handOverArchonAsync(session.uid, memberId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 退出联盟
 * @param msg
 * @param session
 * @param next
 */
pro.quitAlliance = function(msg, session, next){
	this.playerService.quitAllianceAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 直接加入某联盟
 * @param msg
 * @param session
 * @param next
 */
pro.joinAllianceDirectly = function(msg, session, next){
	var allianceId = msg.allianceId
	this.playerService.joinAllianceDirectlyAsync(session.uid, allianceId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 申请加入联盟
 * @param msg
 * @param session
 * @param next
 */
pro.requestToJoinAlliance = function(msg, session, next){
	var allianceId = msg.allianceId
	this.playerService.requestToJoinAllianceAsync(session.uid, allianceId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 取消对某联盟的申请
 * @param msg
 * @param session
 * @param next
 */
pro.cancelJoinAllianceRequest = function(msg, session, next){
	var allianceId = msg.allianceId
	this.playerService.cancelJoinAllianceRequestAsync(session.uid, allianceId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 设置玩家语言
 * @param msg
 * @param session
 * @param next
 */
pro.setPlayerLanguage = function(msg, session, next){
	var language = msg.language
	this.playerService.setPlayerLanguageAsync(session.uid, language).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 处理加入联盟申请
 * @param msg
 * @param session
 * @param next
 */
pro.handleJoinAllianceRequest = function(msg, session, next){
	var memberId = msg.memberId
	var agree = msg.agree
	this.playerService.handleJoinAllianceRequestAsync(session.uid, memberId, agree).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 邀请玩家加入联盟
 * @param msg
 * @param session
 * @param next
 */
pro.inviteToJoinAlliance = function(msg, session, next){
	var memberId = msg.memberId
	this.playerService.inviteToJoinAllianceAsync(session.uid, memberId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 处理加入联盟邀请
 * @param msg
 * @param session
 * @param next
 */
pro.handleJoinAllianceInvite = function(msg, session, next){
	var allianceId = msg.allianceId
	var agree = msg.agree
	this.playerService.handleJoinAllianceInviteAsync(session.uid, allianceId, agree).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 请求加速
 * @param msg
 * @param session
 * @param next
 */
pro.requestToSpeedUp = function(msg, session, next){
	var eventType = msg.eventType
	var eventId = msg.eventId
	this.playerService.requestToSpeedUpAsync(session.uid, eventType, eventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 协助玩家加速
 * @param msg
 * @param session
 * @param next
 */
pro.helpAllianceMemberSpeedUp = function(msg, session, next){
	var eventId = msg.eventId
	this.playerService.helpAllianceMemberSpeedUpAsync(session.uid, eventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 协助所有玩家加速
 * @param msg
 * @param session
 * @param next
 */
pro.helpAllAllianceMemberSpeedUp = function(msg, session, next){
	this.playerService.helpAllAllianceMemberSpeedUpAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}