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
		var timeUsed = Date.now() - session.__reqTime;
		self.app.get('logService').onTime(msg.__route__, !!resp.code ? resp.code : 500, session.uid, session.get('name'), timeUsed);
		next();
	}
	return {before:before, after:after};
}