"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")
var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app){
	return new RankHandler(app)
}

var RankHandler = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.rankService = app.get("rankService")
}

var pro = RankHandler.prototype

/**
 * 获取玩家排名信息
 * @param msg
 * @param session
 * @param next
 */
pro.getPlayerRankList = function(msg, session, next){
	var rankType = msg.rankType;
	var fromRank = msg.fromRank;
	var e = null;
	if(!_.contains(Consts.RankTypes, rankType)){
		e = new Error("rankType 不合法")
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isNumber(fromRank) || fromRank % 1 !== 0 || fromRank < 0 || fromRank > 80){
		e = new Error("fromRank 不合法")
		return next(e, ErrorUtils.getError(e))
	}

	this.rankService.getPlayerRankListAsync(session.get('cacheServerId'), session.uid, rankType, fromRank).spread(function(myData, datas){
		next(e, {code:200, myData:myData, datas:datas})
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
	var allianceId = session.get('allianceId');
	var rankType = msg.rankType
	var fromRank = msg.fromRank
	var e = null;
	if(!_.contains(Consts.RankTypes, rankType)){
		e = new Error("rankType 不合法")
		return next(e, ErrorUtils.getError(e))
	}
	if(!_.isNumber(fromRank) || fromRank % 1 !== 0 || fromRank < 0 || fromRank > 80){
		e = new Error("fromRank 不合法")
		return next(e, ErrorUtils.getError(e))
	}

	this.rankService.getAllianceRankListAsync(session.get('cacheServerId'), allianceId, rankType, fromRank).spread(function(myData, datas){
		next(e, {code:200, myData:myData, datas:datas})
	}).catch(function(e){
		next(e, ErrorUtils.getError(e))
	})
}