"use strict"

/**
 * Created by modun on 14-7-29.
 */

var ShortId = require('shortid')
var _ = require("underscore")
var toobusy = require("toobusy-js")
var Promise = require("bluebird")

var ErrorUtils = require("../../../utils/errorUtils")
var LogicUtils = require("../../../utils/logicUtils")
var DataUtils = require("../../../utils/dataUtils")
var Define = require("../../../consts/define")
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
		if(_.isEmpty(doc)) return Promise.reject(ErrorUtils.playerNotExist(id, id))
		if(!_.isEqual(doc.serverId, self.app.get("cacheServerId"))){
			return new Promise(function(resolve, reject){
				self.cacheService.removePlayerAsync(id).then(function(){
					reject(ErrorUtils.playerNotInCurrentServer(doc._id, self.app.get("cacheServerId"), doc.serverId))
				})
			})
		}

		var unreadMails = _.filter(doc.mails, function(mail){
			return !mail.isRead
		}).length
		var unreadReports = _.filter(doc.reports, function(report){
			return !report.isRead
		}).length
		playerDoc = _.omit(doc, ["mails", "sendMails", "reports"])
		playerDoc.mailStatus = {
			unreadMails:unreadMails,
			unreadReports:unreadReports
		}
		playerDoc.serverTime = Date.now()
		if(!_.isEmpty(playerDoc.allianceId)){
			return self.cacheService.findAllianceAsync(playerDoc.allianceId, [], false).then(function(doc){
				allianceDoc = _.omit(doc, ["joinRequestEvents", "shrineReports", "allianceFightReports", "itemLogs"])
				if(_.isObject(allianceDoc.allianceFight)){
					var enemyAllianceId = LogicUtils.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
					return self.cacheService.directFindAllianceAsync(enemyAllianceId, [], false).then(function(doc){
						enemyAllianceDoc = _.pick(doc, Consts.AllianceViewDataKeys)
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
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {
			code:200,
			data:_.isEmpty(doc) ? null : doc
		})
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
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {
			code:200,
			data:_.isEmpty(doc) ? null : doc
		})
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
 * 发送玩家邮件
 * @param id
 * @param memberId
 * @param title
 * @param content
 * @param callback
 */
pro.sendPlayerMail = function(id, memberId, title, content, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.sendPlayerMail", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var memberDoc = null
	var memberData = []
	var allianceDoc = null
	var updateFuncs = []
	this.cacheService.findPlayerAsync(id, ['_id', 'allianceId', 'basicInfo', 'sendMails'], false).then(function(doc){
		playerDoc = doc
		return self.cacheService.findPlayerAsync(memberId, ['_id', 'logicServerId', 'basicInfo', 'mails'], false)
	}).then(function(doc){
		if(_.isEmpty(doc)) return Promise.reject(ErrorUtils.playerNotExist(id, memberId))
		memberDoc = doc
		if(!_.isEmpty(playerDoc.allianceId)){
			return self.cacheService.directFindAllianceAsync(playerDoc.allianceId, ['_id', 'basicInfo'], false).then(function(doc){
				allianceDoc = doc
			})
		}else return Promise.resolve()
	}).then(function(){
		var mailToMember = {
			id:ShortId.generate(),
			title:title,
			fromId:playerDoc._id,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:_.isObject(allianceDoc) ? allianceDoc.basicInfo.tag : "",
			content:content,
			sendTime:Date.now(),
			isRead:false,
			isSaved:false
		}
		if(memberDoc.mails.length >= Define.PlayerMailsMaxSize){
			var mail = LogicUtils.getPlayerFirstUnSavedMail(memberDoc)
			LogicUtils.removeItemInArray(memberDoc.mails, mail)
			memberData.push(["mails." + memberDoc.mails.indexOf(mail), null])
		}
		memberDoc.mails.push(mailToMember)
		memberData.push(["mails." + memberDoc.mails.indexOf(mailToMember), mailToMember])

		var mailToPlayer = {
			id:ShortId.generate(),
			title:title,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:_.isObject(allianceDoc) ? allianceDoc.basicInfo.tag : "",
			toId:memberDoc._id,
			toName:memberDoc.basicInfo.name,
			content:content,
			sendTime:Date.now()
		}
		if(playerDoc.sendMails.length >= Define.PlayerSendMailsMaxSize){
			playerDoc.sendMails.shift()
			playerData.push(["sendMails.0", null])
		}
		playerDoc.sendMails.push(mailToPlayer)
		playerData.push(["sendMails." + playerDoc.sendMails.indexOf(mailToPlayer), mailToPlayer])

		updateFuncs.push(self.cacheService.updatePlayerAsync(id, playerDoc))
		updateFuncs.push(self.cacheService.updatePlayerAsync(memberId, memberDoc))
		return Promise.all(updateFuncs)
	}).then(function(){
		callback(null, {code:200, data:[playerData, {_id:memberDoc._id, logicServerId:memberDoc.logicServerId}, memberData]})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(memberId, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
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
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.sendPlayerMail", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var memberDocs = []
	var memberDatas = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(id, ['_id', 'basicInfo', 'mails', 'sendMails'], false).then(function(doc){
		playerDoc = doc
		return self.cacheService.directFindAllianceAsync(allianceId, ['_id', 'basicInfo', 'members'], false)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, id)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "sendAllianceMail"))
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(id, allianceId, "sendAllianceMail"));

		var funcs = []
		_.each(allianceDoc.members, function(member){
			if(!_.isEqual(member.id, id))
				funcs.push(self.cacheService.findPlayerAsync(member.id, ['_id', 'logicServerId', 'mails'], false))
		})
		return Promise.all(funcs)
	}).then(function(docs){
		memberDocs = docs

		var mailToPlayer = {
			id:ShortId.generate(),
			title:title,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:allianceDoc.basicInfo.tag,
			toId:"__allianceMembers",
			toName:"__allianceMembers",
			content:content,
			sendTime:Date.now()
		}
		var mailToMember = {
			id:ShortId.generate(),
			title:title,
			fromId:playerDoc._id,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:allianceDoc.basicInfo.tag,
			content:content,
			sendTime:Date.now(),
			isRead:false,
			isSaved:false
		}

		if(playerDoc.sendMails.length >= Define.PlayerSendMailsMaxSize){
			playerDoc.sendMails.shift()
			playerData.push(["sendMails.0", null])
		}
		playerDoc.sendMails.push(mailToPlayer)
		playerData.push(["sendMails." + playerDoc.sendMails.indexOf(mailToPlayer), mailToPlayer])

		if(playerDoc.mails.length >= Define.PlayerMailsMaxSize){
			var mail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
			playerData.push(["mails." + playerDoc.mails.indexOf(mail), null])
			LogicUtils.removeItemInArray(playerDoc.mails, mail)
		}
		playerDoc.mails.push(mailToMember)
		playerData.push(["mails." + playerDoc.mails.indexOf(mailToMember), mailToMember])
		updateFuncs.push(self.cacheService.updatePlayerAsync(id, playerDoc))

		_.each(memberDocs, function(memberDoc){
			var memberData = {}
			memberData.doc = {_id:memberDoc._id, logicServerId:memberDoc.logicServerId}
			memberData.data = []
			if(memberDoc.mails.length >= Define.PlayerMailsMaxSize){
				var mail = LogicUtils.getPlayerFirstUnSavedMail(memberDoc)
				memberData.data.push(["mails." + memberDoc.mails.indexOf(mail), null])
				LogicUtils.removeItemInArray(memberDoc.mails, mail)
			}
			memberDoc.mails.push(mailToMember)
			memberData.data.push(["mails." + memberDoc.mails.indexOf(mailToMember), mailToMember])
			memberDatas.push(memberData)
			updateFuncs.push(self.cacheService.updatePlayerAsync(memberDoc._id, memberDoc))
		})
		return Promise.all(updateFuncs)
	}).then(function(){
		callback(null, {code:200, data:[playerData, memberDatas]})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
		})
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 阅读邮件
 * @param id
 * @param mailIds
 * @param callback
 */
pro.readPlayerMails = function(id, mailIds, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.readPlayerMails", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'mails'], false).then(function(doc){
		playerDoc = doc
		for(var i = 0; i < mailIds.length; i++){
			var mail = LogicUtils.getPlayerMailById(playerDoc, mailIds[i])
			if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailIds[i]))
			mail.isRead = true
			playerData.push(["mails." + playerDoc.mails.indexOf(mail) + ".isRead", true])
		}
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 收藏邮件
 * @param id
 * @param mailId
 * @param callback
 */
pro.savePlayerMail = function(id, mailId, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.savePlayerMail", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'mails'], false).then(function(doc){
		playerDoc = doc
		var mail = LogicUtils.getPlayerMailById(playerDoc, mailId)
		if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailId))
		mail.isSaved = true
		playerData.push(["mails." + playerDoc.mails.indexOf(mail) + ".isSaved", true])
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 取消收藏邮件
 * @param id
 * @param mailId
 * @param callback
 */
pro.unSavePlayerMail = function(id, mailId, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.unSavePlayerMail", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'mails'], false).then(function(doc){
		playerDoc = doc
		var mail = LogicUtils.getPlayerMailById(playerDoc, mailId)
		if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailId))
		mail.isSaved = false
		playerData.push(["mails." + playerDoc.mails.indexOf(mail) + ".isSaved", mail.isSaved])
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 获取玩家邮件
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerMails = function(id, fromIndex, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.getPlayerMails", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var playerDoc = null
	var mails = []
	this.cacheService.directFindPlayerAsync(id, ['_id', 'mails'], false).then(function(doc){
		playerDoc = doc
		for(var i = playerDoc.mails.length - 1; i >= 0; i--){
			var mail = playerDoc.mails[i]
			mail.index = i
			mails.push(mail)
		}
		mails = mails.slice(fromIndex, fromIndex + Define.PlayerMaxReturnMailSize)
		return Promise.resolve()
	}).then(function(){
		callback(null, {code:200, data:mails})
	}).catch(function(e){
		callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
	})
}

/**
 * 获取玩家已存邮件
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerSavedMails = function(id, fromIndex, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.getPlayerSavedMails", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var playerDoc = null
	var mails = []
	this.cacheService.directFindPlayerAsync(id, ['_id', 'mails'], false).then(function(doc){
		playerDoc = doc
		for(var i = playerDoc.mails.length - 1; i >= 0; i--){
			var mail = playerDoc.mails[i]
			mail.index = i
			if(!!mail.isSaved) mails.push(mail)
		}
		mails = mails.slice(fromIndex, fromIndex + Define.PlayerMaxReturnMailSize)
		return Promise.resolve()
	}).then(function(){
		callback(null, {code:200, data:mails})
	}).catch(function(e){
		callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
	})
}

/**
 * 删除邮件
 * @param id
 * @param mailIds
 * @param callback
 */
pro.deletePlayerMails = function(id, mailIds, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.deletePlayerMails", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'mails'], false).then(function(doc){
		playerDoc = doc
		for(var i = 0; i < mailIds.length; i++){
			var mail = LogicUtils.getPlayerMailById(playerDoc, mailIds[i])
			if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailIds[i]))
			playerData.push(["mails." + playerDoc.mails.indexOf(mail), null])
			LogicUtils.removeItemInArray(playerDoc.mails, mail)
		}
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 阅读战报
 * @param id
 * @param reportIds
 * @param callback
 */
