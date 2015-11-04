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
	this.rankService = app.get("RankService")
}

var pro = RankHandler.prototype

/**
 * 获取玩家排名信息
 * @param msg
 * @param session
 * @param next
 */
pro.getPlayerRankList = function(msg, session, next){
	var self = this
	var rankType = msg.rankType
	var fromRank = msg.fromRank
	this.rankService.getPlayerRankListAsync(session.get('cacheServerId'), session.uid, rankType, fromRank).spread(function(myData, datas){
		next(null, {code:200, myData:myData, datas:datas})
	}).catch(function(e){
		self.logService.onWarning("rank.rankHandler.getPlayerRankList", {playerId:session.uid, msg:msg}, e.stack)
		next(null, ErrorUtils.getError(e))
	})
}

/**
 * 获取联盟排名信息
 * @param msg
 * @param session
 * @param next
 */
pro.getAllianceRankList = function(msg, session, next){
	var self = this
	var allianceId = msg.allianceId
	var rankType = msg.rankType
	var fromRank = msg.fromRank
	this.rankService.getAllianceRankListAsync(session.get('cacheServerId'), session.uid, allianceId, rankType, fromRank).spread(function(myData, datas){
		next(null, {code:200, myData:myData, datas:datas})
	}).catch(function(e){
		self.logService.onWarning("rank.rankHandler.getAllianceRankList", {playerId:session.uid, msg:msg}, e.stack)
		next(null, ErrorUtils.getError(e))
	})
}