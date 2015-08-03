"use strict"

//TRACE, DEBUG, INFO, WARN, ERROR, FATAL
var ShortId = require("shortid")
var pomelo = require("pomelo")
var mongoose = require("mongoose")
var path = require("path")
var _ = require("underscore")
var wsrpc = require("pomelo-rpc-ws")

var FilterService = require("./app/services/filterService")
var RouteUtils = require("./app/utils/routeUtils")

var app = pomelo.createApp()
app.set("name", "KODServer")

app.route("chat", RouteUtils.chat)
app.route("logic", RouteUtils.logic)
app.route("rank", RouteUtils.rank)
app.route("cache", RouteUtils.cache)

app.configure("local|develop|awschina", function(){
	app.set('proxyConfig', {
		rpcClient:wsrpc.client
	})
	app.set('remoteConfig', {
		rpcServer:wsrpc.server
	})
})

app.configure("local|develop|awschina", "gate", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:false,
		disconnectOnTimeout:true
	})
	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())

	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local|develop|awschina", "logic", function(){
	var idParams = app.serverId.split("-")
	var intId = parseInt(idParams[idParams.length - 1])
	process.NODE_UNIQUE_ID = intId
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:false,
		disconnectOnTimeout:true
	})

	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.before(filterService.loginFilter())
})

app.configure("local|develop|awschina", "chat", function(){
	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.before(filterService.loginFilter())

	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local|develop|awschina", "cache", function(){
	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local|develop|awschina", "rank", function(){
	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)

	var filterService = new FilterService(app)
	app.before(filterService.loginFilter())
})

app.set('errorHandler', function(e, msg, resp, session, opts, cb){
	app.get("logService").onRequestError("app.errorHandler", {playerId:session.uid, msg:msg}, e.stack)
	cb(e, resp)
	if(!_.isEmpty(e.message) && e.message.indexOf("Illegal request!") == 0){
		app.get("sessionService").kickBySessionId(session.id)
	}
})

process.on("uncaughtException", function(e){
	console.error("app.uncaughtException")
	console.error(e)
})

app.start();

var agent = require('webkit-devtools-agent');
process.on('SIGUSR2', function () {
	if (agent.server) {
		agent.stop();
	} else {
		agent.start({
			port: 9999,
			bind_to: '127.0.0.1',
			ipc_port: 3333,
			verbose: true
		});
	}
});