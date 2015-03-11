"use strict"

/**
 * Created by modun on 15/3/4.
 */

var util = require('util')
var _ = require("underscore")
var GameDatas = require("../datas/GameDatas")
var Errors = GameDatas.Errors.errors


var CustomError = function(code, message){
	Error.call(this)
	Error.captureStackTrace(this, CustomError)
	this.code = code
	this.name = "CustomError"
	this.message = message
}
util.inherits(CustomError, Error)

var Utils = module.exports

var CreateError = function(config, params){
	var code = config.code
	var message = config.message
	if(_.isObject(params)) message += " : " + JSON.stringify(params)
	return new CustomError(code, message)
}

/**
 * 修复错误信息
 * @param e
 */
Utils.getError = function(e){
	return {code:_.isNumber(e.code) ? e.code : 500, message:e.message}
}

/**
 * 设备不存在
 * @param deviceId
 */
Utils.deviceNotExist = function(deviceId){
	var config = Errors.deviceNotExist
	return CreateError(config, {deviceId:deviceId})
}

/**
 * 用户不存在
 * @param userId
 */
Utils.userNotExist = function(userId){
	var config = Errors.userNotExist
	return CreateError(config, {userId:userId})
}

/**
 * 没有激活的玩家Id
 * @param deviceId
 * @param userId
 */
Utils.noActivePlayerId = function(deviceId, userId){
	var config = Errors.noActivePlayerId
	return CreateError(config, {deviceId:deviceId, userId:userId})
}

/**
 * 玩家不存在
 * @param playerId
 */
Utils.playerNotExist = function(playerId){
	var config = Errors.playerNotExist
	return CreateError(config, {playerId:playerId})
}

/**
 * 玩家不存在于mongo数据库
 * @param deviceId
 */
Utils.playerNotExistInMongo = function(deviceId){
	var config = Errors.playerNotExistInMongo
	return CreateError(config, {deviceId:deviceId})
}

/**
 * 对象被锁定
 * @param objectType
 * @param objectId
 */
Utils.objectIsLocked = function(objectType, objectId){
	var config = Errors.objectIsLocked
	return CreateError(config, {objectType:objectType, objectId:objectId})
}

/**
 * 需要重新登录
 * @param playerId
 */
Utils.reLoginNeeded = function(playerId){
	var config = Errors.reLoginNeeded
	return CreateError(config, {playerId:playerId})
}

/**
 * 玩家已经登录
 * @param playerDoc
 */
Utils.playerAlreadyLogin = function(playerDoc){
	var config = Errors.playerAlreadyLogin
	var error = CreateError(config, {playerId:playerDoc._id})
	error.data = playerDoc
	return error
}

/**
 * 联盟不存在
 * @param allianceId
 */
Utils.allianceNotExist = function(allianceId){
	var config = Errors.allianceNotExist
	return CreateError(config, {allianceId:allianceId})
}

/**
 * 服务器维护中
 * @returns {CreateError}
 */
Utils.serverUnderMaintain = function(){
	var config = Errors.serverUnderMaintain
	return CreateError(config, {})
}

/**
 * 建筑不存在
 * @param playerId
 * @param buildingLocation
 */
