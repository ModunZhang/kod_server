"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var LogService = require("../../services/logService")
var ErrorUtils = require("../../utils/errorUtils")
var Consts = require("../../consts/consts")

var life = module.exports

life.beforeStartup = function(app, callback){
	var currentServer = app.getServerFromConfig(app.getServerId())
	app.set("logicServerId", currentServer.id)
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "chat") && _.isEqual(server.usedFor, currentServer.usedFor)){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "rank") && _.isEqual(server.usedFor, currentServer.usedFor)){
			app.set("rankServerId", id)
		}else if(_.isEqual(server.serverType, "cache") && _.isEqual(server.id, currentServer.usedFor)){
			app.set("cacheServerId", id)
		}else if(_.isEqual(server.serverType, "gate")){
			app.set("gateServerId", id)
		}
	})

	app.set("logService", new LogService(app))

	var request = function(api, params){
		return new Promise(function(resolve, reject){
			app.rpc.cache.cacheRemote.request.toServer(app.get('cacheServerId'), api, params, function(e, resp){
				if(_.isObject(e)) reject(e)
				else if(resp.code == 200) resolve(resp.data)
				else reject(ErrorUtils.createError(resp.code, resp.data, false))
			})
		})
	}
	app.set('request', request)

	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback, cancelShutDownTimer){
	cancelShutDownTimer()
	app.set("serverStatus", Consts.ServerStatus.Stoping)
	var sessionService = app.get("sessionService")
	var kickAsync = Promise.promisify(sessionService.kick, sessionService)
	var uids = _.keys(sessionService.service.uidMap)
	app.set("loginedCount", uids.length)
	var funcs = []
	_.each(uids, function(uid){
		funcs.push(kickAsync(uid, "服务器关闭"))
	})
	Promise.all(funcs).then(function(){
		var interval = setInterval(function(){
			if(app.get("loginedCount") == 0){
				clearInterval(interval)
				app.get("logService").onEvent("server stoped", {serverId:app.getServerId()})
				setTimeout(callback, 1000)
			}
		}, 1000)
	}).catch(function(e){
		app.get("logService").onEventError("server stoped", {serverId:app.getServerId()}, e.stack)
		setTimeout(callback, 1000)
	})
}

life.afterStartAll = function(app){
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
}