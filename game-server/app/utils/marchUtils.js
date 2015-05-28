"use strict"

/**
 * Created by modun on 14/12/12.
 */

var ShortId = require("shortid")
var _ = require("underscore")
var Promise = require("bluebird")

var DataUtils = require("./dataUtils")
var Consts = require("../consts/consts")
var Define = require("../consts/define")
var LogicUtils = require("./logicUtils")

var GameDatas = require("../datas/GameDatas")
var AllianceInitData = GameDatas.AllianceInitData
var PlayerInitData = GameDatas.PlayerInitData
var DragonEquipments = GameDatas.DragonEquipments
var Items = GameDatas.Items
var Vip = GameDatas.Vip

var Utils = module.exports

var AllianceMapSize = {
	width:AllianceInitData.intInit.allianceRegionMapWidth.value,
	height:AllianceInitData.intInit.allianceRegionMapHeight.value
}

/**
 * 获取距离
 * @param fromAllianceDoc
 * @param fromLocation
 * @param toAllianceDoc
 * @param toLocation
 * @returns {number}
 */
var getAllianceLocationDistance = function(fromAllianceDoc, fromLocation, toAllianceDoc, toLocation){
	var width = 0
	var height = 0

	var getDistance = function(width, height){
		return Math.ceil(Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)))
	}

	if(fromAllianceDoc == toAllianceDoc){
		width = Math.abs(fromLocation.x - toLocation.x)
		height = Math.abs(fromLocation.y - toLocation.y)
		return getDistance(width, height)
	}

	if(_.isEqual(fromAllianceDoc._id, fromAllianceDoc.allianceFight.attackAllianceId)){
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Left)){
			width = AllianceMapSize.width - fromLocation.x + toLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getDistance(width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Right)){
			width = AllianceMapSize.width - toLocation.x + fromLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getDistance(width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Top)){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - fromLocation.y + toLocation.y
			return getDistance(width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Bottom)){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - toLocation.y + fromLocation.y
			return getDistance(width, height)
		}
		return 0
	}else{
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Left)){
			width = AllianceMapSize.width - toLocation.x + fromLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getDistance(width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Right)){
			width = AllianceMapSize.width - fromLocation.x + toLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getDistance(width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Top)){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - toLocation.y + fromLocation.y
			return getDistance(width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergeStyle.Bottom)){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - fromLocation.y + toLocation.y
			return getDistance(width, height)
		}
		return 0
	}
}

/**
 * 获取按战斗力排序后的兵力信息
 * @param playerDoc
 * @param soldiers
 * @returns {*}
 */
var getSortedSoldiers = function(playerDoc, soldiers){
	var sortedSoldiers = _.sortBy(soldiers, function(soldier){
		var config = DataUtils.getPlayerSoldierConfig(playerDoc, soldier.name)
		return -config.power * soldier.count
	})
	return sortedSoldiers
}

/**
 * 创建行军事件中联盟信息数据
 * @param allianceDoc
 * @returns {{id: *, name: *, tag: *}}
 */
var createAllianceData = function(allianceDoc){
	var allianceData = {
		id:allianceDoc._id,
		name:allianceDoc.basicInfo.name,
		tag:allianceDoc.basicInfo.tag
	}
	return allianceData
}

/**
 * 创建进攻行军事件中进攻玩家信息
 * @param allianceDoc
 * @param playerDoc
 * @param playerLocation
 * @param dragon
 * @param soldiers
 * @returns {*}
 */
var createAttackPlayerData = function(allianceDoc, playerDoc, playerLocation, dragon, soldiers){
	_.each(soldiers, function(soldier){
		soldier.star = playerDoc.soldierStars[soldier.name]
	})
	var playerData = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		location:playerLocation,
		dragon:{
			type:dragon.type
		},
		soldiers:getSortedSoldiers(playerDoc, soldiers),
		alliance:createAllianceData(allianceDoc)
	}
	return playerData
}

/**
 * 创建进攻回城行军事件中进攻玩家信息
 * @param allianceDoc
 * @param playerDoc
 * @param playerLocation
 * @param dragon
 * @param soldiers
 * @param woundedSoldiers
 * @param rewards
 * @returns {*}
 */
var createAttackPlayerReturnData = function(allianceDoc, playerDoc, playerLocation, dragon, soldiers, woundedSoldiers, rewards){
	_.each(soldiers, function(soldier){
		soldier.star = playerDoc.soldierStars[soldier.name]
	})
	var playerData = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		location:playerLocation,
		dragon:{
			type:dragon.type
		},
		soldiers:getSortedSoldiers(playerDoc, soldiers),
		alliance:createAllianceData(allianceDoc),
		woundedSoldiers:woundedSoldiers,
		rewards:rewards
	}
	return playerData
}

