"use strict"

/**
 * Created by modun on 15/3/6.
 */
var _ = require("underscore")
var Promise = require("bluebird")
var ShortId = require('shortid')
var sprintf = require("sprintf")

var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var DataUtils = require("../utils/dataUtils")
var ReportUtils = require("../utils/reportUtils")
var Define = require("../consts/define")
var Consts = require("../consts/consts")

var DataService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.cacheServerId = app.getCurServer().id
	this.chatServerId = app.get("chatServerId")
	this.cacheService = app.get('cacheService')
	this.GemChange = app.get('GemChange');
	this.pushService = app.get('pushService')
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 将玩家添加到联盟频道
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, {context:this})
	var funcs = []
	funcs.push(addToChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(this.cacheService.addToAllianceChannelAsync(allianceId, playerDoc._id, playerDoc.logicServerId));
	Promise.all(funcs).catch(function(e){
		self.logService.onError("cache.dataService.addPlayerToAllianceChannel", {
			allianceId:allianceId,
			playerId:playerDoc._id
		}, e.stack)
	})
	callback()
}

/**
 * 将玩家从联盟频道移除
 * @param allianceId
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromAllianceChannel = function(allianceId, playerDoc, callback){
	var self = this
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, {context:this})
	var funcs = []
	funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, allianceId, playerDoc._id, playerDoc.logicServerId))
	funcs.push(this.cacheService.removeFromAllianceChannelAsync(allianceId, playerDoc._id, playerDoc.logicServerId));
	Promise.all(funcs).catch(function(e){
		self.logService.onError("cache.dataService.removePlayerFromAllianceChannel", {
			allianceId:allianceId,
			playerId:playerDoc._id
		}, e.stack)
	})
	callback()
}

/**
 * 删除联盟频道
 * @param allianceId
 * @param callback
 */
pro.destroyAllianceChannel = function(allianceId, callback){
	var self = this;
	var funcs = [];
	var distroyChatAllianceChannel = function(){
		return new Promise(function(resolve, reject){
			self.app.rpc.chat.chatRemote.destroyAllianceChannel.toServer(self.chatServerId, allianceId, function(e){
				if(!!e) return reject(e);
				resolve();
			})
		});
	}
	funcs.push(distroyChatAllianceChannel);
	funcs.push(self.cacheService.destroyAllianceChannelAsync(allianceId))
	Promise.all(funcs).catch(function(e){
		self.logService.onError("cache.dataService.destroyAllianceChannel", {
			allianceId:allianceId
		}, e.stack)
	})
	callback()
}

/**
 * 将玩家添加到所有频道中
 * @param playerDoc
 * @param callback
 */
pro.addPlayerToChannels = function(playerDoc, callback){
	var self = this
	var addToChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToChatChannel.toServer, {context:this})
	var addToChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.addToAllianceChannel.toServer, {context:this})
	var funcs = []
	funcs.push(addToChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId, this.cacheServerId));
	if(_.isString(playerDoc.allianceId)){
		funcs.push(addToChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(this.cacheService.addToAllianceChannelAsync(playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId));
	}
	Promise.all(funcs).catch(function(e){
		self.logService.onError("cache.dataService.addPlayerToChannels", {playerId:playerDoc._id}, e.stack)
	})
	callback()
}

/**
 * 将玩家从所有频道中移除
 * @param playerDoc
 * @param callback
 */
pro.removePlayerFromChannels = function(playerDoc, callback){
	var self = this
	var removeFromChatChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromChatChannel.toServer, {context:this})
	var removeFromChatAllianceChannelAsync = Promise.promisify(this.app.rpc.chat.chatRemote.removeFromAllianceChannel.toServer, {context:this})
	var funcs = []
	funcs.push(removeFromChatChannelAsync(this.chatServerId, playerDoc._id, playerDoc.logicServerId, this.cacheServerId));
	if(_.isString(playerDoc.allianceId)){
		funcs.push(removeFromChatAllianceChannelAsync(this.chatServerId, playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId))
		funcs.push(this.cacheService.removeFromAllianceChannelAsync(playerDoc.allianceId, playerDoc._id, playerDoc.logicServerId));
		funcs.push(this.cacheService.removeFromViewedMapIndexChannelAsync(playerDoc._id, playerDoc.logicServerId));
	}
	Promise.all(funcs).catch(function(e){
		self.logService.onError("cache.dataService.removePlayerFromChannels", {playerId:playerDoc._id}, e.stack)
	}).finally(function(){
		callback()
	})
}

