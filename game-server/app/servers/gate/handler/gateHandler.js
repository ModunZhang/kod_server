"use strict"

/**
 * Created by modun on 14-7-22.
 */

var dispatcher = require('../../../utils/dispatcher')

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
	var logicServers = this.app.getServersByType('logic')
	var logicServer = dispatcher.dispatch(logicServers)
	var data = {
		id:logicServer.id,
		host:logicServer.host,
		port:logicServer.clientPort
	}
	next(null,{
		data:data,
		code:200
	})
}