Utils.buildingNotExist = function(playerId, buildingLocation){
	var config = Errors.buildingNotExist
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 建筑正在升级
 * @param playerId
 * @param buildingLocation
 */
Utils.buildingUpgradingNow = function(playerId, buildingLocation){
	var config = Errors.buildingUpgradingNow
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 建筑坑位不合法
 * @param playerId
 * @param buildingLocation
 */
Utils.buildingLocationNotLegal = function(playerId, buildingLocation){
	var config = Errors.buildingLocationNotLegal
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 建造数量已达建造上限
 * @param playerId
 * @param buildingLocation
 */
Utils.buildingCountReachUpLimit = function(playerId, buildingLocation){
	var config = Errors.buildingCountReachUpLimit
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 建筑已达到最高等级
 * @param playerId
 * @param buildingLocation
 */
Utils.buildingLevelReachUpLimit = function(playerId, buildingLocation){
	var config = Errors.buildingLevelReachUpLimit
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 升级前置条件未满足
 * @param playerId
 * @param buildingLocation
 */
Utils.buildingUpgradePrefixNotMatch = function(playerId, buildingLocation){
	var config = Errors.buildingUpgradePrefixNotMatch
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 宝石不足
 * @param playerId
 */
Utils.gemNotEnough = function(playerId){
	var config = Errors.gemNotEnough
	return CreateError(config, {playerId:playerId})
}

/**
 * 只有生产建筑才能转换
 * @param playerId
 * @param buildingLocation
 */
Utils.onlyProductionBuildingCanSwitch = function(playerId, buildingLocation){
	var config = Errors.onlyProductionBuildingCanSwitch
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 小屋数量过多
 * @param playerId
 * @param buildingLocation
 */
Utils.houseTooMuchMore = function(playerId, buildingLocation){
	var config = Errors.houseTooMuchMore
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 主体建筑必须大于等于1级
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 */
Utils.hostBuildingLevelMustBiggerThanOne = function(playerId, buildingLocation, houseLocation){
	var config = Errors.hostBuildingLevelMustBiggerThanOne
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation})
}

/**
 * 小屋类型不存在
 * @param playerId
 * @param houseLocation
 * @param houseType
 */
Utils.houseTypeNotExist = function(playerId, houseLocation, houseType){
	var config = Errors.houseTypeNotExist
	return CreateError(config, {playerId:playerId, houseLocation:houseLocation, houseType:houseType})
}

/**
 * 小屋数量超过限制
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param houseType
 */
Utils.houseCountTooMuchMore = function(playerId, buildingLocation, houseLocation, houseType){
	var config = Errors.houseCountTooMuchMore
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation, houseType:houseType})
}

/**
 * 建筑周围不允许建造小屋
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param houseType
 */
Utils.buildingNotAllowHouseCreate = function(playerId, buildingLocation, houseLocation, houseType){
	var config = Errors.buildingNotAllowHouseCreate
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation, houseType:houseType})
}

/**
 * 小屋坑位不合法
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 */
Utils.houseLocationNotLegal = function(playerId, buildingLocation, houseLocation){
	var config = Errors.houseLocationNotLegal
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation})
}

/**
 * 建造小屋会造成可用城民小于0
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 */
Utils.noEnoughCitizenToCreateHouse = function(playerId, buildingLocation, houseLocation){
	var config = Errors.noEnoughCitizenToCreateHouse
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation})
}

/**
 * 小屋升级前置条件未满足
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param houseType
 */
Utils.houseUpgradePrefixNotMatch = function(playerId, buildingLocation, houseLocation, houseType){
	var config = Errors.houseUpgradePrefixNotMatch
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation, houseType:houseType})
}

/**
 * 小屋不存在
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 */
Utils.houseNotExist = function(playerId, buildingLocation, houseLocation){
	var config = Errors.houseNotExist
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation})
}

/**
 * 小屋正在升级
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 */
Utils.houseUpgradingNow = function(playerId, buildingLocation, houseLocation){
	var config = Errors.houseUpgradingNow
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation})
}

/**
 * 小屋达到最高等级
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 */
Utils.houseReachMaxLevel = function(playerId, buildingLocation, houseLocation){
	var config = Errors.houseReachMaxLevel
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLoation:houseLocation})
}

/**
 * 升级小屋会造成可用城民小于0
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 */
Utils.noEnoughCitizenToUpgradeHouse = function(playerId, buildingLocation, houseLocation){
	var config = Errors.noEnoughCitizenToUpgradeHouse
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation, houseLocation:houseLocation})
}

