"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Consts = require("../../../consts/consts")

module.exports = function(app) {
	return new CacheRemote(app)
}

var CacheRemote = function(app) {
	this.app = app
	this.cacheService = app.get("cacheService")
	this.logService = app.get("logService")
}

var pro = CacheRemote.prototype

/**
 * 按Id直接查询玩家,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindPlayer = function(id, callback){
	this.cacheService.directFindPlayer(id, function(e, doc){
		var self = this
		try{
			callback(e, doc)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.directFindPlayer", {id:id}, e.stack)
		}
	})
}

/**
 * 按Id查询玩家
 * @param id
 * @param force
 * @param callback
 */
pro.findPlayer = function(id, force, callback){
	var self = this
	if(arguments.length == 2){
		callback = force
		force = false
	}
	this.cacheService.findPlayer(id, force, function(e, doc){
		try{
			callback(e, doc)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.findPlayer", {id:id}, e.stack)
		}
	})
}

/**
 * 更新玩家对象
 * @param id
 * @param doc
 * @param callback
 */
pro.updatePlayer = function(id, doc, callback){
	var self = this
	this.cacheService.updatePlayer(id, doc, function(e){
		try{
			callback(e)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.updatePlayer", {id:id, doc:doc}, e.stack)
		}
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param doc
 * @param callback
 */
pro.flushPlayer = function(id, doc, callback){
	var self = this
	this.cacheService.flushPlayer(id, doc, function(e){
		try{
			callback(e)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.flushPlayer", {id:id, doc:doc}, e.stack)
		}
	})
}

/**
 * 更新玩家并同步到Mongo最后将玩家从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutPlayer = function(id, doc, callback){
	var self = this
	this.cacheService.timeoutPlayer(id, doc, function(e){
		try{
			callback(e)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.timeoutPlayer", {id:id, doc:doc}, e.stack)
		}
	})
}

/**
 * 创建联盟对象
 * @param doc
 * @param callback
 */
pro.createAlliance = function(doc, callback){
	var self = this
	this.cacheService.createAlliance(doc, function(e, theDoc){
		try{
			callback(e, theDoc)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.createAlliance", {id:doc._id, doc:doc}, e.stack)
		}
	})
}

/**
 * 按Id直接查询联盟,不做请求排序
 * @param id
 * @param callback
 */
pro.directFindAlliance = function(id, callback){
	var self = this
	this.cacheService.directFindAlliance(id, function(e, doc){
		try{
			callback(e, doc)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.directFindAlliance", {id:id}, e.stack)
		}
	})
}

/**
 * 按Id查询联盟
 * @param id
 * @param force
 * @param callback
 */
pro.findAlliance = function(id, force, callback){
	var self = this
	if(arguments.length == 2){
		callback = force
		force = false
	}
	this.cacheService.findAlliance(id, force, function(e, doc){
		try{
			callback(e, doc)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.findAlliance", {id:id}, e.stack)
		}
	})
}

/**
 * 更新联盟对象
 * @param id
 * @param doc
 * @param callback
 */
pro.updateAlliance = function(id, doc, callback){
	var self = this
	this.cacheService.updateAlliance(id, doc, function(e){
		try{
			callback(e)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.updateAlliance", {id:id, doc:doc}, e.stack)
		}
	})
}

/**
 * 更新玩家对象并同步到Mongo
 * @param id
 * @param doc
 * @param callback
 */
pro.flushAlliance = function(id, doc, callback){
	var self = this
	this.cacheService.flushAlliance(id, doc, function(e){
		try{
			callback(e)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.flushAlliance", {id:id, doc:doc}, e.stack)
		}
	})
}

/**
 * 更新联盟并同步到Mongo最后将联盟从内存移除
 * @param id
 * @param doc
 * @param callback
 */
pro.timeoutAlliance = function(id, doc, callback){
	var self = this
	this.cacheService.timeoutAlliance(id, doc, function(e){
		try{
			callback(e)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.timeoutAlliance", {id:id, doc:doc}, e.stack)
		}
	})
}

/**
 * 玩家名字是否存在
 * @param playerName
 * @param callback
 */
pro.isPlayerNameExist = function(playerName, callback){
	var self = this
	this.cacheService.isPlayerNameExist(playerName, function(e, exist){
		try{
			callback(e, exist)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.isPlayerNameExist", {playerName:playerName}, e.stack)
		}
	})
}

/**
 * 联盟名称是否存在
 * @param allianceName
 * @param callback
 */
pro.isAllianceNameExist = function(allianceName, callback){
	var self = this
	this.cacheService.isAllianceNameExist(allianceName, function(e, exist){
		try{
			callback(e, exist)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.isAllianceNameExist", {allianceName:allianceName}, e.stack)
		}
	})
}

/**
 * 联盟标签是否存在
 * @param allianceTag
 * @param callback
 */
pro.isAllianceTagExist = function(allianceTag, callback){
	var self = this
	this.cacheService.isAllianceTagExist(allianceTag, function(e, exist){
		try{
			callback(e, exist)
		}catch(e){
			self.logService.onEventError("cache.cacheRemote.isAllianceTagExist", {allianceTag:allianceTag}, e.stack)
		}
	})
}