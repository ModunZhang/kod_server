"use strict"

/**
 * Created by modun on 14-10-28.
 */

var Promise = require("bluebird")
var _ = require("underscore")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.allianceApiService = app.get("allianceApiService")
	this.allianceApiService2 = app.get("allianceApiService2")
	this.allianceApiService3 = app.get("allianceApiService3")
	this.allianceApiService4 = app.get("allianceApiService4")
	this.allianceApiService5 = app.get("allianceApiService5")
}
var pro = Handler.prototype

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
	this.allianceApiService.createAllianceAsync(session.uid, name, tag, language, terrain, flag).then(function(){
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
	this.allianceApiService.sendAllianceMailAsync(session.uid, title, content).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 主动获取玩家联盟的信息
 * @param msg
 * @param session
 * @param next
 */
pro.getMyAllianceData = function(msg, session, next){
	this.allianceApiService.getMyAllianceDataAsync(session.uid).then(function(){
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
	this.allianceApiService.getCanDirectJoinAlliancesAsync(session.uid).then(function(){
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
	this.allianceApiService.searchAllianceByTagAsync(session.uid, tag).then(function(){
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
	var flag = msg.flag
	this.allianceApiService.editAllianceBasicInfoAsync(session.uid, name, tag, language, flag).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 编辑联盟地形
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceTerrian = function(msg, session, next){
	var terrain = msg.terrain
	this.allianceApiService.editAllianceTerrianAsync(session.uid, terrain).then(function(){
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
pro.editAllianceTitleName = function(msg, session, next){
	var title = msg.title
	var titleName = msg.titleName
	this.allianceApiService.editAllianceTitleNameAsync(session.uid, title, titleName).then(function(){
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
	this.allianceApiService.editAllianceNoticeAsync(session.uid, notice).then(function(){
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
	this.allianceApiService.editAllianceDescriptionAsync(session.uid, description).then(function(){
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
	this.allianceApiService.editAllianceJoinTypeAsync(session.uid, joinType).then(function(){
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
pro.editAllianceMemberTitle = function(msg, session, next){
	var memberId = msg.memberId
	var title = msg.title
	this.allianceApiService.editAllianceMemberTitleAsync(session.uid, memberId, title).then(function(){
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
	this.allianceApiService.kickAllianceMemberOffAsync(session.uid, memberId).then(function(){
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
pro.handOverAllianceArchon = function(msg, session, next){
	var memberId = msg.memberId
	this.allianceApiService.handOverAllianceArchonAsync(session.uid, memberId).then(function(){
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
	this.allianceApiService2.quitAllianceAsync(session.uid).then(function(){
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
	this.allianceApiService2.joinAllianceDirectlyAsync(session.uid, allianceId).then(function(){
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
	this.allianceApiService2.requestToJoinAllianceAsync(session.uid, allianceId).then(function(){
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
	this.allianceApiService2.cancelJoinAllianceRequestAsync(session.uid, allianceId).then(function(){
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
	this.allianceApiService2.handleJoinAllianceRequestAsync(session.uid, memberId, agree).then(function(){
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
	this.allianceApiService2.inviteToJoinAllianceAsync(session.uid, memberId).then(function(){
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
	this.allianceApiService2.handleJoinAllianceInviteAsync(session.uid, allianceId, agree).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 购买联盟盟主职位
 * @param msg
 * @param session
 * @param next
 */
pro.buyAllianceArchon = function(msg, session, next){
	this.allianceApiService2.buyAllianceArchonAsync(session.uid).then(function(){
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
pro.requestAllianceToSpeedUp = function(msg, session, next){
	var eventType = msg.eventType
	var eventId = msg.eventId
	this.allianceApiService2.requestAllianceToSpeedUpAsync(session.uid, eventType, eventId).then(function(){
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
	this.allianceApiService2.helpAllianceMemberSpeedUpAsync(session.uid, eventId).then(function(){
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
	this.allianceApiService2.helpAllAllianceMemberSpeedUpAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 联盟捐赠
 * @param msg
 * @param session
 * @param next
 */
pro.donateToAlliance = function(msg, session, next){
	var donateType = msg.donateType
	this.allianceApiService3.donateToAllianceAsync(session.uid, donateType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级联盟建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeAllianceBuilding = function(msg, session, next){
	var buildingName = msg.buildingName
	this.allianceApiService3.upgradeAllianceBuildingAsync(session.uid, buildingName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级联盟村落
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeAllianceVillage = function(msg, session, next){
	var villageType = msg.villageType
	this.allianceApiService3.upgradeAllianceVillageAsync(session.uid, villageType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 移动联盟建筑到新的位置
 * @param msg
 * @param session
 * @param next
 */
pro.moveAllianceBuilding = function(msg, session, next){
	var buildingName = msg.buildingName
	var locationX = msg.locationX
	var locationY = msg.locationY
	this.allianceApiService3.moveAllianceBuildingAsync(session.uid, buildingName, locationX, locationY).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 移动玩家城市到新的位置
 * @param msg
 * @param session
 * @param next
 */
pro.moveAllianceMember = function(msg, session, next){
	var locationX = msg.locationX
	var locationY = msg.locationY
	this.allianceApiService3.moveAllianceMemberAsync(session.uid, locationX, locationY).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 拆除装饰物
 * @param msg
 * @param session
 * @param next
 */
pro.distroyAllianceDecorate = function(msg, session, next){
	var decorateId = msg.decorateId
	this.allianceApiService3.distroyAllianceDecorateAsync(session.uid, decorateId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 激活联盟圣地事件
 * @param msg
 * @param session
 * @param next
 */
pro.activateAllianceShrineStage = function(msg, session, next){
	var stageName = msg.stageName
	this.allianceApiService3.activateAllianceShrineStageAsync(session.uid, stageName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 进攻联盟圣地
 * @param msg
 * @param session
 * @param next
 */
pro.attackAllianceShrine = function(msg, session, next){
	var shrineEventId = msg.shrineEventId
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	this.allianceApiService3.attackAllianceShrineAsync(session.uid, shrineEventId, dragonType, soldiers).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 请求联盟进行联盟战
 * @param msg
 * @param session
 * @param next
 */
pro.requestAllianceToFight = function(msg, session, next){
	this.allianceApiService3.requestAllianceToFightAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 查找合适的联盟进行战斗
 * @param msg
 * @param session
 * @param next
 */
pro.findAllianceToFight = function(msg, session, next){
	this.allianceApiService3.findAllianceToFightAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 复仇其他联盟
 * @param msg
 * @param session
 * @param next
 */
pro.revengeAlliance = function(msg, session, next){
	var reportId = msg.reportId
	this.allianceApiService3.revengeAllianceAsync(session.uid, reportId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 获取联盟简单数据
 * @param msg
 * @param session
 * @param next
 */
pro.getAllianceViewData = function(msg, session, next){
	var targetAllianceId = msg.targetAllianceId
	this.allianceApiService4.getAllianceViewDataAsync(session.uid, targetAllianceId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 根据Tag搜索联盟战斗数据
 * @param msg
 * @param session
 * @param next
 */
pro.searchAllianceInfoByTag = function(msg, session, next){
	var tag = msg.tag
	this.allianceApiService4.searchAllianceInfoByTagAsync(session.uid, tag).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 查看战力相近的3个联盟的数据
 * @param msg
 * @param session
 * @param next
 */
pro.getNearedAllianceInfos = function(msg, session, next){
	this.allianceApiService4.getNearedAllianceInfosAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 协助联盟其他玩家防御
 * @param msg
 * @param session
 * @param next
 */
pro.helpAllianceMemberDefence = function(msg, session, next){
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var targetPlayerId = msg.targetPlayerId
	this.allianceApiService4.helpAllianceMemberDefenceAsync(session.uid, dragonType, soldiers, targetPlayerId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 从被协防的联盟成员城市撤兵
 * @param msg
 * @param session
 * @param next
 */
pro.retreatFromBeHelpedAllianceMember = function(msg, session, next){
	var beHelpedPlayerId = msg.beHelpedPlayerId
	this.allianceApiService4.retreatFromBeHelpedAllianceMemberAsync(session.uid, beHelpedPlayerId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 突袭玩家城市
 * @param msg
 * @param session
 * @param next
 */
pro.strikePlayerCity = function(msg, session, next){
	var dragonType = msg.dragonType
	var defencePlayerId = msg.defencePlayerId
	this.allianceApiService4.strikePlayerCityAsync(session.uid, dragonType, defencePlayerId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 进攻玩家城市
 * @param msg
 * @param session
 * @param next
 */
pro.attackPlayerCity = function(msg, session, next){
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var defencePlayerId = msg.defencePlayerId
	this.allianceApiService4.attackPlayerCityAsync(session.uid, dragonType, soldiers, defencePlayerId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 进攻村落
 * @param msg
 * @param session
 * @param next
 */
pro.attackVillage = function(msg, session, next){
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var defenceAllianceId = msg.defenceAllianceId
	var defenceVillageId = msg.defenceVillageId
	this.allianceApiService4.attackVillageAsync(session.uid, dragonType, soldiers, defenceAllianceId, defenceVillageId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 从村落撤兵
 * @param msg
 * @param session
 * @param next
 */
pro.retreatFromVillage = function(msg, session, next){
	var villageEventId = msg.villageEventId
	this.allianceApiService4.retreatFromVillageAsync(session.uid, villageEventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 突袭村落
 * @param msg
 * @param session
 * @param next
 */
pro.strikeVillage = function(msg, session, next){
	var dragonType = msg.dragonType
	var defenceAllianceId = msg.defenceAllianceId
	var defenceVillageId = msg.defenceVillageId
	this.allianceApiService4.strikeVillageAsync(session.uid, dragonType, defenceAllianceId, defenceVillageId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 查看敌方进攻行军事件详细信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAttackMarchEventDetail = function(msg, session, next){
	var eventId = msg.eventId
	this.allianceApiService5.getAttackMarchEventDetailAsync(session.uid, eventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 查看敌方突袭行军事件详细信息
 * @param msg
 * @param session
 * @param next
 */
pro.getStrikeMarchEventDetail = function(msg, session, next){
	var eventId = msg.eventId
	this.allianceApiService5.getStrikeMarchEventDetailAsync(session.uid, eventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 查看协助部队行军事件详细信息
 * @param msg
 * @param session
 * @param next
 */
pro.getHelpDefenceMarchEventDetail = function(msg, session, next){
	var eventId = msg.eventId
	this.allianceApiService5.getHelpDefenceMarchEventDetailAsync(session.uid, eventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}