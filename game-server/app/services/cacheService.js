"use strict"

/**
 * Created by modun on 15/3/6.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var DataUtils = require("../utils/dataUtils")

var DataService = function(app){
	this.app = app
	this.redis = app.get("redis")
	this.playerDao = app.get("playerDao")
	this.allianceDao = app.get("allianceDao")
}
module.exports = DataService
var pro = DataService.prototype

/**
 * 清空redis中的数据
 * @param callback
 */
pro.flushDb = function(callback){
	this.redis.flushallAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有玩家到redis
 * @param callback
 */
pro.loadPlayers = function(callback){
	var self = this
	var ids = null
	var id = null
	var addAllToRedis = function(ids){
		if(ids.length == 0) return Promise.resolve()
		id = ids.shift()._id
		return self.playerDao.getModel().findByIdAsync(id).then(function(doc){
			return self.playerDao.directAddAsync(doc)
		}).then(function(){
			return addAllToRedis(ids)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}

	this.playerDao.getModel().findAsync({isActive:true}, {_id:true}).then(function(theIds){
		ids = theIds
		return addAllToRedis(ids)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有玩家保存到Mongo
 * @param callback
 */
pro.unloadPlayers = function(callback){
	var self = this
	var ids = null
	var id = null
	var saveAllToMongo = function(ids){
		if(ids.length == 0) return Promise.resolve()
		id = ids.shift()
		return self.playerDao.directFindAsync(id).then(function(doc){
			return self.playerDao.getModel().update({_id:doc._id}, _.omit(doc, "_id", "__v"))
		}).then(function(){
			return saveAllToMongo(ids)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}

	this.playerDao.findAllKeysAsync().then(function(theIds){
		ids = theIds
		return saveAllToMongo(ids)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有玩家到redis
 * @param callback
 */
pro.loadAlliances = function(callback){
	var self = this
	var ids = null
	var id = null
	var addAllToRedis = function(ids){
		if(ids.length == 0) return Promise.resolve()
		id = ids.shift()._id
		return self.allianceDao.getModel().findByIdAsync(id).then(function(doc){
			return self.allianceDao.directAddAsync(doc)
		}).then(function(){
			return addAllToRedis(ids)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}

	this.allianceDao.getModel().findAsync(null, {_id:true}).then(function(theIds){
		ids = theIds
		return addAllToRedis(ids)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有玩家保存到Mongo
 * @param callback
 */
pro.unloadAlliances = function(callback){
	var self = this
	var ids = null
	var id = null
	var saveAllToMongo = function(ids){
		if(ids.length == 0) return Promise.resolve()
		id = ids.shift()
		return self.allianceDao.directFindAsync(id).then(function(doc){
			return self.allianceDao.getModel().update({_id:doc._id}, _.omit(doc, "_id", "__v"))
		}).then(function(){
			return saveAllToMongo(ids)
		}).catch(function(e){
			return Promise.reject(e)
		})
	}

	this.allianceDao.findAllKeysAsync().then(function(theIds){
		ids = theIds
		return saveAllToMongo(ids)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}