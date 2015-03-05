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

Utils.fixError = function(error){
	if(!_.isNumber(error.code)) error.code = 500
}

Utils.commonError = function(message){
	return CustomError(500, message)
}

/**
 * 设备不存在
 * @param deviceId
 */
Utils.deviceIdNotExist = function(deviceId){
	var config = Errors.deviceIdNotExist
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
 * @param userId
 */
Utils.noActivePlayerId = function(userId){
	var config = Errors.noActivePlayerId
	return CreateError(config, {userId:userId})
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
 * 对象不存在
 * @param objectType
 * @param objectId
 */
Utils.objectIsLocked = function(objectType, objectId){
	var config = Errors.objectIsLocked
	return CreateError(config, {objectType:objectType, objectId:objectId})
}