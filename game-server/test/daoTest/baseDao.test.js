/**
 * Created by modun on 14-7-24.
 */

var should = require('should')
var Promise = require("bluebird")
var redis = require("redis")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Config = require("../config")
var BaseDao = require("../../app/dao/baseDao")
var Player = require("../../app/domains/player")

describe("BaseDao", function(){
	var baseDao
	var demoDoc
	var Demo

	before(function(done){
		var demoSchema = new Schema({
			hello:{
				type:String,
				index:true,
				unique:true
			}
		})
		mongoose.connect(Config.mongoAddr, function(){
			Demo = mongoose.model('demo',demoSchema)
			var redisClient = redis.createClient(6379)
			baseDao = Promise.promisifyAll(new BaseDao(redisClient, Demo))

			Demo.remove({}, function(){
				done()
			})

//			var doc = {
//				basicInfo:{
//					deviceId:Config.deviceId2,
//					name:"player_111111"
//				}
//			}
//
//			Player.findOneAndRemove({deviceId:Config.deviceId2}, function(){
//				var player = new Player(doc)
//				player.save()
//			})
		})
	})

	it("add", function(done){
		var demo = {hello:"world"}

		baseDao.addAsync(demo).then(function(doc){
			should.exist(doc)
			doc.hello.should.equal("world")
			demoDoc = doc
			done()
		})
	})

	it("find", function(done){
		baseDao.findAsync(demoDoc._id).then(function(doc){
			should.exist(doc)
			done()
		})
	})

	it("findFromMongo", function(done){
		baseDao.findFromMongoAsync({_id:demoDoc._id}).then(function(doc){
			should.exist(doc)
			done()
		})
	})

	it("update", function(done){
		baseDao.findAsync(demoDoc._id).then(function(doc){
			doc.hello = "hi"
			return baseDao.updateAsync(doc)
		}).then(function(){
			return baseDao.findAsync(demoDoc._id)
		}).then(function(doc){
			doc.hello.should.equal("hi")
			doc.__changed.should.equal(1)
			var func = function(doc){
				baseDao.updateAsync(doc).then(function(doc){
					if(doc.__changed !== 0 ){
						func(doc)
					}else{
						done()
					}
				})
			}
			func(doc)
		})
	})

	it("clear", function(done){
		baseDao.findAsync(demoDoc._id).then(function(doc){
			return baseDao.clearAsync(doc)
		}).then(function(){
			return baseDao.findAsync(demoDoc._id)
		}).then(function(doc){
			should.exist(doc)
			done()
		})
	})

	it("remove", function(done){
		baseDao.findAsync(demoDoc._id).then(function(doc){
			return baseDao.removeAsync(doc)
		}).then(function(doc){
			return baseDao.findAsync(doc._id)
		}).then(function(doc){
			should.not.exist(doc)
			done()
		})
	})

	after(function(done){
		mongoose.connection.collections["demos"].drop(function(){
			done()
		})
	})
})