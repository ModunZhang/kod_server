"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var userSchema = new Schema({
	_id:{type:String, required:true, default:ShortId.generate},
	gcId:{type:String},
	players:[{
		id:{type:String, required:true},
		isActive:{type:Boolean, required:true}
	}],
	registerTime:{type:Number, required:true, default:Date.now()}
})

module.exports = mongoose.model('user', userSchema)