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
var ErrorUtils = require("../utils/errorUtils")
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
	this.redis = app.get("redis")
}
module.exports = PlayerApiService5
var pro = PlayerApiService5.prototype


/**
 * 获取每日登陆奖励
 * @param playerId
 * @param callback
 */
pro.getDay60Reward = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isEqual(playerDoc.countInfo.day60, playerDoc.countInfo.day60RewardsCount)) return Promise.reject(ErrorUtils.loginRewardAlreadyGet(playerId))
		playerDoc.countInfo.day60RewardsCount = playerDoc.countInfo.day60
		playerData.push(["countInfo.day60RewardsCount", playerDoc.countInfo.day60RewardsCount])

		var items = DataUtils.getDay60RewardItem(playerDoc.countInfo.day60)
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	if(!_.contains(_.values(Consts.OnlineTimePoint), timePoint)){
		callback(new Error("timePoint 不合法"))
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!DataUtils.isPlayerReachOnlineTimePoint(playerDoc, timePoint)) return Promise.reject(ErrorUtils.onlineTimeNotEough(playerId))
		var theTimePoint = _.find(playerDoc.countInfo.todayOnLineTimeRewards, function(reward){
			return _.isEqual(reward, timePoint)
		})
		if(_.isNumber(theTimePoint)) return Promise.reject(ErrorUtils.onlineTimeRewardAlreadyGet(playerId))
		playerDoc.countInfo.todayOnLineTimeRewards.push(timePoint)
		playerData.push(["countInfo.todayOnLineTimeRewards." + playerDoc.countInfo.todayOnLineTimeRewards.indexOf(timePoint), timePoint])

		var items = DataUtils.getOnlineRewardItem(timePoint)
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc

		if(_.isEqual(playerDoc.countInfo.day14, playerDoc.countInfo.day14RewardsCount)) return Promise.reject(ErrorUtils.wonderAssistanceRewardAlreadyGet(playerId))
		playerDoc.countInfo.day14RewardsCount = playerDoc.countInfo.day14
		playerData.push(["countInfo.day14RewardsCount", playerDoc.countInfo.day14RewardsCount])

		var rewards = DataUtils.getDay14Rewards(playerDoc.countInfo.day60)
		_.each(rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	if(!DataUtils.isLevelupIndexExist(levelupIndex)){
		callback(new Error("levelupIndex 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc

		var theLevelupIndex = _.find(playerDoc.countInfo.levelupRewards, function(reward){
			return reward == levelupIndex
		})
		if(Date.now() > DataUtils.getPlayerLevelupExpireTime(playerDoc)) return Promise.reject(ErrorUtils.levelUpRewardExpired(playerId))
		if(_.isNumber(theLevelupIndex)) return Promise.reject(ErrorUtils.levelUpRewardAlreadyGet(playerId))
		if(!DataUtils.isPlayerKeepLevelLegalForLevelupIndex(playerDoc, levelupIndex)) return Promise.reject(ErrorUtils.levelUpRewardCanNotBeGetForCastleLevelNotMatch(playerId))
		playerDoc.countInfo.levelupRewards.push(levelupIndex)
		playerData.push(["countInfo.levelupRewards." + playerDoc.countInfo.levelupRewards.indexOf(levelupIndex), levelupIndex])

		var items = DataUtils.getLevelupRewards(levelupIndex)
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc

		if(playerDoc.countInfo.iapCount <= 0) return Promise.reject(ErrorUtils.firstIAPNotHappen(playerId))
		if(playerDoc.countInfo.isFirstIAPRewardsGeted) return Promise.reject(ErrorUtils.firstIAPRewardAlreadyGet(playerId))
		playerDoc.countInfo.isFirstIAPRewardsGeted = true
		playerDoc.basicInfo.buildQueue = 2
		playerData.push(["countInfo.isFirstIAPRewardsGeted", playerDoc.countInfo.isFirstIAPRewardsGeted])
		playerData.push(["basicInfo.buildQueue", playerDoc.basicInfo.buildQueue])

		var items = DataUtils.getFirstIAPRewards()
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.PassSelinasTest)
		if(_.isEmpty(playerData)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		}else{
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		}

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	if(!_.contains(_.values(Consts.DailyTaskTypes), taskType)){
		callback(new Error("taskType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []

	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		var isRewarded = _.contains(playerDoc.dailyTasks.rewarded, taskType)
		if(isRewarded) return Promise.reject(ErrorUtils.dailyTaskRewardAlreadyGet(playerId))
		if(playerDoc.dailyTasks[taskType].length < 5) return Promise.reject(ErrorUtils.dailyTaskNotFinished(playerId))

		playerDoc.dailyTasks.rewarded.push(taskType)
		playerData.push(["dailyTasks.rewarded." + playerDoc.dailyTasks.rewarded.indexOf(taskType), taskType])

		var items = DataUtils.getDailyTaskRewardsByType(taskType)
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
	var playerData = []
	var updateFuncs = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc

		var task = _.find(playerDoc.growUpTasks[taskType], function(task){
			return _.isEqual(task.id, taskId)
		})
		if(!_.isObject(task)) return Promise.reject(ErrorUtils.growUpTaskNotExist(playerId, taskType, taskId))
		if(TaskUtils.hasPreGrowUpTask(playerDoc, taskType, task)) return Promise.reject(ErrorUtils.growUpTaskRewardCanNotBeGetForPreTaskRewardNotGet(playerId, taskType, taskId))
		var rewards = DataUtils.getGrowUpTaskRewards(taskType, taskId)
		playerDoc.basicInfo.levelExp += rewards.exp
		playerData.push(["basicInfo.levelExp", playerDoc.basicInfo.levelExp])
		DataUtils.refreshPlayerResources(playerDoc)
		LogicUtils.addPlayerResources(playerDoc, rewards)
		playerData.push(["resources", playerDoc.resources])

		task.rewarded = true
		TaskUtils.updateGrowUpTaskData(playerDoc, playerData, taskType, task)

		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
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
 * 获取玩家排名信息
 * @param playerId
 * @param rankType
 * @param fromRank
 * @param callback
 */
pro.getPlayerRankList = function(playerId, rankType, fromRank, callback){
	if(!_.contains(Consts.RankTypes, rankType)){
		callback(new Error("rankType 不合法"))
		return
	}
	if(!_.isNumber(fromRank) || fromRank % 1 !== 0 || fromRank < 0){
		callback(new Error("fromRank 不合法"))
		return
	}

	var self = this
	var myRank = null
	var rankDatas = []
	this.redis.zrevrankAsync(["player.basicInfo." + rankType, playerId]).then(function(rank){
		myRank = rank
		return self.redis.zrevrangeAsync(["player.basicInfo." + rankType, fromRank, fromRank + Define.PlayerMaxReturnRankListSize - 1])
	}).then(function(ids){
		if(ids.length > 0){
			return self.playerDao.findAllAsync(ids)
		}
		return Promise.resolve([])
	}).then(function(docs){
		_.each(docs, function(doc){
			var rankData = {
				id:doc._id,
				name:doc.basicInfo.name,
				icon:doc.basicInfo.icon
			}
			if(_.isEqual(rankType, Consts.RankTypes.Kill)){
				rankData.kill = doc.basicInfo.kill
			}else{
				rankData.power = doc.basicInfo.power
			}
			rankDatas.push(rankData)
		})
	}).then(function(){
		callback(null, [myRank, rankDatas])
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 获取联盟排名信息
 * @param playerId
 * @param rankType
 * @param fromRank
 * @param callback
 */
pro.getAllianceRankList = function(playerId, rankType, fromRank, callback){
	if(!_.contains(Consts.RankTypes, rankType)){
		callback(new Error("rankType 不合法"))
		return
	}
	if(!_.isNumber(fromRank) || fromRank % 1 !== 0 || fromRank < 0){
		callback(new Error("fromRank 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var myRank = null
	var rankDatas = []
	this.playerDao.findAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return	self.redis.zrevrankAsync(["alliance.basicInfo." + rankType, playerDoc.alliance.id])
	}).then(function(rank){
		myRank = rank
		return self.redis.zrevrangeAsync(["alliance.basicInfo." + rankType, fromRank, fromRank + Define.PlayerMaxReturnRankListSize - 1])
	}).then(function(ids){
		if(ids.length > 0){
			return self.allianceDao.findAllAsync(ids)
		}
		return Promise.resolve([])
	}).then(function(docs){
		_.each(docs, function(doc){
			var rankData = {
				id:doc._id,
				name:doc.basicInfo.name,
				tag:doc.basicInfo.tag,
				flag:doc.basicInfo.flag
			}
			if(_.isEqual(rankType, Consts.RankTypes.Kill)){
				rankData.kill = doc.basicInfo.kill
			}else{
				rankData.power = doc.basicInfo.power
			}
			rankDatas.push(rankData)
		})
	}).then(function(){
		return self.playerDao.removeLockAsync(playerDoc._id)
	}).then(function(){
		callback(null, [myRank, rankDatas])
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