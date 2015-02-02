"use strict"

/**
 * Created by modun on 15/2/1.
 */

var PlayerIAPService = function(app){
	this.app = app
	this.env = app.get("env")
}

module.exports = PlayerIAPService
var pro = PlayerIAPService.prototype

pro.addPlayerBillingDatas = function(playerId, billingDatas,callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isArray(billingDatas)){
		callback(new Error("billingDatas 不合法"))
	}
}