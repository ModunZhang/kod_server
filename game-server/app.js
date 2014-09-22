"use strict"

var pomelo = require("pomelo")
var redis = require("redis")
var mongoose = require("mongoose")
var path = require("path")
var _ = require("underscore")
var globalChannel = require("pomelo-globalchannel-plugin")
var Scripto = require('redis-scripto')

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var loginFilter = require("./app/utils/loginFilter")
var commandDir = path.resolve("./app/commands")

var app = pomelo.createApp()
app.set("name", "KODServer")


app.configure("production|development", "gate", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:60,
		useDict:false,
		useProtobuf:false,
		disconnectOnTimeout:true,
		"max-connections":1000
	})
	app.set("proxyConfig", {
		bufferMsg:false,
		interval:30,
		failMode:"failfast"
	})
	app.set("remoteConfig", {
		bufferMsg:false
	})
	app.set('sessionConfig', {
		singleSession:true
	})

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
		heartbeat:30,
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
		bufferMsg:false
	})
	app.set('sessionConfig', {
		singleSession:true
	})

//	app.before(loginFilter())

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
	app.set("proxyConfig", {
		bufferMsg:false,
		failMode:"failfast"
	})
	app.set("remoteConfig", {
		bufferMsg:false
	})

//	app.before(loginFilter())

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

app.set('errorHandler', function(err, msg, resp, session, opts, cb){
	errorLogger.error("handle Error-----------------------------")
	errorLogger.error(err.stack)
	if(_.isEqual("production", app.get("env"))){
		errorMailLogger.error("handle Error-----------------------------")
		errorMailLogger.error(err.stack)
	}
	cb(err, resp)
})

app.set('globalErrorHandler', function(err, msg, resp, session, opts, cb){
	errorLogger.error("handle globalError-----------------------------")
	errorLogger.error(err.stack)
	if(_.isEqual("production", app.get("env"))){
		errorMailLogger.error("handle globalError-----------------------------")
		errorMailLogger.error(err.stack)
	}
	cb(err, resp)
})

app.start()

process.on("uncaughtException", function(err){
	errorLogger.error("handle uncaughtError-----------------------------")
	errorLogger.error(err.stack)
	if(_.isEqual("production", app.get("env"))){
		errorMailLogger.error("handle uncaughtError-----------------------------")
		errorMailLogger.error(err.stack)
	}
})
