"use strict"

/**
 * Created by modun on 14/12/10.
 */

var Promise = require("bluebird")
var ShortId = require("shortid")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")


var AllianceApiService5 = function(app){
	this.app = app
	this.env = app.get("env")
	this.logService = app.get('logService');
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.dataService = app.get("dataService")
	this.cacheService = app.get('cacheService');
}
module.exports = AllianceApiService5
var pro = AllianceApiService5.prototype

/**
 * 为联盟成员添加荣耀值
 * @param playerId
 * @param allianceId
 * @param memberId
 * @param count
 * @param callback
 */
pro.giveLoyaltyToAllianceMember = function(playerId, allianceId, memberId, count, callback){
	var self = this
	var memberDoc = null
	var memberData = []
	var memberObject = null
	var allianceDoc = null
	var allianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "giveLoyaltyToAllianceMember")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "giveLoyaltyToAllianceMember"))
		}

		if(allianceDoc.basicInfo.honour - count < 0) return Promise.reject(ErrorUtils.allianceHonourNotEnough(playerId, allianceDoc._id))
		memberObject = LogicUtils.getAllianceMemberById(allianceDoc, memberId)
		if(!_.isObject(memberObject)) return Promise.reject(ErrorUtils.allianceDoNotHasThisMember(playerId, allianceDoc._id, memberId))
		return self.cacheService.findPlayerAsync(memberId)
	}).then(function(doc){
		memberDoc = doc
		memberDoc.allianceData.loyalty += count
		memberData.push(["allianceData.loyalty", memberDoc.allianceData.loyalty])

		allianceDoc.basicInfo.honour -= count
		allianceData.push(["basicInfo.honour", allianceDoc.basicInfo.honour])
		memberObject.loyalty = memberDoc.allianceData.loyalty
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".loyalty", memberObject.loyalty])
		memberObject.lastRewardData = {
			count:count,
			time:Date.now()
		}
		allianceData.push(["members." + allianceDoc.members.indexOf(memberObject) + ".lastRewardData", memberObject.lastRewardData])

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, memberDoc._id, memberDoc])
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceDoc._id, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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
		memberDoc = null
		var titleKey = DataUtils.getLocalizationConfig("alliance", "giveLoyaltyToAllianceMemberTitle")
		var contentKey = DataUtils.getLocalizationConfig("alliance", "giveLoyaltyToAllianceMemberContent")
		return self.dataService.sendSysMailAsync(memberId, titleKey, [], contentKey, [allianceName, count])
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
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
 * 获取联盟圣地战历史记录
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getShrineReports = function(playerId, allianceId, callback){
	var allianceDoc = null
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isObject(playerObject)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))

		callback(null, allianceDoc.shrineReports)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取联盟战历史记录
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getAllianceFightReports = function(playerId, allianceId, callback){
	var allianceDoc = null
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isObject(playerObject)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))

		callback(null, allianceDoc.allianceFightReports)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取联盟商店买入卖出记录
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getItemLogs = function(playerId, allianceId, callback){
	var allianceDoc = null
	this.cacheService.directFindAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!_.isObject(playerObject)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))

		callback(null, allianceDoc.itemLogs)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 移动联盟
 * @param playerId
 * @param allianceId
 * @param targetMapIndex
 * @param callback
 */
