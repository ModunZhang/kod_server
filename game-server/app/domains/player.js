"use strict"

/**
 * Created by modun on 14-7-22.
 */
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var GameDatas = require("../datas/GameDatas")

var BuildingInitData = GameDatas.Buildings.buildings
var ResourceInitData = GameDatas.PlayerInitData.resources[1]
var MaterialInitData = GameDatas.PlayerInitData.materials[1]
var SoldierMaterialInitData = GameDatas.PlayerInitData.soldierMaterials[1]

var createBuildingSchema = function(location){
	var schema = {
		type:{type:String, required:true, default:BuildingInitData[location].type},
		level:{type:Number, required:true, default:location <= 4 ? 1 : location > 4 && location <= 9 ? 0 : -1 },
		location:{type:Number, required:true, default:location},
		houses:[
			{
				type:{type:String, required:true},
				level:{type:Number, required:true},
				location:{type:Number, required:true}
			}
		]
	}
	return schema
}

var createTowerSchema = function(location){
	var schema = {
		level:{type:Number, required:true, default:location <= 5 ? 1 : -1 },
		location:{type:Number, required:true, default:location}
	}
	return schema
}

var playerSchema = new Schema({
	countInfo:{
		deviceId:{type:String, index:true, unique:true, required:true},
		logicServerId:{type:String, index:true, required:true},
		registerTime:{type:Number, required:true, default:Date.now()},
		lastLoginTime:{type:Number, required:true, default:Date.now()},
		loginCount:{type:Number, required:true, default:0}
	},
	basicInfo:{
		name:{type:String, index:true, unique:true, required:true},
		cityName:{type:String, required:true},
		icon:{type:String, required:true, default:"playerIcon_default.png"},
		level:{type:Number, required:true, default:1},
		levelExp:{type:Number, required:true, default:0},
		power:{type:Number, required:true, default:0},
		vip:{type:Number, required:true, default:1},
		vipExp:{type:Number, required:true, default:0},
		resourceRefreshTime:{type:Number, required:true, default:Date.now()}
	},
	resources:{
		wood:{type:Number, required:true, default:ResourceInitData.wood},
		stone:{type:Number, required:true, default:ResourceInitData.stone},
		iron:{type:Number, required:true, default:ResourceInitData.iron},
		food:{type:Number, required:true, default:ResourceInitData.food},
		citizen:{type:Number, required:true, default:ResourceInitData.citizen},
		gem:{type:Number, required:true, default:ResourceInitData.gem},
		coin:{type:Number, required:true, default:ResourceInitData.coin},
		cart:{type:Number, required:true, default:ResourceInitData.cart}
	},
	materials:{
		blueprints:{type:Number, required:true, default:MaterialInitData.blueprints},
		tools:{type:Number, required:true, default:MaterialInitData.tools},
		tiles:{type:Number, required:true, default:MaterialInitData.tiles},
		pulley:{type:Number, required:true, default:MaterialInitData.pulley},
		trainingFigure:{type:Number, required:true, default:MaterialInitData.trainingFigure},
		bowTarget:{type:Number, required:true, default:MaterialInitData.bowTarget},
		saddle:{type:Number, required:true, default:MaterialInitData.saddle},
		ironPart:{type:Number, required:true, default:MaterialInitData.ironPart}
	},
	materialEvents:[
		{
			category:{type:String, required:true},
			materials:[
				{
					type:{type:String, required:true},
					count:{type:Number, required:true}
				}
			],
			finishTime:{type:Number, required:true}
		}
	],
	dragonMaterials:{

	},
	soldierMaterials:{
		deathHand:{type:Number, required:true, default:SoldierMaterialInitData.deathHand},
		heroBones:{type:Number, required:true, default:SoldierMaterialInitData.heroBones},
		soulStone:{type:Number, required:true, default:SoldierMaterialInitData.soulStone},
		magicBox:{type:Number, required:true, default:SoldierMaterialInitData.magicBox},
		confessionHood:{type:Number, required:true, default:SoldierMaterialInitData.confessionHood},
		brightRing:{type:Number, required:true, default:SoldierMaterialInitData.brightRing},
		holyBook:{type:Number, required:true, default:SoldierMaterialInitData.holyBook},
		brightAlloy:{type:Number, required:true, default:SoldierMaterialInitData.brightAlloy}
	},
	soldiers:[
		{
			name:{type:String, required:true},
			count:{type:Number, required:true},
		}
	],
	soldierEvents:[
		{
			name:{type:String, required:true},
			count:{type:Number, required:true},
			finishTime:{type:Number, required:true}
		}
	],
	buildings:{
		location_1:createBuildingSchema(1),
		location_2:createBuildingSchema(2),
		location_3:createBuildingSchema(3),
		location_4:createBuildingSchema(4),
		location_5:createBuildingSchema(5),
		location_6:createBuildingSchema(6),
		location_7:createBuildingSchema(7),
		location_8:createBuildingSchema(8),
		location_9:createBuildingSchema(9),
		location_10:createBuildingSchema(10),
		location_11:createBuildingSchema(11),
		location_12:createBuildingSchema(12),
		location_13:createBuildingSchema(13),
		location_14:createBuildingSchema(14),
		location_15:createBuildingSchema(15),
		location_16:createBuildingSchema(16)
	},
	buildingEvents:[
		{
			location:{type:Number, required:true},
			finishTime:{type:Number, required:true}
		}
	],
	houseEvents:[
		{
			buildingLocation:{type:Number, required:true},
			houseLocation:{type:Number, required:true},
			finishTime:{type:Number, required:true}
		}
	],
	towers:{
		location_1:createTowerSchema(1),
		location_2:createTowerSchema(2),
		location_3:createTowerSchema(3),
		location_4:createTowerSchema(4),
		location_5:createTowerSchema(5),
		location_6:createTowerSchema(6),
		location_7:createTowerSchema(7),
		location_8:createTowerSchema(8),
		location_9:createTowerSchema(9),
		location_10:createTowerSchema(10),
		location_11:createTowerSchema(11)
	},
	towerEvents:[
		{
			location:{type:Number, required:true},
			finishTime:{type:Number, required:true}
		}
	],
	wall:{
		level:{type:Number, required:true, default:1}
	},
	wallEvents:[
		{
			finishTime:{type:Number, required:true}
		}
	]
})

module.exports = mongoose.model('player', playerSchema)