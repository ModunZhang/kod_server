/**
 * Created by modun on 15/5/8.
 */
var _ = require("underscore")
var toobusy = require("toobusy-js")

var ErrorUtils = require("../utils/errorUtils")

var FilterService = function(app){
	this.app = app
	this.toobusyMaxLag = 100
	this.toobusyInterval = 500

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
		if(_.isEqual("logic.entryHandler.login", msg.__route__) || !!session.uid) next()
		else next(ErrorUtils.illegalRequest(msg))
	}
	return {before:before}
}