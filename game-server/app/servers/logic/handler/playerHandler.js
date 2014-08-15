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
 * 创建大建筑
 * @param msg
 * @param session
 * @param next
 */
pro.createBuilding = function(msg, session, next){
	var location = msg.location

	this.playerService.createBuildingAsync(session.uid, location).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级大建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeBuilding = function(msg, session, next){
	var location = msg.location
	var finishNow = msg.finishNow

	this.playerService.upgradeBuildingAsync(session.uid, location, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
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

	this.playerService.speedupBuildingBuildAsync(session.uid, location).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 创建小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.createHouse = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseType = msg.houseType
	var houseLocation = msg.houseLocation
	var finishNow = msg.finishNow

	this.playerService.createHouseAsync(session.uid, buildingLocation, houseType, houseLocation, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeHouse = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseLocation = msg.houseLocation
	var finishNow = msg.finishNow

	this.playerService.upgradeHouseAsync(session.uid, buildingLocation, houseLocation, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 加速小屋建造和升级
 * @param msg
 * @param session
 * @param next
 */
pro.speedupHouseBuild = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseLocation = msg.houseLocation
	this.playerService.speedupHouseBuildAsync(session.uid, buildingLocation, houseLocation).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 拆除小建筑
 * @param msg
 * @param session
 * @param next
 */
pro.destroyHouse = function(msg, session, next){
	var buildingLocation = msg.buildingLocation
	var houseLocation = msg.houseLocation
	this.playerService.destroyHouseAsync(session.uid, buildingLocation, houseLocation).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}