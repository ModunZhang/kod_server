"use strict"

/**
 * Created by modun on 14-7-22.
 */
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")
var GameDatas = require("../datas/GameDatas")


var allianceSchema = new Schema({
	basicInfo:{
		name:{type:String, required:true},
		tag:{type:String, required:true},
		desc:{type:String, required:false},
		language:{type:String, required:true},
		terrain:{type:String, required:true},
		flag:{type:String, required:true},
		power:{type:Number, required:true},
		kill:{type:Number, required:true, default:0},
		joinType:{type:String, required:true, default:Consts.AllianceJoinType.All},
		level:{type:Number, required:true, default:0},
		exp:{type:Number, required:true, default:0}
	},
	events:[
		{
			type:{type:String, required:true},
			keys:[String]
		}
	],
	notices:[
		{
			content:{type:String, reuqired:true},
			date:{type:Number, required:true}
		}
	],
	members:[
		{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			power:{type:Number, required:true},
			title:{type:String, required:true}
		}
	],
	joinRequests:[
		{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			power:{type:Number, required:true}
		}
	]
})

module.exports = mongoose.model('alliance', allianceSchema)