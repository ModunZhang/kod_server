"use strict"

/**
 * Created by modun on 14-8-7.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../consts/consts")
var Events = require("../consts/events")
var Utils = require("../utils/utils")
var LogicUtils = require("../utils/logicUtils")
var VersionUtils = require("../utils/versionUtils")

var PushService = function(app){
	this.app = app
	this.channelService = app.get("channelService")
	this.globalChannelService = app.get("globalChannelService")
	this.serverId = app.getServerId()
	this.serverType = app.getServerType()
	this.serverVersion = VersionUtils.getServerVersion()
}
module.exports = PushService
var pro = PushService.prototype

/**
 * 推送消息给单个玩家
 * @param playerDoc
 * @param eventName
 * @param data
 * @param callback
 */
pro.pushToPlayer = function(playerDoc, eventName, data, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback()
		return
	}
	this.channelService.pushMessageByUids(eventName, data, [{uid:playerDoc._id, sid:playerDoc.logicServerId}], callback)
}

/**
 * 推送信息给某部分玩家
 * @param playerDocs
 * @param eventName
 * @param data
 * @param callback
 */
pro.pushToPlayers = function(playerDocs, eventName, data, callback){
	var ids = []
	_.each(playerDocs, function(playerDoc){
		if(!_.isEmpty(playerDoc.logicServerId)){
			ids.push({
				uid:playerDoc._id,
				sid:playerDoc.logicServerId
			})
		}
	})
	this.channelService.pushMessageByUids(eventName, data, ids, callback)
}

/**
 * 推送玩家数据给玩家
 * @param playerDoc
 * @param data
 * @param callback
 */
pro.onPlayerDataChanged = function(playerDoc, data, callback){
	this.pushToPlayer(playerDoc, Events.player.onPlayerDataChanged, data, callback)
}

/**
 * 成功获取联盟完整数据
 * @param playerDoc
 * @param allianceDoc
 * @param callback
 */
pro.onGetAllianceDataSuccess = function(playerDoc, allianceDoc, callback){
	this.pushToPlayer(playerDoc, Events.player.onGetAllianceDataSuccess, allianceDoc, callback)
}

/**
 * 推送联盟数据给玩家
 * @param allianceId
 * @param data
 * @param callback
 */
pro.onAllianceDataChanged = function(allianceId, data, callback){
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + allianceId
	this.globalChannelService.pushMessage(this.serverType, eventName, data, channelName, null, callback)
}

/**
 * 推送给联盟除指定玩家之外的其他玩家
 * @param allianceId
 * @param data
 * @param memberId
 * @param callback
 */
pro.onAllianceDataChangedExceptMemberId = function(allianceId, data, memberId, callback){
	var self = this
	var eventName = Events.alliance.onAllianceDataChanged
	var channelName = Consts.AllianceChannelPrefix + allianceId
	var servers = this.app.getServersByType(this.serverType)
	var uids = []
	var getMembersFunc = function(serverId){
		return self.globalChannelService.getMembersBySidAsync(channelName, serverId).then(function(members){
			_.each(members, function(playerId){
				if(!_.isEqual(playerId, memberId)) uids.push({uid:playerId, sid:serverId})
			})
			return Promise.resolve()
		}).catch(function(e){
			return Promise.reject(e)
		})
	}
	var funcs = []
	_.each(servers, function(server){
		funcs.push(getMembersFunc(server.id))
	})
	Promise.all(funcs).then(function(){
		if(uids.length > 0){
			self.channelService.pushMessageByUids(eventName, data, uids, callback)
		}else{
			callback()
		}
	}).catch(function(e){
		callback(e)
	})
}