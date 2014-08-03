/**
 * Created by modun on 14-7-25.
 */

var should = require('should')
var Promise = require("bluebird")
var Promisify = Promise.promisify
var pomelo = require("../pomelo-client")

var Config = require("../config")

describe("LogicServer", function(){
	var m_user

	describe("entryHandler", function(){
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


		after(function(){
			pomelo.disconnect()
		})
	})
})