pro.readPlayerReports = function(id, reportIds, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.readPlayerReports", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'reports'], false).then(function(doc){
		playerDoc = doc
		for(var i = 0; i < reportIds.length; i++){
			var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
			if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportIds[i]))
			report.isRead = true
			playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isRead", true])
		}
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 收藏战报
 * @param id
 * @param reportId
 * @param callback
 */
pro.savePlayerReport = function(id, reportId, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.savePlayerReport", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'reports'], false).then(function(doc){
		playerDoc = doc
		var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
		if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportId))
		report.isSaved = true
		playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isSaved", true])
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 取消收藏战报
 * @param id
 * @param reportId
 * @param callback
 */
pro.unSavePlayerReport = function(id, reportId, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.unSavePlayerReport", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'reports'], false).then(function(doc){
		playerDoc = doc
		var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
		if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportId))
		report.isSaved = false
		playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isSaved", report.isSaved])
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
	})
}

/**
 * 获取玩家战报
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerReports = function(id, fromIndex, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.getPlayerReports", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var playerDoc = null
	var reports = []
	this.cacheService.directFindPlayerAsync(id, ['_id', 'reports'], false).then(function(doc){
		playerDoc = doc
		for(var i = playerDoc.reports.length - 1; i >= 0; i--){
			var report = playerDoc.reports[i]
			report.index = i
			reports.push(report)
		}
		reports = reports.slice(fromIndex, fromIndex + Define.PlayerMaxReturnReportSize)
		return Promise.resolve()
	}).then(function(){
		callback(null, {code:200, data:reports})
	}).catch(function(e){
		callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
	})
}

/**
 * 获取玩家已存战报
 * @param id
 * @param fromIndex
 * @param callback
 */
