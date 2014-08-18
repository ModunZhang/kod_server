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

		it("speedupBuildingBuild2", function(done){
			var buildingInfo = {
				location:1
			}
			var route = "logic.playerHandler.speedupBuildingBuild"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				done()
			})
		})

		it("upgradeBuilding2", function(done){
			var buildingInfo = {
				location:1,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("createBuilding", function(done){
			var buildingInfo = {
				location:2
			}
			var route = "logic.playerHandler.createBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				done()
			})
		})
		it("createBuilding2", function(done){
			var buildingInfo = {
				location:5
			}
			var route = "logic.playerHandler.createBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})
		it("createBuilding3", function(done){
			var buildingInfo = {
				location:7
			}
			var route = "logic.playerHandler.createBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				done()
			})
		})

		it("upgradeBuilding", function(done){
			var buildingInfo = {
				location:5,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
			})
			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_5"].level.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeBuilding2", function(done){
			var buildingInfo = {
				location:6,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				done()
			})
		})

		it("createHouse", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseType:"dwelling",
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_3"].houses.length.should.equal(1)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("speedupHouseBuild", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:1
			}
			var route = "logic.playerHandler.speedupHouseBuild"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_3"].houses[0].level.should.equal(1)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("createHouse 2", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseType:"farmer",
				houseLocation:2,
				finishNow:true
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_3"].houses.length.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeHouse", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:1,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_3"].houses[0].level.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeHouse 2", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:2,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_3"].houses[1].level.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("destroyHouse", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:2
			}
			var route = "logic.playerHandler.destroyHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.buildings["location_3"].houses.length.should.equal(1)
				m_user.buildings["location_3"].houses[0].location.should.equal(1)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeTower", function(done){
			var buildingInfo = {
				location:1,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeTower"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
			})
			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.towers["location_1"].finishTime.should.not.equal(0)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("speedupTowerBuild", function(done){
			var buildingInfo = {
				location:1
			}
			var route = "logic.playerHandler.speedupTowerBuild"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
			})
			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.towers["location_1"].level.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeWall", function(done){
			var buildingInfo = {
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeWall"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
			})
			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.wall.finishTime.should.not.equal(0)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("speedupWallBuild", function(done){
			var route = "logic.playerHandler.speedupWallBuild"
			pomelo.request(route, null, function(doc){
				doc.code.should.equal(200)
			})
			var onPlayerDataChanged = function(doc){
				m_user = doc
				should.exist(doc)
				m_user.wall.level.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})
	})


	after(function(){
		pomelo.disconnect()
	})
})