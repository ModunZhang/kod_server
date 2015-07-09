"use strict"

/**
 * Created by modun on 14-8-6.
 */

var ShortId = require("shortid")
var _ = require("underscore")
var sprintf = require("sprintf")
var Promise = require("bluebird")

var ReportUtils = require("./reportUtils")
var DataUtils = require("./dataUtils")
var MapUtils = require("./mapUtils")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var Utils = module.exports


/**
 * 获取Buff加成效果
 * @param time
 * @param decreasePercent
 * @returns {number}
 */
Utils.getTimeEfffect = function(time, decreasePercent){
	return Math.floor(time / (1 + decreasePercent))
}

/**
 * 检查是否足够
 * @param need
 * @param has
 */
Utils.isEnough = function(need, has){
	return _.every(need, function(value, key){
		return _.isNumber(has[key]) && has[key] >= need[key]
	})
}

/**
 * 从Array中移除Item
 * @param array
 * @param item
 */
Utils.removeItemInArray = function(array, item){
	var index = array.indexOf(item)
	if(index >= 0){
		array.splice(index, 1)
	}
}

/**
 * 清空Array
 * @param array
 */
Utils.clearArray = function(array){
	array.length = 0;
}

/**
 * 清空Object
 * @param object
 */
Utils.clearObject = function(object){
	_.each(object, function(value, key){
		delete object[key]
	})
}

/**
 * 减少相应数值
 * @param need
 * @param has
 */
Utils.reduce = function(need, has){
	_.each(need, function(value, key){
		if(_.isNumber(has[key])){
			has[key] -= value
		}else{
			has[key] = -value
		}
	})
}

/**
 * 增加相应数量
 * @param willAdd
 * @param has
 */
Utils.increace = function(willAdd, has){
	_.each(willAdd, function(value, key){
		if(_.isNumber(has[key])){
			has[key] += value
		}else{
			has[key] = value
		}
	})
}

/**
 * 一次执行所有函数
 * @param functionObjects
 * @returns {*}
 */
Utils.excuteAll = function(functionObjects){
	var funcs = []
	_.each(functionObjects, function(functionObj){
		var caller = functionObj[0]
		var func = functionObj[1]
		funcs.push(func.apply(caller, Array.prototype.slice.call(functionObj, 2)))
	})
	return Promise.all(funcs)
}

/**
 * 检测是否有建筑和箭塔需要从-1级升级到0级
 * @param playerDoc
 */
Utils.updateBuildingsLevel = function(playerDoc){
	var buildings = playerDoc.buildings
	for(var i = 1; i <= _.size(buildings); i++){
		var building = buildings["location_" + i]
		if(building.level == -1){
			for(var j = i - 1; j >= 1; j--){
				var preBuilding = buildings["location_" + j]
				if(preBuilding.level <= 0){
					return false
				}
			}

			var round = this.getBuildingCurrentRound(i)
			var fromToEnd = this.getBuildingRoundFromAndEnd(round)
			for(var k = fromToEnd.from; k < fromToEnd.to; k++){
				var theBuilding = buildings["location_" + k]
				if(_.isObject(theBuilding) && theBuilding.level < 0){
					buildings["location_" + k].level = 0
				}
			}
			return true
		}
	}
	return false
}

/**
 * 检查建筑创建时坑位是否合法
 * @param playerDoc
 * @param location
 * @returns {boolean}
 */
Utils.isBuildingCanCreateAtLocation = function(playerDoc, location){
	var currentRound = this.getBuildingCurrentRound(location)
	var previousRoundFromAndTo = this.getBuildingRoundFromAndEnd(currentRound - 1);
	for(var i = previousRoundFromAndTo.from; i < previousRoundFromAndTo.to; i ++){
		var building = playerDoc.buildings['location_' + i];
		if(building.level < 0) return false
	}
	var middleLocation = this.getBuildingRoundMiddleLocation(currentRound)
	if(middleLocation == location){
		var previousBuilding = playerDoc.buildings['location_' + (middleLocation - 1)]
		var nextBuilding = playerDoc.buildings['location_' + (middleLocation + 1)]
		if(previousBuilding.level == 0 && nextBuilding.level == 0) return false
	}
	return true
}

/**
 * 小屋是否能在指定位置创建
 * @param playerDoc
 * @param buildingLocation
 * @param houseType
 * @param houseLocation
 * @returns {boolean}
 */
Utils.isHouseCanCreateAtLocation = function(playerDoc, buildingLocation, houseType, houseLocation){
	var conditions = {
		location_1:{
			widthMax:2,
			heightMax:1
		},
		location_2:{
			widthMax:1,
			heightMax:1
		},
		location_3:{
			widthMax:1,
			heightMax:1
		}
	}

	var building = playerDoc.buildings["location_" + buildingLocation]
	var houses = building.houses
	var willBeSize = DataUtils.getHouseSize(houseType)
	var condition = conditions["location_" + houseLocation]
	if(willBeSize.width > condition.widthMax) return false
	if(willBeSize.height > condition.heightMax) return false
	var wantUse = [houseLocation]
	if(willBeSize.width > 1 || willBeSize.height > 1){
		wantUse.push(houseLocation + 1)
	}

	var alreadyUsed = []
	_.each(houses, function(house){
		var houseSize = DataUtils.getHouseSize(house.type)
		alreadyUsed.push(house.location)
		if(houseSize.width > 1 || houseSize.height > 1){
			wantUse.push(house.location + 1)
		}
	})

	return _.intersection(wantUse, alreadyUsed).length == 0
}

/**
 * 获取当前坐标的上一个坐标
 * @param currentLocation
 * @returns {*}
 */
Utils.getPreviousBuildingLocation = function(currentLocation){
	var round = this.getBuildingCurrentRound(currentLocation)
	var previousRound = this.getBuildingCurrentRound(currentLocation - 1)
	if(_.isEqual(round, previousRound)) return currentLocation - 1
	return null
}

/**
 * 获取当前坐标的下一个坐标
 * @param currentLocation
 * @returns {*}
 */
Utils.getNextBuildingLocation = function(currentLocation){
	var round = this.getBuildingCurrentRound(currentLocation)
	var previousRound = this.getBuildingCurrentRound(currentLocation + 1)
	if(_.isEqual(round, previousRound)) return currentLocation + 1
	return null
}

/**
 * 获取当前坐标的前一个坐标
 * @param currentLocation
 * @returns {*}
 */
Utils.getFrontBuildingLocation = function(currentLocation){
	var round = this.getBuildingCurrentRound(currentLocation)
	var middle = Math.floor(this.getBuildingRoundMiddleLocation(round))

	if(currentLocation == middle) return null
	if(currentLocation < middle){
		return currentLocation - ((round - 1) * 2) + 1
	}else if(currentLocation > middle){
		return currentLocation - ((round - 1) * 2) - 1
	}
	return null
}

/**
 *
 * @param currentLocation
 * @returns {*}
 */
Utils.getBuildingCurrentRound = function(currentLocation){
	var nextFrom = 1
	for(var i = 1; i <= 5; i++){
		var from = nextFrom
		var to = from + (i - 1) * 2 + 1
		nextFrom = to
		if(currentLocation >= from && currentLocation < to){
			return i
		}
	}

	return null
}

/**
 * 根据当前建筑坐标获取当前坐标所属圈数的起点坐标和结束坐标
 * @param currentRound
 * @returns {{from: *, to: *}}
 */
Utils.getBuildingRoundFromAndEnd = function(currentRound){
	var from = null
	var to = null
	var nextFrom = 1
	for(var i = 1; i <= currentRound; i++){
		from = nextFrom
		to = from + (i - 1) * 2 + 1
		nextFrom = to
	}

	return {from:from, to:to}
}

/**
 * 根据当前建筑坐标获取当前圈数的中间坐标
 * @param currentRound
 * @returns {*}
 */
Utils.getBuildingRoundMiddleLocation = function(currentRound){
	var fromAndTo = this.getBuildingRoundFromAndEnd(currentRound)
	var middle = fromAndTo.from + ((fromAndTo.to - fromAndTo.from) / 2)
	return middle
}

/**
 * 是否有指定坑位的建筑建造事件
 * @param playerDoc
 * @param buildingLocation
 * @returns {boolean}
 */
Utils.hasBuildingEvents = function(playerDoc, buildingLocation){
	return _.some(playerDoc.buildingEvents, function(event){
		return _.isEqual(buildingLocation, event.location)
	})
}

/**
 * 是否有指定坑位的小屋建造事件
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 * @returns {boolean}
 */
Utils.hasHouseEvents = function(playerDoc, buildingLocation, houseLocation){
	return _.some(playerDoc.houseEvents, function(event){
		return _.isEqual(event.buildingLocation, buildingLocation) && _.isEqual(event.houseLocation, houseLocation)
	})
}

/**
 * 创建建筑建造事件
 * @param playerDoc
 * @param location
 * @param finishTime
 * @returns {{location: *, finishTime: *}}
 */
