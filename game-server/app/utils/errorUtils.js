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