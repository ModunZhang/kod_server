"use strict"

/**
 * Created by modun on 14-7-22.
 */

var dispatcher = require('../../../utils/dispatcher')
var Utils = require("../../../utils/utils")

module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
}

var pro = Handler.prototype

/**
 * 获取前端服务器
 * @param msg
 * @param session
 * @param next
 */
pro.queryEntry = function(msg, session, next){
	var frontServers = this.app.getServersByType('front')
	var frontServer = dispatcher.dispatch(frontServers)
	next(null,Utils.next({
		id:frontServer.id,
		host:frontServer.host,
		port:frontServer.clientPort
	}, 200))
}