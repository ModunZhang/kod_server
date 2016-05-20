"use strict";

/**
 * Created by modun on 15/1/8.
 */

var ShortId = require("shortid");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ServerStateSchema = new Schema({
	_id:{type:String, required:true},
	openAt:{type:Number, required:true, default:Date.now},
	lastStopTime:{type:Number, required:true, default:Date.now},
	notices:[{
		_id:false,
		id:{type:String, required:true},
		title:{type:String, required:true},
		content:{type:String, required:true},
		time:{type:Number, required:true}
	}],
	activities:{
		in:[{
			_id:false,
			type:{type:String, required:true},
			finishTime:{type:Number, required:true}
		}],
		expired:[{
			_id:false,
			type:{type:String, required:true},
			removeTime:{type:Number, required:true}
		}],
		next:[{
			_id:false,
			type:{type:String, required:true},
			startTime:{type:Number, required:true}
		}]
	}
});

module.exports = mongoose.model('serverState', ServerStateSchema);