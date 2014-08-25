/**
 * Created by modun on 14-7-24.
 */

var should = require('should')
var Promise = require("bluebird")
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
			baseDao = Promise.promisifyAll(new BaseDao(Demo))

			Demo.remove({}, function(){
				done()
			})

//			var doc = {
//				countInfo:{
//					deviceId:Config.deviceId2,
//					logicServerId:"logic-server-1"
//				},
//				basicInfo:{
//					name:"player_111111",
//					cityName:"city_111111"
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
			demoDoc = doc
			done()
		})
	})

	it("find", function(done){
		baseDao.findAsync({"_id":demoDoc._id}).then(function(doc){
			should.exist(doc)
			demoDoc = doc
			done()
		})
	})

	it("findById", function(done){
		baseDao.findByIdAsync(demoDoc._id).then(function(doc){
			should.exist(doc)
			demoDoc = doc
			done()
		})
	})

	it("update", function(done){
		demoDoc.hello = "hi"
		baseDao.updateAsync(demoDoc).then(function(doc){
			should.exist(doc)
			demoDoc = doc
			demoDoc.hello.should.equal("hi")
			done()
		})
	})

	it("remove", function(done){
		baseDao.removeAsync(demoDoc).then(function(){
			done()
		})
	})

	after(function(done){
		mongoose.connection.collections["demos"].drop(function(){
			done()
		})
	})
})