/**
 * 更新玩家session信息
 * @param playerDoc
 * @param params
 * @param callback
 */
pro.updatePlayerSession = function(playerDoc, params, callback){
	if(_.isEmpty(playerDoc.logicServerId)){
		callback()
		return
	}
	var self = this
	this.app.rpc.logic.logicRemote.updatePlayerSession.toServer(playerDoc.logicServerId, playerDoc._id, params, function(e){
		if(_.isObject(e)){
			self.logService.onError("cache.dataService.updatePlayerSession", {
				playerId:playerDoc._id,
				params:params
			}, e.stack)
		}
	})
	callback()
}

/**
 * 玩家是否在线
 * @param playerDoc
 * @param callback
 */
pro.kickPlayerIfOnline = function(playerDoc, callback){
	if(!playerDoc.logicServerId) return callback();
	var self = this;
	this.app.rpc.logic.logicRemote.kickPlayer.toServer(playerDoc.logicServerId, playerDoc._id, '重复登录', function(e){
		if(!!e){
			self.logService.onError("cache.dataService.kickPlayerIfOnline", {
				playerId:playerDoc._id
			}, e.stack)
		}
		e = ErrorUtils.playerAlreadyLogin(playerDoc._id);
		self.logService.onError("cache.dataService.kickPlayerIfOnline", {
			playerId:playerDoc._id
		}, e.stack);
		(function isPlayerOnline(){
			setTimeout(function(){
				self.app.rpc.logic.logicRemote.isPlayerOnline.toServer(playerDoc.logicServerId, playerDoc._id, function(e, online){
					if(!!e){
						self.logService.onError("cache.dataService.kickPlayerIfOnline", {
							playerId:playerDoc._id
						}, e.stack)
						return callback(e);
					}
					if(online) return isPlayerOnline();
					return callback();
				})
			}, 1000)
		})();
	})
}

/**
 * 为玩家添加系统邮件
 * @param id
 * @param titleKey
 * @param titleArgs
 * @param contentKey
 * @param contentArgs
 * @param rewards
 * @param callback
 */
