"use strict"

/**
 * Created by modun on 14-10-22.
 */

module.exports = function(app){
	return new Cron(app)
}
var Cron = function(app){
	this.app = app
}
var pro = Cron.prototype

pro.resetDonateStatus = function(){
	console.log('%s server is sending money now!', this.app.serverId)

}