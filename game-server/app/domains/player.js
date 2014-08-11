/**
 * Created by modun on 14-7-22.
 */
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var GameDatas = require("../datas/GameDatas")

var BuildingInitData = GameDatas.Buildings.buildings
var ResourceInitData = GameDatas.PlayerInitData.resources[1]
var MaterialInitData = GameDatas.PlayerInitData.materials[1]

var playerSchema = new Schema({
	basicInfo:{
		deviceId:{type:String, index:true, unique:true, required:true},
		registerTime:{type:Number, required:true, default:Date.now()},
		lastLoginTime:{type:Number, required:true, default:Date.now()},
		loginCount:{type:Number, required:true, default:0},
		name:{type:String, index:true, unique:true, required:true},
		icon:{type:String, required:true, default:"playerIcon_default.png"},
		level:{type:Number, required:true, default:1},
		levelExp:{type:Number, required:true, default:0},
		power:{type:Number, required:true, default:0},
		vip:{type:Number, required:true, default:1},
		vipExp:{type:Number, required:true, default:0},
		gem:{type:Number, required:true, default:ResourceInitData.gem}
	},
	resources:{
		wood:{type:Number, required:true, default:ResourceInitData.wood},
		stone:{type:Number, required:true, default:ResourceInitData.stone},
		iron:{type:Number, required:true, default:ResourceInitData.iron},
		food:{type:Number, required:true, default:ResourceInitData.food},
		citizen:{type:Number, required:true, default:ResourceInitData.citizen},
		coin:{type:Number, required:true, default:ResourceInitData.coin}
	},
	materials:{
		blueprints:{type:Number, required:true, default:MaterialInitData.blueprints},
		tools:{type:Number, required:true, default:MaterialInitData.tools},
		tiles:{type:Number, required:true, default:MaterialInitData.tiles},
		pulley:{type:Number, required:true, default:MaterialInitData.pulley}
	},
	buildings:{
		location_1:{
			type:{type:String, required:true, default:BuildingInitData[1].name},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:1},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_2:{
			type:{type:String, required:true, default:BuildingInitData[2].name},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:1},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_3:{
			type:{type:String, required:true, default:BuildingInitData[3].name},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:3},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_4:{
			type:{type:String, required:true, default:BuildingInitData[4].name},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:4},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_5:{
			type:{type:String, required:true, default:BuildingInitData[5].name},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:5},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_6:{
			type:{type:String, required:true, default:BuildingInitData[6].name},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:6},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_7:{
			type:{type:String, required:true, default:BuildingInitData[7].name},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:7},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_8:{
			type:{type:String, required:true, default:BuildingInitData[8].name},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:8},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_9:{
			type:{type:String, required:true, default:BuildingInitData[9].name},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:9},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_10:{
			type:{type:String, required:true, default:BuildingInitData[10].name},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:10},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_11:{
			type:{type:String, required:true, default:BuildingInitData[11].name},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:11},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_12:{
			type:{type:String, required:true, default:BuildingInitData[12].name},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:12},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_13:{
			type:{type:String, required:true, default:BuildingInitData[13].name},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:13},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_14:{
			type:{type:String, required:true, default:BuildingInitData[14].name},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:14},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_15:{
			type:{type:String, required:true, default:BuildingInitData[15].name},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:15},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		},
		location_16:{
			type:{type:String, required:true, default:BuildingInitData[16].name},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:16},
			finishTime:{type:Number, required:true, default:0},
			houses:[
				{
					type:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					size:{
						width:{type:Number, required:true},
						height:{type:Number, required:true}
					},
					finishTime:{type:Number, required:true}
				}
			]
		}
	}
})

module.exports = mongoose.model('player', playerSchema)