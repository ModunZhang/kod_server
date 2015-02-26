"use strict"

/**
 * Created by modun on 15/2/25.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var Consts = require("../consts/consts")
var LogicUtils = require("./logicUtils")
var DataUtils = require("./dataUtils")
var GameDatas = require("../datas/GameDatas")
var GrowUpTasks = GameDatas.GrowUpTasks

var Utils = module.exports


/**
 * 更新任务数据和推送信息
 * @param playerDoc
 * @param playerData
 * @param type
 * @param task
 */
Utils.updateGrowUpTaskData = function(playerDoc, playerData, type, task){
	if(!_.isObject(playerData.growUpTasks)) playerData.growUpTasks = {}
	if(!_.isArray(playerData.growUpTasks[type])) playerData.growUpTasks[type] = []

	if(task.rewarded){
		var taskIndex = playerDoc.growUpTasks[type].indexOf(task)
		var preTask = null
		for(var i = taskIndex - 1; i >= 0; i --){
			var theTask = playerDoc.growUpTasks[type][i]
			if(theTask.id == task.id - 1 && theTask.index == task.index - 1){
				preTask = theTask
				break
			}
		}
		if(_.isObject(preTask)){
			LogicUtils.removeItemInArray(playerDoc.growUpTasks[type], preTask)
			playerData.growUpTasks[type].push({
				type:Consts.DataChangedType.Remove,
				data:preTask
			})
		}
		playerData.growUpTasks[type].push({
			type:Consts.DataChangedType.Edit,
			data:task
		})
	}else{
		playerDoc.growUpTasks[type].push(task)
		playerData.growUpTasks[type].push({
			type:Consts.DataChangedType.Add,
			data:task
		})
	}
}

/**
 * 是否有前置任务未领取奖励
 * @param playerDoc
 * @param taskType
 * @param task
 * @returns {boolean}
 */
Utils.hasPreGrowUpTask = function(playerDoc, taskType, task){
	var index = playerDoc.growUpTasks[taskType].indexOf(task)
	for(var i = 0; i < index; i++){
		var theTask = playerDoc.growUpTasks[taskType][i]
		if(theTask.rewarded) continue
		if(_.isEqual(Consts.GrowUpTaskTypes.CityBuild, taskType)){
			if(_.isEqual(theTask.name, task.name)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.DragonLevel, taskType)){
			if(_.isEqual(theTask.type, task.type)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.DragonStar, taskType)){
			if(_.isEqual(theTask.type, task.type)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.DragonSkill, taskType)){
			if(_.isEqual(theTask.type, task.type) && _.isEqual(theTask.name, task.name)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.ProductionTech, taskType)){
			if(_.isEqual(theTask.name, task.name)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.MilitaryTech, taskType)){
			if(_.isEqual(theTask.name, task.name)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.SoldierStar, taskType)){
			if(_.isEqual(theTask.name, task.name)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.SoldierCount, taskType)){
			if(_.isEqual(theTask.name, task.name)) return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.PveCount, taskType)){
			return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.AttackWin, taskType)){
			return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.StrikeWin, taskType)){
			return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.PlayerKill, taskType)){
			return true
		}else if(_.isEqual(Consts.GrowUpTaskTypes.PlayerPower, taskType)){
			return true
		}
	}
	return false
}

/**
 * 完成日常任务
 * @param playerDoc
 * @param playerData
 * @param taskType
 * @param taskIndex
 */
Utils.finishPlayerDailyTaskIfNeeded = function(playerDoc, playerData, taskType, taskIndex){
	var isFinished = _.contains(playerDoc.dailyTasks[taskType], taskIndex)
	if(!isFinished){
		playerDoc.dailyTasks[taskType].push(taskIndex)
		if(!_.isObject(playerData.dailyTasks)) playerData.dailyTasks = {}
		playerData.dailyTasks[taskType] = playerDoc.dailyTasks[taskType]
	}
}

/**
 * 按情况完成城建成就任务
 * @param playerDoc
 * @param playerData
 * @param buildingName
 * @param level
 */
Utils.finishCityBuildTaskIfNeed = function(playerDoc, playerData, buildingName, level){
	if(level < 2) return
	var config = null
	var task = null
	var tasks = _.filter(playerDoc.growUpTasks.cityBuild, function(task){
		return _.isEqual(task.name, buildingName)
	})
	if(tasks.length > 0){
		task = tasks[tasks.length - 1]
		if(GrowUpTasks.cityBuild[task.id].level >= level) return
	}
	if(_.isObject(task)){
		config = GrowUpTasks.cityBuild[task.id + 1]
	}else{
		config = _.find(GrowUpTasks.cityBuild, function(config){
			return _.isEqual(config.name, buildingName) && _.isEqual(config.level, level)
		})
	}
	task = {
		id:config.id,
		index:config.index,
		name:config.name,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.CityBuild, task)
}

