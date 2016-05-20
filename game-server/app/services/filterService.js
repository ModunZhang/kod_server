"use strict";

/**
 * Created by modun on 15/5/8.
 */
var _ = require("underscore")
var toobusy = require("toobusy-js")
var KeywordFilter = require('keyword-filter');
var ErrorUtils = require("../utils/errorUtils");
var Consts = require("../consts/consts");
var GameData = require('../datas/GameDatas');

var Keywords = GameData.Keywords;

var FilterService = function(app){
	this.app = app;
	this.toobusyMaxLag = 70;
	this.toobusyInterval = 250;
	this.wordsFilterUtil = new KeywordFilter();

	toobusy.maxLag(this.toobusyMaxLag);
	toobusy.interval(this.toobusyInterval);

	var words = [].concat(_.keys(Keywords.cn)).concat(_.keys(Keywords.en));
	this.wordsFilterUtil.init(words);
};
module.exports = FilterService;
var pro = FilterService.prototype;

/**
 * 获取服务器负载过滤器
 * @returns {{before}}
 */
pro.toobusyFilter = function(){
	var before = function(msg, session, next){
		if(toobusy()) next(ErrorUtils.serverTooBusy("logic.filterService.toobusyFilter.before", msg))
		else next()
	}
	return {before:before}
}

/**
 * 玩家是否登录
 * @returns {{before: Function}}
 */
pro.loginFilter = function(){
	var before = function(msg, session, next){
		var route = msg.__route__;
		if(route !== 'logic.entryHandler.login'){
			if(!session.uid || !session.get('logicServerId') || !session.get('cacheServerId'))
				return next(ErrorUtils.illegalRequest(msg));
		}else{
			if(!!session.uid || !!session.get('logicServerId') || !!session.get('cacheServerId'))
				return next(ErrorUtils.illegalRequest(msg));
		}
		next();
	}
	return {before:before}
}

/**
 * 玩家数据是否初始化
 * @returns {{before: Function}}
 */
pro.initFilter = function(){
	var before = function(msg, session, next){
		var route = msg.__route__;
		if(route !== 'logic.entryHandler.login' && route !== 'logic.playerHandler.initPlayerData'){
			if(!session.get('inited'))
				return next(ErrorUtils.illegalRequest(msg));
		}
		next();
	}
	return {before:before};
}

/**
 * 敏感词过滤
 */
pro.wordsFilter = function(){
	var self = this;
	var before = function(msg, session, next){
		//var route = msg.__route__;
		//if(route === 'chat.chatHandler.send' && msg.channel === Consts.ChannelType.Global){
		//	var text = msg.text;
		//	if(self.wordsFilterUtil.hasKeyword(text)){
		//		msg.text = self.wordsFilterUtil.replaceKeywords(text, "*");
		//	}
		//}
		next();
	};
	return {before:before};
};

/**
 * 请求处理时间过滤
 * @returns {{before: Function, after: Function}}
 */
pro.requestTimeFilter = function(){
	var self = this;
	var before = function(msg, session, next){
		session.__reqTime = Date.now();
		next();
	}
	var after = function(err, msg, session, resp, next){
		var timeUsed = !!session.__reqTime ? Date.now() - session.__reqTime : 0;
		var uid = !!session.uid ? session.uid : null;
		var uname = !!session.get('name') ? session.get('name') : null;
		var code = !!resp && !_.isUndefined(resp.code) ? resp.code : 500;
		self.app.get('logService').onRequest(msg.__route__, code, uid, uname, timeUsed, msg);
		next();
	}
	return {before:before, after:after};
}