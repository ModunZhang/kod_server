"use strict"

/**
 * Created by modun on 14-10-27.
 */

var _ = require("underscore")
var ShortId = require("shortid")
var Promise = require("bluebird")

var DataUtils = require("./dataUtils")
var LogicUtils = require("./logicUtils")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var GameDatas = require("../datas/GameDatas")
var UnitConfig = GameDatas.UnitsConfig

var Utils = module.exports

/**
 * 创建攻打玩家城市战报
 * @param defenceAllianceDoc
 * @param attackPlayerData
 * @param helpDefencePlayerData
 * @param defencePlayerData
 * @param fightData
 * @returns {*}
 */
Utils.createAttackCityReport = function(defenceAllianceDoc, attackPlayerData, helpDefencePlayerData, defencePlayerData, fightData){
	var getSoldierCitizen = function(soldiers, key){
		var count = 0
		_.each(soldiers, function(soldier){
			count += soldier.citizen * soldier[key]
		})
		return count
	}
	var getKilledCitizen = function(soldiersForFight){
		var killed = 0
		var config = null
		_.each(soldiersForFight, function(soldierForFight){
			_.each(soldierForFight.killedSoldiers, function(soldier){
				if(DataUtils.hasNormalSoldier(soldier.name)){
					var soldierFullKey = soldier.name + "_" + soldier.star
					config = UnitConfig.normal[soldierFullKey]
					killed += soldier.count * config.citizen
				}else{
					config = UnitConfig.special[soldier.name]
					killed += soldier.count * config.citizen
				}
			})
		})
		return killed
	}
	var createSoldiersDataAfterFight = function(soldiersForFight){
		var soldiers = []
		_.each(soldiersForFight, function(soldierForFight){
			var soldier = {
				name:soldierForFight.name,
				star:soldierForFight.star,
				count:soldierForFight.totalCount,
				countDecreased:soldierForFight.totalCount - soldierForFight.currentCount
			}
			soldiers.push(soldier)
		})
		return soldiers
	}
	var createDragonFightData = function(dragonForFight){
		var data = {
			type:dragonForFight.type,
			hpMax:dragonForFight.maxHp,
			hp:dragonForFight.totalHp,
			hpDecreased:dragonForFight.totalHp - dragonForFight.currentHp,
			isWin:dragonForFight.isWin
		}
		return data
	}
	var getStar = function(fightData){
		var data = {attackStar:0, defenceStar:0}
		if(_.isObject(fightData.helpDefenceSoldierFightResult)){
			if(_.isEqual(fightData.helpDefenceSoldierFightResult.fightResult, Consts.FightResult.AttackWin)) data.attackStar += 1
			else{
				data.defenceStar = 3
				return data
			}
		}else data.attackStar += 1

		if(_.isObject(fightData.defenceSoldierFightResult)){
			if(_.isEqual(fightData.defenceSoldierFightResult.fightResult, Consts.FightResult.AttackWin)) data.attackStar += 1
			else{
				data.defenceStar = 2
				return data
			}
		}else data.attackStar += 1

		if(_.isObject(fightData.defenceWallFightResult)){
			if(_.isEqual(fightData.defenceWallFightResult.fightResult, Consts.FightResult.AttackWin)) data.attackStar += 1
			else{
				data.defenceStar = 1
				return data
			}
		}else data.attackStar += 1

		return data
	}

	var starParam = getStar(fightData)
	var attackRewards = []
	var attackCityReport = {
		attackStar:starParam.attackStar,
		defenceStar:starParam.defenceStar,
		isRenamed:false,
		attackTarget:{
			name:defencePlayerData.playerDoc.basicInfo.name,
			cityName:defencePlayerData.playerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerData.playerDoc._id).location
		}
	}
	attackCityReport.attackPlayerData = {
		id:attackPlayerData.playerDoc._id,
		name:attackPlayerData.playerDoc.basicInfo.name,
		allianceName:attackPlayerData.playerDoc.alliance.name,
		troopData:{
			troopTotal:getSoldierCitizen(attackPlayerData.soldiers, "totalCount"),
			troopSurvived:getSoldierCitizen(attackPlayerData.soldiers, "currentCount"),
			troopWounded:getSoldierCitizen(attackPlayerData.soldiers, "treatCount"),
			kill:getKilledCitizen(attackPlayerData.soldiers),
			dragon:{
				type:attackPlayerData.dragon.type,
				level:attackPlayerData.dragon.level,
				xpAdd:0,
				hp:attackPlayerData.dragon.totalHp,
				hpDecreased:attackPlayerData.dragon.totalHp - attackPlayerData.dragon.currentHp
			},
			soldiers:createSoldiersDataAfterFight(attackPlayerData.soldiers)
		},
		rewards:attackRewards
	}

	if(_.isObject(fightData.helpDefenceDragonFightResult)){
		attackCityReport.helpDefencePlayerData = {
			id:helpDefencePlayerData.playerDoc._id,
			name:helpDefencePlayerData.playerDoc.basicInfo.name,
			allianceName:helpDefencePlayerData.playerDoc.alliance.name,
			troopData:{
				troopTotal:getSoldierCitizen(helpDefencePlayerData.soldiers, "totalCount"),
				troopSurvived:getSoldierCitizen(helpDefencePlayerData.soldiers, "currentCount"),
				troopWounded:getSoldierCitizen(helpDefencePlayerData.soldiers, "treatCount"),
				kill:getKilledCitizen(helpDefencePlayerData.soldiers),
				dragon:{
					type:helpDefencePlayerData.dragon.type,
					level:helpDefencePlayerData.dragon.level,
					xpAdd:0,
					hp:helpDefencePlayerData.dragon.totalHp,
					hpDecreased:helpDefencePlayerData.dragon.totalHp - helpDefencePlayerData.dragon.currentHp
				},
				soldiers:createSoldiersDataAfterFight(helpDefencePlayerData.soldiers)
			},
			rewards:[]
		}
		attackCityReport.fightWithHelpDefencePlayerReports = {
			fightResult:fightData.helpDefenceSoldierFightResult.fightResult,
			attackPlayerDragonFightData:createDragonFightData(fightData.helpDefenceDragonFightResult.attackDragonAfterFight),
			defencePlayerDragonFightData:createDragonFightData(fightData.helpDefenceDragonFightResult.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:fightData.helpDefenceSoldierFightResult.attackRoundDatas,
			defencePlayerSoldierRoundDatas:fightData.helpDefenceSoldierFightResult.defenceRoundDatas
		}
	}

	if(_.isObject(fightData.defenceDragonFightResult) || _.isObject(fightData.defenceWallFightResult)){
		attackCityReport.defencePlayerData = {
			id:defencePlayerData.playerDoc._id,
			name:defencePlayerData.playerDoc.basicInfo.name,
			allianceName:defencePlayerData.playerDoc.alliance.name,
			rewards:[]
		}
		if(_.isObject(fightData.defenceDragonFightResult)){
			attackCityReport.defencePlayerData.troopData = {
				troopTotal:getSoldierCitizen(defencePlayerData.soldiers, "totalCount"),
				troopSurvived:getSoldierCitizen(defencePlayerData.soldiers, "currentCount"),
				troopWounded:getSoldierCitizen(defencePlayerData.soldiers, "treatCount"),
				kill:getKilledCitizen(defencePlayerData.soldiers),
				dragon:{
					type:defencePlayerData.dragon.type,
					level:defencePlayerData.dragon.level,
					xpAdd:0,
					hp:defencePlayerData.dragon.totalHp,
					hpDecreased:defencePlayerData.dragon.totalHp - defencePlayerData.dragon.currentHp
				},
				soldiers:createSoldiersDataAfterFight(defencePlayerData.soldiers)
			}
			if(_.isEqual(fightData.defenceDragonFightResult.fightResult, Consts.FightResult.AttackWin)){
				var attackDragonHpDecreased = fightData.defenceDragonFightResult.attackDragonHpDecreased
				var coinGet = defencePlayerData.playerDoc.resources.coin >= attackDragonHpDecreased ? attackDragonHpDecreased : defencePlayerData.playerDoc.resources.coin
				attackRewards.push({
					type:"resources",
					name:"coin",
					count:coinGet
				})
			}
		}

		if(_.isObject(fightData.defenceWallFightResult)){
			attackCityReport.defencePlayerData.wall = {
				hp:fightData.defenceWallFightResult.defenceWallAfterFight.totalHp,
				hpDecreased:defencePlayerData.wall.totalHp - defencePlayerData.wall.currentHp
			}
		}

		if(_.isObject(fightData.defenceDragonFightResult) && !_.isObject(fightData.defenceWallFightResult)){
			attackCityReport.fightWithDefencePlayerReports = {
				fightResult:fightData.defenceSoldierFightResult.fightResult,
				attackPlayerDragonFightData:createDragonFightData(fightData.defenceDragonFightResult.attackDragonAfterFight),
				defencePlayerDragonFightData:createDragonFightData(fightData.defenceDragonFightResult.defenceDragonAfterFight),
				attackPlayerSoldierRoundDatas:fightData.defenceSoldierFightResult.attackRoundDatas,
				defencePlayerSoldierRoundDatas:fightData.defenceSoldierFightResult.defenceRoundDatas
			}
		}
		if(!_.isObject(fightData.defenceDragonFightResult) && _.isObject(fightData.defenceWallFightResult)){
			attackCityReport.fightWithDefencePlayerReports = {
				fightResult:fightData.defenceWallFightResult.fightResult,
				attackPlayerWallRoundDatas:fightData.defenceWallFightResult.attackRoundDatas,
				defencePlayerWallRoundDatas:fightData.defenceWallFightResult.defenceRoundDatas
			}
		}
		if(_.isObject(fightData.defenceDragonFightResult) && _.isObject(fightData.defenceWallFightResult)){
			attackCityReport.fightWithDefencePlayerReports = {
				fightResult:fightData.defenceWallFightResult.fightResult,
				attackPlayerDragonFightData:createDragonFightData(fightData.defenceDragonFightResult.attackDragonAfterFight),
				defencePlayerDragonFightData:createDragonFightData(fightData.defenceDragonFightResult.defenceDragonAfterFight),
				attackPlayerSoldierRoundDatas:fightData.defenceSoldierFightResult.attackRoundDatas,
				defencePlayerSoldierRoundDatas:fightData.defenceSoldierFightResult.defenceRoundDatas,
				attackPlayerWallRoundDatas:fightData.defenceWallFightResult.attackRoundDatas,
				defencePlayerWallRoundDatas:fightData.defenceWallFightResult.defenceRoundDatas
			}
		}
	}

	if(attackCityReport.attackStar >= 2){
		var defencePlayerResources = defencePlayerData.playerDoc.resources
		var defencePlayerResourceTotal = defencePlayerResources.wood + defencePlayerResources.stone + defencePlayerResources.iron + defencePlayerResources.food
		var getLoadTotal = function(soldiersForFight){
			var loadTotal = 0
			_.each(soldiersForFight, function(soldierForFight){
				loadTotal += soldierForFight.currentCount * soldierForFight.load
			})
			return loadTotal
		}
		var attackPlayerLoadTotal = getLoadTotal(attackPlayerData.soldiers)
		var loadPercent = attackPlayerLoadTotal / defencePlayerResourceTotal
		loadPercent = loadPercent > 1 ? 1 : loadPercent
		var resourceKeys = ["wood", "stone", "iron", "food"]
		_.each(resourceKeys, function(key){
			attackRewards.push({
				type:"resources",
				name:key,
				count:Math.floor(defencePlayerResources[key] * loadPercent)
			})
		})
	}

	var fullReport = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.AttackCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		attackCity:attackCityReport
	}
	return fullReport
}