/**
 * 按情况完成龙等级成就任务
 * @param playerDoc
 * @param playerData
 * @param dragonType
 * @param level
 */
Utils.finishDragonLevelTaskIfNeed = function(playerDoc, playerData, dragonType, level){
	if(level < 2) return
	var config = _.find(GrowUpTasks.dragonLevel, function(config){
		return _.isEqual(config.type, dragonType) && _.isEqual(config.level, level)
	})

	var task = {
		id:config.id,
		index:config.index,
		type:config.type,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.DragonLevel, task)
}

/**
 * 按情况完成龙星级成就任务
 * @param playerDoc
 * @param playerData
 * @param dragonType
 * @param star
 */
Utils.finishDragonStarTaskIfNeed = function(playerDoc, playerData, dragonType, star){
	if(star < 2) return
	var config = _.find(GrowUpTasks.dragonStar, function(config){
		return _.isEqual(config.type, dragonType) && _.isEqual(config.star, star)
	})

	var task = {
		id:config.id,
		index:config.index,
		type:config.type,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.DragonStar, task)
}

/**
 * 按情况完成龙技能等级成就任务
 * @param playerDoc
 * @param playerData
 * @param dragonType
 * @param skillName
 * @param skillLevel
 */
Utils.finishDragonSkillTaskIfNeed = function(playerDoc, playerData, dragonType, skillName, skillLevel){
	if(skillLevel < 2) return
	var config = _.find(GrowUpTasks.dragonSkill, function(config){
		return _.isEqual(config.type, dragonType) && _.isEqual(config.name, skillName) && _.isEqual(config.level, skillLevel)
	})

	var task = {
		id:config.id,
		index:config.index,
		type:config.type,
		name:skillName,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.DragonSkill, task)
}

/**
 * 按情况完成生产科技等级成就任务
 * @param playerDoc
 * @param playerData
 * @param skillName
 * @param skillLevel
 */
Utils.finishProductionTechTaskIfNeed = function(playerDoc, playerData, skillName, skillLevel){
	if(skillLevel < 2) return
	var config = _.find(GrowUpTasks.productionTech, function(config){
		return _.isEqual(config.name, skillName) && _.isEqual(config.level, skillLevel)
	})

	var task = {
		id:config.id,
		index:config.index,
		name:config.name,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.ProductionTech, task)
}

/**
 * 按情况完成军事科技等级成就任务
 * @param playerDoc
 * @param playerData
 * @param skillName
 * @param skillLevel
 */
Utils.finishMilitaryTechTaskIfNeed = function(playerDoc, playerData, skillName, skillLevel){
	if(skillLevel < 2) return
	var config = _.find(GrowUpTasks.militaryTech, function(config){
		return _.isEqual(config.name, skillName) && _.isEqual(config.level, skillLevel)
	})

	var task = {
		id:config.id,
		index:config.index,
		name:config.name,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.MilitaryTech, task)
}

/**
 * 按情况完成士兵星级成就任务
 * @param playerDoc
 * @param playerData
 * @param soldierName
 * @param soldierStar
 */
Utils.finishSoldierStarTaskIfNeed = function(playerDoc, playerData, soldierName, soldierStar){
	if(soldierStar < 2) return
	var config = _.find(GrowUpTasks.soldierStar, function(config){
		return _.isEqual(config.name, soldierName) && _.isEqual(config.star, soldierStar)
	})

	var task = {
		id:config.id,
		index:config.index,
		name:config.name,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.SoldierStar, task)
}

/**
 * 按情况完成士兵数量成就任务
 * @param playerDoc
 * @param playerData
 * @param soldierName
 */
Utils.finishSoldierCountTaskIfNeed = function(playerDoc, playerData, soldierName){
	var config = null
	var task = null
	var nextCount = null
	var tasks = _.filter(playerDoc.growUpTasks.soldierCount, function(task){
		return _.isEqual(task.name, soldierName)
	})
	if(tasks.length > 0){
		task = tasks[tasks.length - 1]
		config = GrowUpTasks.soldierCount[task.id + 1]
		if(!_.isObject(config) || !_.isEqual(task.name, soldierName)) return
		nextCount = config.count
	}else{
		config = _.find(GrowUpTasks.soldierCount, function(config){
			return _.isEqual(config.name, soldierName) && config.index == 1
		})
		nextCount = config.count
	}
	if(playerDoc.soldiers[soldierName] < nextCount) return

	task = {
		id:config.id,
		index:config.index,
		name:config.name,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.SoldierCount, task)
}

