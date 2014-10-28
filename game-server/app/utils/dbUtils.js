"use strict"

/**
 * Created by modun on 14-10-28.
 */


var Promise = require("bluebird")
var _ = require("underscore")

var Utils = module.exports

/**
 * 清空redis中的数据
 * @param redis
 * @param callback
 */
Utils.flushAll = function(redis, callback){
	redis.flushallAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有玩家到redis
 * @param playerDao
 * @param callback
 */
Utils.loadAllPlayer = function(playerDao, callback){
	playerDao.loadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有玩家保存到Mongo
 * @param playerDao
 * @param callback
 */
Utils.unloadAllPlayer = function(playerDao, callback){
	playerDao.unloadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有联盟到redis
 * @param allianceDao
 * @param callback
 */
Utils.loadAllAlliance = function(allianceDao, callback){
	allianceDao.loadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有联盟保存到Mongo
 * @param allianceDao
 * @param callback
 */
Utils.unloadAllAlliance = function(allianceDao, callback){
	allianceDao.unloadAllAsync().then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有数据到内存
 * @param redis
 * @param playerDao
 * @param allianceDao
 * @param callback
 */
Utils.loadAllData = function(redis, playerDao, allianceDao, callback){
	var self = this
	this.flushAllAsync(redis).then(function(){
		return self.loadAllPlayerAsync(playerDao)
	}).then(function(){
		return self.loadAllAllianceAsync(allianceDao)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有数据保存到Mongo
 * @param playerDao
 * @param allianceDao
 * @param callback
 */
Utils.unloadAllData = function(playerDao, allianceDao, callback){
	var self = this
	this.unloadAllPlayerAsync(playerDao).then(function(){
		return self.unloadAllAllianceAsync(allianceDao)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}