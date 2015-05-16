"use strict"

/**
 * Created by modun on 14/12/10.
 */

var ShortId = require("shortid")
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


var AllianceApiService2 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.allianceTimeEventService = app.get("allianceTimeEventService")
	this.dataService = app.get("dataService")
	this.logService = app.get("logService")
	this.GemUse = app.get("GemUse")
}
module.exports = AllianceApiService2
var pro = AllianceApiService2.prototype


/**
 * 退出联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.quitAlliance = function(playerId, allianceId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'logicServerId', 'allianceId', 'basicInfo', 'resources', 'buildings', 'productionTechs', 'dragons', 'soldierMaterials', 'dragonMaterials', 'items', 'soldiers', 'soldierStars', 'helpToTroops', 'helpedByTroops', 'houseEvents', 'vipEvents', 'itemEvents'], false).then(function(doc){
		playerDoc = doc
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'members', 'allianceFight', 'mapObjects', 'events', 'helpEvents', 'attackMarchEvents', 'attackMarchReturnEvents', 'strikeMarchEvents', 'strikeMarchReturnEvents', 'villageEvents', 'shrineEvents'], false)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(_.isEqual(playerObject.title, Consts.AllianceTitle.Archon) && allianceDoc.members.length > 1){
			return Promise.reject(ErrorUtils.allianceArchonCanNotQuitAlliance(playerId, allianceDoc._id))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatusCanNotQuitAlliance(playerId, allianceDoc._id))

		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(playerId, event.id)
		})
		_.each(helpEvents, function(helpEvent){
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
		})
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject), null])
		LogicUtils.removeItemInArray(allianceDoc.members, playerObject)
		var playerMapObject = LogicUtils.getAllianceMapObjectById(allianceDoc, playerObject.mapId)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(playerMapObject), null])
		LogicUtils.removeItemInArray(allianceDoc.mapObjects, playerMapObject)
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Quit, playerObject.name, [])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)

		return Promise.resolve()
	}).then(function(){
		playerDoc.allianceId = null
		playerData.push(["allianceId", null])

		LogicUtils.returnPlayerShrineTroops(playerDoc, playerData, allianceDoc, allianceData)
		LogicUtils.returnPlayerMarchTroops(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerMarchReturnTroops(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, self.timeEventService)
		LogicUtils.returnPlayerVillageTroop(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, self.timeEventService)

		var returnHelpedByMarchTroop = function(marchEvent){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(marchEvent.attackPlayerData.id, ['_id', 'logicServerId', 'basicInfo', 'dragons', 'soldiers', 'vipEvents', 'itemEvents'], false).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByMarchTroop(doc, data, marchEvent, allianceDoc, allianceData, eventFuncs, self.timeEventService)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.quitAlliance.returnHelpedByMarchTroop", {marchEvent:marchEvent}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc, null)
				return Promise.resolve()
			})
		}
		var returnHelpedByTroop = function(helpedByTroop){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(helpedByTroop.id, ['_id', 'logicServerId', 'basicInfo', 'resources', 'buildings', 'productionTechs', 'dragons', 'soldierMaterials', 'dragonMaterials', 'items', 'soldiers', 'soldierStars', 'helpToTroops', 'houseEvents', 'vipEvents', 'itemEvents'], false).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByTroop(playerDoc, playerData, helpedByTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.quitAlliance.returnHelpedByTroop", {helpedByTroop:helpedByTroop}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc, null)
				return Promise.resolve()
			})
		}
		var returnHelpToTroop = function(helpToTroop){
			var doc = null
			var data = []
			return self.dataService.findPlayerAsync(helpToTroop.beHelpedPlayerData.id, ['_id', 'logicServerId', 'helpedByTroops'], false).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpToTroop(playerDoc, playerData, helpToTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.dataService.updatePlayerAsync(doc, doc)
			}).catch(function(e){
				self.logService.onEventError("allianceApiService2.quitAlliance.returnHelpToTroop", {helpToTroop:helpToTroop}, e.stack)
				if(_.isObject(doc)) return self.dataService.updatePlayerAsync(doc, null)
				return Promise.resolve()
			})
		}

		var funcs = []
		_.each(allianceDoc.attackMarchEvents, function(marchEvent){
			if(_.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence) && _.isEqual(marchEvent.defencePlayerData.id, playerDoc._id)){
				funcs.push(returnHelpedByMarchTroop(marchEvent))
			}
		})
		_.each(playerDoc.helpedByTroops, function(helpedByTroop){
			funcs.push(returnHelpedByTroop(helpedByTroop))
		})
		_.each(playerDoc.helpToTroops, function(helpToTroop){
			funcs.push(returnHelpToTroop(helpToTroop))
		})

		return Promise.all(funcs)
	}).then(function(){
		updateFuncs.push([self.dataService, self.dataService.removePlayerFromAllianceChannelAsync, allianceDoc._id, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, ["allianceId", ["allianceTag"]], ["", ""]])
		updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, playerDoc, playerDoc])
		if(allianceDoc.members.length == 0){
			updateFuncs.push([self.dataService, self.dataService.deleteAllianceAsync, allianceDoc])
			eventFuncs.push([self.timeEventService, self.timeEventService.clearAllianceTimeEventsAsync, allianceDoc])
		}else{
			updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 直接加入某联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.joinAllianceDirectly = function(playerId, allianceId, callback){
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceData = []
	var enemyAllianceViewData = null
	var updateFuncs = []
	var pushFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'logicServerId', 'allianceId', 'apnId', 'basicInfo', 'buildings', 'resources', 'allianceInfo', 'countInfo', 'requestToAllianceEvents', 'inviteToAllianceEvents'], false).then(function(doc){
		playerDoc = doc
		if(_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'buildings', 'allianceFight', 'members', 'mapObjects', 'events'], false)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.joinType, Consts.AllianceJoinType.All)) return Promise.reject(ErrorUtils.allianceDoNotAllowJoinDirectly(playerId, allianceDoc._id))
		if(allianceDoc.members.length >= DataUtils.getAllianceMemberMaxCount(allianceDoc)) return Promise.reject(ErrorUtils.allianceMemberCountReachMax(playerId, allianceDoc._id))
		if(_.isObject(allianceDoc.allianceFight)){
			var enemyAllianceId = LogicUtils.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
			return self.dataService.directFindAllianceAsync(enemyAllianceId, Consts.AllianceViewDataKeys, false).then(function(doc){
				enemyAllianceViewData = doc
				return Promise.resolve()
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberMapObject)
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberMapObject.id, true)
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		enemyAllianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		enemyAllianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])

		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)

		playerDoc.allianceId = allianceDoc._id
		playerData.push(["allianceId", playerDoc.allianceId])
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.push(["requestToAllianceEvents", playerDoc.requestToAllianceEvents])
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.push(["inviteToAllianceEvents", playerDoc.inviteToAllianceEvents])

		updateFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, ["allianceId", ["allianceTag"]], [allianceDoc._id, allianceDoc.basicInfo.tag]])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, playerDoc, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, [playerData, allianceDoc, enemyAllianceViewData])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 申请加入联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.requestToJoinAlliance = function(playerId, allianceId, callback){
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
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
	this.dataService.findPlayerAsync(playerId, ['_id', 'allianceId', 'basicInfo', 'requestToAllianceEvents'], false).then(function(doc){
		playerDoc = doc
		if(!_.isEmpty(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		if(playerDoc.requestToAllianceEvents.length >= Define.RequestJoinAllianceMessageMaxSize){
			return Promise.reject(ErrorUtils.joinAllianceRequestIsFull(playerId))
		}
		if(LogicUtils.hasPendingRequestEventToAlliance(playerDoc, allianceId)){
			return Promise.reject(ErrorUtils.joinTheAllianceRequestAlreadySend(playerId, allianceId))
		}
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'basicInfo', 'buildings', 'events', 'members', 'joinRequestEvents'], false)
	}).then(function(doc){
		allianceDoc = doc
		var requestTime = Date.now()
		var requestToAllianceEvent = LogicUtils.addPlayerJoinAllianceEvent(playerDoc, allianceDoc, requestTime)
		playerData.push(["requestToAllianceEvents." + playerDoc.requestToAllianceEvents.indexOf(requestToAllianceEvent), requestToAllianceEvent])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])

		var joinRequestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
			return _.isEqual(event.id, playerId)
		})
		if(_.isObject(joinRequestEvent)){
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, null])
			return Promise.resolve()
		}else{
			if(doc.joinRequestEvents.length >= Define.AllianceRequestMessageMaxSize){
				return Promise.reject(ErrorUtils.allianceJoinRequestMessagesIsFull(playerId, allianceId))
			}
			joinRequestEvent = LogicUtils.addAllianceRequestEvent(allianceDoc, playerDoc, requestTime)
			allianceData.push(["joinRequestEvents." + allianceDoc.joinRequestEvents.indexOf(joinRequestEvent), joinRequestEvent])
			LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Request, playerDoc.basicInfo.name, [])
			updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			return Promise.resolve()
		}
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 取消对某联盟的加入申请
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.cancelJoinAllianceRequest = function(playerId, allianceId, callback){
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'allianceId', 'requestToAllianceEvents'], false).then(function(doc){
		playerDoc = doc
		if(!_.isEmpty(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		var eventInPlayer = LogicUtils.getRequestToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(eventInPlayer)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(playerId, allianceId))
		playerData.push(["requestToAllianceEvents." + playerDoc.requestToAllianceEvents.indexOf(eventInPlayer), null])
		LogicUtils.removeItemInArray(playerDoc.requestToAllianceEvents, eventInPlayer)
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 删除加入联盟申请事件
 * @param playerId
 * @param allianceId
 * @param requestEventIds
 * @param callback
 */
