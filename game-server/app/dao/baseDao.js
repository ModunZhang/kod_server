"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var NONE = "__NONE__"
var LOCKED = "__LOCKED__"
/**
 * @param redis
 * @param scripto
 * @param modelName
 * @param model
 * @param indexs
 * @param env
 * @constructor
 */
var BaseDao = function(redis, scripto, modelName, model, indexs, env){
	this.redis = Promise.promisifyAll(redis)
	this.modelName = modelName
	this.model = Promise.promisifyAll(model)
	this.scripto = Promise.promisifyAll(scripto)
	this.indexs = indexs
	this.maxChangedCount = 1
	this.env = env
	this.tryTimes = 10
}

module.exports = BaseDao
var pro = BaseDao.prototype

/**
 * 获取mongoose model
 * @returns {*}
 */
pro.getModel = function(){
	return this.model
}

/**
 * create a object to mongo and add it to redis
 * @param doc
 * @param callback
 */
pro.create = function(doc, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isObject(doc)){
		callback(new Error("obj must be a json object"))
		return
	}
	if(!_.isUndefined(doc._id) && !_.isNull(doc._id)){
		callback(new Error("obj's _id must be empty"))
		return
	}

	var self = this
	var docString = null
	this.model.createAsync(doc).then(function(doc){
		docString = JSON.stringify(doc)
		return self.scripto.runAsync("addAndLock", [self.modelName, docString, Date.now()], self.indexs)
	}).then(function(){
		callback(null, JSON.parse(docString))
	}).catch(function(e){
		callback(e)
	})
}

/**
 * find obj from redis
 * @param index
 * @param value
 * @param forceFind
 * @param callback
 */
pro.findByIndex = function(index, value, forceFind, callback){
	if(arguments.length <=3){
		callback = forceFind
		forceFind = false
	}
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.contains(this.indexs, index)){
		callback(new Error("index must be a item of indexs"))
		return
	}
	if(_.isNull(value) || _.isUndefined(value)){
		callback(new Error("value must not be empty"))
		return
	}
	var self = this
	var tryTimes = 0
	var totalTryTimes = forceFind ? self.tryTimes * 10 : self.tryTimes
	var func = function(index, value){
		self.scripto.runAsync("findByIndex", [self.modelName, index, value, Date.now()]).then(function(docString){
			if(_.isEqual(docString, LOCKED)){
				tryTimes++
				if(tryTimes == 1){
					errorLogger.error("handle baseDao:findByIndex Error -----------------------------")
					errorLogger.error("errorInfo->modelName:%s, index:%s, value:%s is locked", self.modelName, index, value)
					if(_.isEqual("production", self.env)){
						errorMailLogger.error("handle baseDao:findByIndex Error -----------------------------")
						errorMailLogger.error("errorInfo->modelName:%s, index:%s, value:%s is locked", self.modelName, index, value)
					}
				}
				if(tryTimes <= totalTryTimes){
					setTimeout(func, 100, index, value)
				}else{
					errorLogger.error("handle baseDao:findByIndex Error -----------------------------")
					errorLogger.error("errorInfo->modelName:%s, index:%s, value:%s is locked", self.modelName, index, value)
					if(_.isEqual("production", self.env)){
						errorMailLogger.error("handle baseDao:findByIndex Error -----------------------------")
						errorMailLogger.error("errorInfo->modelName:%s, index:%s, value:%s is locked", self.modelName, index, value)
					}
					callback()
				}
			}else if(_.isEqual(docString, NONE)){
				callback()
			}else{
				callback(null, JSON.parse(docString))
			}
		}).catch(function(e){
			errorLogger.error("handle baseDao:findByIndex Error -----------------------------")
			errorLogger.error(e.message)
			if(_.isEqual("production", self.env)){
				errorMailLogger.error("handle baseDao:findByIndex Error -----------------------------")
				errorMailLogger.error(e.message)
			}
			callback()
		})
	}
	func(index, value)
}

/**
 * find obj by id
 * @param id
 * @param forceFind
 * @param callback
 */
