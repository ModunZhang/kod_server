"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var dealSchema = new Schema({
	_id:{type:String, required:true, unique:true, index:true, default:ShortId.generate},
	playerId:{type:String, required:true},
	itemData:{
		type:{type:String, required:true},
		name:{type:String, required:true},
		count:{type:String, required:true},
		price:{type:Number, required:true}
	}
})

module.exports = mongoose.model('deal', dealSchema)