"use strict"

/**
 * Created by modun on 14-7-23.
 */
var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService5 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
	this.Deal = app.get("Deal")
}
module.exports = PlayerApiService5
var pro = PlayerApiService5.prototype


/**
 * 获取每日登陆奖励
 * @param playerId
 * @param callback
 */
pro.getDay60Reward = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc

		if(_.isEqual(playerDoc.countInfo.day60, playerDoc.countInfo.day60RewardsCount)) return Promise.reject(new Error("今日登陆奖励已领取"))
		playerDoc.countInfo.day60RewardsCount = playerDoc.countInfo.day60
		playerData.countInfo = playerDoc.countInfo

		var items = DataUtils.getDay60RewardItem(playerDoc.countInfo.day60)
		playerData.__items = []
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			if(resp.newlyCreated){
				playerData.__items.push({
					type:Consts.DataChangedType.Add,
					data:resp.item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:resp.item
				})
			}
		})


		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取每日在线奖励
 * @param playerId
 * @param timePoint
 * @param callback
 */
pro.getOnlineReward = function(playerId, timePoint, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(_.values(Consts.OnlineTimePoint), timePoint)){
		callback(new Error("timePoint 不合法"))
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc

		if(!DataUtils.isPlayerReachOnlineTimePoint(playerDoc, timePoint)) return Promise.reject(new Error("在线时间不足,不能领取"))
		var theTimePoint = _.find(playerDoc.countInfo.todayOnLineTimeRewards, function(reward){
			return _.isEqual(reward, timePoint)
		})
		if(_.isNumber(theTimePoint)) return Promise.reject(new Error("此时间节点的在线奖励已经领取"))
		playerDoc.countInfo.todayOnLineTimeRewards.push(timePoint)
		playerData.countInfo = playerDoc.countInfo

		var items = DataUtils.getOnlineRewardItem(timePoint)
		playerData.__items = []
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			if(resp.newlyCreated){
				playerData.__items.push({
					type:Consts.DataChangedType.Add,
					data:resp.item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:resp.item
				})
			}
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取14日登陆奖励
 * @param playerId
 * @param callback
 */
pro.getDay14Reward = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc

		if(_.isEqual(playerDoc.countInfo.day14, playerDoc.countInfo.day14RewardsCount)) return Promise.reject(new Error("今日王城援军奖励已领取"))
		playerDoc.countInfo.day14RewardsCount = playerDoc.countInfo.day14
		playerData.countInfo = playerDoc.countInfo

		var rewards = DataUtils.getDay14Rewards(playerDoc.countInfo.day60)
		_.each(rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isObject(playerData[reward.type])) playerData[reward.type] = {}
			playerData[reward.type][reward.name] = playerDoc[reward.type][reward.name]
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取新玩家冲级奖励
 * @param playerId
 * @param levelupIndex
 * @param callback
 */
pro.getLevelupReward = function(playerId, levelupIndex, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!DataUtils.isLevelupIndexExist(levelupIndex)){
		callback(new Error("levelupIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc

		var theLevelupIndex = _.find(playerDoc.countInfo.levelupRewards, function(reward){
			return reward == levelupIndex
		})
		if(Date.now() > DataUtils.getPlayerLevelupExpireTime(playerDoc)) return Promise.reject(new Error("冲级奖励时间已过"))
		if(_.isNumber(theLevelupIndex)) return Promise.reject(new Error("当前等级的冲级奖励已经领取"))
		if(!DataUtils.isPlayerKeepLevelLegalForLevelupIndex(playerDoc, levelupIndex)) return Promise.reject(new Error("玩家城堡等级不足以领取当前冲级奖励"))
		playerDoc.countInfo.levelupRewards.push(levelupIndex)
		playerData.countInfo = playerDoc.countInfo

		var items = DataUtils.getLevelupRewards(levelupIndex)
		playerData.__items = []
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			if(resp.newlyCreated){
				playerData.__items.push({
					type:Consts.DataChangedType.Add,
					data:resp.item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:resp.item
				})
			}
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 获取首冲奖励
 * @param playerId
 * @param callback
 */
pro.getFirstIAPRewards = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc

		if(playerDoc.countInfo.iapCount <= 0) return Promise.reject(new Error("玩家还未进行首次充值"))
		if(playerDoc.countInfo.isFirstIAPRewardsGeted) return Promise.reject(new Error("奖励已经领取"))
		playerDoc.countInfo.isFirstIAPRewardsGeted = true
		playerDoc.basicInfo.buildQueue = 2
		playerData.countInfo = playerDoc.countInfo
		playerData.basicInfo = playerDoc.basicInfo

		var items = DataUtils.getFirstIAPRewards()
		playerData.__items = []
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			if(resp.newlyCreated){
				playerData.__items.push({
					type:Consts.DataChangedType.Add,
					data:resp.item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:resp.item
				})
			}
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 通过Selinas的每日测试
 * @param playerId
 * @param callback
 */
pro.passSelinasTest = function(playerId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.PassSelinasTest)
		if(_.isEmpty(playerData)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}else{
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
		}

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 领取日常任务奖励
 * @param playerId
 * @param taskType
 * @param callback
 */
pro.getDailyTaskRewards = function(playerId, taskType, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(_.values(Consts.DailyTaskTypes), taskType)){
		callback(new Error("taskType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		var isRewarded = _.contains(playerDoc.dailyTasks.rewarded, taskType)
		if(isRewarded) return Promise.reject(new Error("奖励已经领取"))
		if(playerDoc.dailyTasks[taskType].length < 5) return Promise.reject(new Error("任务未完成"))

		playerDoc.dailyTasks.rewarded.push(taskType)
		playerData.dailyTasks = {}
		playerData.dailyTasks.rewarded = playerDoc.dailyTasks.rewarded

		var items = DataUtils.getDailyTaskRewardsByType(taskType)
		playerData.__items = []
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			if(resp.newlyCreated){
				playerData.__items.push({
					type:Consts.DataChangedType.Add,
					data:resp.item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:resp.item
				})
			}
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 领取成就任务奖励
 * @param playerId
 * @param taskType
 * @param taskId
 * @param callback
 */
pro.getGrowUpTaskRewards = function(playerId, taskType, taskId, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.contains(Consts.GrowUpTaskTypes, taskType)){
		callback(new Error("taskType 不合法"))
		return
	}
	if(!_.isNumber(taskId) || taskId % 1 !== 0 || taskId < 0){
		callback(new Error("taskId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc

		var task = _.find(playerDoc.growUpTasks[taskType], function(task){
			return _.isEqual(task.id, taskId)
		})
		if(!_.isObject(task)) return Promise.reject(new Error("任务未完成或奖励已领取"))
		if(TaskUtils.hasPreGrowUpTask(playerDoc, taskType, task)) return Promise.reject(new Error("还有前置任务奖励未领取"))
		var rewards = DataUtils.getGrowUpTaskRewards(taskType, taskId)
		playerDoc.basicInfo.levelExp += rewards.exp
		playerData.basicInfo = playerDoc.basicInfo
		DataUtils.refreshPlayerResources(playerDoc)
		LogicUtils.addPlayerResources(playerDoc, rewards)
		playerData.resources = playerDoc.resources

		task.rewarded = true
		TaskUtils.updateGrowUpTaskData(playerDoc, playerData, taskType, task)

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}