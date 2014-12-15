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
var AllianceInit = GameDatas.AllianceInitData
var UnitConfig = GameDatas.UnitsConfig

var Utils = module.exports

var AllianceMapSize = {
	width:AllianceInit.intInit.allianceRegionMapWidth.value,
	height:AllianceInit.intInit.allianceRegionMapHeight
}

/**
 * 获取距离
 * @param width
 * @param height
 * @returns {number}
 */
var getDistance = function(width, height){
	return Math.ceil(Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)))
}
/**
 * 获取行军时间
 * @param playerDoc
 * @param width
 * @param height
 * @returns {number}
 */
var getMarchTime = function(playerDoc, width, height){
	var distance = getDistance(width, height)
	var time = AllianceInit.intInit.allianceRegionMapBaseTimePerGrid.value * distance * 1000
	return 5 * 1000
}

/**
 * 获取按战斗力排序后的兵力信息
 * @param playerDoc
 * @param soldiers
 * @returns {*}
 */
var getSortedSoldiers = function(playerDoc, soldiers){
	var config = null
	var sortedSoldiers = _.sortBy(soldiers, function(soldier){
		if(DataUtils.hasNormalSoldier(soldier.name)){
			var soldierFullKey = soldier.name + "_" + 1
			config = UnitConfig.normal[soldierFullKey]
			return - config.power * soldier.count
		}else{
			config = UnitConfig.special[soldierName]
			return - config.power * soldier.count
		}
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

var createAttackPlayerData = function(allianceDoc, playerDoc, playerLocation, dragon, soldiers){
	var playerData = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		cityName:playerDoc.basicInfo.cityName,
		location:playerLocation,
		dragon:{
			type:dragon.type
		},
		soldiers:getSortedSoldiers(playerDoc, soldiers),
		alliance:createAllianceData(allianceDoc)
	}
	return playerData
}

var createAttackPlayerReturnData = function(allianceDoc, playerDoc, playerLocation, dragon, dragonExpAdd, soldiers, woundedSoldiers, rewards, kill){
	var playerData = {
		id:playerDoc._id,
		name:playerDoc.basicInfo.name,
		cityName:playerDoc.basicInfo.cityName,
		location:playerLocation,
		dragon:{
			type:dragon.type,
			expAdd:dragonExpAdd
		},
		soldiers:getSortedSoldiers(playerDoc, soldiers),
		alliance:createAllianceData(allianceDoc),
		woundedSoldiers:woundedSoldiers,
		rewards:rewards,
		kill:kill
	}
	return playerData
}

var createStrikePlayerData = function(){

}

/**
 * 获取玩家行军时间
 * @param playerDoc
 * @param fromAllianceDoc
 * @param fromLocation
 * @param toAllianceDoc
 * @param toLocation
 */
Utils.getPlayerMarchTime = function(playerDoc, fromAllianceDoc, fromLocation, toAllianceDoc, toLocation){
	var width = 0
	var height = 0

	if(fromAllianceDoc == toAllianceDoc){
		width = Math.abs(fromLocation.x - toLocation.x)
		height = Math.abs(fromLocation.y - toLocation.y)
		return getMarchTime(playerDoc, width, height)
	}

	if(_.isEqual(fromAllianceDoc._id, fromAllianceDoc.allianceFight.activeBy)){
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[0])){
			width = AllianceMapSize.width - fromLocation.x + toLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getMarchTime(playerDoc, width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[1])){
			width = AllianceMapSize.width - toLocation.x + fromLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getMarchTime(playerDoc, width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[2])){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - fromLocation.y + toLocation.y
			return getMarchTime(playerDoc, width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[3])){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - toLocation.y + fromLocation.y
			return getMarchTime(playerDoc, width, height)
		}
	}else{
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[0])){
			width = AllianceMapSize.width - toLocation.x + fromLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getMarchTime(playerDoc, width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[1])){
			width = AllianceMapSize.width - fromLocation.x + toLocation.x
			height = Math.abs(fromLocation.y - toLocation.y)
			return getMarchTime(playerDoc, width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[2])){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - toLocation.y + fromLocation.y
			return getMarchTime(playerDoc, width, height)
		}
		if(_.isEqual(fromAllianceDoc.allianceFight.mergeStyle, Consts.AllianceMergePosition[3])){
			width = Math.abs(fromLocation.x - toLocation.x)
			height = AllianceMapSize.height - fromLocation.y + toLocation.y
			return getMarchTime(playerDoc, width, height)
		}
	}

	return 0
}

