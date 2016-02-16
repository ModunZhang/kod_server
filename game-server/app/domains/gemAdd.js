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
	playerName:{type:String, required:true},
	itemName:{type:Number, required:true},
	count:{type:String, required:true},
	api:{type:String, required:true},
	params:{type:Schema.Types.Mixed},
	time:{type:Number, required:true, default:Date.now}
})

module.exports = mongoose.model('gemAdd', GemAddSchema)