/**
 * 玩家事件不存在
 * @param playerId
 * @param eventType
 * @param eventId
 */
Utils.playerEventNotExist = function(playerId, eventType, eventId){
	var config = Errors.playerEventNotExist
	return CreateError(config, {playerId:playerId, eventType:eventType, eventId:eventId})
}

/**
 * 还不能进行免费加速
 * @param playerId
 * @param eventType
 * @param eventId
 */
Utils.canNotFreeSpeedupNow = function(playerId, eventType, eventId){
	var config = Errors.canNotFreeSpeedupNow
	return CreateError(config, {playerId:playerId, eventType:eventType, eventId:eventId})
}

/**
 * 建筑还未建造
 * @param playerId
 * @param buildingLocation
 */
Utils.buildingNotBuild = function(playerId, buildingLocation){
	var config = Errors.buildingNotBuild
	return CreateError(config, {playerId:playerId, buildingLocation:buildingLocation})
}

/**
 * 同类型的材料正在制造
 * @param playerId
 * @param category
 */
Utils.materialAsSameTypeIsMakeNow = function(playerId, category){
	var config = Errors.materialAsSameTypeIsMakeNow
	return CreateError(config, {playerId:playerId, category:category})
}

/**
 * 同类型的材料制作完成后还未领取
 * @param playerId
 * @param category
 */
Utils.materialMakeFinishedButNotTakeAway = function(playerId, category){
	var config = Errors.materialMakeFinishedButNotTakeAway
	return CreateError(config, {playerId:playerId, category:category})
}

/**
 * 不同类型的材料正在制造
 * @param playerId
 * @param category
 */
Utils.materialAsDifferentTypeIsMakeNow = function(playerId, category){
	var config = Errors.materialAsDifferentTypeIsMakeNow
	return CreateError(config, {playerId:playerId, category:category})
}

/**
 * 材料事件不存在或者正在制作
 * @param playerId
 * @param eventId
 */
Utils.materialEventNotExistOrIsMakeing = function(playerId, eventId){
	var config = Errors.materialEventNotExistOrIsMakeing
	return CreateError(config, {playerId:playerId, eventId:eventId})
}

/**
 * 已有士兵正在被招募
 * @param playerId
 * @param soldierName
 * @param count
 */
Utils.soldiersAreRecruitingNow = function(playerId, soldierName, count){
	var config = Errors.soldiersAreRecruitingNow
	return CreateError(config, {playerId:playerId, soldierName:soldierName, count:count})
}

/**
 * 招募数量超过单次招募上限
 * @param playerId
 * @param soldierName
 * @param count
 */
Utils.recruitTooMuchOnce = function(playerId, soldierName, count){
	var config = Errors.recruitTooMuchOnce
	return CreateError(config, {playerId:playerId, soldierName:soldierName, count:count})
}

/**
 * 士兵招募材料不足
 * @param playerId
 * @param soldierName
 * @param count
 */
Utils.soldierRecruitMaterialsNotEnough = function(playerId, soldierName, count){
	var config = Errors.soldierRecruitMaterialsNotEnough
	return CreateError(config, {playerId:playerId, soldierName:soldierName, count:count})
}

/**
 * 龙装备制造事件已存在
 * @param playerId
 * @param equipmentName
 */
Utils.dragonEquipmentEventsExist = function(playerId, equipmentName){
	var config = Errors.dragonEquipmentEventsExist
	return CreateError(config, {playerId:playerId, equipmentName:equipmentName})
}

/**
 * 制作龙装备材料不足
 * @param playerId
 * @param equipmentName
 */
Utils.dragonEquipmentMaterialsNotEnough = function(playerId, equipmentName){
	var config = Errors.dragonEquipmentMaterialsNotEnough
	return CreateError(config, {playerId:playerId, equipmentName:equipmentName})
}

/**
 * 士兵不存在或士兵数量不合法
 * @param playerId
 * @param soldiers
 */
