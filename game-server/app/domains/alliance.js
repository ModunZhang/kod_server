"use strict"

/**
 * Created by modun on 14-7-22.
 */
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")


var allianceSchema = new Schema({
	basicInfo:{
		name:{type:String, required:true, unique:true},
		tag:{type:String, required:true, unique:true},
		language:{type:String, required:true},
		terrain:{type:String, required:true},
		flag:{type:String, required:true},
		power:{type:Number, required:true},
		kill:{type:Number, required:true, default:0},
		joinType:{type:String, required:true, default:Consts.AllianceJoinType.All},
		level:{type:Number, required:true, default:0},
		exp:{type:Number, required:true, default:0},
		createTime:{type:Number, required:true, default:Date.now()},
		lastActiveTime:{type:Number, required:true, default:Date.now()}
	},
	notice:{type:String, required:false},
	desc:{type:String, required:false},
	titles:{
		archon:{type:String, required:true, default:"__archon"},
		general:{type:String, required:true, default:"__general"},
		diplomat:{type:String, required:true, default:"__diplomat"},
		quartermaster:{type:String, required:true, default:"__quartermaster"},
		supervisor:{type:String, required:true, default:"__supervisor"},
		elite:{type:String, required:true, default:"__elite"},
		member:{type:String, required:true, default:"__member"}
	},
	events:[
		{
			type:{type:String, required:true},
			keys:[String]
		}
	],
	members:[
		{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			power:{type:Number, required:true},
			kill:{type:Number, required:true},
			loyalty:{type:Number, reuqired:true, default:0},
			title:{type:Number, required:true}
		}
	],
	joinRequestEvents:[
		{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			power:{type:Number, required:true},
			requestTime:{type:Number, required:true}
		}
	]
})

module.exports = mongoose.model('alliance', allianceSchema)