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
	this.cacheService = app.get('cacheService');
	this.logService = app.get("logService")
	this.cacheServerId = app.get('cacheServerId');
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(_.isEqual(playerObject.title, Consts.AllianceTitle.Archon) && allianceDoc.members.length > 1){
			return Promise.reject(ErrorUtils.allianceArchonCanNotQuitAlliance(playerId, allianceDoc._id))
		}
		if(_.isObject(allianceDoc.allianceFight)) return Promise.reject(ErrorUtils.allianceInFightStatusCanNotQuitAlliance(playerId, allianceDoc._id))
		var hasStrikeMarchEventsToPlayer = _.some(self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData.marchEvents.strikeMarchEvents, function(event){
			return event.marchType === Consts.MarchType.City && event.defencePlayerData.id === playerId;
		})
		var hasAttackMarchEventsToPlayer = _.some(self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData.marchEvents.attackMarchEvents, function(event){
			return event.marchType === Consts.MarchType.City && event.defencePlayerData.id === playerId;
		})
		if(hasStrikeMarchEventsToPlayer || hasAttackMarchEventsToPlayer) return Promise.reject(ErrorUtils.canNotQuitAllianceForPlayerWillBeAttacked(playerId, allianceId, playerId));

		var helpEvents = _.filter(allianceDoc.helpEvents, function(event){
			return _.isEqual(playerId, event.playerData.id)
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
		DataUtils.refreshPlayerResources(playerDoc)

		LogicUtils.returnPlayerShrineTroops(playerDoc, playerData, allianceDoc, allianceData)
		LogicUtils.returnPlayerMarchTroops(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, pushFuncs, self.timeEventService, self.cacheService);
		LogicUtils.returnPlayerMarchReturnTroops(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, pushFuncs, self.timeEventService, self.cacheService);
		LogicUtils.returnPlayerVillageTroop(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, pushFuncs, self.timeEventService, self.dataService, self.cacheService);
		LogicUtils.removePlayerHelpEvents(playerDoc, allianceDoc, allianceData);

		var returnHelpedByTroop = function(helpedByTroop){
			var doc = null
			var data = []
			return self.cacheService.findPlayerAsync(helpedByTroop.id).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpedByTroop(playerDoc, playerData, helpedByTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.cacheService.updatePlayerAsync(doc._id, doc)
			}).catch(function(e){
				self.logService.onError("allianceApiService2.quitAlliance.returnHelpedByTroop", {helpedByTroop:helpedByTroop}, e.stack)
				if(_.isObject(doc)) return self.cacheService.updatePlayerAsync(doc._id, null)
				return Promise.resolve()
			})
		}
		var returnHelpToTroop = function(helpToTroop){
			var doc = null
			var data = []
			return self.cacheService.findPlayerAsync(helpToTroop.beHelpedPlayerData.id).then(function(theDoc){
				doc = theDoc
				LogicUtils.returnPlayerHelpToTroop(allianceDoc, allianceData, playerDoc, playerData, helpToTroop, doc, data)
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, doc, data])
				return self.cacheService.updatePlayerAsync(doc._id, doc)
			}).catch(function(e){
				self.logService.onError("allianceApiService2.quitAlliance.returnHelpToTroop", {helpToTroop:helpToTroop}, e.stack)
				if(_.isObject(doc)) return self.cacheService.updatePlayerAsync(doc._id, null)
				return Promise.resolve()
			})
		}

		var funcs = [];
		_.each(playerDoc.helpedByTroops, function(helpedByTroop){
			funcs.push(returnHelpedByTroop(helpedByTroop))
		})
		_.each(playerDoc.helpToTroops, function(helpToTroop){
			funcs.push(returnHelpToTroop(helpToTroop))
		})

		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		return Promise.all(funcs)
	}).then(function(){
		eventFuncs.push([self.dataService, self.dataService.removePlayerFromAllianceChannelAsync, allianceDoc._id, playerDoc])
		eventFuncs.push([self.cacheService, self.cacheService.removeFromViewedMapIndexChannelAsync, playerDoc._id, playerDoc.logicServerId]);
		eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, {
			allianceId:"",
			allianceTag:""
		}])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id, playerDoc])
		if(allianceDoc.members.length == 0){
			eventFuncs.push([self.dataService, self.dataService.destroyAllianceChannelAsync, allianceDoc._id])
			updateFuncs.push([self.cacheService, self.cacheService.deleteAllianceAsync, allianceDoc._id])
			eventFuncs.push([self.timeEventService, self.timeEventService.clearAllianceTimeEventsAsync, allianceDoc])
			pushFuncs.push([self.cacheService, self.cacheService.updateMapAllianceAsync, allianceDoc.mapIndex, null]);
		}else{
			updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		}
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		playerDoc = null;
		allianceDoc = null;
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, playerData)
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
}

