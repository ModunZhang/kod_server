"use strict";

/**
 * Created by modun on 14-7-23.
 */
var ShortId = require("shortid");
var Promise = require("bluebird");
var _ = require("underscore");
var sprintf = require("sprintf");

var Utils = require("../utils/utils");
var DataUtils = require("../utils/dataUtils");
var LogicUtils = require("../utils/logicUtils");
var TaskUtils = require("../utils/taskUtils");
var ErrorUtils = require("../utils/errorUtils");
var ItemUtils = require('../utils/itemUtils');
var Events = require("../consts/events");
var Consts = require("../consts/consts");
var Define = require("../consts/define");

var PlayerApiService6 = function(app){
	this.app = app;
	this.env = app.get("env");
	this.logService = app.get("logService");
	this.dataService = app.get("dataService");
	this.cacheService = app.get('cacheService');
	this.activityService = app.get('activityService');
	this.GemChange = app.get("GemChange");
	this.ServerState = app.get('ServerState');
	this.cacheServerId = app.getServerId();
	this.rankServerId = app.get('rankServerId');
	this.pushService = app.get('pushService');
	this.timeEventService = app.get('timeEventService');
};
module.exports = PlayerApiService6;
var pro = PlayerApiService6.prototype;

/**
 * 添加黑名单
 * @param playerId
 * @param memberId
 * @param memberName
 * @param memberIcon
 * @param callback
 */
pro.addBlocked = function(playerId, memberId, memberName, memberIcon, callback){
	var self = this;
	var playerDoc = null;
	var playerData = [];
	var lockPairs = [];
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc;
		lockPairs.push({key:Consts.Pairs.Player, value:playerDoc._id});
	}).then(function(){
		var isBlocked = _.some(playerDoc.blocked, function(_blocked){
			return _blocked.id === memberId;
		});
		if(!isBlocked){
			var _blocked = {
				id:memberId,
				name:memberName,
				icon:memberIcon
			};
			playerDoc.blocked.push(_blocked);
			playerData.push(['blocked.' + playerDoc.blocked.indexOf(_blocked), _blocked]);
			if(playerDoc.blocked.length > DataUtils.getPlayerIntInit('MaxBlockedSize')){
				_removeBlocked = playerDoc.blocked[0];
				playerData.push(['blocked.' + playerDoc.blocked.indexOf(_removeBlocked), null]);
				LogicUtils.removeItemInArray(playerDoc.blocked, _removeBlocked);
			}
		}
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		callback(null, playerData);
	}).catch(function(e){
		callback(e);
	});
};

/**
 * 移除黑名单
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.removeBlocked = function(playerId, memberId, callback){
	var self = this;
	var playerDoc = null;
	var playerData = [];
	var lockPairs = [];
	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc;
		lockPairs.push({key:Consts.Pairs.Player, value:playerDoc._id});
	}).then(function(){
		var _removeBlocked = LogicUtils.getObjectById(playerDoc.blocked, memberId);
		if(!!_removeBlocked){
			playerData.push(['blocked.' + playerDoc.blocked.indexOf(_removeBlocked), null]);
			LogicUtils.removeItemInArray(playerDoc.blocked, _removeBlocked);
		}
	}).then(function(){
		return self.cacheService.touchAllAsync(lockPairs);
	}).then(function(){
		callback(null, playerData);
	}).catch(function(e){
		callback(e);
	});
};

/**
 * 获取游戏状态信息
 * @param callback
 */
pro.getGameInfo = function(callback){
	callback(null, this.app.get('__gameInfo'));
};