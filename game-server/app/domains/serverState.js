"use strict"

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var ServerStateSchema = new Schema({
	id:{type:String, required:true},
	lastStopTime:{type:Number, required:true}

})

module.exports = mongoose.model('serverState', ServerStateSchema)