/**
 * 按情况完成Pve步数成就任务
 * @param playerDoc
 * @param playerData
 */
Utils.finishPveCountTaskIfNeed = function(playerDoc, playerData){
	var config = null
	var task = null
	var nextCount = null
	var tasks = playerDoc.growUpTasks.pveCount
	if(tasks.length > 0){
		task = tasks[tasks.length - 1]
		config = GrowUpTasks.pveCount[task.id + 1]
		if(!_.isObject(config)) return
		nextCount = config.count
	}else{
		config = _.find(GrowUpTasks.pveCount, function(config){
			return config.index == 1
		})
		nextCount = config.count
	}
	if(playerDoc.pve.totalStep < nextCount) return

	task = {
		id:config.id,
		index:config.index,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.PveCount, task)
}

/**
 * 按情况完成进攻玩家城市成就任务
 * @param playerDoc
 * @param playerData
 */
Utils.finishAttackWinTaskIfNeed = function(playerDoc, playerData){
	var config = null
	var task = null
	var nextCount = null
	var tasks = playerDoc.growUpTasks.attackWin
	if(tasks.length > 0){
		task = tasks[tasks.length - 1]
		config = GrowUpTasks.attackWin[task.id + 1]
		if(!_.isObject(config)) return
		nextCount = config.count
	}else{
		config = _.find(GrowUpTasks.attackWin, function(config){
			return config.index == 1
		})
		nextCount = config.count
	}
	if(playerDoc.basicInfo.attackWin < nextCount) return

	task = {
		id:config.id,
		index:config.index,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.AttackWin, task)
}

/**
 * 按情况完成突袭玩家城市成就任务
 * @param playerDoc
 * @param playerData
 */
Utils.finishStrikeWinTaskIfNeed = function(playerDoc, playerData){
	var config = null
	var task = null
	var nextCount = null
	var tasks = playerDoc.growUpTasks.strikeWin
	if(tasks.length > 0){
		task = tasks[tasks.length - 1]
		config = GrowUpTasks.strikeWin[task.id + 1]
		if(!_.isObject(config)) return
		nextCount = config.count
	}else{
		config = _.find(GrowUpTasks.strikeWin, function(config){
			return config.index == 1
		})
		nextCount = config.count
	}
	if(playerDoc.basicInfo.strikeWin < nextCount) return

	task = {
		id:config.id,
		index:config.index,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.StrikeWin, task)
}

/**
 * 按情况完成玩家击杀成就任务
 * @param playerDoc
 * @param playerData
 */
Utils.finishPlayerKillTaskIfNeed = function(playerDoc, playerData){
	var config = null
	var task = null
	var nextCount = null
	var tasks = playerDoc.growUpTasks.playerKill
	if(tasks.length > 0){
		task = tasks[tasks.length - 1]
		config = GrowUpTasks.playerKill[task.id + 1]
		if(!_.isObject(config)) return
		nextCount = config.count
	}else{
		config = _.find(GrowUpTasks.playerKill, function(config){
			return config.index == 1
		})
		nextCount = config.count
	}
	if(playerDoc.basicInfo.kill < nextCount) return

	task = {
		id:config.id,
		index:config.index,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.PlayerKill, task)
}


/**
 * 按情况完成玩家总Power成就任务
 * @param playerDoc
 * @param playerData
 */
Utils.finishPlayerPowerTaskIfNeed = function(playerDoc, playerData){
	var config = null
	var task = null
	var nextCount = null
	var tasks = playerDoc.growUpTasks.playerPower
	if(tasks.length > 0){
		task = tasks[tasks.length - 1]
		config = GrowUpTasks.playerPower[task.id + 1]
		if(!_.isObject(config)) return
		nextCount = config.count
	}else{
		config = _.find(GrowUpTasks.playerPower, function(config){
			return config.index == 1
		})
		nextCount = config.count
	}
	if(playerDoc.basicInfo.power < nextCount) return

	task = {
		id:config.id,
		index:config.index,
		rewarded:false
	}
	this.updateGrowUpTaskData(playerDoc, playerData, Consts.GrowUpTaskTypes.PlayerPower, task)
}