"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")

var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new CacheRemote(app)
}

var CacheRemote = function(app){
	this.app = app
	this.dataService = app.get("dataService")
	this.channelService = app.get('channelService')
	this.timeEventService = app.get("timeEventService")
}

var pro = CacheRemote.prototype

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param keys
 * @param force
 * @param callback
 */
pro.directFindPlayer = function(id, keys, force, callback){
	this.dataService.directFindPlayer(id, keys, force, function(e, doc){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
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
	this.dataService.findPlayer(id, keys, force, function(e, doc){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
	})
}

/**
 * 更新玩家对象
 * @param id
 * @param doc
 * @param callback
 */
pro.updatePlayer = function(id, doc, callback){
	this.dataService.updatePlayer(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param doc
 * @param callback
 */
pro.flushPlayer = function(id, doc, callback){
	this.dataService.flushPlayer(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 更新玩家并同步到Mongo最后将玩家从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutPlayer = function(id, doc, callback){
	this.dataService.timeoutPlayer(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 创建联盟对象
 * @param alliance
 * @param callback
 */
pro.createAlliance = function(alliance, callback){
	this.dataService.createAlliance(alliance, function(e, doc){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
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
	this.dataService.directFindAlliance(id, keys, force, function(e, doc){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
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
	this.dataService.findAlliance(id, keys, force, function(e, doc){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
	})
}

/**
 * 更新联盟对象
 * @param id
 * @param doc
 * @param callback
 */
pro.updateAlliance = function(id, doc, callback){
	this.dataService.updateAlliance(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param doc
 * @param callback
 */
pro.flushAlliance = function(id, doc, callback){
	this.dataService.flushAlliance(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutAlliance = function(id, doc, callback){
	this.dataService.timeoutAlliance(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 删除联盟
 * @param id
 * @param callback
 */
pro.deleteAlliance = function(id, callback){
	this.dataService.deleteAlliance(id, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}


/**
 * 获取玩家登陆时的数据
 * @param id
 * @param callback
 */
pro.loginPlayer = function(id, callback){
	this.dataService.loginPlayer(id, function(e, datas){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:datas})
	})
}

/**
 * 为玩家添加邮件
 * @param id
 * @param titleKey
 * @param titleArgs
 * @param contentKey
 * @param contentArgs
 * @param callback
 */
pro.sendSysMail = function(id, titleKey, titleArgs, contentKey, contentArgs, callback){
	this.dataService.sendSysMail(id, titleKey, titleArgs, contentKey, contentArgs, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 为玩家添加战报
 * @param id
 * @param report
 * @param callback
 */
pro.sendSysReport = function(id, report, callback){
	this.dataService.sendSysReport(id, report, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
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
	this.dataService.sendPlayerMail(id, memberId, title, content, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
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
	this.dataService.sendAllianceMail(id, allianceId, title, content, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 阅读邮件
 * @param id
 * @param mailIds
 * @param callback
 */
pro.readPlayerMails = function(id, mailIds, callback){
	this.dataService.readPlayerMails(id, mailIds, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 收藏邮件
 * @param id
 * @param mailId
 * @param callback
 */
pro.savePlayerMail = function(id, mailId, callback){
	this.dataService.savePlayerMail(id, mailId, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 取消收藏邮件
 * @param id
 * @param mailId
 * @param callback
 */
pro.unSavePlayerMail = function(id, mailId, callback){
	this.dataService.unSavePlayerMail(id, mailId, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 获取玩家邮件
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerMails = function(id, fromIndex, callback){
	this.dataService.getPlayerMails(id, fromIndex, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 获取玩家已存邮件
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerSavedMails = function(id, fromIndex, callback){
	this.dataService.getPlayerSavedMails(id, fromIndex, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 删除邮件
 * @param id
 * @param mailIds
 * @param callback
 */
pro.deletePlayerMails = function(id, mailIds, callback){
	this.dataService.deletePlayerMails(id, mailIds, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 阅读战报
 * @param id
 * @param reportIds
 * @param callback
 */
pro.readPlayerReports = function(id, reportIds, callback){
	this.dataService.readPlayerReports(id, reportIds, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 收藏战报
 * @param id
 * @param reportId
 * @param callback
 */
pro.savePlayerReport = function(id, reportId, callback){
	this.dataService.savePlayerReport(id, reportId, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 取消收藏战报
 * @param id
 * @param reportId
 * @param callback
 */
pro.unSavePlayerReport = function(id, reportId, callback){
	this.dataService.unSavePlayerReport(id, reportId, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 获取玩家战报
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerReports = function(id, fromIndex, callback){
	this.dataService.getPlayerReports(id, fromIndex, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 获取玩家已存战报
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerSavedReports = function(id, fromIndex, callback){
	this.dataService.getPlayerSavedReports(id, fromIndex, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}

/**
 * 删除战报
 * @param id
 * @param reportIds
 * @param callback
 */
pro.deletePlayerReports = function(id, reportIds, callback){
	this.dataService.deletePlayerReports(id, reportIds, function(e, data){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:data})
	})
}


/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param uid
 * @param logicServerId
 * @param callback
 */
pro.addToAllianceChannel = function(allianceId, uid, logicServerId, callback){
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
 * 添加时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 */
pro.addTimeEvent = function(key, eventType, eventId, timeInterval, callback){
	this.timeEventService.addTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 移除时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(key, eventType, eventId, callback){
	this.timeEventService.removeTimeEvent(key, eventType, eventId, callback)
}

/**
 * 更新时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 */
pro.updateTimeEvent = function(key, eventType, eventId, timeInterval, callback){
	this.timeEventService.updateTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 清除指定Key所有的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEventsByKey = function(key, callback){
	this.timeEventService.clearTimeEventsByKey(key, callback)
}