Utils.createBuildingEvent = function(playerDoc, location, finishTime){
	var event = {
		id:ShortId.generate(),
		location:location,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建生产科技升级事件
 * @param playerDoc
 * @param techName
 * @param finishTime
 * @returns {{id: *, name: *, startTime: number, finishTime: *}}
 */
Utils.createProductionTechEvent = function(playerDoc, techName, finishTime){
	var event = {
		id:ShortId.generate(),
		name:techName,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建军事科技升级事件
 * @param playerDoc
 * @param techName
 * @param finishTime
 * @returns {{id: *, name: *, startTime: number, finishTime: *}}
 */
Utils.createMilitaryTechEvent = function(playerDoc, techName, finishTime){
	var event = {
		id:ShortId.generate(),
		name:techName,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建士兵升级事件
 * @param playerDoc
 * @param soldierName
 * @param finishTime
 * @returns {{id: *, name: *, startTime: number, finishTime: *}}
 */
Utils.createSoldierStarEvent = function(playerDoc, soldierName, finishTime){
	var event = {
		id:ShortId.generate(),
		name:soldierName,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建小屋建造事件
 * @param playerDoc
 * @param buildingLocation
 * @param houseLocation
 * @param finishTime
 * @returns {{buildingLocation: *, houseLocation: *, finishTime: *}}
 */
Utils.createHouseEvent = function(playerDoc, buildingLocation, houseLocation, finishTime){
	var event = {
		id:ShortId.generate(),
		buildingLocation:buildingLocation,
		houseLocation:houseLocation,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建防御塔建造事件
 * @param playerDoc
 * @param finishTime
 * @returns {{id: *, startTime: number, finishTime: *}}
 */
Utils.createTowerEvent = function(playerDoc, finishTime){
	var event = {
		id:ShortId.generate(),
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建城墙事件
 * @param playerDoc
 * @param finishTime
 * @returns {{finishTime: *}}
 */
Utils.createWallEvent = function(playerDoc, finishTime){
	var event = {
		id:ShortId.generate(),
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建士兵招募事件
 * @param playerDoc
 * @param soldierName
 * @param count
 * @param finishTime
 * @returns {{name: *, count: *, finishTime: *}}
 */
Utils.createSoldierEvent = function(playerDoc, soldierName, count, finishTime){
	var event = {
		id:ShortId.generate(),
		name:soldierName,
		count:count,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建龙装备制造事件
 * @param playerDoc
 * @param equipmentName
 * @param finishTime
 * @returns {{name: *, finishTime: *}}
 */
Utils.createDragonEquipmentEvent = function(playerDoc, equipmentName, finishTime){
	var event = {
		id:ShortId.generate(),
		name:equipmentName,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 创建士兵治疗事件
 * @param playerDoc
 * @param soldiers
 * @param finishTime
 * @returns {{soldiers: *, finishTime: *}}
 */
Utils.createTreatSoldierEvent = function(playerDoc, soldiers, finishTime){
	var event = {
		id:ShortId.generate(),
		soldiers:soldiers,
		startTime:Date.now(),
		finishTime:finishTime
	}
	return event
}

/**
 * 根据建筑建造事件查找建筑
 * @param playerDoc
 * @param buildingEvent
 * @returns {*}
 */
Utils.getBuildingByEvent = function(playerDoc, buildingEvent){
	return playerDoc.buildings["location_" + buildingEvent.location]
}

/**
 * 根据小屋建造事件查找小屋
 * @param playerDoc
 * @param houseEvent
 * @returns {*}
 */
Utils.getHouseByEvent = function(playerDoc, houseEvent){
	var building = playerDoc.buildings["location_" + houseEvent.buildingLocation]
	return _.find(building.houses, function(house){
		return _.isEqual(house.location, houseEvent.houseLocation)
	})
}

/**
 * 移除数组中指定的元素
 * @param array
 * @param items
 */
Utils.removeItemsInArray = function(array, items){
	for(var i = 0; i < items.length; i++){
		for(var j = 0; j < array.length; j++){
			if(_.isEqual(array[j], items[i])){
				array.splice(j, 1)
				break
			}
		}
	}
}

/**
 * 检查需要治疗的伤兵数据是否合法
 * @param playerDoc
 * @param soldiers
 * @returns {boolean}
 */
Utils.isTreatSoldierLegal = function(playerDoc, soldiers){
	if(soldiers.length == 0) return false
	return _.every(soldiers, function(soldier){
		var name = soldier.name
		var count = soldier.count
		if(!_.isString(name) || !_.isNumber(count)) return false
		count = Math.floor(count)
		if(count <= 0) return false
		return _.isNumber(playerDoc.woundedSoldiers[name]) && playerDoc.woundedSoldiers[name] >= count
	})
}

/**
 * 检查强化龙装备是否合法
 * @param playerDoc
 * @param equipments
 * @returns {boolean}
 */
Utils.isEnhanceDragonEquipmentLegal = function(playerDoc, equipments){
	if(equipments.length == 0) return false
	return _.every(equipments, function(equipment){
		var equipmentName = equipment.name
		var count = equipment.count
		if(!_.isString(equipmentName) || !_.isNumber(count)) return false
		count = Math.floor(count)
		if(count <= 0) return false
		return _.isNumber(playerDoc.dragonEquipments[equipmentName]) && playerDoc.dragonEquipments[equipmentName] >= count
	})
}

/**
 * 更新玩家在联盟的属性
 * @param playerDoc
 * @param online
 * @param allianceDoc
 * @param allianceData
 * @returns {*}
 */
Utils.updatePlayerPropertyInAlliance = function(playerDoc, online, allianceDoc, allianceData){
	var member = _.find(allianceDoc.members, function(member){
		return _.isEqual(member.id, playerDoc._id)
	})
	var memberIndex = allianceDoc.members.indexOf(member)
	member.online = online
	allianceData.push(["members." + memberIndex + ".online", member.online])
	if(!_.isEqual(member.apnId, playerDoc.apnId)){
		member.apnId = playerDoc.apnId
		allianceData.push(["members." + memberIndex + ".apnId", member.apnId])
	}
	if(!_.isEqual(member.language, playerDoc.basicInfo.language)){
		member.language = playerDoc.basicInfo.language
		allianceData.push(["members." + memberIndex + ".language", member.language])
	}
	if(!_.isEqual(member.name, playerDoc.basicInfo.name)){
		member.name = playerDoc.basicInfo.name
		allianceData.push(["members." + memberIndex + ".name", member.name])
	}
	if(!_.isEqual(member.icon, playerDoc.basicInfo.icon)){
		member.icon = playerDoc.basicInfo.icon
		allianceData.push(["members." + memberIndex + ".icon", member.icon])
	}
	if(!_.isEqual(member.terrain, playerDoc.basicInfo.terrain)){
		member.terrain = playerDoc.basicInfo.terrain
		allianceData.push(["members." + memberIndex + ".terrain", member.terrain])
	}
	if(!_.isEqual(member.levelExp, playerDoc.basicInfo.levelExp)){
		member.levelExp = playerDoc.basicInfo.levelExp
		allianceData.push(["members." + memberIndex + ".levelExp", member.levelExp])
	}
	if(!_.isEqual(member.power, playerDoc.basicInfo.power)){
		member.power = playerDoc.basicInfo.power
		allianceData.push(["members." + memberIndex + ".power", member.power])
	}
	if(!_.isEqual(member.kill, playerDoc.basicInfo.kill)){
		member.kill = playerDoc.basicInfo.kill
		allianceData.push(["members." + memberIndex + ".kill", member.kill])
	}
	if(!_.isEqual(member.lastLoginTime, playerDoc.countInfo.lastLoginTime)){
		member.lastLoginTime = playerDoc.countInfo.lastLoginTime
		allianceData.push(["members." + memberIndex + ".lastLoginTime", member.lastLoginTime])
	}
	if(!_.isEqual(member.keepLevel, playerDoc.buildings.location_1.level)){
		member.keepLevel = playerDoc.buildings.location_1.level
		allianceData.push(["members." + memberIndex + ".keepLevel", member.keepLevel])
	}
	if(!_.isEqual(member.loyalty, playerDoc.allianceInfo.loyalty)){
		member.loyalty = playerDoc.allianceInfo.loyalty
		allianceData.push(["members." + memberIndex + ".loyalty", member.loyalty])
	}
	if(!_.isEqual(member.allianceExp.woodExp, playerDoc.allianceInfo.woodExp)){
		member.allianceExp.woodExp = playerDoc.allianceInfo.woodExp
		allianceData.push(["members." + memberIndex + ".allianceExp.woodExp", member.allianceExp.woodExp])
	}
	if(!_.isEqual(member.allianceExp.stoneExp, playerDoc.allianceInfo.stoneExp)){
		member.allianceExp.stoneExp = playerDoc.allianceInfo.stoneExp
		allianceData.push(["members." + memberIndex + ".allianceExp.stoneExp", member.allianceExp.stoneExp])
	}
	if(!_.isEqual(member.allianceExp.ironExp, playerDoc.allianceInfo.ironExp)){
		member.allianceExp.ironExp = playerDoc.allianceInfo.ironExp
		allianceData.push(["members." + memberIndex + ".allianceExp.ironExp", member.allianceExp.ironExp])
	}
	if(!_.isEqual(member.allianceExp.foodExp, playerDoc.allianceInfo.foodExp)){
		member.allianceExp.foodExp = playerDoc.allianceInfo.foodExp
		allianceData.push(["members." + memberIndex + ".allianceExp.foodExp", member.allianceExp.foodExp])
	}
	if(!_.isEqual(member.allianceExp.coinExp, playerDoc.allianceInfo.coinExp)){
		member.allianceExp.coinExp = playerDoc.allianceInfo.coinExp
		allianceData.push(["members." + memberIndex + ".allianceExp.coinExp", member.allianceExp.coinExp])
	}
}

/**
 * 刷新联盟感知力
 * @param allianceDoc
 */
Utils.refreshAlliancePerception = function(allianceDoc){
	allianceDoc.basicInfo.perception = DataUtils.getAlliancePerception(allianceDoc)
	allianceDoc.basicInfo.perceptionRefreshTime = Date.now()
}

/**
 * 联盟是否存在此玩家
 * @param allianceDoc
 * @param playerId
 * @returns {boolean}
 */
Utils.isAllianceHasMember = function(allianceDoc, playerId){
	return _.some(allianceDoc.members, function(member){
		return _.isEqual(member.id, playerId)
	})
}

/**
 * 根据玩家Id获取联盟成员数据
 * @param allianceDoc
 * @param memberId
 */
Utils.getAllianceMemberById = function(allianceDoc, memberId){
	return _.find(allianceDoc.members, function(member){
		return _.isEqual(member.id, memberId)
	})
}

/**
 * 获取联盟地图对象
 * @param allianceDoc
 * @param memberId
 * @returns {*}
 */
Utils.getAllianceMemberMapObjectById = function(allianceDoc, memberId){
	var memberObject = _.find(allianceDoc.members, function(member){
		return _.isEqual(member.id, memberId)
	})
	return _.find(allianceDoc.mapObjects, function(mapObject){
		return _.isEqual(mapObject.id, memberObject.mapId)
	})
}

/**
 * 根据村落ID查找村落
 * @param allianceDoc
 * @param villageId
 * @returns {*}
 */
Utils.getAllianceVillageById = function(allianceDoc, villageId){
	return _.find(allianceDoc.villages, function(village){
		return _.isEqual(village.id, villageId)
	})
}

/**
 * 是否有对某联盟的有效申请存在
 * @param playerDoc
 * @param allianceId
 * @returns {boolean}
 */
Utils.hasPendingRequestEventToAlliance = function(playerDoc, allianceId){
	var has = false
	_.each(playerDoc.requestToAllianceEvents, function(event){
		if(_.isEqual(event.id, allianceId)){
			has = true
		}
	})
	return has
}

/**
 * 获取针对某个联盟的申请信息
 * @param playerDoc
 * @param allianceId
 * @returns {*}
 */
Utils.getRequestToAllianceEvent = function(playerDoc, allianceId){
	var theEvent = null
	_.each(playerDoc.requestToAllianceEvents, function(event){
		if(_.isEqual(event.id, allianceId)){
			theEvent = event
		}
	})
	return theEvent
}

/**
 * 获取联盟邀请事件
 * @param playerDoc
 * @param allianceId
 * @returns {*}
 */
Utils.getInviteToAllianceEvent = function(playerDoc, allianceId){
	var theEvent = null
	_.each(playerDoc.inviteToAllianceEvents, function(event){
		if(_.isEqual(event.id, allianceId)){
			theEvent = event
		}
	})
	return theEvent
}

/**
 * 获取联盟中某人的申请信息
 * @param allianceDoc
 * @param playerId
 * @returns {*}
 */
Utils.getPlayerRequestEventAtAlliance = function(allianceDoc, playerId){
	var theEvent = null
	_.each(allianceDoc.joinRequestEvents, function(event){
		if(_.isEqual(event.id, playerId)){
			theEvent = event
		}
	})
	return theEvent
}

/**
 * 添加联盟申请事件
 * @param allianceDoc
 * @param playerDoc
 * @param requestTime
 * @return {*}
 */
Utils.addAllianceRequestEvent = function(allianceDoc, playerDoc, requestTime){
	var event = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		icon:playerDoc.basicInfo.icon,
		levelExp:playerDoc.basicInfo.levelExp,
		power:playerDoc.basicInfo.power,
		requestTime:requestTime
	}
	allianceDoc.joinRequestEvents.push(event)
	return event
}

/**
 * 添加玩家对联盟的申请事件
 * @param playerDoc
 * @param allianceDoc
 * @param requestTime
 * @return {*}
 */
Utils.addPlayerJoinAllianceEvent = function(playerDoc, allianceDoc, requestTime){
	var event = {
		id:allianceDoc._id,
		name:allianceDoc.basicInfo.name,
		tag:allianceDoc.basicInfo.tag,
		flag:allianceDoc.basicInfo.flag,
		archon:this.getAllianceArchon(allianceDoc).name,
		terrain:allianceDoc.basicInfo.terrain,
		members:allianceDoc.members.length,
		membersMax:DataUtils.getAllianceMemberMaxCount(allianceDoc),
		power:allianceDoc.basicInfo.power,
		language:allianceDoc.basicInfo.language,
		kill:allianceDoc.basicInfo.kill,
		status:Consts.AllianceJoinStatus.Pending,
		requestTime:requestTime
	}
	playerDoc.requestToAllianceEvents.push(event)
	return event
}

/**
 * 添加联盟对玩家的邀请事件
 * @param inviterId
 * @param playerDoc
 * @param allianceDoc
 * @param inviteTime
 * @return {*}
 */
Utils.addPlayerInviteAllianceEvent = function(inviterId, playerDoc, allianceDoc, inviteTime){
	var event = {
		id:allianceDoc._id,
		name:allianceDoc.basicInfo.name,
		tag:allianceDoc.basicInfo.tag,
		flag:allianceDoc.basicInfo.flag,
		archon:this.getAllianceArchon(allianceDoc).name,
		terrain:allianceDoc.basicInfo.terrain,
		members:allianceDoc.members.length,
		membersMax:DataUtils.getAllianceMemberMaxCount(allianceDoc),
		power:allianceDoc.basicInfo.power,
		language:allianceDoc.basicInfo.language,
		kill:allianceDoc.basicInfo.kill,
		inviterId:inviterId,
		inviteTime:inviteTime
	}
	playerDoc.inviteToAllianceEvents.push(event)
	return event
}

/**
 * 是否有对某联盟的邀请存在
 * @param playerDoc
 * @param allianceDoc
 * @returns {boolean}
 */
Utils.hasInviteEventToAlliance = function(playerDoc, allianceDoc){
	return _.some(playerDoc.inviteToAllianceEvents, function(event){
		return _.isEqual(event.id, allianceDoc._id)
	})
}

/**
 * 获取已经使用的建筑建造队列
 * @param playerDoc
 * @returns {number}
 */
Utils.getUsedBuildQueue = function(playerDoc){
	var usedBuildQueue = 0
	usedBuildQueue += playerDoc.buildingEvents.length
	usedBuildQueue += playerDoc.houseEvents.length

	return usedBuildQueue
}

/**
 * 获取最先完成的建筑建造事件
 * @param playerDoc
 * @returns {*}
 */
Utils.getSmallestBuildEvent = function(playerDoc){
	var event = null
	_.each(playerDoc.buildingEvents, function(theEvent){
		if(event == null || event.event.finishTime > theEvent.finishTime){
			event = {event:theEvent, type:"buildingEvents"}
		}
	})
	_.each(playerDoc.houseEvents, function(theEvent){
		if(event == null || event.event.finishTime > theEvent.finishTime){
			event = {event:theEvent, type:"houseEvents"}
		}
	})

	return event
}

/**
 * 获取最先完成的造兵事件
 * @param playerDoc
 * @returns {*}
 */
Utils.getSmallestRecruitEvent = function(playerDoc){
	var event = null
	_.each(playerDoc.soldierEvents, function(theEvent){
		if(event == null || event.event.finishTime > theEvent.finishTime){
			event = {event:theEvent, type:"soldierEvents"}
		}
	})

	return event
}

/**
 * 获取玩家建造事件
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @returns {*}
 */
Utils.getPlayerEventByTypeAndId = function(playerDoc, eventType, eventId){
	if(_.isArray(playerDoc[eventType])){
		return this.getEventById(playerDoc[eventType], eventId)
	}
	return null
}

/**
 * 根据Id获取事件
 * @param events
 * @param id
 * @returns {*}
 */
Utils.getEventById = function(events, id){
	return _.find(events, function(event){
		return _.isEqual(event.id, id)
	})
}

/**
 * 根据协助加速类型和建造事件获取建筑
 * @param playerDoc
 * @param eventType
 * @param eventId
 * @returns {*}
 */
Utils.getPlayerObjectByEvent = function(playerDoc, eventType, eventId){
	var event = _.find(playerDoc[eventType], function(event){
		return _.isEqual(event.id, eventId)
	})

	if(_.isEqual(eventType, Consts.AllianceHelpEventType.BuildingEvents)){
		var building = playerDoc.buildings["location_" + event.location]
		return {name:building.type, level:building.level}
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.HouseEvents)){
		var theBuilding = playerDoc.buildings["location_" + event.buildingLocation]
		var theHouse = _.find(theBuilding.houses, function(house){
			return _.isEqual(house.location, event.houseLocation)
		})
		return {name:theHouse.type, level:theHouse.level}
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.ProductionTechEvents)){
		var productionTech = playerDoc.productionTechs[event.name]
		return {name:event.name, level:productionTech.level}
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.MilitaryTechEvents)){
		var militaryTech = playerDoc.militaryTechs[event.name]
		return {name:event.name, level:militaryTech.level}
	}else if(_.isEqual(eventType, Consts.AllianceHelpEventType.SoldierStarEvents)){
		return {name:event.name, level:playerDoc.soldierStars[event.name]}
	}

	return null
}

/**
 * 创建系统邮件
 * @param titleKey
 * @param titleArgs
 * @param contentKey
 * @param contentArgs
 * @returns {{id: *, title: *, fromId: string, fromName: string, fromIcon: number, fromAllianceTag: string, sendTime: number, content: *, isRead: boolean, isSaved: boolean}}
 */
Utils.createSysMail = function(titleKey, titleArgs, contentKey, contentArgs){
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
	return mail
}

/**
 * 根据邮件Id获取邮件
 * @param playerDoc
 * @param mailId
 * @returns {*}
 */
Utils.getPlayerMailById = function(playerDoc, mailId){
	return _.find(playerDoc.mails, function(mail){
		return _.isEqual(mail.id, mailId)
	})
}

/**
 * 根据战报Id获取战报
 * @param playerDoc
 * @param reportId
 * @returns {*}
 */
Utils.getPlayerReportById = function(playerDoc, reportId){
	return _.find(playerDoc.reports, function(report){
		return _.isEqual(report.id, reportId)
	})
}

/**
 * 获取第一份未保存的邮件
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerFirstUnSavedMail = function(playerDoc){
	for(var i = 0; i < playerDoc.mails.length; i++){
		var mail = playerDoc.mails[i]
		if(!mail.isSaved){
			return mail
		}
	}
	return playerDoc.mails[0]
}

/**
 * 获取第一份未保存的战报
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerFirstUnSavedReport = function(playerDoc){
	for(var i = 0; i < playerDoc.reports.length; i++){
		var report = playerDoc.reports[i]
		if(!report.isSaved){
			return report
		}
	}
	return playerDoc.reports[0]
}

/**
 * 获取联盟盟主信息
 * @param allianceDoc
 * @returns {*}
 */
Utils.getAllianceArchon = function(allianceDoc){
	for(var i = 0; i < allianceDoc.members.length; i++){
		var member = allianceDoc.members[i]
		if(_.isEqual(member.title, Consts.AllianceTitle.Archon)){
			return member
		}
	}
	return null
}

/**
 * 添加联盟事件
 * @param allianceDoc
 * @param allianceData
 * @param category
 * @param type
 * @param key
 * @param params
 * @returns {{category: *, type: *, key: *, time: number, params: *}}
 */
Utils.AddAllianceEvent = function(allianceDoc, allianceData, category, type, key, params){
	var event = {
		category:category,
		type:type,
		key:key,
		time:Date.now(),
		params:params
	}

	if(allianceDoc.events.length >= Define.AllianceEventsMaxSize){
		allianceData.push(["events." + 0, null])
		allianceDoc.events.shift()
	}
	allianceDoc.events.push(event)
	allianceData.push(["events." + allianceDoc.events.indexOf(event), event])
}

/**
 * 为联盟添加成员
 * @param allianceDoc
 * @param playerDoc
 * @param title
 * @param mapId
 * @param online
 * @return {*}
 */
Utils.addAllianceMember = function(allianceDoc, playerDoc, title, mapId, online){
	var member = {
		id:playerDoc._id,
		mapId:mapId,
		apnId:playerDoc.apnId,
		language:playerDoc.basicInfo.language,
		name:playerDoc.basicInfo.name,
		icon:playerDoc.basicInfo.icon,
		terrain:playerDoc.basicInfo.terrain,
		levelExp:playerDoc.basicInfo.levelExp,
		keepLevel:playerDoc.buildings.location_1.level,
		status:Consts.PlayerStatus.Normal,
		helpedByTroopsCount:0,
		power:playerDoc.basicInfo.power,
		kill:playerDoc.basicInfo.kill,
		loyalty:playerDoc.allianceInfo.loyalty,
		lastLoginTime:playerDoc.countInfo.lastLoginTime,
		lastBeAttackedTime:0,
		title:title,
		allianceExp:{
			woodExp:playerDoc.allianceInfo.woodExp,
			stoneExp:playerDoc.allianceInfo.stoneExp,
			ironExp:playerDoc.allianceInfo.ironExp,
			foodExp:playerDoc.allianceInfo.foodExp,
			coinExp:playerDoc.allianceInfo.coinExp
		},
		isProtected:false,
		lastThreeDaysKillData:[],
		lastRewardData:null
	}
	if(!!online)
		member.online = online
	allianceDoc.members.push(member)
	return member
}

/**
 * 获取可用的地图坐标
 * @param mapObjects
 * @param width
 * @param height
 * @returns {{x: *, y: *, width: *, height: *}}
 */
Utils.getFreePointInAllianceMap = function(mapObjects, width, height){
	var map = MapUtils.buildMap(mapObjects)
	var rect = MapUtils.getRect(map, width, height)
	return rect
}

/**
 * 根据Id获取联盟地图中的对象
 * @param allianceDoc
 * @param objectId
 * @returns {*}
 */
Utils.getAllianceMapObjectById = function(allianceDoc, objectId){
	for(var i = 0; i < allianceDoc.mapObjects.length; i++){
		var mapObject = allianceDoc.mapObjects[i]
		if(_.isEqual(mapObject.id, objectId)) return mapObject
	}
	return null
}

/**
 * 创建联盟建筑对象
 * @param name
 * @param rect
 * @returns {{type: *, location: {x: (rect.x|*), y: (rect.y|*)}}}
 */
Utils.createAllianceMapObject = function(name, rect){
	var object = {
		id:ShortId.generate(),
		name:name,
		location:{
			x:rect.x,
			y:rect.y
		}
	}
	return object
}

/**
 * 联盟某个村落是否真正被采集
 * @param allianceDoc
 * @param villageId
 * @returns {boolean}
 */
Utils.isAllianceVillageBeingCollect = function(allianceDoc, villageId){
	for(var i = 0; i < allianceDoc.villageEvents.length; i++){
		var collectEvent = allianceDoc.collectEvents[i]
		if(_.isEqual(collectEvent.villageId, villageId)) return true
	}
	return false
}

/**
 * 联盟某个圣地事件是否已经激活
 * @param allianceDoc
 * @param stageName
 * @returns {boolean}
 */
Utils.isAllianceShrineStageActivated = function(allianceDoc, stageName){
	for(var i = 0; i < allianceDoc.shrineEvents.length; i++){
		var event = allianceDoc.shrineEvents[i]
		if(_.isEqual(event.stageName, stageName)) return true
	}
	return false
}

/**
 * 获取联盟指定类型的建筑的数量类型
 * @param allianceDoc
 * @param decorateType
 * @returns {number}
 */
Utils.getAllianceDecorateObjectCountByType = function(allianceDoc, decorateType){
	var count = 0
	_.each(allianceDoc.mapObjects, function(mapObject){
		if(_.isEqual(mapObject.type, decorateType)) count++
	})

	return count
}

/**
 * 行军派出的士兵数量是否合法
 * @param playerDoc
 * @param soldiers
 * @returns {boolean}
 */
Utils.isPlayerMarchSoldiersLegal = function(playerDoc, soldiers){
	if(soldiers.length == 0) return false
	for(var i = 0; i < soldiers.length; i++){
		var soldier = soldiers[i]
		var soldierName = soldier.name
		var count = soldier.count
		if(!_.isString(soldierName) || !_.isNumber(count)) return false
		count = Math.floor(count)
		if(count <= 0) return false
		if(!playerDoc.soldiers[soldierName] || playerDoc.soldiers[soldierName] < count) return false
	}
	return true
}

/**
 * 重置玩家部队战斗数据
 * @param soldiersForFight
 * @param fightRoundData
 */
Utils.resetFightSoldiersByFightResult = function(soldiersForFight, fightRoundData){
	var soldiersWillRemoved = []
	_.each(fightRoundData, function(fightResult){
		var soldierForFight = _.find(soldiersForFight, function(soldierForFight){
			return _.isEqual(soldierForFight.name, fightResult.soldierName)
		})
		soldierForFight.totalCount -= fightResult.soldierDamagedCount
		soldierForFight.currentCount = soldierForFight.totalCount
		soldierForFight.morale = 100
		if(soldierForFight.totalCount <= 0) soldiersWillRemoved.push(soldierForFight)
	})
	this.removeItemsInArray(soldiersForFight, soldiersWillRemoved)
}

/**
 * 从联盟圣地事件中获取玩家龙的信息
 * @param playerId
 * @param event
 * @returns {*}
 */
Utils.getPlayerDragonDataFromAllianceShrineStageEvent = function(playerId, event){
	for(var i = 0; i < event.playerTroops.length; i++){
		var playerTroop = event.playerTroops[i]
		if(_.isEqual(playerTroop.id, playerId)) return playerTroop.dragon
	}
	return null
}

/**
 * 圣地指定关卡是否已经有玩家部队存在
 * @param allianceDoc
 * @param shrineEvent
 * @param playerId
 * @returns {boolean}
 */
Utils.isPlayerHasTroopMarchToAllianceShrineStage = function(allianceDoc, shrineEvent, playerId){
	for(var i = 0; i < allianceDoc.attackMarchEvents.length; i++){
		var marchEvent = allianceDoc.attackMarchEvents[i]
		if(_.isEqual(marchEvent.marchType, Consts.MarchType.Shrine)
			&& _.isEqual(marchEvent.defenceShrineData.shrineEventId, shrineEvent.id)
			&& _.isEqual(marchEvent.attackPlayerData.id, playerId)
		) return true
	}
	for(i = 0; i < shrineEvent.playerTroops.length; i++){
		var playerTroop = shrineEvent.playerTroops[i]
		if(_.isEqual(playerTroop.id, playerId)) return true
	}
	return false
}

/**
 * 查看玩家是否已经对联盟某玩家协防
 * @param allianceDoc
 * @param playerDoc
 * @param targetPlayerId
 * @returns {boolean}
 */
Utils.isPlayerHasTroopHelpedPlayer = function(allianceDoc, playerDoc, targetPlayerId){
	for(var i = 0; i < allianceDoc.attackMarchEvents.length; i++){
		var marchEvent = allianceDoc.attackMarchEvents[i]
		if(_.isEqual(marchEvent.marchType, Consts.MarchType.HelpDefence)
			&& _.isEqual(marchEvent.attackPlayerData.id, playerDoc._id)
			&& _.isEqual(marchEvent.defencePlayerData.id, targetPlayerId)
		) return true
	}
	var playerTroop = null
	for(i = 0; i < playerDoc.helpToTroops.length; i++){
		playerTroop = playerDoc.helpToTroops[i]
		if(_.isEqual(playerTroop.beHelpedPlayerData.id, targetPlayerId)) return true
	}
	return false
}

/**
 * 玩家是否有协防部队驻扎在某玩家城市中
 * @param playerDoc
 * @param targetPlayerId
 * @returns {boolean}
 */
Utils.isPlayerHasHelpedTroopInAllianceMember = function(playerDoc, targetPlayerId){
	for(var i = 0; i < playerDoc.helpToTroops.length; i++){
		var troop = playerDoc.helpToTroops[i]
		if(_.isEqual(troop.beHelpedPlayerData.id, targetPlayerId)) return true
	}
	return false
}

/**
 * 获取联盟某关卡的历史星级数据
 * @param allianceDoc
 * @param stageName
 * @returns {*}
 */
Utils.getAllianceShrineStageData = function(allianceDoc, stageName){
	for(var i = 0; i < allianceDoc.shrineDatas.length; i++){
		var stageData = allianceDoc.shrineDatas[i]
		if(_.isEqual(stageData.stageName, stageName)){
			return stageData
		}
	}
	return null
}

/**
 * 获取所有部队平均战斗力
 * @param playerTroopsForFight
 * @returns {number}
 */
Utils.getPlayerTroopsAvgPower = function(playerTroopsForFight){
	var totalPower = 0
	_.each(playerTroopsForFight, function(playerTroopForFight){
		_.each(playerTroopForFight.soldiersForFight, function(soldierForFight){
			totalPower += soldierForFight.power * soldierForFight.totalCount
		})
	})
	var avgPower = playerTroopsForFight.length > 0 ? Math.floor(totalPower / playerTroopsForFight.length) : 0
	return avgPower
}

/**
 * 修复联盟圣地战战报中的未参战的玩家的数据
 * @param playerTroops
 * @param playerDatas
 * @return {*}
 */
Utils.fixAllianceShrineStagePlayerData = function(playerTroops, playerDatas){
	var thePlayerTroops = {}
	_.each(playerTroops, function(playerTroop){
		thePlayerTroops[playerTroop.id] = playerTroop
	})
	_.each(playerDatas, function(playerData){
		delete thePlayerTroops[playerData.id]
	})
	_.each(thePlayerTroops, function(playerTroop){
		var playerData = {
			id:playerTroop.id,
			name:playerTroop.name,
			icon:playerTroop.icon,
			kill:0,
			rewards:[]
		}
		playerDatas.push(playerData)
	})
	return playerDatas
}

/**
 * 联盟战匹配成功后,创建初始数据结构
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 * @param prepareTime
 */
Utils.prepareForAllianceFight = function(attackAllianceDoc, defenceAllianceDoc, prepareTime){
	var now = Date.now()
	var mergeStyle = Consts.AllianceMergeStyle[_.keys(Consts.AllianceMergeStyle)[(Math.random() * 4) << 0]]
	attackAllianceDoc.basicInfo.status = Consts.AllianceStatus.Prepare
	attackAllianceDoc.basicInfo.statusStartTime = now
	attackAllianceDoc.basicInfo.statusFinishTime = prepareTime
	attackAllianceDoc.allianceFight = {
		mergeStyle:mergeStyle,
		attackAllianceId:attackAllianceDoc._id,
		defenceAllianceId:defenceAllianceDoc._id,
		attackPlayerKills:[],
		attackAllianceCountData:{
			kill:0,
			routCount:0,
			strikeCount:0,
			strikeSuccessCount:0,
			attackCount:0,
			attackSuccessCount:0
		},
		defencePlayerKills:[],
		defenceAllianceCountData:{
			kill:0,
			routCount:0,
			strikeCount:0,
			strikeSuccessCount:0,
			attackCount:0,
			attackSuccessCount:0
		}
	}
	defenceAllianceDoc.basicInfo.status = Consts.AllianceStatus.Prepare
	defenceAllianceDoc.basicInfo.statusStartTime = now
	defenceAllianceDoc.basicInfo.statusFinishTime = prepareTime
	defenceAllianceDoc.allianceFight = attackAllianceDoc.allianceFight
}

/**
 * 更新联盟统计数据
 * @param attackAllianceDoc
 * @param defenceAllianceDoc
 */
Utils.updateAllianceCountInfo = function(attackAllianceDoc, defenceAllianceDoc){
	var attackAllianceCountInfo = attackAllianceDoc.countInfo
	var defenceAllianceCountInfo = defenceAllianceDoc.countInfo
	var allianceFight = attackAllianceDoc.allianceFight
	attackAllianceCountInfo.kill += allianceFight.attackAllianceCountData.kill
	attackAllianceCountInfo.beKilled += allianceFight.defenceAllianceCountData.kill
	attackAllianceCountInfo.routCount += allianceFight.attackAllianceCountData.routCount
	attackAllianceCountInfo.winCount += allianceFight.attackAllianceCountData.kill >= allianceFight.defenceAllianceCountData.kill ? 1 : 0
	attackAllianceCountInfo.failedCount += allianceFight.attackAllianceCountData.kill >= allianceFight.defenceAllianceCountData.kill ? 0 : 1
	defenceAllianceCountInfo.kill += allianceFight.defenceAllianceCountData.kill
	defenceAllianceCountInfo.beKilled += allianceFight.attackAllianceCountData.kill
	defenceAllianceCountInfo.routCount += allianceFight.defenceAllianceCountData.routCount
	defenceAllianceCountInfo.winCount += allianceFight.defenceAllianceCountData.kill >= allianceFight.attackAllianceCountData.kill ? 1 : 0
	defenceAllianceCountInfo.failedCount += allianceFight.defenceAllianceCountData.kill >= allianceFight.attackAllianceCountData.kill ? 0 : 1
}

/**
 * 获取玩家正在进行防守的龙
 * @param playerDoc
 * @returns {*}
 */
Utils.getPlayerDefenceDragon = function(playerDoc){
	var dragon = null
	_.each(playerDoc.dragons, function(theDragon){
		if(_.isEqual(theDragon.status, Consts.DragonStatus.Defence)) dragon = theDragon
	})
	return dragon
}

/**
 * 添加联盟战历史记录战报
 * @param allianceDoc
 * @param allianceData
 * @param report
 */
Utils.addAllianceFightReport = function(allianceDoc, allianceData, report){
	var self = this
	var willRemovedReport = null
	if(allianceDoc.allianceFightReports.length >= Define.AllianceFightReportsMaxSize){
		willRemovedReport = allianceDoc.allianceFightReports[0]
		allianceData.push(["allianceFightReports." + allianceDoc.allianceFightReports.indexOf(willRemovedReport), null])
		self.removeItemInArray(allianceDoc.allianceFightReports, willRemovedReport)
	}
	allianceDoc.allianceFightReports.push(report)
	allianceData.push(["allianceFightReports." + allianceDoc.allianceFightReports.indexOf(report), report])
}

/**
 * 如果联盟正在战斗,推送我方联盟相关数据变化到敌对联盟
 * @param allianceDoc
 * @param enemyAllianceData
 * @param pushFuncs
 * @param pushService
 */
Utils.pushDataToEnemyAlliance = function(allianceDoc, enemyAllianceData, pushFuncs, pushService){
	if(_.isObject(allianceDoc.allianceFight) && !_.isEmpty(enemyAllianceData)){
		var enemyAllianceId = this.getEnemyAllianceId(allianceDoc.allianceFight, allianceDoc._id)
		pushFuncs.push([pushService, pushService.onEnemyAllianceDataChangedAsync, enemyAllianceId, enemyAllianceData])
	}
}

/**
 * 合并奖励
 * @param rewards
 * @param rewardsNew
 * @returns {*}
 */
Utils.mergeRewards = function(rewards, rewardsNew){
	_.each(rewardsNew, function(rewardNew){
		var reward = _.find(rewards, function(reward){
			return _.isEqual(reward.type, rewardNew.type) && _.isEqual(reward.name, rewardNew.name)
		})
		if(!_.isObject(reward)){
			reward = {
				type:rewardNew.type,
				name:rewardNew.name,
				count:0
			}
			rewards.push(reward)
		}
		reward.count += rewardNew.count
	})
	return rewards
}

/**
 * 合并兵力数据
 * @param soldiers
 * @param soldiersNew
 * @returns {*}
 */
Utils.mergeSoldiers = function(soldiers, soldiersNew){
	_.each(soldiersNew, function(soldierNew){
		var soldier = _.find(soldiers, function(soldier){
			return _.isEqual(soldier.name, soldierNew.name)
		})
		if(!_.isObject(soldier)){
			soldier = {
				name:soldierNew.name,
				count:0
			}
			soldiers.push(soldier)
		}
		soldier.count += soldierNew.count
	})
	return soldiers
}

/**
 * 玩家龙领导力是否足以派出指定的士兵
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @returns {boolean}
 */
Utils.isPlayerDragonLeadershipEnough = function(playerDoc, dragon, soldiers){
	var dragonMaxCitizen = DataUtils.getPlayerDragonMaxCitizen(playerDoc, dragon)
	var soldiersCitizen = DataUtils.getPlayerSoldiersCitizen(playerDoc, soldiers)
	return dragonMaxCitizen >= soldiersCitizen
}

/**
 * 退还玩家在圣地的数据
 * @param playerDoc
 * @param playerData
 * @param allianceDoc
 * @param allianceData
 */
Utils.returnPlayerShrineTroops = function(playerDoc, playerData, allianceDoc, allianceData){
	var self = this
	var playerTroops = []
	_.each(allianceDoc.shrineEvents, function(shrineEvent){
		var playerTroop = _.find(shrineEvent.playerTroops, function(playerTroop){
			return _.isEqual(playerDoc._id, playerTroop.id)
		})
		if(_.isObject(playerTroop)) playerTroops.push({event:shrineEvent, troop:playerTroop})
	})
	_.each(playerTroops, function(playerTroop){
		allianceData.push(["shrineEvents." + allianceDoc.shrineEvents.indexOf(playerTroop.event) + ".playerTroops." + playerTroop.event.playerTroops.indexOf(playerTroop.troop), null])
		self.removeItemInArray(playerTroop.event.playerTroops, playerTroop.troop)

		DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[playerTroop.troop.dragon.type])
		playerDoc.dragons[playerTroop.troop.dragon.type].status = Consts.DragonStatus.Free
		playerData.push(["dragons." + playerTroop.troop.dragon.type], playerDoc.dragons[playerTroop.troop.dragon.type])

		_.each(playerTroop.troop.soldiers, function(soldier){
			playerDoc.soldiers[soldier.name] += soldier.count
			playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
		})
	})
}

/**
 * 退还进攻行军中玩家的数据
 * @param playerDoc
 * @param playerData
 * @param allianceDoc
 * @param allianceData
 * @param eventFuncs
 * @param timeEventService
 */
Utils.returnPlayerMarchTroops = function(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, timeEventService){
	var i = allianceDoc.strikeMarchEvents.length
	var marchEvent = null
	while(i--){
		marchEvent = allianceDoc.strikeMarchEvents[i]
		if(_.isEqual(marchEvent.attackPlayerData.id, playerDoc._id)){
			allianceData.push(["strikeMarchEvents." + allianceDoc.strikeMarchEvents.indexOf(marchEvent), null])
			allianceDoc.strikeMarchEvents.splice(i, 1)
			eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, "strikeMarchEvents", marchEvent.id])

			DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
			playerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
			playerData.push(["dragons." + marchEvent.attackPlayerData.dragon.type], playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
		}
	}
	i = allianceDoc.attackMarchEvents.length
	while(i--){
		marchEvent = allianceDoc.attackMarchEvents[i]
		if(_.isEqual(marchEvent.attackPlayerData.id, playerDoc._id)){
			allianceData.push(["attackMarchEvents." + allianceDoc.attackMarchEvents.indexOf(marchEvent), null])
			allianceDoc.attackMarchEvents.splice(i, 1)
			eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", marchEvent.id])

			DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
			playerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
			playerData.push(["dragons." + marchEvent.attackPlayerData.dragon.type], playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])

			_.each(marchEvent.attackPlayerData.soldiers, function(soldier){
				playerDoc.soldiers[soldier.name] += soldier.count
				playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
			})
		}
	}
}

/**
 * 退还回城行军中玩家的数据
 * @param playerDoc
 * @param playerData
 * @param allianceDoc
 * @param allianceData
 * @param eventFuncs
 * @param timeEventService
 */
Utils.returnPlayerMarchReturnTroops = function(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, timeEventService){
	var self = this
	var i = allianceDoc.strikeMarchReturnEvents.length
	var marchEvent = null
	while(i--){
		marchEvent = allianceDoc.strikeMarchReturnEvents[i]
		if(_.isEqual(marchEvent.attackPlayerData.id, playerDoc._id)){
			allianceData.push(["strikeMarchReturnEvents." + allianceDoc.strikeMarchReturnEvents.indexOf(marchEvent), null])
			allianceDoc.strikeMarchReturnEvents.splice(i, 1)
			eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, "strikeMarchReturnEvents", marchEvent.id])

			DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
			playerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
			playerData.push(["dragons." + marchEvent.attackPlayerData.dragon.type], playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
		}
	}
	i = allianceDoc.attackMarchReturnEvents.length
	while(i--){
		marchEvent = allianceDoc.attackMarchReturnEvents[i]
		if(_.isEqual(marchEvent.attackPlayerData.id, playerDoc._id)){
			allianceData.push(["attackMarchReturnEvents." + allianceDoc.attackMarchReturnEvents.indexOf(marchEvent), null])
			allianceDoc.attackMarchReturnEvents.splice(i, 1)
			eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchEvent.id])

			DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
			playerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
			playerData.push(["dragons." + marchEvent.attackPlayerData.dragon.type], playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
			self.addPlayerSoldiers(playerDoc, playerData, marchEvent.attackPlayerData.soldiers)
			DataUtils.addPlayerWoundedSoldiers(playerDoc, playerData, marchEvent.attackPlayerData.woundedSoldiers)
			_.each(marchEvent.attackPlayerData.rewards, function(reward){
				playerDoc[reward.type][reward.name] += reward.count
				if(!_.isEqual(reward.type, 'resources'))
					playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
			})
		}
	}
}

/**
 * 退还玩家在村落的数据
 * @param playerDoc
 * @param playerData
 * @param allianceDoc
 * @param allianceData
 * @param eventFuncs
 * @param timeEventService
 * @param dataService
 */
Utils.returnPlayerVillageTroop = function(playerDoc, playerData, allianceDoc, allianceData, eventFuncs, timeEventService, dataService){
	var self = this
	var i = allianceDoc.villageEvents.length
	var villageEvent = null
	while(i--){
		villageEvent = allianceDoc.villageEvents[i]
		if(_.isEqual(villageEvent.playerData.id, playerDoc._id)){
			allianceData.push(["villageEvents." + allianceDoc.villageEvents.indexOf(villageEvent), null])
			allianceDoc.villageEvents.splice(i, 1)
			eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, "villageEvents", villageEvent.id])

			DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[villageEvent.playerData.dragon.type])
			playerDoc.dragons[villageEvent.playerData.dragon.type].status = Consts.DragonStatus.Free
			playerData.push(["dragons." + villageEvent.playerData.dragon.type], playerDoc.dragons[villageEvent.playerData.dragon.type])

			self.addPlayerSoldiers(playerDoc, playerData, villageEvent.playerData.soldiers)
			DataUtils.addPlayerWoundedSoldiers(playerDoc, playerData, villageEvent.playerData.woundedSoldiers)

			var resourceCollected = Math.floor(villageEvent.villageData.collectTotal
				* ((Date.now() - villageEvent.startTime)
				/ (villageEvent.finishTime - villageEvent.startTime))
			)
			var village = self.getAllianceVillageById(allianceDoc, villageEvent.villageData.id)
			var originalRewards = villageEvent.playerData.rewards
			var resourceName = village.name.slice(0, -7)
			var newRewards = [{
				type:"resources",
				name:resourceName,
				count:resourceCollected
			}]
			self.mergeRewards(originalRewards, newRewards)
			_.each(originalRewards, function(reward){
				playerDoc[reward.type][reward.name] += reward.count
				if(!_.isEqual(reward.type, 'resources'))
					playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
			})

			var collectExp = DataUtils.getCollectResourceExpAdd(resourceName, newRewards[0].count)
			playerDoc.allianceInfo[resourceName + "Exp"] += collectExp
			playerData.allianceInfo = playerDoc.allianceInfo
			village.resource -= resourceCollected
			allianceData.push(["villages." + allianceDoc.villages.indexOf(village) + ".resource", village.resource])
			var collectReport = ReportUtils.createCollectVillageReport(allianceDoc, village, newRewards)
			eventFuncs.push([dataService, dataService.sendSysReportAsync, playerDoc._id, collectReport])
		}
	}
}

/**
 * 退还数据给协防方
 * @param playerDoc
 * @param playerData
 * @param helpedByTroop
 * @param helpedByPlayerDoc
 * @param helpedByPlayerData
 */
Utils.returnPlayerHelpedByTroop = function(playerDoc, playerData, helpedByTroop, helpedByPlayerDoc, helpedByPlayerData){
	playerData.push(["helpedByTroops." + playerDoc.helpedByTroops.indexOf(helpedByTroop), null])
	this.removeItemInArray(playerDoc.helpedByTroops, helpedByTroop)
	var helpedToTroop = _.find(helpedByPlayerDoc.helpToTroops, function(helpToTroop){
		return _.isEqual(helpToTroop.beHelpedPlayerData.id, playerDoc._id)
	})
	playerData.push(["helpToTroops." + helpedByPlayerDoc.helpToTroops.indexOf(helpedToTroop), null])
	this.removeItemInArray(helpedByPlayerDoc.helpToTroops, helpedToTroop)

	DataUtils.refreshPlayerDragonsHp(helpedByPlayerDoc, helpedByPlayerDoc.dragons[helpedByTroop.dragon.type])
	helpedByPlayerDoc.dragons[helpedByTroop.dragon.type].status = Consts.DragonStatus.Free
	helpedByPlayerData.push(["dragons." + helpedByTroop.dragon.type, helpedByPlayerDoc.dragons[helpedByTroop.dragon.type]])

	helpedByPlayerData.soldiers = {}
	_.each(helpedByTroop.soldiers, function(soldier){
		helpedByPlayerDoc.soldiers[soldier.name] += soldier.count
		helpedByPlayerData.push(["soldiers." + soldier.name, helpedByPlayerDoc.soldiers[soldier.name]])
	})

	DataUtils.refreshPlayerResources(helpedByPlayerDoc)
	helpedByPlayerData.push(["resources", helpedByPlayerDoc.resources])
	_.each(helpedByTroop.rewards, function(reward){
		helpedByPlayerDoc[reward.type][reward.name] += reward.count
		if(!_.isEqual(reward.type, 'resources'))
			helpedByPlayerData.push([reward.type + "." + reward.name, helpedByPlayerDoc[reward.type][reward.name]])
	})
}

/**
 * 退还数据给协防方
 * @param allianceDoc
 * @param allianceData
 * @param playerDoc
 * @param playerData
 * @param helpToTroop
 * @param helpToPlayerDoc
 * @param helpToPlayerData
 */
Utils.returnPlayerHelpToTroop = function(allianceDoc, allianceData, playerDoc, playerData, helpToTroop, helpToPlayerDoc, helpToPlayerData){
	playerData.push(["helpToTroops." + playerDoc.helpToTroops.indexOf(helpToTroop), null])
	this.removeItemInArray(playerDoc.helpToTroops, helpToTroop)
	var helpedByTroop = _.find(helpToPlayerDoc.helpedByTroops, function(helpedByTroop){
		return _.isEqual(helpedByTroop.id, playerDoc._id)
	})
	helpToPlayerData.push(["helpedByTroops." + helpToPlayerDoc.helpedByTroops.indexOf(helpedByTroop), null])
	this.removeItemInArray(helpToPlayerDoc.helpedByTroops, helpedByTroop)
	var memberObject = this.getAllianceMemberById(allianceDoc, helpToPlayerDoc._id)
	memberObject.helpedByTroopsCount -= 1
	allianceData.push(['members.' + allianceDoc.members.indexOf(memberObject) + '.helpedByTroopsCount', memberObject.helpedByTroopsCount])

	DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[helpedByTroop.dragon.type])
	playerDoc.dragons[helpedByTroop.dragon.type].status = Consts.DragonStatus.Free
	playerData.push(["dragons." + helpedByTroop.dragon.type, playerDoc.dragons[helpedByTroop.dragon.type]])

	_.each(helpedByTroop.soldiers, function(soldier){
		playerDoc.soldiers[soldier.name] += soldier.count
		playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
	})

	_.each(helpedByTroop.rewards, function(reward){
		playerDoc[reward.type][reward.name] += reward.count
		if(!_.isEqual(reward.type, 'resources'))
			playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
	})
}

/**
 * 退还正在进行协防行军中的玩家数据
 * @param playerDoc
 * @param playerData
 * @param marchEvent
 * @param allianceDoc
 * @param allianceData
 * @param eventFuncs
 * @param timeEventService
 */
Utils.returnPlayerHelpedByMarchTroop = function(playerDoc, playerData, marchEvent, allianceDoc, allianceData, eventFuncs, timeEventService){
	allianceData.push(["attackMarchEvents." + allianceDoc.indexOf(marchEvent), null])
	this.removeItemInArray(allianceDoc.attackMarchEvents, marchEvent)
	eventFuncs.push([timeEventService, timeEventService.removeAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", marchEvent.id])

	DataUtils.refreshPlayerDragonsHp(playerDoc, playerDoc.dragons[marchEvent.attackPlayerData.dragon.type])
	playerDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
	playerData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, playerDoc.dragons[marchEvent.attackPlayerData.dragon.type]])

	_.each(marchEvent.attackPlayerData.soldiers, function(soldier){
		playerDoc.soldiers[soldier.name] += soldier.count
		playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
	})
}

/**
 * 创建一笔交易
 * @param playerDoc
 * @param type
 * @param name
 * @param count
 * @param price
 * @returns {*}
 */
Utils.createDeal = function(playerDoc, type, name, count, price){
	var id = ShortId.generate()
	var dealForPlayer = {
		id:id,
		isSold:false,
		itemData:{
			type:type,
			name:name,
			count:count,
			price:price
		}
	}
	var dealForAll = {
		_id:id,
		playerId:playerDoc._id,
		serverId:playerDoc.serverId,
		itemData:{
			type:type,
			name:name,
			count:count,
			price:price
		}
	}

	return {dealForPlayer:dealForPlayer, dealForAll:dealForAll}
}

/**
 * 为玩家添加道具
 * @param playerDoc
 * @param name
 * @param count
 * @returns {{item: *, newlyCreated: boolean}}
 */
Utils.addPlayerItem = function(playerDoc, name, count){
	var newlyCreated = false
	var item = _.find(playerDoc.items, function(item){
		return _.isEqual(item.name, name)
	})
	if(!_.isObject(item)){
		item = {
			name:name,
			count:0
		}
		playerDoc.items.push(item)
		newlyCreated = true
	}
	item.count += count

	return {item:item, newlyCreated:newlyCreated}
}

/**
 * 为联盟添加道具
 * @param allianceDoc
 * @param name
 * @param count
 * @returns {{item: *, newlyCreated: boolean}}
 */
Utils.addAllianceItem = function(allianceDoc, name, count){
	var newlyCreated = false
	var item = _.find(allianceDoc.items, function(item){
		return _.isEqual(item.name, name)
	})
	if(!_.isObject(item)){
		item = {
			name:name,
			count:0
		}
		allianceDoc.items.push(item)
		newlyCreated = true
	}
	item.count += count

	return {item:item, newlyCreated:newlyCreated}
}

/**
 * 获取今日的日期
 * @returns {String}
 */
Utils.getTodayDateString = function(){
	var date = new Date()
	return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
}

/**
 * 获取昨天的日期
 * @returns {string}
 */
Utils.getYesterdayDateString = function(){
	var date = new Date()
	date.setDate(date.getDate() - 1)
	return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
}

/**
 * 根据毫秒值获取日期
 * @param milliseconds
 */
Utils.getDateString = function(milliseconds){
	var date = new Date(milliseconds)
	return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
}

/**
 * 添加联盟成员最近3天的击杀数据
 * @param allianceDoc
 * @param memberId
 * @param kill
 */
Utils.addAlliancePlayerLastThreeDaysKillData = function(allianceDoc, memberId, kill){
	var todayString = this.getTodayDateString()
	var memberObject = this.getAllianceMemberById(allianceDoc, memberId)
	var killData = _.find(memberObject.lastThreeDaysKillData, function(killData){
		return _.isEqual(killData.date, todayString)
	})
	if(_.isObject(killData)){
		killData.kill += kill
	}else{
		if(memberObject.lastThreeDaysKillData.length >= 3){
			memberObject.lastThreeDaysKillData.pop()
		}
		killData = {
			kill:kill,
			date:todayString
		}
		memberObject.lastThreeDaysKillData.push(killData)
	}
	return memberObject
}

/**
 * 创建联盟道具商城日志
 * @param logType
 * @param playerName
 * @param itemName
 * @param itemCount
 * @returns {{type: *, playerName: *, itemName: *, itemCount: *, time: number}}
 */
Utils.createAllianceItemLog = function(logType, playerName, itemName, itemCount){
	var log = {
		type:logType,
		playerName:playerName,
		itemName:itemName,
		itemCount:itemCount,
		time:Date.now()
	}
	return log
}

/**
 * 添加联盟商店日志
 * @param allianceDoc
 * @param allianceData
 * @param log
 */
Utils.addAllianceItemLog = function(allianceDoc, allianceData, log){
	var willRemovedLog = null
	if(allianceDoc.itemLogs.length >= Define.AllianceItemLogsMaxSize){
		willRemovedLog = allianceDoc.itemLogs[0]
		allianceData.push(["itemLogs." + allianceDoc.itemLogs.indexOf(willRemovedLog), null])
		this.removeItemInArray(allianceDoc.itemLogs, willRemovedLog)
	}
	allianceDoc.itemLogs.push(log)
	allianceData.push(["itemLogs." + allianceDoc.itemLogs.indexOf(log), log])
}

/**
 * 格式化玩家数据中的士兵信息
 * @param soldiers
 * @returns {Array}
 */
Utils.getFormatedSoldiers = function(soldiers){
	var formatedSoldiers = []
	_.each(soldiers, function(count, name){
		var soldier = {
			name:name,
			count:count
		}
		formatedSoldiers.push(soldier)
	})

	return formatedSoldiers
}

/**
 * 为玩家添加士兵
 * @param playerDoc
 * @param playerData
 * @param soldiers
 */
Utils.addPlayerSoldiers = function(playerDoc, playerData, soldiers){
	_.each(soldiers, function(soldier){
		playerDoc.soldiers[soldier.name] += soldier.count
		playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
	})
}

/**
 * 玩家是否有空闲的行军队列
 * @param playerDoc
 * @param allianceDoc
 * @returns {boolean}
 */
Utils.isPlayerHasFreeMarchQueue = function(playerDoc, allianceDoc){
	var strikeMarchEvents = _.filter(allianceDoc.strikeMarchEvents, function(event){
		return _.isEqual(event.attackPlayerData.id, playerDoc._id)
	})
	var strikeMarchReturnEvents = _.filter(allianceDoc.strikeMarchReturnEvents, function(event){
		return _.isEqual(event.attackPlayerData.id, playerDoc._id)
	})
	var attackMarchEvents = _.filter(allianceDoc.attackMarchEvents, function(event){
		return _.isEqual(event.attackPlayerData.id, playerDoc._id)
	})
	var attackMarchReturnEvents = _.filter(allianceDoc.attackMarchReturnEvents, function(event){
		return _.isEqual(event.attackPlayerData.id, playerDoc._id)
	})
	var villageEvents = _.filter(allianceDoc.villageEvents, function(event){
		return _.isEqual(event.playerData.id, playerDoc._id)
	})
	var helpEventsLength = playerDoc.helpToTroops.length
	var shrineEventsLength = 0
	_.each(allianceDoc.shrineEvents, function(shrineEvent){
		_.each(shrineEvent.playerTroops, function(playerTroop){
			if(_.isEqual(playerTroop.id, playerDoc._id)) shrineEventsLength += 1
		})
	})
	var usedMarchQueue = strikeMarchEvents.length + strikeMarchReturnEvents.length
		+ attackMarchEvents.length + attackMarchReturnEvents.length + villageEvents.length
		+ helpEventsLength + shrineEventsLength
	return usedMarchQueue < playerDoc.basicInfo.marchQueue
}

/**
 * 获取玩家建筑对资源的加成Buff
 * @param playerDoc
 * @param resourceType
 * @returns {number}
 */
Utils.getPlayerResourceBuildingBuff = function(playerDoc, resourceType){
	var buildingName = Consts.ResourceBuildingMap[resourceType]
	var buildings = _.filter(playerDoc.buildings, function(building){
		return _.isEqual(building.type, buildingName)
	})
	var buff = 0
	_.each(buildings, function(building){
		var nextLocation = building.location + 7
		var nextBuilding = playerDoc.buildings["location_" + nextLocation]
		var houseCount = 0
		var houses = building.houses.concat(nextBuilding.houses)
		_.each(houses, function(house){
			if(_.isEqual(house.type, Consts.ResourceHouseMap[resourceType])) houseCount += 1
		})
		if(houseCount >= 6) buff += 0.1
		else if(houseCount >= 3) buff += 0.05
	})
	return buff
}

/**
 * 为玩家添加资源
 * @param playerDoc
 * @param resources
 */
Utils.addPlayerResources = function(playerDoc, resources){
	_.each(playerDoc.resources, function(value, key){
		if(_.isNumber(resources[key])) playerDoc.resources[key] += resources[key]
	})
}

/**
 * 创建一个设备
 * @param deviceId
 * @param playerId
 * @returns {{_id: *, playerId: *}}
 */
Utils.createDevice = function(deviceId, playerId){
	var device = {
		_id:deviceId,
		playerId:playerId
	}
	return device
}

/**
 * 创建玩家
 * @param playerId
 * @param serverId
 */
Utils.createPlayer = function(playerId, serverId){
	var name = ShortId.generate()
	var player = {
		_id:playerId,
		serverId:serverId,
		apnId:null,
		gcId:null,
		allianceId:null,
		basicInfo:{name:"p_" + name}
	}
	return player
}

/**
 * 时间是否靠近当前时间
 * @param interval
 * @returns {boolean}
 */
Utils.willFinished = function(interval){
	return interval - 3000 <= Date.now()
}

/**
 * 根据建筑类型获取所有相关建筑
 * @param playerDoc
 * @param buildingType
 * @returns {Array}
 */
Utils.getPlayerBuildingByType = function(playerDoc, buildingType){
	return _.find(playerDoc.buildings, function(building){
		return _.isEqual(buildingType, building.type)
	})
}

/**
 * 根据建筑类型获取所有相关建筑
 * @param playerDoc
 * @param buildingType
 * @returns {*}
 */
Utils.getPlayerBuildingsByType = function(playerDoc, buildingType){
	return _.filter(playerDoc.buildings, function(building){
		return _.isEqual(buildingType, building.type)
	})
}

/**
 * 根据小屋类型获取所有相关小屋
 * @param playerDoc
 * @param houseType
 * @returns {Array}
 */
Utils.getPlayerHousesByType = function(playerDoc, houseType){
	var houses = []
	_.each(playerDoc.buildings, function(building){
		_.each(building.houses, function(house){
			if(_.isEqual(houseType, house.type)){
				houses.push(house)
			}
		})
	})

	return houses
}

/**
 * 获取地推联盟Id
 * @param allianceFight
 * @param myAllianceId
 * @returns {*}
 */
Utils.getEnemyAllianceId = function(allianceFight, myAllianceId){
	return _.isEqual(allianceFight.attackAllianceId, myAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
}

/**
 * 初始化玩家数据
 * @param playerDoc
 */
Utils.initPlayerDoc = function(playerDoc){
	playerDoc.pve.floors = [{
		"level": 1,
		"fogs": "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
		"objects": "[[9,12,3]]"
	}]
	playerDoc.pve.location = {
		"z": 1,
		"y": 12,
		"x": 9
	}
	playerDoc.growUpTasks.cityBuild.push({
		"id": 0,
		"index": 1,
		"name": "keep",
		"rewarded": false
	})
	playerDoc.growUpTasks.cityBuild.push({
		"id": 351,
		"index": 1,
		"name": "farmer",
		"rewarded": false
	})
	playerDoc.growUpTasks.cityBuild.push({
		"id": 1,
		"index": 2,
		"name": "keep",
		"rewarded": false
	})
	playerDoc.growUpTasks.cityBuild.push({
		"id": 2,
		"index": 3,
		"name": "keep",
		"rewarded": false
	})
	playerDoc.growUpTasks.cityBuild.push({
		"id": 3,
		"index": 4,
		"name": "keep",
		"rewarded": false
	})
	playerDoc.productionTechs.forestation.level = 1
	playerDoc.buildings.location_22.level = 1
	playerDoc.buildings.location_21.level = 1
	playerDoc.buildings.location_8.level = 1
	playerDoc.buildings.location_8.houses = [{
		"type": "miner",
		"level": 1,
		"location": 3
	}]
	playerDoc.buildings.location_7.level = 1
	playerDoc.buildings.location_7.houses = [{
		"type": "quarrier",
		"level": 1,
		"location": 3
	}]
	playerDoc.buildings.location_6.level = 1
	playerDoc.buildings.location_6.houses = [{
		"type": "woodcutter",
		"level": 1,
		"location": 3
	}]
	playerDoc.buildings.location_5.level = 1
	playerDoc.buildings.location_5.houses = [{
		"type": "farmer",
		"level": 1,
		"location": 3
	}]
	playerDoc.buildings.location_4.level = 1
	playerDoc.buildings.location_3.level = 1
	playerDoc.buildings.location_3.houses = [{
		"type": "dwelling",
		"level": 1,
		"location": 3
	}]
	playerDoc.buildings.location_2.level = 1
	playerDoc.buildings.location_1.level = 5
	playerDoc.soldiers.ranger = 100
	playerDoc.soldiers.swordsman = 100
	playerDoc.soldiers.skeletonWarrior = 1
	playerDoc.resources.citizen = 90
	playerDoc.items.push({
		name:'changePlayerName',
		count:1
	})
	playerDoc.items.push({
		name:'moveTheCity',
		count:1
	})
	playerDoc.items.push({
		name:'ironBonus_1',
		count:1
	})

	DataUtils.refreshPlayerPower(playerDoc, [])
}