pro.sendSysMail = function(id, titleKey, titleArgs, contentKey, contentArgs, rewards, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var lockPairs = [];
	this.cacheService.findPlayerAsync(id).then(function(doc){
		playerDoc = doc

		lockPairs.push({type:Consts.Pairs.Player, value:playerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs, true);
	}).then(function(){
		var language = playerDoc.basicInfo.language
		var title = titleKey[language]
		var content = contentKey[language]
		if(!_.isString(title)){
			title = titleKey.en
		}
		if(!_.isString(content)){
			content = contentKey.en
		}
		if(titleArgs.length > 0){
			title = sprintf.vsprintf(title, titleArgs)
		}
		if(contentArgs.length > 0){
			content = sprintf.vsprintf(content, contentArgs)
		}

		var mail = {
			id:ShortId.generate(),
			title:title,
			fromId:"__system",
			fromName:"__system",
			fromIcon:0,
			fromAllianceTag:"",
			sendTime:Date.now(),
			content:content,
			rewards:rewards,
			rewardGetted:false,
			isRead:false,
			isSaved:false
		};

		while(playerDoc.mails.length >= Define.PlayerMailsMaxSize){
			(function(){
				var willRemovedMail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
				playerData.push(["mails." + playerDoc.mails.indexOf(willRemovedMail), null])
				LogicUtils.removeItemInArray(playerDoc.mails, willRemovedMail)
			})();
		}
		playerDoc.mails.push(mail)
		playerData.push(["mails." + playerDoc.mails.indexOf(mail), mail])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		self.logService.onError("cache.dataService.sendSysMail", {
			playerId:id,
			titleKey:titleKey,
			titleArgs:titleArgs,
			contentKey:contentKey,
			contentArgs:contentArgs
		}, e.stack)
		callback();
	})
}

/**
 * 为玩家添加战报
 * @param id
 * @param report
 * @param callback
 */
pro.sendSysReport = function(id, report, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var lockPairs = [];
	this.cacheService.findPlayerAsync(id).then(function(doc){
		playerDoc = doc

		lockPairs.push({type:Consts.Pairs.Player, value:playerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs, true);
	}).then(function(){
		while(playerDoc.reports.length >= Define.PlayerReportsMaxSize){
			(function(){
				var willRemovedReport = LogicUtils.getPlayerFirstUnSavedReport(playerDoc)
				playerData.push(["reports." + playerDoc.reports.indexOf(willRemovedReport), null])
				LogicUtils.removeItemInArray(playerDoc.reports, willRemovedReport)
			})();
		}
		playerDoc.reports.push(report)
		playerData.push(["reports." + playerDoc.reports.indexOf(report), report])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		self.logService.onError("cache.dataService.sendSysReport", {
			playerId:id,
			titleKey:titleKey,
			titleArgs:titleArgs,
			contentKey:contentKey,
			contentArgs:contentArgs
		}, e.stack)
		callback();
	})
}

/**
 * 发送联盟邮件
 * @param id
 * @param allianceId
 * @param title
 * @param content
 * @param callback
 */
pro.sendAllianceMail = function(id, allianceId, title, content, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var allianceDoc = null
	var lockPairs = [];
	var memberIds = [];
	var mailToPlayer = null;
	var mailToMember = null;
	this.cacheService.findPlayerAsync(id).then(function(doc){
		playerDoc = doc
		return self.cacheService.findAllianceAsync(allianceId)
	}).then(function(doc){
		allianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(allianceDoc, id)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "sendAllianceMail"))
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(id, allianceId, "sendAllianceMail"));
		lockPairs.push({type:Consts.Pairs.Player, value:playerDoc._id});
		return self.cacheService.lockAllAsync(lockPairs, true);
	}).then(function(){
		_.each(allianceDoc.members, function(member){
			if(!_.isEqual(member.id, id)) memberIds.push(member.id);
		})

		mailToPlayer = {
			id:ShortId.generate(),
			title:title,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:allianceDoc.basicInfo.tag,
			toId:"__allianceMembers",
			toName:"__allianceMembers",
			content:content,
			sendTime:Date.now()
		}
		mailToMember = {
			id:ShortId.generate(),
			title:title,
			fromId:playerDoc._id,
			fromName:playerDoc.basicInfo.name,
			fromIcon:playerDoc.basicInfo.icon,
			fromAllianceTag:allianceDoc.basicInfo.tag,
			content:content,
			sendTime:Date.now(),
			rewards:[],
			rewardGetted:false,
			isRead:false,
			isSaved:false
		};
		while(playerDoc.sendMails.length >= Define.PlayerSendMailsMaxSize){
			(function(){
				playerDoc.sendMails.shift()
				playerData.push(["sendMails.0", null])
			})();
		}
		playerDoc.sendMails.push(mailToPlayer)
		playerData.push(["sendMails." + playerDoc.sendMails.indexOf(mailToPlayer), mailToPlayer])

		while(playerDoc.mails.length >= Define.PlayerMailsMaxSize){
			var mail = LogicUtils.getPlayerFirstUnSavedMail(playerDoc)
			playerData.push(["mails." + playerDoc.mails.indexOf(mail), null])
			LogicUtils.removeItemInArray(playerDoc.mails, mail)
		}
		playerDoc.mails.push(mailToMember)
		playerData.push(["mails." + playerDoc.mails.indexOf(mailToMember), mailToMember])
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback();
	}).then(
		function(){
			(function sendMailToMembers(){
				if(memberIds.length === 0) return;
				var memberId = memberIds.pop();
				var memberDoc = null;
				var memberData = [];
				lockPairs = [];
				self.cacheService.findPlayerAsync(memberId).then(function(doc){
					memberDoc = doc;
					lockPairs.push({type:Consts.Pairs.Player, value:memberDoc._id});
					return self.cacheService.lockAllAsync(lockPairs, true);
				}).then(function(){
					while(memberDoc.mails.length >= Define.PlayerMailsMaxSize){
						var mail = LogicUtils.getPlayerFirstUnSavedMail(memberDoc)
						playerData.push(["mails." + memberDoc.mails.indexOf(mail), null])
						LogicUtils.removeItemInArray(memberDoc.mails, mail)
					}
					memberDoc.mails.push(mailToMember)
					memberData.push(["mails." + memberDoc.mails.indexOf(mailToMember), mailToMember])
				}).then(function(){
					return self.cacheService.touchAllAsync(lockPairs);
				}).then(function(){
					return self.cacheService.unlockAllAsync(lockPairs);
				}).then(function(){
					return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData);
				}).catch(function(e){
					self.logService.onError("cache.dataService.sendAllianceMail", {
						playerId:id,
						memberId:memberDoc._id,
						allianceId:allianceId,
						title:title,
						content:content
					}, e.stack)
					if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
				}).finally(function(){
					sendMailToMembers();
				})
			})();
		},
		function(e){
			if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
			callback(e);
		}
	)
}

