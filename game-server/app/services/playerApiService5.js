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
	this.cacheService = app.get('cacheService');
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(_.isEqual(playerDoc.countInfo.day60, playerDoc.countInfo.day60RewardsCount)) return Promise.reject(ErrorUtils.loginRewardAlreadyGet(playerId))
		playerDoc.countInfo.day60RewardsCount = playerDoc.countInfo.day60
		playerData.push(["countInfo.day60RewardsCount", playerDoc.countInfo.day60RewardsCount])

		var items = DataUtils.getDay60RewardItem(playerDoc.countInfo.day60)
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
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
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc

		if(_.isEqual(playerDoc.countInfo.day14, playerDoc.countInfo.day14RewardsCount)) return Promise.reject(ErrorUtils.wonderAssistanceRewardAlreadyGet(playerId))
		playerDoc.countInfo.day14RewardsCount = playerDoc.countInfo.day14
		playerData.push(["countInfo.day14RewardsCount", playerDoc.countInfo.day14RewardsCount])
		var rewards = DataUtils.getDay14Rewards(playerDoc.countInfo.day14)
		LogicUtils.addPlayerRewards(playerDoc, playerData, rewards);

		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
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
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
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
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 领取日常任务奖励
 * @param playerId
 * @param callback
 */
pro.getDailyTaskRewards = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc

		var dailyTaskRewardCount = playerDoc.countInfo.dailyTaskRewardCount
		if(dailyTaskRewardCount >= DataUtils.getDailyTasksMaxCount()) return Promise.reject(ErrorUtils.dailyTaskRewardAlreadyGet(playerId))
		if(!DataUtils.isPlayerDailyTaskScoreReachIndex(playerDoc, dailyTaskRewardCount)) return Promise.reject(ErrorUtils.dailyTaskNotFinished(playerId))

		playerDoc.countInfo.dailyTaskRewardCount += 1;
		playerData.push(["countInfo.dailyTaskRewardCount", playerDoc.countInfo.dailyTaskRewardCount])

		var items = DataUtils.getDailyTaskRewardsByIndex(dailyTaskRewardCount);
		_.each(items, function(item){
			var resp = LogicUtils.addPlayerItem(playerDoc, item.name, item.count)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		var task = _.find(playerDoc.growUpTasks[taskType], function(task){
			return _.isEqual(task.id, taskId)
		})
		if(!_.isObject(task)) return Promise.reject(ErrorUtils.growUpTaskNotExist(playerId, taskType, taskId))
		if(task.rewarded) return Promise.reject(ErrorUtils.growUpTaskRewardAlreadyGet(playerId, taskType, taskId))
		if(TaskUtils.hasPreGrowUpTask(playerDoc, taskType, task)) return Promise.reject(ErrorUtils.growUpTaskRewardCanNotBeGetForPreTaskRewardNotGet(playerId, taskType, taskId))
		DataUtils.refreshPlayerResources(playerDoc)
		var rewards = DataUtils.getGrowUpTaskRewards(taskType, taskId)
		DataUtils.addPlayerLevelExp(playerDoc, playerData, rewards.exp)
		LogicUtils.addPlayerResources(playerDoc, rewards)
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])

		task.rewarded = true
		TaskUtils.updateGrowUpTaskData(playerDoc, playerData, taskType, task)
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
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
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	var getServersAsync = Promise.promisify(this.app.rpc.gate.gateRemote.getServers.toServer, {context:this})
	getServersAsync(self.app.get("gateServerId")).then(function(theServers){
		servers = theServers
		_.each(servers, function(server){
			delete server.main
			delete server.env
			delete server.host
			delete server.port
			delete server.serverType
			delete server.pid
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
	var self = this
	var playerDoc = null
	var cacheServers = this.app.getServersByType("cache");
	var cacheServer = _.find(cacheServers, function(server){
		return server.id === serverId;
	})
	var switchServerFreeKeepLevel = DataUtils.getPlayerIntInit('switchServerFreeKeepLevel');
	if(!cacheServer){
		var e = ErrorUtils.serverNotExist(playerId, serverId);
		return callback(e)
	}
	var updateFuncs = [];
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(playerDoc.buildings.location_1.level >= switchServerFreeKeepLevel && playerDoc.countInfo.registerTime < cacheServer.openAt - (DataUtils.getPlayerIntInit('switchServerLimitDays') * 24 * 60 * 60 * 1000)){
			return Promise.reject(ErrorUtils.canNotSwitchToTheSelectedServer(playerId, serverId));
		}
		if(!_.isEmpty(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerAlreadyJoinAlliance(playerId, playerId))
		if(_.isEqual(playerDoc.serverId, serverId)) return Promise.reject(ErrorUtils.canNotSwitchToTheSameServer(playerId, serverId))
		var hasSellItems = _.some(playerDoc.deals, function(deal){
			return !deal.isSold;
		})
		if(hasSellItems) return Promise.reject(ErrorUtils.youHaveProductInSellCanNotSwitchServer(playerId, playerId));
		var gemUsed = playerDoc.buildings.location_1.level < switchServerFreeKeepLevel ? 0 : DataUtils.getPlayerIntInit('switchServerGemUsed');
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"switchServer"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		playerDoc.serverId = serverId
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc]);

		return LogicUtils.excuteAll(updateFuncs);
	}).then(function(){
		callback()
		return Promise.resolve()
	}).then(function(){
		self.app.rpc.logic.logicRemote.kickPlayer.toServer(playerDoc.logicServerId, playerDoc._id, "切换服务器")
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 设置玩家头像
 * @param playerId
 * @param icon
 * @param callback
 */
pro.setPlayerIcon = function(playerId, icon, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		playerDoc.basicInfo.icon = icon
		playerData.push(["basicInfo.icon", playerDoc.basicInfo.icon])
		return self.cacheService.updatePlayerAsync(playerDoc._id, playerDoc)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(playerDoc.basicInfo.marchQueue >= 2) return Promise.reject(ErrorUtils.playerSecondMarchQueueAlreadyUnlocked(playerId))
		var gemUsed = DataUtils.getPlayerIntInit("unlockPlayerSecondMarchQueue") - (250 * (playerDoc.countInfo.day14 - 1));
		if(gemUsed > 0){
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
		}
		playerDoc.basicInfo.marchQueue = 2
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		playerData.push(["basicInfo.marchQueue", playerDoc.basicInfo.marchQueue])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
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
 * @param language
 * @param callback
 */
pro.initPlayerData = function(playerId, terrain, language, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var eventFuncs = [];
	var updateFuncs = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isEqual(playerDoc.basicInfo.terrain, Consts.None)) return Promise.reject(ErrorUtils.playerDataAlreadyInited(playerId))
		LogicUtils.initPlayerData(playerDoc, playerData, terrain, language);
		eventFuncs.push([self.dataService, self.dataService.updatePlayerSessionAsync, playerDoc, {inited:playerDoc.basicInfo.terrain !== Consts.None}])
		updateFuncs.push([self.cacheService, self.cacheService.updatePlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 领取首次加入联盟奖励
 * @param playerId
 * @param allianceId
 * @param callback
 */
pro.getFirstJoinAllianceReward = function(playerId, allianceId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(playerDoc.countInfo.firstJoinAllianceRewardGeted) return Promise.reject(ErrorUtils.firstJoinAllianceRewardAlreadyGeted(playerId))
		playerDoc.countInfo.firstJoinAllianceRewardGeted = true
		playerData.push(['countInfo.firstJoinAllianceRewardGeted', true])
		var resp = LogicUtils.addPlayerItem(playerDoc, 'gemClass_2', 2)
		playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		return self.cacheService.updatePlayerAsync(playerDoc._id, playerDoc)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 完成新手引导
 * @param playerId
 * @param callback
 */
pro.finishFTE = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(playerDoc.countInfo.isFTEFinished) return Promise.reject(ErrorUtils.fteAlreadyFinished(playerId))
		playerDoc.countInfo.isFTEFinished = true
		playerData.push(['countInfo.isFTEFinished', true])
		return self.cacheService.updatePlayerAsync(playerDoc._id, playerDoc)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 获取玩家城墙血量
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.getPlayerWallInfo = function(playerId, memberId, callback){
	this.cacheService.directFindPlayerAsync(memberId).then(function(doc){
		DataUtils.refreshPlayerResources(doc)
		var info = {
			wallLevel:doc.buildings.location_21.level,
			wallHp:doc.resources.wallHp
		}
		callback(null, info)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置远程推送状态
 * @param playerId
 * @param type
 * @param status
 * @param callback
 */
pro.setPushStatus = function(playerId, type, status, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc;
		playerDoc.pushStatus[type] = status;
		playerData.push(['pushStatus.' + type, status]);
		return self.cacheService.updatePlayerAsync(playerDoc._id, playerDoc)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 战报分享
 * @param playerId
 * @param memberId
 * @param reportId
 * @param callback
 */
pro.getReportDetail = function(playerId, memberId, reportId, callback){
	var memberDoc = null;
	this.cacheService.directFindPlayerAsync(memberId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId));
		memberDoc = doc;
		var report = _.find(memberDoc.reports, function(report){
			return _.isEqual(report.id, reportId);
		})
		if(!_.isObject(report)) return Promise.reject(ErrorUtils.reportNotExist(memberId, reportId));
		callback(null, report);
	}).catch(function(e){
		callback(e)
	})
}