pro.getPlayerSavedReports = function(id, fromIndex, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.getPlayerSavedReports", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var playerDoc = null
	var reports = []
	this.cacheService.directFindPlayerAsync(id, ['_id', 'reports'], false).then(function(doc){
		playerDoc = doc
		for(var i = playerDoc.reports.length - 1; i >= 0; i--){
			var report = playerDoc.reports[i]
			report.index = i
			if(!!report.isSaved) reports.push(report)
		}
		reports = reports.slice(fromIndex, fromIndex + Define.PlayerMaxReturnReportSize)
		return Promise.resolve()
	}).then(function(){
		callback(null, {code:200, data:reports})
	}).catch(function(e){
		callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
	})
}

/**
 * 删除战报
 * @param id
 * @param reportIds
 * @param callback
 */
pro.deletePlayerReports = function(id, reportIds, callback){
	if(toobusy()){
		var e = ErrorUtils.serverTooBusy("cache.cacheRemote.deletePlayerReports", {id:id})
		callback(null, {code:e.code, data:e.message})
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(id, ['_id', 'reports'], false).then(function(doc){
		playerDoc = doc
		for(var i = 0; i < reportIds.length; i++){
			var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
			if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportIds[i]))
			playerData.push(["reports." + playerDoc.reports.indexOf(report), null])
			LogicUtils.removeItemInArray(playerDoc.reports, report)
		}
		return self.cacheService.updatePlayerAsync(id, playerDoc)
	}).then(function(){
		callback(null, {code:200, data:playerData})
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(id, null))
		}
		Promise.all(funcs).then(function(){
			callback(null, {code:_.isNumber(e.code) ? e.code : 500, data:e.message})
		})
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
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {
			code:200,
			data:_.isEmpty(doc) ? null : doc
		})
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
		callback(null, _.isObject(e) ? {code:_.isNumber(e.code) ? e.code : 500, data:e.message} : {
			code:200,
			data:_.isEmpty(doc) ? null : doc
		})
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