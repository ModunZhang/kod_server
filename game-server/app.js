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
app.set("name", "KODServer")
app.enable('systemMonitor');
app.route("chat", RouteUtils.chat)
app.route("logic", RouteUtils.logic)
app.route("rank", RouteUtils.rank)
app.route("cache", RouteUtils.cache)

app.configure(function(){
	app.set('proxyConfig', {
		rpcClient:wsrpc.client
	})
	app.set('remoteConfig', {
		rpcServer:wsrpc.server
	})
})

app.configure("local|develop|awschina|hotfix", "master", function(){

})

app.configure("local|develop|awschina|hotfix", "gate", function(){
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

	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local|develop|awschina|hotfix", "logic", function(){
	var idParams = app.serverId.split("-")
	var intId = parseInt(idParams[idParams.length - 1])
	process.NODE_UNIQUE_ID = intId

	var connectorConfig = {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:false,
		disconnectOnTimeout:true
	}
	//if(app.get('env') !== 'local'){
	//	connectorConfig.ssl = {
	//		key:fs.readFileSync(path.resolve('./config/keys/ssl.key')),
	//		cert:fs.readFileSync(path.resolve('./config/keys/ssl.crt'))
	//	}
	//}
	app.set("connectorConfig", connectorConfig)

	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.before(filterService.loginFilter())
	app.before(filterService.initFilter());
	app.filter(filterService.requestTimeFilter())

	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local|develop|awschina|hotfix", "chat", function(){
	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var filterService = new FilterService(app)
	app.before(filterService.toobusyFilter())
	app.before(filterService.loginFilter())
	app.filter(filterService.requestTimeFilter())

	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local|develop|awschina|hotfix", "cache", function(){
	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)
})

app.configure("local|develop|awschina|hotfix", "rank", function(){
	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	var mongooseClient = mongoose.connect(app.get("serverConfig").mongoHost, {server:{socketOptions:{keepAlive:1}}})
	app.set("mongoose", mongooseClient)

	var filterService = new FilterService(app)
	app.before(filterService.loginFilter())
	app.filter(filterService.requestTimeFilter())
})

app.configure('local|develop|awschina|hotfix', 'http', function(){
	app.loadConfig("serverConfig", path.resolve("./config/" + app.get('env') + "/config.json"))
	app.use(httpPlugin, {
		http:app.get('serverConfig').http
	});
});

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

//var agent = require('webkit-devtools-agent');
//process.on('SIGUSR2', function () {
//	if (agent.server) {
//		agent.stop();
//	} else {
//		agent.start({
//			port: 9999,
//			bind_to: '127.0.0.1',
//			ipc_port: 3333,
//			verbose: true
//		});
//	}
//});