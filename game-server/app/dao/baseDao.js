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
	this.redis.existsAsync(this.modelName + ":" + id, function(res){
		callback(null, res == 1)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 创建对象并加载入Redis
 * @param doc
 * @param callback
 */
pro.add = function(doc, callback){
	if(!_.isObject(doc)){
		callback(new Error("doc 不合法"))
		return
	}
	var self = this
	var docString = null
	this.scripto.runAsync("addAndLock", [self.modelName, docString, Date.now()]).then(function(){
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
	var docStrings = []
	_.each(docs, function(doc){
		var docString = JSON.stringify(doc)
		docStrings.push(docString)
	})
	docStrings.unshift(this.modelName)

	this.scripto.runAsync("addAll", docStrings).then(function(){
		callback(null, docs)
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
	ids.unshift(this.modelName)
	this.scripto.runAsync("findAll", ids)
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
	if(!_.isObject(doc)){
		callback(new Error("obj must be a json object"))
		return
	}
	if(!_.isString(doc._id)){
		callback(new Error("obj's _id must be a string"))
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
 * 从redis移除缓存
 * @param id
 * @param callback
 */
pro.remove = function(id, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isString(id)){
		callback(new Error("id must be a string"))
		return
	}
	var self = this
	this.scripto.runAsync("removeById", [self.modelName, id], self.indexs).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从redis移除所有数据
 * @param callback
 */
pro.removeAll = function(callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	this.scripto.runAsync("removeAll", [this.modelName]).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将所有对象从redis同步到mongo
 * @param callback
 */
pro.unloadAll = function(callback){
	var self = this
	this.scripto.runAsync("findAll", [this.modelName]).then(function(docStrings){
		var funcs = []
		for(var i = 0; i < docStrings.length; i++){
			var doc = JSON.parse(docStrings[i])
			funcs.push(self.model.findByIdAndUpdateAsync(doc._id, _.omit(doc, "_id", "__v")))
		}
		return Promise.all(funcs)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 根据Id移除对象锁
 * @param id
 * @param callback
 */
pro.removeLockById = function(id, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isString(id)){
		callback(new Error("id must be a string"))
		return
	}
	this.scripto.runAsync("removeLockById", [this.modelName, id]).then(function(){
		callback(null, true)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 从redis查询所有
 * @param callback
 */
pro.findAll = function(callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	var docs = []
	this.scripto.runAsync("findAll", [this.modelName]).then(function(docStrings){
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
 * 更新所有对象到redis
 * @param docs
 * @param callback
 */
pro.updateAll = function(docs, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isArray(docs)){
		callback(new Error("docs must be an array"))
		return
	}

	var docStrings = []
	_.each(docs, function(doc){
		var docString = JSON.stringify(doc)
		docStrings.push(docString)
	})
	docStrings.unshift(this.modelName)
	this.scripto.runAsync("updateAll", docStrings, this.indexs).then(function(){
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
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	var theKeys = []
	this.scripto.runAsync("findAllKeys", [this.modelName]).then(function(keys){
		_.each(keys, function(key){
			theKeys.push(key.split(":")[1])
		})
		callback(null, theKeys)
	}).catch(function(e){
		callback(e)
	})
}