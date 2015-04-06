"use strict"

/**
 * Created by modun on 14-7-22.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")
var GameDatas = require("../datas/GameDatas")

var Buildings = GameDatas.Buildings.buildings
var BuildingFunction = GameDatas.BuildingFunction
var ResourceInitData = GameDatas.PlayerInitData.resources[1]
var MaterialInitData = GameDatas.PlayerInitData.materials[1]
var SoldierMaterialInitData = GameDatas.PlayerInitData.soldierMaterials[1]
var DragonMaterialInitData = GameDatas.PlayerInitData.dragonMaterials[1]
var ProductionTechs = GameDatas.ProductionTechs.productionTechs
var Dragons = GameDatas.Dragons.dragons


var createBuildingSchema = function(location){
	var schema = {
		type:{type:String, required:true, default:Buildings[location].name},
		level:{
			type:Number,
			required:true,
			default:location <= 4 || location > 20 ? 1 : 0
		},
		location:{type:Number, required:true, default:location},
		houses:[{
			_id:false,
			type:{type:String, required:true},
			level:{type:Number, required:true},
			location:{type:Number, required:true}
		}]
	}
	return schema
}

var createDragonEquipmentSchema = function(){
	var schema = {
		name:{type:String, required:false, default:""},
		star:{type:Number, required:true, default:0},
		exp:{type:Number, required:true, default:0},
		buffs:[String]
	}
	return schema
}

var createDragonSkillSchema = function(skillName){
	var schema = {
		name:{type:String, required:true, default:skillName},
		level:{type:Number, required:true, default:0}
	}
	return schema
}

var createDragonSchema = function(dragonType){
	var schema = {
		type:{type:String, required:true, default:dragonType},
		level:{type:Number, required:true, default:0},
		exp:{type:Number, required:true, default:0},
		star:{type:Number, required:true, default:0},
		hp:{type:Number, required:true, default:0},
		hpRefreshTime:{type:Number, required:true, default:Date.now},
		status:{type:String, required:true, default:Consts.DragonStatus.Free},
		equipments:{
			crown:createDragonEquipmentSchema(),
			armguardLeft:createDragonEquipmentSchema(),
			armguardRight:createDragonEquipmentSchema(),
			chest:createDragonEquipmentSchema(),
			sting:createDragonEquipmentSchema(),
			orb:createDragonEquipmentSchema()
		},
		skills:{
			skill_1:createDragonSkillSchema(Dragons[dragonType].skill_1),
			skill_2:createDragonSkillSchema(Dragons[dragonType].skill_2),
			skill_3:createDragonSkillSchema(Dragons[dragonType].skill_3),
			skill_4:createDragonSkillSchema(Dragons[dragonType].skill_4),
			skill_5:createDragonSkillSchema(Dragons[dragonType].skill_5),
			skill_6:createDragonSkillSchema(Dragons[dragonType].skill_6),
			skill_7:createDragonSkillSchema(Dragons[dragonType].skill_7),
			skill_8:createDragonSkillSchema(Dragons[dragonType].skill_8),
			skill_9:createDragonSkillSchema(Dragons[dragonType].skill_9)
		}
	}
	return schema
}

var PlayerSchema = new Schema({
	_id:{type:String, required:true},
	serverId:{type:String, required:true},
	userId:{type:String, required:true},
	apnId:{type:String},
	selected:{type:Boolean, required:true},
	isActive:{type:Boolean, required:true, default:true},
	countInfo:{
		registerTime:{type:Number, required:true, default:Date.now},
		lastLoginTime:{type:Number, required:true, default:Date.now},
		loginCount:{type:Number, required:true, default:0},
		day60:{type:Number, required:true, default:1},
		day60RewardsCount:{type:Number, required:true, default:0},
		todayOnLineTime:{type:Number, required:true, default:0},
		todayOnLineTimeRewards:[Number],
		day14:{type:Number, required:true, default:1},
		day14RewardsCount:{type:Number, rquired:true, default:0},
		vipLoginDaysCount:{type:Number, required:true, default:1},
		levelupRewards:[Number],
		gemUsed:{type:Number, required:true, default:0},
		iapCount:{type:Number, required:true, default:0},
		todayFreeNormalGachaCount:{type:Number, required:true, default:0},
		isFirstIAPRewardsGeted:{type:Boolean, required:true, default:false}
	},
	basicInfo:{
		name:{type:String, required:true, unique:true, index:true},
		cityName:{type:String, required:true},
		icon:{type:String, required:true, default:"playerIcon_default.png"},
		levelExp:{type:Number, required:true, default:0},
		attackWin:{type:Number, required:true, default:0},
		strikeWin:{type:Number, required:true, default:0},
		kill:{type:Number, required:true, default:0},
		power:{type:Number, required:true, default:0},
		vipExp:{type:Number, required:true, default:0},
		language:{type:String, required:true, default:Consts.AllianceLanguage.Cn},
		buildQueue:{type:Number, required:true, default:1},
		recruitQueue:{type:Number, required:true, default:1},
		marchQueue:{type:Number, required:true, default:1},
		terrain:{type:String, required:true, default:Consts.AllianceTerrain.GrassLand}
	},
	resources:{
		refreshTime:{type:Number, required:true, default:Date.now},
		wood:{type:Number, required:true, default:ResourceInitData.wood},
		stone:{type:Number, required:true, default:ResourceInitData.stone},
		iron:{type:Number, required:true, default:ResourceInitData.iron},
		food:{type:Number, required:true, default:ResourceInitData.food},
		citizen:{type:Number, required:true, default:ResourceInitData.citizen},
		gem:{type:Number, required:true, default:ResourceInitData.gem},
		coin:{type:Number, required:true, default:ResourceInitData.coin},
		cart:{type:Number, required:true, default:ResourceInitData.cart},
		blood:{type:Number, required:true, default:ResourceInitData.blood},
		wallHp:{type:Number, required:true, default:BuildingFunction.wall[1].wallHp},
		stamina:{type:Number, required:true, default:ResourceInitData.stamina},
		casinoToken:{type:Number, required:true, default:ResourceInitData.casinoToken}
	},
	alliance:{
		type:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			tag:{type:String, required:true},
			title:{type:String, required:true},
			titleName:{type:String, required:true}
		},
		required:false
	},
	allianceInfo:{
		loyalty:{type:Number, reuqired:true, default:0},
		woodExp:{type:Number, required:true, default:0},
		stoneExp:{type:Number, required:true, default:0},
		ironExp:{type:Number, required:true, default:0},
		foodExp:{type:Number, required:true, default:0},
		coinExp:{type:Number, required:true, default:0}
	},
	vipEvents:[{
		_id:false,
		id:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	buildingMaterials:{
		blueprints:{type:Number, required:true, default:MaterialInitData.blueprints},
		tools:{type:Number, required:true, default:MaterialInitData.tools},
		tiles:{type:Number, required:true, default:MaterialInitData.tiles},
		pulley:{type:Number, required:true, default:MaterialInitData.pulley}
	},
	technologyMaterials:{
		trainingFigure:{type:Number, required:true, default:MaterialInitData.trainingFigure},
		bowTarget:{type:Number, required:true, default:MaterialInitData.bowTarget},
		saddle:{type:Number, required:true, default:MaterialInitData.saddle},
		ironPart:{type:Number, required:true, default:MaterialInitData.ironPart}
	},
	materialEvents:[{
		_id:false,
		id:{type:String, required:true},
		category:{type:String, required:true},
		materials:[{
			_id:false,
			type:{type:String, required:true},
			count:{type:Number, required:true}
		}],
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
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
	soldiers:{
		swordsman:{type:Number, required:true, default:0},
		sentinel:{type:Number, required:true, default:0},
		ranger:{type:Number, required:true, default:0},
		crossbowman:{type:Number, required:true, default:0},
		lancer:{type:Number, required:true, default:0},
		horseArcher:{type:Number, required:true, default:0},
		catapult:{type:Number, required:true, default:0},
		ballista:{type:Number, required:true, default:0},
		skeletonWarrior:{type:Number, required:true, default:0},
		skeletonArcher:{type:Number, required:true, default:0},
		deathKnight:{type:Number, required:true, default:0},
		meatWagon:{type:Number, required:true, default:0},
		priest:{type:Number, required:true, default:0},
		demonHunter:{type:Number, required:true, default:0},
		paladin:{type:Number, required:true, default:0},
		steamTank:{type:Number, required:true, default:0}
	},
	soldierEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		count:{type:Number, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	soldierStars:{
		swordsman:{type:Number, required:true, default:1},
		sentinel:{type:Number, required:true, default:1},
		ranger:{type:Number, required:true, default:1},
		crossbowman:{type:Number, required:true, default:1},
		lancer:{type:Number, required:true, default:1},
		horseArcher:{type:Number, required:true, default:1},
		catapult:{type:Number, required:true, default:1},
		ballista:{type:Number, required:true, default:1}
	},
	soldierStarEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	woundedSoldiers:{
		swordsman:{type:Number, required:true, default:0},
		sentinel:{type:Number, required:true, default:0},
		ranger:{type:Number, required:true, default:0},
		crossbowman:{type:Number, required:true, default:0},
		lancer:{type:Number, required:true, default:0},
		horseArcher:{type:Number, required:true, default:0},
		catapult:{type:Number, required:true, default:0},
		ballista:{type:Number, required:true, default:0}
	},
	treatSoldierEvents:[{
		_id:false,
		id:{type:String, required:true},
		soldiers:[{
			_id:false,
			name:{type:String, required:true},
			count:{type:Number, required:true}
		}],
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	dragonMaterials:{
		ingo_1:{type:Number, required:true, default:DragonMaterialInitData.ingo_1},
		ingo_2:{type:Number, required:true, default:DragonMaterialInitData.ingo_2},
		ingo_3:{type:Number, required:true, default:DragonMaterialInitData.ingo_3},
		ingo_4:{type:Number, required:true, default:DragonMaterialInitData.ingo_4},
		redSoul_2:{type:Number, required:true, default:DragonMaterialInitData.redSoul_2},
		redSoul_3:{type:Number, required:true, default:DragonMaterialInitData.redSoul_3},
		redSoul_4:{type:Number, required:true, default:DragonMaterialInitData.redSoul_4},
		blueSoul_2:{type:Number, required:true, default:DragonMaterialInitData.blueSoul_2},
		blueSoul_3:{type:Number, required:true, default:DragonMaterialInitData.blueSoul_3},
		blueSoul_4:{type:Number, required:true, default:DragonMaterialInitData.blueSoul_4},
		greenSoul_2:{type:Number, required:true, default:DragonMaterialInitData.greenSoul_2},
		greenSoul_3:{type:Number, required:true, default:DragonMaterialInitData.greenSoul_3},
		greenSoul_4:{type:Number, required:true, default:DragonMaterialInitData.greenSoul_4},
		redCrystal_1:{type:Number, required:true, default:DragonMaterialInitData.redCrystal_1},
		redCrystal_2:{type:Number, required:true, default:DragonMaterialInitData.redCrystal_2},
		redCrystal_3:{type:Number, required:true, default:DragonMaterialInitData.redCrystal_3},
		redCrystal_4:{type:Number, required:true, default:DragonMaterialInitData.redCrystal_4},
		blueCrystal_1:{type:Number, required:true, default:DragonMaterialInitData.blueCrystal_1},
		blueCrystal_2:{type:Number, required:true, default:DragonMaterialInitData.blueCrystal_2},
		blueCrystal_3:{type:Number, required:true, default:DragonMaterialInitData.blueCrystal_3},
		blueCrystal_4:{type:Number, required:true, default:DragonMaterialInitData.blueCrystal_4},
		greenCrystal_1:{type:Number, required:true, default:DragonMaterialInitData.greenCrystal_1},
		greenCrystal_2:{type:Number, required:true, default:DragonMaterialInitData.greenCrystal_2},
		greenCrystal_3:{type:Number, required:true, default:DragonMaterialInitData.greenCrystal_3},
		greenCrystal_4:{type:Number, required:true, default:DragonMaterialInitData.greenCrystal_4},
		runes_1:{type:Number, required:true, default:DragonMaterialInitData.runes_1},
		runes_2:{type:Number, required:true, default:DragonMaterialInitData.runes_2},
		runes_3:{type:Number, required:true, default:DragonMaterialInitData.runes_3},
		runes_4:{type:Number, required:true, default:DragonMaterialInitData.runes_4}
	},
	dragonEquipments:{
		redCrown_s1:{type:Number, required:true, default:0},
		blueCrown_s1:{type:Number, required:true, default:0},
		greenCrown_s1:{type:Number, required:true, default:0},
		redCrown_s2:{type:Number, required:true, default:0},
		blueCrown_s2:{type:Number, required:true, default:0},
		greenCrown_s2:{type:Number, required:true, default:0},
		redCrown_s3:{type:Number, required:true, default:0},
		blueCrown_s3:{type:Number, required:true, default:0},
		greenCrown_s3:{type:Number, required:true, default:0},
		redCrown_s4:{type:Number, required:true, default:0},
		blueCrown_s4:{type:Number, required:true, default:0},
		greenCrown_s4:{type:Number, required:true, default:0},
		redCrown_s5:{type:Number, required:true, default:0},
		blueCrown_s5:{type:Number, required:true, default:0},
		greenCrown_s5:{type:Number, required:true, default:0},
		redChest_s2:{type:Number, required:true, default:0},
		blueChest_s2:{type:Number, required:true, default:0},
		greenChest_s2:{type:Number, required:true, default:0},
		redChest_s3:{type:Number, required:true, default:0},
		blueChest_s3:{type:Number, required:true, default:0},
		greenChest_s3:{type:Number, required:true, default:0},
		redChest_s4:{type:Number, required:true, default:0},
		blueChest_s4:{type:Number, required:true, default:0},
		greenChest_s4:{type:Number, required:true, default:0},
		redChest_s5:{type:Number, required:true, default:0},
		blueChest_s5:{type:Number, required:true, default:0},
		greenChest_s5:{type:Number, required:true, default:0},
		redSting_s2:{type:Number, required:true, default:0},
		blueSting_s2:{type:Number, required:true, default:0},
		greenSting_s2:{type:Number, required:true, default:0},
		redSting_s3:{type:Number, required:true, default:0},
		blueSting_s3:{type:Number, required:true, default:0},
		greenSting_s3:{type:Number, required:true, default:0},
		redSting_s4:{type:Number, required:true, default:0},
		blueSting_s4:{type:Number, required:true, default:0},
		greenSting_s4:{type:Number, required:true, default:0},
		redSting_s5:{type:Number, required:true, default:0},
		blueSting_s5:{type:Number, required:true, default:0},
		greenSting_s5:{type:Number, required:true, default:0},
		redOrd_s2:{type:Number, required:true, default:0},
		blueOrd_s2:{type:Number, required:true, default:0},
		greenOrd_s2:{type:Number, required:true, default:0},
		redOrd_s3:{type:Number, required:true, default:0},
		blueOrd_s3:{type:Number, required:true, default:0},
		greenOrd_s3:{type:Number, required:true, default:0},
		redOrd_s4:{type:Number, required:true, default:0},
		blueOrd_s4:{type:Number, required:true, default:0},
		greenOrd_s4:{type:Number, required:true, default:0},
		redOrd_s5:{type:Number, required:true, default:0},
		blueOrd_s5:{type:Number, required:true, default:0},
		greenOrd_s5:{type:Number, required:true, default:0},
		redArmguard_s1:{type:Number, required:true, default:0},
		blueArmguard_s1:{type:Number, required:true, default:0},
		greenArmguard_s1:{type:Number, required:true, default:0},
		redArmguard_s2:{type:Number, required:true, default:0},
		blueArmguard_s2:{type:Number, required:true, default:0},
		greenArmguard_s2:{type:Number, required:true, default:0},
		redArmguard_s3:{type:Number, required:true, default:0},
		blueArmguard_s3:{type:Number, required:true, default:0},
		greenArmguard_s3:{type:Number, required:true, default:0},
		redArmguard_s4:{type:Number, required:true, default:0},
		blueArmguard_s4:{type:Number, required:true, default:0},
		greenArmguard_s4:{type:Number, required:true, default:0},
		redArmguard_s5:{type:Number, required:true, default:0},
		blueArmguard_s5:{type:Number, required:true, default:0},
		greenArmguard_s5:{type:Number, required:true, default:0}
	},
	dragonEquipmentEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	dragons:{
		redDragon:createDragonSchema("redDragon"),
		blueDragon:createDragonSchema("blueDragon"),
		greenDragon:createDragonSchema("greenDragon")
	},
	dragonHatchEvents:[{
		_id:false,
		id:{type:String, required:true},
		dragonType:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	dragonDeathEvents:[{
		_id:false,
		id:{type:String, required:true},
		dragonType:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
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
		location_16:createBuildingSchema(16),
		location_17:createBuildingSchema(17),
		location_18:createBuildingSchema(18),
		location_19:createBuildingSchema(19),
		location_20:createBuildingSchema(20),
		location_21:createBuildingSchema(21),
		location_22:createBuildingSchema(22)
	},
	buildingEvents:[{
		_id:false,
		id:{type:String, required:true},
		location:{type:Number, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	houseEvents:[{
		_id:false,
		id:{type:String, required:true},
		buildingLocation:{type:Number, required:true},
		houseLocation:{type:Number, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	productionTechs:{
		crane:{
			index:{type:Number, required:true, default:ProductionTechs.crane.index},
			level:{type:Number, required:true, default:0}
		},
		stoneCarving:{
			index:{type:Number, required:true, default:ProductionTechs.stoneCarving.index},
			level:{type:Number, required:true, default:0}
		},
		forestation:{
			index:{type:Number, required:true, default:ProductionTechs.forestation.index},
			level:{type:Number, required:true, default:0}
		},
		fastFix:{
			index:{type:Number, required:true, default:ProductionTechs.fastFix.index},
			level:{type:Number, required:true, default:0}
		},
		ironSmelting:{
			index:{type:Number, required:true, default:ProductionTechs.ironSmelting.index},
			level:{type:Number, required:true, default:0}
		},
		cropResearch:{
			index:{type:Number, required:true, default:ProductionTechs.cropResearch.index},
			level:{type:Number, required:true, default:0}
		},
		reinforcing:{
			index:{type:Number, required:true, default:ProductionTechs.reinforcing.index},
			level:{type:Number, required:true, default:0}
		},
		seniorTower:{
			index:{type:Number, required:true, default:ProductionTechs.seniorTower.index},
			level:{type:Number, required:true, default:0}
		},
		beerSupply:{
			index:{type:Number, required:true, default:ProductionTechs.beerSupply.index},
			level:{type:Number, required:true, default:0}
		},
		rescueTent:{
			index:{type:Number, required:true, default:ProductionTechs.rescueTent.index},
			level:{type:Number, required:true, default:0}
		},
		colonization:{
			index:{type:Number, required:true, default:ProductionTechs.colonization.index},
			level:{type:Number, required:true, default:0}
		},
		negotiation:{
			index:{type:Number, required:true, default:ProductionTechs.negotiation.index},
			level:{type:Number, required:true, default:0}
		},
		trap:{
			index:{type:Number, required:true, default:ProductionTechs.trap.index},
			level:{type:Number, required:true, default:0}
		},
		hideout:{
			index:{type:Number, required:true, default:ProductionTechs.hideout.index},
			level:{type:Number, required:true, default:0}
		},
		logistics:{
			index:{type:Number, required:true, default:ProductionTechs.logistics.index},
			level:{type:Number, required:true, default:0}
		},
		healingAgent:{
			index:{type:Number, required:true, default:ProductionTechs.healingAgent.index},
			level:{type:Number, required:true, default:0}
		},
		sketching:{
			index:{type:Number, required:true, default:ProductionTechs.sketching.index},
			level:{type:Number, required:true, default:0}
		},
		mintedCoin:{
			index:{type:Number, required:true, default:ProductionTechs.mintedCoin.index},
			level:{type:Number, required:true, default:0}
		}
	},
	productionTechEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	militaryTechs:{
		infantry_infantry:{
			building:{type:String, required:true, default:"trainingGround"},
			level:{type:Number, required:true, default:0}
		},
		infantry_archer:{
			building:{type:String, required:true, default:"trainingGround"},
			level:{type:Number, required:true, default:0}
		},
		infantry_cavalry:{
			building:{type:String, required:true, default:"trainingGround"},
			level:{type:Number, required:true, default:0}
		},
		infantry_siege:{
			building:{type:String, required:true, default:"trainingGround"},
			level:{type:Number, required:true, default:0}
		},
		infantry_hpAdd:{
			building:{type:String, required:true, default:"trainingGround"},
			level:{type:Number, required:true, default:0}
		},
		archer_infantry:{
			building:{type:String, required:true, default:"hunterHall"},
			level:{type:Number, required:true, default:0}
		},
		archer_archer:{
			building:{type:String, required:true, default:"hunterHall"},
			level:{type:Number, required:true, default:0}
		},
		archer_cavalry:{
			building:{type:String, required:true, default:"hunterHall"},
			level:{type:Number, required:true, default:0}
		},
		archer_siege:{
			building:{type:String, required:true, default:"hunterHall"},
			level:{type:Number, required:true, default:0}
		},
		archer_hpAdd:{
			building:{type:String, required:true, default:"hunterHall"},
			level:{type:Number, required:true, default:0}
		},
		cavalry_infantry:{
			building:{type:String, required:true, default:"stable"},
			level:{type:Number, required:true, default:0}
		},
		cavalry_archer:{
			building:{type:String, required:true, default:"stable"},
			level:{type:Number, required:true, default:0}
		},
		cavalry_cavalry:{
			building:{type:String, required:true, default:"stable"},
			level:{type:Number, required:true, default:0}
		},
		cavalry_siege:{
			building:{type:String, required:true, default:"stable"},
			level:{type:Number, required:true, default:0}
		},
		cavalry_hpAdd:{
			building:{type:String, required:true, default:"stable"},
			level:{type:Number, required:true, default:0}
		},
		siege_infantry:{
			building:{type:String, required:true, default:"workshop"},
			level:{type:Number, required:true, default:0}
		},
		siege_archer:{
			building:{type:String, required:true, default:"workshop"},
			level:{type:Number, required:true, default:0}
		},
		siege_cavalry:{
			building:{type:String, required:true, default:"workshop"},
			level:{type:Number, required:true, default:0}
		},
		siege_siege:{
			building:{type:String, required:true, default:"workshop"},
			level:{type:Number, required:true, default:0}
		},
		siege_hpAdd:{
			building:{type:String, required:true, default:"workshop"},
			level:{type:Number, required:true, default:0}
		}
	},
	militaryTechEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	requestToAllianceEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		tag:{type:String, required:true},
		flag:{type:String, required:true},
		level:{type:Number, required:true},
		members:{type:Number, required:true},
		power:{type:Number, required:true},
		language:{type:String, required:true},
		kill:{type:String, required:true},
		requestTime:{type:Number, required:true}
	}],
	inviteToAllianceEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		tag:{type:String, required:true},
		flag:{type:String, required:true},
		terrain:{type:String, required:true},
		level:{type:Number, required:true},
		members:{type:Number, required:true},
		power:{type:Number, required:true},
		language:{type:String, required:true},
		kill:{type:String, required:true},
		inviterId:{type:String, reuqired:true},
		inviteTime:{type:Number, required:true}
	}],
	mails:[{
		_id:false,
		id:{type:String, required:true},
		title:{type:String, required:true},
		fromId:{type:String, required:true},
		fromAllianceTag:{type:String},
		fromName:{type:String, required:true},
		content:{type:String, required:true},
		sendTime:{type:Number, required:true},
		isRead:{type:Boolean, require:true},
		isSaved:{type:Boolean, require:true}
	}],
	sendMails:[{
		_id:false,
		id:{type:String, required:true},
		title:{type:String, required:true},
		fromName:{type:String, required:true},
		fromAllianceTag:{type:String},
		toId:{type:String, required:true},
		toName:{type:String, required:true},
		content:{type:String, required:true},
		sendTime:{type:Number, required:true}
	}],
	reports:[{
		_id:false,
		id:{type:String, required:true},
		type:{type:String, required:true},
		createTime:{type:String, required:true},
		isRead:{type:Boolean, require:true},
		isSaved:{type:Boolean, require:true},
		strikeCity:{
			type:{
				level:{type:Number, required:true},
				strikeTarget:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					cityName:{type:String, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					terrain:{type:String, required:true},
					fogOfTrick:{type:Boolean, required:true}
				},
				attackPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				},
				helpDefencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						equipments:[{
							type:{type:String, required:true},
							name:{type:String, required:true},
							star:{type:String, required:true}
						}],
						skills:[{
							_id:false,
							name:{type:String, required:true},
							level:{type:String, required:true}
						}]
					},
					soldiers:[{
						_id:false,
						name:{type:String, required:true},
						star:{type:Number, required:true},
						count:{type:Number, required:true}
					}]
				},
				defencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						equipments:[{
							type:{type:String, required:true},
							name:{type:String, required:true},
							star:{type:String, required:true}
						}],
						skills:[{
							_id:false,
							name:{type:String, required:true},
							level:{type:String, required:true}
						}]
					},
					soldiers:[{
						_id:false,
						name:{type:String, required:true},
						star:{type:Number, required:true},
						count:{type:Number, required:true}
					}],
					resources:{
						wood:{type:Number, required:true},
						stone:{type:Number, required:true},
						iron:{type:Number, required:true},
						food:{type:Number, required:true},
						wallHp:{type:Number, requird:true}
					}
				}
			},
			required:false
		},
		cityBeStriked:{
			type:{
				level:{type:Number, required:true},
				strikeTarget:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					cityName:{type:String, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					terrain:{type:String, required:true}
				},
				attackPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						equipments:[{
							type:{type:String, required:true},
							name:{type:String, required:true},
							star:{type:String, required:true}
						}]
					}
				},
				helpDefencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				},
				defencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				}
			},
			required:false
		},
		strikeVillage:{
			type:{
				level:{type:Number, required:true},
				strikeTarget:{
					name:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					terrain:{type:String, required:true}
				},
				attackPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				},
				defencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						equipments:[{
							type:{type:String, required:true},
							name:{type:String, required:true},
							star:{type:String, required:true}
						}],
						skills:[{
							_id:false,
							name:{type:String, required:true},
							level:{type:String, required:true}
						}]
					},
					soldiers:[{
						_id:false,
						name:{type:String, required:true},
						star:{type:Number, required:true},
						count:{type:Number, required:true}
					}]
				}
			},
			required:false
		},
		villageBeStriked:{
			type:{
				level:{type:Number, required:true},
				strikeTarget:{
					name:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					terrain:{type:String, required:true}
				},
				attackPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						equipments:[{
							type:{type:String, required:true},
							name:{type:String, required:true},
							star:{type:String, required:true}
						}]
					}
				},
				defencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				}
			},
			required:false
		},
		attackCity:{
			type:{
				isRenamed:{type:Boolean, required:true},
				attackTarget:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					cityName:{type:String, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					terrain:{type:String, required:true}
				},
				attackPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					fightWithHelpDefenceTroop:{
						dragon:{
							type:{type:String, required:true},
							level:{type:Number, required:true},
							expAdd:{type:Number, required:true},
							hp:{type:Number, required:true},
							hpDecreased:{type:Number, required:true}
						},
						soldiers:[{
							_id:false,
							name:{type:String, required:true},
							star:{type:Number, required:true},
							count:{type:Number, required:true},
							countDecreased:{type:Number, required:true}
						}]
					},
					fightWithDefenceTroop:{
						dragon:{
							type:{type:String, required:true},
							level:{type:Number, required:true},
							expAdd:{type:Number, required:true},
							hp:{type:Number, required:true},
							hpDecreased:{type:Number, required:true}
						},
						soldiers:[{
							_id:false,
							name:{type:String, required:true},
							star:{type:Number, required:true},
							count:{type:Number, required:true},
							countDecreased:{type:Number, required:true}
						}]
					},
					fightWithDefenceWall:{
						soldiers:[{
							_id:false,
							name:{type:String, required:true},
							star:{type:Number, required:true},
							count:{type:Number, required:true},
							countDecreased:{type:Number, required:true}
						}]
					},
					rewards:[{
						_id:false,
						type:{type:String, required:true},
						name:{type:String, required:true},
						count:{type:Number, required:true}
					}]
				},
				helpDefencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						expAdd:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					},
					soldiers:[{
						_id:false,
						name:{type:String, required:true},
						star:{type:Number, required:true},
						count:{type:Number, required:true},
						countDecreased:{type:Number, required:true}
					}],
					rewards:[{
						_id:false,
						type:{type:String, required:true},
						name:{type:String, required:true},
						count:{type:Number, required:true}
					}]
				},
				defencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						expAdd:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					},
					soldiers:[{
						_id:false,
						name:{type:String, required:true},
						star:{type:Number, required:true},
						count:{type:Number, required:true},
						countDecreased:{type:Number, required:true}
					}],
					wall:{
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					},
					rewards:[{
						_id:false,
						type:{type:String, required:true},
						name:{type:String, required:true},
						count:{type:Number, required:true}
					}]
				},
				fightWithHelpDefencePlayerReports:{
					attackPlayerDragonFightData:{
						type:{type:String, required:true},
						hpMax:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					},
					defencePlayerDragonFightData:{
						type:{type:String, required:true},
						hpMax:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					},
					attackPlayerSoldierRoundDatas:[{
						_id:false,
						soldierName:{type:String, required:true},
						soldierStar:{type:Number, required:true},
						soldierCount:{type:Number, required:true},
						soldierDamagedCount:{type:Number, required:true},
						soldierWoundedCount:{type:Number, required:true},
						morale:{type:Number, required:true},
						moraleDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}],
					defencePlayerSoldierRoundDatas:[{
						_id:false,
						soldierName:{type:String, required:true},
						soldierStar:{type:Number, required:true},
						soldierCount:{type:Number, required:true},
						soldierDamagedCount:{type:Number, required:true},
						soldierWoundedCount:{type:Number, required:true},
						morale:{type:Number, required:true},
						moraleDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}]
				},
				fightWithDefencePlayerReports:{
					attackPlayerDragonFightData:{
						type:{type:String, required:true},
						hpMax:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					},
					defencePlayerDragonFightData:{
						type:{type:String, required:true},
						hpMax:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					},
					attackPlayerSoldierRoundDatas:[{
						_id:false,
						soldierName:{type:String, required:true},
						soldierStar:{type:Number, required:true},
						soldierCount:{type:Number, required:true},
						soldierDamagedCount:{type:Number, required:true},
						soldierWoundedCount:{type:Number, required:true},
						morale:{type:Number, required:true},
						moraleDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}],
					defencePlayerSoldierRoundDatas:[{
						_id:false,
						soldierName:{type:String, required:true},
						soldierStar:{type:Number, required:true},
						soldierCount:{type:Number, required:true},
						soldierDamagedCount:{type:Number, required:true},
						soldierWoundedCount:{type:Number, required:true},
						morale:{type:Number, required:true},
						moraleDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}],
					attackPlayerWallRoundDatas:[{
						_id:false,
						soldierName:{type:String, required:true},
						soldierStar:{type:Number, required:true},
						soldierCount:{type:Number, required:true},
						soldierDamagedCount:{type:Number, required:true},
						soldierWoundedCount:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}],
					defencePlayerWallRoundDatas:[{
						_id:false,
						wallMaxHp:{type:Number, required:true},
						wallHp:{type:Number, required:true},
						wallDamagedHp:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}]
				}
			},
			required:false
		},
		attackVillage:{
			type:{
				attackTarget:{
					name:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					terrain:{type:String, required:true}
				},
				attackPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						expAdd:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					},
					soldiers:[{
						_id:false,
						name:{type:String, required:true},
						star:{type:Number, required:true},
						count:{type:Number, required:true},
						countDecreased:{type:Number, required:true}
					}],
					rewards:[{
						_id:false,
						type:{type:String, required:true},
						name:{type:String, required:true},
						count:{type:Number, required:true}
					}]
				},
				defencePlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					icon:{type:String, required:true},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						expAdd:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					},
					soldiers:[{
						_id:false,
						name:{type:String, required:true},
						star:{type:Number, required:true},
						count:{type:Number, required:true},
						countDecreased:{type:Number, required:true}
					}],
					rewards:[{
						_id:false,
						type:{type:String, required:true},
						name:{type:String, required:true},
						count:{type:Number, required:true}
					}]
				},
				fightWithDefencePlayerReports:{
					attackPlayerDragonFightData:{
						type:{type:String, required:true},
						hpMax:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					},
					defencePlayerDragonFightData:{
						type:{type:String, required:true},
						hpMax:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					},
					attackPlayerSoldierRoundDatas:[{
						_id:false,
						soldierName:{type:String, required:true},
						soldierStar:{type:Number, required:true},
						soldierCount:{type:Number, required:true},
						soldierDamagedCount:{type:Number, required:true},
						soldierWoundedCount:{type:Number, required:true},
						morale:{type:Number, required:true},
						moraleDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}],
					defencePlayerSoldierRoundDatas:[{
						_id:false,
						soldierName:{type:String, required:true},
						soldierStar:{type:Number, required:true},
						soldierCount:{type:Number, required:true},
						soldierDamagedCount:{type:Number, required:true},
						soldierWoundedCount:{type:Number, required:true},
						morale:{type:Number, required:true},
						moraleDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}]
				}
			},
			required:false
		},
		collectResource:{
			type:{
				collectTarget:{
					name:{type:String, required:true},
					level:{type:Number, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					alliance:{
						id:{type:String, required:true},
						name:{type:String, required:true},
						tag:{type:String, required:true}
					}
				},
				rewards:[{
					_id:false,
					type:{type:String, required:true},
					name:{type:String, required:true},
					count:{type:Number, required:true}
				}]
			},
			required:false
		}
	}],
	helpToTroops:[{
		_id:false,
		playerDragon:{type:String, required:true},
		beHelpedPlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			}
		}
	}],
	helpedByTroops:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		level:{type:Number, required:true},
		cityName:{type:String, required:true},
		dragon:{
			type:{type:String, required:true}
		},
		soldiers:[{
			_id:false,
			name:{type:String, required:true},
			count:{type:Number, required:true}
		}],
		rewards:[{
			_id:false,
			type:{type:String, required:true},
			name:{type:String, required:true},
			count:{type:Number, required:true}
		}]
	}],
	dailyQuests:{
		refreshTime:{type:Number, required:true, default:0},
		quests:[{
			_id:false,
			id:{type:String, required:true},
			index:{type:Number, required:true},
			star:{type:Number, required:true}
		}]
	},
	dailyQuestEvents:[{
		_id:false,
		id:{type:String, required:true},
		index:{type:Number, required:true},
		star:{type:Number, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	deals:[{
		_id:false,
		id:{type:String, required:true},
		isSold:{type:Boolean, required:true},
		itemData:{
			type:{type:String, required:true},
			name:{type:String, required:true},
			count:{type:String, required:true},
			price:{type:Number, required:true}
		}
	}],
	items:[{
		_id:false,
		name:{type:String, required:true},
		count:{type:Number, required:true}
	}],
	itemEvents:[{
		_id:false,
		id:{type:String, required:true},
		type:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	pve:{
		totalStep:{type:Number, default:0},
		location:{
			x:{type:Number, required:true, default:12},
			y:{type:Number, required:true, default:12},
			z:{type:Number, required:true, default:1}
		},
		floors:[{
			_id:false,
			level:{type:Number, required:true},
			fogs:{type:String, required:true},
			objects:{type:String, required:true}
		}]
	},
	dailyTasks:{
		rewarded:[],
		empireRise:[],
		conqueror:[],
		brotherClub:[],
		growUp:[]
	},
	growUpTasks:{
		cityBuild:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			name:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		dragonLevel:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			type:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		dragonStar:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			type:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		dragonSkill:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			type:{type:String, required:true},
			name:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		productionTech:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			name:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		militaryTech:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			name:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		soldierStar:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			name:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		soldierCount:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			name:{type:String, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		pveCount:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		attackWin:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		strikeWin:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		playerKill:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			rewarded:{type:Boolean, required:true}
		}],
		playerPower:[{
			_id:false,
			id:{type:Number, required:true},
			index:{type:Number, required:true},
			rewarded:{type:Boolean, required:true}
		}]
	},
	iapGifts:[{
		_id:false,
		id:{type:String, required:true},
		from:{type:String, required:true},
		name:{type:String, required:true},
		count:{type:String, required:true},
		time:{type:Number, required:true}
	}]
})

module.exports = mongoose.model('player', PlayerSchema)