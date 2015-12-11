"use strict"

//TRACE, DEBUG, INFO, WARN, ERROR, FATAL
var fs = require('fs');
var ShortId = require("shortid")
var pomelo = require("pomelo")
var mongoose = require("mongoose")
var path = require("path")
var _ = require("underscore")
var wsrpc = require("pomelo-rpc-ws")
var httpPlugin = require('pomelo-http-plugin');

var FilterService = require("./app/services/filterService")
var RouteUtils = require("./app/utils/routeUtils")

var app = pomelo.createApp()
app.set("name", "DragonFall Game Server")
//app.enable('systemMonitor');
app.route("chat", RouteUtils.chat)
app.route("logic", RouteUtils.logic)
app.route("rank", RouteUtils.rank)
app.route("cache", RouteUtils.cache)

app.configure(function(){
	app.set('proxyConfig', {
		rpcClient:wsrpc.client
	});
	app.set('remoteConfig', {
		rpcServer:wsrpc.server
	});
})

app.configure("local-ios|local-wp|develop-ios|develop-wp|awschina-ios|awschina-wp|hotfix-ios", "master", function(){

})

app.configure("local-ios|local-wp|develop-ios|develop-wp|awschina-ios|awschina-wp|hotfix-ios", "gate", function(){
	var connectorConfig = {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:false,
		useProtobuf:false,
		useCrypto2:false,
		disconnectOnTimeout:true
	}

	app.set("connectorConfig", connectorConfig)

	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.filter(filterService.requestTimeFilter())

	app.loadConfig("serverConfig", app.getBase() + "/config/" + app.get('env') + "/config.json")
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local-ios|local-wp|develop-ios|develop-wp|awschina-ios|awschina-wp|hotfix-ios", "logic", function(){
	var idParams = app.serverId.split("-")
	var intId = parseInt(idParams[idParams.length - 1])
	process.NODE_UNIQUE_ID = intId

	var connectorConfig = {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:false,
		useCrypto2:true,
		disconnectOnTimeout:true
	}
	app.set("connectorConfig", connectorConfig)

	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.before(filterService.loginFilter())
	app.before(filterService.initFilter());
	app.filter(filterService.requestTimeFilter())

	app.loadConfig("serverConfig", app.getBase() + "/config/" + app.get('env') + "/config.json")
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local-ios|local-wp|develop-ios|develop-wp|awschina-ios|awschina-wp|hotfix-ios", "chat", function(){
	app.loadConfig("serverConfig", app.getBase() + "/config/" + app.get('env') + "/config.json")
	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.before(filterService.loginFilter())
	app.before(filterService.initFilter());

	app.loadConfig("serverConfig", app.getBase() + "/config/" + app.get('env') + "/config.json")
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local-ios|local-wp|develop-ios|develop-wp|awschina-ios|awschina-wp|hotfix-ios", "cache", function(){
	app.loadConfig("serverConfig", app.getBase() + "/config/" + app.get('env') + "/config.json")
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local-ios|local-wp|develop-ios|develop-wp|awschina-ios|awschina-wp|hotfix-ios", "rank", function(){
	app.loadConfig("serverConfig", app.getBase() + "/config/" + app.get('env') + "/config.json")
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)

	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.before(filterService.loginFilter())
	app.before(filterService.initFilter());
})

app.configure('local-ios|local-wp|develop-ios|develop-wp|awschina-ios|awschina-wp|hotfix-ios', 'http', function(){
	app.loadConfig("serverConfig", app.getBase() + "/config/" + app.get('env') + "/config.json")
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)

	app.use(httpPlugin, {
		http:app.get('serverConfig').http
	});
});

app.set('errorHandler', function(e, msg, resp, session, opts, cb){
	app.get("logService").onWarning("app.errorHandler", {playerId:session.uid, msg:msg}, e.stack)
	cb(e, resp)
	if(!_.isEmpty(e.message) && e.message.indexOf("Illegal request!") == 0){
		app.get("sessionService").kickBySessionId(session.id, 'Illegal request!', null)
	}
})

process.on("uncaughtException", function(e){
	console.error("app.uncaughtException")
	console.error(e)
})

app.start();