/**
 * 为玩家添加道具
 * @param playerDoc
 * @param playerData
 * @param api
 * @param params
 * @param items
 * @param callback
 */
pro.addPlayerItems = function(playerDoc, playerData, api, params, items, callback){
	if(items.length === 0) return callback();
	var self = this;
	var gemItems = [];
	_.each(items, function(_item){
		var item = _.find(playerDoc.items, function(item){
			return _.isEqual(item.name, _item.name)
		})
		if(!item){
			item = {
				name:_item.name,
				count:0
			}
			playerDoc.items.push(item)
		}
		item.count += _item.count
		playerData.push(["items." + playerDoc.items.indexOf(item), item])
		if(_item.name.indexOf('gemClass_') === 0){
			gemItems.push(_item);
		}
	})

	if(gemItems.length === 0) return callback();
	var gemAdd = {
		playerId:playerDoc._id,
		playerName:playerDoc.basicInfo.name,
		items:gemItems,
		api:api,
		params:params
	}
	this.app.get('GemAdd').createAsync(gemAdd).then(function(){
		callback();
	}).catch(function(e){
		self.logService.onError("cache.dataService.addPlayerItems", {
			api:api,
			params:params,
			items:items
		}, e.stack)
		callback();
	})
}

/**
 * 为玩家添加奖励
 * @param playerDoc
 * @param playerData
 * @param api
 * @param params
 * @param rewards
 * @param forceAdd
 * @param callback
 */
pro.addPlayerRewards = function(playerDoc, playerData, api, params, rewards, forceAdd, callback){
	var self = this;
	var items = [];
	var gems = 0;
	_.each(rewards, function(reward){
		var type = reward.type
		var name = reward.name
		var count = reward.count
		if(_.isEqual("items", type)){
			items.push({name:name, count:count});
		}else if(_.contains(Consts.MaterialDepotTypes, type)){
			LogicUtils.addPlayerMaterials(playerDoc, playerData, type, [{name:name, count:count}], forceAdd);
		}else if(_.isEqual('resources', type)){
			playerDoc[type][name] += count
			if(name === 'gem'){
				gems += count;
			}
		}else if(!!playerDoc[type] && _.isNumber(playerDoc[type][name])){
			playerDoc[type][name] += count
			playerData.push([type + "." + name, playerDoc[type][name]])
		}
	})

	return this.addPlayerItemsAsync(playerDoc, playerData, api, params, items).then(function(){
		if(gems > 0){
			var gemAdd = {
				playerId:playerDoc._id,
				playerName:playerDoc.basicInfo.name,
				changed:gems,
				left:playerDoc.resources.gem,
				api:api,
				params:params
			}
			return self.GemChange.createAsync(gemAdd);
		}
	}).then(function(){
		callback();
	}).catch(function(e){
		self.logService.onError("cache.dataService.addPlayerRewards", {
			api:api,
			params:params,
			rewards:rewards,
			forceAdd:forceAdd
		}, e.stack)
		callback();
	})
}

