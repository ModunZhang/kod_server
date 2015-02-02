"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var billingSchema = new Schema({
	_id:{type:String, required:true, unique:true, index:true, default:ShortId.generate},
	playerId:{type:String, required:true},
	billingId:{type:String, required:true},
	isLegal:{type:Boolean, required:true},
	isValidated:{type:Boolean, required:true},
	isUsed:{type:Boolean, required:true},
	createTime:{type:Number, required:true, default:Date.now()}
})

module.exports = mongoose.model('billing', billingSchema)