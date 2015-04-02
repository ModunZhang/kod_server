"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var ServerStateSchema = new Schema({
	_id:{type:String, required:true, default:ShortId.generate},
	type:{type:String, required:true},
	time:{type:Number, required:true, default:Date.now()}
})

module.exports = mongoose.model('serverState', ServerStateSchema)