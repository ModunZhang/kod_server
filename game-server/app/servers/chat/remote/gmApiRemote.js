"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require('bluebird');

var DataUtils = require('../../../utils/dataUtils')
var LogicUtils = require('../../../utils/logicUtils')

var Define = require("../../../consts/define")
var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")

module.exports = function(app){
	return new GmApiRemote(app)
}

var GmApiRemote = function(app){
	this.app = app
	this.logService = app.get('logService');
	this.channelService = app.get("channelService")
	this.globalChatChannel = this.channelService.getChannel(Consts.GlobalChatChannel, true)
	this.allianceChats = app.get('allianceChats')
	this.allianceFights = app.get('allianceFights')
	this.allianceFightChats = app.get('allianceFightChats')
	this.chats = app.get('chats');
	this.Player = app.get('Player');
	this.Alliance = app.get('Alliance');
}

var pro = GmApiRemote.prototype

/**
 * 发送全服通告
 * @param servers
 * @param type
 * @param content
 * @param callback
 */
pro.sendGlobalNotice = function(servers, type, content, callback){
	this.logService.onEvent('chat.chatRemote.sendGlobalNotice', {servers:servers, type:type, content:content});
	var self = this
	_.each(servers, function(cacheServerId){
		var channel = self.channelService.getChannel(Consts.GlobalChatChannel + "_" + cacheServerId, false)
		if(_.isObject(channel)){
			channel.pushMessage(Events.chat.onNotice, {type:type, content:content}, {}, null)
		}
	})
	callback(null, {code:200, data:null});
}

/**
 * 获取聊天记录
 * @param time
 * @param callback
 */
pro.getGlobalChats = function(time, callback){
	var self = this;
	if(time === 0) return callback(null, {code:200, data:this.chats});

	var sliceFrom = null;
	for(var i = this.chats.length - 1; i >= 0; i--){
		var chat = self.chats[i];
		if(chat.time <= time){
			sliceFrom = i + 1;
			break;
		}
	}
	if(sliceFrom >= 0) return callback(null, {code:200, data:this.chats.slice(sliceFrom)});

	callback(null, {code:200, data:[]});
}

/**
 * 发送系统聊天
 * @param content
 * @param callback
 */
pro.sendSysChat = function(content, callback){
	var message = LogicUtils.createSysChatMessage(content);
	if(this.chats.length > Define.MaxChatCount){
		this.chats.shift()
	}
	this.chats.push(message)
	this.globalChatChannel.pushMessage(Events.chat.onChat, message, {}, null)
	callback(null, {code:200, data:null});
}

/**
 * 发送全服系统邮件
 * @param servers
 * @param title
 * @param content
 * @param rewards
 * @param callback
 */
pro.sendGlobalMail = function(servers, title, content, rewards, callback){
	this.logService.onEvent('chat.chatRemote.sendGlobalMail', {
		servers:servers,
		title:title,
		content:content,
		rewards:rewards
	});

	var self = this;
	_.each(servers, function(serverId){
		self.app.rpc.cache.gmApiRemote.sendGlobalMail.toServer(serverId, title, content, rewards, function(e){
			if(_.isObject(e)){
				self.logService.onEventError('chat.chatRemote.sendGlobalMail', {
					title:title,
					content:content,
					rewards:rewards,
					serverId:serverId
				}, e.stack);
			}
		})
	})
	callback(null, {code:200, data:null});
}

/**
 * 给指定ID发送邮件
 * @param ids
 * @param title
 * @param content
 * @param rewards
 * @param callback
 */
pro.sendMailToPlayers = function(ids, title, content, rewards, callback){
	this.logService.onEvent('chat.gmApiRemote.sendMailToPlayers', {
		ids:ids,
		title:title,
		content:content,
		rewards:rewards
	});

	var self = this;
	var serverIds = {};
	this.Player.collection.find({_id:{$in:ids}}, {serverId:true}).toArray(function(e, docs){
		if(!!e){
			self.logService.onEventError('chat.gmApiRemote.sendMailToPlayers', {
				ids:ids,
				title:title,
				content:content,
				rewards:rewards
			}, e.stack);
		}else{
			_.each(docs, function(doc){
				if(!serverIds[doc.serverId]) serverIds[doc.serverId] = [];
				serverIds[doc.serverId].push(doc._id);
			})
			_.each(serverIds, function(ids, serverId){
				self.app.rpc.cache.gmApiRemote.sendMailToPlayers.toServer(serverId, ids, title, content, rewards, function(e){
					if(_.isObject(e)){
						self.logService.onEventError('chat.gmApiRemote.sendMailToPlayers', {
							ids:ids,
							title:title,
							content:content,
							rewards:rewards
						}, e.stack);
					}
				})
			})
		}
	})

	callback(null, {code:200, data:null})
}

/**
 * 根据ID查询玩家
 * @param id
 * @param callback
 */
