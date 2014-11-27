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
	this.allianceService = app.get("allianceService")
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
	this.allianceService.createAllianceAsync(session.uid, name, tag, language, terrain, flag).then(function(){
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
	this.allianceService.sendAllianceMailAsync(session.uid, title, content).then(function(){
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
	this.allianceService.getMyAllianceDataAsync(session.uid).then(function(){
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
	this.allianceService.getCanDirectJoinAlliancesAsync(session.uid).then(function(){
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
	this.allianceService.searchAllianceByTagAsync(session.uid, tag).then(function(){
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
	this.allianceService.editAllianceBasicInfoAsync(session.uid, name, tag, language, flag).then(function(){
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
	this.allianceService.editAllianceTerrianAsync(session.uid, terrain).then(function(){
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
	this.allianceService.editAllianceTitleNameAsync(session.uid, title, titleName).then(function(){
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
	this.allianceService.editAllianceNoticeAsync(session.uid, notice).then(function(){
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
	this.allianceService.editAllianceDescriptionAsync(session.uid, description).then(function(){
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
	this.allianceService.editAllianceJoinTypeAsync(session.uid, joinType).then(function(){
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
	this.allianceService.editAllianceMemberTitleAsync(session.uid, memberId, title).then(function(){
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
	this.allianceService.kickAllianceMemberOffAsync(session.uid, memberId).then(function(){
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
	this.allianceService.handOverAllianceArchonAsync(session.uid, memberId).then(function(){
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
	this.allianceService.quitAllianceAsync(session.uid).then(function(){
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
	this.allianceService.joinAllianceDirectlyAsync(session.uid, allianceId).then(function(){
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
	this.allianceService.requestToJoinAllianceAsync(session.uid, allianceId).then(function(){
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
	this.allianceService.cancelJoinAllianceRequestAsync(session.uid, allianceId).then(function(){
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
	this.allianceService.handleJoinAllianceRequestAsync(session.uid, memberId, agree).then(function(){
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
	this.allianceService.inviteToJoinAllianceAsync(session.uid, memberId).then(function(){
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
	this.allianceService.handleJoinAllianceInviteAsync(session.uid, allianceId, agree).then(function(){
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
	this.allianceService.buyAllianceArchonAsync(session.uid).then(function(){
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
	this.allianceService.requestAllianceToSpeedUpAsync(session.uid, eventType, eventId).then(function(){
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
	this.allianceService.helpAllianceMemberSpeedUpAsync(session.uid, eventId).then(function(){
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
	this.allianceService.helpAllAllianceMemberSpeedUpAsync(session.uid).then(function(){
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
	this.allianceService.donateToAllianceAsync(session.uid, donateType).then(function(){
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
	this.allianceService.upgradeAllianceBuildingAsync(session.uid, buildingName).then(function(){
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
	this.allianceService.upgradeAllianceVillageAsync(session.uid, villageType).then(function(){
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
	this.allianceService.moveAllianceBuildingAsync(session.uid, buildingName, locationX, locationY).then(function(){
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
	this.allianceService.moveAllianceMemberAsync(session.uid, locationX, locationY).then(function(){
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
	this.allianceService.distroyAllianceDecorateAsync(session.uid, decorateId).then(function(){
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
	this.allianceService.activateAllianceShrineStageAsync(session.uid, stageName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 行军到圣地
 * @param msg
 * @param session
 * @param next
 */
pro.marchToShrine = function(msg, session, next){
	var shrineEventId = msg.shrineEventId
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	this.allianceService.marchToShrineAsync(session.uid, shrineEventId, dragonType, soldiers).then(function(){
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
	this.allianceService.findAllianceToFightAsync(session.uid).then(function(){
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
	this.allianceService.revengeAllianceAsync(session.uid, reportId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 行军到月门
 * @param msg
 * @param session
 * @param next
 */
pro.marchToMoonGate = function(msg, session, next){
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	this.allianceService.marchToMoonGateAsync(session.uid, dragonType, soldiers).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 从月门撤兵
 * @param msg
 * @param session
 * @param next
 */
pro.retreatFromMoonGate = function(msg, session, next){
	this.allianceService.retreatFromMoonGateAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 联盟战月门挑战
 * @param msg
 * @param session
 * @param next
 */
pro.challengeMoonGateEnemyTroop = function(msg, session, next){
	this.allianceService.challengeMoonGateEnemyTroopAsync(session.uid).then(function(){
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
	var includeMoonGateData = msg.includeMoonGateData
	this.allianceService.getAllianceViewDataAsync(session.uid, targetAllianceId, includeMoonGateData).then(function(){
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
	this.allianceService.getNearedAllianceInfosAsync(session.uid).then(function(){
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
	this.allianceService.searchAllianceInfoByTagAsync(session.uid, tag).then(function(){
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
	this.allianceService.helpAllianceMemberDefenceAsync(session.uid, dragonType, soldiers, targetPlayerId).then(function(){
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
pro.retreatFromHelpedAllianceMember = function(msg, session, next){
	var targetPlayerId = msg.targetPlayerId
	this.allianceService.retreatFromHelpedAllianceMemberAsync(session.uid, targetPlayerId).then(function(){
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
	this.allianceService.requestAllianceToFightAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}