/**
 * 直接加入某联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.joinAllianceDirectly = function(playerId, allianceId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.joinType, Consts.AllianceJoinType.All)) return Promise.reject(ErrorUtils.allianceDoNotAllowJoinDirectly(playerId, allianceDoc._id))
		if(allianceDoc.members.length >= DataUtils.getAllianceMemberMaxCount(allianceDoc)) return Promise.reject(ErrorUtils.allianceMemberCountReachMax(playerId, allianceDoc._id))
		if(allianceDoc.basicInfo.status === Consts.AllianceStatus.Fight) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id));

		var mapObjects = allianceDoc.mapObjects
		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(allianceDoc, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		mapObjects.push(memberMapObject)
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberMapObject.id, true)
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])

		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)

		playerDoc.allianceId = allianceDoc._id
		playerData.push(["allianceId", playerDoc.allianceId])
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.push(["requestToAllianceEvents", playerDoc.requestToAllianceEvents])
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.push(["inviteToAllianceEvents", playerDoc.inviteToAllianceEvents])

		eventFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, {
			allianceId:allianceDoc._id,
			allianceTag:allianceDoc.basicInfo.tag
		}])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, playerDoc._id])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		var mapData = self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData;
		var mapIndexData = self.cacheService.getMapIndexs();
		callback(null, [playerData, allianceDoc, mapData, mapIndexData]);
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
}

/**
 * 申请加入联盟
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.requestToJoinAlliance = function(playerId, allianceId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isEmpty(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		if(playerDoc.requestToAllianceEvents.length >= Define.RequestJoinAllianceMessageMaxSize){
			return Promise.reject(ErrorUtils.joinAllianceRequestIsFull(playerId))
		}
		if(LogicUtils.hasPendingRequestEventToAlliance(playerDoc, allianceId)){
			return Promise.reject(ErrorUtils.joinTheAllianceRequestAlreadySend(playerId, allianceId))
		}
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
		allianceDoc = doc
		if(!_.isEqual(allianceDoc.basicInfo.joinType, Consts.AllianceJoinType.Audit)) return Promise.reject(ErrorUtils.theAllianceDoNotNeedRequestToJoin(playerId, allianceId))
		var requestTime = Date.now()
		var joinRequestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
			return _.isEqual(event.id, playerId)
		})
		if(_.isObject(joinRequestEvent)){
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, null])
		}else{
			if(doc.joinRequestEvents.length >= Define.AllianceRequestMessageMaxSize){
				return Promise.reject(ErrorUtils.allianceJoinRequestMessagesIsFull(playerId, allianceId))
			}
			joinRequestEvent = LogicUtils.addAllianceRequestEvent(allianceDoc, playerDoc, requestTime)
			allianceData.push(["joinRequestEvents." + allianceDoc.joinRequestEvents.indexOf(joinRequestEvent), joinRequestEvent])
			updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
		}
		var requestToAllianceEvent = LogicUtils.addPlayerJoinAllianceEvent(playerDoc, allianceDoc, requestTime)
		playerData.push(["requestToAllianceEvents." + playerDoc.requestToAllianceEvents.indexOf(requestToAllianceEvent), requestToAllianceEvent])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
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
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isEmpty(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		var eventInPlayer = LogicUtils.getRequestToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(eventInPlayer)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(playerId, allianceId))
		playerData.push(["requestToAllianceEvents." + playerDoc.requestToAllianceEvents.indexOf(eventInPlayer), null])
		LogicUtils.removeItemInArray(playerDoc.requestToAllianceEvents, eventInPlayer)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var updateFuncs = []
	var pushFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
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

		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
			return Promise.resolve()
		})
	}).then(function(){
		var handleMemberAsync = function(memberId){
			var memberDoc = null
			var memberData = []
			return self.cacheService.findPlayerAsync(memberId).then(function(doc){
				memberDoc = doc
				var requestToAllianceEvent = _.find(memberDoc.requestToAllianceEvents, function(event){
					return _.isEqual(event.id, allianceDoc._id)
				})
				if(_.isObject(requestToAllianceEvent)){
					memberData.push(["requestToAllianceEvents." + memberDoc.requestToAllianceEvents.indexOf(requestToAllianceEvent), null])
					LogicUtils.removeItemInArray(memberDoc.requestToAllianceEvents, requestToAllianceEvent)
				}
				if(_.isEmpty(memberData))
					return self.cacheService.updatePlayerAsync(memberDoc._id, null)
				else
					return self.cacheService.updatePlayerAsync(memberDoc._id, memberDoc)
			}).then(function(){
				if(memberData.length > 0)
					return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData)
				else
					return Promise.resolve()
			}).then(function(){
				var allianceName = allianceDoc.basicInfo.name
				allianceDoc = null
				var titleKey = DataUtils.getLocalizationConfig("alliance", "RequestRejectedTitle")
				var contentKey = DataUtils.getLocalizationConfig("alliance", "RequestRejectedContent")
				return self.dataService.sendSysMailAsync(memberDoc._id, titleKey, [], contentKey, [allianceName])
			}).catch(function(e){
				self.logService.onError("logic.allianceApiService2.removeJoinAllianceReqeusts.handleMemberAsync", {memberId:memberId}, e.stack)
				var funcs = []
				if(_.isObject(memberDoc))
					funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
				return Promise.all(funcs)
			})
		}
		var funcs = []
		_.each(requestEventIds, function(eventId){
			funcs.push(handleMemberAsync(eventId))
		})
		return Promise.all(funcs)
	}).catch(function(e){
		self.logService.onError("logic.allianceApiService2.removeJoinAllianceReqeusts", {
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
	var self = this
	var allianceDoc = null
	var allianceData = []
	var requestEvent = null
	var memberDoc = null
	var memberData = []
	var updateFuncs = []
	var eventFuncs = []
	var pushFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "approveJoinAllianceRequest")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "approveJoinAllianceRequest"))
		}
		if(allianceDoc.members.length >= DataUtils.getAllianceMemberMaxCount(allianceDoc)) return Promise.reject(ErrorUtils.allianceMemberCountReachMax(playerId, allianceDoc._id))
		if(allianceDoc.basicInfo.status === Consts.AllianceStatus.Fight) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id));
		requestEvent = _.find(allianceDoc.joinRequestEvents, function(event){
			return _.isEqual(event.id, requestEventId)
		})
		if(!_.isObject(requestEvent)) return Promise.reject(ErrorUtils.joinAllianceRequestNotExist(requestEventId, allianceDoc._id))
		return self.cacheService.findPlayerAsync(requestEventId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, requestEventId))
		memberDoc = doc
		if(!_.isEmpty(memberDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, memberDoc._id))
		var hasPendingRequest = _.some(memberDoc.requestToAllianceEvents, function(event){
			return _.isEqual(event.id, allianceDoc._id)
		})
		if(!hasPendingRequest) return Promise.reject(ErrorUtils.playerCancelTheJoinRequestToTheAlliance(memberDoc._id, allianceDoc._id))
		allianceData.push(["joinRequestEvents." + allianceDoc.joinRequestEvents.indexOf(requestEvent), null])
		LogicUtils.removeItemInArray(allianceDoc.joinRequestEvents, requestEvent)

		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(allianceDoc, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		allianceDoc.mapObjects.push(memberMapObject)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, memberDoc, Consts.AllianceTitle.Member, memberMapObject.id, !_.isEmpty(memberDoc.logicServerId))
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, memberDoc.basicInfo.name, [])

		memberDoc.allianceId = allianceDoc._id
		memberData.push(["allianceId", memberDoc.allianceId])
		LogicUtils.clearArray(memberDoc.requestToAllianceEvents)
		memberData.push(["requestToAllianceEvents", memberDoc.requestToAllianceEvents])
		LogicUtils.clearArray(memberDoc.inviteToAllianceEvents)
		memberData.push(["inviteToAllianceEvents", memberDoc.inviteToAllianceEvents])

		if(!_.isEmpty(memberDoc.logicServerId)){
			eventFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, memberDoc])
			eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, memberDoc, {
				allianceId:allianceDoc._id,
				allianceTag:allianceDoc.basicInfo.tag
			}])
			var mapData = self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData;
			var mapIndexData = self.cacheService.getMapIndexs();
			pushFuncs.push([self.pushService, self.pushService.onJoinAllianceSuccessAsync, memberDoc, memberData, allianceDoc, mapData, mapIndexData])
		}
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, memberDoc._id, memberDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, memberDoc._id])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		var allianceName = allianceDoc.basicInfo.name
		allianceDoc = null
		var memberId = memberDoc._id
		memberDoc = null
		var titleKey = DataUtils.getLocalizationConfig("alliance", "RequestApprovedTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "RequestApprovedContent")
		return self.dataService.sendSysMailAsync(memberId, titleKey, [], contentKey, [allianceName])
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
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
	var self = this
	var memberDoc = null
	var memberData = []
	var allianceDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "inviteToJoinAlliance")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "inviteToJoinAlliance"))
		}
		return self.cacheService.findPlayerAsync(memberId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
		memberDoc = doc
		if(_.isString(memberDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, memberId))
		if(LogicUtils.hasInviteEventToAlliance(memberDoc, allianceDoc)){
			updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, memberDoc._id, null])
			return Promise.resolve()
		}else if(memberDoc.inviteToAllianceEvents.length >= Define.InviteJoinAllianceMessageMaxSize){
			return Promise.reject(ErrorUtils.inviteRequestMessageIsFullForThisPlayer(playerId, allianceDoc._id, memberId))
		}else{
			var inviteTime = Date.now()
			var inviteToAllianceEvent = LogicUtils.addPlayerInviteAllianceEvent(playerId, memberDoc, allianceDoc, inviteTime)
			memberData.push(["inviteToAllianceEvents." + memberDoc.inviteToAllianceEvents.indexOf(inviteToAllianceEvent), inviteToAllianceEvent])
			updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, memberDoc._id, memberDoc])
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
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var allianceData = []
	var inviteEvent = null
	var mapData = null
	var mapIndexData = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		inviteEvent = LogicUtils.getInviteToAllianceEvent(playerDoc, allianceId)
		if(!_.isObject(inviteEvent)) return Promise.reject(ErrorUtils.allianceInviteEventNotExist(playerId, allianceId))
		if(agree){
			updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id, playerDoc])
		}else{
			updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
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
			return self.cacheService.findAllianceAsync(allianceId).then(function(doc){
				if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(allianceId))
				allianceDoc = doc
				if(allianceDoc.members.length >= DataUtils.getAllianceMemberMaxCount(allianceDoc)) return Promise.reject(ErrorUtils.allianceMemberCountReachMax(playerId, allianceDoc._id))
				if(allianceDoc.basicInfo.status === Consts.AllianceStatus.Fight) return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceDoc._id));
				return Promise.resolve()
			})
		}else return Promise.resolve()
	}).then(function(){
		playerData.push(["inviteToAllianceEvents." + playerDoc.inviteToAllianceEvents.indexOf(inviteEvent), null])
		LogicUtils.removeItemInArray(playerDoc.inviteToAllianceEvents, inviteEvent)
		if(!agree) return Promise.resolve()
		mapData = self.cacheService.getMapDataAtIndex(allianceDoc.mapIndex).mapData;
		mapIndexData = self.cacheService.getMapIndexs();

		var memberSizeInMap = DataUtils.getSizeInAllianceMap("member")
		var memberRect = LogicUtils.getFreePointInAllianceMap(allianceDoc, memberSizeInMap.width, memberSizeInMap.height)
		var memberMapObject = LogicUtils.createAllianceMapObject("member", memberRect)
		allianceDoc.mapObjects.push(memberMapObject)
		allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(memberMapObject), memberMapObject])
		var memberObject = LogicUtils.addAllianceMember(allianceDoc, playerDoc, Consts.AllianceTitle.Member, memberMapObject.id, true)
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject), memberObject])
		DataUtils.refreshAllianceBasicInfo(allianceDoc, allianceData)
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Normal, Consts.AllianceEventType.Join, playerDoc.basicInfo.name, [])

		playerDoc.allianceId = allianceDoc._id
		playerData.push(["allianceId", playerDoc.allianceId])
		LogicUtils.clearArray(playerDoc.requestToAllianceEvents)
		playerData.push(["requestToAllianceEvents", playerDoc.requestToAllianceEvents])
		LogicUtils.clearArray(playerDoc.inviteToAllianceEvents)
		playerData.push(["inviteToAllianceEvents", playerDoc.inviteToAllianceEvents])

		eventFuncs.push([self.dataService, self.dataService.addPlayerToAllianceChannelAsync, allianceDoc._id, playerDoc])
		eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, {
			allianceId:allianceDoc._id,
			allianceTag:allianceDoc.basicInfo.tag
		}])
		updateFuncs.push([self.cacheService, self.cacheService.flushAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, playerDoc._id])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, [playerData, allianceDoc, mapData, mapIndexData]);
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
	var gemUsed = null
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(_.isEqual(playerObject.title, Consts.AllianceTitle.Archon)) return Promise.reject(ErrorUtils.playerAlreadyTheAllianceArchon(playerId, allianceId))
		gemUsed = DataUtils.getAllianceIntInit("buyArchonGem")
		if(playerDoc.resources.gem < gemUsed) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		archonObject = LogicUtils.getAllianceArchon(allianceDoc)
		var canBuyInterval = 1000 * 60 * 60 * 24 * 7 //7天
		if(archonObject.lastLogoutTime + canBuyInterval > Date.now()){
			return Promise.reject(ErrorUtils.onlyAllianceArchonMoreThanSevenDaysNotOnLinePlayerCanBuyArchonTitle(playerId, allianceDoc._id))
		}
		return self.cacheService.directFindPlayerAsync(archonObject.id)
	}).then(function(doc){
		archonDoc = doc
		playerDoc.resources.gem -= gemUsed
		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"buyAllianceArchon"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		playerData.push(["resources.gem", playerDoc.resources.gem])

		playerObject.title = Consts.AllianceTitle.Archon
		allianceData.push(["members." + allianceDoc.members.indexOf(playerObject) + ".title", playerObject.title])
		archonObject.title = Consts.AllianceTitle.Member
		allianceData.push(["members." + allianceDoc.members.indexOf(archonObject) + ".title", archonObject.title])
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.HandOver, archonObject.name, [playerObject.name]);

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = [];
	var allianceDoc = null
	var allianceData = []
	var playerEvent = null;
	var pushFuncs = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		playerEvent = LogicUtils.getPlayerEventByTypeAndId(playerDoc, eventType, eventId)
		if(!_.isObject(playerEvent)) return Promise.reject(ErrorUtils.playerEventNotExist(playerId, eventType, eventId))
		if(playerEvent.helped) return Promise.reject(ErrorUtils.speedupRequestAlreadySendForThisEvent(playerId, allianceDoc._id, eventType, eventId));
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(_.isObject(helpEvent)) return Promise.reject(ErrorUtils.speedupRequestAlreadySendForThisEvent(playerId, allianceDoc._id, eventType, eventId))
		playerEvent.helped = true;
		playerData.push([eventType + '.' + playerDoc[eventType].indexOf(playerEvent) + '.helped', true]);
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerId, playerDoc]);

		var object = LogicUtils.getPlayerObjectByEvent(playerDoc, eventType, eventId)
		helpEvent = DataUtils.addAllianceHelpEvent(allianceDoc, playerDoc, eventType, eventId, object.name, object.level + 1)
		allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), helpEvent])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, playerDoc._id]);
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, [playerData, allianceData]);
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
}

/**
 * 协助联盟玩家加速
 * @param playerId
 * @param allianceId
 * @param eventId
 * @param callback
 */
