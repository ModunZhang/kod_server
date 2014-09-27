"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")

/**
 * @param redis
 * @param scripto
 * @param modelName
 * @param model
 * @param indexs
 * @constructor
 */
var BaseDao = function(redis, scripto, modelName, model, indexs){
	this.redis = Promise.promisifyAll(redis)
	this.modelName = modelName
	this.model = Promise.promisifyAll(model)
	this.scripto = Promise.promisifyAll(scripto)
	this.indexs = indexs
	this.maxChangedCount = 1
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
 * @param doc json object
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
		return self.scripto.runAsync("add", [self.modelName, docString], self.indexs)
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
 * @param callback
 */
pro.findByIndex = function(index, value, callback){
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

	this.scripto.runAsync("findByIndex", [this.modelName, index, value]).then(function(docString){
		callback(null, JSON.parse(docString))
	}).catch(function(e){
		callback(e)
	})
}

/**
 * find obj by id
 * @param id
 * @param callback
 */
pro.findById = function(id, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isString(id)){
		callback(new Error("id must be a string"))
		return
	}

	this.scripto.runAsync("findById", [this.modelName, id]).then(function(docString){
		callback(null, JSON.parse(docString))
	}).catch(function(e){
		callback(e)
	})
}

/**
 * update a object
 * @param doc json object
 * @param callback
 */
pro.update = function(doc, callback){
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
	if(doc.__v >= this.maxChangedCount){
		shouldSaveToMongo = true
		doc.__v = 0
	}
	var self = this
	this.scripto.runAsync("update", [self.modelName, JSON.stringify(doc)], self.indexs).then(function(){
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
	this.model.findByIdAndRemoveAsync(id).then(function(){
		return self.scripto.runAsync("removeById", [self.modelName, id], self.indexs)
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
	this.model.findOneAndRemoveAsync(condition).then(function(){
		return self.scripto.runAsync("removeByIndex", [self.modelName, index, value], self.indexs)
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
	this.model.findAsync({}).then(function(docs){
		if(docs.length === 0) return Promise.resolve()
		var funcs = []
		for(var i = 0; i < docs.length; i++){
			var docString = JSON.stringify(docs[i])
			funcs.push(self.scripto.runAsync("add", [self.modelName, docString], self.indexs))
		}
		return Promise.all(funcs)
	}).then(function(){
		callback()
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
		for(var i = 0; i < docStrings.length; i ++){
			var doc = JSON.parse(docStrings[i])
			docs.push(doc)
		}
		callback(null, docs)
	}).catch(function(e){
		callback(e)
	})
}