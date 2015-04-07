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
	this.servers = [
		{
			id:"World-1",
			isPromoted:true,
			isNew:true
		},
		{
			id:"World-2",
			isPromoted:false,
			isNew:true
		},
		{
			id:"World-3",
			isPromoted:false,
			isNew:true
		}
	]
}
module.exports = GateService
var pro = GateService.prototype

/**
 * 启动
 */
pro.start = function(){
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
	this.logicServers = this.app.getServersByType('logic')
	var getOnlineUserAsync = Promise.promisify(getOnlineUser, this)
	setInterval(function(){
		var funcs = []
		_.each(self.logicServers, function(logicServer){
			funcs.push(getOnlineUserAsync(logicServer))
		})
		Promise.all(funcs).then(function(){
			self.logicServers = _.sortBy(self.logicServers, function(logicServer){
				return logicServer.userCount
			})
		})
	}, 5 * 1000)
}

/**
 * 获取推荐的逻辑服务器
 * @returns {*}
 */
pro.getPromotedLogicServer = function(){
	return this.logicServers[0]
}

/**
 * 获取服务器列表
 * @returns {Array}
 */
pro.getServers = function(){
	return this.servers
}

/**
 * 获取推荐的服务器
 * @returns {*}
 */
pro.getPromotedServer = function(){
	return _.find(this.servers, function(server){
		return server.isPromoted
	})
}