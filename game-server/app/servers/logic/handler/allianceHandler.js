"use strict"

/**
 * Created by modun on 14-10-28.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")

var DataUtils = require("../../../utils/dataUtils")
var LogicUtils = require("../../../utils/logicUtils")
var ErrorUtils = require("../../../utils/errorUtils")

var Consts = require("../../../consts/consts")
var Define = require("../../../consts/define")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.request = app.get('request');
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
	var e = null
	if(!_.isString(name) || name.trim().length === 0 || name.trim().length > Define.InputLength.AllianceName){
		e = new Error("name 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(tag) || tag.trim().length === 0 || tag.trim().length > Define.InputLength.AllianceTag){
		e = new Error("tag 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		e = new Error("language 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		e = new Error("terrain 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(flag)){
		e = new Error("flag 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('createAlliance', [session.uid, name, tag, language, terrain, flag]).spread(function(playerData, allianceData, mapData, mapIndexData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData, mapData:mapData, mapIndexData:mapIndexData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var title = msg.title
	var content = msg.content
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(title)){
		e = new Error("title 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(content)){
		e = new Error("content 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('sendAllianceMail', [session.uid, allianceId, title, content]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getMyAllianceData', [session.uid, allianceId]).then(function(allianceData){
		next(null, {code:200, allianceData:allianceData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isNumber(fromIndex) || fromIndex < 0 || fromIndex % 10 != 0){
		e = new Error("fromIndex 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getCanDirectJoinAlliances', [session.uid, fromIndex]).then(function(allianceDatas){
		next(null, {code:200, allianceDatas:allianceDatas})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isString(tag) || tag.trim().length === 0 || tag.trim().length > Define.InputLength.AllianceTag){
		e = new Error("tag 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('searchAllianceByTag', [session.uid, tag]).then(function(allianceDatas){
		next(null, {code:200, allianceDatas:allianceDatas})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var name = msg.name
	var tag = msg.tag
	var language = msg.language
	var flag = msg.flag
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(name) || name.trim().length === 0 || name.trim().length > Define.InputLength.AllianceName){
		e = new Error("name 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(tag) || tag.trim().length === 0 || tag.trim().length > Define.InputLength.AllianceTag){
		e = new Error("tag 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceLanguage, language)){
		e = new Error("language 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(flag) || flag.trim().length === 0 || flag.trim().length > Define.InputLength.AllianceFlag){
		e = new Error("flag 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('editAllianceBasicInfo', [session.uid, allianceId, name, tag, language, flag]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var playerName = session.get("name")
	var terrain = msg.terrain
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceTerrain, terrain)){
		e = new Error("terrain 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('editAllianceTerrian', [session.uid, playerName, allianceId, terrain]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var title = msg.title
	var titleName = msg.titleName
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceTitle, title)){
		e = new Error("title 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(titleName) || titleName.trim().length === 0 || titleName.trim().length > Define.InputLength.AllianceTitleName){
		e = new Error("titleName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('editAllianceTitleName', [session.uid, allianceId, title, titleName]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var playerName = session.get("name")
	var notice = msg.notice
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(notice) || notice.trim().length === 0 || notice.trim().length > Define.InputLength.AllianceNotice){
		e = new Error("notice 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('editAllianceNotice', [session.uid, playerName, allianceId, notice]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var playerName = session.get('name')
	var description = msg.description
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(description) || description.trim().length === 0 || description.trim().length > Define.InputLength.AllianceDesc){
		e = new Error("description 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('editAllianceDescription', [session.uid, playerName, allianceId, description]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var joinType = msg.joinType
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceJoinType, joinType)){
		e = new Error("joinType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('editAllianceJoinType', [session.uid, allianceId, joinType]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var memberId = msg.memberId
	var title = msg.title
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		e = new Error("memberId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceTitle, title)){
		e = new Error("title 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, memberId)){
		e = new Error("不能修改玩家自己的职位")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('editAllianceMemberTitle', [session.uid, allianceId, memberId, title]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var memberId = msg.memberId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		e = new Error("memberId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, memberId)){
		e = new Error("不能将自己踢出联盟")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('kickAllianceMemberOff', [session.uid, allianceId, memberId]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var memberId = msg.memberId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		e = new Error("memberId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, memberId)){
		e = new Error("不能将盟主职位移交给自己")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('handOverAllianceArchon', [session.uid, allianceId, memberId]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('quitAlliance', [session.uid, allianceId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		e = new Error("allianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('joinAllianceDirectly', [session.uid, allianceId]).spread(function(playerData, allianceData, mapData, mapIndexData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData, mapData:mapData, mapIndexData:mapIndexData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		e = new Error("allianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('requestToJoinAlliance', [session.uid, allianceId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		e = new Error("allianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('cancelJoinAllianceRequest', [session.uid, allianceId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var requestEventId = msg.requestEventId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(requestEventId) || !ShortId.isValid(requestEventId)){
		e = new Error("requestEventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('approveJoinAllianceRequest', [session.uid, allianceId, requestEventId]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var requestEventIds = msg.requestEventIds
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isArray(requestEventIds) || requestEventIds.length == 0){
		e = new Error("requestEventIds 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	for(var i = 0; i < requestEventIds; i++){
		if(!ShortId.isValid(requestEventIds[i])){
			e = new Error("requestEventIds 不合法")
			next(e, ErrorUtils.getError(e))
			return
		}
	}

	this.request('removeJoinAllianceReqeusts', [session.uid, allianceId, requestEventIds]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var memberId = msg.memberId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		e = new Error("memberId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, memberId)){
		e = new Error("不能邀请自己加入联盟")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('inviteToJoinAlliance', [session.uid, allianceId, memberId]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		e = new Error("allianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isBoolean(agree)){
		e = new Error("agree 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('handleJoinAllianceInvite', [session.uid, allianceId, agree]).spread(function(playerData, allianceData, mapData, mapIndexData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData, mapData:mapData, mapIndexData:mapIndexData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('buyAllianceArchon', [session.uid, allianceId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var eventType = msg.eventType
	var eventId = msg.eventId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceHelpEventType, eventType)){
		e = new Error("eventType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		e = new Error("eventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('requestAllianceToSpeedUp', [session.uid, allianceId, eventType, eventId]).spread(function(playerData, allianceData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var eventId = msg.eventId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		e = new Error("eventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('helpAllianceMemberSpeedUp', [session.uid, allianceId, eventId]).spread(function(playerData, allianceData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('helpAllAllianceMemberSpeedUp', [session.uid, allianceId]).spread(function(playerData, allianceData){
		next(null, {code:200, playerData:playerData, allianceData:allianceData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var donateType = msg.donateType
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.hasAllianceDonateType(donateType)){
		e = new Error("donateType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('donateToAlliance', [session.uid, allianceId, donateType]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var buildingName = msg.buildingName
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(Consts.AllianceBuildingNames, buildingName)){
		e = new Error("buildingName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('upgradeAllianceBuilding', [session.uid, allianceId, buildingName]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var villageType = msg.villageType
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isAllianceVillageTypeLegal(villageType)){
		e = new Error("villageType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('upgradeAllianceVillage', [session.uid, allianceId, villageType]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var stageName = msg.stageName
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isAllianceShrineStageNameLegal(stageName)){
		e = new Error("stageName 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('activateAllianceShrineStage', [session.uid, allianceId, stageName]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var shrineEventId = msg.shrineEventId
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(shrineEventId)){
		e = new Error("shrineEventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isArray(soldiers)){
		e = new Error("soldiers 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('attackAllianceShrine', [session.uid, allianceId, shrineEventId, dragonType, soldiers]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 查找合适的联盟进行战斗
 * @param msg
 * @param session
 * @param next
 */
