"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Promise = require("bluebird");
var _ = require("underscore");
var Consts = require("../../../consts/consts");

module.exports = function(app){
	return new RankRemote(app);
};

var RankRemote = function(app){
	this.app = app;
	this.logService = app.get('logService');
	this.rankService = app.get('rankService');
};
var pro = RankRemote.prototype;

/**
 * 刷新活动排行榜
 * @param cacheServerId
 * @param activities
 * @param callback
 */
pro.refreshActivities = function(cacheServerId, activities, callback){
	this.rankService.refreshActivities(cacheServerId, activities);
	callback();
};