/**
 * 创建突袭玩家城市和协防玩家的龙发生战斗的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragonForFight
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @param helpDefencePlayerDoc
 * @param helpDefenceDragonForFight
 * @param dragonFightData
 * @returns {*}
 */
Utils.createStrikeCityFightWithHelpDefenceDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragonForFight, dragonFightData){
	var reportLevel = null
	var powerCompare = dragonFightData.powerCompare
	if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.E
	else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.D
	else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.C
	else if(powerCompare >= 2 && powerCompare < 4) reportLevel = Consts.DragonStrikeReportLevel.B
	else if(powerCompare >= 4 && powerCompare < 6) reportLevel = Consts.DragonStrikeReportLevel.A
	else reportLevel = Consts.DragonStrikeReportLevel.S

	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag
		}
		return data
	}
	var createDragonData = function(dragonFightData){
		var attackDragonAfterFight = dragonFightData.attackDragonAfterFight
		var defenceDragonAfterFight = dragonFightData.defenceDragonAfterFight
		var attackDragonData = {
			type:attackDragonAfterFight.type,
			level:attackDragonAfterFight.level,
			hp:attackDragonAfterFight.totalHp,
			hpDecreased:attackDragonAfterFight.totalHp - attackDragonAfterFight.currentHp
		}
		var defenceDragonData = {
			type:defenceDragonAfterFight.type,
			level:defenceDragonAfterFight.level,
			hp:defenceDragonAfterFight.totalHp,
			hpDecreased:defenceDragonAfterFight.totalHp - defenceDragonAfterFight.currentHp
		}
		return {attackDragonData:attackDragonData, defenceDragonData:defenceDragonData}
	}
	var getDragonSkills = function(dragon){
		var skills = []
		_.each(dragon.skills, function(skill){
			if(skill.level > 0){
				skills.push(skill)
			}
		})
		return skills
	}
	var getDragonEquipments = function(dragon){
		var equipments = []
		_.each(dragon.equipments, function(theEquipment, type){
			if(!_.isEmpty(theEquipment.name)){
				var equipment = {
					type:type,
					name:theEquipment.name,
					star:theEquipment.star
				}
				equipments.push(equipment)
			}
		})
		return equipments
	}
	var getSoldiers = function(playerDoc, soldiersInTroop){
		var soldiers = []
		_.each(soldiersInTroop, function(count, name){
			if(count > 0){
				var soldier = {
					name:name,
					star:1,
					count:count
				}
				soldiers.push(soldier)
			}
		})
		return soldiers
	}


	var dragonData = createDragonData(dragonFightData)

	var strikeCityReport = {
		level:reportLevel,
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			cityName:defencePlayerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id).location,
			terrain:defenceAllianceDoc.basicInfo.terrain
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			coinGet:0,
			dragon:dragonData.attackDragonData
		},
		helpDefencePlayerData:{
			id:helpDefencePlayerDoc._id,
			name:helpDefencePlayerDoc.basicInfo.name,
			icon:helpDefencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:_.extend(
				{
					equipments:getDragonEquipments(helpDefencePlayerDoc.dragons[helpDefenceDragonForFight.type]),
					skills:getDragonSkills(helpDefencePlayerDoc.dragons[helpDefenceDragonForFight.type])
				},
				dragonData.defenceDragonData
			),
			soldiers:getSoldiers(helpDefencePlayerDoc, defencePlayerDoc.helpedByTroops[0].soldiers)
		}
	}

	var cityBeStrikedReport = {
		level:strikeCityReport.level,
		strikeTarget:strikeCityReport.strikeTarget,
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			coinGet:0,
			dragon:_.extend(
				{
					equipments:getDragonEquipments(attackPlayerDoc.dragons[attackDragonForFight.type])
				},
				dragonData.attackDragonData
			)
		},
		helpDefencePlayerData:{
			id:helpDefencePlayerDoc._id,
			name:helpDefencePlayerDoc.basicInfo.name,
			icon:helpDefencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:dragonData.defenceDragonData
		}
	}

	var reportForAttackPlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		strikeCity:strikeCityReport
	}
	var reportForHelpDefencePlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		cityBeStriked:cityBeStrikedReport
	}

	return {reportForAttackPlayer:reportForAttackPlayer, reportForHelpDefencePlayer:reportForHelpDefencePlayer}
}

