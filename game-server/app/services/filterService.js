/**
 * Created by modun on 15/5/8.
 */
var _ = require("underscore")
var toobusy = require("toobusy-js")

var ErrorUtils = require("../utils/errorUtils")

var FilterService = function(app){
	this.app = app
	this.toobusyMaxLag = 70
	this.toobusyInterval = 250

	toobusy.maxLag(this.toobusyMaxLag)
	toobusy.interval(this.toobusyInterval)
}
module.exports = FilterService
var pro = FilterService.prototype

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
			if(_.isEmpty(session.uid) || _.isEmpty(session.get('logicServerId')))
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
	return {before:before}
}