"use strict"

/**
 * Created by modun on 15/3/6.
 */
var _ = require("underscore")
var Promise = require("bluebird")
var toobusy = require("toobusy-js")
var ShortId = require('shortid')
var sprintf = require("sprintf")

var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var DataUtils = require("../utils/dataUtils")
var Define = require("../consts/define")
var Consts = require("../consts/consts")

var DataService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.cacheServerId = app.get("cacheServerId")
	this.chatServerId = app.get("chatServerId")
	this.cacheService = app.get('cacheService')
	this.pushService = app.get('pushService')
	this.isCacheServer = _.isEqual(this.cacheServerId, app.getServerId())
	this.logicServers = _.filter(app.getServersFromConfig(), function(server){
		return _.isEqual(server.serverType, "logic") && _.isEqual(server.usedFor, app.get("cacheServerId"))
	})
	this.Player = app.get("Player")
	this.Alliance = app.get("Alliance")

	this.toobusyMaxLag = 140
	this.toobusyInterval = 100
	toobusy.maxLag(this.toobusyMaxLag)
	toobusy.interval(this.toobusyInterval)
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
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param keys
 * @param force
 * @param callback
 */
pro.directFindPlayer = function(id, keys, force, callback){
	if(this.isCacheServer){
		if(!force && toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.directFindPlayer", {id:id}))
			return
		}
		this.cacheService.directFindPlayer(id, keys, force, callback)
		return
	}

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
	if(this.isCacheServer){
		if(!force && toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.findPlayer", {id:id}))
			return
		}
		this.cacheService.findPlayer(id, keys, force, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.findPlayer.toServer(this.cacheServerId, id, keys, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象
 * @param id
 * @param data
 * @param callback
 */
pro.updatePlayer = function(id, data, callback){
	if(this.isCacheServer){
		this.cacheService.updatePlayer(id, data, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.updatePlayer.toServer(this.cacheServerId, id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param data
 * @param callback
 */
pro.flushPlayer = function(id, data, callback){
	if(this.isCacheServer){
		this.cacheService.flushPlayer(id, data, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.flushPlayer.toServer(this.cacheServerId, id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家并同步到Mongo最后将玩家从内存移除
 * @param id
 * @param data
 * @param callback
 */
pro.timeoutPlayer = function(id, data, callback){
	if(this.isCacheServer){
		this.cacheService.timeoutPlayer(id, data, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.timeoutPlayer.toServer(this.cacheServerId, id, data, function(e, resp){
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
	if(this.isCacheServer){
		if(toobusy()){
			var e = ErrorUtils.serverTooBusy("cache.dataService.createAlliance", {
				id:doc._id,
				name:doc.basicInfo.name,
				tag:doc.basicInfo.tag
			})
			callback(e)
			return
		}
		var self = this
		var allianceDoc = null
		this.cacheService.createAllianceAsync(alliance).then(function(doc){
			allianceDoc = _.omit(doc, ["joinRequestEvents", "shrineReports", "allianceFightReports", "itemLogs"])
			return self.cacheService.updateAllianceAsync(allianceDoc._id, null)
		}).then(function(){
			callback(null, allianceDoc)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(allianceDoc)){
				funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(!force && toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.directFindAlliance", {id:id}))
			return
		}
		this.cacheService.directFindAlliance(id, keys, force, callback)
		return
	}

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
	if(this.isCacheServer){
		if(!force && toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.directFindAlliance", {id:id}))
			return
		}
		this.cacheService.findAlliance(id, keys, force, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.findAlliance.toServer(this.cacheServerId, id, keys, force, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新联盟对象
 * @param id
 * @param data
 * @param callback
 */
pro.updateAlliance = function(id, data, callback){
	if(this.isCacheServer){
		this.cacheService.updateAlliance(id, data, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.updateAlliance.toServer(this.cacheServerId, id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param data
 * @param callback
 */
pro.flushAlliance = function(id, data, callback){
	if(this.isCacheServer){
		this.cacheService.flushAlliance(id, data, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.flushAlliance.toServer(this.cacheServerId, id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param id
 * @param data
 * @param callback
 */
pro.timeoutAlliance = function(id, data, callback){
	if(this.isCacheServer){
		this.cacheService.timeoutAlliance(id, data, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.timeoutAlliance.toServer(this.cacheServerId, id, data, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}

/**
 * 删除联盟
 * @param id
 * @param callback
 */
pro.deleteAlliance = function(id, callback){
	if(this.isCacheServer){
		this.cacheService.deleteAlliance(id, callback)
		return
	}

	this.app.rpc.cache.cacheRemote.deleteAlliance.toServer(this.cacheServerId, id, function(e, resp){
		if(_.isObject(e)) callback(e)
		else if(resp.code == 200) callback(null, resp.data)
		else callback(ErrorUtils.createError(resp.code, resp.data, false))
	})
}


/**
 * 获取玩家登陆时的数据
 * @param id
 * @param callback
 */
pro.loginPlayer = function(id, callback){
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.directFindPlayer", {id:id}))
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
			playerDoc = _.omit(doc, ["__v", "mails", "sendMails", "reports"])
			playerDoc.mailStatus = {
				unreadMails:unreadMails,
				unreadReports:unreadReports
			}
			playerDoc.serverLevel = self.app.getCurServer().level
			playerDoc.serverTime = Date.now()
			if(!_.isEmpty(playerDoc.allianceId)){
				return self.cacheService.findAllianceAsync(playerDoc.allianceId, [], false).then(function(doc){
					allianceDoc = _.omit(doc, ["joinRequestEvents", "shrineReports", "allianceFightReports", "itemLogs", 'villageCreateEvents'])
					if(_.isObject(allianceDoc.allianceFight)){
						var enemyAllianceId = LogicUtils.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
						return self.cacheService.directFindAllianceAsync(enemyAllianceId, Consts.AllianceViewDataKeys, false).then(function(doc){
							enemyAllianceDoc = doc
							return Promise.resolve()
						})
					}else return Promise.resolve()
				})
			}else return Promise.resolve()
		}).then(function(){
			callback(null, [playerDoc, allianceDoc, enemyAllianceDoc])
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
			}
			if(_.isObject(allianceDoc)){
				funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

	this.app.rpc.cache.cacheRemote.loginPlayer.toServer(this.cacheServerId, id, function(e, resp){
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
	if(this.isCacheServer){
		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], true).then(function(doc){
			playerDoc = doc
			var language = playerDoc.basicInfo.language
			var title = titleKey[language]
			var content = contentKey[language]
			if(!_.isString(title)){
				title = titleKey.en
			}
			if(!_.isString(content)){
				content = contentKey.en
			}
			if(titleArgs.length > 0){
				title = sprintf.vsprintf(title, titleArgs)
			}
			if(contentArgs.length > 0){
				content = sprintf.vsprintf(content, contentArgs)
			}

			var mail = {
				id:ShortId.generate(),
				title:title,
				fromId:"__system",
				fromName:"__system",
				fromIcon:0,
				fromAllianceTag:"",
				sendTime:Date.now(),
				content:content,
				isRead:false,
				isSaved:false
			}

			if(playerDoc.mails.length >= Define.PlayerMailsMaxSize){
				var willRemovedMail = this.getPlayerFirstUnSavedMail(playerDoc)
				playerData.push(["mails." + playerDoc.mails.indexOf(willRemovedMail), null])
				this.removeItemInArray(playerDoc.mails, willRemovedMail)
			}
			playerDoc.mails.push(mail)
			playerData.push(["mails." + playerDoc.mails.indexOf(mail), mail])
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
		}).then(function(){
			callback()
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], true).then(function(doc){
			playerDoc = doc
			if(playerDoc.reports.length >= Define.PlayerReportsMaxSize){
				var willRemovedReport = this.getPlayerFirstUnSavedReport(playerDoc)
				playerData.push(["reports." + playerDoc.reports.indexOf(willRemovedReport), null])
				this.removeItemInArray(playerDoc.reports, willRemovedReport)
			}
			playerDoc.reports.push(report)
			playerData.push(["reports." + playerDoc.reports.indexOf(report), report])
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
		}).then(function(){
			callback()
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.sendPlayerMail", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		var memberDoc = null
		var memberData = []
		var allianceDoc = null
		var updateFuncs = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			return self.cacheService.findPlayerAsync(memberId, [], false)
		}).then(function(doc){
			if(_.isEmpty(doc)) return Promise.reject(ErrorUtils.playerNotExist(id, memberId))
			memberDoc = doc
			if(!_.isEmpty(playerDoc.allianceId)){
				return self.cacheService.directFindAllianceAsync(playerDoc.allianceId, [], false).then(function(doc){
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
			return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
		}).then(function(){
			return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData)
		}).then(function(){
			callback()
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			if(_.isObject(memberDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(memberId, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.sendPlayerMail", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		var allianceDoc = null
		var memberDocs = []
		var memberDatas = []
		var updateFuncs = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			return self.cacheService.directFindAllianceAsync(allianceId, [], false)
		}).then(function(doc){
			allianceDoc = doc
			var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, id)
			if(!DataUtils.isAllianceOperationLegal(playerObject.title, "sendAllianceMail"))
				return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(id, allianceId, "sendAllianceMail"));

			var funcs = []
			_.each(allianceDoc.members, function(member){
				if(!_.isEqual(member.id, id))
					funcs.push(self.cacheService.findPlayerAsync(member.id, [], false))
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
			return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
		}).then(function(){
			_.each(memberDatas, function(memberData){
				self.pushService.onPlayerDataChangedAsync(memberData.doc, memberData.data)
			})
			callback()
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			_.each(memberDocs, function(memberDoc){
				funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
			})
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.readPlayerMails", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = 0; i < mailIds.length; i++){
				var mail = LogicUtils.getPlayerMailById(playerDoc, mailIds[i])
				if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailIds[i]))
				mail.isRead = true
				playerData.push(["mails." + playerDoc.mails.indexOf(mail) + ".isRead", true])
			}
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.savePlayerMail", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			var mail = LogicUtils.getPlayerMailById(playerDoc, mailId)
			if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailId))
			mail.isSaved = true
			playerData.push(["mails." + playerDoc.mails.indexOf(mail) + ".isSaved", true])
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.unSavePlayerMail", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			var mail = LogicUtils.getPlayerMailById(playerDoc, mailId)
			if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailId))
			mail.isSaved = false
			playerData.push(["mails." + playerDoc.mails.indexOf(mail) + ".isSaved", mail.isSaved])
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.getPlayerMails", {id:id}))
			return
		}

		var playerDoc = null
		var mails = []
		this.cacheService.directFindPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = playerDoc.mails.length - 1; i >= 0; i--){
				var mail = playerDoc.mails[i]
				mail.index = i
				mails.push(mail)
			}
			mails = mails.slice(fromIndex, fromIndex + Define.PlayerMaxReturnMailSize)
			return Promise.resolve()
		}).then(function(){
			callback(null, mails)
		}).catch(function(e){
			callback(e)
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.getPlayerSavedMails", {id:id}))
			return
		}

		var playerDoc = null
		var mails = []
		this.cacheService.directFindPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = playerDoc.mails.length - 1; i >= 0; i--){
				var mail = playerDoc.mails[i]
				mail.index = i
				if(!!mail.isSaved) mails.push(mail)
			}
			mails = mails.slice(fromIndex, fromIndex + Define.PlayerMaxReturnMailSize)
			return Promise.resolve()
		}).then(function(){
			callback(null, mails)
		}).catch(function(e){
			callback(e)
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.deletePlayerMails", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = 0; i < mailIds.length; i++){
				var mail = LogicUtils.getPlayerMailById(playerDoc, mailIds[i])
				if(!_.isObject(mail)) return Promise.reject(ErrorUtils.mailNotExist(id, mailIds[i]))
				playerData.push(["mails." + playerDoc.mails.indexOf(mail), null])
				LogicUtils.removeItemInArray(playerDoc.mails, mail)
			}
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.readPlayerReports", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = 0; i < reportIds.length; i++){
				var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
				if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportIds[i]))
				report.isRead = true
				playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isRead", true])
			}
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.savePlayerReport", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
			if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportId))
			report.isSaved = true
			playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isSaved", true])
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.unSavePlayerReport", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			var report = LogicUtils.getPlayerReportById(playerDoc, reportId)
			if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportId))
			report.isSaved = false
			playerData.push(["reports." + playerDoc.reports.indexOf(report) + ".isSaved", report.isSaved])
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.getPlayerReports", {id:id}))
			return
		}

		var playerDoc = null
		var reports = []
		this.cacheService.directFindPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = playerDoc.reports.length - 1; i >= 0; i--){
				var report = playerDoc.reports[i]
				report.index = i
				reports.push(report)
			}
			reports = reports.slice(fromIndex, fromIndex + Define.PlayerMaxReturnReportSize)
			return Promise.resolve()
		}).then(function(){
			callback(null, reports)
		}).catch(function(e){
			callback(e)
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.getPlayerSavedReports", {id:id}))
			return
		}

		var playerDoc = null
		var reports = []
		this.cacheService.directFindPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = playerDoc.reports.length - 1; i >= 0; i--){
				var report = playerDoc.reports[i]
				report.index = i
				if(!!report.isSaved) reports.push(report)
			}
			reports = reports.slice(fromIndex, fromIndex + Define.PlayerMaxReturnReportSize)
			return Promise.resolve()
		}).then(function(){
			callback(null, reports)
		}).catch(function(e){
			callback(e)
		})
		return
	}

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
	if(this.isCacheServer){
		if(toobusy()){
			callback(ErrorUtils.serverTooBusy("cache.dataService.deletePlayerReports", {id:id}))
			return
		}

		var self = this
		var playerDoc = null
		var playerData = []
		this.cacheService.findPlayerAsync(id, [], false).then(function(doc){
			playerDoc = doc
			for(var i = 0; i < reportIds.length; i++){
				var report = LogicUtils.getPlayerReportById(playerDoc, reportIds[i])
				if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(id, reportIds[i]))
				playerData.push(["reports." + playerDoc.reports.indexOf(report), null])
				LogicUtils.removeItemInArray(playerDoc.reports, report)
			}
			return self.cacheService.updatePlayerAsync(id, playerDoc)
		}).then(function(){
			callback(null, playerData)
		}).catch(function(e){
			var funcs = []
			if(_.isObject(playerDoc)){
				funcs.push(self.cacheService.updatePlayerAsync(id, null))
			}
			Promise.all(funcs).then(function(){
				callback(e)
			})
		})
		return
	}

	this.app.rpc.cache.cacheRemote.deletePlayerReports.toServer(this.cacheServerId, id, reportIds, function(e, resp){
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
	var addToCacheChannelAsync = Promise.promisify(this.app.rpc.cache.cacheRemote.addToAllianceChannel.toServer, this)
	var addToLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(addToCacheChannelAsync(this.cacheServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
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
	var removeFromCacheChannelAsync = Promise.promisify(this.app.rpc.cache.cacheRemote.removeFromAllianceChannel.toServer, this)
	var removeFromLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(removeFromCacheChannelAsync(this.cacheServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
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
	var addToCacheChannelAsync = Promise.promisify(this.app.rpc.cache.cacheRemote.addToAllianceChannel.toServer, this)
	var addToLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.addToAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(addToChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId))
	if(_.isString(playerDoc.allianceId)){
		funcs.push(addToChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(addToCacheChannelAsync(this.cacheServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
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
	var removeFromCacheChannelAsync = Promise.promisify(this.app.rpc.cache.cacheRemote.removeFromAllianceChannel.toServer, this)
	var removeFromLogicChannelAsync = Promise.promisify(this.app.rpc.logic.logicRemote.removeFromAllianceChannel.toServer, this)
	var funcs = []
	funcs.push(removeFromChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId))
	if(_.isString(playerDoc.allianceId)){
		funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(removeFromCacheChannelAsync(this.cacheServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
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
 * 创建联盟对战频道
 * @param attackAllianceId
 * @param defenceAllianceId
 * @param callback
 */
pro.createAllianceFightChannel = function(attackAllianceId, defenceAllianceId, callback){
	var self = this
	var createAllianceFightChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.createAllianceFightChannel.toServer, this)
	createAllianceFightChannelAsync(this.chatServerId, attackAllianceId, defenceAllianceId).catch(function(e){
		self.logService.onEventError("logic.dataService.createAllianceFightChannel", {attackAllianceId:attackAllianceId, defenceAllianceId:defenceAllianceId}, e.stack)
	})
	callback()
}

/**
 * 删除战频道移除
 * @param attackAllianceId
 * @param defenceAllianceId
 * @param callback
 */
pro.deleteAllianceFightChannel = function(attackAllianceId, defenceAllianceId, callback){
	var self = this
	var deleteAllianceFightChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.deleteAllianceFightChannel.toServer, this)
	deleteAllianceFightChannelAsync(this.chatServerId, attackAllianceId, defenceAllianceId).catch(function(e){
		self.logService.onEventError("logic.dataService.deleteAllianceFightChannel", {attackAllianceId:attackAllianceId, defenceAllianceId:defenceAllianceId}, e.stack)
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