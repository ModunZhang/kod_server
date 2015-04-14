"use strict"

/**
 * Created by modun on 15/3/6.
 */

var LogicUtils = require("../utils/logicUtils")

var DataService = function(app){
	this.app = app
	this.cacheServerId = app.get("cacheServerId")
}
module.exports = DataService
var pro = DataService.prototype

pro.createPlayer = function(id, callback){
	var player = LogicUtils.createPlayer(id, this.cacheServerId)
	this.app.rpc.cache.cacheRemote.create.toServer(this.cacheServerId, player._id, player, callback)
}

pro.createAlliance = function(id, alliance, callback){
	alliance.serverId = this.cacheServerId
	this.app.rpc.cache.cacheRemote.create.toServer(this.cacheServerId, alliance._id, alliance, callback)
}

pro.findPlayer = function(id, callback){
	this.app.rpc.cache.cacheRemote.find.toServer(this.cacheServerId, "Player", id, callback)
}

pro.updatePlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.find.toServer(this.cacheServerId, "Player", doc._id, doc.__v, doc, callback)
}

pro.flashPlayer = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.find.toServer(this.cacheServerId, "Player", doc._id, doc.__v, doc, callback)
}

pro.findAlliance = function(id, callback){
	this.app.rpc.cache.cacheRemote.find.toServer(this.cacheServerId, "Alliance", id, callback)
}

pro.updateAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.find.toServer(this.cacheServerId, "Alliance", doc._id, doc.__v, doc, callback)
}

pro.flashAlliance = function(doc, data, callback){
	this.app.rpc.cache.cacheRemote.find.toServer(this.cacheServerId, "Alliance", doc._id, doc.__v, doc, callback)
}