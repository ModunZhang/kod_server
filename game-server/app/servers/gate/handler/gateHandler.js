"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Dispatcher = require('../../../utils/dispatcher')

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
	if(!this.app.get("isReady")){
		next(null,{
			message:"服务器维护中",
			code:500
		})
		return
	}

	var logicServers = this.app.getServersByType('logic')
	var logicServer = Dispatcher.dispatch(logicServers)
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