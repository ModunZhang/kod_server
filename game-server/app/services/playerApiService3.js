"use strict"

/**
 * Created by modun on 14-7-23.
 */
var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")
var crypto = require("crypto")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService3 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = PlayerApiService3
var pro = PlayerApiService3.prototype


/**
 * 取消收藏邮件
 * @param playerId
 * @param mailId
 * @param callback
 */
pro.unSaveMail = function(playerId, mailId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(mailId)){
		callback(new Error("mailId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var mail = LogicUtils.getPlayerMailById(playerDoc, mailId)
		if(!_.isObject(mail)){
			return Promise.reject(new Error("邮件不存在"))
		}
		var playerData = {}
		mail.isSaved = false
		playerData.__mails = [{
			type:Consts.DataChangedType.Edit,
			data:mail
		}]
		playerData.__savedMails = [{
			type:Consts.DataChangedType.Remove,
			data:mail
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取玩家邮件
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getMails = function(playerId, fromIndex, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		return self.pushService.onGetMailsSuccessAsync(playerDoc, fromIndex)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取玩家已发邮件
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getSendMails = function(playerId, fromIndex, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		return self.pushService.onGetSendMailsSuccessAsync(playerDoc, fromIndex)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取玩家已存邮件
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getSavedMails = function(playerId, fromIndex, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		return self.pushService.onGetSavedMailsSuccessAsync(playerDoc, fromIndex)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 删除邮件
 * @param playerId
 * @param mailIds
 * @param callback
 */
pro.deleteMails = function(playerId, mailIds, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isArray(mailIds) || mailIds.length == 0){
		callback(new Error("mailIds 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var playerData = {}
		playerData.__mails = []
		playerData.__savedMails = []
		for(var i = 0; i < mailIds.length; i ++){
			var mail = LogicUtils.getPlayerMailById(playerDoc, mailIds[i])
			if(!_.isObject(mail)){
				return Promise.reject(new Error("邮件不存在"))
			}
			LogicUtils.removeItemInArray(playerDoc.mails, mail)
			playerData.__mails.push({
				type:Consts.DataChangedType.Remove,
				data:mail
			})
			if(!!mail.isSaved){
				playerData.__savedMails.push({
					type:Consts.DataChangedType.Remove,
					data:mail
				})
			}
		}
		if(playerData.__savedMails.length == 0) delete playerData.__savedMails

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 阅读战报
 * @param playerId
 * @param reportIds
 * @param callback
 */
pro.readReports = function(playerId, reportIds, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isArray(reportIds) || reportIds.length == 0){
		callback(new Error("reportIds 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var playerData = {}
		playerData.__reports = []
		for(var i = 0; i < reportIds.length; i ++){
			var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
			if(!_.isObject(report)){
				return Promise.reject(new Error("战报不存在"))
			}
			report.isRead = true
			playerData.__reports.push({
				type:Consts.DataChangedType.Edit,
				data:report
			})
		}

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 收藏战报
 * @param playerId
 * @param reportId
 * @param callback
 */
pro.saveReport = function(playerId, reportId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(reportId)){
		callback(new Error("reportId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
		if(!_.isObject(report)){
			return Promise.reject(new Error("战报不存在"))
		}
		var playerData = {}
		report.isSaved = true
		playerData.__reports = [{
			type:Consts.DataChangedType.Edit,
			data:report
		}]
		playerData.__savedReports = [{
			type:Consts.DataChangedType.Add,
			data:report
		}]

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 取消收藏战报
 * @param playerId
 * @param reportId
 * @param callback
 */
pro.unSaveReport = function(playerId, reportId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(reportId)){
		callback(new Error("reportId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
		if(!_.isObject(report)){
			return Promise.reject(new Error("战报不存在"))
		}
		var playerData = {}
		report.isSaved = false
		playerData.__reports = [{
			type:Consts.DataChangedType.Edit,
			data:report
		}]
		playerData.__savedReports = [{
			type:Consts.DataChangedType.Remove,
			data:report
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取玩家战报
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getReports = function(playerId, fromIndex, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		return self.pushService.onGetReportsSuccessAsync(playerDoc, fromIndex)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取玩家已存战报
 * @param playerId
 * @param fromIndex
 * @param callback
 */
pro.getSavedReports = function(playerId, fromIndex, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(fromIndex) || fromIndex % 1 !== 0 || fromIndex < 0){
		callback(new Error("fromIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		return self.pushService.onGetSavedMailsSuccessAsync(playerDoc, fromIndex)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 删除战报
 * @param playerId
 * @param reportIds
 * @param callback
 */
pro.deleteReports = function(playerId, reportIds, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isArray(reportIds) || reportIds.length == 0){
		callback(new Error("reportIds 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		var playerData = {}
		playerData.__reports = []
		playerData.__savedReports = []
		for(var i = 0; i < reportIds.length; i ++){
			var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
			if(!_.isObject(report)){
				return Promise.reject(new Error("战报不存在"))
			}
			LogicUtils.removeItemInArray(playerDoc.reports, report)
			playerData.__reports.push({
				type:Consts.DataChangedType.Remove,
				data:report
			})
			if(!!report.isSaved){
				playerData.__savedReports.push({
					type:Consts.DataChangedType.Remove,
					data:report
				})
			}
		}
		if(playerData.__savedReports.length == 0) delete playerData.__savedReports

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 修改玩家名字
 * @param playerId
 * @param name
 * @param callback
 */
pro.editPlayerName = function(playerId, name, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(name) || _.isEmpty(name)){
		callback(new Error("name 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isEqual(playerDoc.basicInfo.name, name)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerId])
			return Promise.resolve()
		}else{
			return self.playerDao.findByIndexAsync("basicInfo.name", name).then(function(doc){
				if(_.isObject(doc)) return Promise.reject(new Error("名称已被其他玩家占用"))
				playerDoc.basicInfo.name = name
				var playerData = {}
				playerData.basicInfo = playerDoc.basicInfo
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
				return Promise.resolve()
			})
		}
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 修改玩家城市名字
 * @param playerId
 * @param cityName
 * @param callback
 */
pro.editPlayerCityName = function(playerId, cityName, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(cityName) || _.isEmpty(cityName)){
		callback(new Error("cityName 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		playerDoc.basicInfo.cityName = cityName
		var playerData = {}
		playerData.basicInfo = playerDoc.basicInfo
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取玩家可视化数据数据
 * @param playerId
 * @param targetPlayerId
 * @param callback
 */
pro.getPlayerViewData = function(playerId, targetPlayerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(targetPlayerId)){
		callback(new Error("targetPlayerId 不合法"))
		return
	}
	if(_.isEqual(playerId, targetPlayerId)){
		callback(new Error("不能查看自己的玩家数据"))
		return
	}

	var self = this
	var playerDoc = null
	var targetPlayerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		return self.playerDao.findByIdAsync(targetPlayerId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		targetPlayerDoc = doc
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, targetPlayerDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onGetPlayerViewDataSuccessAsync, playerDoc, targetPlayerDoc])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(targetPlayerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(targetPlayerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 设置驻防使用的龙
 * @param playerId
 * @param dragonType
 * @param callback
 */
pro.setDefenceDragon = function(playerId, dragonType, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(new Error("龙还未孵化"))
		if(!_.isEqual(Consts.DragonStatus.Free, dragon.status)) return Promise.reject(new Error("龙未处于空闲状态"))
		if(dragon.hp == 0) return Promise.reject(new Error("所选择的龙已经阵亡"))
		dragon.status = Consts.DragonStatus.Defence
		playerData.dragons = {}
		playerData.dragons[dragonType] = playerDoc.dragons[dragonType]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 取消驻防
 * @param playerId
 * @param callback
 */
pro.cancelDefenceDragon = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var dragon = LogicUtils.getPlayerDefenceDragon(playerDoc)
		if(!_.isObject(dragon)) return Promise.reject(new Error("没有龙驻防在城墙"))
		dragon.status = Consts.DragonStatus.Free
		playerData.dragons = {}
		playerData.dragons[dragon.type] = playerDoc.dragons[dragon.type]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}