pro.removeJoinAllianceReqeusts = function(playerId, allianceId, requestEventIds, callback){
	if(!_.isArray(requestEventIds) || requestEventIds.length == 0){
		callback(new Error("requestEventIds 不合法"))
		return
	}
	for(var i = 0; i < requestEventIds; i++){
		if(!ShortId.isValid(requestEventIds[i])){
			callback(new Error("requestEventIds 不合法"))
			return
		}
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'members', 'joinRequestEvents'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "removeJoinAllianceReqeusts")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "removeJoinAllianceReqeusts"))
		}

		_.each(requestEventIds, function(requestEventId){
			var requestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
				return _.isEqual(event.id, requestEventId)
			})
			if(!_.isObject(requestEvent)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(requestEventId, allianceDoc._id))
			allianceData.push(["joinRequestEvents." + allianceDoc.joinRequestEvents.indexOf(requestEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, requestEvent)
		})

		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
		return Promise.resolve()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
			return Promise.resolve()
		})
	}).then(function(){
		var handleMemberAsync = function(memberId){
			var memberDoc = null
			var memberData = []
			return self.dataService.findPlayerAsync(memberId, ['_id', 'logicServerId', 'requestToAllianceEvents'], false).then(function(doc){
				memberDoc = doc
				var requestToAllianceEvent = _.find(memberDoc.requestToAllianceEvents, function(event){
					return _.isEqual(event.id, allianceDoc._id)
				})
				if(_.isObject(requestToAllianceEvent)){
					memberData.push(["requestToAllianceEvents." + memberDoc.requestToAllianceEvents.indexOf(requestToAllianceEvent), null])
					LogicUtils.removeItemInArray(memberDoc.requestToAllianceEvents, requestToAllianceEvent)
				}
				if(_.isEmpty(memberData))
					return self.dataService.updatePlayerAsync(memberDoc, null)
				else
					return self.dataService.updatePlayerAsync(memberDoc, memberDoc)
			}).then(function(){
				if(memberData.length > 0)
					return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData)
				else
					return Promise.resolve()
			}).then(function(){
				var titleKey = DataUtils.getLocalizationConfig("alliance", "RequestRejectedTitle")
				var contentKey = DataUtils.getLocalizationConfig("alliance", "RequestRejectedContent")
				return self.dataService.sendSysMailAsync(memberDoc._id, titleKey, [], contentKey, [allianceDoc.basicInfo.name])
			}).catch(function(e){
				self.logService.onEventError("logic.allianceApiService2.removeJoinAllianceReqeusts.handleMemberAsync", {memberId:memberId}, e.stack)
				var funcs = []
				if(_.isObject(memberDoc))
					funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
				return Promise.all(funcs)
			})
		}
		var funcs = []
		_.each(requestEventIds, function(eventId){
			funcs.push(handleMemberAsync(eventId))
		})
		return Promise.all(funcs)
	}).catch(function(e){
		self.logService.onEventError("logic.allianceApiService2.removeJoinAllianceReqeusts", {
			playerId:playerId,
			allianceId:allianceDoc._id,
			requestEventIds:requestEventIds
		}, e.stack)
	})
}

