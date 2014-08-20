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
		it("upgradeBuilding 正常升级", function(done){
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

		it("speedupBuildingBuild 加速建筑升级", function(done){
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

		it("upgradeBuilding 测试建造等级限制", function(done){
			var buildingInfo = {
				location:2,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)

				var buildingInfo = {
					location:2,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					doc.code.should.equal(500)
					done()
				})
			})
		})

		it("upgradeBuilding 测试建造数量限制", function(done){
			var buildingInfo = {
				location:5,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)

				var buildingInfo = {
					location:9,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					doc.code.should.equal(500)
					done()
				})
			})
		})

		it("upgradeBuilding 测试坑位规则限制", function(done){
			var buildingInfo = {
				location:1,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)

				var buildingInfo = {
					location:7,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					doc.code.should.equal(500)
					done()
				})
			})
		})

		it("createHouse 正常建造", function(done){
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

		it("speedupHouseBuild 建造加速", function(done){
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

		it("createHouse 立即完成建造", function(done){
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

		it("upgradeHouse 立即完成建筑升级", function(done){
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

		it("upgradeHouse 小屋坑位信息测试", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:4,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				done()
			})
		})

		it("destroyHouse 摧毁小屋因城民数量摧毁失败", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:1
			}
			var route = "logic.playerHandler.destroyHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				done()
			})
		})

		it("destroyHouse 摧毁小屋测试", function(done){
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

		it("upgradeTower 普通升级箭塔", function(done){
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

		it("speedupTowerBuild 加速升级箭塔", function(done){
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

		it("upgradeWall 升级城墙", function(done){
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

		it("speedupWallBuild 加速升级城墙", function(done){
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