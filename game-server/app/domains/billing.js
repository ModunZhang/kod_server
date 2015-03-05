"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var BillingSchema = new Schema({
	_id:{type:String, required:true, default:ShortId.generate},
	transactionId:{type:String, require:true, unique:true, index:true},
	playerId:{type:String, required:true},
	productId:{type:String, required:true},
	quantity:{type:Number, required:true},
	itemId:{type:String, required:true},
	purchaseDate:{type:String, require:true}
})

module.exports = mongoose.model('Billing', BillingSchema)