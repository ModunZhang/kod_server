/**
 * Created by modun on 14-7-22.
 */

var dispatcher = require('../../../utils/dispatcher')
var utils = require("../../../utils/utils")

module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
}

var pro = Handler.prototype

pro.queryEntry = function(msg, session, next){
	var logicServers = this.app.getServersByType('logic')
	var logicServer = dispatcher.dispatch(logicServers)
	next(null,utils.next({
		id:logicServer.id,
		host:logicServer.host,
		port:logicServer.clientPort
	}, 200))
}