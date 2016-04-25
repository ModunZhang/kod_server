"use strict"

/**
 * Created by modun on 14-8-9.
 */
var _ = require("underscore")
var Promise = require("bluebird")
var mongoBackup = require('mongodb_s3_backup')

var LogService = require("../../services/logService")

var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")
var Billing = require("../../domains/billing")
var Device = require("../../domains/device")
var GemChange = require("../../domains/gemChange")
var GemAdd = require("../../domains/gemAdd")
var Analyse = require("../../domains/analyse")
var DailyReport = require("../../domains/dailyReport")

var life = module.exports

life.beforeStartup = function(app, callback){
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "gate")){
			app.set("getServerId", id)
		}else if(_.isEqual(server.serverType, "chat")){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "rank")){
			app.set("rankServerId", id)
		}else if(_.isEqual(server.serverType, "http")){
			app.set("httpServerId", id)
		}
	})

	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))
	app.set("Billing", Promise.promisifyAll(Billing))
	app.set("Device", Promise.promisifyAll(Device))
	app.set("GemChange", Promise.promisifyAll(GemChange))
	app.set("GemAdd", Promise.promisifyAll(GemAdd))
	app.set("Analyse", Promise.promisifyAll(Analyse))
	app.set("DailyReport", Promise.promisifyAll(DailyReport))

	app.set("logService", new LogService(app))
	app.set("gmChats", {});
	app.set("gmChatMaxLength", 20);

	callback()
}

life.afterStartup = function(app, callback){
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
	callback()

	var serverConfig = app.get('serverConfig');
	if(!serverConfig.mongoBackupEnabled) return;
	var config = serverConfig.mongoBackup;
	(function backupMongo(){
		setTimeout(function(){
			app.get("logService").onEvent('mongo backup start');
			mongoBackup.sync(config.mongodb, config.s3, function(e){
				if(!!e) app.get("logService").onError('mongo backup finished with error', null, e.stack);
				else app.get("logService").onEvent('mongo backup finished');
				backupMongo();
			})
		}, 1000 * 60 * 60 * 4);
	})();
}

life.beforeShutdown = function(app, callback){
	app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
	setTimeout(callback, 1000)
}

life.afterStartAll = function(app){

}