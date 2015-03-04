"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var deviceSchema = new Schema({
	_id:{type:String, required:true, default:ShortId.generate},
	deviceId:{type:String, required:true, unique:true},
	userId:{type:String, required:true}
})

module.exports = mongoose.model('device', deviceSchema)