Utils.soldierNotExistOrCountNotLegal = function(playerId, soldiers){
	var config = Errors.soldierNotExistOrCountNotLegal
	return CreateError(config, {playerId:playerId, soldiers:soldiers})
}

/**
 * 士兵质量事件已存在
 * @param playerId
 * @param soldiers
 */
Utils.soldierTreatEventExist = function(playerId, soldiers){
	var config = Errors.soldierTreatEventExist
	return CreateError(config, {playerId:playerId, soldiers:soldiers})
}

/**
 * 龙蛋早已成功孵化
 * @param playerId
 * @param dragonType
 */
Utils.dragonEggAlreadyHatched = function(playerId, dragonType){
	var config = Errors.dragonEggAlreadyHatched
	return CreateError(config, {playerId:playerId, dragonType:dragonType})
}

/**
 * 龙蛋孵化事件已存在
 * @param playerId
 * @param dragonType
 */
Utils.dragonEggHatchEventExist = function(playerId, dragonType){
	var config = Errors.dragonEggHatchEventExist
	return CreateError(config, {playerId:playerId, dragonType:dragonType})
}

/**
 * 龙还未孵化
 * @param playerId
 * @param dragonType
 */
Utils.dragonNotHatched = function(playerId, dragonType){
	var config = Errors.dragonNotHatched
	return CreateError(config, {playerId:playerId, dragonType:dragonType})
}

/**
 * 装备与龙的星级不匹配
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param equipmentName
 */
Utils.dragonEquipmentNotMatchForTheDragon = function(playerId, dragonType, equipmentCategory, equipmentName){
	var config = Errors.dragonEquipmentNotMatchForTheDragon
	return CreateError(config, {playerId:playerId, dragonType:dragonType, equipmentCategory:equipmentCategory, equipmentName:equipmentName})
}

/**
 * 龙装备数量不足
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param equipmentName
 */
Utils.dragonEquipmentNotEnough = function(playerId, dragonType, equipmentCategory, equipmentName){
	var config = Errors.dragonEquipmentNotEnough
	return CreateError(config, {playerId:playerId, dragonType:dragonType, equipmentCategory:equipmentCategory, equipmentName:equipmentName})
}

/**
 * 龙身上已经存在相同类型的装备
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param equipmentName
 */
Utils.dragonAlreadyHasTheSameCategory = function(playerId, dragonType, equipmentCategory, equipmentName){
	var config = Errors.dragonAlreadyHasTheSameCategory
	return CreateError(config, {playerId:playerId, dragonType:dragonType, equipmentCategory:equipmentCategory, equipmentName:equipmentName})
}

/**
 * 此分类还没有配置装备
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 */
Utils.dragonDoNotHasThisEquipment = function(playerId, dragonType, equipmentCategory){
	var config = Errors.dragonDoNotHasThisEquipment
	return CreateError(config, {playerId:playerId, dragonType:dragonType, equipmentCategory:equipmentCategory})
}

/**
 * 装备已到最高星级
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 */
Utils.dragonEquipmentReachMaxStar = function(playerId, dragonType, equipmentCategory){
	var config = Errors.dragonEquipmentReachMaxStar
	return CreateError(config, {playerId:playerId, dragonType:dragonType, equipmentCategory:equipmentCategory})
}

/**
 * 被牺牲的装备不存在或数量不足
 * @param playerId
 * @param equipments
 */
Utils.dragonEquipmentsNotExistOrNotEnough = function(playerId, equipments){
	var config = Errors.dragonEquipmentsNotExistOrNotEnough
	return CreateError(config, {playerId:playerId, equipments:equipments})
}

/**
 * 龙技能不存在
 * @param playerId
 * @param dragonType
 * @param skillKey
 */
Utils.dragonSkillNotExist = function(playerId, dragonType, skillKey){
	var config = Errors.dragonSkillNotExist
	return CreateError(config, {playerId:playerId, dragonType:dragonType, skillKey:skillKey})
}

