"use strict"

//TRACE, DEBUG, INFO, WARN, ERROR, FATAL
var ShortId = require("shortid")
var pomelo = require("pomelo")
var mongoose = require("mongoose")
var path = require("path")
var _ = require("underscore")
var wsrpc = require("pomelo-rpc-ws")


var RouteUtils = require("./app/utils/routeUtils")
var LoginFilter = require("./app/utils/loginFilter")
var SerialFilter = require("./app/utils/serialFilter")

var app = pomelo.createApp()
app.set("name", "KODServer")

app.route("chat", RouteUtils.chat)
app.route("logic", RouteUtils.logic)
app.route("rank", RouteUtils.rank)

app.configure("production|development", function() {
	app.set('proxyConfig', {
		rpcClient: wsrpc.client
	})

	app.set('remoteConfig', {
		rpcServer: wsrpc.server
	})
})

app.configure("production|development", "gate", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:false,
		disconnectOnTimeout:true,
		"max-connections":1000
	})

	app.filter(SerialFilter(5000))

	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "logic", function(){
	var idParams = app.serverId.split("-")
	var intId = parseInt(idParams[idParams.length - 1])
	process.NODE_UNIQUE_ID = intId
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:60,
		useDict:true,
		useProtobuf:false,
		disconnectOnTimeout:true,
		"max-connections":2500
	})
	//app.set("proxyConfig", {
	//	bufferMsg:false,
	//	interval:20,
	//	failMode:"failfast"
	//})

	app.before(LoginFilter())
	app.filter(SerialFilter(5000))

	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "chat", function(){
	//app.set("proxyConfig", {
	//	bufferMsg:false,
	//	interval:20,
	//	failMode:"failfast"
	//})

	app.before(LoginFilter())
	app.filter(SerialFilter(5000))
})

app.configure("production|development", "event", function(){
	//app.set("proxyConfig", {
	//	bufferMsg:false,
	//	interval:20,
	//	failMode:"failfast"
	//})
})

app.configure("production|development", "cache", function(){
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "rank", function(){
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
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

app.start()