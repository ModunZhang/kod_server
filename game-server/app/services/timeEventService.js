"use strict"

/**
 * Created by modun on 14-10-28.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var LogicUtils = require("../utils/logicUtils")
var DataUtils = require("../utils/dataUtils")
var Consts = require("../consts/consts")


var TimeEventService = function(app){
	this.app = app
	this.eventServerId = app.get("eventServerId")
	this.isEventServer = _.isEqual(this.eventServerId, app.getServerId())
	this.logService = app.get("logService")
	this.timeouts = {}
}
module.exports = TimeEventService
var pro = TimeEventService.prototype

function setLongTimeout(callback, ms){
	if(typeof callback !== 'function')
		throw new Error('callback must be a function');
	ms = parseInt(ms);
	if(Number.isNaN(ms))
		throw new Error('delay must be an integer');

	var args = Array.prototype.slice.call(arguments, 2);
	var cb = callback.bind.apply(callback, [this].concat(args));

	var longTimeout = {
		timer:null,
		clear:function(){
			if(this.timer)
				clearTimeout(this.timer);
		}
	};

	var max = 2147483647;
	if(ms <= max)
		longTimeout.timer = setTimeout(cb, ms);
	else{
		var count = Math.floor(ms / max); // the number of times we need to delay by max
		var rem = ms % max; // the length of the final delay
		(function delay(){
			if(count > 0){
				count--;
				longTimeout.timer = setTimeout(delay, max);
			}else{
				longTimeout.timer = setTimeout(cb, rem);
			}
		})();
	}
	return longTimeout;
}

function clearLongTimeout(longTimeoutObject){
	if(longTimeoutObject &&
		typeof longTimeoutObject.clear === 'function')
		longTimeoutObject.clear()
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
	if(this.isEventServer){
		this.logService.onEvent("event.timeEventService.addTimeEvent", {
			key:key,
			eventType:eventType,
			eventId:eventId,
			timeInterval:timeInterval
		})
		var timeout = setLongTimeout(this.triggerTimeEvent.bind(this), timeInterval, key, eventType, eventId)
		var timeouts = this.timeouts[key]
		if(_.isEmpty(timeouts)){
			timeouts = {}
			this.timeouts[key] = timeouts
		}
		timeouts[eventId] = timeout
		callback()
	}else{
		this.app.rpc.event.eventRemote.addTimeEvent.toServer(this.eventServerId, key, eventType, eventId, timeInterval, callback)
	}
}

/**
 * 移除时间回调
 * @param key
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.removeTimeEvent = function(key, eventType, eventId, callback){
	if(this.isEventServer){
		this.logService.onEvent("event.timeEventService.removeTimeEvent", {key:key, eventType:eventType, eventId:eventId})
		var timeouts = this.timeouts[key]
		var timeout = timeouts[eventId]
		clearLongTimeout(timeout)
		delete timeouts[eventId]
		if(_.isEmpty(timeouts)){
			delete this.timeouts[key]
		}
		callback()
	}else{
		this.app.rpc.event.eventRemote.removeTimeEvent.toServer(this.eventServerId, key, eventType, eventId, callback)
	}
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
	if(this.isEventServer){
		this.logService.onEvent("event.timeEventService.updateTimeEvent", {
			key:key,
			eventType:eventType,
			eventId:eventId,
			timeInterval:timeInterval
		})
		var timeouts = this.timeouts[key]
		var timeout = timeouts[eventId]
		clearLongTimeout(timeout)

		timeout = setLongTimeout(this.triggerTimeEvent.bind(this), timeInterval, key, eventType, eventId)
		timeouts[eventId] = timeout
		callback()
	}else{
		this.app.rpc.event.eventRemote.updateTimeEvent.toServer(this.eventServerId, key, eventType, eventId, timeInterval, callback)
	}
}

/**
 * 清除指定Key所有的时间回调
 * @param key
 * @param callback
 */
pro.clearTimeEventsByKey = function(key, callback){
	if(this.isEventServer){
		this.logService.onEvent("event.timeEventService.clearTimeEventsByKey", {key:key})
		var timeouts = this.timeouts[key]
		_.each(timeouts, function(timeout){
			clearLongTimeout(timeout)
		})
		delete this.timeouts[key]
		callback()
	}else{
		this.app.rpc.event.eventRemote.clearTimeEventsByKey.toServer(this.eventServerId, key, callback)
	}
}

/**
 * 触发事件回调
 * @param key
 * @param eventType
 * @param eventId
 */
