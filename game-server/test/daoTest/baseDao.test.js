/**
 * Created by modun on 14-7-24.
 */

var path = require("path")
var should = require('should')
var Promise = require("bluebird")
var redis = require("redis")
var Scripto = require('redis-scripto')
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Config = require("../config")
var BaseDao = require("../../app/dao/baseDao")
var CommandDir = path.resolve(__dirname + "../../../app/commands")

describe("BaseDao", function(){
	var baseDao
	var demoDoc
	var Demo

	var player1 = {
		basicInfo:{
			name:"modun1"
		},
		cityName:"华阳1"
	}
	var player2 = {
		basicInfo:{
			name:"modun2"
		},
		cityName:"华阳2"
	}
	var player3 = {
		basicInfo:{
			name:"modun3"
		},
		cityName:"华阳3"
	}

	before(function(done){
		var playerSchema = new Schema({
			basicInfo:{
				name:{type:String, required:true, index:true, unique:true}
			},
			cityName:{type:String, required:true, index:true, unique:true}
		})

		mongoose.connect(Config.mongoAddr, function(){
			Demo = mongoose.model('demo', playerSchema)
			var redisClient = redis.createClient(6379)
			var scripto = new Scripto(redisClient)
			scripto.loadFromDir(CommandDir)
			var indexs = ["basicInfo.name", "cityName"]
			baseDao = Promise.promisifyAll(new BaseDao(redisClient, scripto, "demo", Demo, indexs, "develop"))

			Demo.remove({}, function(){
				done()
			})
		})
	})

	it("create", function(done){
		baseDao.createAsync(player1).then(function(doc){
			should.exist(doc)
			demoDoc = doc
			return baseDao.removeLockByIdAsync(demoDoc._id)
		}).then(function(){
			done()
		})
	})

	it("findByIndex", function(done){
		baseDao.findByIndexAsync("basicInfo.name", "modun1").then(function(doc){
			should.exist(doc)
			demoDoc = doc
			done()
		})
	})

	it("update 更新1", function(done){
		demoDoc.basicInfo.name = "zhang"
		baseDao.updateAsync(demoDoc).then(function(doc){
			should.exist(doc)
			demoDoc = doc
			demoDoc.basicInfo.name.should.equal("zhang")
			done()
		})
	})

	it("findById 正常查找", function(done){
		baseDao.findByIdAsync(demoDoc._id).then(function(doc){
			should.exist(doc)
			demoDoc = doc
			done()
		})
	})

	it("update 更新2", function(done){
		demoDoc.basicInfo.name = "zhang"
		baseDao.updateAsync(demoDoc).then(function(doc){
			should.exist(doc)
			demoDoc = doc
			demoDoc.basicInfo.name.should.equal("zhang")
			done()
		})
	})

	it("deleteById 正常删除", function(done){
		baseDao.findByIdAsync(demoDoc._id).then(function(){
			return baseDao.deleteByIdAsync(demoDoc._id)
		}).then(function(){
			done()
		})
	})

	it("deleteByIndex", function(done){
		baseDao.createAsync(player2).then(function(doc){
			should.exist(doc)
			return baseDao.deleteByIndexAsync("basicInfo.name", "modun2")
		}).then(function(){
			done()
		})
	})

	after(function(done){
		mongoose.connection.collections["demos"].drop(function(){
			done()
		})
	})
})