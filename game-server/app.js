"use strict"

//TRACE, DEBUG, INFO, WARN, ERROR, FATAL

var pomelo = require("pomelo")
var redis = require("redis")
var mongoose = require("mongoose")
var path = require("path")
var _ = require("underscore")
var globalChannel = require("pomelo-globalchannel-plugin")
var Scripto = require('redis-scripto')
var NodeUtils = require("util")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var LoginFilter = require("./app/utils/loginFilter")
var ReplayFilter = require("./app/utils/replayFilter")
var SerialFilter = require("./app/utils/serialFilter")
var commandDir = path.resolve("./app/commands")

var app = pomelo.createApp()
app.set("name", "KODServer")

app.configure("production|development", "gate", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:true,
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
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:60,
		useDict:true,
		useProtobuf:true,
		disconnectOnTimeout:true,
		"max-connections":1000
	})
	app.set("proxyConfig", {
		bufferMsg:false,
		interval:20,
		failMode:"failfast"
	})
	app.set("remoteConfig", {
		bufferMsg:false,
		interval:20,
		failMode:"failfast"
	})

	app.before(ReplayFilter())
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
	app.before(ReplayFilter())
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

app.set('errorHandler', function(err, msg, resp, session, opts, cb){
	errorLogger.error("handle app:Error-----------------------------")
	errorLogger.error(err.stack)
	if("production" == app.get("env")){
		errorMailLogger.error("handle app:Error-----------------------------")
		errorMailLogger.error(err.stack)
	}
	cb(err, resp)
	if(!_.isEmpty(err.message) && err.message.indexOf("Illegal request!") == 0){
		app.get("sessionService").kickBySessionId(session.id)
	}
})

app.start()

process.on("uncaughtException", function(err){
	errorLogger.error("handle app:uncaughtError-----------------------------")
	errorLogger.error(err.stack)
	if("production" == app.get("env")){
		errorMailLogger.error("handle app:uncaughtError-----------------------------")
		errorMailLogger.error(err.stack)
	}
})