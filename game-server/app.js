"use strict"

var pomelo = require("pomelo")
var redis = require("redis")
var mongoose = require("mongoose")
var path = require("path")
var _ = require("underscore")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

var app = pomelo.createApp()
app.set("name", "KODServer")


app.configure("production|development", "gate", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:5,
		useDict:false,
		useProtobuf:false,
		disconnectOnTimeout:true,
		"max-connections":1000
	})
	app.set("proxyConfig", {
		bufferMsg:true,
		interval:20,
		failMode:"failfast"
	})
	app.set("remoteConfig", {
		bufferMsg:true,
		interval:20
	})
	app.set('sessionConfig', {
		singleSession:true
	})
})

app.configure("production|development", "front", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:true,
		disconnectOnTimeout:true,
		"max-connections":1000
	})
	app.set("proxyConfig", {
		bufferMsg:true,
		interval:20,
		failMode:"failfast"
	})
	app.set("remoteConfig", {
		bufferMsg:true,
		interval:20
	})
	app.set('sessionConfig', {
		singleSession:true
	})

	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "logic", function(){
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.configure("production|development", "chat", function(){
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))
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
