"use strict"

//TRACE, DEBUG, INFO, WARN, ERROR, FATAL
var ShortId = require("shortid")
var pomelo = require("pomelo")
var redis = require("redis")
var mongoose = require("mongoose")
var path = require("path")
var _ = require("underscore")
var wsrpc = require("pomelo-rpc-ws")
var globalChannel = require("pomelo-globalchannel-plugin")
var Scripto = require('redis-scripto')


var LoginFilter = require("./app/utils/loginFilter")
//var ReplayFilter = require("./app/utils/replayFilter")
var SerialFilter = require("./app/utils/serialFilter")
var commandDir = path.resolve("./app/commands")

var app = pomelo.createApp()
app.set("name", "KODServer")

app.configure("production|development", function() {
	//app.set('proxyConfig', {
	//	rpcClient: wsrpc.client
	//})
	//
	//app.set('remoteConfig', {
	//	rpcServer: wsrpc.server
	//})
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

	app.loadConfig("redisConfig", path.resolve("./config/redis.json"))
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))

	app.use(globalChannel, {globalChannel:{
		host:app.get("redisConfig").host,
		port:app.get("redisConfig").port,
		db:"1"
	}})

	var redisClient = redis.createClient(app.get("redisConfig").port, app.get("redisConfig").host)
	app.set("redis", redisClient)
	var scripto = new Scripto(redisClient)
	scripto.loadFromDir(commandDir)
	app.set("scripto", scripto)
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
		"max-connections":2000
	})
	app.set("proxyConfig", {
		bufferMsg:false,
		interval:20,
		failMode:"failfast"
	})

	//app.before(ReplayFilter())
	app.before(LoginFilter())
	app.filter(SerialFilter(5000))

	app.loadConfig("redisConfig", path.resolve("./config/redis.json"))
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))

	app.use(globalChannel, {globalChannel:{
		host:app.get("redisConfig").host,
		port:app.get("redisConfig").port,
		db:"1"
	}})

	var redisClient = redis.createClient(app.get("redisConfig").port, app.get("redisConfig").host)
	app.set("redis", redisClient)
	var scripto = new Scripto(redisClient)
	scripto.loadFromDir(commandDir)
	app.set("scripto", scripto)
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "chat", function(){
	//app.before(ReplayFilter())
	app.before(LoginFilter())
	app.filter(SerialFilter(5000))

	app.loadConfig("redisConfig", path.resolve("./config/redis.json"))
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))

	var redisClient = redis.createClient(app.get("redisConfig").port, app.get("redisConfig").host)
	app.set("redis", redisClient)
	var scripto = new Scripto(redisClient)
	scripto.loadFromDir(commandDir)
	app.set("scripto", scripto)
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "event", function(){
	app.loadConfig("redisConfig", path.resolve("./config/redis.json"))
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))

	var redisClient = redis.createClient(app.get("redisConfig").port, app.get("redisConfig").host)
	app.set("redis", redisClient)
	var scripto = new Scripto(redisClient)
	scripto.loadFromDir(commandDir)
	app.set("scripto", scripto)
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "time", function(){
	app.loadConfig("redisConfig", path.resolve("./config/redis.json"))
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))

	app.use(globalChannel, {globalChannel:{
		host:app.get("redisConfig").host,
		port:app.get("redisConfig").port,
		db:"1"
	}})

	var redisClient = redis.createClient(app.get("redisConfig").port, app.get("redisConfig").host)
	app.set("redis", redisClient)
	var scripto = new Scripto(redisClient)
	scripto.loadFromDir(commandDir)
	app.set("scripto", scripto)
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)

	redisClient.debug_mode = true
})

app.set('errorHandler', function(e, msg, resp, session, opts, cb){
	app.get("logService").onRequestError("app.errorHandler", {playerId:session.uid, msg:msg}, e.stack)
	cb(e, resp)
	if(!_.isEmpty(e.message) && e.message.indexOf("Illegal request!") == 0){
		app.get("sessionService").kickBySessionId(session.id)
	}
})

process.on("uncaughtException", function(e){
	app.get("logService").onEventError("app.uncaughtException", {}, e.stack)
})

app.start()