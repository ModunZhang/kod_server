/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var utils = require("../../../utils/utils")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.playerService = this.app.get("playerService")
}

var pro = Handler.prototype

/**
 * 升级大建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeBuilding = function(msg, session, next){
	var location = msg.location
	var finishNow = msg.finishNow

	if(!_.isNumber(location)){
		next(null, {code:500, message:"location 信息不能为空"})
		return
	}
	if(!_.isBoolean(finishNow)){
		next(null, {code:500, message:"finishNow 不能为空"})
		return
	}

	this.playerService.upgradeBuildingAsync(session.uid, location, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, {code:500, message:e.message})
		console.error(e)
	})
}

/**
 * 建筑升级加速
 * @param msg
 * @param session
 * @param next
 */
pro.speedupBuildingBuild = function(msg, session, next){
	var location = msg.location

	if(!_.isNumber(location)){
		next(null, {code:500})
		return
	}

	this.playerService.speedupBuildingBuildAsync(session.uid, location).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(null, {code:500, message:e.message})
		console.error(e)
	})
}

/**
 * 创建小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.createHouse = function(msg, session, next){

}

/**
 * 升级小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeHouse = function(msg, session, next){

}

pro.speedup

/**
 * 拆除小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.destroyHouse = function(msg, session, next){

}