/**
 * 将此联盟所有外在的联盟弹回
 * @param allianceId
 * @param callback
 */
pro.returnAllianceOutTroops = function(allianceId, callback){
	var self = this
	var allianceDoc = null
	var allianceData = []
	var lockPairs = [];
	var updateFuncs = [];
	var eventFuncs = [];
	var pushFuncs = [];
	var membersEvents = null;
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc;
		membersEvents = {};
		_.each(allianceDoc.members, function(member){
			var strikeMarchEvents = _.filter(allianceDoc.marchEvents.strikeMarchEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var strikeMarchReturnEvents = _.filter(allianceDoc.marchEvents.strikeMarchReturnEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var attackMarchEvents = _.filter(allianceDoc.marchEvents.attackMarchEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var attackMarchReturnEvents = _.filter(allianceDoc.marchEvents.attackMarchReturnEvents, function(event){
				return event.attackPlayerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			var villageEvents = _.filter(allianceDoc.villageEvents, function(event){
				return event.playerData.id === member.id && event.fromAlliance.id !== event.toAlliance.id;
			})
			if(strikeMarchEvents.length > 0 || strikeMarchReturnEvents.length > 0 || attackMarchEvents.length > 0 || attackMarchReturnEvents.length > 0 || villageEvents.length > 0){
				membersEvents[member.id] = {
					strikeMarchEvents:strikeMarchEvents,
					strikeMarchReturnEvents:strikeMarchReturnEvents,
					attackMarchEvents:attackMarchEvents,
					attackMarchReturnEvents:attackMarchReturnEvents,
					villageEvents:villageEvents
				}
			}
		})

		lockPairs.push({type:Consts.Pairs.Alliance, value:allianceDoc._id});
		_.each(_.keys(membersEvents), function(memberId){
			lockPairs.push({type:Consts.Pairs.Player, value:memberId});
		})
		_.each(allianceDoc.villageEvents, function(event){
			if(event.fromAlliance.id !== event.toAlliance.id) lockPairs.push({type:Consts.Pairs.Alliance, value:memberId});
		})
		return self.cacheService.lockAllAsync(lockPairs, true);
	}).then(function(){
		var returnMemberTroops = function(memberId, memberEvents){
			var memberDoc = null;
			var memberData = [];
			return self.cacheService.findPlayerAsync(memberId).then(function(doc){
				memberDoc = doc;
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, memberDoc, memberData]);
				_.each(memberEvents.strikeMarchEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'strikeMarchEvents', marchEvent]);
					allianceData.push(["marchEvents.strikeMarchEvents." + allianceDoc.marchEvents.strikeMarchEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.strikeMarchEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "strikeMarchEvents", marchEvent.id])

					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
				})
				_.each(memberEvents.strikeMarchReturnEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'strikeMarchReturnEvents', marchEvent]);
					allianceData.push(["marchEvents.strikeMarchReturnEvents." + allianceDoc.marchEvents.strikeMarchReturnEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.strikeMarchReturnEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "strikeMarchReturnEvents", marchEvent.id])

					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
				})
				_.each(memberEvents.attackMarchEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'attackMarchEvents', marchEvent]);
					allianceData.push(["marchEvents.attackMarchEvents." + allianceDoc.marchEvents.attackMarchEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.attackMarchEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "attackMarchEvents", marchEvent.id])

					LogicUtils.removePlayerTroopOut(memberDoc, marchEvent.attackPlayerData.dragon.type);
					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
					LogicUtils.addPlayerSoldiers(memberDoc, memberData, marchEvent.attackPlayerData.soldiers)
				})
				_.each(memberEvents.attackMarchReturnEvents, function(marchEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeMarchEventAsync, 'attackMarchReturnEvents', marchEvent]);
					allianceData.push(["marchEvents.attackMarchReturnEvents." + allianceDoc.marchEvents.attackMarchReturnEvents.indexOf(marchEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.marchEvents.attackMarchReturnEvents, marchEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "attackMarchReturnEvents", marchEvent.id])

					LogicUtils.removePlayerTroopOut(memberDoc, marchEvent.attackPlayerData.dragon.type);
					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type])
					memberDoc.dragons[marchEvent.attackPlayerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + marchEvent.attackPlayerData.dragon.type, memberDoc.dragons[marchEvent.attackPlayerData.dragon.type]])
					LogicUtils.addPlayerSoldiers(memberDoc, memberData, marchEvent.attackPlayerData.soldiers)
					DataUtils.addPlayerWoundedSoldiers(memberDoc, memberData, marchEvent.attackPlayerData.woundedSoldiers)
					updateFuncs.push([self, self.addPlayerRewardsAsync, memberDoc, memberData, 'returnAllianceOutTroops', null, marchEvent.attackPlayerData.rewards, false]);
				})

				var parseVillageEvent = function(villageEvent){
					pushFuncs.push([self.cacheService, self.cacheService.removeVillageEventAsync, villageEvent]);
					allianceData.push(["villageEvents." + allianceDoc.villageEvents.indexOf(villageEvent), null])
					LogicUtils.removeItemInArray(allianceDoc.villageEvents, villageEvent);
					eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, allianceDoc, "villageEvents", villageEvent.id])

					LogicUtils.removePlayerTroopOut(memberDoc, villageEvent.playerData.dragon.type);
					DataUtils.refreshPlayerDragonsHp(memberDoc, memberDoc.dragons[villageEvent.playerData.dragon.type]);
					memberDoc.dragons[villageEvent.playerData.dragon.type].status = Consts.DragonStatus.Free
					memberData.push(["dragons." + villageEvent.playerData.dragon.type, memberDoc.dragons[villageEvent.playerData.dragon.type]])

					LogicUtils.addPlayerSoldiers(memberDoc, memberData, villageEvent.playerData.soldiers)
					DataUtils.addPlayerWoundedSoldiers(memberDoc, memberData, villageEvent.playerData.woundedSoldiers)

					var resourceCollected = Math.floor(villageEvent.villageData.collectTotal
						* ((Date.now() - villageEvent.startTime)
						/ (villageEvent.finishTime - villageEvent.startTime))
					)

					var targetAllianceDoc = null;
					var targetAllianceData = [];
					return self.cacheService.findAllianceAsync(villageEvent.toAlliance.id).then(function(doc){
						targetAllianceDoc = doc;
						var village = LogicUtils.getAllianceVillageById(targetAllianceDoc, villageEvent.villageData.id)
						village.villageEvent = null;
						targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".villageEvent", village.villageEvent])
						var originalRewards = villageEvent.playerData.rewards
						var resourceName = village.name.slice(0, -7)
						var newRewards = [{
							type:"resources",
							name:resourceName,
							count:resourceCollected
						}]
						LogicUtils.mergeRewards(originalRewards, newRewards)

						village.resource -= resourceCollected
						targetAllianceData.push(["villages." + targetAllianceDoc.villages.indexOf(village) + ".resource", village.resource])
						var collectReport = ReportUtils.createCollectVillageReport(targetAllianceDoc, village, newRewards)
						eventFuncs.push([self, self.sendSysReportAsync, memberDoc._id, collectReport])
						updateFuncs.push([self, self.addPlayerRewardsAsync, memberDoc, memberData, 'returnAllianceOutTroops', null, originalRewards, false]);
						pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, targetAllianceDoc, targetAllianceData]);
					})
				}
				var funcs = [];
				_.each(memberEvents.villageEvents, function(villageEvent){
					funcs.push(parseVillageEvent(villageEvent));
				})
				return Promise.all(funcs);
			}).catch(function(e){
				self.logService.onError('cache.dataService.returnAllianceOutTroops', {
					memberId:memberId,
					memberEvents:memberEvents
				}, e.stack);
			}).finally(function(){
				return Promise.resolve();
			})
		}
		var funcs = [];
		_.each(membersEvents, function(memberEvents, memberId){
			funcs.push(returnMemberTroops(memberId, memberEvents));
		})
		return Promise.all(funcs);
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		self.logService.onError("cache.dataService.returnAllianceOutTroops", {
			allianceId:allianceId
		}, e.stack)
		callback();
	})
}

