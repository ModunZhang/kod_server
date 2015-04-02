"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var GemAddSchema = new Schema({
	_id:{type:String, required:true, default:ShortId.generate},
	playerId:{type:String, required:true},
	add:{type:Number, required:true},
	left:{type:Number, required:true},
	from:{type:String, required:true},
	rewards:{type:Schema.Types.Mixed},
	time:{type:Number, required:true, default:Date.now}
})

module.exports = mongoose.model('gemAdd', GemAddSchema)