"use strict"

/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var _ = require("underscore")

/**
 *
 * @param model mongoose domain object model
 * @constructor
 */
var BaseDao = function(model){
	this.model = model
	this.entities = {}
}

module.exports = BaseDao
var pro = BaseDao.prototype

/**
 * 获取Model
 * @returns {*}
 */
pro.getModel = function(){
	return this.model
}

/**
 * create a object
 * @param doc json object
 * @param callback
 */
pro.add = function(doc, callback){
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
	this.model.create(doc, function(err, doc){
		doc = _.isObject(doc) ? JSON.parse(JSON.stringify(doc)) : null
		callback(err, doc)
	})
}

/**
 * find obj from mongo
 * @param condition
 * @param callback
 */
pro.find = function(condition, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isObject(condition)){
		callback(new Error("condition must an object"))
		return
	}

	this.model.findOne(condition, function(err, doc){
		doc = _.isObject(doc) ? JSON.parse(JSON.stringify(doc)) : null
		callback(err, doc)
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

	this.model.findById(id, function(err, doc){
		doc = _.isObject(doc) ? JSON.parse(JSON.stringify(doc)) : null
		callback(err, doc)
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

	this.model.findByIdAndUpdate(doc._id, _.omit(doc, "_id", "__v"), function(err, doc){
		doc = _.isObject(doc) ? JSON.parse(JSON.stringify(doc)) : null
		callback(err, doc)
	})
}

/**
 * delete obj from mongo
 * @param doc
 * @param callback
 */
pro.remove = function(doc, callback){
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

	this.model.findByIdAndRemove(doc._id, function(err){
		doc = _.isObject(doc) ? JSON.parse(JSON.stringify(doc)) : null
		callback(err, doc)
	})
}