pro.triggerTimeEvent = function(key, eventType, eventId){
	var self = this
	this.logService.onEvent("event.timeEventService.triggerTimeEvent", {key:key, eventType:eventType, eventId:eventId})
	var timeouts = this.timeouts[key]
	delete timeouts[eventId]
	if(_.isEmpty(timeouts)){
		delete this.timeouts[key]
	}
	this.excuteTimeEventAsync(key, eventType, eventId).then(function(){
		self.logService.onEvent("event.timeEventService.triggerTimeEvent finished", {
			key:key,
			eventType:eventType,
			eventId:eventId
		})
	}).catch(function(e){
		self.logService.onEventError("event.timeEventService.triggerTimeEvent finished with error", {
			key:key,
			eventType:eventType,
			eventId:eventId
		}, e.stack)
	})
}

/**
 * 执行事件回调
 * @param key
 * @param eventType
 * @param eventId
 * @param callback
 */
pro.excuteTimeEvent = function(key, eventType, eventId, callback){
	var params = key.split(":")
	var targetType = params[0]
	var id = params[1]
	if(_.isEqual(Consts.TimeEventType.Player, targetType)){
		this.app.get("playerTimeEventService").onTimeEvent(id, eventType, eventId, callback)
	}else if(_.isEqual(Consts.TimeEventType.Alliance, targetType)){
		this.app.get("allianceTimeEventService").onTimeEvent(id, eventType, eventId, callback)
	}else if(_.isEqual(Consts.TimeEventType.AllianceFight, targetType)){
		var ids = eventId.split(":")
		this.app.get("allianceTimeEventService").onFightTimeEvent(ids[0], ids[1], callback)
	}else{
		callback(new Error("未知的事件类型"))
	}
}


/**
 * 添加玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 * @returns {*}
 */
