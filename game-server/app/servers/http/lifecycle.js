"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var mongoBackup = require('mongodb_s3_backup')

var LogService = require("../../services/logService")

var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")
var Billing = require("../../domains/billing")

var life = module.exports

life.beforeStartup = function(app, callback){
	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("Billing", Promise.promisifyAll(Billing))

	app.set("logService", new LogService(app))

	callback()
}

life.afterStartup = function(app, callback){
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
	var serverConfig = app.get('serverConfig');
	if(!serverConfig.mongoBackupEnabled) return;

	var config = serverConfig.mongoBackup;
	(function backupMongo(){
		var timeout = setTimeout(function(){
			app.get("logService").onEvent('mongo backup start');
			mongoBackup.sync(config.mongodb, config.s3, function(e){
				if(!!e) app.get("logService").onError('mongo backup finished with error', null, e.stack);
				else app.get("logService").onEvent('mongo backup finished');
				backupMongo();
			})
		}, 1000 * 60 * 60 * 4);
		timeout.unref();
	})();

	callback()
}

life.beforeShutdown = function(app, callback){
	app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
	setTimeout(callback, 1000)
}

life.afterStartAll = function(app){

}