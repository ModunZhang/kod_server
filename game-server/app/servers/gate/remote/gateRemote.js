"use strict"

/**
 * Created by modun on 14/10/28.
 */

module.exports = function(app) {
	return new GateRemote(app)
}

var GateRemote = function(app) {
	this.app = app
}
var pro = GateRemote.prototype


/**
 * 设置服务器状态
 * @param status
 * @param callback
 */
pro.setServerStatus = function(status, callback){
	this.app.set("isReady", status)
	callback()
}