/**
 * 创建联盟圣地行军事件
 * @param playerDoc
 * @param allianceDoc
 * @param shrineEventId
 * @param dragon
 * @param soldiers
 * @returns {*}
 */
Utils.createAllianceShrineMarchEvent = function(playerDoc, allianceDoc, shrineEventId, dragon, soldiers){
	var playerLocation = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var shrineLocation = allianceDoc.buildings["shrine"].location
	var marchTime = this.getPlayerMarchTime(playerDoc, allianceDoc, playerLocation, allianceDoc, shrineLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.AllianceMarchType.Shrine,
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
 * @param playerDoc
 * @param allianceDoc
 * @param dragon
 * @param dragonExpAdd
 * @param soldiers
 * @param woundedSoldiers
 * @param rewards
 * @param kill
 * @returns {*}
 */
Utils.createAllianceShrineMarchReturnEvent = function(playerDoc, allianceDoc, dragon, dragonExpAdd, soldiers, woundedSoldiers, rewards, kill){
	var playerLocation = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var shrineLocation = allianceDoc.buildings["shrine"].location
	var marchTime = this.getPlayerMarchTime(playerDoc, allianceDoc, shrineLocation, allianceDoc, playerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.AllianceMarchType.Shrine,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon, dragonExpAdd, soldiers, woundedSoldiers, rewards, kill),
		defenceShrineData:{
			location:shrineLocation,
			alliance:createAllianceData(allianceDoc)
		}
	}
	return event
}

/**
 * 创建联盟协防事件
 * @param playerDoc
 * @param allianceDoc
 * @param dragon
 * @param soldiers
 * @param beHelpedPlayerDoc
 * @returns {*}
 */
Utils.createHelpDefenceMarchEvent = function(playerDoc, allianceDoc, dragon, soldiers, beHelpedPlayerDoc){
	var playerLocation = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var beHelpedPlayerLocation = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerDoc._id).location
	var marchTime = this.getPlayerMarchTime(playerDoc, allianceDoc, playerLocation, allianceDoc, beHelpedPlayerLocation)

	var event = {
		id:ShortId.generate(),
		marchType:Consts.AllianceMarchType.HelpDefence,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerData(allianceDoc, playerDoc, playerLocation, dragon, soldiers),
		beHelpedPlayerData:{
			id:beHelpedPlayerDoc._id,
			name:beHelpedPlayerDoc.basicInfo.name,
			cityName:beHelpedPlayerDoc.basicInfo.cityName,
			location:beHelpedPlayerLocation,
			alliance:createAllianceData(allianceDoc)
		}
	}
	return event
}

/**
 * 创建玩家协助防御回城事件
 * @param playerDoc
 * @param beHelpedPlayerDoc
 * @param allianceDoc
 * @param dragon
 * @param dragonExpAdd
 * @param soldiers
 * @param woundedSoldiers
 * @param rewards
 * @param kill
 * @returns {*}
 */
Utils.createAllianceHelpFightMarchReturnEvent = function(playerDoc, beHelpedPlayerDoc, allianceDoc, dragon, dragonExpAdd, soldiers, woundedSoldiers, rewards, kill){
	var beHelpedPlayerLocation = LogicUtils.getAllianceMemberById(allianceDoc, beHelpedPlayerDoc._id).location
	var playerLocation = LogicUtils.getAllianceMemberById(allianceDoc, playerDoc._id).location
	var marchTime = DataUtils.getPlayerMarchTime(playerDoc, allianceDoc, beHelpedPlayerLocation, allianceDoc, playerLocation)
	var event = {
		id:ShortId.generate(),
		marchType:Consts.AllianceMarchType.HelpDefence,
		startTime:Date.now(),
		arriveTime:Date.now() + marchTime,
		attackPlayerData:createAttackPlayerReturnData(allianceDoc, playerDoc, playerLocation, dragon, dragonExpAdd, soldiers, woundedSoldiers, rewards, kill),
		beHelpedPlayerData:{
			id:beHelpedPlayerDoc._id,
			name:beHelpedPlayerDoc.basicInfo.name,
			cityName:beHelpedPlayerDoc.basicInfo.cityName,
			location:beHelpedPlayerLocation,
			alliance:createAllianceData(allianceDoc)
		}
	}
	return event
}