/**
 * 此龙技能还未解锁
 * @param playerId
 * @param dragonType
 * @param skillKey
 */
Utils.dragonSkillIsLocked = function(playerId, dragonType, skillKey){
	var config = Errors.dragonSkillIsLocked
	return CreateError(config, {playerId:playerId, dragonType:dragonType, skillKey:skillKey})
}

/**
 * 龙技能已达最高等级
 * @param playerId
 * @param dragonType
 * @param skillKey
 */
Utils.dragonSkillReachMaxLevel = function(playerId, dragonType, skillKey){
	var config = Errors.dragonSkillReachMaxLevel
	return CreateError(config, {playerId:playerId, dragonType:dragonType, skillKey:skillKey})
}

/**
 * 英雄之血不足
 * @param playerId
 * @param bloodNeed
 * @param bloodHas
 */
Utils.heroBloodNotEnough = function(playerId, bloodNeed, bloodHas){
	var config = Errors.heroBloodNotEnough
	return CreateError(config, {playerId:playerId, bloodNeed:bloodNeed, bloodHas:bloodHas})
}

/**
 * 龙的星级已达最高
 * @param playerId
 * @param dragonType
 * @param currentStar
 */
Utils.dragonReachMaxStar = function(playerId, dragonType, currentStar){
	var config = Errors.dragonReachMaxStar
	return CreateError(config, {playerId:playerId, dragonType:dragonType, currentStar:currentStar})
}

/**
 * 龙的等级未达到晋级要求
 * @param playerId
 * @param dragon
 */
Utils.dragonUpgradeStarFailedForLevelNotLegal = function(playerId, dragon){
	var config = Errors.dragonUpgradeStarFailedForLevelNotLegal
	return CreateError(config, {playerId:playerId, dragon:dragon})
}

/**
 * 龙的装备未达到晋级要求
 * @param playerId
 * @param dragon
 */
Utils.dragonUpgradeStarFailedForEquipmentNotLegal = function(playerId, dragon){
	var config = Errors.dragonUpgradeStarFailedForEquipmentNotLegal
	return CreateError(config, {playerId:playerId, dragon:dragon})
}

/**
 * 每日任务不存在
 * @param playerId
 * @param questId
 */
Utils.dailyQuestNotExist = function(playerId, questId){
	var config = Errors.dailyQuestNotExist
	return CreateError(config, {playerId:playerId, questId:questId})
}

/**
 * 每日任务已达最高星级
 * @param playerId
 * @param quest
 */
Utils.dailyQuestReachMaxStar = function(playerId, quest){
	var config = Errors.dailyQuestReachMaxStar
	return CreateError(config, {playerId:playerId, quest:quest})
}

/**
 * 每日任务事件已存在
 * @param playerId
 * @param events
 */
Utils.dailyQuestEventExist = function(playerId, events){
	var config = Errors.dailyQuestEventExist
	return CreateError(config, {playerId:playerId, events:events})
}

/**
 * 每日任务事件不存在
 * @param playerId
 * @param eventId
 * @param events
 */
Utils.dailyQuestEventNotExist = function(playerId, eventId, events){
	var config = Errors.dailyQuestEventNotExist
	return CreateError(config, {playerId:playerId, eventId:eventId, events:events})
}

/**
 * 每日任务事件还未完成
 * @param playerId
 * @param event
 */
Utils.dailyQuestEventNotFinished = function(playerId, event){
	var config = Errors.dailyQuestEventNotFinished
	return CreateError(config, {playerId:playerId, event:event})
}

/**
 * 邮件不存在
 * @param playerId
 * @param mailId
 */
Utils.mailNotExist = function(playerId, mailId){
	var config = Errors.mailNotExist
	return CreateError(config, {playerId:playerId, mailId:mailId})
}