/**
 * 同意加入联盟申请
 * @param playerId
 * @param allianceId
 * @param requestEventId
 * @param callback
 */
pro.approveJoinAllianceRequest = function(playerId, allianceId, requestEventId, callback){
	if(!_.isString(requestEventId) || !ShortId.isValid(requestEventId)){
		callback(new Error("requestEventId 不合法"))
		return
	}

	var self = this
	var allianceDoc = null
	var allianceData = []
	var enemyAllianceDoc = null
	var enemyAllianceData = []
	var enemyAllianceViewData = null
	var requestEvent = null
	var memberDoc = null
	var memberData = []
	var updateFuncs = []
	var pushFuncs = []
	this.dataService.findAllianceAsync(allianceId, ['_id', 'members', 'allianceFight', 'mapObjects', 'buildings', 'basicInfo', 'events', 'joinRequestEvents'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "approveJoinAllianceRequest")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "approveJoinAllianceRequest"))
		}
		if(allianceDoc.members.length >= DataUtils.getAllianceMemberMaxCount(allianceDoc)) return Promise.reject(ErrorUtils.allianceMemberCountReachMax(playerId, allianceDoc._id))
		requestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
			return _.isEqual(event.id, requestEventId)
		})
		if(!_.isObject(requestEvent)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(requestEventId, allianceDoc._id))
		allianceData.push(["joinRequestEvents." + allianceDoc.joinRequestEvents.indexOf(requestEvent), null])
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, requestEvent)
		return self.dataService.findPlayerAsync(requestEventId, ['_id', 'apnId', 'logicServerId', 'allianceId', 'basicInfo', 'resources', 'allianceInfo', 'countInfo', 'buildings', 'requestToAllianceEvents', 'inviteToAllianceEvents'], false)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, requestEventId))
		memberDoc = doc
		if(!_.isEmpty(memberDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, memberDoc._id))
		var hasPendingRequest = _.some(memberDoc.requestToAllianceEvents, function(event){
			return _.isEqual(event.id, allianceDoc._id)
		})
		if(!hasPendingRequest) return Promise.reject(ErrorUtils.playerCancelTheJoinRequestToTheAlliance(memberDoc._id, allianceDoc._id))

		if(_.isObject(allianceDoc.allianceFight)){
			var enemyAllianceId = LogicUtils.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
			return self.dataService.directFindAllianceAsync(enemyAllianceId, [], false).then(function(doc){
				enemyAllianceDoc = doc
				enemyAllianceViewData = _.pick(enemyAllianceDoc, Consts.AllianceViewDataKeys)
				return Promise.resolve()
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(allianceDoc.mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		allianceDoc.mapObjects.push(memberMapObject)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		enemyAllianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, memberDoc, Consts.AllianceTitle.Member, memberMapObject.id, !_.isEmpty(memberDoc.logicServerId))
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		enemyAllianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, memberDoc.basicInfo.name, [])

		memberDoc.allianceId = allianceDoc._id
		memberData.push(["allianceId", memberDoc.allianceId])
		LogicUtils.clearArray(memberDoc.requestToAllianceEvents)
		memberData.push(["requestToAllianceEvents", memberDoc.requestToAllianceEvents])
		LogicUtils.clearArray(memberDoc.inviteToAllianceEvents)
		memberData.push(["inviteToAllianceEvents", memberDoc.inviteToAllianceEvents])

		if(!_.isEmpty(memberDoc.logicServerId)){
			updateFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, memberDoc])
			updateFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, memberDoc, ["allianceId", ["allianceTag"]], [allianceDoc._id, allianceDoc.basicInfo.tag]])
		}
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, memberDoc, memberDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, memberDoc._id])
		pushFuncs.push([self.pushService, self.pushService.onJoinAllianceSuccessAsync, memberDoc, memberData, allianceDoc, enemyAllianceViewData])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		var allianceName = allianceDoc.basicInfo.name
		allianceDoc = null
		var memberId = memberDoc._id
		memberDoc = null
		var titleKey = DataUtils.getLocalizationConfig("alliance", "RequestApprovedTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "RequestApprovedContent")
		return self.dataService.sendSysMail(memberId, titleKey, [], contentKey, [allianceName])
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 邀请玩家加入联盟
 * @param playerId
 * @param allianceId
 * @param memberId
 * @param callback
 */
pro.inviteToJoinAlliance = function(playerId, allianceId, memberId, callback){
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("不能邀请自己加入联盟"))
		return
	}

	var self = this
	var memberDoc = null
	var memberData = []
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.dataService.directFindAllianceAsync(allianceId, ['_id', 'basicInfo', 'members', 'buildings'], false).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "inviteToJoinAlliance")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "inviteToJoinAlliance"))
		}
		return self.dataService.findPlayerAsync(memberId, ['_id', 'logicServerId', 'allianceId', 'inviteToAllianceEvents'], false)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
		memberDoc = doc
		if(_.isObject(memberDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, memberId))
		if(LogicUtils.hasInviteEventToAlliance(memberDoc, allianceDoc)){
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, memberDoc, null])
			return Promise.resolve()
		}else if(memberDoc.inviteToAllianceEvents.length >= Define.InviteJoinAllianceMessageMaxSize){
			return Promise.reject(ErrorUtils.inviteRequestMessageIsFullForThisPlayer(playerId, allianceDoc._id, memberId))
		}else{
			var inviteTime = Date.now()
			var inviteToAllianceEvent = LogicUtils.addPlayerInviteAllianceEvent(playerId, memberDoc, allianceDoc, inviteTime)
			memberData.push(["inviteToAllianceEvents." + memberDoc.inviteToAllianceEvents.indexOf(inviteToAllianceEvent), inviteToAllianceEvent])
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, memberDoc, memberDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
			return Promise.resolve()
		}
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
		}

		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	if(!_.isString(allianceId) || !ShortId.isValid(allianceId)){
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
	var enemyAllianceData = []
	var enemyAllianceViewData = null
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'logicServerId', 'allianceId', 'apnId', 'basicInfo', 'resources', 'allianceInfo', 'buildings', 'countInfo', 'inviteToAllianceEvents', 'requestToAllianceEvents'], false).then(function(doc){
		playerDoc = doc
		if(_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		var inviteEvent = LogicUtils.getInviteToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(inviteEvent)) return Promise.reject(ErrorUtils.allianceInviteEventNotExist(playerId, allianceId))
		playerData.push(["inviteToAllianceEvents." + playerDoc.inviteToAllianceEvents.indexOf(inviteEvent), null])
		LogicUtils.removeItemInArray(playerDoc.inviteToAllianceEvents, inviteEvent)
		if(agree){
			updateFuncs.push([self.dataService, self.dataService.flushPlayerAsync, playerDoc, playerDoc])
		}else{
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		}
		var inviterId = inviteEvent.inviterId
		var titleKey = null
		var contentKey = null
		if(!agree){
			titleKey = DataUtils.getLocalizationConfig("alliance", "InviteRejectedTitle")
			contentKey = DataUtils.getLocalizationConfig("alliance", "InviteRejectedContent")
			return self.dataService.sendSysMailAsync(inviterId, titleKey, [], contentKey, [playerDoc.basicInfo.name])
		}else{
			titleKey = DataUtils.getLocalizationConfig("alliance", "InviteApprovedTitle")
			contentKey = DataUtils.getLocalizationConfig("alliance", "InviteApprovedContent")
			return self.dataService.sendSysMailAsync(inviterId, titleKey, [], contentKey, [playerDoc.basicInfo.name])
		}
	}).then(function(){
		if(agree){
			return self.dataService.findAllianceAsync(allianceId, ['_id', 'members', 'allianceFight', 'mapObjects', 'buildings', 'basicInfo', 'events'], false).then(function(doc){
				if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
				allianceDoc = doc
				if(allianceDoc.members.length >= DataUtils.getAllianceMemberMaxCount(allianceDoc)) return Promise.reject(ErrorUtils.allianceMemberCountReachMax(playerId, allianceDoc._id))
				if(_.isObject(allianceDoc.allianceFight)){
					var enemyAllianceId = LogicUtils.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
					return self.dataService.directFindAllianceAsync(enemyAllianceId, Consts.AllianceViewDataKeys, false).then(function(doc){
						enemyAllianceViewData = doc
						return Promise.resolve()
					})
				}else return Promise.resolve()
			})
		}else return Promise.resolve()
	}).then(function(){
		if(!agree) return Promise.resolve()
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(allianceDoc.mapObjects, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		allianceDoc.mapObjects.push(memberMapObject)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		enemyAllianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberMapObject.id, true)
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		enemyAllianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])

		updateFuncs.unshift([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, ["allianceId", ["allianceTag"]], [allianceDoc._id, allianceDoc.basicInfo.tag]])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc._id, allianceData, playerDoc._id])
		LogicUtils.pushDataToEnemyAlliance(allianceDoc, enemyAllianceData, pushFuncs, self.pushService)

		playerDoc.allianceId = allianceDoc._id
		playerData.push(["allianceId", playerDoc.allianceId])
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
		callback(null, [playerData, allianceDoc, enemyAllianceViewData])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 盟主长时间不登录时,玩家可宝石购买盟主职位
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.buyAllianceArchon = function(playerId, allianceId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var archonDoc = null
	var allianceDoc = null
	var allianceData = []
	var archonObject = null
	var playerObject = null
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'resources'], false).then(function(doc){
		playerDoc = doc
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'members', 'events'], false)
	}).then(function(doc){
		allianceDoc = doc
		playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(_.isEqual(playerObject.title, Consts.AllianceTitle.Archon)) return Promise.reject(ErrorUtils.playerAlreadyTheAllianceArchon(playerId, allianceId))
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

		archonObject = LogicUtils.getAllianceArchon(allianceDoc)
		var canBuyInterval = 1000 * 60 * 60 * 24 * 7 //7天
		if(archonObject.lastLoginTime + canBuyInterval > Date.now()){
			return Promise.reject(ErrorUtils.onlyAllianceArchonMoreThanSevenDaysNotOnLinePlayerCanBuyArchonTitle(playerId, allianceDoc._id))
		}
		return self.dataService.directFindPlayerAsync(archonObject.id, [], false)
	}).then(function(doc){
		archonDoc = doc

		playerObject.title = Consts.AllianceTitle.Archon
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".title", playerObject.title])
		archonObject.title = Consts.AllianceTitle.Member
		allianceData.push(["members." + allianceDoc.members.indexOf(archonObject) + ".title", archonObject.title])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, playerDoc.basicInfo.name, [])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}

		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 请求联盟成员协助加速
 * @param playerId
 * @param allianceId
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.requestAllianceToSpeedUp = function(playerId, allianceId, eventType, eventId, callback){
	if(!_.contains(Consts.AllianceHelpEventType, eventType)){
		callback(new Error("eventType 不合法"))
		return
	}
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
		callback(new Error("eventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId, ['_id', 'basicInfo', 'buildings', eventType], false).then(function(doc){
		playerDoc = doc
		var playerEvent = LogicUtils.getPlayerEventByTypeAndId(playerDoc, eventType, eventId)
		if(!_.isObject(playerEvent)) return Promise.reject(ErrorUtils.playerEventNotExist(playerId, eventType, eventId))
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'helpEvents'], false)
	}).then(function(doc){
		allianceDoc = doc
		var helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(_.isObject(helpEvent)) return Promise.reject(ErrorUtils.speedupRequestAlreadySendForThisEvent(playerId, allianceDoc._id, eventType, eventId))

		var object = LogicUtils.getPlayerObjectByEvent(playerDoc, eventType, eventId)
		helpEvent = DataUtils.addAllianceHelpEvent(allianceDoc, playerDoc, eventType, eventId, object.name, object.level + 1)
		allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), helpEvent])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
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
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 协助联盟玩家加速
 * @param playerId
 * @param allianceId
 * @param eventId
 * @param callback
 */
