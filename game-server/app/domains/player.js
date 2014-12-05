"use strict"

/**
 * Created by modun on 14-7-22.
 */

var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")
var GameDatas = require("../datas/GameDatas")

var BuildingInitData = GameDatas.Buildings.buildings
var BuildingFunction = GameDatas.BuildingFunction
var ResourceInitData = GameDatas.PlayerInitData.resources[1]
var MaterialInitData = GameDatas.PlayerInitData.materials[1]
var SoldierMaterialInitData = GameDatas.PlayerInitData.soldierMaterials[1]
var DragonMaterialInitData = GameDatas.PlayerInitData.dragonMaterials[1]
var DragonsConfig = GameDatas.DragonEyrie.dragons

var createBuildingSchema = function(location){
	var schema = {
		type:{type:String, required:true, default:BuildingInitData[location].type},
		level:{type:Number, required:true, default:location <= 4 ? 1 : location > 4 && location <= 9 ? 0 : -1},
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

var createTowerSchema = function(location){
	var schema = {
		level:{type:Number, required:true, default:location <= 5 ? 1 : -1},
		location:{type:Number, required:true, default:location}
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
		strength:{type:Number, required:true, default:0},
		hp:{type:Number, required:true, default:0},
		hpRefreshTime:{type:Number, required:true, default:Date.now()},
		vitality:{type:Number, required:true, default:0},//在龙蛋时期,此属性表示龙蛋孵化的进度,达到100时,龙蛋孵化出来,龙蛋孵化出来后,此属性会被清零
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
			skill_1:createDragonSkillSchema(DragonsConfig[dragonType].skill_1),
			skill_2:createDragonSkillSchema(DragonsConfig[dragonType].skill_2),
			skill_3:createDragonSkillSchema(DragonsConfig[dragonType].skill_3),
			skill_4:createDragonSkillSchema(DragonsConfig[dragonType].skill_4),
			skill_5:createDragonSkillSchema(DragonsConfig[dragonType].skill_5),
			skill_6:createDragonSkillSchema(DragonsConfig[dragonType].skill_6),
			skill_7:createDragonSkillSchema(DragonsConfig[dragonType].skill_7),
			skill_8:createDragonSkillSchema(DragonsConfig[dragonType].skill_8),
			skill_9:createDragonSkillSchema(DragonsConfig[dragonType].skill_9)
		}
	}
	return schema
}

var playerSchema = new Schema({
	_id:{type:String, required:true, unique:true, default:ShortId.generate},
	countInfo:{
		deviceId:{type:String, required:true, index:true, unique:true},
		registerTime:{type:Number, required:true, default:Date.now()},
		lastLoginTime:{type:Number, required:true, default:Date.now()},
		loginCount:{type:Number, required:true, default:0},
		gemUsed:{type:Number, required:true, default:0}
	},
	basicInfo:{
		name:{type:String, required:true, unique:true},
		cityName:{type:String, required:true},
		icon:{type:String, required:true, default:"playerIcon_default.png"},
		level:{type:Number, required:true, default:1},
		levelExp:{type:Number, required:true, default:0},
		power:{type:Number, required:true, default:0},
		kill:{type:Number, required:true, default:0},
		vipExp:{type:Number, required:true, default:0},
		vipFinishTime:{type:Number, required:true, default:0},
		resourceRefreshTime:{type:Number, required:true, default:Date.now()},
		language:{type:String, required:true, default:Consts.AllianceLanguage.Cn},
		buildQueue:{type:Number, required:true, default:5}
	},
	resources:{
		wood:{type:Number, required:true, default:ResourceInitData.wood},
		stone:{type:Number, required:true, default:ResourceInitData.stone},
		iron:{type:Number, required:true, default:ResourceInitData.iron},
		food:{type:Number, required:true, default:ResourceInitData.food},
		citizen:{type:Number, required:true, default:ResourceInitData.citizen},
		gem:{type:Number, required:true, default:ResourceInitData.gem},
		coin:{type:Number, required:true, default:ResourceInitData.coin},
		cart:{type:Number, required:true, default:ResourceInitData.cart},
		energy:{type:Number, required:true, default:ResourceInitData.energy},
		blood:{type:Number, required:true, default:ResourceInitData.blood},
		wallHp:{type:Number, required:true, default:BuildingFunction.wall[1].wallHp}
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
	coinEvents:[{
		_id:false,
		id:{type:String, required:true},
		coin:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
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
	materialEvents:[{
		_id:false,
		id:{type:String, required:true},
		category:{type:String, required:true},
		materials:[{
			_id:false,
			type:{type:String, required:true},
			count:{type:Number, required:true}
		}],
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
		finishTime:{type:Number, required:true}
	}],
	treatSoldiers:{
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
		finishTime:{type:Number, required:true}
	}],
	dragonMaterials:{
		ironIngot:{type:Number, required:true, default:DragonMaterialInitData.ironIngot},
		steelIngot:{type:Number, required:true, default:DragonMaterialInitData.steelIngot},
		mithrilIngot:{type:Number, required:true, default:DragonMaterialInitData.mithrilIngot},
		blackIronIngot:{type:Number, required:true, default:DragonMaterialInitData.blackIronIngot},
		arcaniteIngot:{type:Number, required:true, default:DragonMaterialInitData.arcaniteIngot},
		wispOfFire:{type:Number, required:true, default:DragonMaterialInitData.wispOfFire},
		wispOfCold:{type:Number, required:true, default:DragonMaterialInitData.wispOfCold},
		wispOfWind:{type:Number, required:true, default:DragonMaterialInitData.wispOfWind},
		lavaSoul:{type:Number, required:true, default:DragonMaterialInitData.lavaSoul},
		iceSoul:{type:Number, required:true, default:DragonMaterialInitData.iceSoul},
		forestSoul:{type:Number, required:true, default:DragonMaterialInitData.forestSoul},
		infernoSoul:{type:Number, required:true, default:DragonMaterialInitData.infernoSoul},
		blizzardSoul:{type:Number, required:true, default:DragonMaterialInitData.blizzardSoul},
		fairySoul:{type:Number, required:true, default:DragonMaterialInitData.fairySoul},
		moltenShard:{type:Number, required:true, default:DragonMaterialInitData.moltenShard},
		glacierShard:{type:Number, required:true, default:DragonMaterialInitData.glacierShard},
		chargedShard:{type:Number, required:true, default:DragonMaterialInitData.chargedShard},
		moltenShiver:{type:Number, required:true, default:DragonMaterialInitData.moltenShiver},
		glacierShiver:{type:Number, required:true, default:DragonMaterialInitData.glacierShiver},
		chargedShiver:{type:Number, required:true, default:DragonMaterialInitData.chargedShiver},
		moltenCore:{type:Number, required:true, default:DragonMaterialInitData.moltenCore},
		glacierCore:{type:Number, required:true, default:DragonMaterialInitData.glacierCore},
		chargedCore:{type:Number, required:true, default:DragonMaterialInitData.chargedCore},
		moltenMagnet:{type:Number, required:true, default:DragonMaterialInitData.moltenMagnet},
		glacierMagnet:{type:Number, required:true, default:DragonMaterialInitData.glacierMagnet},
		chargedMagnet:{type:Number, required:true, default:DragonMaterialInitData.chargedMagnet},
		challengeRune:{type:Number, required:true, default:DragonMaterialInitData.challengeRune},
		suppressRune:{type:Number, required:true, default:DragonMaterialInitData.suppressRune},
		rageRune:{type:Number, required:true, default:DragonMaterialInitData.rageRune},
		guardRune:{type:Number, required:true, default:DragonMaterialInitData.guardRune},
		poisonRune:{type:Number, required:true, default:DragonMaterialInitData.poisonRune},
		giantRune:{type:Number, required:true, default:DragonMaterialInitData.giantRune},
		dolanRune:{type:Number, required:true, default:DragonMaterialInitData.dolanRune},
		warsongRune:{type:Number, required:true, default:DragonMaterialInitData.warsongRune},
		infernoRune:{type:Number, required:true, default:DragonMaterialInitData.infernoRune},
		arcanaRune:{type:Number, required:true, default:DragonMaterialInitData.arcanaRune},
		eternityRune:{type:Number, required:true, default:DragonMaterialInitData.eternityRune}
	},
	dragonEquipments:{
		moltenCrown:{type:Number, required:true, default:0},
		glacierCrown:{type:Number, required:true, default:0},
		chargedCrown:{type:Number, required:true, default:0},
		fireSuppressCrown:{type:Number, required:true, default:0},
		coldSuppressCrown:{type:Number, required:true, default:0},
		windSuppressCrown:{type:Number, required:true, default:0},
		rageCrown:{type:Number, required:true, default:0},
		frostCrown:{type:Number, required:true, default:0},
		poisonCrown:{type:Number, required:true, default:0},
		giantCrown:{type:Number, required:true, default:0},
		dolanCrown:{type:Number, required:true, default:0},
		warsongCrown:{type:Number, required:true, default:0},
		infernoCrown:{type:Number, required:true, default:0},
		blizzardCrown:{type:Number, required:true, default:0},
		eternityCrown:{type:Number, required:true, default:0},
		fireSuppressChest:{type:Number, required:true, default:0},
		coldSuppressChest:{type:Number, required:true, default:0},
		windSuppressChest:{type:Number, required:true, default:0},
		rageChest:{type:Number, required:true, default:0},
		frostChest:{type:Number, required:true, default:0},
		poisonChest:{type:Number, required:true, default:0},
		giantChest:{type:Number, required:true, default:0},
		dolanChest:{type:Number, required:true, default:0},
		warsongChest:{type:Number, required:true, default:0},
		infernoChest:{type:Number, required:true, default:0},
		blizzardChest:{type:Number, required:true, default:0},
		eternityChest:{type:Number, required:true, default:0},
		fireSuppressSting:{type:Number, required:true, default:0},
		coldSuppressSting:{type:Number, required:true, default:0},
		windSuppressSting:{type:Number, required:true, default:0},
		rageSting:{type:Number, required:true, default:0},
		frostSting:{type:Number, required:true, default:0},
		poisonSting:{type:Number, required:true, default:0},
		giantSting:{type:Number, required:true, default:0},
		dolanSting:{type:Number, required:true, default:0},
		warsongSting:{type:Number, required:true, default:0},
		infernoSting:{type:Number, required:true, default:0},
		blizzardSting:{type:Number, required:true, default:0},
		eternitySting:{type:Number, required:true, default:0},
		fireSuppressOrb:{type:Number, required:true, default:0},
		coldSuppressOrb:{type:Number, required:true, default:0},
		windSuppressOrb:{type:Number, required:true, default:0},
		rageOrb:{type:Number, required:true, default:0},
		frostOrb:{type:Number, required:true, default:0},
		poisonOrb:{type:Number, required:true, default:0},
		giantOrb:{type:Number, required:true, default:0},
		dolanOrb:{type:Number, required:true, default:0},
		warsongOrb:{type:Number, required:true, default:0},
		infernoOrb:{type:Number, required:true, default:0},
		blizzardOrb:{type:Number, required:true, default:0},
		eternityOrb:{type:Number, required:true, default:0},
		moltenArmguard:{type:Number, required:true, default:0},
		glacierArmguard:{type:Number, required:true, default:0},
		chargedArmguard:{type:Number, required:true, default:0},
		fireSuppressArmguard:{type:Number, required:true, default:0},
		coldSuppressArmguard:{type:Number, required:true, default:0},
		windSuppressArmguard:{type:Number, required:true, default:0},
		rageArmguard:{type:Number, required:true, default:0},
		frostArmguard:{type:Number, required:true, default:0},
		poisonArmguard:{type:Number, required:true, default:0},
		giantArmguard:{type:Number, required:true, default:0},
		dolanArmguard:{type:Number, required:true, default:0},
		warsongArmguard:{type:Number, required:true, default:0},
		infernoArmguard:{type:Number, required:true, default:0},
		blizzardArmguard:{type:Number, required:true, default:0},
		eternityArmguard:{type:Number, required:true, default:0}
	},
	dragonEquipmentEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		finishTime:{type:Number, required:true}
	}],
	dragons:{
		redDragon:createDragonSchema("redDragon"),
		blueDragon:createDragonSchema("blueDragon"),
		greenDragon:createDragonSchema("greenDragon")
	},
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
	buildingEvents:[{
		_id:false,
		id:{type:String, required:true},
		location:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	houseEvents:[{
		_id:false,
		id:{type:String, required:true},
		buildingLocation:{type:Number, required:true},
		houseLocation:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
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
	towerEvents:[{
		_id:false,
		id:{type:String, required:true},
		location:{type:Number, required:true},
		finishTime:{type:Number, required:true}
	}],
	wall:{
		level:{type:Number, required:true, default:1}
	},
	wallEvents:[{
		_id:false,
		id:{type:String, required:true},
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
				playerData:{
					name:{type:String, required:true},
					icon:{type:String, required:true},
					allianceName:{type:String, requird:true},
					allianceTag:{type:String, required:true},
					coinGet:{type:Number, required:true},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						xpAdd:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				},
				enemyPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					cityName:{type:String, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					},
					icon:{type:String, required:true},
					allianceName:{type:String, required:true},
					allianceTag:{type:String, required:true},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						xpAdd:{type:Number, required:true},
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
				playerData:{
					name:{type:String, required:true},
					cityName:{type:String, required:true},
					icon:{type:String, required:true},
					allianceName:{type:String, requird:true},
					allianceTag:{type:String, required:true},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						xpAdd:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				},
				enemyPlayerData:{
					name:{type:String, required:true},
					icon:{type:String, required:true},
					allianceName:{type:String, requird:true},
					allianceTag:{type:String, required:true},
					coinGet:{type:Number, required:true},
					dragon:{
						type:{type:String, required:true},
						level:{type:Number, required:true},
						xpAdd:{type:Number, required:true},
						hp:{type:Number, required:true},
						hpDecreased:{type:Number, required:true}
					}
				}
			},
			required:false
		},
		attackCity:{
			type:{
				attackStar:{type:Number, required:true},
				defenceStar:{type:Number, required:true},
				isRenamed:{type:Boolean, required:true},
				attackTarget:{
					name:{type:String, required:true},
					cityName:{type:String, required:true},
					location:{
						x:{type:Number, required:true},
						y:{type:Number, required:true}
					}
				},
				attackPlayerData:{
					id:{type:String, required:true},
					name:{type:String, required:true},
					allianceName:{type:String, required:true},
					troopData:{
						troopTotal:{type:Number, required:true},
						troopSurvived:{type:Number, required:true},
						troopWounded:{type:Number, required:true},
						kill:{type:Number, required:true},
						dragon:{
							type:{type:String, required:true},
							level:{type:Number, required:true},
							xpAdd:{type:Number, required:true},
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
					allianceName:{type:String, required:true},
					troopData:{
						troopTotal:{type:Number, required:true},
						troopSurvived:{type:Number, required:true},
						troopWounded:{type:Number, required:true},
						kill:{type:Number, required:true},
						dragon:{
							type:{type:String, required:true},
							level:{type:Number, required:true},
							xpAdd:{type:Number, required:true},
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
					allianceName:{type:String, required:true},
					troopData:{
						troopTotal:{type:Number, required:true},
						troopSurvived:{type:Number, required:true},
						troopWounded:{type:Number, required:true},
						kill:{type:Number, required:true},
						dragon:{
							type:{type:String, required:true},
							level:{type:Number, required:true},
							xpAdd:{type:Number, required:true},
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
					fightResult:{type:String, required:true},
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
						soldierTreatedCount:{type:Number, required:true},
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
						soldierTreatedCount:{type:Number, required:true},
						morale:{type:Number, required:true},
						moraleDecreased:{type:Number, required:true},
						isWin:{type:Boolean, required:true}
					}]
				},
				fightWithDefencePlayerReports:{
					fightResult:{type:String, required:true},
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
						soldierTreatedCount:{type:Number, required:true},
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
						soldierTreatedCount:{type:Number, required:true},
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
						soldierTreatedCount:{type:Number, required:true},
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
		}
	}],
	helpToTroops:[{
		_id:false,
		playerDragon:{type:String, required:true},
		targetPlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true}
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
		soldiers:[
			{
				_id:false,
				name:{type:String, required:true},
				count:{type:Number, required:true},
				star:{type:Number, required:true}
			}
		]
	}]
})

module.exports = mongoose.model('player', playerSchema)