/**
 * 创建突袭玩家城市和防守玩家的龙发生战斗的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragonForFight
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @param defenceDragonForFight
 * @param dragonFightData
 * @returns {*}
 */
Utils.createStrikeCityFightWithDefenceDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc, defenceDragonForFight, dragonFightData){
	var reportLevel = null
	var powerCompare = dragonFightData.powerCompare
	if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.E
	else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.D
	else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.C
	else if(powerCompare >= 2 && powerCompare < 4) reportLevel = Consts.DragonStrikeReportLevel.B
	else if(powerCompare >= 4 && powerCompare < 6) reportLevel = Consts.DragonStrikeReportLevel.A
	else reportLevel = Consts.DragonStrikeReportLevel.S

	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag
		}
		return data
	}
	var createDragonData = function(dragonFightData){
		var attackDragonAfterFight = dragonFightData.attackDragonAfterFight
		var defenceDragonAfterFight = dragonFightData.defenceDragonAfterFight
		var attackDragonData = {
			type:attackDragonAfterFight.type,
			level:attackDragonAfterFight.level,
			hp:attackDragonAfterFight.totalHp,
			hpDecreased:attackDragonAfterFight.totalHp - attackDragonAfterFight.currentHp
		}
		var defenceDragonData = {
			type:defenceDragonAfterFight.type,
			level:defenceDragonAfterFight.level,
			hp:defenceDragonAfterFight.totalHp,
			hpDecreased:defenceDragonAfterFight.totalHp - defenceDragonAfterFight.currentHp
		}
		return {attackDragonData:attackDragonData, defenceDragonData:defenceDragonData}
	}
	var getDragonSkills = function(dragon){
		var skills = []
		_.each(dragon.skills, function(skill){
			if(skill.level > 0){
				skills.push(skill)
			}
		})
		return skills
	}
	var getDragonEquipments = function(dragon){
		var equipments = []
		_.each(dragon.equipments, function(theEquipment, type){
			if(!_.isEmpty(theEquipment.name)){
				var equipment = {
					type:type,
					name:theEquipment.name,
					star:theEquipment.star
				}
				equipments.push(equipment)
			}
		})
		return equipments
	}
	var getSoldiers = function(playerDoc){
		var soldiers = []
		_.each(playerDoc.soldiers, function(count, name){
			if(count > 0){
				var soldier = {
					name:name,
					star:1,
					count:count
				}
				soldiers.push(soldier)
			}
		})
		return soldiers
	}


	var dragonData = createDragonData(dragonFightData)
	var attackPlayerCoinGet = 0
	if(_.isEqual(dragonFightData.fightResult, Consts.FightResult.AttackWin)){
		var attackDragonCurrentHp = dragonFightData.attackDragonAfterFight.currentHp
		attackPlayerCoinGet = defencePlayerDoc.resources.coin >= attackDragonCurrentHp ? attackDragonCurrentHp : enemyPlayerDoc.resources.coin
	}

	var strikeCityReport = {
		level:reportLevel,
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			cityName:defencePlayerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id).location,
			terrain:defenceAllianceDoc.basicInfo.terrain
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			coinGet:attackPlayerCoinGet,
			dragon:dragonData.attackDragonData
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defencePlayerDoc),
			dragon:_.extend(
				{
					equipments:getDragonEquipments(defencePlayerDoc.dragons[defenceDragonForFight.type]),
					skills:getDragonSkills(defencePlayerDoc.dragons[defenceDragonForFight.type])
				},
				dragonData.defenceDragonData
			),
			soldiers:getSoldiers(defencePlayerDoc),
			resources:{
				wood:defencePlayerDoc.resources.wood,
				stone:defencePlayerDoc.resources.stone,
				iron:defencePlayerDoc.resources.iron,
				food:defencePlayerDoc.resources.food,
				wallHp:defencePlayerDoc.resources.wallHp
			}
		}
	}

	var cityBeStrikedReport = {
		level:strikeCityReport.level,
		strikeTarget:strikeCityReport.strikeTarget,
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			coinGet:attackPlayerCoinGet,
			dragon:_.extend(
				{
					equipments:getDragonEquipments(attackPlayerDoc.dragons[attackDragonForFight.type])
				},
				dragonData.attackDragonData
			)
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:dragonData.defenceDragonData
		}
	}

	var reportForAttackPlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		strikeCity:strikeCityReport
	}
	var reportForDefencePlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		strikeCity:cityBeStrikedReport
	}

	return {reportForAttackPlayer:reportForAttackPlayer, reportForDefencePlayer:reportForDefencePlayer}
}

