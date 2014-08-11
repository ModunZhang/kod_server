/**
 * Created by modun on 14-7-25.
 */

var should = require('should')
var pomelo = require("../pomelo-client")
var mongoose = require("mongoose")
var _ = require("underscore")

var Config = require("../config")
var Player = require("../../app/domains/player")

var ClearTestAccount = function(callback){
	mongoose.connect(Config.mongoAddr, function(){
		Player.findOneAndRemove({"basicInfo.deviceId":Config.deviceId}, callback)
	})
}

describe("LogicServer", function(){
	var m_user

	before(function(done){
		ClearTestAccount(function(){
			pomelo.init({
				host:Config.gateHost,
				port:Config.gatePort,
				log:true
			}, function(){
				var loginInfo = {
					deviceId:Config.deviceId
				}
				var route = "gate.gateHandler.queryEntry"
				pomelo.request(route, loginInfo, function(doc){
					pomelo.disconnect()
					pomelo.init({
						host:doc.data.host,
						port:doc.data.port,
						log:true
					}, function(){
						done()
					})
				})
			})
		})
	})


	describe("entryHandler", function(){
		it("login", function(done){
			var loginInfo = {
				deviceId:Config.deviceId
			}
			var route = "logic.entryHandler.login"
			pomelo.request(route, loginInfo, function(doc){
				doc.code.should.equal(200)
				m_user = doc.data
				done()
			})
		})
	})


	describe("playerHandler", function(){
		it("upgradeBuilding", function(done){
			var buildingInfo = {
				location:1,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("speedupBuildingBuild", function(done){
			var buildingInfo = {
				location:1
			}
			var route = "logic.playerHandler.speedupBuildingBuild"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_1"].finishTime.should.equal(0)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeBuilding location_2", function(done){
			var buildingInfo = {
				location:2,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("speedupBuildingBuild location_2", function(done){
			var buildingInfo = {
				location:2
			}
			var route = "logic.playerHandler.speedupBuildingBuild"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_2"].finishTime.should.equal(0)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeBuilding Until Gem not enough", function(done){
			var buildingInfo = {
				location:1,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			var func = function(){
				pomelo.request(route, buildingInfo, function(doc){
					if(_.isEqual(200, doc.code)){
						func()
					}else{
						done()
					}
				})
			}
			func()
		})
	})


	after(function(){
		pomelo.disconnect()
	})
})