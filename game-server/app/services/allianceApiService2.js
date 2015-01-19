"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")
var Localizations = require("../consts/localizations")


var AllianceApiService2 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.allianceTimeEventService = app.get("allianceTimeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
}
module.exports = AllianceApiService2
var pro = AllianceApiService2.prototype


/**
 * 退出联盟
 * @param playerId
 * @param callback
 */
pro.quitAlliance = function(playerId, callback){
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
	var allianceDoc = null
	var allianceData = {}
	var playerDocInAlliance = null
	var otherPlayerDocs = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(_.isEqual(playerDoc.alliance.title, Consts.AllianceTitle.Archon) && allianceDoc.members.length > 1){
			return Promise.reject(new Error("别逗了,仅当联盟成员为空时,盟主才能退出联盟"))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(new Error("联盟正在战争准备期或战争期,不能退出联盟"))

		LogicUtils.returnPlayerShrineTroops(playerDoc, playerData, allianceDoc, allianceData)
		LogicUtils.returnPlayerMarchTroops(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerMarchReturnTroops(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerVillageTroop(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, self.timeEventService)

		var funcs = []
		var returnHelpedByTroop = function(helpedByTroop){
			doc = _.find(otherPlayerDocs, function(doc){
				return _.isEqual(helpedByTroop.id, doc._id)
			})
			if(_.isObject(doc)){
				var data = {}
				LogicUtils.returnPlayerHelpedByTroop(playerDoc, playerData, helpedByTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return Promise.resolve()
			}else{
				return self.playerDao.findByIdAsync(helpedByTroop.id).then(function(doc){
					if(_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
					otherPlayerDocs.push(doc)
					var data = {}
					LogicUtils.returnPlayerHelpedByTroop(playerDoc, playerData, helpedByTroop, doc, data)
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
					return Promise.resolve()
				})
			}
		}
		var returnHelpToTroop = function(helpToTroop){
			doc = _.find(otherPlayerDocs, function(doc){
				return _.isEqual(helpToTroop.beHelpedPlayerData.id, doc._id)
			})
			if(_.isObject(doc)){
				var data = {}
				LogicUtils.returnPlayerHelpToTroop(playerDoc, playerData, helpToTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return Promise.resolve()
			}else{
				return self.playerDao.findByIdAsync(helpToTroop.beHelpedPlayerData.id).then(function(doc){
					if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
					otherPlayerDocs.push(doc)
					var data = {}
					LogicUtils.returnPlayerHelpToTroop(playerDoc, playerData, helpToTroop, doc, data)
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
					return Promise.resolve()
				})
			}
		}
		var returnHelpedByMarchTroop = function(marchEvent){
			doc = _.find(otherPlayerDocs, function(doc){
				return _.isEqual(marchEvent.attackPlayerData.id, doc._id)
			})
			if(_.isObject(doc)){
				var data = {}
				LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return Promise.resolve()
			}else{
				return self.playerDao.findByIdAsync(marchEvent.attackPlayerData.id).then(function(doc){
					if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
					otherPlayerDocs.push(doc)
					var data = {}
					LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
					return Promise.resolve()
				})
			}
		}
		_.each(playerDoc.helpedByTroops, function(helpedByTroop){
			funcs.push(returnHelpedByTroop(helpedByTroop))
		})
		_.each(playerDoc.helpToTroops, function(helpToTroop){
			funcs.push(returnHelpToTroop(helpToTroop))
		})
		_.each(allianceDoc.attackMarchEvents, function(marchEvent){
			if(_.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id)){
				funcs.push(returnHelpedByMarchTroop(marchEvent))
			}
		})

		return Promise.all(funcs)
	}).then(function(){
		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(playerId, event.id)
		})
		if(helpEvents.length > 0) allianceData.__helpEvents = []
		_.each(helpEvents, function(helpEvent){
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			allianceData.__helpEvents.push({
				type:Consts.DataChangedType.Remove,
				data:helpEvent
			})
		})
		playerDocInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		LogicUtils.removeItemInArray(allianceDoc.members, playerDocInAlliance)
		allianceData.__members = [{
			type:Consts.DataChangedType.Remove,
			data:playerDocInAlliance
		}]
		var playerObjectInMap = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, playerDocInAlliance.location)
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, playerObjectInMap)
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Remove,
			data:playerObjectInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Quit, playerDocInAlliance.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		playerDoc.alliance = null
		playerData.alliance = {}
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		if(allianceDoc.members.length <= 0){
			updateFuncs.push([self.allianceDao, self.allianceDao.deleteByIdAsync, allianceDoc._id])
			updateFuncs.push([self.globalChannelService, self.globalChannelService.destroyChannelAsync, Consts.AllianceChannelPrefix + allianceDoc._id])
			eventFuncs.push([self.timeEventService, self.timeEventService.clearAllianceTimeEventsAsync, allianceDoc])
		}else{
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			updateFuncs.push([self.globalChannelService, self.globalChannelService.leaveAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		}
		return Promise.resolve()
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(otherPlayerDocs, function(thePlayerDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(thePlayerDoc._id))
		})
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
 * 直接加入某联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.joinAllianceDirectly = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var inviterDocs = []
	var requestedAllianceDocs = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(!_.isEqual(doc.basicInfo.joinType, Consts.AllianceJoinType.All)){
			return Promise.reject(new Error("联盟不允许直接加入"))
		}

		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		var memberInAlliance = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberRect)
		var allianceData = {}
		allianceData.__members = [{
			type:Consts.DataChangedType.Add,
			data:memberInAlliance
		}]
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Add,
			data:memberObjInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		playerDoc.basicInfo.terrain = allianceDoc.basicInfo.terrain
		var playerData = {}
		playerData.alliance = playerDoc.alliance
		playerData.basicInfo = playerDoc.basicInfo
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, playerDoc, allianceDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)

		var funcs = []
		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.resolve()
				}
				requestedAllianceDocs.push(doc)
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, playerId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.resolve()
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, doc])
				var docData = {}
				docData.__joinRequestEvents = [{
					type:Consts.DataChangedType.Remove,
					data:joinRequestEvent
				}]
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, doc._id, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.requestToAllianceEvents = playerDoc.requestToAllianceEvents

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return self.playerDao.findByIdAsync(inviterId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				inviterDocs.push(doc)
				var docData = {}
				LogicUtils.sendSystemMail(doc, docData, titleKey, [], contentKey, [playerDoc.basicInfo.name])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.inviteToAllianceEvents = playerDoc.inviteToAllianceEvents

		return Promise.all(funcs)
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(requestedAllianceDocs, function(doc){
			funcs.push(self.allianceDao.removeLockByIdAsync(doc))
		})
		_.each(inviterDocs, function(doc){
			funcs.push(self.playerDao.removeLockByIdAsync(doc))
		})
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
 * 申请加入联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.requestToJoinAlliance = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		if(playerDoc.requestToAllianceEvents.length >= Define.RequestJoinAllianceMessageMaxSize){
			return Promise.reject(new Error("联盟申请已满,请撤消部分申请后再来申请"))
		}
		if(LogicUtils.hasPendingRequestEventToAlliance(playerDoc, allianceId)){
			return Promise.reject(new Error("对此联盟的申请已发出,请耐心等候审核"))
		}
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		if(doc.joinRequestEvents.length >= Define.AllianceRequestMessageMaxSize){
			return Promise.reject(new Error("此联盟的申请信息已满,请等候其处理后再进行申请"))
		}

		var allianceData = {}
		var playerData = {}
		var requestTime = Date.now()
		var joinRequestEvent = LogicUtils.addAllianceRequestEvent(allianceDoc, playerDoc, requestTime)
		allianceData.__joinRequestEvents = [{
			type:Consts.DataChangedType.Add,
			data:joinRequestEvent
		}]
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Request, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		var requestToAllianceEvent = LogicUtils.addPlayerJoinAllianceEvent(playerDoc, allianceDoc, requestTime)
		playerData.__requestToAllianceEvents = [{
			type:Consts.DataChangedType.Add,
			data:requestToAllianceEvent
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
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
 * 取消对某联盟的加入申请
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.cancelJoinAllianceRequest = function(playerId, allianceId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		var eventInPlayer = LogicUtils.getRequestToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(eventInPlayer)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		LogicUtils.removeItemInArray(playerDoc.requestToAllianceEvents, eventInPlayer)
		var playerData = {}
		playerData.__requestToAllianceEvents = [{
			type:Consts.DataChangedType.Remove,
			data:eventInPlayer
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		return self.allianceDao.findByIdAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.resolve()
		}
		allianceDoc = doc
		var eventInAlliance = LogicUtils.getPlayerRequestEventAtAlliance(allianceDoc, playerId)
		if(!_.isObject(eventInAlliance)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, eventInAlliance)
		var allianceData = {}
		allianceData.__joinRequestEvents = [{
			type:Consts.DataChangedType.Remove,
			data:eventInAlliance
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
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
 * 处理加入联盟申请
 * @param playerId
 * @param memberId
 * @param agree
 * @param callback
 */
pro.handleJoinAllianceRequest = function(playerId, memberId, agree, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(!_.isBoolean(agree)){
		callback(new Error("agree 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能处理自己加入联盟的申请"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var memberDoc = null
	var requestedAllianceDocs = []
	var inviterDocs = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "handleJoinAllianceRequest")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		return self.playerDao.findByIdAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		var eventInMember = LogicUtils.getRequestToAllianceEvent(memberDoc, allianceDoc._id)
		if(!_.isObject(eventInMember)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		var eventInAlliance = LogicUtils.getPlayerRequestEventAtAlliance(allianceDoc, memberId)
		if(!_.isObject(eventInAlliance)){
			return Promise.reject(new Error("申请事件不存在"))
		}
		var memberData = {}
		var allianceData = {}
		LogicUtils.removeItemInArray(memberDoc.requestToAllianceEvents, eventInMember)
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, eventInAlliance)

		var titleKeyApproved = Localizations.Alliance.RequestApprovedTitle
		var titleKeyRejected = Localizations.Alliance.RequestRejectedTitle
		var contentKeyApproved = Localizations.Alliance.RequestApprovedContent
		var contentKeyRejected = Localizations.Alliance.RequestRejectedContent
		var titleKey = agree ? titleKeyApproved : titleKeyRejected
		var contentKey = agree ? contentKeyApproved : contentKeyRejected
		LogicUtils.sendSystemMail(memberDoc, memberData, titleKey, [], contentKey, [allianceDoc.basicInfo.name])

		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])

		allianceData.__joinRequestEvents = [{
			type:Consts.DataChangedType.Remove,
			data:eventInAlliance
		}]
		if(!agree){
			memberData.__requestToAllianceEvents = [{
				type:Consts.DataChangedType.Remove,
				data:eventInMember
			}]
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			return Promise.resolve()
		}

		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		var memberInAlliance = LogicUtils.addAllianceMember(allianceDoc, memberDoc, Consts.AllianceTitle.Member, memberRect)
		allianceData.__members = [{
			type:Consts.DataChangedType.Add,
			data:memberInAlliance
		}]
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Add,
			data:memberObjInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, memberDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		if(!_.isEmpty(memberDoc.logicServerId)){
			updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, memberDoc._id, memberDoc.logicServerId])
		}

		memberDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		memberDoc.basicInfo.terrain = allianceDoc.basicInfo.terrain
		memberData.alliance = memberDoc.alliance
		memberData.basicInfo = memberDoc.basicInfo
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, memberDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, memberDoc._id])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		var funcs = []
		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.resolve()
				}
				requestedAllianceDocs.push(doc)
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, memberId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.reject(new Error("玩家请求事件不存在"))
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				var docData = {}
				docData.__joinRequestEvents = [{
					type:Consts.DataChangedType.Remove,
					data:joinRequestEvent
				}]
				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, doc._id, docData])
				return Promise.resolve()
			})
		}
		_.each(memberDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(memberDoc.requestToAllianceEvents)
		memberData.requestToAllianceEvents = memberDoc.requestToAllianceEvents

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return self.playerDao.findByIdAsync(inviterId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				inviterDocs.push(doc)
				var docData = {}
				LogicUtils.sendSystemMail(doc, docData, titleKey, [], contentKey, [memberDoc.basicInfo.name])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(memberDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(memberDoc.inviteToAllianceEvents)
		memberData.inviteToAllianceEvents = memberDoc.inviteToAllianceEvents

		return Promise.all(funcs)
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		_.each(requestedAllianceDocs, function(doc){
			funcs.push(self.allianceDao.removeLockByIdAsync(doc))
		})
		_.each(inviterDocs, function(doc){
			funcs.push(self.playerDao.removeLockByIdAsync(doc))
		})

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
 * 邀请玩家加入联盟
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.inviteToJoinAlliance = function(playerId, memberId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能邀请自己加入联盟"))
		return
	}

	var self = this
	var playerDoc = null
	var memberDoc = null
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "inviteToJoinAlliance")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(playerDoc.alliance.id))
		funcs.push(self.playerDao.findByIdAsync(memberId))
		return Promise.all(funcs)
	}).spread(function(theAllianceDoc, theMemberDoc){
		if(!_.isObject(theAllianceDoc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = theAllianceDoc
		if(!_.isObject(theMemberDoc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = theMemberDoc
		if(_.isObject(theMemberDoc.alliance) && !_.isEmpty(theMemberDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		if(LogicUtils.hasInviteEventToAlliance(memberDoc, allianceDoc)){
			return Promise.reject(new Error("此玩家已被邀请加入我方联盟,请等候其处理"))
		}
		if(theMemberDoc.inviteToAllianceEvents.length >= Define.InviteJoinAllianceMessageMaxSize){
			return Promise.reject(new Error("此玩家的邀请信息已满,请等候其处理后再进行邀请"))
		}
		var inviteTime = Date.now()
		var memberData = {}
		var inviteToAllianceEvent = LogicUtils.addPlayerInviteAllianceEvent(playerDoc._id, memberDoc, allianceDoc, inviteTime)
		memberData.__inviteToAllianceEvents = [{
			type:Consts.DataChangedType.Add,
			data:inviteToAllianceEvent
		}]
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
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
 * 处理加入联盟邀请
 * @param playerId
 * @param allianceId
 * @param agree
 * @param callback
 */
pro.handleJoinAllianceInvite = function(playerId, allianceId, agree, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}
	if(!_.isBoolean(agree)){
		callback(new Error("agree 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var inviterDoc = null
	var inviteEvent = null
	var requestedAllianceDocs = []
	var inviterDocs = []
	var pushFuncs = []
	var updateFuncs = []
	var playerData = {}
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isObject(playerDoc.alliance) && !_.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家已加入联盟"))
		}
		var event = LogicUtils.getInviteToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(event)){
			return Promise.reject(new Error("邀请事件不存在"))
		}
		inviteEvent = event
		LogicUtils.removeItemInArray(playerDoc.inviteToAllianceEvents, inviteEvent)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		if(!agree){
			playerData.__inviteToAllianceEvents = [{
				type:Consts.DataChangedType.Remove,
				data:inviteEvent
			}]
		}

		var funcs = []
		funcs.push(self.allianceDao.findByIdAsync(allianceId))
		funcs.push(self.playerDao.findByIdAsync(inviteEvent.inviterId))
		return Promise.all(funcs)
	}).spread(function(theAllianceDoc, theInviterDoc){
		if(!_.isObject(theAllianceDoc)){
			if(!!agree) return Promise.reject(new Error("联盟不存在"))
			else return Promise.resolve()
		}
		allianceDoc = theAllianceDoc
		if(!_.isObject(theInviterDoc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		inviterDoc = theInviterDoc

		var titleKeyApproved = Localizations.Alliance.InviteApprovedTitle
		var titleKeyRejected = Localizations.Alliance.InviteRejectedTitle
		var contentKeyApproved = Localizations.Alliance.InviteApprovedContent
		var contentKeyRejected = Localizations.Alliance.InviteRejectedContent
		var titleKey = agree ? titleKeyApproved : titleKeyRejected
		var contentKey = agree ? contentKeyApproved : contentKeyRejected
		var inviterData = {}
		LogicUtils.sendSystemMail(inviterDoc, inviterData, titleKey, [], contentKey, [playerDoc.basicInfo.name])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, inviterDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, inviterDoc, inviterData])

		if(!agree){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, allianceDoc._id])
			return Promise.resolve()
		}

		var allianceData = {}
		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberObjInMap = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberObjInMap)
		var memberInAlliance = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberRect)
		allianceData.__members = [{
			type:Consts.DataChangedType.Add,
			data:memberInAlliance
		}]
		allianceData.__mapObjects = [{
			type:Consts.DataChangedType.Add,
			data:memberObjInMap
		}]
		LogicUtils.refreshAllianceBasicInfo(allianceDoc)
		allianceData.basicInfo = allianceDoc.basicInfo
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, playerDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		playerDoc.basicInfo.terrain = allianceDoc.basicInfo.terrain
		playerData.alliance = playerDoc.alliance
		playerData.basicInfo = playerDoc.basicInfo

		var funcs = []
		var removeRequestEvent = function(event){
			return self.allianceDao.findByIdAsync(event.id).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.resolve()
				}
				requestedAllianceDocs.push(doc)
				var joinRequestEvent = LogicUtils.getPlayerRequestEventAtAlliance(doc, playerId)
				if(!_.isObject(joinRequestEvent)){
					return Promise.reject(new Error("玩家请求事件不存在"))
				}
				LogicUtils.removeItemInArray(doc.joinRequestEvents, joinRequestEvent)
				var docData = {}
				docData.__joinRequestEvents = [{
					type:Consts.DataChangedType.Remove,
					data:joinRequestEvent
				}]
				updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, doc._id, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.requestToAllianceEvents, function(event){
			funcs.push(removeRequestEvent(event))
		})
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.requestToAllianceEvents = playerDoc.requestToAllianceEvents

		var sendMailToInviter = function(inviterId){
			var titleKey = Localizations.Alliance.InviteRejectedTitle
			var contentKey = Localizations.Alliance.InviteRejectedContent
			return self.playerDao.findByIdAsync(inviterId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				inviterDocs.push(doc)
				var docData = {}
				LogicUtils.sendSystemMail(doc, docData, titleKey, [], contentKey, [playerDoc.basicInfo.name])
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, doc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, docData])
				return Promise.resolve()
			})
		}
		_.each(playerDoc.inviteToAllianceEvents, function(event){
			funcs.push(sendMailToInviter(event.inviterId))
		})
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.inviteToAllianceEvents = playerDoc.inviteToAllianceEvents

		return Promise.all(funcs)
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(requestedAllianceDocs, function(doc){
			funcs.push(self.allianceDao.removeLockByIdAsync(doc._id))
		})
		_.each(inviterDocs, function(doc){
			funcs.push(self.playerDao.removeLockByIdAsync(doc._id))
		})
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
 * 盟主长时间不登录时,玩家可宝石购买盟主职位
 * @param playerId
 * @param callback
 */
pro.buyAllianceArchon = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var archonDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(_.isEqual(doc.alliance.title, Consts.AllianceTitle.Archon)){
			return Promise.reject(new Error("玩家已经是盟主了"))
		}
		var gemUsed = DataUtils.getGemByBuyAllianceArchon()
		if(playerDoc.resources.gem < gemUsed){
			return Promise.reject(new Error("宝石不足"))
		}
		playerDoc.resources.gem -= gemUsed
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var archonDocInAlliance = LogicUtils.getAllianceArchon(allianceDoc)
		var canBuyInterval = 0//1000 * 60 * 60 * 24 * 7 //7天
		if(archonDocInAlliance.lastLoginTime + canBuyInterval > Date.now()){
			return Promise.reject(new Error("盟主连续7天不登陆时才能购买盟主职位"))
		}
		return self.playerDao.findByIdAsync(archonDocInAlliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		archonDoc = doc

		var allianceData = {}
		allianceData.__members = []
		var archonDocInAlliance = LogicUtils.getAllianceArchon(allianceDoc)
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		playerInAllianceDoc.title = Consts.AllianceTitle.Archon
		allianceData.__members.push({
			type:Consts.DataChangedType.Edit,
			data:playerInAllianceDoc
		})
		playerDoc.alliance.title = Consts.AllianceTitle.Archon
		playerDoc.alliance.titleName = allianceDoc.titles.archon
		var playerData = {}
		playerData.alliance = playerDoc.alliance
		playerData.resources = playerDoc.resources
		archonDocInAlliance.title = Consts.AllianceTitle.Member
		allianceData.__members.push({
			type:Consts.DataChangedType.Edit,
			data:archonDocInAlliance
		})
		archonDoc.alliance.title = Consts.AllianceTitle.Member
		archonDoc.alliance.titleName = allianceDoc.titles.member
		var archonData = {}
		archonData.alliance = archonDoc.alliance
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, playerDoc.basicInfo.name, [])
		allianceData.__events = [{
			type:Consts.DataChangedType.Add,
			data:event
		}]
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, archonDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, archonDoc, archonData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
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
 * 请求联盟成员协助加速
 * @param playerId
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.requestAllianceToSpeedUp = function(playerId, eventType, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.AllianceHelpEventType, eventType)){
		callback(new Error("eventType 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		var playerEvent = LogicUtils.getPlayerEventByTypeAndId(playerDoc, eventType, eventId)
		if(!_.isObject(playerEvent)){
			return Promise.reject(new Error("玩家事件不存在"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(_.isObject(helpEvent)){
			return Promise.reject("此建筑已经发送了加速请求")
		}

		var object = LogicUtils.getPlayerObjectByEvent(playerDoc, eventType, eventId)
		helpEvent = LogicUtils.addAllianceHelpEvent(allianceDoc, playerDoc, eventType, eventId, object.name, object.level + 1)
		var allianceData = {}
		allianceData.__helpEvents = [{
			type:Consts.DataChangedType.Add,
			data:helpEvent
		}]
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
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
 * 协助联盟玩家加速
 * @param playerId
 * @param eventId
 * @param callback
 */
pro.helpAllianceMemberSpeedUp = function(playerId, eventId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = {}
	var memberDoc = null
	var memberData = {}
	var helpEvent = null
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(!_.isObject(helpEvent)){
			return Promise.reject("帮助事件不存在")
		}
		if(_.isEqual(playerDoc._id, helpEvent.playerData.id)){
			return Promise.reject(new Error("不能帮助自己加速建造"))
		}
		if(_.contains(helpEvent.eventData.helpedMembers, playerId)){
			return Promise.reject("您已经帮助过此事件了")
		}
		return self.playerDao.findByIdAsync(helpEvent.playerData.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		memberDoc = doc
		var playerEvent = LogicUtils.getPlayerEventByTypeAndId(memberDoc, helpEvent.eventData.type, helpEvent.eventData.id)
		if(!_.isObject(playerEvent)){
			return Promise.reject(new Error("玩家事件不存在"))
		}
		helpEvent.eventData.helpedMembers.push(playerDoc._id)
		var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc)
		var newFinishTime = playerEvent.finishTime - effect
		if(helpEvent.eventData.helpedMembers.length >= helpEvent.eventData.maxHelpCount || newFinishTime <= Date.now()){
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			allianceData.__helpEvents = [{
				type:Consts.DataChangedType.Remove,
				data:helpEvent
			}]
		}else{
			allianceData.__helpEvents = [{
				type:Consts.DataChangedType.Edit,
				data:helpEvent
			}]
		}

		eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, memberDoc, playerEvent.id, newFinishTime])
		playerEvent.finishTime = newFinishTime
		memberData["__" + helpEvent.eventData.type] = [{
			type:Consts.DataChangedType.Edit,
			data:playerEvent
		}]

		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])

		return Promise.resolve()
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
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
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
 * 协助联盟所有玩家加速
 * @param playerId
 * @param callback
 */
pro.helpAllAllianceMemberSpeedUp = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = {}
	var memberDocs = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return self.allianceDao.findByIdAsync(doc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc

		allianceData.__helpEvents = []
		var speedUp = function(memberId, helpEvents){
			var needHelpedEvents = _.filter(helpEvents, function(helpEvent){
				return !_.contains(helpEvent.eventData.helpedMembers, playerId)
			})
			if(needHelpedEvents.length <= 0) return Promise.resolve()
			return self.playerDao.findByIdAsync(memberId).then(function(doc){
				if(!_.isObject(doc)){
					return Promise.reject(new Error("玩家不存在"))
				}
				var memberDoc = doc
				var memberData = {}
				memberDocs.push(memberDoc)
				for(var i = 0; i < needHelpedEvents.length; i++){
					var helpEvent = needHelpedEvents[i]
					var memberEvent = LogicUtils.getPlayerEventByTypeAndId(memberDoc, helpEvent.helpEventType, helpEvent.eventId)
					if(!_.isObject(memberEvent)){
						return Promise.reject(new Error("玩家建造事件不存在"))
					}
					helpEvent.helpedMembers.push(playerDoc._id)
					var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc)
					var newFinishTime = memberEvent.finishTime - effect
					if(helpEvent.eventData.helpedMembers.length >= helpEvent.eventData.maxHelpCount || newFinishTime <= Date.now()){
						LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
						allianceData.__helpEvents = [{
							type:Consts.DataChangedType.Remove,
							data:helpEvent
						}]
					}else{
						allianceData.__helpEvents = [{
							type:Consts.DataChangedType.Edit,
							data:helpEvent
						}]
					}

					eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, memberDoc, memberEvent.id, newFinishTime])
					memberEvent.finishTime = newFinishTime
					memberData["__" + helpEvent.eventData.type] = [{
						type:Consts.DataChangedType.Edit,
						data:memberEvent
					}]
				}
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
				return Promise.resolve()
			})
		}
		var funcs = []
		var memberEvents = []
		_.each(allianceDoc.helpEvents, function(event){
			var memberId = event.playerData.id
			if(!_.isEqual(memberId, playerId)){
				if(!_.isObject(memberEvents[memberId])) memberEvents[memberId] = []
				memberEvents[memberId].push(event)
			}
		})
		_.each(memberEvents, function(memberEvents, memberId){
			funcs.push(speedUp(memberId, memberEvents))
		})

		return Promise.all(funcs)
	}).then(function(){
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(allianceDoc._id))
		}
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockByIdAsync(memberDoc._id))
		})
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}