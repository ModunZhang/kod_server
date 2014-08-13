var pomelo = require("pomelo")
var redis = require("redis")
var mongoose = require("mongoose")
var globalChannel = require("pomelo-globalchannel-plugin")
var path = require("path")


var app = pomelo.createApp()
app.set("name", "KODServer")


app.configure("production|development", "gate", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:false,
		useProtobuf:false
	})
})


app.configure("production|development", "logic", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:true
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
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})


app.configure("production|development", "chat", function(){
	app.loadConfig("redisConfig", path.resolve("./config/redis.json"))
	app.loadConfig("mongoConfig", path.resolve("./config/mongo.json"))

	var redisClient = redis.createClient(app.get("redisConfig").port, app.get("redisConfig").host)
	app.set("redis", redisClient)
	var mongooseClient = mongoose.connect(app.get("mongoConfig").host)
	app.set("mongoose", mongooseClient)
})

app.set('errorHandler', function(err, msg, resp, session, opts, cb){
	console.error("handle Error-----------------------------")
	console.error(err.stack)
	cb(err, resp)
})

app.set('globalErrorHandler', function(err, msg, resp, session, opts, cb){
	console.error("handle globalError-----------------------------")
	console.error(err.stack)
	cb(err, resp)
})

app.start()

process.on("uncaughtException", function(err){
	console.error(" Caught exception: " + err.stack)
})
