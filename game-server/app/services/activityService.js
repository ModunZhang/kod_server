"use strict";

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore");
var Promise = require("bluebird");
var ShortId = require("shortid");

var LogicUtils = require('../utils/logicUtils');
var DataUtils = require('../utils/dataUtils');

var Consts = require("../consts/consts");
var Define = require("../consts/define");

var GameDatas = require("../datas/GameDatas");
var ScheduleActivities = GameDatas.ScheduleActivities;

var ActivityService = function(app){
	this.app = app;
	this.logService = app.get("logService");
	this.ServerState = app.get("ServerState");
	this.cacheServerId = app.getServerId();
	this.activities = {
		in:[],
		expired:[],
		next:[]
	};
};
module.exports = ActivityService;
var pro = ActivityService.prototype;

pro.init = function(callback){
	var self = this;
	self.ServerState.findByIdAsync(self.cacheServerId).then(function(doc){
		var activities = doc.activities.toObject();
		self.activities.in = activities.in;
		self.activities.expired = activities.expired;
		self.activities.next = activities.next;
	}).then(function(){
		callback();
	}).catch(function(e){
		callback(e);
	});
};

pro.createActivity = function(type, dateToStart, callback){
	if(!_.contains(_.keys(ScheduleActivities.type), type)){
		return callback(new Error('活动类型不存在'));
	}
	var self = this;
	var activities = [].concat(self.activities.in).concat(self.activities.expired).concat(self.activities.next);
	var alreadyExist = _.some(activities, function(activity){
		return activity.type === type;
	});
	if(alreadyExist){
		return callback(new Error('活动已经存在'));
	}

};

pro.deleteActivity = function(type, callback){

};