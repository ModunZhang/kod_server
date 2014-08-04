var pomelo = require("pomelo")
var redis = require("redis")
var mongoose = require("mongoose")
var globalChannel = require("pomelo-globalchannel-plugin")

var app = pomelo.createApp()
app.set("name", "KODServer")

//app.configure("production|development", function(){
//	app.set("ssh_config_params", "-i /home/ec2-user/.ssh/AWS.pem")
//})

app.configure("production|development", "gate", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:true
	})
})

app.configure("development", "logic", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:5,
		useDict:true,
		useProtobuf:true
	})

	app.use(globalChannel, {globalChannel:{
		host:"127.0.0.1",
		port:6379,
		db:"1"
	}})

	var redisClient = redis.createClient(6379, "127.0.0.1")
	app.set("redis", redisClient)
	var mongooseClient = mongoose.connect("mongodb://127.0.0.1:27017/kod")
	app.set("mongoose", mongooseClient)
})

app.configure("production", "logic", function(){
	app.set("connectorConfig", {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:5,
		useDict:true,
		useProtobuf:true
	})

	app.use(globalChannel, {globalChannel:{
		host:"172.31.15.88",
		port:6379,
		db:"1"
	}})

	var redisClient = redis.createClient(6379, "172.31.15.88")
	app.set("redis", redisClient)
	var mongooseClient = mongoose.connect("mongodb://127.0.0.1:27017/kod")
	app.set("mongoose", mongooseClient)
})
//
//app.configure("development", "chat", function(){
//	var redisClient = redis.createClient(6379, "127.0.0.1")
//	app.set("redis", redisClient)
//	var mongooseClient = mongoose.connect("mongodb://127.0.0.1:27017/kod")
//	app.set("mongoose", mongooseClient)
//})
//
//app.configure("production", "chat", function(){
//	var redisClient = redis.createClient(6379, "172.31.15.88")
//	app.set("redis", redisClient)
//	var mongooseClient = mongoose.connect("mongodb://127.0.0.1:27017/kod")
//	app.set("mongoose", mongooseClient)
//})

app.start()

process.on("uncaughtException", function(err){
	console.error(" Caught exception: " + err.stack)
})
