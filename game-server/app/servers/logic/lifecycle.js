"use strict"

/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var LogService = require("../../services/logService")
var ErrorUtils = require("../../utils/errorUtils")
var Consts = require("../../consts/consts")

var Player = require("../../domains/player")
var Alliance = require("../../domains/alliance")

var life = module.exports

life.beforeStartup = function(app, callback){
	var currentServer = app.getServerFromConfig(app.getServerId())
	app.set("logicServerId", currentServer.id)
	app.set('cacheServerId', currentServer.usedFor);
	var cacheServerIds = [];
	var servers = app.getServersFromConfig()
	_.each(servers, function(server, id){
		if(_.isEqual(server.serverType, "chat")){
			app.set("chatServerId", id)
		}else if(_.isEqual(server.serverType, "rank")){
			app.set("rankServerId", id)
		}else if(_.isEqual(server.serverType, "gate")){
			app.set("gateServerId", id)
		}else if(_.isEqual(server.serverType, 'cache')){
			cacheServerIds.push(id);
		}
	})
	app.set('cacheServerIds', cacheServerIds);

	app.set("logService", new LogService(app))

	app.set("Player", Promise.promisifyAll(Player))
	app.set("Alliance", Promise.promisifyAll(Alliance))

	var request = function(api, params, serverId){
		return new Promise(function(resolve, reject){
			var cacheServerId = !!serverId ? serverId : app.get('cacheServerId');
			app.rpc.cache.cacheRemote.request.toServer(cacheServerId, api, params, function(e, resp){
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
		app.get("logService").onError("server stoped", {serverId:app.getServerId()}, e.stack)
		setTimeout(callback, 1000)
	})
}

life.afterStartAll = function(app){
	app.get("logService").onEvent("server started", {serverId:app.getServerId()})
}