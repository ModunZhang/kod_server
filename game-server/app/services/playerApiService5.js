"use strict"

/**
 * Created by modun on 14-7-23.
 */
var ShortId = require("shortid")
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
	this.logService = app.get("logService")
	this.dataService = app.get("dataService")
	this.GemUse = app.get("GemUse")
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

	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(_.isEqual(playerDoc.countInfo.day60, playerDoc.countInfo.day60RewardsCount)) return Promise.reject(ErrorUtils.loginRewardAlreadyGet(playerId))
		playerDoc.countInfo.day60RewardsCount = playerDoc.countInfo.day60
		playerData.push(["countInfo.day60RewardsCount", playerDoc.countInfo.day60RewardsCount])

		var items = DataUtils.getDay60RewardItem(playerDoc.countInfo.day60)
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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

	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
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
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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

	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc

		if(_.isEqual(playerDoc.countInfo.day14, playerDoc.countInfo.day14RewardsCount)) return Promise.reject(ErrorUtils.wonderAssistanceRewardAlreadyGet(playerId))
		playerDoc.countInfo.day14RewardsCount = playerDoc.countInfo.day14
		playerData.push(["countInfo.day14RewardsCount", playerDoc.countInfo.day14RewardsCount])

		var rewards = DataUtils.getDay14Rewards(playerDoc.countInfo.day60)
		_.each(rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
		})
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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

	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
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
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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

	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
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
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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

	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.EmpireRise, Consts.DailyTaskIndexMap.EmpireRise.PassSelinasTest)
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, _.isEmpty(playerData) ? null : playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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

	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
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
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc

		var task = _.find(playerDoc.growUpTasks[taskType], function(task){
			return _.isEqual(task.id, taskId)
		})
		if(!_.isObject(task)) return Promise.reject(ErrorUtils.growUpTaskNotExist(playerId, taskType, taskId))
		if(task.rewarded) return Promise.reject(ErrorUtils.growUpTaskRewardAlreadyGet(playerId, taskType, taskId))
		if(TaskUtils.hasPreGrowUpTask(playerDoc, taskType, task)) return Promise.reject(ErrorUtils.growUpTaskRewardCanNotBeGetForPreTaskRewardNotGet(playerId, taskType, taskId))
		var rewards = DataUtils.getGrowUpTaskRewards(taskType, taskId)
		DataUtils.addPlayerLevelExp(playerDoc, playerData, rewards.exp)
		DataUtils.refreshPlayerResources(playerDoc)
		LogicUtils.addPlayerResources(playerDoc, rewards)
		playerData.push(["resources", playerDoc.resources])

		task.rewarded = true
		TaskUtils.updateGrowUpTaskData(playerDoc, playerData, taskType, task)
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 获取联盟其他玩家赠送的礼品
 * @param playerId
 * @param giftId
 * @param callback
 */
pro.getIapGift = function(playerId, giftId, callback){
	if(!_.isString(giftId) || !ShortId.isValid(giftId)){
		callback(new Error("giftId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		var gift = _.find(playerDoc.iapGifts, function(gift){
			return _.isEqual(gift.id, giftId)
		})
		if(!_.isObject(gift)) return Promise.reject(ErrorUtils.giftNotExist(playerId, giftId))
		playerData.push(["iapGifts." + playerDoc.iapGifts.indexOf(gift), null])
		LogicUtils.removeItemInArray(playerDoc.iapGifts, gift)
		if(gift.time >= Date.now() - (DataUtils.getPlayerIntInit("giftExpireHours") * 60 * 60 * 1000)){
			var resp = LogicUtils.addPlayerItem(playerDoc, gift.name, gift.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		}
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 获取服务器列表
 * @param playerId
 * @param callback
 */
pro.getServers = function(playerId, callback){
	var self = this
	var servers = null
	var getServersAsync = Promise.promisify(this.app.rpc.gate.gateRemote.getServers.toServer, this)
	getServersAsync(self.app.get("gateServerId")).then(function(theServers){
		servers = theServers
		_.each(servers, function(server){
			delete  server.host
			delete  server.port
		})
		return Promise.resolve()
	}).then(function(){
		callback(null, servers)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 切换服务器
 * @param playerId
 * @param serverId
 * @param callback
 */
pro.switchServer = function(playerId, serverId, callback){
	if(!_.isString(serverId)){
		callback(new Error("serverId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var getServersAsync = Promise.promisify(this.app.rpc.gate.gateRemote.getServers.toServer, this)
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		if(_.isEqual(playerDoc.serverId, serverId)) return Promise.reject(ErrorUtils.canNotSwitchToTheSameServer(playerId, serverId))
		return getServersAsync(self.app.get("gateServerId"))
	}).then(function(servers){
		var isServerExist = _.some(servers, function(server){
			return _.isEqual(server.id, serverId)
		})
		if(!isServerExist) return Promise.reject(ErrorUtils.serverNotExist(playerId, serverId))
		playerDoc.serverId = serverId
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		callback(null)
		return Promise.resolve()
	}, function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
			return Promise.reject(e)
		})
	}).then(function(){
		self.app.rpc.logic.logicRemote.kickPlayer.toServer(playerDoc.logicServerId, playerDoc._id, "切换服务器")
	}).catch(function(e){
		self.logService.onEventError("logic.playerApiService5.switchServer", {
			playerId:playerId,
			serverId:serverId
		}, e.stack)
	})
}

/**
 * 设置玩家头像
 * @param playerId
 * @param icon
 * @param callback
 */
pro.setPlayerIcon = function(playerId, icon, callback){
	if(!_.isNumber(icon) || icon % 1 !== 0 || icon < 1 || icon > 11){
		callback(new Error("icon 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		playerDoc.basicInfo.icon = icon
		playerData.push(["basicInfo.icon", playerDoc.basicInfo.icon])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 解锁玩家第二条队列
 * @param playerId
 * @param callback
 */
pro.unlockPlayerSecondMarchQueue = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(playerDoc.basicInfo.marchQueue >= 2) return Promise.reject(ErrorUtils.playerSecondMarchQueueAlreadyUnlocked(playerId))
		var gemUsed = DataUtils.getPlayerIntInit("unlockPlayerSecondMarchQueue")
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		playerData.push(["resources.gem", playerDoc.resources.gem])
		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"unlockPlayerSecondMarchQueue"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		playerDoc.basicInfo.marchQueue = 2
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		playerData.push(["basicInfo.marchQueue", playerDoc.basicInfo.marchQueue])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 初始化玩家数据
 * @param playerId
 * @param terrain
 * @param callback
 */
pro.initPlayerData = function(playerId, terrain, callback){
	if(!_.contains(_.values(Consts.AllianceTerrain), terrain)){
		callback(new Error("terrain 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.dataService.findPlayerAsync(playerId, [], false).then(function(doc){
		playerDoc = doc
		if(!_.isEqual(playerDoc.basicInfo.terrain, Consts.None)) return Promise.reject(ErrorUtils.playerDataAlreadyInited(playerId))
		playerDoc.basicInfo.terrain = terrain
		playerData.push(["basicInfo.terrain", playerDoc.basicInfo.terrain])
		var dragonType = Consts.TerrainDragonMap[terrain]
		var dragon = playerDoc.dragons[dragonType]
		dragon.star = 1
		dragon.level = 1
		dragon.status = Consts.DragonStatus.Defence
		dragon.hp = DataUtils.getDragonMaxHp(dragon)
		dragon.hpRefreshTime = Date.now()
		playerData.push(["dragons." + dragonType, playerDoc.dragons[dragonType]])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}