/**
 * 创建突袭行军事件中进攻玩家个人信息
 * @param allianceDoc
 * @param playerDoc
 * @param playerLocation
 * @param dragon
 * @returns {*}
 */
var createStrikePlayerData = function(allianceDoc, playerDoc, playerLocation, dragon){
	var playerData = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		location:playerLocation,
		dragon:{
			type:dragon.type
		},
		alliance:createAllianceData(allianceDoc)
	}
	return playerData
}

/**
 * 创建突袭回城行军事件中进攻玩家信息
 * @param allianceDoc
 * @param playerDoc
 * @param playerLocation
 * @param dragon
 * @returns {*}
 */
var createStrikePlayerReturnData = function(allianceDoc, playerDoc, playerLocation, dragon){
	var playerData = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		location:playerLocation,
		dragon:{
			type:dragon.type
		},
		alliance:createAllianceData(allianceDoc)
	}
	return playerData
}

/**
 * 获取玩家士兵行军时间
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param fromAllianceDoc
 * @param fromLocation
 * @param toAllianceDoc
 * @param toLocation
 */
var getPlayerSoldiersMarchTime = function(playerDoc, dragon, soldiers, fromAllianceDoc, fromLocation, toAllianceDoc, toLocation){
	var distance = getAllianceLocationDistance(fromAllianceDoc, fromLocation, toAllianceDoc, toLocation)
	var baseSpeed = 2000
	var totalSpeed = 0
	var totalCount = 0
	_.each(soldiers, function(soldier){
		var equipmentBuff = 0
		var soldierConfig = DataUtils.getPlayerSoldierConfig(playerDoc, soldier.name)
		var soldierType = soldierConfig.type
		var equipmentBuffKey = soldierType + "MarchAdd"
		_.each(dragon.equipments, function(equipment){
			_.each(equipment.buffs, function(key){
				if(_.isEqual(key, equipmentBuffKey)){
					equipmentBuff += DragonEquipments.equipmentBuff[equipmentBuffKey].buffEffect
				}
			})
		})
		var config = DataUtils.getPlayerSoldierConfig(playerDoc, soldier.name)
		var count = soldier.count
		totalCount += count
		totalSpeed += baseSpeed / config.march * count * (1 + equipmentBuff)
	})
	var itemBuff = DataUtils.isPlayerHasItemEvent(playerDoc, "marchSpeedBonus") ? Items.buffTypes["marchSpeedBonus"].effect1 : 0
	var vipBuff = Vip.level[playerDoc.vipEvents.length > 0 ? DataUtils.getPlayerVipLevel(playerDoc) : 0].marchSpeedAdd
	var time = Math.ceil(totalSpeed / totalCount * distance * 1000)
	time = LogicUtils.getTimeEfffect(time, itemBuff + vipBuff)
	return time//5 * 1000
}

/**
 * 获取玩家龙的行军时间
 * @param playerDoc
 * @param dragon
 * @param fromAllianceDoc
 * @param fromLocation
 * @param toAllianceDoc
 * @param toLocation
 * @returns {number}
 */
var getPlayerDragonMarchTime = function(playerDoc, dragon, fromAllianceDoc, fromLocation, toAllianceDoc, toLocation){
	var distance = getAllianceLocationDistance(fromAllianceDoc, fromLocation, toAllianceDoc, toLocation)
	var baseSpeed = 2000
	var marchSpeed = PlayerInitData.intInit.dragonMarchSpeed.value
	var time = Math.ceil(baseSpeed / marchSpeed * distance * 1000)
	return time//5 * 1000
}


/**
 * 创建联盟圣地行军事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param shrineEventId
 * @returns {*}
 */
Utils.createAttackAllianceShrineMarchEvent = function(allianceDoc, playerDoc, dragon, soldiers, shrineEventId){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var shrineMapId = DataUtils.getAllianceBuildingByName(allianceDoc, Consts.AllianceBuildingNames.Shrine).id
	var shrineLocation = LogicUtils.getAllianceMapObjectById(allianceDoc, shrineMapId).location
	var marchTime = getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, allianceDoc, playerLocation, allianceDoc, shrineLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.Shrine,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerData(allianceDoc, playerDoc, playerLocation, dragon, soldiers),
		defenceShrineData:{
			shrineEventId:shrineEventId,
			location:shrineLocation,
			alliance:createAllianceData(allianceDoc)
		}
	}
	return event
}

/**
 * 玩家从圣地回城事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param woundedSoldiers
 * @param rewards
 * @returns {*}
 */
