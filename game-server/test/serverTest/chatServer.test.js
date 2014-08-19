/**
 * Created by modun on 14-7-29.
 */

var should = require('should')
var Promise = require("bluebird")
var pomelo = require("../pomelo-client")

var Config = require("../config")

describe("ChatServer", function(){
	var m_user
	describe("chatHandler", function(){
		before(function(done){
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

		it("send", function(done){
			var chatInfo = {
				text:"this is blood",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onChat = function(doc){
				doc.fromId.should.equal(m_user._id)
				pomelo.removeListener("onChat", onChat)
				done()
			}
			pomelo.on("onChat", onChat)
		})

		it("getAll", function(done){
			var route = "chat.chatHandler.getAll"
			pomelo.request(route, null, function(doc){
				doc.code.should.equal(200)
			})

			var onAllChat = function(doc){
				doc.should.be.an.instanceOf(Array)
				pomelo.removeListener("onAllChat", onAllChat)
				done()
			}
			pomelo.on("onAllChat", onAllChat)
		})


		it("send Help", function(done){
			var chatInfo = {
				text:"help",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var count = 0
			var onChat = function(){
				count += 1
				if(count == 2){
					pomelo.removeListener("onChat", onChat)
					done()
				}
			}
			pomelo.on("onChat", onChat)
		})

		it("send reset", function(done){
			var chatInfo = {
				text:"reset",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(){
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("send gem", function(done){
			var chatInfo = {
				text:"gem 5000",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.basicInfo.gem.should.equal(5000)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("send rs", function(done){
			var chatInfo = {
				text:"rs 5000",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.iron.should.equal(5000)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("send citizen", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseType:"dwelling",
				houseLocation:1,
				finishNow:true
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)

				var chatInfo = {
					text:"citizen 100",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.resources.citizen.should.equal(100)
					done()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			})
		})

		it("send coin", function(done){
			var chatInfo = {
				text:"coin 5000",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.basicInfo.coin.should.equal(5000)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		after(function(done){
			pomelo.disconnect()
			setTimeout(done, 100)
		})
	})
})