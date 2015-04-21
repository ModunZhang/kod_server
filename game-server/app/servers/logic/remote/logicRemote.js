"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var Consts = require("../../../consts/consts")

module.exports = function(app) {
	return new LogicRemote(app)
}

var LogicRemote = function(app) {
	this.app = app
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.allianceTimeEventService = app.get("allianceTimeEventService")
	this.sessionService = app.get("sessionService")
	this.logService = app.get("logService")
	this.channelService = app.get("channelService")
}
var pro = LogicRemote.prototype

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.addToAllianceChannel = function(allianceId, uid, logicServerId , callback){
	this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, true).add(uid, logicServerId)
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.removeFromAllianceChannel = function(allianceId, uid, logicServerId, callback){
	var channel = this.channelService.getChannel(Consts.AllianceChannelPrefix + "_" + allianceId, false)
	channel.leave(uid, logicServerId)
	if(channel.getMembers().length == 0) channel.destroy()
	callback()
}

/**
 * 将玩家踢下线
 * @param uid
 * @param reason
 * @param callback
 */
pro.kickPlayer = function(uid, reason, callback){
	this.logService.onRequest("logic.logicRemote.kickPlayer", {playerId:uid, reason:reason})
	this.sessionService.kick(uid, reason, callback)
}

/**
 * 设置服务器状态
 * @param status
 * @param callback
 */
pro.setServerStatus = function(status, callback){
	this.app.set("serverStatus", status)
	callback()
}

/**
 * 获取在线玩家数量
 * @param callback
 */
pro.getOnlineUser = function(callback){
	var connectionService = this.app.components.__connection__
	var statisticsInfo = connectionService.getStatisticsInfo()
	callback(null, statisticsInfo.loginedCount)
}
