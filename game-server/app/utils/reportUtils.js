"use strict"

/**
 * Created by modun on 14-10-27.
 */

var _ = require("underscore")
var ShortId = require("shortid")
var Promise = require("bluebird")

var FightUtils = require("./fightUtils")
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
 * 创建龙侦查玩家城市战报
 * @param playerDoc
 * @param playerDragon
 * @param enemyAllianceDoc
 * @param enemyPlayerDoc
 * @param enemyPlayerDragon
 * @returns {*}
 */
Utils.createDragonStrikeCityReport = function(playerDoc, playerDragon, enemyAllianceDoc, enemyPlayerDoc, enemyPlayerDragon){
	var now = Date.now()
	var reportForPlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeCity,
		createTime:now,
		isRead:false,
		isSaved:false
	}
	var reportForEnemyPlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.CityBeStriked,
		createTime:now,
		isRead:false,
		isSaved:false
	}
	var playerData = {
		name:playerDoc.basicInfo.name,
		icon:playerDoc.basicInfo.icon,
		allianceName:playerDoc.alliance.name,
		allianceTag:playerDoc.alliance.tag,
		dragon:{
			type:playerDragon.type,
			level:playerDragon.level,
			xpAdd:0,
			hp:playerDragon.hp
		}
	}
	var enemyPlayerData = {
		id:enemyPlayerDoc._id,
		name:enemyPlayerDoc.basicInfo.name,
		cityName:enemyPlayerDoc.basicInfo.cityName,
		location:LogicUtils.getAllianceMemberById(enemyAllianceDoc, enemyPlayerDoc._id).location,
		icon:enemyPlayerDoc.basicInfo.icon,
		allianceName:enemyPlayerDoc.alliance.name,
		allianceTag:enemyPlayerDoc.alliance.tag,
		resources:{
			wood:enemyPlayerDoc.resources.wood,
			stone:enemyPlayerDoc.resources.stone,
			iron:enemyPlayerDoc.resources.iron,
			food:enemyPlayerDoc.resources.food,
			wallHp:enemyPlayerDoc.resources.wallHp
		}
	}

	var soldiers = []
	_.each(enemyPlayerDoc.soldiers, function(count, name){
		if(count > 0){
			var soldier = {
				name:name,
				star:1,
				count:count
			}
			soldiers.push(soldier)
		}
	})
	enemyPlayerData.soldiers = soldiers

	reportForPlayer.strikeCity = {
		playerData:playerData,
		enemyPlayerData:enemyPlayerData
	}

	if(!_.isObject(enemyPlayerDragon)){
		reportForPlayer.strikeCity.level = Consts.DragonStrikeReportLevel.S
		var hpDecreased = DataUtils.getPlayerDragonStrikeHpDecreased(playerDoc, playerDragon)
		var coinGet = enemyPlayerDoc.resources.coin >= hpDecreased ? hpDecreased : enemyPlayerDoc.resources.coin
		playerData.coinGet = coinGet
		playerData.dragon.hpDecreased = playerDragon.hp >= hpDecreased ? hpDecreased : playerDragon.hp
		enemyPlayerData.dragon = null
	}else{
		var playerDragonHpDecreased = DataUtils.getPlayerDragonStrikeHpDecreased(playerDoc, playerDragon)
		var dragonFightData = FightUtils.dragonToDragonFight(playerDragon, enemyPlayerDragon, 1)
		playerDragonHpDecreased += dragonFightData.attackDragonHpDecreased
		var enemyPlayerDragonHpDecreased = dragonFightData.defenceDragonHpDecreased
		var playerCoinGet = enemyPlayerDoc.resources.coin >= playerDragonHpDecreased ? playerDragonHpDecreased : enemyPlayerDoc.resources.coin
		playerData.coinGet = _.isEqual(dragonFightData.fightResult, Consts.FightResult.AttackWin) ? playerCoinGet : 0
		playerData.dragon.hpDecreased = playerDragon.hp >= playerDragonHpDecreased ? playerDragonHpDecreased : playerDragon.hp
		var powerCompare = dragonFightData.powerCompare
		if(powerCompare < 1) reportForPlayer.strikeCity.level = Consts.DragonStrikeReportLevel.E
		else if(powerCompare >= 1 && powerCompare < 1.5) reportForPlayer.strikeCity.level = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1.5 && powerCompare < 2) reportForPlayer.strikeCity.level = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 2 && powerCompare < 4) reportForPlayer.strikeCity.level = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 4 && powerCompare < 6) reportForPlayer.strikeCity.level = Consts.DragonStrikeReportLevel.A
		else reportForPlayer.strikeCity.level = Consts.DragonStrikeReportLevel.S

		enemyPlayerData.dragon = {
			type:enemyPlayerDragon.type,
			level:enemyPlayerDragon.level,
			xpAdd:0,
			hp:enemyPlayerDragon.hp,
			hpDecreased:enemyPlayerDragon.hp >= enemyPlayerDragonHpDecreased ? enemyPlayerDragonHpDecreased : enemyPlayerDragon.hp
		}
		var equipments = []
		_.each(enemyPlayerDragon.equipments, function(theEquipment, type){
			if(!_.isEmpty(theEquipment.name)){
				var equipment = {
					type:type,
					name:theEquipment.name,
					star:theEquipment.star
				}
				equipments.push(equipment)
			}
		})
		enemyPlayerData.dragon.equipments = equipments
		var skills = []
		_.each(enemyPlayerDragon.skills, function(skill){
			if(skill.level > 0){
				skills.push(skill)
			}
		})
		enemyPlayerData.dragon.skills = skills
	}

	reportForEnemyPlayer.cityBeStriked = {
		level:reportForPlayer.strikeCity.level,
		playerData:{
			name:enemyPlayerDoc.basicInfo.name,
			cityName:enemyPlayerDoc.basicInfo.cityName,
			icon:enemyPlayerDoc.basicInfo.icon,
			allianceName:enemyPlayerDoc.alliance.name
		},
		enemyPlayerData:reportForPlayer.strikeCity.playerData
	}
	if(_.isObject(enemyPlayerDragon)){
		reportForEnemyPlayer.cityBeStriked.playerData.dragon = {
			type:enemyPlayerDragon.type,
			level:enemyPlayerDragon.level,
			xpAdd:0,
			hp:enemyPlayerDragon.hp,
			hpDecreased:reportForPlayer.strikeCity.enemyPlayerData.dragon.hpDecreased
		}
	}else{
		reportForEnemyPlayer.cityBeStriked.playerData.dragon = null
	}

	return {reportForPlayer:reportForPlayer, reportForEnemyPlayer:reportForEnemyPlayer}
}