Utils.createAttackAllianceShrineMarchReturnEvent = function(allianceDoc, playerDoc, dragon, soldiers, woundedSoldiers, rewards){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var shrineMapId = DataUtils.getAllianceBuildingByName(allianceDoc, Consts.AllianceBuildingNames.Shrine).id
	var shrineLocation = LogicUtils.getAllianceMapObjectById(allianceDoc, shrineMapId).location
	var marchTime = _.isEmpty(soldiers) ? getPlayerDragonMarchTime(playerDoc, dragon, allianceDoc, shrineLocation, allianceDoc, playerLocation)
		: getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, allianceDoc, shrineLocation, allianceDoc, playerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.Shrine,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon, soldiers, woundedSoldiers, rewards),
		defenceShrineData:{
			location:shrineLocation,
			alliance:createAllianceData(allianceDoc)
		}
	}
	return event
}

/**
 * 创建联盟协防事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param beHelpedPlayerDoc
 * @returns {*}
 */
Utils.createHelpDefenceMarchEvent = function(allianceDoc, playerDoc, dragon, soldiers, beHelpedPlayerDoc){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var beHelpedPlayerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, beHelpedPlayerDoc._id).location
	var marchTime = getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, allianceDoc, playerLocation, allianceDoc, beHelpedPlayerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.HelpDefence,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerData(allianceDoc, playerDoc, playerLocation, dragon, soldiers),
		defencePlayerData:{
			id:beHelpedPlayerDoc._id,
			name:beHelpedPlayerDoc.basicInfo.name,
			location:beHelpedPlayerLocation,
			alliance:createAllianceData(allianceDoc)
		}
	}
	return event
}

/**
 * 创建玩家协助防御回城事件
 * @param allianceDoc
 * @param playerDoc
 * @param beHelpedPlayerDoc
 * @param dragon
 * @param soldiers
 * @param woundedSoldiers
 * @param rewards
 * @returns {*}
 */
Utils.createHelpDefenceMarchReturnEvent = function(allianceDoc, playerDoc, beHelpedPlayerDoc, dragon, soldiers, woundedSoldiers, rewards){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var beHelpedPlayerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, beHelpedPlayerDoc._id).location
	var marchTime = _.isEmpty(soldiers) ? getPlayerDragonMarchTime(playerDoc, dragon, allianceDoc, beHelpedPlayerLocation, allianceDoc, playerLocation)
		: getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, allianceDoc, beHelpedPlayerLocation, allianceDoc, playerLocation)
	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.HelpDefence,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon, soldiers, woundedSoldiers, rewards),
		defencePlayerData:{
			id:beHelpedPlayerDoc._id,
			name:beHelpedPlayerDoc.basicInfo.name,
			location:beHelpedPlayerLocation,
			alliance:createAllianceData(allianceDoc)
		}
	}
	return event
}

/**
 * 创建突袭玩家城市行军事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @returns {*}
 */