pro.attackAlliance = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.attackAlliance", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var targetAllianceId = msg.targetAllianceId;
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(targetAllianceId) || !ShortId.isValid(targetAllianceId) || allianceId === targetAllianceId){
		e = new Error("targetAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('attackAlliance', [session.uid, allianceId, targetAllianceId]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isString(targetAllianceId)){
		e = new Error("targetAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getAllianceViewData', [session.uid, targetAllianceId]).then(function(allianceViewData){
		next(null, {code:200, allianceViewData:allianceViewData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(!_.isString(tag)){
		e = new Error("tag 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('searchAllianceInfoByTag', [session.uid, tag]).then(function(allianceInfos){
		next(null, {code:200, allianceInfos:allianceInfos})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getNearedAllianceInfos', [session.uid, allianceId]).then(function(allianceInfos){
		next(null, {code:200, allianceInfos:allianceInfos})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var targetPlayerId = msg.targetPlayerId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isArray(soldiers)){
		e = new Error("soldiers 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(targetPlayerId) || !ShortId.isValid(targetPlayerId)){
		e = new Error("targetPlayerId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, targetPlayerId)){
		e = new Error("不能对自己协防")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('helpAllianceMemberDefence', [session.uid, allianceId, dragonType, soldiers, targetPlayerId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var beHelpedPlayerId = msg.beHelpedPlayerId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(beHelpedPlayerId) || !ShortId.isValid(beHelpedPlayerId)){
		e = new Error("beHelpedPlayerId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(_.isEqual(session.uid, beHelpedPlayerId)){
		e = new Error("不能从自己的城市撤销协防部队")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('retreatFromBeHelpedAllianceMember', [session.uid, allianceId, beHelpedPlayerId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var dragonType = msg.dragonType
	var defenceAllianceId = msg.defenceAllianceId;
	var defencePlayerId = msg.defencePlayerId;
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceAllianceId) || !ShortId.isValid(defenceAllianceId)){
		e = new Error("defenceAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defencePlayerId) || !ShortId.isValid(defencePlayerId)){
		e = new Error("defencePlayerId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('strikePlayerCity', [session.uid, allianceId, dragonType, defenceAllianceId, defencePlayerId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var defenceAllianceId = msg.defenceAllianceId;
	var defencePlayerId = msg.defencePlayerId;
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isArray(soldiers)){
		e = new Error("soldiers 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceAllianceId) || !ShortId.isValid(defenceAllianceId)){
		e = new Error("defenceAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defencePlayerId) || !ShortId.isValid(defencePlayerId)){
		e = new Error("defencePlayerId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('attackPlayerCity', [session.uid, allianceId, dragonType, soldiers, defenceAllianceId, defencePlayerId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var defenceAllianceId = msg.defenceAllianceId
	var defenceVillageId = msg.defenceVillageId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isArray(soldiers)){
		e = new Error("soldiers 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceAllianceId) || !ShortId.isValid(defenceAllianceId)){
		e = new Error("defenceAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceVillageId) || !ShortId.isValid(defenceVillageId)){
		e = new Error("defenceVillageId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('attackVillage', [session.uid, allianceId, dragonType, soldiers, defenceAllianceId, defenceVillageId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 进攻野怪
 * @param msg
 * @param session
 * @param next
 */
pro.attackMonster = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.attackMonster", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var dragonType = msg.dragonType
	var soldiers = msg.soldiers
	var defenceAllianceId = msg.defenceAllianceId
	var defenceMonsterId = msg.defenceMonsterId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isArray(soldiers)){
		e = new Error("soldiers 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceAllianceId) || !ShortId.isValid(defenceAllianceId)){
		e = new Error("defenceAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceMonsterId) || !ShortId.isValid(defenceMonsterId)){
		e = new Error("defenceMonsterId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('attackMonster', [session.uid, allianceId, dragonType, soldiers, defenceAllianceId, defenceMonsterId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var villageEventId = msg.villageEventId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(villageEventId) || !ShortId.isValid(villageEventId)){
		e = new Error("villageEventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('retreatFromVillage', [session.uid, allianceId, villageEventId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var dragonType = msg.dragonType
	var defenceAllianceId = msg.defenceAllianceId
	var defenceVillageId = msg.defenceVillageId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		e = new Error("dragonType 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceAllianceId) || !ShortId.isValid(defenceAllianceId)){
		e = new Error("defenceAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(defenceVillageId) || !ShortId.isValid(defenceVillageId)){
		e = new Error("defenceVillageId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('strikeVillage', [session.uid, allianceId, dragonType, defenceAllianceId, defenceVillageId]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var targetAllianceId = msg.targetAllianceId
	var eventId = msg.eventId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(targetAllianceId) || !ShortId.isValid(targetAllianceId)){
		e = new Error("targetAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		e = new Error("eventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getAttackMarchEventDetail', [session.uid, allianceId, targetAllianceId, eventId]).then(function(eventDetail){
		next(null, {code:200, eventDetail:eventDetail})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var targetAllianceId = msg.targetAllianceId
	var eventId = msg.eventId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(targetAllianceId) || !ShortId.isValid(targetAllianceId)){
		e = new Error("targetAllianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		e = new Error("eventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getStrikeMarchEventDetail', [session.uid, allianceId, targetAllianceId, eventId]).then(function(eventDetail){
		next(null, {code:200, eventDetail:eventDetail})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var eventId = msg.eventId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		e = new Error("allianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		e = new Error("eventId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getHelpDefenceMarchEventDetail', [session.uid, allianceId, eventId]).then(function(eventDetail){
		next(null, {code:200, eventDetail:eventDetail})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var playerId = msg.playerId
	var helpedByPlayerId = msg.helpedByPlayerId
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(helpedByPlayerId) || !ShortId.isValid(helpedByPlayerId)){
		e = new Error("helpedByPlayerId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getHelpDefenceTroopDetail', [session.uid, allianceId, playerId, helpedByPlayerId]).then(function(troopDetail){
		next(null, {code:200, troopDetail:troopDetail})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 联盟商店补充道具
 * @param msg
 * @param session
 * @param next
 */
pro.addShopItem = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.addShopItem", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var playerName = session.get('name')
	var itemName = msg.itemName
	var count = msg.count
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
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

	this.request('addShopItem', [session.uid, playerName, allianceId, itemName, count]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 购买联盟商店的道具
 * @param msg
 * @param session
 * @param next
 */
pro.buyShopItem = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.buyShopItem", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var itemName = msg.itemName
	var count = msg.count
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
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

	this.request('buyShopItem', [session.uid, allianceId, itemName, count]).then(function(playerData){
		next(null, {code:200, playerData:playerData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var memberId = msg.memberId
	var count = msg.count
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		e = new Error("memberId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.isNumber(count) || count % 1 !== 0 || count <= 0){
		e = new Error("count 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('giveLoyaltyToAllianceMember', [session.uid, allianceId, memberId, count]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var allianceId = msg.allianceId;
	var serverId = msg.serverId;
	var e = null
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		e = new Error("allianceId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}
	if(!_.contains(this.app.get('cacheServerIds'), serverId)){
		e = new Error("serverId 不合法")
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getAllianceInfo', [session.uid, allianceId], serverId).then(function(allianceData){
		next(null, {code:200, allianceData:allianceData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getJoinRequestEvents', [session.uid, allianceId]).then(function(joinRequestEvents){
		next(null, {code:200, joinRequestEvents:joinRequestEvents})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getShrineReports', [session.uid, allianceId]).then(function(shrineReports){
		next(null, {code:200, shrineReports:shrineReports})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null
	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getAllianceFightReports', [session.uid, allianceId]).then(function(allianceFightReports){
		next(null, {code:200, allianceFightReports:allianceFightReports})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
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
	var e = null

	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		next(e, ErrorUtils.getError(e))
		return
	}

	this.request('getItemLogs', [session.uid, allianceId]).then(function(itemLogs){
		next(null, {code:200, itemLogs:itemLogs})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 移动联盟
 * @param msg
 * @param session
 * @param next
 */
pro.moveAlliance = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getItemLogs", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var targetMapIndex = msg.targetMapIndex;
	var e = null

	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isNumber(targetMapIndex) || targetMapIndex < 0 || targetMapIndex > Define.BigMapLength * Define.BigMapLength - 1){
		e = new Error('targetMapIndex 不合法');
		return next(e, ErrorUtils.getError(e))
	}

	this.request('moveAlliance', [session.uid, allianceId, targetMapIndex]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 进入被观察地块
 * @param msg
 * @param session
 * @param next
 */
pro.enterMapIndex = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.enterMapIndex", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var logicServerId = session.get('logicServerId');
	var mapIndex = msg.mapIndex;
	var e = null

	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isNumber(mapIndex) || mapIndex < 0 || mapIndex > Define.BigMapLength * Define.BigMapLength - 1){
		e = new Error('mapIndex 不合法');
		return next(e, ErrorUtils.getError(e))
	}

	this.request('enterMapIndex', [logicServerId, session.uid, allianceId, mapIndex]).spread(function(allianceData, mapData){
		next(null, {code:200, allianceData:allianceData, mapData:mapData})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 进入被观察地块后的心跳
 * @param msg
 * @param session
 * @param next
 */
pro.amInMapIndex = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.amInMapIndex", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var logicServerId = session.get('logicServerId');
	var mapIndex = msg.mapIndex;
	var e = null

	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isNumber(mapIndex) || mapIndex < 0 || mapIndex > Define.BigMapLength * Define.BigMapLength - 1){
		e = new Error('mapIndex 不合法');
		return next(e, ErrorUtils.getError(e))
	}

	this.request('amInMapIndex', [logicServerId, session.uid, mapIndex]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 玩家离开被观察的地块
 * @param msg
 * @param session
 * @param next
 */
pro.leaveMapIndex = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.leaveMapIndex", {playerId:session.uid, msg:msg})
	var allianceId = session.get('allianceId');
	var logicServerId = session.get('logicServerId');
	var mapIndex = msg.mapIndex;
	var e = null

	if(_.isEmpty(allianceId)){
		e = ErrorUtils.playerNotJoinAlliance(session.uid)
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isNumber(mapIndex) || mapIndex < 0 || mapIndex > Define.BigMapLength * Define.BigMapLength - 1){
		e = new Error('mapIndex 不合法');
		return next(e, ErrorUtils.getError(e))
	}

	this.request('leaveMapIndex', [logicServerId, session.uid, mapIndex]).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 在大地图中获取联盟基础信息
 * @param msg
 * @param session
 * @param next
 * @returns {*}
 */
pro.getMapAllianceDatas = function(msg, session, next){
	this.logService.onRequest("logic.allianceHandler.getMapAllianceDatas", {playerId:session.uid, msg:msg})
	var mapIndexs = msg.mapIndexs;
	var e = null

	if(!_.isArray(mapIndexs)){
		e = new Error('mapIndexs 不合法');
		return next(e, ErrorUtils.getError(e))
	}
	var hasError = _.some(mapIndexs, function(mapIndex){
		return !_.isNumber(mapIndex) || mapIndex < 0 || mapIndex > Define.BigMapLength * Define.BigMapLength - 1;
	})
	if(hasError){
		e = new Error('mapIndexs 不合法');
		return next(e, ErrorUtils.getError(e))
	}

	this.request('getMapAllianceDatas', [session.uid, mapIndexs]).then(function(datas){
		next(null, {code:200, datas:datas})
	}).catch(function(e){
		next(null, ErrorUtils.getError(e))
	})
}