pro.moveAlliance = function(playerId, allianceId, targetMapIndex, callback){
	var self = this;
	var allianceDoc = null;
	var allianceData = [];
	var playerObject = null;
	var allianceRound = null;
	var targetAllianceRound = null;
	var updateFuncs = [];
	var eventFuncs = [];
	var pushFuncs = [];
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc;
		playerObject = LogicUtils.getAllianceMemberById(allianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "moveAlliance")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, allianceId, "moveAlliance"))
		}
		if(allianceDoc.basicInfo.allianceMoveTime + (DataUtils.getAllianceIntInit('allianceMoveColdMinutes') * 60 * 1000 / 60 / 10) > Date.now()){
			return Promise.reject(ErrorUtils.canNotMoveAllianceRightNow(playerId, allianceId));
		}
		if(!!allianceDoc.allianceFight){
			return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, allianceId));
		}
		targetAllianceRound = LogicUtils.getAllianceMapRound({mapIndex:targetMapIndex});
		if(!DataUtils.isAllianceMoveLegal(allianceDoc, targetAllianceRound)){
			return Promise.reject(ErrorUtils.alliancePalaceLevelTooLowCanNotMoveAlliance(playerId, allianceId));
		}
		if(!!self.cacheService.getMapDataAtIndex(targetMapIndex).allianceData){
			return Promise.reject(ErrorUtils.canNotMoveToTargetMapIndex(playerId, allianceId, targetMapIndex));
		}
		allianceRound = LogicUtils.getAllianceMapRound(allianceDoc);
		self.cacheService.updateMapAlliance(allianceDoc.mapIndex, null, null);
		allianceDoc.mapIndex = targetMapIndex;
		allianceData.push(['mapIndex', allianceDoc.mapIndex]);
		self.cacheService.updateMapAlliance(allianceDoc.mapIndex, allianceDoc, null);

		allianceDoc.basicInfo.allianceMoveTime = Date.now();
		allianceData.push(['basicInfo.allianceMoveTime', allianceDoc.basicInfo.allianceMoveTime]);
		LogicUtils.AddAllianceEvent(allianceDoc, allianceData, Consts.AllianceEventCategory.Important, Consts.AllianceEventType.MoveAlliance, playerObject.name, []);
		updateFuncs.push([self.cacheService, self.cacheService.updateAllianceAsync, allianceId, allianceDoc]);
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData]);
	}).then(function(){
		var membersEvents = {};
		_.each(allianceDoc.members, function(member){
			var strikeMarchEvents = _.filter(allianceDoc.marchEvents.strikeMarchEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var strikeMarchReturnEvents = _.filter(allianceDoc.marchEvents.strikeMarchReturnEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var attackMarchEvents = _.filter(allianceDoc.marchEvents.attackMarchEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var attackMarchReturnEvents = _.filter(allianceDoc.marchEvents.attackMarchReturnEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var villageEvents = _.filter(allianceDoc.villageEvents, function(event){
				return event.playerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			if(strikeMarchEvents.length > 0 || strikeMarchReturnEvents.length > 0 || attackMarchEvents.length > 0 || attackMarchReturnEvents.length > 0 || villageEvents.length > 0){
				membersEvents[member.id] = {
					strikeMarchEvents:strikeMarchEvents,
					strikeMarchReturnEvents:strikeMarchReturnEvents,
					attackMarchEvents:attackMarchEvents,
					attackMarchReturnEvents:attackMarchReturnEvents,
					villageEvents:villageEvents
				}
			}
		})
		var returnMemberTroops = function(memberId, memberEvents){
			var memberDoc = null;
			var memberData = [];
			return self.cacheService.findPlayerAsync(memberId).then(function(doc){
				memberDoc = doc;
				_.each(memberEvents.strikeMarchEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'strikeMarchEvents', marchEvent]);
					allianceData.push(["marchEvents.strikeMarchEvents." + allianceDoc.marchEvents.strikeMarchEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.strikeMarchEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "strikeMarchEvents", marchEvent.id])

					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
				})
				_.each(memberEvents.strikeMarchReturnEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'strikeMarchReturnEvents', marchEvent]);
					allianceData.push(["marchEvents.strikeMarchReturnEvents." + allianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.strikeMarchReturnEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "strikeMarchReturnEvents", marchEvent.id])

					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
				})
				_.each(memberEvents.attackMarchEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'attackMarchEvents', marchEvent]);
					allianceData.push(["marchEvents.attackMarchEvents." + allianceDoc.marchEvents.attackMarchEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.attackMarchEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", marchEvent.id])

					LogicUtils.removePlayerTroopOut(memberDoc, marchEvent.attackPlayerData.dragon.type);
					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
					self.addPlayerSoldiers(memberDoc, memberData, marchEvent.attackPlayerData.soldiers)
				})
				_.each(memberEvents.attackMarchReturnEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'attackMarchReturnEvents', marchEvent]);
					allianceData.push(["marchEvents.attackMarchReturnEvents." + allianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.attackMarchReturnEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchEvent.id])

					LogicUtils.removePlayerTroopOut(memberDoc, marchEvent.attackPlayerData.dragon.type);
					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
					LogicUtils.addPlayerSoldiers(memberDoc, memberData, marchEvent.attackPlayerData.soldiers)
					DataUtils.addPlayerWoundedSoldiers(memberDoc, memberData, marchEvent.attackPlayerData.woundedSoldiers)
					LogicUtils.addPlayerRewards(memberDoc, memberData, marchEvent.attackPlayerData.rewards);
				})
				_.each(memberEvents.villageEvents, function(villageEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, villageEvent]);
					allianceData.push(["villageEvents." + allianceDoc.villageEvents.indexOf(villageEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.villageEvents, villageEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "villageEvents", villageEvent.id])

					LogicUtils.removePlayerTroopOut(memberDoc, villageEvent.playerData.dragon.type);
					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[villageEvent.playerData.dragon.type]);
					memberDoc.dragons[villageEvent.playerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + villageEvent.playerData.dragon.type, memberDoc.dragons[villageEvent.playerData.dragon.type]])

					LogicUtils.addPlayerSoldiers(memberDoc, memberData, villageEvent.playerData.soldiers)
					DataUtils.addPlayerWoundedSoldiers(memberDoc, memberData, villageEvent.playerData.woundedSoldiers)

					var resourceCollected = Math.floor(villageEvent.villageData.collectTotal
						* ((Date.now() - villageEvent.startTime)
						/ (villageEvent.finishTime - villageEvent.startTime))
					)
					var village = LogicUtils.getAllianceVillageById(allianceDoc, villageEvent.villageData.id)
					var originalRewards = villageEvent.playerData.rewards
					var resourceName = village.name.slice(0, -7)
					var newRewards = [{
						type:"resources",
						name:resourceName,
						count:resourceCollected
					}]
					LogicUtils.mergeRewards(originalRewards, newRewards)
					LogicUtils.addPlayerRewards(memberDoc, memberData, originalRewards);

					village.resource -= resourceCollected
					allianceData.push(["villages." + allianceDoc.villages.indexOf(village) + ".resource", village.resource])
					var collectReport = ReportUtils.createCollectVillageReport(allianceDoc, village, newRewards)
					eventFuncs.push([dataService, dataService.sendSysReportAsync, memberDoc._id, collectReport])
				})
				return self.cacheService.updatePlayerAsync(memberDoc._id, memberDoc);
			}).then(function(){
				return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData);
			}).catch(function(e){
				self.logService.onError('cache.allianceApiService5.moveAlliance', {
					memberId:memberId,
					memberEvents:memberEvents
				}, e.stack);
				if(!!memberDoc){
					return self.cacheService.updatePlayerAsync(memberDoc._id, null);
				}
				return Promise.resolve();
			})
		}
		var funcs = [];
		_.each(membersEvents, function(memberEvents, memberId){
			funcs.push(returnMemberTroops(memberId, memberEvents));
		})
		return Promise.all(funcs);
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
		return Promise.resolve();
	}).then(function(){
		var members = allianceDoc.members;
		allianceDoc = null;
		var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceMovedTitle");
		var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceMovedContent");
		var playerIds = [];
		_.each(members, function(member){
			playerIds.push(member.id);
		});

		(function sendMail(){
			if(playerIds.length > 0){
				var playerId = playerIds.pop();
				return self.dataService.sendSysMailAsync(playerId, titleKey, [], contentKey, [allianceRound, targetAllianceRound]).then(function(){
					setImmediate(sendMail);
				}).catch(function(e){
					self.logService.onError("logic.allianceApiService5.moveAlliance.sendMail", {
						playerId:playerId
					}, e.stack)
					setImmediate(sendMail);
				})
			}
		})();
	}).catch(function(e){
		var funcs = []
		if(_.isObject(allianceDoc)){
			funcs.push(self.cacheService.updateAllianceAsync(allianceDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 进入被观察地块
 * @param logicServerId
 * @param playerId
 * @param allianceId
 * @param mapIndex
 * @param callback
 */
pro.enterMapIndex = function(logicServerId, playerId, allianceId, mapIndex, callback){
	var mapIndexData = this.cacheService.getMapDataAtIndex(mapIndex);
	if(!!mapIndexData.allianceData && mapIndexData.allianceData.id === allianceId){
		return callback(ErrorUtils.canNotViewYourOwnAlliance(playerId, allianceId));
	}
	this.cacheService.enterMapIndexChannelAsync(playerId, logicServerId, mapIndex).then(function(data){
		callback(null, [data.allianceData, data.mapData]);
	}).catch(function(e){
		callback(e);
	})
}

/**
 * 玩家离开被观察的地块
 * @param logicServerId
 * @param playerId
 * @param mapIndex
 * @param callback
 */
pro.leaveMapIndex = function(logicServerId, playerId, mapIndex, callback){
	this.cacheService.leaveMapIndexChannelAsync(playerId, logicServerId, mapIndex).then(function(){
		callback();
	}).catch(function(e){
		callback(e);
	})
}

/**
 * 在大地图中获取联盟基础信息
 * @param playerId
 * @param mapIndexs
 * @param callback
 */
pro.getMapAllianceDatas = function(playerId, mapIndexs, callback){
	var self = this;
	var datas = {};
	_.each(mapIndexs, function(mapIndex){
		datas[mapIndex] = self.cacheService.getMapDataAtIndex(mapIndex).allianceData;
	});

	callback(null, datas);
}