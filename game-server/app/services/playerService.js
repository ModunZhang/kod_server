/**
 * Created by modun on 14-7-23.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var crypto = require('crypto')

var PlayerDao = require("../dao/playerDao")

var PlayerService = function(redis){
	this.dao = Promise.promisifyAll(new PlayerDao(redis))
}

module.exports = PlayerService
var pro = PlayerService.prototype

pro.getPlayerByDeviceId = function(deviceId, callback){
	var self = this
	var createPlayer = Promisify(CreatePlayer, this)

	this.dao.findFromMongoAsync({deviceId:deviceId}).then(function(doc){
		if(_.isNull(doc)){
			return createPlayer(deviceId)
		}else{
			return self.dao.findAsync(doc._id)
		}
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

pro.getPlayerById = function(id, callback){
	this.dao.findAsync(id).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

var CreatePlayer = function(deviceId, callback){
	var self = this
	Promisify(crypto.randomBytes)(4).then(function(buf){
		var token = buf.toString("hex")
		return Promise.resolve(token)
	}).then(function(token){
		var doc = {
			deviceId:deviceId,
			name:"player_" + token,
			icon:"playerIcon_default.png"
		}
		return Promise.resolve(doc)
	}).then(function(doc){
		return self.dao.addAsync(doc)
	}).then(function(doc){
		return callback(null, doc)
	}).catch(function(e){
		return callback(e)
	})
}