pro.findById = function(id, forceFind, callback){
	if(arguments.length <=2){
		callback = forceFind
		forceFind = false
	}
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isString(id)){
		callback(new Error("id must be a string"))
		return
	}
	var self = this
	var tryTimes = 0
	var totalTryTimes = forceFind ? self.tryTimes * 10 : self.tryTimes
	var func = function(id){
		self.scripto.runAsync("findById", [self.modelName, id, Date.now()]).then(function(docString){
			if(_.isEqual(docString, LOCKED)){
				tryTimes++
				if(tryTimes == 1){
					errorLogger.error("handle baseDao:findById Error -----------------------------")
					errorLogger.error("errorInfo->modelName:%s, id:%s is locked", self.modelName, id)
					if(_.isEqual("production", self.env)){
						errorMailLogger.error("handle baseDao:findById Error -----------------------------")
						errorMailLogger.error("errorInfo->modelName:%s, id:%s is locked", self.modelName, id)
					}
				}
				if(tryTimes <= totalTryTimes){
					setTimeout(func, 100, id)
				}else{
					errorLogger.error("handle baseDao:findById Error -----------------------------")
					errorLogger.error("errorInfo->modelName:%s, id:%s is locked", self.modelName, id)
					if(_.isEqual("production", self.env)){
						errorMailLogger.error("handle baseDao:findById Error -----------------------------")
						errorMailLogger.error("errorInfo->modelName:%s, id:%s is locked", self.modelName, id)
					}
					callback()
				}
			}else if(_.isEqual(docString, NONE)){
				callback()
			}else{
				callback(null, JSON.parse(docString))
			}
		}).catch(function(e){
			errorLogger.error("handle baseDao:findById Error -----------------------------")
			errorLogger.error(e.message)
			if(_.isEqual("production", self.env)){
				errorMailLogger.error("handle baseDao:findById Error -----------------------------")
				errorMailLogger.error(e.message)
			}
			callback()
		})
	}
	func(id)
}

/**
 * update a object
 * @param doc json object
 * @param forceSave
 * @param callback
 */
pro.update = function(doc, forceSave, callback){
	if(arguments.length <=2){
		callback = forceSave
		forceSave = null
	}
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
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
	if(doc.__v >= this.maxChangedCount || !!forceSave){
		shouldSaveToMongo = true
		doc.__v = 0
	}
	var self = this
	this.scripto.runAsync("update", [this.modelName, JSON.stringify(doc)], this.indexs).then(function(){
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
 * delete obj from mongo and redis by id
 * @param id
 * @param callback
 */
pro.deleteById = function(id, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isString(id)){
		callback(new Error("id must be a string"))
		return
	}
	var self = this
	this.scripto.runAsync("removeById", [self.modelName, id], self.indexs).then(function(){
		return self.model.findByIdAndRemoveAsync(id)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * delete obj from mongo and redis by index
 * @param index
 * @param value
 * @param callback
 */
pro.deleteByIndex = function(index, value, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.contains(this.indexs, index)){
		callback(new Error("index must be a item of indexs"))
		return
	}
	if(_.isNull(value) || _.isUndefined(value)){
		callback(new Error("value must not be empty"))
		return
	}
	var self = this
	var condition = {}
	condition[index] = value

	this.scripto.runAsync("removeByIndex", [self.modelName, index, value], self.indexs).then(function(){
		return self.model.findOneAndRemoveAsync(condition)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 删除所有数据
 * @param callback
 */
pro.deleteAll = function(callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	var self = this
	this.scripto.runAsync("removeAll", [this.modelName], this.indexs).then(function(doc){
		return self.model.removeAsync({})
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * load all the same model's object to redis
 * @param callback
 */
pro.loadAll = function(callback){
	var self = this
	var docs = null
	this.model.findAsync({}).then(function(theDocs){
		docs = theDocs
		if(docs.length == 0) return Promise.resolve()
		var docStrings = []
		_.each(docs, function(doc){
			var docString = JSON.stringify(doc)
			docStrings.push(docString)
		})
		docStrings.unshift(self.modelName)
		return self.scripto.runAsync("addAll", docStrings, self.indexs)
	}).then(function(){
		callback(null, docs)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * save all the same model's object from redis to mongo
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
 * 根据Index模糊查找对象
 * @param index
 * @param value
 * @param callback
 */
pro.searchByIndex = function(index, value, callback){
	var docs = []
	this.scripto.runAsync("searchByIndex", [this.modelName, index, value]).then(function(docStrings){
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
 * 根据Index移除对象锁
 * @param index
 * @param value
 * @param callback
 */
pro.removeLockByIndex = function(index, value, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.contains(this.indexs, index)){
		callback(new Error("index must be a item of indexs"))
		return
	}
	if(_.isNull(value) || _.isUndefined(value)){
		callback(new Error("value must not be empty"))
		return
	}

	this.scripto.runAsync("removeLockByIndex", [this.modelName, index, value]).then(function(){
		callback(null, true)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 查询所有
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
 * 更新所有
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
	this.scripto.runAsync("updateAll", docStrings, this.indexs).then(function(docStrings){
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