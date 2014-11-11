///**
//* Created by modun on 14-7-29.
//*/
//
//var pomelo = require("../pomelo-client")
//var redis = require("redis")
//var _ = require("underscore")
//var path = require("path")
//var Scripto = require('redis-scripto')
//var Promise = require("bluebird")
//
//var Config = require("../config")
//var AllianceDao = require("../../app/dao/allianceDao")
//var PlayerDao = require("../../app/dao/playerDao")
//var Api = require("../api")
//
//var commandDir = path.resolve(__dirname + "/../../app/commands")
//var redisClient = redis.createClient(Config.redisPort, Config.redisAddr)
//var scripto = new Scripto(redisClient)
//scripto.loadFromDir(commandDir)
//var allianceDao = Promise.promisifyAll(new AllianceDao(redisClient, scripto))
//var playerDao = Promise.promisifyAll(new PlayerDao(redisClient, scripto))
//
//var sendChat = function(text, callback){
//	var info = {
//		text:text,
//		type:"global"
//	}
//	var route = "chat.chatHandler.send"
//	pomelo.request(route, info, function(doc){
//		callback(doc)
//	})
//}
//
//describe("ChatServer", function(){
//	var m_user
//
//	before(function(done){
//		playerDao.deleteAllAsync().then(function(){
//			return allianceDao.deleteAllAsync()
//		}).then(function(){
//			done()
//		})
//	})
//
//
//	describe("chatHandler", function(){
//		it("login", function(done){
//			Api.loginPlayer(Config.deviceId, function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//			var onPlayerLoginSuccess = function(doc){
//				m_user = doc
//				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
//			}
//			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
//		})
//
//		it("send", function(done){
//			var chatInfo = {
//				text:"this is blood",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onChat = function(doc){
//				doc.fromId.should.equal(m_user._id)
//				pomelo.removeListener("onChat", onChat)
//				done()
//			}
//			pomelo.on("onChat", onChat)
//		})
//
//		it("getAll", function(done){
//			var route = "chat.chatHandler.getAll"
//			pomelo.request(route, null, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onAllChat = function(doc){
//				doc.should.be.an.instanceOf(Array)
//				pomelo.removeListener("onAllChat", onAllChat)
//				done()
//			}
//			pomelo.on("onAllChat", onAllChat)
//		})
//
//
//		it("send help", function(done){
//			var chatInfo = {
//				text:"help",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var count = 0
//			var onChat = function(){
//				count += 1
//				if(count == 2){
//					done()
//				}
//			}
//			pomelo.on("onChat", onChat)
//		})
//
//		it("send reset", function(done){
//			var chatInfo = {
//				text:"reset",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(){
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send gem", function(done){
//			var chatInfo = {
//				text:"gem 5000",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(doc){
//				doc.resources.gem.should.equal(5000)
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send rs", function(done){
//			var chatInfo = {
//				text:"rs 5000",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(doc){
//				doc.resources.iron.should.equal(5000)
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send citizen", function(done){
//			var houseInfo = {
//				buildingLocation:3,
//				houseType:"dwelling",
//				houseLocation:1,
//				finishNow:true
//			}
//			var route = "logic.playerHandler.createHouse"
//			pomelo.request(route, houseInfo, function(doc){
//				doc.code.should.equal(200)
//
//				var chatInfo = {
//					text:"citizen 100",
//					type:"global"
//				}
//				var route = "chat.chatHandler.send"
//				pomelo.request(route, chatInfo, function(doc){
//					doc.code.should.equal(200)
//				})
//
//				var onPlayerDataChanged = function(doc){
//					doc.resources.citizen.should.equal(100)
//					done()
//					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//				}
//				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//			})
//		})
//
//		it("send coin", function(done){
//			var chatInfo = {
//				text:"coin 5000",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(doc){
//				doc.resources.coin.should.equal(5000)
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send building", function(done){
//			var chatInfo = {
//				text:"building 30",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(doc){
//				doc.buildings["location_1"].level.should.equal(22)
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send keep", function(done){
//			var chatInfo = {
//				text:"keep 8",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(doc){
//				doc.buildings["location_1"].level.should.equal(8)
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send rmbuildingevents", function(done){
//			var chatInfo = {
//				text:"rmbuildingevents",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(){
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send rmmaterialevents", function(done){
//			var chatInfo = {
//				text:"rmmaterialevents",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(){
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send material", function(done){
//			var chatInfo = {
//				text:"material 5",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(){
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send soldiermaterial", function(done){
//			var chatInfo = {
//				text:"soldiermaterial 5",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(){
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send rmsoldierevents", function(done){
//			var chatInfo = {
//				text:"rmsoldierevents",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(doc){
//				doc.soldierEvents.length.should.equal(0)
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send dragonmaterial", function(done){
//			var chatInfo = {
//				text:"dragonmaterial 5",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(){
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send dragonequipment", function(done){
//			var chatInfo = {
//				text:"dragonequipment 5",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(){
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send rmdragonequipmentevents", function(done){
//			var chatInfo = {
//				text:"rmdragonequipmentevents",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onPlayerDataChanged = function(doc){
//				doc.dragonEquipmentEvents.length.should.equal(0)
//				done()
//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
//			}
//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
//		})
//
//		it("send treatsoldiers", function(done){
//			sendChat("treatsoldiers 5", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send rmtreatsoldierevents", function(done){
//			sendChat("rmtreatsoldierevents", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send energy", function(done){
//			sendChat("energy 500", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send blood", function(done){
//			sendChat("blood 500", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send dragonvitality", function(done){
//			sendChat("dragonvitality redDragon 80", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send dragonskill", function(done){
//			sendChat("dragonskill redDragon 20", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send dragonequipmentstar", function(done){
//			sendChat("dragonequipmentstar redDragon 10", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send dragonstar", function(done){
//			sendChat("dragonstar redDragon 10", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send soldiers", function(done){
//			sendChat("soldiers 10", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send editplayername", function(done){
//			sendChat("editplayername modun", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send editplayercityname", function(done){
//			sendChat("editplayercityname myCity", function(doc){
//				doc.code.should.equal(200)
//				done()
//			})
//		})
//
//		it("send kickme", function(done){
//			var chatInfo = {
//				text:"kickme",
//				type:"global"
//			}
//			var route = "chat.chatHandler.send"
//			pomelo.request(route, chatInfo, function(doc){
//				doc.code.should.equal(200)
//			})
//
//			var onKick = function(){
//				done()
//				pomelo.removeListener("onKick", onKick)
//			}
//			pomelo.on("onKick", onKick)
//		})
//	})
//
//
//	after(function(){
//		pomelo.disconnect()
//	})
//})