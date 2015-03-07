"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var ErrorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var ErrorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var ErrorUtils = require("../utils/errorUtils")

var NONE = "__NONE__"
var LOCKED = "__LOCKED__"
/**
 * @param redis
 * @param scripto
 * @param modelName
 * @param model
 * @param env
 * @constructor
 */
var BaseDao = function(redis, scripto, modelName, model, env){
	this.redis = Promise.promisifyAll(redis)
	this.modelName = modelName
	this.model = model
	this.scripto = Promise.promisifyAll(scripto)
	this.maxChangedCount = 1
	this.env = env
	this.tryTimes = 4
}

module.exports = BaseDao
var pro = BaseDao.prototype

/**
 * 对象是否存在于Redis
 * @param id
 * @param callback
 */
pro.isExist = function(id, callback){
	if(!_.isString(id)){
		callback(new Error("id 不合法"))
		return
	}

	this.redis.existsAsync(this.modelName + ":" + id, function(res){
		callback(null, res == 1)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将对象加载入redis
 * @param doc
 * @param callback
 */
pro.directAdd = function(doc, callback){
	if(!_.isObject(doc)){
		callback(new Error("doc 不合法"))
		return
	}
	var docString = JSON.stringify(doc)
	this.redis.setAsync(this.modelName + ":" + doc._id, docString).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将对象加载入redis
 * @param doc
 * @param callback
 */
pro.add = function(doc, callback){
	if(!_.isObject(doc)){
		callback(new Error("doc 不合法"))
		return
	}
	var docString = JSON.stringify(doc)
	this.scripto.runAsync("addAndLock", [this.modelName, docString, Date.now()]).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加载所有对象到redis
 * @param docs
 * @param callback
 */
pro.addAll = function(docs, callback){
	if(!_.isArray(docs) || docs.length == 0){
		callback(new Error("docs 不合法"))
		return
	}

	var self = this
	var docStrings = []
	_.each(docs, function(doc){
		var key = self.modelName + ":" + doc._id
		var docString = JSON.stringify(doc)
		docStrings.push(key)
		docStrings.push(docString)
	})
	this.redis.msetAsync(docStrings).then(function(){
		callback(null, docs)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 根据Id查找对象
 * @param id
 * @param callback
 */
pro.directFind = function(id, callback){
	if(!_.isString(id)){
		callback(new Error("id 不合法"))
		return
	}
	this.redis.getAsync(this.modelName + ":" + id).then(function(docString){
		if(!_.isString(docString)) callback()
		else callback(null, JSON.parse(docString))
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 根据Id查找对象
 * @param id
 * @param forceFind
 * @param callback
 */
pro.find = function(id, forceFind, callback){
	if(arguments.length <= 2){
		callback = forceFind
		forceFind = false
	}
	if(!_.isString(id)){
		callback(new Error("id 不合法"))
		return
	}
	var self = this
	var tryTimes = 0
	var totalTryTimes = forceFind ? self.tryTimes * 2 : self.tryTimes
	var findById = function(id){
		self.scripto.runAsync("findById", [self.modelName, id, Date.now()]).then(function(docString){
			if(_.isEqual(docString, LOCKED)){
				tryTimes++
				if(tryTimes == 1){
					ErrorLogger.error("handle baseDao:findById Error -----------------------------")
					ErrorLogger.error("errorInfo->modelName:%s, id:%s is locked", self.modelName, id)
					if(_.isEqual("production", self.env)){
						ErrorMailLogger.error("handle baseDao:findById Error -----------------------------")
						ErrorMailLogger.error("errorInfo->modelName:%s, id:%s is locked", self.modelName, id)
					}
				}
				if(tryTimes <= totalTryTimes){
					setTimeout(findById, 500, id)
				}else{
					callback(ErrorUtils.objectIsLocked(self.modelName, id))
				}
			}else if(_.isEqual(docString, NONE)){
				callback()
			}else{
				callback(null, JSON.parse(docString))
			}
		}).catch(function(e){
			callback(e)
		})
	}
	findById(id)
}

/**
 * 从redis查询所有
 * @param ids
 * @param callback
 */
pro.findAll = function(ids, callback){
	if(!_.isArray(ids) || ids.length == 0){
		callback(new Error("ids 不合法"))
		return
	}
	var self = this
	var fullIds = []
	_.each(ids, function(id){
		fullIds.push(self.modelName + ":" + id)
	})
	var docs = []
	this.redis.mgetAsync(fullIds).then(function(docStrings){
		for(var i = 0; i < docStrings.length; i++){
			var doc = JSON.parse(docStrings[i])
			docs.push(doc)
		}
		callback(null, docs)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 更新对象
 * @param doc json object
 * @param persistNow
 * @param callback
 */
pro.update = function(doc, persistNow, callback){
	if(arguments.length <= 2){
		callback = persistNow
		persistNow = null
	}
	if(!_.isObject(doc) || !_.isString(doc._id)){
		callback(new Error("doc 不合法"))
		return
	}

	doc.__v++
	var shouldSaveToMongo = false
	if(doc.__v >= this.maxChangedCount || !!persistNow){
		shouldSaveToMongo = true
		doc.__v = 0
	}
	var self = this
	this.scripto.runAsync("update", [this.modelName, JSON.stringify(doc)]).then(function(){
		if(shouldSaveToMongo){
			return self.model.findByIdAndUpdateAsync(doc._id, _.omit(doc, "_id", "__v"))
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 更新所有对象到redis
 * @param docs
 * @param callback
 */
pro.updateAll = function(docs, callback){
	if(!_.isArray(docs) || docs.length == 0){
		callback(new Error("docs 不合法"))
		return
	}

	var docStrings = []
	_.each(docs, function(doc){
		var docString = JSON.stringify(doc)
		docStrings.push(docString)
	})
	docStrings.unshift(this.modelName)
	this.scripto.runAsync("updateAll", docStrings).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从redis移除缓存
 * @param id
 * @param callback
 */
pro.remove = function(id, callback){
	if(!_.isString(id)){
		callback(new Error("id 不合法"))
		return
	}
	this.scripto.runAsync("removeById", [this.modelName, id]).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从redis移除所有数据
 * @param ids
 * @param callback
 */
pro.removeAll = function(ids, callback){
	if(!_.isArray(ids) || ids.length == 0){
		callback(new Error("ids 不合法"))
		return
	}
	ids.unshift(this.modelName)

	this.scripto.runAsync("removeAll", ids).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 查询所有Key
 * @param callback
 */
pro.findAllKeys = function(callback){
	var theKeys = []
	this.redis.keysAsync(this.modelName + ":*").then(function(keys){
		_.each(keys, function(key){
			theKeys.push(key.split(":")[1])
		})
		callback(null, theKeys)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 根据Id移除对象锁
 * @param id
 * @param callback
 */
pro.removeLock = function(id, callback){
	if(!_.isString(id)){
		callback(new Error("id 不合法"))
		return
	}
	this.redis.delAsync("lock." + this.modelName + ":" + id).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}