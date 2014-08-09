/**
 * Created by modun on 14-7-22.
 */

var async = require("async")
var Promise = require("bluebird")
var Promisify = Promise.promisify
var utils = require("../utils/utils")
var _ = require("underscore")

/**
 *
 * @param redis redis client
 * @param model mongoose domain object model
 * @constructor
 */
var BaseDao = function(redis, model){
	this.redis = redis
	this.model = model
}

module.exports = BaseDao
var pro = BaseDao.prototype

/**
 * create and storage it to mongo then load it to redis
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

	var saveToMongo = Promisify(SaveToMongo, this)
	var loadObjToRedis = Promisify(LoadObjToRedis, this)
	var findObjFromRedis = Promisify(FindObjFromRedis, this)
	saveToMongo(doc).then(function(doc){
		return loadObjToRedis(doc)
	}).then(function(doc){
		return findObjFromRedis(doc._id)
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * find obj from redis, find it from mongo if not has
 * @param id
 * @param callback
 */
pro.find = function(id, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(_.isUndefined(id) || _.isNull(id)){
		callback(new Error("id must not be empty"))
		return
	}

	var findObjFromMongo = Promisify(FindObjFromMongo, this)
	var loadObjToRedis = Promisify(LoadObjToRedis, this)
	var findObjFromRedis = Promisify(FindObjFromRedis, this)

	findObjFromRedis(id).then(function(doc){
		if(_.isNull(doc)){
			return findObjFromMongo(id).then(function(doc){
				if(_.isNull(doc)){
					return Promise.resolve(doc)
				}else{
					return loadObjToRedis(doc).then(function(doc){
						return findObjFromRedis(doc._id)
					})
				}
			}).then(function(doc){
				return Promise.resolve(doc)
			})
		}else{
			return Promise.resolve(doc)
		}
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * find object from mongo directly and will not be cached by redis
 * @param msg
 * @param callback
 */
pro.findFromMongo = function(msg, callback){
	this.model.findOne(msg, function(err, doc){
		callback(err, doc)
	})
}

/**
 * update a object in redis, notice: will not persistence it to mongo
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
	if(_.isUndefined(doc._id) || _.isNull(doc._id)){
		callback(new Error("obj's _id must not be empty"))
		return
	}
	if(_.isUndefined(doc.__changed) || _.isNull(doc.__changed)){
		doc.__changed = 0
	}

	if(doc.__changed >= 1){
		doc.__changed = 0
		SaveToMongo.call(this, doc, function(){})
	}else{
		doc.__changed ++
	}

	LoadObjToRedis.call(this, doc, callback)
}

/**
 * delete obj from redis
 * @param doc
 * @param callback
 */
pro.clear = function(doc, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback must be a function")
	}
	if(!_.isObject(doc)){
		callback(new Error("obj must be a json object"))
		return
	}
	if(_.isUndefined(doc._id) || _.isNull(doc._id)){
		callback(new Error("obj's _id must not be empty"))
		return
	}

	var saveToMongo = Promisify(SaveToMongo, this)
	var clearRedisObj = Promisify(ClearRedisObj, this)
	saveToMongo(doc).then(function(doc){
		return clearRedisObj(doc)
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * delete obj from redis and mongo
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
	if(_.isUndefined(doc._id) || _.isNull(doc._id)){
		callback(new Error("obj's _id must not be empty"))
		return
	}

	var deleteMongoObj = Promisify(DeleteMongoObj, this)
	var clearRedisObj = Promisify(ClearRedisObj, this)
	deleteMongoObj(doc).then(function(doc){
		return clearRedisObj(doc)
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * save obj to mongo
 * @param doc
 * @param callback
 * @constructor
 */
var SaveToMongo = function(doc, callback){
	if(!_.isUndefined(doc._id) && !_.isNull(doc._id)){
		this.model.findOneAndUpdate(doc._id, _.omit(doc, [ '_id', '__v' ]), function(err, doc){
			callback(err, doc)
		})
		callback(null, doc)
	}else{
		var po = new this.model(doc)
		po.save(function(err, doc){
			callback(err, doc)
		})
	}
}

/**
 * load obj from mongo to redis
 * @param doc
 * @param callback
 * @constructor
 */
var LoadObjToRedis = function(doc, callback){
	var modelName = this.model.modelName
	this.redis.set(modelName + ":_id:" + doc._id, JSON.stringify(doc), function(err){
		callback(err, doc)
	})
}

/**
 * find object from mongo
 * @param id
 * @param callback
 * @constructor
 */
var FindObjFromMongo = function(id, callback){
	this.model.findById(id, callback)
}

/**
 * find obj from redis by defined keys
 * @param id
 * @param callback
 * @constructor
 */
var FindObjFromRedis = function(id, callback){
	var self = this
	var fullKey = self.model.modelName + ":_id:" + id
	self.redis.get(fullKey, function(err, docString){
		if(!_.isNull(err)){
			callback(err)
		}else if(_.isNull(docString)){
			callback(null, null)
		}else{
			callback(null, JSON.parse(docString))
		}
	})
}

/**
 * remove obj from redis
 * @param doc
 * @param callback
 * @constructor
 */
var ClearRedisObj = function(doc, callback){
	var fullKey = this.model.modelName + ":_id:" + doc._id
	this.redis.del(fullKey, function(err){
		callback(err, doc)
	})
}

/**
 * delete obj from mongo
 * @param doc
 * @param callback
 * @constructor
 */
var DeleteMongoObj = function(doc, callback){
	this.model.findByIdAndRemove(doc._id, function(err){
		callback(err, doc)
	})
}