pro.addPlayerTimeEvent = function(playerDoc, eventType, eventId, timeInterval, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.addTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 移除玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removePlayerTimeEvent = function(playerDoc, eventType, eventId, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.removeTimeEvent(key, eventType, eventId, callback)
}

/**
 * 更新玩家时间回调
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 * @returns {*}
 */
pro.updatePlayerTimeEvent = function(playerDoc, eventType, eventId, timeInterval, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.updateTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param playerDoc
 * @param callback
 * @returns {*}
 */
pro.clearPlayerTimeEvents = function(playerDoc, callback){
	var key = Consts.TimeEventType.Player + ":" + playerDoc._id
	this.clearTimeEventsByKey(key, callback)
}

/**
 * 添加联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 * @returns {*}
 */
pro.addAllianceTimeEvent = function(allianceDoc, eventType, eventId, timeInterval, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.addTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 移除联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param callback
 * @returns {*}
 */
pro.removeAllianceTimeEvent = function(allianceDoc, eventType, eventId, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.removeTimeEvent(key, eventType, eventId, callback)
}

/**
 * 更新联盟时间回调
 * @param allianceDoc
 * @param eventType
 * @param eventId
 * @param timeInterval
 * @param callback
 * @returns {*}
 */
pro.updateAllianceTimeEvent = function(allianceDoc, eventType, eventId, timeInterval, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.updateTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 清除指定玩家的全部时间回调
 * @param allianceDoc
 * @param callback
 * @returns {*}
 */
pro.clearAllianceTimeEvents = function(allianceDoc, callback){
	var key = Consts.TimeEventType.Alliance + ":" + allianceDoc._id
	this.clearTimeEventsByKey(key, callback)
}

/**
 * 添加联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param timeInterval
 * @param callback
 */
pro.addAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, timeInterval, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.addTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 更新联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param timeInterval
 * @param callback
 */
pro.updateAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, timeInterval, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.updateTimeEvent(key, eventType, eventId, timeInterval, callback)
}

/**
 * 移除联盟战斗时间回调
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param callback
 */
pro.removeAllianceFightTimeEvent = function(attackAllianceDoc, defenceAllianceDoc, callback){
	var key = Consts.TimeEventType.AllianceFight
	var eventType = Consts.TimeEventType.AllianceFight
	var eventId = attackAllianceDoc._id + ":" + defenceAllianceDoc._id
	this.removeTimeEvent(key, eventType, eventId, callback)
}


/**
 * 恢复玩家事件
 * @param playerDoc
 * @param callback
 */
pro.restorePlayerTimeEvents = function(playerDoc, callback){
	var self = this
	var playerTimeEventService = this.app.get("playerTimeEventService")
	var now = Date.now()
	var funcs = []
	_.each(playerDoc.buildingEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "buildingEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "buildingEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.houseEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "houseEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "houseEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.materialEvents, function(event){
		if(event.finishTime > 0){
			if(LogicUtils.willFinished(event.finishTime)){
				playerTimeEventService.onPlayerEvent(playerDoc, [], "materialEvents", event.id)
			}else{
				funcs.push(self.addPlayerTimeEventAsync(playerDoc, "materialEvents", event.id, event.finishTime - now))
			}
		}
	})
	_.each(playerDoc.soldierEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "soldierEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "soldierEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.dragonEquipmentEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "dragonEquipmentEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "dragonEquipmentEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.treatSoldierEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "treatSoldierEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "treatSoldierEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.dragonHatchEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "dragonHatchEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "dragonHatchEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.dragonDeathEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "dragonDeathEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "dragonDeathEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.productionTechEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "productionTechEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "productionTechEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.militaryTechEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "militaryTechEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "militaryTechEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.soldierStarEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "soldierStarEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "soldierStarEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.vipEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "vipEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "vipEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.itemEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "itemEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "itemEvents", event.id, event.finishTime - now))
		}
	})
	_.each(playerDoc.dailyQuestEvents, function(event){
		if(LogicUtils.willFinished(event.finishTime)){
			playerTimeEventService.onPlayerEvent(playerDoc, [], "dailyQuestEvents", event.id)
		}else{
			funcs.push(self.addPlayerTimeEventAsync(playerDoc, "dailyQuestEvents", event.id, event.finishTime - now))
		}
	})
	DataUtils.refreshPlayerPower(playerDoc, [])

	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 恢复联盟事件
 * @param allianceDoc
 * @param timeAdd
 * @param callback
 */
pro.restoreAllianceTimeEvents = function(allianceDoc, timeAdd, callback){
	var self = this
	var now = Date.now()
	var funcs = []
	if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
		allianceDoc.basicInfo.statusStartTime += timeAdd
		allianceDoc.basicInfo.statusFinishTime += timeAdd
		funcs.push(self.addAllianceTimeEventAsync(allianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent, allianceDoc.basicInfo.statusFinishTime - now))
	}else if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
		allianceDoc.basicInfo.statusStartTime += timeAdd
		allianceDoc.basicInfo.statusFinishTime += timeAdd
		if(_.isEqual(allianceDoc.allianceFight.attackAllianceId, allianceDoc._id)){
			var thekey = Consts.TimeEventType.AllianceFight
			var theEventType = Consts.TimeEventType.AllianceFight
			var theEventId = allianceDoc.allianceFight.attackAllianceId + ":" + allianceDoc.allianceFight.defenceAllianceId
			funcs.push(self.addTimeEventAsync(thekey, theEventType, theEventId, allianceDoc.basicInfo.statusFinishTime - now))
		}
	}else if(_.isEqual(allianceDoc.basicInfo.status, Consts.AllianceStatus.Peace)){
		allianceDoc.basicInfo.statusStartTime += timeAdd
	}

	_.each(allianceDoc.shrineEvents, function(event){
		event.createTime += timeAdd
		event.startTime += timeAdd
		funcs.push(self.addAllianceTimeEventAsync(allianceDoc, "shrineEvents", event.id, event.startTime - now))
	})
	_.each(allianceDoc.villageEvents, function(event){
		event.startTime += timeAdd
		event.finishTime += timeAdd
		funcs.push(self.addAllianceTimeEventAsync(allianceDoc, "villageEvents", event.id, event.finishTime - now))
	})
	_.each(allianceDoc.villageCreateEvents, function(event){
		funcs.push(self.addAllianceTimeEventAsync(allianceDoc, "villageCreateEvents", event.id, event.finishTime - now))
	})
	_.each(allianceDoc.strikeMarchEvents, function(event){
		event.startTime += timeAdd
		event.arriveTime += timeAdd
		funcs.push(self.addAllianceTimeEventAsync(allianceDoc, "strikeMarchEvents", event.id, event.arriveTime - now))
	})
	_.each(allianceDoc.strikeMarchReturnEvents, function(event){
		event.startTime += timeAdd
		event.arriveTime += timeAdd
		funcs.push(self.addAllianceTimeEventAsync, allianceDoc("strikeMarchReturnEvents", event.id, event.arriveTime - now))
	})
	_.each(allianceDoc.attackMarchEvents, function(event){
		event.startTime += timeAdd
		event.arriveTime += timeAdd
		funcs.push(self.addAllianceTimeEventAsync(allianceDoc, "attackMarchEvents", event.id, event.arriveTime - now))
	})
	_.each(allianceDoc.attackMarchReturnEvents, function(event){
		event.startTime += timeAdd
		event.arriveTime += timeAdd
		funcs.push(self.addAllianceTimeEventAsync(allianceDoc, "attackMarchReturnEvents", event.id, event.arriveTime - now))
	})
	Promise.all(funcs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}