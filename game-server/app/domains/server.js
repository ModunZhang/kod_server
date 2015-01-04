"use strict"

/**
 * Created by modun on 14-7-22.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")

var serverSchema = new Schema({
	_id:{type:String, required:true, unique:true, default:ShortId.generate},
	type:{type:String, required:true},
	stopTime:{type:Number, required:true}
})

module.exports = mongoose.model('server', serverSchema)