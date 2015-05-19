"use strict"

/**
 * Created by modun on 14-10-28.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.logService = app.get("logService")
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
	this.logService.onRequest("logic.allianceHandler.createAlliance", {playerId:session.uid, msg:msg})
	var name = msg.name
	var tag = msg.tag
	var language = msg.language
	var terrain = msg.terrain
	var flag = msg.flag
	this.allianceApiService.createAllianceAsync(session.uid, name, tag, language, terrain, flag).spread(function(playerData, allianceData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 发送联盟邮件
 * @param msg
 * @param session
 * @param next
 */
pro.sendAllianceMail = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.sendAllianceMail", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var title = msg.title
	var content = msg.content
	this.allianceApiService.sendAllianceMailAsync(session.uid, allianceId, title, content).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 主动获取玩家联盟的信息
 * @param msg
 * @param session
 * @param next
 */
pro.getMyAllianceData = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getMyAllianceData", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	this.allianceApiService.getMyAllianceDataAsync(session.uid, allianceId).then(function(allianceData){
		next(null, {code:200, allianceData:allianceData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 根据Tag搜索联盟
 * @param msg
 * @param session
 * @param next
 */
pro.getCanDirectJoinAlliances = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getCanDirectJoinAlliances", {playerId:session.uid, msg:msg})
	var fromIndex = msg.fromIndex
	this.allianceApiService.getCanDirectJoinAlliancesAsync(session.uid, fromIndex).then(function(allianceDatas){
		next(null, {code:200, allianceDatas:allianceDatas})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 根据Tag搜索联盟
 * @param msg
 * @param session
 * @param next
 */
pro.searchAllianceByTag = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.searchAllianceByTag", {playerId:session.uid, msg:msg})
	var tag = msg.tag
	this.allianceApiService.searchAllianceByTagAsync(session.uid, tag).then(function(allianceDatas){
		next(null, {code:200, allianceDatas:allianceDatas})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 编辑联盟基础信息
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceBasicInfo = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.editAllianceBasicInfo", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var name = msg.name
	var tag = msg.tag
	var language = msg.language
	var flag = msg.flag
	this.allianceApiService.editAllianceBasicInfoAsync(session.uid, allianceId, name, tag, language, flag).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 编辑联盟地形
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceTerrian = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.editAllianceTerrian", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	var playerName = session.get("name")
	var terrain = msg.terrain
	this.allianceApiService.editAllianceTerrianAsync(session.uid, playerName, allianceId, terrain).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 编辑职位名称
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceTitleName = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.editAllianceTitleName", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var title = msg.title
	var titleName = msg.titleName
	this.allianceApiService.editAllianceTitleNameAsync(session.uid, allianceId, title, titleName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 编辑联盟公告
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceNotice = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.editAllianceNotice", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var playerName = session.get("name")
	var notice = msg.notice
	this.allianceApiService.editAllianceNoticeAsync(session.uid, playerName, allianceId, notice).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 编辑联盟描述
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceDescription = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.editAllianceDescription", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var playerName = session.get('name')
	var description = msg.description
	this.allianceApiService.editAllianceDescriptionAsync(session.uid, playerName, allianceId, description).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 编辑联盟加入方式
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceJoinType = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.editAllianceJoinType", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var joinType = msg.joinType
	this.allianceApiService.editAllianceJoinTypeAsync(session.uid, allianceId, joinType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 修改联盟某个玩家的职位
 * @param msg
 * @param session
 * @param next
 */
pro.editAllianceMemberTitle = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.editAllianceMemberTitle", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var memberId = msg.memberId
	var title = msg.title
	this.allianceApiService.editAllianceMemberTitleAsync(session.uid, allianceId, memberId, title).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 将玩家踢出联盟
 * @param msg
 * @param session
 * @param next
 */
pro.kickAllianceMemberOff = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.kickAllianceMemberOff", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var memberId = msg.memberId
	this.allianceApiService.kickAllianceMemberOffAsync(session.uid, allianceId, memberId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 移交盟主职位
 * @param msg
 * @param session
 * @param next
 */
pro.handOverAllianceArchon = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.handOverAllianceArchon", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var memberId = msg.memberId
	this.allianceApiService.handOverAllianceArchonAsync(session.uid, allianceId, memberId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 退出联盟
 * @param msg
 * @param session
 * @param next
 */
pro.quitAlliance = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.quitAlliance", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService2.quitAllianceAsync(session.uid, allianceId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 直接加入某联盟
 * @param msg
 * @param session
 * @param next
 */
pro.joinAllianceDirectly = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.joinAllianceDirectly", {playerId:session.uid, msg:msg})
	var allianceId = msg.allianceId
	this.allianceApiService2.joinAllianceDirectlyAsync(session.uid, allianceId).spread(function(playerData, allianceData, enemyAllianceData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData, enemyAllianceData:enemyAllianceData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 申请加入联盟
 * @param msg
 * @param session
 * @param next
 */
pro.requestToJoinAlliance = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.requestToJoinAlliance", {playerId:session.uid, msg:msg})
	var allianceId = msg.allianceId
	this.allianceApiService2.requestToJoinAllianceAsync(session.uid, allianceId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 取消对某联盟的申请
 * @param msg
 * @param session
 * @param next
 */
pro.cancelJoinAllianceRequest = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.cancelJoinAllianceRequest", {playerId:session.uid, msg:msg})
	var allianceId = msg.allianceId
	this.allianceApiService2.cancelJoinAllianceRequestAsync(session.uid, allianceId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 同意加入联盟申请
 * @param msg
 * @param session
 * @param next
 */
pro.approveJoinAllianceRequest = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.approveJoinAllianceRequest", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var requestEventId = msg.requestEventId
	this.allianceApiService2.approveJoinAllianceRequestAsync(session.uid, allianceId, requestEventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 删除加入联盟申请事件
 * @param msg
 * @param session
 * @param next
 */
pro.removeJoinAllianceReqeusts = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.removeJoinAllianceReqeusts", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var requestEventIds = msg.requestEventIds
	this.allianceApiService2.removeJoinAllianceReqeustsAsync(session.uid, allianceId, requestEventIds).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 邀请玩家加入联盟
 * @param msg
 * @param session
 * @param next
 */
pro.inviteToJoinAlliance = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.inviteToJoinAlliance", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var memberId = msg.memberId
	this.allianceApiService2.inviteToJoinAllianceAsync(session.uid, allianceId, memberId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 处理加入联盟邀请
 * @param msg
 * @param session
 * @param next
 */
pro.handleJoinAllianceInvite = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.handleJoinAllianceInvite", {playerId:session.uid, msg:msg})
	var allianceId = msg.allianceId
	var agree = msg.agree
	this.allianceApiService2.handleJoinAllianceInviteAsync(session.uid, allianceId, agree).spread(function(playerData, allianceData, enemyAllianceData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData, enemyAllianceData:enemyAllianceData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 购买联盟盟主职位
 * @param msg
 * @param session
 * @param next
 */
pro.buyAllianceArchon = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.buyAllianceArchon", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService2.buyAllianceArchonAsync(session.uid, allianceId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 请求加速
 * @param msg
 * @param session
 * @param next
 */
pro.requestAllianceToSpeedUp = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.requestAllianceToSpeedUp", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var eventType = msg.eventType
	var eventId = msg.eventId
	this.allianceApiService2.requestAllianceToSpeedUpAsync(session.uid, allianceId, eventType, eventId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 协助玩家加速
 * @param msg
 * @param session
 * @param next
 */
pro.helpAllianceMemberSpeedUp = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.helpAllianceMemberSpeedUp", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var eventId = msg.eventId
	this.allianceApiService2.helpAllianceMemberSpeedUpAsync(session.uid, allianceId, eventId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 协助所有玩家加速
 * @param msg
 * @param session
 * @param next
 */
pro.helpAllAllianceMemberSpeedUp = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.helpAllAllianceMemberSpeedUp", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService2.helpAllAllianceMemberSpeedUpAsync(session.uid, allianceId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 联盟捐赠
 * @param msg
 * @param session
 * @param next
 */
pro.donateToAlliance = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.donateToAlliance", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var donateType = msg.donateType
	this.allianceApiService3.donateToAllianceAsync(session.uid, allianceId, donateType).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级联盟建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeAllianceBuilding = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.upgradeAllianceBuilding", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var buildingName = msg.buildingName
	this.allianceApiService3.upgradeAllianceBuildingAsync(session.uid, allianceId, buildingName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 升级联盟村落
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeAllianceVillage = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.upgradeAllianceVillage", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var villageType = msg.villageType
	this.allianceApiService3.upgradeAllianceVillageAsync(session.uid, allianceId, villageType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 移动联盟建筑到新的位置
 * @param msg
 * @param session
 * @param next
 */
pro.moveAllianceBuilding = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.moveAllianceBuilding", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var mapObjectId = msg.mapObjectId
	var locationX = msg.locationX
	var locationY = msg.locationY
	this.allianceApiService3.moveAllianceBuildingAsync(session.uid, allianceId, mapObjectId, locationX, locationY).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 激活联盟圣地事件
 * @param msg
 * @param session
 * @param next
 */
pro.activateAllianceShrineStage = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.activateAllianceShrineStage", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var stageName = msg.stageName
	this.allianceApiService3.activateAllianceShrineStageAsync(session.uid, allianceId, stageName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 进攻联盟圣地
 * @param msg
 * @param session
 * @param next
 */
pro.attackAllianceShrine = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.attackAllianceShrine", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var shrineEventId = msg.shrineEventId
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	this.allianceApiService3.attackAllianceShrineAsync(session.uid, allianceId, shrineEventId, dragonType, soldiers).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 请求联盟进行联盟战
 * @param msg
 * @param session
 * @param next
 */
pro.requestAllianceToFight = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.requestAllianceToFight", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService3.requestAllianceToFightAsync(session.uid, allianceId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 查找合适的联盟进行战斗
 * @param msg
 * @param session
 * @param next
 */
pro.findAllianceToFight = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.findAllianceToFight", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService3.findAllianceToFightAsync(session.uid, allianceId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 复仇其他联盟
 * @param msg
 * @param session
 * @param next
 */
pro.revengeAlliance = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.revengeAlliance", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var reportId = msg.reportId
	this.allianceApiService3.revengeAllianceAsync(session.uid, allianceId, reportId).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟可视化数据
 * @param msg
 * @param session
 * @param next
 */
pro.getAllianceViewData = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getAllianceViewData", {playerId:session.uid, msg:msg})
	var targetAllianceId = msg.targetAllianceId
	this.allianceApiService3.getAllianceViewDataAsync(session.uid, targetAllianceId).then(function(allianceViewData){
		next(null, {code:200, allianceViewData:allianceViewData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 根据Tag搜索联盟战斗数据
 * @param msg
 * @param session
 * @param next
 */
pro.searchAllianceInfoByTag = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.searchAllianceInfoByTag", {playerId:session.uid, msg:msg})
	var tag = msg.tag
	this.allianceApiService3.searchAllianceInfoByTagAsync(session.uid, tag).then(function(allianceInfos){
		next(null, {code:200, allianceInfos:allianceInfos})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 查看战力相近的3个联盟的数据
 * @param msg
 * @param session
 * @param next
 */
pro.getNearedAllianceInfos = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getNearedAllianceInfos", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService3.getNearedAllianceInfosAsync(session.uid, allianceId).then(function(allianceInfos){
		next(null, {code:200, allianceInfos:allianceInfos})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 协助联盟其他玩家防御
 * @param msg
 * @param session
 * @param next
 */
pro.helpAllianceMemberDefence = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.helpAllianceMemberDefence", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var targetPlayerId = msg.targetPlayerId
	this.allianceApiService4.helpAllianceMemberDefenceAsync(session.uid, allianceId, dragonType, soldiers, targetPlayerId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 从被协防的联盟成员城市撤兵
 * @param msg
 * @param session
 * @param next
 */
pro.retreatFromBeHelpedAllianceMember = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.retreatFromBeHelpedAllianceMember", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var beHelpedPlayerId = msg.beHelpedPlayerId
	this.allianceApiService4.retreatFromBeHelpedAllianceMemberAsync(session.uid, allianceId, beHelpedPlayerId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 突袭玩家城市
 * @param msg
 * @param session
 * @param next
 */
pro.strikePlayerCity = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.strikePlayerCity", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var dragonType = msg.dragonType
	var defencePlayerId = msg.defencePlayerId
	this.allianceApiService4.strikePlayerCityAsync(session.uid, allianceId, dragonType, defencePlayerId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 进攻玩家城市
 * @param msg
 * @param session
 * @param next
 */
pro.attackPlayerCity = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.attackPlayerCity", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var defencePlayerId = msg.defencePlayerId
	this.allianceApiService4.attackPlayerCityAsync(session.uid, allianceId, dragonType, soldiers, defencePlayerId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 进攻村落
 * @param msg
 * @param session
 * @param next
 */
pro.attackVillage = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.attackVillage", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var defenceAllianceId = msg.defenceAllianceId
	var defenceVillageId = msg.defenceVillageId
	this.allianceApiService4.attackVillageAsync(session.uid, allianceId, dragonType, soldiers, defenceAllianceId, defenceVillageId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 从村落撤兵
 * @param msg
 * @param session
 * @param next
 */
pro.retreatFromVillage = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.retreatFromVillage", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var villageEventId = msg.villageEventId
	this.allianceApiService4.retreatFromVillageAsync(session.uid, allianceId, villageEventId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 突袭村落
 * @param msg
 * @param session
 * @param next
 */
pro.strikeVillage = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.strikeVillage", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var dragonType = msg.dragonType
	var defenceAllianceId = msg.defenceAllianceId
	var defenceVillageId = msg.defenceVillageId
	this.allianceApiService4.strikeVillageAsync(session.uid, allianceId, dragonType, defenceAllianceId, defenceVillageId).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 查看敌方进攻行军事件详细信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAttackMarchEventDetail = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getAttackMarchEventDetail", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var enemyAllianceId = msg.enemyAllianceId
	var eventId = msg.eventId
	this.allianceApiService4.getAttackMarchEventDetailAsync(session.uid, allianceId, enemyAllianceId, eventId).then(function(eventDetail){
		next(null, {code:200, eventDetail:eventDetail})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 查看敌方突袭行军事件详细信息
 * @param msg
 * @param session
 * @param next
 */
pro.getStrikeMarchEventDetail = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getStrikeMarchEventDetail", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var enemyAllianceId = msg.enemyAllianceId
	var eventId = msg.eventId
	this.allianceApiService4.getStrikeMarchEventDetailAsync(session.uid, allianceId, enemyAllianceId, eventId).then(function(eventDetail){
		next(null, {code:200, eventDetail:eventDetail})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 查看协助部队行军事件详细信息
 * @param msg
 * @param session
 * @param next
 */
pro.getHelpDefenceMarchEventDetail = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getHelpDefenceMarchEventDetail", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var eventId = msg.eventId
	this.allianceApiService4.getHelpDefenceMarchEventDetailAsync(session.uid, allianceId, eventId).then(function(eventDetail){
		next(null, {code:200, eventDetail:eventDetail})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 查看协防部队详细信息
 * @param msg
 * @param session
 * @param next
 */
pro.getHelpDefenceTroopDetail = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getHelpDefenceTroopDetail", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var playerId = msg.playerId
	var helpedByPlayerId = msg.helpedByPlayerId
	this.allianceApiService4.getHelpDefenceTroopDetailAsync(session.uid, allianceId, playerId, helpedByPlayerId).then(function(troopDetail){
		next(null, {code:200, troopDetail:troopDetail})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 联盟商店补充道具
 * @param msg
 * @param session
 * @param next
 */
pro.addItem = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.addItem", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	var playerName = session.get('name')

	var itemName = msg.itemName
	var count = msg.count
	this.allianceApiService4.addItemAsync(session.uid, playerName, allianceId, itemName, count).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 购买联盟商店的道具
 * @param msg
 * @param session
 * @param next
 */
pro.buyItem = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.buyItem", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var itemName = msg.itemName
	var count = msg.count
	this.allianceApiService4.buyItemAsync(session.uid, allianceId, itemName, count).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 为联盟成员添加荣耀值
 * @param msg
 * @param session
 * @param next
 */
pro.giveLoyaltyToAllianceMember = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.giveLoyaltyToAllianceMember", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	var memberId = msg.memberId
	var count = msg.count
	this.allianceApiService5.giveLoyaltyToAllianceMemberAsync(session.uid, allianceId, memberId, count).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 查看联盟信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAllianceInfo = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getAllianceInfo", {playerId:session.uid, msg:msg})
	var allianceId = msg.allianceId
	this.allianceApiService5.getAllianceInfoAsync(session.uid, allianceId).then(function(allianceData){
		next(null, {code:200, allianceData:allianceData})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟申请列表
 * @param msg
 * @param session
 * @param next
 */
pro.getJoinRequestEvents = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getJoinRequestEvents", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService5.getJoinRequestEventsAsync(session.uid, allianceId).then(function(joinRequestEvents){
		next(null, {code:200, joinRequestEvents:joinRequestEvents})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟圣地战历史记录
 * @param msg
 * @param session
 * @param next
 */
pro.getShrineReports = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getShrineReports", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService5.getShrineReportsAsync(session.uid, allianceId).then(function(shrineReports){
		next(null, {code:200, shrineReports:shrineReports})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟战历史记录
 * @param msg
 * @param session
 * @param next
 */
pro.getAllianceFightReports = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getAllianceFightReports", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService5.getAllianceFightReportsAsync(session.uid, allianceId).then(function(allianceFightReports){
		next(null, {code:200, allianceFightReports:allianceFightReports})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟商店买入卖出记录
 * @param msg
 * @param session
 * @param next
 */
pro.getItemLogs = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getItemLogs", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	if(_.isEmpty(allianceId)){
		var e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.allianceApiService5.getItemLogsAsync(session.uid, allianceId).then(function(itemLogs){
		next(null, {code:200, itemLogs:itemLogs})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}