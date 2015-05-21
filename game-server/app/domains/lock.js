"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require('shortid')
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var LockSchema = new Schema({
	_id:{type:String, required:true, default:ShortId.generate},
	type:{type:String, required:true, index:true},
	value:{type:String, required:true, index:true},
	finishTime:{type:Number, required:true, default:Date.now, index:true}
})

module.exports = mongoose.model('lock', LockSchema)