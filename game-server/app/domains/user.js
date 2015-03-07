"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var UserSchema = new Schema({
	_id:{type:String, required:true, unique:true, index:true},
	gcId:{type:String},
	players:[{
		_id:false,
		id:{type:String, required:true},
		selected:{type:Boolean, required:true}
	}],
	registerTime:{type:Number, required:true, default:Date.now()}
})

module.exports = mongoose.model('user', UserSchema)