Utils.createStrikePlayerCityMarchEvent = function(allianceDoc, playerDoc, dragon, defenceAllianceDoc, defencePlayerDoc){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var defencePlayerLocation = LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location
	var marchTime = getPlayerDragonMarchTime(playerDoc, dragon, allianceDoc, playerLocation, defenceAllianceDoc, defencePlayerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.City,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createStrikePlayerData(allianceDoc, playerDoc, playerLocation, dragon),
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:defencePlayerLocation,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建突袭玩家城市回城行军事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @returns {*}
 */
Utils.createStrikePlayerCityMarchReturnEvent = function(allianceDoc, playerDoc, dragon, defenceAllianceDoc, defencePlayerDoc){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var defencePlayerLocation = LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location
	var marchTime = getPlayerDragonMarchTime(playerDoc, dragon, defenceAllianceDoc, defencePlayerLocation, allianceDoc, playerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.City,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createStrikePlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon),
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:defencePlayerLocation,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建进攻玩家城市行军事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @returns {*}
 */
Utils.createAttackPlayerCityMarchEvent = function(allianceDoc, playerDoc, dragon, soldiers, defenceAllianceDoc, defencePlayerDoc){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var defencePlayerLocation = LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location
	var marchTime = getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, allianceDoc, playerLocation, defenceAllianceDoc, defencePlayerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.City,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerData(allianceDoc, playerDoc, playerLocation, dragon, soldiers),
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:defencePlayerLocation,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建进攻玩家城市行军回城事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param woundedSoldiers
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @param rewards
 * @returns {*}
 */
Utils.createAttackPlayerCityMarchReturnEvent = function(allianceDoc, playerDoc, dragon, soldiers, woundedSoldiers, defenceAllianceDoc, defencePlayerDoc, rewards){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var defencePlayerLocation = LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location
	var marchTime = _.isEmpty(soldiers) ? getPlayerDragonMarchTime(playerDoc, dragon, defenceAllianceDoc, defencePlayerLocation, allianceDoc, playerLocation)
		: getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, defenceAllianceDoc, defencePlayerLocation, allianceDoc, playerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.City,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon, soldiers, woundedSoldiers, rewards),
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:defencePlayerLocation,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建进攻联盟村落行军事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @returns {*}
 */
Utils.createAttackVillageMarchEvent = function(allianceDoc, playerDoc, dragon, soldiers, defenceAllianceDoc, defenceVillage){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var defenceVillageLocation = LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, defenceVillage.id).location
	var marchTime = getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, allianceDoc, playerLocation, defenceAllianceDoc, defenceVillageLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.Village,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerData(allianceDoc, playerDoc, playerLocation, dragon, soldiers),
		defenceVillageData:{
			id:defenceVillage.id,
			name:defenceVillage.name,
			level:defenceVillage.level,
			location:defenceVillageLocation,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建进攻联盟村落回城事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param woundedSoldiers
 * @param defenceAllianceDoc
 * @param defenceVillageData
 * @param rewards
 * @returns {*}
 */
Utils.createAttackVillageMarchReturnEvent = function(allianceDoc, playerDoc, dragon, soldiers, woundedSoldiers, defenceAllianceDoc, defenceVillageData, rewards){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var marchTime = _.isEmpty(soldiers) ? getPlayerDragonMarchTime(playerDoc, dragon, defenceAllianceDoc, defenceVillageData.location, allianceDoc, playerLocation)
		: getPlayerSoldiersMarchTime(playerDoc, dragon, soldiers, defenceAllianceDoc, defenceVillageData.location, allianceDoc, playerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.Village,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon, soldiers, woundedSoldiers, rewards),
		defenceVillageData:{
			id:defenceVillageData.id,
			name:defenceVillageData.name,
			level:defenceVillageData.level,
			location:defenceVillageData.location,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建突袭联盟村落行军事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @returns {*}
 */
Utils.createStrikeVillageMarchEvent = function(allianceDoc, playerDoc, dragon, defenceAllianceDoc, defenceVillage){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var defenceVillageLocation = LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, defenceVillage.id).location
	var marchTime = getPlayerDragonMarchTime(playerDoc, dragon, allianceDoc, playerLocation, defenceAllianceDoc, defenceVillageLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.Village,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createStrikePlayerData(allianceDoc, playerDoc, playerLocation, dragon),
		defenceVillageData:{
			id:defenceVillage.id,
			name:defenceVillage.name,
			level:defenceVillage.level,
			location:defenceVillageLocation,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建突袭联盟村落回城事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param defenceAllianceDoc
 * @param defenceVillageData
 * @returns {*}
 */
Utils.createStrikeVillageMarchReturnEvent = function(allianceDoc, playerDoc, dragon, defenceAllianceDoc, defenceVillageData){
	var playerLocation = LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location
	var marchTime = getPlayerDragonMarchTime(playerDoc, dragon, defenceAllianceDoc, defenceVillageData.location, allianceDoc, playerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.MarchType.Village,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createStrikePlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon),
		defenceVillageData:{
			id:defenceVillageData.id,
			name:defenceVillageData.type,
			level:defenceVillageData.level,
			location:defenceVillageData.location,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}
	return event
}

/**
 * 创建采集联盟村落事件
 * @param allianceDoc
 * @param playerDoc
 * @param dragon
 * @param soldiers
 * @param woundedSoldiers
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @param rewards
 * @returns {*}
 */
Utils.createAllianceVillageEvent = function(allianceDoc, playerDoc, dragon, soldiers, woundedSoldiers, defenceAllianceDoc, defenceVillage, rewards){
	var soldiersTotalLoad = DataUtils.getPlayerSoldiersTotalLoad(playerDoc, soldiers)
	var collectInfo = DataUtils.getPlayerCollectResourceInfo(playerDoc, soldiersTotalLoad, defenceVillage)
	var event = {
		id:ShortId.generate(),
		startTime:Date.now(),
		finishTime:Date.now() + collectInfo.collectTime,
		playerData:{
			id:playerDoc._id,
			name:playerDoc.basicInfo.name,
			location:LogicUtils.getAllianceMemberMapObjectById(allianceDoc, playerDoc._id).location,
			alliance:createAllianceData(allianceDoc),
			dragon:{
				type:dragon.type
			},
			soldiers:soldiers,
			woundedSoldiers:woundedSoldiers,
			rewards:rewards
		},
		villageData:{
			id:defenceVillage.id,
			name:defenceVillage.name,
			level:defenceVillage.level,
			resource:defenceVillage.resource,
			collectTotal:collectInfo.collectTotal,
			location:LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, defenceVillage.id).location,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}

	var data = {
		event:event,
		soldiersTotalLoad:soldiersTotalLoad,
		collectTime:collectInfo.collectTime,
		collectTotal:collectInfo.collectTotal
	}
	return data
}