pro.helpAllianceMemberSpeedUp = function(playerId, allianceId, eventId, callback){
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		helpEvent = LogicUtils.getEventById(allianceDoc.helpEvents, eventId)
		if(!_.isObject(helpEvent)) return Promise.reject(ErrorUtils.allianceHelpEventNotExist(playerId, eventId))
		if(_.isEqual(playerDoc._id, helpEvent.playerData.id)) return Promise.reject(ErrorUtils.canNotHelpSelfSpeedup(playerId, eventId))
		if(_.contains(helpEvent.eventData.helpedMembers, playerId)) return Promise.reject(ErrorUtils.youAlreadyHelpedTheEvent(playerId, eventId))
		return self.cacheService.findPlayerAsync(helpEvent.playerData.id)
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
			var effect = DataUtils.getPlayerHelpAllianceMemberSpeedUpEffect(playerDoc, memberEvent.finishTime - memberEvent.startTime)
			memberEvent.finishTime = memberEvent.finishTime - effect
			if(helpEvent.eventData.helpedMembers.length >= helpEvent.eventData.maxHelpCount || LogicUtils.willFinished(memberEvent.finishTime)){
				allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent), null])
				LogicUtils.removeItemInArray(allianceDoc.helpEvents, helpEvent)
			}else{
				allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent) + ".eventData.helpedMembers." + helpEvent.eventData.helpedMembers.indexOf(playerDoc._id), playerDoc._id])
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
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, _.isEmpty(playerData) ? null : playerDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, memberDoc._id, _.isEmpty(memberData) ? null : memberDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		if(!_.isEmpty(memberData)){
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		}
		if(!_.isEmpty(playerData)){
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		}
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedExceptMemberIdAsync, allianceDoc, allianceData, playerDoc._id])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback(null, [playerData, allianceData])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		if(_.isObject(memberDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
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
			return self.cacheService.findPlayerAsync(memberId).then(function(doc){
				memberDoc = doc
				for(var i = 0; i < helpEvents.length; i++){
					var helpEvent = helpEvents[i]
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
							allianceData.push(["helpEvents." + allianceDoc.helpEvents.indexOf(helpEvent) + ".eventData.helpedMembers." + helpEvent.eventData.helpedMembers.indexOf(playerDoc._id), playerDoc._id])
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
				return self.cacheService.updatePlayerAsync(memberDoc._id, _.isEmpty(memberData) ? null : memberDoc)
			}).then(function(){
				return Promise.all(eventFuncs)
			}).then(function(){
				return !_.isEmpty(memberData) ? self.pushService.onPlayerDataChangedAsync(memberDoc, memberData) : Promise.resolve()
			}).catch(function(e){
				self.logService.onEvent("logic.allianceApiService2.helpAllAllianceMemberSpeedUp.speedUp", {
					memberId:memberId,
					helpEvents:helpEvents
				}, e.stack)
				if(_.isObject(memberDoc)) return self.cacheService.updatePlayerAsync(memberDoc._id, null)
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
		funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, playerDoc))
		funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, allianceDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onAllianceDataChangedExceptMemberIdAsync(allianceDoc, allianceData, playerDoc._id)
	}).then(function(){
		callback(null, [playerData, allianceData])
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
}