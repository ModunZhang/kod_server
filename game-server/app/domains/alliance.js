"use strict"

/**
 * Created by modun on 14-7-22.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")


var allianceSchema = new Schema({
	_id:{type:String, required:true, unique:true, default:ShortId.generate},
	basicInfo:{
		name:{type:String, required:true, unique:true},
		tag:{type:String, required:true, unique:true},
		language:{type:String, required:true},
		terrain:{type:String, required:true},
		flag:{type:String, required:true},
		power:{type:Number, required:true, index:true, default:0},
		kill:{type:Number, required:true, default:0},
		joinType:{type:String, required:true, index:true, default:Consts.AllianceJoinType.All},
		level:{type:Number, required:true, default:0},
		exp:{type:Number, required:true, default:0},
		createTime:{type:Number, required:true, default:Date.now()}
	},
	notice:{type:String, required:false},
	desc:{type:String, required:false},
	titles:{
		archon:{type:String, required:true, default:"__archon"},
		general:{type:String, required:true, default:"__general"},
		quartermaster:{type:String, required:true, default:"__quartermaster"},
		supervisor:{type:String, required:true, default:"__supervisor"},
		elite:{type:String, required:true, default:"__elite"},
		member:{type:String, required:true, default:"__member"}
	},
	events:[
		{
			_id : false,
			category:{type:String, required:true},
			type:{type:String, required:true},
			time:{type:Number, required:true},
			key:{type:String, required:true},
			params:[String]
		}
	],
	members:[
		{
			_id : false,
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			power:{type:Number, required:true},
			kill:{type:Number, required:true},
			loyalty:{type:Number, reuqired:true},
			title:{type:String, required:true}
		}
	],
	joinRequestEvents:[
		{
			_id : false,
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			power:{type:Number, required:true},
			requestTime:{type:Number, required:true}
		}
	],
	helpEvents:[
		{
			_id : false,
			id:{type:String, required:true},
			name:{type:String, required:true},
			vipExp:{type:Number, required:true},
			helpEventType:{type:String, required:true},
			buildingName:{type:String, required:true},
			buildingLevel:{type:Number, required:true},
			eventId:{type:String, required:true},
			maxHelpCount:{type:Number, required:true},
			helpedMembers:[String]
		}
	]
})

module.exports = mongoose.model('alliance', allianceSchema)