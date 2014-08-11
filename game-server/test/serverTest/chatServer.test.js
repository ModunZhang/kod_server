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
						var loginInfo = {
							deviceId:Config.deviceId
						}
						var route = "logic.entryHandler.login"
						pomelo.request(route, loginInfo, function(doc){
							m_user = doc.data
							done()
						})
					})
				})
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
			var onChat = function(doc){
				count += 1
				if(count == 2){
					pomelo.removeListener("onChat", onChat)
					done()
				}
			}
			pomelo.on("onChat", onChat)
		})

		it("send Reset", function(done){
			var chatInfo = {
				text:"reset",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				console.log(doc)
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				done()

			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		after(function(){
			pomelo.disconnect()
		})
	})
})