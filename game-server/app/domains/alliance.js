"use strict"

/**
 * Created by modun on 14-7-22.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")

var createBuildingSchema = function(name, x, y){
	var schema = {
		name:{type:String, required:true, default:name},
		level:{type:Number, required:true, default:1},
		location:{
			x:{type:Number, required:true, default:x},
			y:{type:Number, required:true, default:y}
		}
	}
	return schema
}

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
		honour:{type:Number, required:true, default:0},
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
	events:[{
		_id:false,
		category:{type:String, required:true},
		type:{type:String, required:true},
		time:{type:Number, required:true},
		key:{type:String, required:true},
		params:[String]
	}],
	members:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		icon:{type:String, required:true},
		level:{type:Number, required:true},
		power:{type:Number, required:true},
		kill:{type:Number, required:true},
		loyalty:{type:Number, reuqired:true},
		lastLoginTime:{type:Number, required:true},
		title:{type:String, required:true},
		donateStatus:{
			wood:{type:Number, required:true},
			stone:{type:Number, required:true},
			iron:{type:Number, required:true},
			food:{type:Number, required:true},
			coin:{type:Number, required:true},
			gem:{type:Number, required:true}
		},
		allianceExp:{
			woodExp:{type:Number, required:true},
			stoneExp:{type:Number, required:true},
			ironExp:{type:Number, required:true},
			foodExp:{type:Number, required:true},
			coinExp:{type:Number, required:true}
		},
		location:{
			x:{type:Number, required:true},
			y:{type:Number, required:true}
		}
	}],
	buildings:{
		palace:createBuildingSchema("palace", 10, 10),
		gate:createBuildingSchema("gate", 10, 13),
		hall:createBuildingSchema("hall", 7, 10),
		shrine:createBuildingSchema("shrine", 10, 7),
		shop:createBuildingSchema("shop", 13, 10)
	},
	villageLevels:{
		woodVillage:{type:Number, required:true, default:1},
		stoneVillage:{type:Number, required:true, default:1},
		ironVillage:{type:Number, required:true, default:1},
		foodVillage:{type:Number, required:true, default:1},
		coinVillage:{type:Number, required:true, default:1}
	},
	villages:[{
		_id:false,
		id:{type:String, required:true},
		type:{type:String, required:true},
		soldiers:[
			{
				_id:false,
				type:{type:String, required:true},
				level:{type:Number, required:true},
				count:{type:String, required:true}
			}
		],
		location:{
			x:{type:Number, required:true},
			y:{type:Number, required:true}
		}
	}],
	mapObjects:[{
		_id:false,
		type:{type:String, required:true},
		location:{
			x:{type:Number, required:true},
			y:{type:Number, required:true}
		}
	}],
	joinRequestEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		icon:{type:String, required:true},
		level:{type:Number, required:true},
		power:{type:Number, required:true},
		requestTime:{type:Number, required:true}
	}],
	helpEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		vipExp:{type:Number, required:true},
		helpEventType:{type:String, required:true},
		buildingName:{type:String, required:true},
		buildingLevel:{type:Number, required:true},
		eventId:{type:String, required:true},
		maxHelpCount:{type:Number, required:true},
		helpedMembers:[String]
	}],
	spyVillageEvents:[{
		_id:false,
		id:{type:String, required:true},
		fromId:{type:String, required:true},
		fromName:{type:String, required:true},
		fromLocation:{
			x:{type:Number, required:true},
			y:{type:Number, required:true}
		},
		dragion:{
			type:{type:String, required:true},
			strength:{type:Number, required:true},
			vitality:{type:Number, required:true}
		},
		targetType:{type:String, required:true},
		targetId:{type:String, required:true},
		targetLocation:{
			x:{type:Number, required:true},
			y:{type:Number, required:true}
		},
		finishTime:{type:Number, required:true}
	}]
})

module.exports = mongoose.model('alliance', allianceSchema)