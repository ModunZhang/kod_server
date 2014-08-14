/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var PlayerService = require("../../services/playerService")
var PushService = require("../../services/pushService")
var CallbackService = require("../../services/callbackService")
var Consts = require("../../consts/consts")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

var life = module.exports

life.beforeStartup = function(app, cb){
	cb()
}

life.afterStartup = function(app, cb){
	app.set("pushService", new PushService(app))
	app.set("callbackService", new CallbackService(app))
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))

	var globalSessionService = app.get("globalChannelService")
	var destroyChannel = Promise.promisify(globalSessionService.destroyChannel, globalSessionService)
	destroyChannel(Consts.GlobalChannelName).then(function(){
		cb()
	}).catch(function(e){
		errorLogger.error("handle afterStartup Error -----------------------------")
		errorLogger.error(e.stack)
		//		errorMailLogger.error("handle afterStartup Error -----------------------------")
		//		errorMailLogger.error(e.stack)
		cb()
	})
}

life.beforeShutdown = function(app, cb){
	var globalSessionService = app.get("globalChannelService")
	var getMembersBySid = Promise.promisify(globalSessionService.getMembersBySid, globalSessionService)
	getMembersBySid(Consts.GlobalChannelName, app.getServerId()).then(function(uids){
		console.log(uids)
		var sessionService = app.get("sessionService")
		var kick = Promise.promisify(sessionService.kick, sessionService)
		var funcs = []
		_.each(uids, function(uid){
			funcs.push(kick(uid, "server shutdown"))
		})
		Promise.all(funcs).then(function(){
			cb()
		}).catch(function(e){
			errorLogger.error("handle beforeShutdown Error -----------------------------")
			errorLogger.error(e.stack)
			//		errorMailLogger.error("handle beforeShutdown Error -----------------------------")
			//		errorMailLogger.error(e.stack)
			cb()
			cb()
		})
	}).catch(function(e){
		errorLogger.error("handle beforeShutdown Error -----------------------------")
		errorLogger.error(e.stack)
//		errorMailLogger.error("handle beforeShutdown Error -----------------------------")
//		errorMailLogger.error(e.stack)
		cb()
	})
}

life.afterStartAll = function(app){

}