pro.findPlayerById = function(id, callback){
	this.logService.onEvent('chat.gmApiRemote.findPlayerById', {id:id});

	var self = this;
	(function(){
		return new Promise(function(resolve, reject){
			self.Player.findById(id, 'serverId').then(function(doc){
				if(!doc) return reject(new Error('玩家不存在'));
				resolve(doc);
			}, function(e){
				reject(e);
			})
		})
	})().then(function(doc){
		return new Promise(function(resolve, reject){
			self.app.rpc.cache.gmApiRemote.findPlayerById.toServer(doc.serverId, doc._id, function(e, doc){
				if(!!e) return reject(e);
				resolve(doc);
			})
		})
	}).then(function(doc){
		callback(null, {code:200, data:doc});
	}).catch(function(e){
		self.logService.onEventError('chat.gmApiRemote.findPlayerById', {
			id:id
		}, e.stack);
		callback(null, {code:500, data:e.message});
	});
}

/**
 * 根据名称查询玩家
 * @param name
 * @param callback
 */
pro.findPlayerByName = function(name, callback){
	this.logService.onEvent('chat.gmApiRemote.findPlayerByName', {name:name});

	var self = this;
	(function(){
		return new Promise(function(resolve, reject){
			self.Player.findOne({'basicInfo.name':{$regex:name, $options:"i"}}, 'serverId').then(function(doc){
				if(!doc) return reject(new Error('玩家不存在'));
				resolve(doc);
			}, function(e){
				reject(e);
			})
		})
	})().then(function(doc){
		return new Promise(function(resolve, reject){
			self.app.rpc.cache.gmApiRemote.findPlayerById.toServer(doc.serverId, doc._id, function(e, doc){
				if(!!e) return reject(e);
				resolve(doc);
			})
		})
	}).then(function(doc){
		callback(null, {code:200, data:doc});
	}).catch(function(e){
		self.logService.onEventError('chat.gmApiRemote.findPlayerById', {
			name:name
		}, e.stack);
		callback(null, {code:500, data:e.message});
	});
}

/**
 * 临时添加玩家宝石
 * @param id
 * @param gem
 * @param callback
 */
pro.tempAddPlayerGem = function(id, gem, callback){
	this.logService.onEvent('chat.gmApiRemote.tempAddPlayerGem', {id:id, gem:gem});

	var self = this;
	(function(){
		return new Promise(function(resolve, reject){
			self.Player.findById(id, 'serverId').then(function(doc){
				if(!doc) return reject(new Error('玩家不存在'));
				resolve(doc);
			}, function(e){
				reject(e);
			})
		})
	})().then(function(doc){
		return new Promise(function(resolve, reject){
			self.app.rpc.cache.gmApiRemote.tempAddPlayerGem.toServer(doc.serverId, doc._id, gem, function(e){
				if(!!e) return reject(e);
				resolve();
			})
		})
	}).then(function(){
		callback(null, {code:200, data:null});
	}).catch(function(e){
		self.logService.onEventError('chat.gmApiRemote.tempAddPlayerGem', {
			id:id,
			gem:gem
		}, e.stack);
		callback(null, {code:500, data:e.message});
	});
}

/**
 * 根据ID查询联盟
 * @param id
 * @param callback
 */
pro.findAllianceById = function(id, callback){
	this.logService.onEvent('chat.gmApiRemote.findAllianceById', {id:id});

	var self = this;
	(function(){
		return new Promise(function(resolve, reject){
			self.Alliance.findById(id, 'serverId').then(function(doc){
				if(!doc) return reject(new Error('联盟不存在'));
				resolve(doc);
			}, function(e){
				reject(e);
			})
		})
	})().then(function(doc){
		return new Promise(function(resolve, reject){
			self.app.rpc.cache.gmApiRemote.findAllianceById.toServer(doc.serverId, doc._id, function(e, doc){
				if(!!e) return reject(e);
				resolve(doc);
			})
		})
	}).then(function(doc){
		callback(null, {code:200, data:doc});
	}).catch(function(e){
		self.logService.onEventError('chat.gmApiRemote.findAllianceById', {
			id:id
		}, e.stack);
		callback(null, {code:500, data:e.message});
	});
}

/**
 * 根据Tag查询联盟
 * @param tag
 * @param callback
 */
pro.findAllianceByTag = function(tag, callback){
	this.logService.onEvent('chat.gmApiRemote.findAllianceByTag', {tag:tag});

	var self = this;
	(function(){
		return new Promise(function(resolve, reject){
			self.Alliance.findOne({'basicInfo.tag':{$regex:tag, $options:"i"}}, 'serverId').then(function(doc){
				if(!doc) return reject(new Error('联盟不存在'));
				resolve(doc);
			}, function(e){
				reject(e);
			})
		})
	})().then(function(doc){
		return new Promise(function(resolve, reject){
			self.app.rpc.cache.gmApiRemote.findAllianceById.toServer(doc.serverId, doc._id, function(e, doc){
				if(!!e) return reject(e);
				resolve(doc);
			})
		})
	}).then(function(doc){
		callback(null, {code:200, data:doc});
	}).catch(function(e){
		self.logService.onEventError('chat.gmApiRemote.findAllianceByTag', {
			tag:tag
		}, e.stack);
		callback(null, {code:500, data:e.message});
	});
}
