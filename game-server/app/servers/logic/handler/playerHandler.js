"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")

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

/**
 * 升级箭塔
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeTower = function(msg, session, next){
	var location = msg.location
	var finishNow = msg.finishNow

	this.playerService.upgradeTowerAsync(session.uid, location, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 箭塔升级加速
 * @param msg
 * @param session
 * @param next
 */
pro.speedupTowerBuild = function(msg, session, next){
	var location = msg.location

	this.playerService.speedupTowerBuildAsync(session.uid, location).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级城墙
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeWall = function(msg, session, next){
	var finishNow = msg.finishNow

	this.playerService.upgradeWallAsync(session.uid, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 城墙升级加速
 * @param msg
 * @param session
 * @param next
 */
pro.speedupWallBuild = function(msg, session, next){
	this.playerService.speedupWallBuildAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 制作材料
 * @param msg
 * @param session
 * @param next
 */
pro.makeMaterial = function(msg, session, next){
	var category = msg.category
	var finishNow = msg.finishNow
	this.playerService.makeMaterialAsync(session.uid, category, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 领取制作完成
 * @param msg
 * @param session
 * @param next
 */
pro.getMaterials = function(msg, session, next){
	var category = msg.category
	this.playerService.getMaterialsAsync(session.uid, category).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 招募普通士兵
 * @param msg
 * @param session
 * @param next
 */
pro.recruitNormalSoldier = function(msg, session, next){
	var soldierName = msg.soldierName
	var count = msg.count
	var finishNow = msg.finishNow

	this.playerService.recruitNormalSoldierAsync(session.uid, soldierName, count, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 招募特殊士兵
 * @param msg
 * @param session
 * @param next
 */
pro.recruitSpecialSoldier = function(msg, session, next){
	var soldierName = msg.soldierName
	var count = msg.count
	var finishNow = msg.finishNow

	this.playerService.recruitSpecialSoldierAsync(session.uid, soldierName, count, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 制作龙装备
 * @param msg
 * @param session
 * @param next
 */
pro.makeDragonEquipment = function(msg, session, next){
	var equipmentName = msg.equipmentName
	var finishNow = msg.finishNow
	this.playerService.makeDragonEquipmentAsync(session.uid, equipmentName, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 治疗士兵
 * @param msg
 * @param session
 * @param next
 */
pro.treatSoldier = function(msg, session, next){
	var soldiers = msg.soldiers
	var finishNow = msg.finishNow
	this.playerService.treatSoldierAsync(session.uid, soldiers, finishNow).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 孵化龙蛋
 * @param msg
 * @param session
 * @param next
 */
pro.hatchDragon = function(msg, session, next){
	var dragonType = msg.dragonType
	this.playerService.hatchDragonAsync(session.uid, dragonType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 设置龙的装备
 * @param msg
 * @param session
 * @param next
 */
pro.setDragonEquipment = function(msg, session, next){
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	var equipmentName = msg.equipmentName
	this.playerService.setDragonEquipmentAsync(session.uid, dragonType, equipmentCategory, equipmentName).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 强化龙的装备
 * @param msg
 * @param session
 * @param next
 */
pro.enhanceDragonEquipment = function(msg, session, next){
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	var equipments = msg.equipments
	this.playerService.enhanceDragonEquipmentAsync(session.uid, dragonType, equipmentCategory, equipments).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 重置龙的装备的随机Buff
 * @param msg
 * @param session
 * @param next
 */
pro.resetDragonEquipment = function(msg, session, next){
	var dragonType = msg.dragonType
	var equipmentCategory = msg.equipmentCategory
	this.playerService.resetDragonEquipmentAsync(session.uid, dragonType, equipmentCategory).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级龙的技能
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeDragonSkill = function(msg, session, next){
	var dragonType = msg.dragonType
	var skillLocation = msg.skillLocation
	this.playerService.upgradeDragonSkillAsync(session.uid, dragonType, skillLocation).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 升级龙的星级
 * @param msg
 * @param session
 * @param next
 */
pro.upgradeDragonStar = function(msg, session, next){
	var dragonType = msg.dragonType
	this.playerService.upgradeDragonStarAsync(session.uid, dragonType).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

/**
 * 向城民收取税收
 * @param msg
 * @param session
 * @param next
 */
pro.impose = function(msg, session, next){
	this.playerService.imposeAsync(session.uid).then(function(){
		next(null, {code:200})
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}