/**
 * Created by modun on 14-7-25.
 */

var should = require('should')
var Promise = require("bluebird")
var Promisify = Promise.promisify
var pomelo = require("../pomelo-client")

var Config = require("../config")

describe("GateServer", function(){
	describe("gateHandler", function(){
		before(function(done){
			pomelo.init({
				host:Config.gateHost,
				port:Config.gatePort,
				log:true
			}, function(){
				done()
			})
		})


		it("queryEntry", function(done){
			var loginInfo = {
				deviceId:Config.deviceId
			}
			var route = "gate.gateHandler.queryEntry"
			pomelo.request(route, loginInfo, function(doc){
				doc.code.should.equal(200)
				doc.data.host.should.be.a.String
				doc.data.port.should.be.a.Number
				done()
			})
		})


		after(function(){
			pomelo.disconnect()
		})
	})
})