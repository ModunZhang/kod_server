var pomelo = require("pomelo")
var redis = require("redis")
var mongoose = require("mongoose")
var globalChannel = require('pomelo-globalchannel-plugin')
var GameDefined = require("./config/gameDefined")

var app = pomelo.createApp()
app.set('name', 'KODServer')

var env = app.get("env")
var redisHost = GameDefined[env].redis.host
var redisPort = GameDefined[env].redis.port
var mongoHost = GameDefined[env].mongo.host
var mongoPort = GameDefined[env].mongo.port

app.configure('production|development', 'gate', function(){
	app.set('connectorConfig', {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:10,
		useDict:true,
		useProtobuf:true
	})
})

app.configure('production|development', 'logic', function(){
	app.set('connectorConfig', {
		connector:pomelo.connectors.hybridconnector,
		heartbeat:5,
		useDict:true,
		useProtobuf:true
	})

	app.use(globalChannel, {globalChannel:{
		host:redisHost,
		port:redisPort,
		db:'1'
	}})

	var redisClient = redis.createClient(redisPort, redisHost)
	app.set('redis', redisClient)
	var mongooseClient = mongoose.connect('mongodb://'+ mongoHost + ":" + mongoPort +'/kod')
	app.set('mongoose', mongooseClient)
})

app.configure('production|development', 'chat', function(){
	var redisClient = redis.createClient(redisPort, redisHost)
	app.set('redis', redisClient)
	var mongooseClient = mongoose.connect('mongodb://'+ mongoHost + ":" + mongoPort +'/kod')
	app.set('mongoose', mongooseClient)
})

app.start()

process.on('uncaughtException', function(err){
	console.error(' Caught exception: ' + err.stack)
})
