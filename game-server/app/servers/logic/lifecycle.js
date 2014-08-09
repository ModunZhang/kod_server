/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")

var PlayerService = require("../../services/playerService")
var PushService = require("../../services/pushService")
var CallbackService = require("../../services/callbackService")

var life = module.exports

life.beforeStartup = function(app, cb){
	cb()
}

life.afterStartup = function(app, cb){
	app.set("pushService", new PushService(app))
	app.set("callbackService", new CallbackService(app))
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))

	cb()
}

life.beforeShutdown = function(app, cb){
	cb()
}

life.afterStartAll = function(app){

}