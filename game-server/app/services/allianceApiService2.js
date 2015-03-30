"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var ErrorUtils = require("../utils/errorUtils")
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
	this.GemUse = app.get("GemUse")
}
module.exports = AllianceApiService2
var pro = AllianceApiService2.prototype


/**
 * 退出联盟
 * @param playerId
 * @param callback
 */
pro.quitAlliance = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var playerObject = null
	var otherPlayerDocs = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		if(_.isEqual(playerDoc.alliance.title, Consts.AllianceTitle.Archon) && allianceDoc.members.length > 1){
			return Promise.reject(ErrorUtils.allianceArchonCanNotQuitAlliance(playerId, allianceDoc._id))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatusCanNotQuitAlliance(playerId, allianceDoc._id))

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
				var data = []
				LogicUtils.returnPlayerHelpedByTroop(playerDoc, playerData, helpedByTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return Promise.resolve()
			}else{
				return self.playerDao.findAsync(helpedByTroop.id).then(function(doc){
					otherPlayerDocs.push(doc)
					var data = []
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
				var data = []
				LogicUtils.returnPlayerHelpToTroop(playerDoc, playerData, helpToTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return Promise.resolve()
			}else{
				return self.playerDao.findAsync(helpToTroop.beHelpedPlayerData.id).then(function(doc){
					otherPlayerDocs.push(doc)
					var data = []
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
				var data = []
				LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return Promise.resolve()
			}else{
				return self.playerDao.findAsync(marchEvent.attackPlayerData.id).then(function(doc){
					otherPlayerDocs.push(doc)
					var data = []
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
		_.each(helpEvents, function(helpEvent){
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
		})
		playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject), null])
		LogicUtils.removeItemInArray(allianceDoc.members, playerObject)
		var playerMapObject = LogicUtils.getAllianceMapObjectById(allianceDoc, playerObject.mapId)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(playerMapObject), null])
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, playerMapObject)

		LogicUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Quit, playerObject.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		playerDoc.alliance = null
		playerData.push(["alliance", null])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		if(allianceDoc.members.length <= 0){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeAsync, allianceDoc._id])
			updateFuncs.push([self.allianceDao.getModel(), self.allianceDao.getModel().findByIdAndRemoveAsync, allianceDoc._id])
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
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		_.each(otherPlayerDocs, function(thePlayerDoc){
			funcs.push(self.playerDao.removeLockAsync(thePlayerDoc._id))
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
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		return self.allianceDao.findAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
		allianceDoc = doc
		if(!_.isEqual(doc.basicInfo.joinType, Consts.AllianceJoinType.All)) return Promise.reject(ErrorUtils.allianceDoNotAllowJoinDirectly(playerId, allianceDoc._id))

		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberMapObject)
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberMapObject.id)
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])

		LogicUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		playerData.push(["alliance", playerDoc.alliance])
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.push(["requestToAllianceEvents", playerDoc.requestToAllianceEvents])
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.push(["inviteToAllianceEvents", playerDoc.inviteToAllianceEvents])

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, [playerData, allianceDoc])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
 * 申请加入联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.requestToJoinAlliance = function(playerId, allianceId, callback){
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		if(playerDoc.requestToAllianceEvents.length >= Define.RequestJoinAllianceMessageMaxSize){
			return Promise.reject(ErrorUtils.joinAllianceRequestIsFull(playerId))
		}
		if(LogicUtils.hasPendingRequestEventToAlliance(playerDoc, allianceId)){
			return Promise.reject(ErrorUtils.joinTheAllianceRequestAlreadySend(playerId, allianceId))
		}
		return self.allianceDao.findAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		if(doc.joinRequestEvents.length >= Define.AllianceRequestMessageMaxSize){
			return Promise.reject(ErrorUtils.allianceJoinRequestMessagesIsFull(playerId, allianceId))
		}

		var requestTime = Date.now()
		var requestToAllianceEvent = LogicUtils.addPlayerJoinAllianceEvent(playerDoc, allianceDoc, requestTime)
		playerData.push(["requestToAllianceEvents." + playerDoc.requestToAllianceEvents.indexOf(requestToAllianceEvent), requestToAllianceEvent])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

		var joinRequestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
			return _.isEqual(event.id, playerId)
		})
		if(_.isObject(joinRequestEvent)){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])
		}else{
			joinRequestEvent = LogicUtils.addAllianceRequestEvent(allianceDoc, playerDoc, requestTime)
			allianceData.push(["joinRequestEvents." + allianceDoc.joinRequestEvents.indexOf(joinRequestEvent), joinRequestEvent])
			var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Request, playerDoc.basicInfo.name, [])
			allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		}

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	if(!_.isString(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		var eventInPlayer = LogicUtils.getRequestToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(eventInPlayer)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(playerId, allianceId))
		playerData.push(["requestToAllianceEvents." + playerDoc.requestToAllianceEvents.indexOf(eventInPlayer), null])
		LogicUtils.removeItemInArray(playerDoc.requestToAllianceEvents, eventInPlayer)

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
 * 删除加入联盟申请事件
 * @param playerId
 * @param requestEventIds
 * @param callback
 */
pro.removeJoinAllianceReqeusts = function(playerId, requestEventIds, callback){
	if(!_.isArray(requestEventIds)){
		callback(new Error("requestEventIds 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "removeJoinAllianceReqeusts")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "removeJoinAllianceReqeusts"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		_.each(requestEventIds, function(requestEventId){
			var requestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
				return _.isEqual(event.id, requestEventId)
			})
			if(!_.isObject(requestEvent)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(requestEventId, allianceDoc._id))
			allianceData.push(["joinRequestEvents." + allianceDoc.joinRequestEvents.indexOf(requestEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, requestEvent)
		})

		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
 * 同意加入联盟申请
 * @param playerId
 * @param requestEventId
 * @param callback
 */
pro.approveJoinAllianceRequest = function(playerId, requestEventId, callback){
	if(!_.isString(requestEventId)){
		callback(new Error("requestEventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var requestEvent = null
	var memberDoc = null
	var memberData = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "approveJoinAllianceRequest")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "approveJoinAllianceRequest"))
		}
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		requestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
			return _.isEqual(event.id, requestEventId)
		})
		if(!_.isObject(requestEvent)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(requestEventId, allianceDoc._id))

		return self.playerDao.findAsync(requestEventId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, requestEventId))
		memberDoc = doc
		if(_.isObject(memberDoc.alliance)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, memberDoc._id))
		var hasPendingRequest = _.some(memberDoc.requestToAllianceEvents, function(event){
			return _.isEqual(event.id, allianceDoc._id)
		})
		if(!hasPendingRequest) return Promise.reject(ErrorUtils.playerCancelTheJoinRequestToTheAlliance(memberDoc._id, allianceDoc._id))

		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(allianceDoc.mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		allianceDoc.mapObjects.push(memberMapObject)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, memberDoc, Consts.AllianceTitle.Member, memberMapObject.id)
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		LogicUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, memberDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
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
		memberData.push(["alliance", memberDoc.alliance])
		LogicUtils.clearArray(memberDoc.requestToAllianceEvents)
		memberData.push(["requestToAllianceEvents", memberDoc.requestToAllianceEvents])
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		memberData.push(["inviteToAllianceEvents", memberDoc.inviteToAllianceEvents])

		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
		pushFuncs.push([self.pushService, self.pushService.onGetAllianceDataSuccessAsync, memberDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, memberDoc._id])
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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
 * 邀请玩家加入联盟
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.inviteToJoinAlliance = function(playerId, memberId, callback){
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
	var memberData = []
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "inviteToJoinAlliance")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.alliance.id, "inviteToJoinAlliance"))
		}
		var funcs = []
		funcs.push(self.allianceDao.findAsync(playerDoc.alliance.id))
		funcs.push(self.playerDao.findAsync(memberId))
		return Promise.all(funcs)
	}).spread(function(theAllianceDoc, theMemberDoc){
		allianceDoc = theAllianceDoc
		if(!_.isObject(theMemberDoc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
		memberDoc = theMemberDoc
		if(_.isObject(theMemberDoc.alliance)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, memberId))
		if(LogicUtils.hasInviteEventToAlliance(memberDoc, allianceDoc)) return Promise.reject(ErrorUtils.inviteRequestAlreadySend(playerId, allianceDoc._id, memberId))
		if(theMemberDoc.inviteToAllianceEvents.length >= Define.InviteJoinAllianceMessageMaxSize) return Promise.reject(ErrorUtils.inviteRequestMessageIsFullForThisPlayer(playerId, allianceDoc._id, memberId))

		var inviteTime = Date.now()
		var inviteToAllianceEvent = LogicUtils.addPlayerInviteAllianceEvent(playerDoc._id, memberDoc, allianceDoc, inviteTime)
		memberData.push(["inviteToAllianceEvents." + memberDoc.inviteToAllianceEvents.indexOf(inviteToAllianceEvent), inviteToAllianceEvent])

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var inviterDoc = null
	var inviterData = []
	var inviteEvent = null
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		inviteEvent = LogicUtils.getInviteToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(inviteEvent)) return Promise.reject(ErrorUtils.allianceInviteEventNotExist(playerId, allianceId))

		playerData.push(["inviteToAllianceEvents." + playerDoc.inviteToAllianceEvents.indexOf(inviteEvent), null])
		LogicUtils.removeItemInArray(playerDoc.inviteToAllianceEvents, inviteEvent)
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])

		if(agree){
			var funcs = []
			funcs.push(self.allianceDao.findAsync(allianceId))
			funcs.push(self.playerDao.findAsync(inviteEvent.inviterId))
			return Promise.all(funcs)
		}
		return Promise.resolve()
	}).spread(function(theAllianceDoc, theInviterDoc){
		if(!agree){
			return Promise.resolve()
		}

		allianceDoc = theAllianceDoc
		inviterDoc = theInviterDoc
		var titleKey = Localizations.Alliance.InviteApprovedTitle
		var contentKey = Localizations.Alliance.InviteApprovedContent
		LogicUtils.sendSystemMail(inviterDoc, inviterData, titleKey, [], contentKey, [playerDoc.basicInfo.name])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, inviterDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, inviterDoc, inviterData])

		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(allianceDoc.mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		allianceDoc.mapObjects.push(memberMapObject)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberMapObject.id)
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		LogicUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])

		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.globalChannelService, self.globalChannelService.addAsync, Consts.AllianceChannelPrefix + allianceDoc._id, playerDoc._id, playerDoc.logicServerId])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)

		playerDoc.alliance = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			title:Consts.AllianceTitle.Member,
			titleName:allianceDoc.titles.member
		}
		playerData.push(["alliance", playerDoc.alliance])
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.push(["requestToAllianceEvents", playerDoc.requestToAllianceEvents])
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.push(["inviteToAllianceEvents", playerDoc.inviteToAllianceEvents])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, [playerData, agree ? allianceDoc : null])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(inviterDoc)){
			funcs.push(self.playerDao.removeLockAsync(inviterDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
 * 盟主长时间不登录时,玩家可宝石购买盟主职位
 * @param playerId
 * @param callback
 */
pro.buyAllianceArchon = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var archonDoc = null
	var archonData = []
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		if(_.isEqual(playerDoc.alliance.title, Consts.AllianceTitle.Archon)) return Promise.reject(ErrorUtils.playerAlreadyTheAllianceArchon(playerId, playerDoc.alliance.id))
		var gemUsed = DataUtils.getAllianceIntInit("buyArchonGem")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"buyAllianceArchon"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		playerData.push(["resources.gem", playerDoc.resources.gem])
		return self.allianceDao.findAsync(doc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		var archonDocInAlliance = LogicUtils.getAllianceArchon(allianceDoc)
		var canBuyInterval = 0//1000 * 60 * 60 * 24 * 7 //7天
		if(archonDocInAlliance.lastLoginTime + canBuyInterval > Date.now()){
			return Promise.reject(ErrorUtils.onlyAllianceArchonMoreThanSevenDaysNotOnLinePlayerCanBuyArchonTitle(playerId, allianceDoc._id))
		}
		return self.playerDao.findAsync(archonDocInAlliance.id)
	}).then(function(doc){
		archonDoc = doc
		var archonDocInAlliance = LogicUtils.getAllianceArchon(allianceDoc)
		var playerInAllianceDoc = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		playerInAllianceDoc.title = Consts.AllianceTitle.Archon
		allianceData.push(["members." + allianceDoc.members.indexOf(playerInAllianceDoc) + ".title", playerInAllianceDoc.title])
		playerDoc.alliance.title = Consts.AllianceTitle.Archon
		playerData.push(["alliance.title", playerDoc.alliance.title])
		playerDoc.alliance.titleName = allianceDoc.titles.archon
		playerData.push(["alliance.titleName", playerDoc.alliance.titleName])
		archonDocInAlliance.title = Consts.AllianceTitle.Member
		allianceData.push(["members." + allianceDoc.members.indexOf(archonDocInAlliance) + ".title", archonDocInAlliance.title])
		archonDoc.alliance.title = Consts.AllianceTitle.Member
		archonData.push(["alliance.title", archonDoc.alliance.title])
		archonDoc.alliance.titleName = allianceDoc.titles.member
		archonData.push(["alliance.titleName", archonDoc.alliance.titleName])
		var event = LogicUtils.AddAllianceEvent(allianceDoc, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, playerDoc.basicInfo.name, [])
		allianceData.push(["events." + allianceDoc.events.indexOf(event), event])

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, archonDoc])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, archonDoc, archonData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		LogicUtils.pushAllianceDataToEnemyAllianceIfNeeded(allianceDoc, allianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		var playerEvent = LogicUtils.getPlayerEventByTypeAndId(playerDoc, eventType, eventId)
		if(!_.isObject(playerEvent)) return Promise.reject(ErrorUtils.playerEventNotExist(playerId, eventType, eventId))
		return self.allianceDao.findAsync(doc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		var helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(_.isObject(helpEvent)) return Promise.reject(ErrorUtils.speedupRequestAlreadySendForThisEvent(playerId, allianceDoc._id, eventType, eventId))

		var object = LogicUtils.getPlayerObjectByEvent(playerDoc, eventType, eventId)
		helpEvent = DataUtils.addAllianceHelpEvent(allianceDoc, playerDoc, eventType, eventId, object.name, object.level + 1)
		allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), helpEvent])

		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback()
		return Promise.resolve()
	}).then(function(){
		LogicUtils.excuteAll(pushFuncs)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	if(!_.isString(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var memberDoc = null
	var memberData = []
	var helpEvent = null
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(doc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.allianceDao.findAsync(doc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc
		helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(!_.isObject(helpEvent)) return Promise.reject(ErrorUtils.allianceHelpEventNotExist(playerId, eventId))
		if(_.isEqual(playerDoc._id, helpEvent.playerData.id)) return Promise.reject(ErrorUtils.canNotHelpSelfSpeedup(playerId, eventId))
		if(_.contains(helpEvent.eventData.helpedMembers, playerId)) return Promise.reject(ErrorUtils.youAlreadyHelpedTheEvent(playerId, eventId))
		return self.playerDao.findAsync(helpEvent.playerData.id)
	}).then(function(doc){
		memberDoc = doc
		var memberEvent = LogicUtils.getPlayerEventByTypeAndId(memberDoc, helpEvent.eventData.type, helpEvent.eventData.id)
		if(!_.isObject(memberEvent) || LogicUtils.willFinished(memberEvent.finishTime)){
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)

			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, memberDoc._id])
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			return Promise.resolve()
		}

		helpEvent.eventData.helpedMembers.push(playerDoc._id)
		var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc, memberEvent.finishTime - memberEvent.startTime)
		memberEvent.finishTime = memberEvent.finishTime - effect
		if(helpEvent.eventData.helpedMembers.length >= helpEvent.eventData.maxHelpCount || LogicUtils.willFinished(memberEvent.finishTime)){
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
		}else{
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent) + ".eventData", helpEvent.eventData])
		}
		if(LogicUtils.willFinished(memberEvent.finishTime)){
			self.playerTimeEventService.onPlayerEvent(memberDoc, memberData, allianceDoc, allianceData, helpEvent.eventData.type, helpEvent.eventData.id)
			eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, memberDoc, helpEvent.eventData.type, memberEvent.id])
		}else{
			memberData.push([helpEvent.eventData.type + "." + memberDoc[helpEvent.eventData.type].indexOf(memberEvent) + ".finishTime", memberEvent.finishTime])
			eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, memberDoc, helpEvent.eventData.type, memberEvent.id, memberEvent.finishTime - Date.now()])
		}

		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.HelpAllianceMemberSpeedUp)

		if(_.isEmpty(playerData)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}else{
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		}
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
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var memberDocs = []
	var eventFuncs = []
	var pushFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(doc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.allianceDao.findAsync(doc.alliance.id)
	}).then(function(doc){
		allianceDoc = doc

		var speedUp = function(memberId, helpEvents){
			var needHelpedEvents = _.filter(helpEvents, function(helpEvent){
				return !_.contains(helpEvent.eventData.helpedMembers, playerId)
			})
			if(needHelpedEvents.length <= 0) return Promise.resolve()
			return self.playerDao.findAsync(memberId).then(function(doc){
				var memberDoc = doc
				var memberData = []
				memberDocs.push(memberDoc)
				for(var i = 0; i < needHelpedEvents.length; i++){
					var helpEvent = needHelpedEvents[i]
					var memberEvent = LogicUtils.getPlayerEventByTypeAndId(memberDoc, helpEvent.eventData.type, helpEvent.eventData.id)
					if(!_.isObject(memberEvent) || LogicUtils.willFinished(memberEvent.finishTime)){
						allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
						LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
					}else{
						helpEvent.eventData.helpedMembers.push(playerDoc._id)
						var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc, memberEvent.finishTime - memberEvent.startTime)
						memberEvent.finishTime = memberEvent.finishTime - effect

						if(helpEvent.eventData.helpedMembers.length >= helpEvent.eventData.maxHelpCount || LogicUtils.willFinished(memberEvent.finishTime)){
							allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
							LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
						}else{
							allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent) + ".eventData", helpEvent.eventData])
						}
						if(LogicUtils.willFinished(memberEvent.finishTime)){
							self.playerTimeEventService.onPlayerEvent(memberDoc, memberData, allianceDoc, allianceData, helpEvent.eventData.type, helpEvent.eventData.id)
							eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, memberDoc, helpEvent.eventData.type, memberEvent.id])
						}else{
							memberData.push([helpEvent.eventData.type + "." + memberDoc[helpEvent.eventData.type].indexOf(memberEvent) + ".finishTime", memberEvent.finishTime])
							eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, memberDoc, helpEvent.eventData.type, memberEvent.id, memberEvent.finishTime - Date.now()])
						}
					}
				}
				if(_.isEmpty(memberData)){
					updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, memberDoc._id])
				}else{
					updateFuncs.push([self.playerDao, self.playerDao.updateAsync, memberDoc])
					pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
				}

				return Promise.resolve()
			})
		}
		var funcs = []
		var memberEvents = {}
		_.each(allianceDoc.helpEvents, function(event){
			var memberId = event.playerData.id
			if(!_.isEqual(memberId, playerId)){
				if(!_.isObject(memberEvents[memberId])) memberEvents[memberId] = []
				memberEvents[memberId].push(event)
			}
		})
		_.each(memberEvents, function(theMemberEvents, memberId){
			funcs.push(speedUp(memberId, theMemberEvents))
		})

		return Promise.all(funcs)
	}).then(function(){
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.HelpAllianceMemberSpeedUp)
		if(_.isEmpty(playerData)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}else{
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		}
		if(_.isEmpty(allianceData)){
			updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, allianceDoc._id])
		}else{
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		}

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(allianceDoc._id))
		}
		_.each(memberDocs, function(memberDoc){
			funcs.push(self.playerDao.removeLockAsync(memberDoc._id))
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