pro.helpAllianceMemberSpeedUp = function(playerId, allianceId, eventId, callback){
	if(!_.isString(eventId) || !ShortId.isValid(eventId)){
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
	this.dataService.findPlayerAsync(playerId, ['_id', 'countInfo', 'basicInfo', 'allianceInfo', 'dailyTasks', 'vipEvents'], false).then(function(doc){
		playerDoc = doc
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'helpEvents'], false)
	}).then(function(doc){
		allianceDoc = doc
		helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(!_.isObject(helpEvent)) return Promise.reject(ErrorUtils.allianceHelpEventNotExist(playerId, eventId))
		if(_.isEqual(playerDoc._id, helpEvent.playerData.id)) return Promise.reject(ErrorUtils.canNotHelpSelfSpeedup(playerId, eventId))
		if(_.contains(helpEvent.eventData.helpedMembers, playerId)) return Promise.reject(ErrorUtils.youAlreadyHelpedTheEvent(playerId, eventId))
		return self.dataService.findPlayerAsync(helpEvent.playerData.id, ['_id', 'logicServerId', 'basicInfo', 'resources', 'vipEvents', 'materialEvents', 'soldiers', 'soldierEvents', 'soldierStars', 'soldierStarEvents', 'buildings', 'buildingEvents', 'houseEvents', 'productionTechs', 'productionTechEvents', 'militaryTechs', 'militaryTechEvents', 'itemEvents', 'dailyTasks', 'growUpTasks'], false)
	}).then(function(doc){
		memberDoc = doc
		DataUtils.addPlayerHelpLoyalty(playerDoc, playerData, 1)
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.HelpAllianceMemberSpeedUp)
		var memberEvent = LogicUtils.getPlayerEventByTypeAndId(memberDoc, helpEvent.eventData.type, helpEvent.eventData.id)
		if(!_.isObject(memberEvent) || LogicUtils.willFinished(memberEvent.finishTime)){
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
			LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			return Promise.resolve()
		}else{
			helpEvent.eventData.helpedMembers.push(playerDoc._id)
			allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent) + ".eventData.helpedMembers." + helpEvent.eventData.helpedMembers.indexOf(playerDoc._id), playerDoc._id])
			var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc, memberEvent.finishTime - memberEvent.startTime)
			memberEvent.finishTime = memberEvent.finishTime - effect
			if(helpEvent.eventData.helpedMembers.length >= helpEvent.eventData.maxHelpCount || LogicUtils.willFinished(memberEvent.finishTime)){
				allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			}
			if(LogicUtils.willFinished(memberEvent.finishTime)){
				self.playerTimeEventService.onPlayerEvent(memberDoc, memberData, helpEvent.eventData.type, helpEvent.eventData.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, memberDoc, helpEvent.eventData.type, memberEvent.id])
			}else{
				memberData.push([helpEvent.eventData.type + "." + memberDoc[helpEvent.eventData.type].indexOf(memberEvent) + ".finishTime", memberEvent.finishTime])
				eventFuncs.push([self.timeEventService, self.timeEventService.updatePlayerTimeEventAsync, memberDoc, helpEvent.eventData.type, memberEvent.id, memberEvent.finishTime - Date.now()])
			}
			return Promise.resolve()
		}
	}).then(function(){
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, _.isEmpty(playerData) ? null : playerDoc])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, memberDoc, _.isEmpty(memberData) ? null : memberDoc])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		if(!_.isEmpty(memberData)){
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		}
		if(!_.isEmpty(playerData)){
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		}
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.dataService.updatePlayerAsync(memberDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 协助联盟所有玩家加速
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.helpAllAllianceMemberSpeedUp = function(playerId, allianceId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var memberEvents = {}
	var helpCount = 0
	this.dataService.findPlayerAsync(playerId, ['_id', 'countInfo', 'basicInfo', 'allianceInfo', 'dailyTasks', 'vipEvents'], false).then(function(doc){
		playerDoc = doc
		return self.dataService.findAllianceAsync(allianceId, ['_id', 'helpEvents'], false)
	}).then(function(doc){
		allianceDoc = doc
		_.each(allianceDoc.helpEvents, function(event){
			var memberId = event.playerData.id
			if(!_.isEqual(memberId, playerId) && !_.contains(event.eventData.helpedMembers, playerId)){
				if(!_.isObject(memberEvents[memberId])) memberEvents[memberId] = []
				memberEvents[memberId].push(event)
				helpCount += 1
			}
		})
		if(helpCount == 0) return Promise.reject(ErrorUtils.noEventsNeedTobeSpeedup(playerId))

		var speedUp = function(memberId, helpEvents){
			var memberDoc = null
			var memberData = []
			var eventFuncs = []
			return self.dataService.findPlayerAsync(memberId, ['_id', 'logicServerId', 'basicInfo', 'resources', 'vipEvents', 'materialEvents', 'soldiers', 'soldierEvents', 'soldierStars', 'soldierStarEvents', 'buildings', 'buildingEvents', 'houseEvents', 'productionTechs', 'productionTechEvents', 'militaryTechs', 'militaryTechEvents', 'itemEvents', 'dailyTasks', 'growUpTasks'], false).then(function(doc){
				memberDoc = doc
				for(var i = 0; i < helpEvents.length; i++){
					var helpEvent = helpEvents[i]
					var memberEvent = LogicUtils.getPlayerEventByTypeAndId(memberDoc, helpEvent.eventData.type, helpEvent.eventData.id)
					if(!_.isObject(memberEvent) || LogicUtils.willFinished(memberEvent.finishTime)){
						allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
						LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
					}else{
						helpEvent.eventData.helpedMembers.push(playerDoc._id)
						allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent) + ".eventData.helpedMembers." + helpEvent.eventData.helpedMembers.indexOf(playerDoc._id), playerDoc._id])
						var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc, memberEvent.finishTime - memberEvent.startTime)
						memberEvent.finishTime = memberEvent.finishTime - effect

						if(helpEvent.eventData.helpedMembers.length >= helpEvent.eventData.maxHelpCount || LogicUtils.willFinished(memberEvent.finishTime)){
							allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
							LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
						}
						if(LogicUtils.willFinished(memberEvent.finishTime)){
							self.playerTimeEventService.onPlayerEvent(memberDoc, memberData, helpEvent.eventData.type, helpEvent.eventData.id)
							eventFuncs.push(self.timeEventService.removePlayerTimeEventAsync(memberDoc, helpEvent.eventData.type, memberEvent.id))
						}else{
							memberData.push([helpEvent.eventData.type + "." + memberDoc[helpEvent.eventData.type].indexOf(memberEvent) + ".finishTime", memberEvent.finishTime])
							eventFuncs.push(self.timeEventService.updatePlayerTimeEventAsync(memberDoc, helpEvent.eventData.type, memberEvent.id, memberEvent.finishTime - Date.now()))
						}
					}
				}
				return self.dataService.updatePlayerAsync(memberDoc, _.isEmpty(memberData) ? null : memberDoc)
			}).then(function(){
				return Promise.all(eventFuncs)
			}).then(function(){
				return !_.isEmpty(memberData) ? self.pushService.onPlayerDataChangedAsync(memberDoc, memberData) : Promise.resolve()
			}).catch(function(e){
				self.logService.onEvent("logic.allianceApiService2.helpAllAllianceMemberSpeedUp.speedUp", {
					memberId:memberId,
					helpEvents:helpEvents
				}, e.stack)
				if(_.isObject(memberDoc)) return self.dataService.updatePlayerAsync(memberDoc, null)
				return Promise.resolve()
			})
		}

		var funcs = []
		_.each(memberEvents, function(helpEvents, memberId){
			funcs.push(speedUp(memberId, helpEvents))
		})
		return Promise.all(funcs)
	}).then(function(){
		DataUtils.addPlayerHelpLoyalty(playerDoc, playerData, helpCount)
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.BrotherClub, Consts.DailyTaskIndexMap.BrotherClub.HelpAllianceMemberSpeedUp)
		var funcs = []
		funcs.push(self.dataService.updatePlayerAsync(playerDoc, playerDoc))
		funcs.push(self.dataService.updateAllianceAsync(allianceDoc, allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedAsync(allianceDoc._id, allianceData)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}