/**
 * 创建突袭玩家城市和防守玩家的龙发生战斗的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragonForFight
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @returns {*}
 */
Utils.createStrikeCityNoDefenceDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, defenceAllianceDoc, defencePlayerDoc){
	var reportLevel = Consts.DragonStrikeReportLevel.S

	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag
		}
		return data
	}
	var getDragonEquipments = function(dragon){
		var equipments = []
		_.each(dragon.equipments, function(theEquipment, type){
			if(!_.isEmpty(theEquipment.name)){
				var equipment = {
					type:type,
					name:theEquipment.name,
					star:theEquipment.star
				}
				equipments.push(equipment)
			}
		})
		return equipments
	}

	var attackPlayerCoinGet = attackDragonForFight.currentHp

	var strikeCityReport = {
		level:reportLevel,
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			cityName:defencePlayerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id).location,
			terrain:defenceAllianceDoc.basicInfo.terrain
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			coinGet:attackPlayerCoinGet,
			dragon:{
				type:attackDragonForFight.type,
				level:attackDragonForFight.level,
				hp:attackDragonForFight.currentHp,
				hpDecreased:0
			}
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defencePlayerDoc),
			resources:{
				wood:defencePlayerDoc.resources.wood,
				stone:defencePlayerDoc.resources.stone,
				iron:defencePlayerDoc.resources.iron,
				food:defencePlayerDoc.resources.food,
				wallHp:defencePlayerDoc.resources.wallHp
			}
		}
	}

	var cityBeStrikedReport = {
		level:strikeCityReport.level,
		strikeTarget:strikeCityReport.strikeTarget,
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			coinGet:attackPlayerCoinGet,
			dragon:{
				type:attackDragonForFight.type,
				level:attackDragonForFight.level,
				hp:attackDragonForFight.currentHp,
				hpDecreased:0,
				equipments:getDragonEquipments(attackPlayerDoc.dragons[attackDragonForFight.type])
			}
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc)
		}
	}

	var reportForAttackPlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		strikeCity:strikeCityReport
	}
	var reportForDefencePlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		strikeCity:cityBeStrikedReport
	}

	return {reportForAttackPlayer:reportForAttackPlayer, reportForDefencePlayer:reportForDefencePlayer}
}
