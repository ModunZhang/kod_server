"use strict"

/**
 * Created by modun on 15/3/6.
 */
var _ = require("underscore")
var Promise = require("bluebird")

var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")

var DataService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.cacheServerId = app.get("cacheServerId")
	this.chatServerId = app.get("chatServerId")
	this.eventServerId = app.get("eventServerId")
	this.logicServers = _.filter(app.getServersFromConfig(), function(server){
		return _.isEqual(server.serverType, "logic") && _.isEqual(server.usedFor, app.get("cacheServerId"))
	})
	this.Player = app.get("Player")
	this.Alliance = app.get("Alliance")
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 获取玩家模型
 * @returns {*|DataService.Player}
 */
pro.getPlayerModel = function(){
	return this.Player
}

/**
 * 获取联盟模型
 * @returns {*|DataService.Alliance}
 */
pro.getAllianceModel = function(){
	return this.Alliance
}

/**
 * 获取玩家登陆时的数据
 * @param id
 * @param callback
 */
pro.loginPlayer = function(id, callback){
	this.app.rpc.cache.cacheRemote.loginPlayer.toServer(this.cacheServerId, id, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param keys
 * @param force
 * @param callback
 */
pro.directFindPlayer = function(id, keys, force, callback){
	this.app.rpc.cache.cacheRemote.directFindPlayer.toServer(this.cacheServerId, id, keys, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 按Id查询玩家
 * @param id
 * @param keys
 * @param force
 * @param callback
 */
pro.findPlayer = function(id, keys, force, callback){
	this.app.rpc.cache.cacheRemote.findPlayer.toServer(this.cacheServerId, id, keys, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象
 * @param doc
 * @param data
 * @param callback
 */
pro.updatePlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.updatePlayer.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param doc
 * @param data
 * @param callback
 */
pro.flushPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flushPlayer.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家并同步到Mongo最后将玩家从内存移除
 * @param doc
 * @param data
 * @param callback
 */
pro.timeoutPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.timeoutPlayer.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 为玩家添加系统邮件
 * @param id
 * @param titleKey
 * @param titleArgs
 * @param contentKey
 * @param contentArgs
 * @param callback
 */
pro.sendSysMail = function(id, titleKey, titleArgs, contentKey, contentArgs, callback){
	this.app.rpc.cache.cacheRemote.sendSysMail.toServer(this.cacheServerId, id, titleKey, titleArgs, contentKey, contentArgs, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 为玩家添加战报
 * @param id
 * @param report
 * @param callback
 */
pro.sendSysReport = function(id, report, callback){
	this.app.rpc.cache.cacheRemote.sendSysReport.toServer(this.cacheServerId, id, report, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 发送玩家邮件
 * @param id
 * @param memberId
 * @param title
 * @param content
 * @param callback
 */
pro.sendPlayerMail = function(id, memberId, title, content, callback){
	this.app.rpc.cache.cacheRemote.sendPlayerMail.toServer(this.cacheServerId, id, memberId, title, content, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 发送联盟邮件
 * @param id
 * @param allianceId
 * @param title
 * @param content
 * @param callback
 */
pro.sendAllianceMail = function(id, allianceId, title, content, callback){
	this.app.rpc.cache.cacheRemote.sendAllianceMail.toServer(this.cacheServerId, id, allianceId, title, content, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 阅读邮件
 * @param id
 * @param mailIds
 * @param callback
 */
pro.readPlayerMails = function(id, mailIds, callback){
	this.app.rpc.cache.cacheRemote.readPlayerMails.toServer(this.cacheServerId, id, mailIds, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 收藏邮件
 * @param id
 * @param mailId
 * @param callback
 */
pro.savePlayerMail = function(id, mailId, callback){
	this.app.rpc.cache.cacheRemote.savePlayerMail.toServer(this.cacheServerId, id, mailId, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 取消收藏邮件
 * @param id
 * @param mailId
 * @param callback
 */
pro.unSavePlayerMail = function(id, mailId, callback){
	this.app.rpc.cache.cacheRemote.unSavePlayerMail.toServer(this.cacheServerId, id, mailId, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 获取玩家邮件
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerMails = function(id, fromIndex, callback){
	this.app.rpc.cache.cacheRemote.getPlayerMails.toServer(this.cacheServerId, id, fromIndex, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 获取玩家已存邮件
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerSavedMails = function(id, fromIndex, callback){
	this.app.rpc.cache.cacheRemote.getPlayerSavedMails.toServer(this.cacheServerId, id, fromIndex, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 删除邮件
 * @param id
 * @param mailIds
 * @param callback
 */
pro.deletePlayerMails = function(id, mailIds, callback){
	this.app.rpc.cache.cacheRemote.deletePlayerMails.toServer(this.cacheServerId, id, mailIds, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 阅读战报
 * @param id
 * @param reportIds
 * @param callback
 */
pro.readPlayerReports = function(id, reportIds, callback){
	this.app.rpc.cache.cacheRemote.readPlayerReports.toServer(this.cacheServerId, id, reportIds, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 收藏战报
 * @param id
 * @param reportId
 * @param callback
 */
pro.savePlayerReport = function(id, reportId, callback){
	this.app.rpc.cache.cacheRemote.savePlayerReport.toServer(this.cacheServerId, id, reportId, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 取消收藏战报
 * @param id
 * @param reportId
 * @param callback
 */
pro.unSavePlayerReport = function(id, reportId, callback){
	this.app.rpc.cache.cacheRemote.unSavePlayerReport.toServer(this.cacheServerId, id, reportId, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 获取玩家战报
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerReports = function(id, fromIndex, callback){
	this.app.rpc.cache.cacheRemote.getPlayerReports.toServer(this.cacheServerId, id, fromIndex, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 获取玩家已存战报
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerSavedReports = function(id, fromIndex, callback){
	this.app.rpc.cache.cacheRemote.getPlayerSavedReports.toServer(this.cacheServerId, id, fromIndex, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 删除战报
 * @param id
 * @param reportIds
 * @param callback
 */
pro.deletePlayerReports = function(id, reportIds, callback){
	this.app.rpc.cache.cacheRemote.deletePlayerReports.toServer(this.cacheServerId, id, reportIds, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 创建联盟对象
 * @param alliance
 * @param callback
 */
pro.createAlliance = function(alliance, callback){
	this.app.rpc.cache.cacheRemote.createAlliance.toServer(this.cacheServerId, alliance, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 按Id直接查询联盟,不做请求排序
 * @param id
 * @param keys
 * @param force
 * @param callback
 */
pro.directFindAlliance = function(id, keys, force, callback){
	this.app.rpc.cache.cacheRemote.directFindAlliance.toServer(this.cacheServerId, id, keys, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 按Id查询联盟
 * @param id
 * @param keys
 * @param force
 * @param callback
 */
pro.findAlliance = function(id, keys, force, callback){
	this.app.rpc.cache.cacheRemote.findAlliance.toServer(this.cacheServerId, id, keys, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新联盟对象
 * @param doc
 * @param data
 * @param callback
 */
pro.updateAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.updateAlliance.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param doc
 * @param data
 * @param callback
 */
pro.flushAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.flushAlliance.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param doc
 * @param data
 * @param callback
 */
pro.timeoutAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.timeoutAlliance.toServer(this.cacheServerId, doc._id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, this)
	var addToEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.addToAllianceChannel.toServer, this)
	var addToLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(addToEventChannelAsync(this.eventServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	_.each(this.logicServers, function(server){
		funcs.push(addToLogicChannelAsync(server.id, allianceId, playerDoc._id, playerDoc.logicServerId))
	})
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("logic.dataService.addPlayerToAllianceChannel", {
			allianceId:allianceId,
			playerId:playerDoc._id
		}, e.stack)
	})
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, this)
	var removeFromEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.removeFromAllianceChannel.toServer, this)
	var removeFromLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(removeFromEventChannelAsync(this.eventServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	_.each(this.logicServers, function(server){
		funcs.push(removeFromLogicChannelAsync(server.id, allianceId, playerDoc._id, playerDoc.logicServerId))
	})
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("logic.dataService.removePlayerFromAllianceChannel", {
			allianceId:allianceId,
			playerId:playerDoc._id
		}, e.stack)
	})
	callback()
}

/**
 * 将玩家添加到所有频道中
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToChannels = function(playerDoc, callback){
	var self = this
	var addToChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToChatChannel.toServer, this)
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, this)
	var addToEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.addToAllianceChannel.toServer, this)
	var addToLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId))
	if(_.isString(playerDoc.allianceId)){
		funcs.push(addToChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(addToEventChannelAsync(this.eventServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		_.each(this.logicServers, function(server){
			funcs.push(addToLogicChannelAsync(server.id, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		})
	}
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("logic.dataService.addPlayerToChannels", {playerId:playerDoc._id}, e.stack)
	})
	callback()
}

/**
 * 将玩家从所有频道中移除
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromChannels = function(playerDoc, callback){
	var self = this
	var removeFromChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromChatChannel.toServer, this)
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, this)
	var removeFromEventChannelAsync = Promise.promisify(this.app.rpc.event.eventRemote.removeFromAllianceChannel.toServer, this)
	var removeFromLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId))
	if(_.isString(playerDoc.allianceId)){
		funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(removeFromEventChannelAsync(this.eventServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		_.each(this.logicServers, function(server){
			funcs.push(removeFromLogicChannelAsync(server.id, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		})
	}
	Promise.all(funcs).catch(function(e){
		self.logService.onEventError("logic.dataService.removePlayerFromChannels", {playerId:playerDoc._id}, e.stack)
	})
	callback()
}

/**
 * 更新玩家session信息
 * @param playerDoc
 * @param keys
 * @param values
 * @param callback
 */
pro.updatePlayerSession = function(playerDoc, keys, values, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback()
		return
	}
	var self = this
	this.app.rpc.logic.logicRemote.updatePlayerSession.toServer(playerDoc.logicServerId, playerDoc._id, keys, values, function(e){
		if(_.isObject(e)){
			self.logService.onEventError("logic.dataService.updatePlayerSession", {
				playerId:playerDoc._id,
				keys:keys,
				values:values
			}, e.stack)
		}
	})
	callback()
}

/**
 * 玩家是否在线
 * @param playerDoc
 * @param callback
 */
pro.isPlayerOnline = function(playerDoc, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback(null, false)
		return
	}
	this.app.rpc.logic.logicRemote.isPlayerOnline.toServer(playerDoc.logicServerId, playerDoc._id, callback)
}