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
Utils.errorData = function(e){
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
 * serverUnderMaintain
 * @returns {CreateError}
 */
Utils.serverUnderMaintain = function(){
	var config = Errors.serverUnderMaintain
	return CreateError(config, {})
}