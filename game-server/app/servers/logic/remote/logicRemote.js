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
	this.sessionService = app.get("sessionService")
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

/**
 * 更新玩家session信息
 * @param playerId
 * @param keys
 * @param values
 * @param callback
 */
pro.updatePlayerSession = function(playerId, keys, values, callback){
	if(keys.length != values.length || keys.length == 0){
		callback()
		return
	}

	var sessions = this.sessionService.service.uidMap[playerId]
	if(sessions.length == 0) callback()
	else{
		var session = sessions[0]
		for(var i = 0; i < keys.length; i ++){
			session.settings[keys[i]] = values[i]
		}
		callback()
	}
}

/**
 * 玩家是否在线
 * @param playerId
 * @param callback
 */
pro.isPlayerOnline = function(playerId, callback){
	var sessions = this.sessionService.service.uidMap[playerId]
	callback(null, sessions.length > 0)
}