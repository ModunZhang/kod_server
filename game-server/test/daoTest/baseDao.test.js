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
var CommandDir = path.resolve("game-server/app/commands")

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
			baseDao = Promise.promisifyAll(new BaseDao(redisClient, scripto, "demo", Demo, indexs))

			Demo.remove({}, function(){
				done()
			})
		})
	})

	it("create", function(done){
		baseDao.createAsync(player1).then(function(doc){
			should.exist(doc)
			demoDoc = doc
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

	it("findById 抛出错误", function(done){
		baseDao.findByIdAsync(demoDoc._id).catch(function(e){
			should.exist(e)
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

	it("deleteById 抛出错误", function(done){
		baseDao.deleteByIdAsync(demoDoc._id).catch(function(e){
			should.exist(e)
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
		baseDao.deleteByIdAsync(demoDoc._id).then(function(){
			done()
		})
	})

	it("deleteByIndex", function(done){
		baseDao.createAsync(player2).then(function(doc){
			should.exist(doc)
			baseDao.deleteByIndexAsync("basicInfo.name", "modun2").then(function(){
				done()
			})
		})
	})

	it("loadAll", function(done){
		var p2 = null
		var p3 = null
		baseDao.createAsync(player2).then(function(doc){
			p2 = doc
			baseDao.createAsync(player3).then(function(doc){
				p3 = doc
				baseDao.loadAllAsync(function(){
					baseDao.deleteByIdAsync(p2._id).then(function(){
						baseDao.deleteByIdAsync(p3._id).then(function(){
							done()
						})
					})
				})
			})
		})
	})

	it("unloadAll", function(done){
		var p2 = null
		var p3 = null
		baseDao.createAsync(player2).then(function(doc){
			p2 = doc
			baseDao.createAsync(player3).then(function(doc){
				p3 = doc
				baseDao.unloadAllAsync().then(function(){
					baseDao.deleteByIdAsync(p2._id).then(function(){
						baseDao.deleteByIdAsync(p3._id).then(function(){
							done()
						})
					})
				})
			})
		})
	})

	it("searchByIndex", function(done){
		var p2 = null
		var p3 = null
		baseDao.createAsync(player2).then(function(doc){
			p2 = doc
			baseDao.createAsync(player3).then(function(doc){
				p3 = doc
				baseDao.searchByIndexAsync("basicInfo.name", "2").then(function(docs){
					should.exist(docs)
					baseDao.deleteByIdAsync(p2._id).then(function(){
						baseDao.deleteByIdAsync(p3._id).then(function(){
							done()
						})
					})
				})
			})
		})
	})

	it("removeLockById", function(done){
		baseDao.createAsync(player1).then(function(doc){
			baseDao.findByIdAsync(doc._id).then(function(doc){
				baseDao.removeLockByIdAsync(doc._id).then(function(){
					done()
				})
			})
		})
	})

	it("removeLockByIndex", function(done){
		baseDao.findByIndexAsync("basicInfo.name", "modun1").then(function(doc){
			baseDao.removeLockByIndexAsync("basicInfo.name", doc.basicInfo.name).then(function(){
				baseDao.deleteByIdAsync(doc._id).then(function(){
					done()
				})
			})
		})
	})

//	it("findById  testTimeout", function(done){
//		baseDao.createAsync(player1).then(function(doc){
//			baseDao.findByIdAsync(doc._id).then(function(doc){
//				should.exist(doc)
//				setTimeout(function(){
//					baseDao.findByIdAsync(doc._id).then(function(doc){
//						should.exist(doc)
//						baseDao.removeLockByIdAsync(doc._id).then(function(){
//							done()
//						})
//					})
//				}, 2000)
//			})
//		})
//	})
//
//	it("findByIndex  testTimeout", function(done){
//		baseDao.findByIndexAsync("basicInfo.name", "modun1").then(function(doc){
//			should.exist(doc)
//			setTimeout(function(){
//				baseDao.findByIndexAsync("basicInfo.name", "modun1").then(function(doc){
//					should.exist(doc)
//					baseDao.removeLockByIdAsync(doc._id).then(function(){
//						baseDao.deleteByIdAsync(doc._id).then(function(){
//							done()
//						})
//					})
//				})
//			}, 2000)
//		})
//	})


	after(function(done){
		mongoose.connection.collections["demos"].drop(function(){
			done()
		})
	})
})