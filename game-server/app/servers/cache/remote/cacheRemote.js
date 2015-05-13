"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var toobusy = require("toobusy-js")
var Promise = require("bluebird")

var ErrorUtils = require("../../../utils/errorUtils")
var LogicUtils = require("../../../utils/logicUtils")
var Consts = require("../../../consts/consts")

module.exports = function(app){
	return new CacheRemote(app)
}

var CacheRemote = function(app){
	this.app = app
	this.cacheService = app.get("cacheService")
	this.logService = app.get("logService")
	this.toobusyMaxLag = 140
	this.toobusyInterval = 100

	toobusy.maxLag(this.toobusyMaxLag)
	toobusy.interval(this.toobusyInterval)
}

var pro = CacheRemote.prototype

/**
 * 获取玩家登陆时的数据
 * @param id
 * @param callback
 */
pro.loginPlayer = function(id, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.directFindPlayer", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var enemyAllianceDoc = null
	this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
		if(!_.isEqual(doc.serverId, self.app.get("cacheServerId"))){
			return Promise.reject(ErrorUtils.playerNotInCurrentServer(playerDoc._id, self.app.get("cacheServerId"), playerDoc.serverId))
		}

		var unreadMails = _.filter(doc.mails, function(mail){
			return !mail.isRead
		}).length
		var unreadReports = _.filter(doc.reports, function(report){
			return !report.isRead
		}).length
		playerDoc = _.omit(doc, ["mails", "sendMails", "reports"])
		playerDoc.mails = []
		playerDoc.sendMails = []
		playerDoc.reports = []
		playerDoc.mailStatus = {
			unreadMails:unreadMails,
			unreadReports:unreadReports
		}
		playerDoc.serverTime = Date.now()

		if(!_.isEmpty(playerDoc.allianceId)){
			return self.cacheService.findAllianceAsync(playerDoc.allianceId, [], false).then(function(doc){
				allianceDoc = _.omit(doc, ["joinRequestEvents", "shrineReports", "allianceFightReports", "itemLogs"])
				allianceDoc.joinRequestEvents = []
				allianceDoc.shrineReports = []
				allianceDoc.allianceFightReports = []
				allianceDoc.itemLogs = []
				if(_.isObject(allianceDoc.allianceFight)){
					var enemyAllianceId = LogicUtils.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
					return self.cacheService.directFindAllianceAsync(enemyAllianceId, [], false).then(function(doc){
						enemyAllianceDoc = _.omit(doc, Consts.AllianceViewDataKeys)
						return Promise.resolve()
					})
				}else return Promise.resolve()
			})
		}else return Promise.resolve()
	}).then(function(){
		callback(null, {code:200, data:[playerDoc, allianceDoc, enemyAllianceDoc]})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
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
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.directFindPlayer", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}
	this.cacheService.directFindPlayer(id, keys, force, function(e, doc){
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
	if(!force && toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.findPlayer", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}
	this.cacheService.findPlayer(id, keys, force, function(e, doc){
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
	this.cacheService.updatePlayer(id, doc, function(e){
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
	this.cacheService.flushPlayer(id, doc, function(e){
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
	this.cacheService.timeoutPlayer(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:null})
	})
}

/**
 * 创建联盟对象
 * @param doc
 * @param callback
 */
pro.createAlliance = function(doc, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.createAlliance", {
			id:doc._id,
			name:doc.basicInfo.name,
			tag:doc.basicInfo.tag
		})
		callback(null, {code:e.code, data:e.message})
		return
	}
	this.cacheService.createAlliance(doc, function(e, theDoc){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:theDoc})
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
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.directFindAlliance", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}
	this.cacheService.directFindAlliance(id, keys, force, function(e, doc){
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
	if(!force && toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.directFindAlliance", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}
	this.cacheService.findAlliance(id, keys, force, function(e, doc){
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
	this.cacheService.updateAlliance(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param doc
 * @param callback
 */
pro.flushAlliance = function(id, doc, callback){
	this.cacheService.flushAlliance(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
	})
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutAlliance = function(id, doc, callback){
	this.cacheService.timeoutAlliance(id, doc, function(e){
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {code:200, data:doc})
	})
}