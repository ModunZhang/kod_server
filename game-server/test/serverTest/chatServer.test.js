/**
 * Created by modun on 14-7-29.
 */

var should = require('should')
var Promise = require("bluebird")
var Promisify = Promise.promisify
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
				text:"this is blood"
			}
			var route = "chat.chatHandler.send"
			pomelo.notify(route, chatInfo)
			pomelo.on("onChat", function(doc){
				doc.fromId.should.equal(m_user._id)
				done()
			})
		})

		it("getAll", function(done){
			var route = "chat.chatHandler.getAll"
			pomelo.request(route, null, function(doc){
				doc.code.should.equal(200)
				doc.data.should.be.an.instanceOf(Array)
				done()
			})
		})


		after(function(){
			pomelo.disconnect()
		})
	})
})