"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var GateService = function(app){
	this.app = app
	this.serverId = app.getServerId()
	this.logService = app.get("logService")
	this.logicServers = null
}
module.exports = GateService
var pro = GateService.prototype

/**
 * 启动
 */
pro.init = function(){
	var self = this
	var getOnlineUser = function(logicServer, callback){
		self.app.rpc.logic.logicRemote.getOnlineUser.toServer(logicServer.id, function(e, count){
			if(_.isObject(e)){
				self.logService.onEventError("gateService.start", logicServer, e.stack)
				logicServer.userCount = 999999
				callback()
			}else{
				logicServer.userCount = count
				callback()
			}
		})
	}

	this.logicServers = this.app.getServersByType("logic")
	var getOnlineUserAsync = Promise.promisify(getOnlineUser, this)
	setInterval(function(){
		var funcs = []
		_.each(self.logicServers, function(logicServer){
			funcs.push(getOnlineUserAsync(logicServer))
		})
		Promise.all(funcs)
	}, 5 * 1000)
}

/**
 * 获取推荐的逻辑服务器
 * @returns {*}
 */
pro.getPromotedLogicServer = function(cacheServerId){
	if(!_.isObject(this.logicServers)) return null
	var logicServers = _.filter(this.logicServers, function(logicServer){
		return _.isEqual(logicServer.usedFor, cacheServerId)
	})
	logicServers = _.sortBy(logicServers, function(logicServer){
		return logicServer.userCount
	})
	return logicServers[0]
}

/**
 * 获取服务器列表
 * @returns {Array}
 */
pro.getServers = function(){
	return this.app.getServersByType("cache")
}

/**
 * 获取推荐的服务器
 * @returns {*}
 */
pro.getPromotedServer = function(){
	return _.find(this.app.getServersByType("cache"), function(server){
		return server.isPromoted == "true"
	})
}