/**
 * 更新在我方联盟采集村落的相关信息
 * @param allianceId
 * @param callback
 */
pro.updateEnemyVillageEvents = function(allianceId, callback){
	var self = this
	var allianceDoc = null
	var lockPairs = [];
	var pushFuncs = [];
	var enemyAlliances = null;
	this.cacheService.findAllianceAsync(allianceId).then(function(doc){
		allianceDoc = doc;

		enemyAlliances = {};
		_.each(allianceDoc.villages, function(village){
			if(!!village.villageEvent && village.villageEvent.allianceId !== allianceDoc._id){
				if(!enemyAlliances[village.villageEvent.allianceId]) enemyAlliances[village.villageEvent.allianceId] = true
			}
		})
		_.each(_.keys(enemyAlliances), function(allianceId){
			lockPairs.push({type:Consts.Pairs.Player, value:allianceId});
		})
		return self.cacheService.lockAllAsync(lockPairs, true);
	}).then(function(){
		var updateEnemyVillageEventAsync = function(allianceId){
			var enemyAllianceDoc = null;
			var enemyAllianceData = [];
			return self.cacheService.findAllianceAsync(allianceId).then(function(doc){
				enemyAllianceDoc = doc;
				_.each(enemyAllianceDoc.villageEvents, function(villageEvent){
					if(villageEvent.toAlliance.id !== allianceDoc._id) return;
					previousMapIndex = villageEvent.toAlliance.mapIndex;
					villageEvent.toAlliance.mapIndex = allianceDoc.mapIndex;
					enemyAllianceData.push(['villageEvents.' + enemyAllianceDoc.villageEvents.indexOf(villageEvent) + '.toAlliance.mapIndex', villageEvent.toAlliance.mapIndex])
					pushFuncs.push([self.cacheService, self.cacheService.updateVillageEventAsync, previousMapIndex, villageEvent]);
					pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc, enemyAllianceData]);
				})
			}).catch(function(e){
				self.logService.onError('cache.dataService.updateEnemyVillageEvents', {
					allianceId:allianceId
				}, e.stack);
			}).finally(function(){
				return Promise.resolve();
			})
		};
		var funcs = [];
		_.each(_.keys(enemyAlliances), function(allianceId){
			funcs.push(updateEnemyVillageEventAsync(allianceId));
		})
		return Promise.all(funcs);
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		return self.cacheService.unlockAllAsync(lockPairs);
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		self.logService.onError("cache.dataService.updateEnemyVillageEvents", {
			allianceId:allianceId
		}, e.stack)
		if(!ErrorUtils.isObjectLockedError(e) && lockPairs.length > 0) self.cacheService.unlockAll(lockPairs);
		callback();
	})
}

/**
 * 给玩家发送联盟战击杀奖励
 * @param playerId
 * @param callback
 */
pro.sendAllianceFightKillMaxRewards = function(playerId, callback){
	var allianceFightGemClass2Get = DataUtils.getAllianceIntInit('allianceFightGemClass2Get');
	var rewards = [{
		type:'items',
		name:'gemClass_1',
		count:allianceFightGemClass2Get
	}]
	var titleKey = DataUtils.getLocalizationConfig("alliance", "AllianceFightKillFirstRewardTitle")
	var contentKey = DataUtils.getLocalizationConfig("alliance", "AllianceFightKillFirstRewardContent")
	this.sendSysMail(playerId, titleKey, [], contentKey, [], rewards, callback);
}