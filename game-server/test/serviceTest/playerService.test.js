/**
 * Created by modun on 14-7-25.
 */

var should = require('should')
var Promise = require("bluebird")
var Promisify = Promise.promisify
var mongoose = require("mongoose")
var redis = require("redis")

var Config = require("../config")
var PlayerService = require("../../app/services/playerService")

describe("PlayerService", function(){
	var service

	before(function(done){
		mongoose.connect(Config.mongoAddr, function(){
			done()
		})
		var redisClient = redis.createClient(6379)
		service = Promise.promisifyAll(new PlayerService(redisClient))
	})

	it("getPlayerByDeviceId", function(done){
		service.getPlayerByDeviceIdAsync(Config.deviceId).then(function(doc){
			should.exist(doc)
			done()
		})
	})

	after(function(){

	})
})