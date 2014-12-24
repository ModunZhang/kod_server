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
var AllianceInit = GameDatas.AllianceInitData

var Utils = module.exports

/**
 * 创建攻打玩家城市战报
 * @param attackAllianceDoc
 * @param attackPlayerData
 * @param defenceAllianceDoc
 * @param helpDefencePlayerData
 * @param defencePlayerData
 * @param fightData
 * @returns {*}
 */
Utils.createAttackCityReport = function(attackAllianceDoc, attackPlayerData, defenceAllianceDoc, helpDefencePlayerData, defencePlayerData, fightData){
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
		if(_.isObject(fightData.helpDefenceSoldierFightData)){
			if(_.isEqual(fightData.helpDefenceSoldierFightData.fightResult, Consts.FightResult.AttackWin)) data.attackStar += 1
			else{
				data.defenceStar = 3
				return data
			}
		}else data.attackStar += 1

		if(_.isObject(fightData.defenceSoldierFightData)){
			if(_.isEqual(fightData.defenceSoldierFightData.fightResult, Consts.FightResult.AttackWin)) data.attackStar += 1
			else{
				data.defenceStar = 2
				return data
			}
		}else data.attackStar += 1

		if(_.isObject(fightData.defenceWallFightData)){
			if(_.isEqual(fightData.defenceWallFightData.fightResult, Consts.FightResult.AttackWin)) data.attackStar += 1
			else{
				data.defenceStar = 1
				return data
			}
		}else data.attackStar += 1

		return data
	}
	var getDragonExpAdd = function(kill){
		return Math.floor(kill * AllianceInit.floatInit.dragonExpByKilledCitizen.value)
	}
	var getBlood = function(totalKill, isWinner){
		var blood = totalKill * AllianceInit.floatInit.bloodByKilledCitizen.value
		return Math.floor(blood * (isWinner ? 0.7 : 0.3))
	}
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag
		}
		return data
	}
	var createDragonData = function(dragonAfterFight, expAdd){
		var dragonData = {
			type:dragonAfterFight.type,
			level:dragonAfterFight.level,
			expAdd:expAdd,
			hp:dragonAfterFight.totalHp,
			hpDecreased:dragonAfterFight.totalHp - dragonAfterFight.currentHp
		}
		return dragonData
	}
	var pushBloodToRewards = function(bloodCount, rewards){
		if(bloodCount > 0){
			var reward = {
				type:"resources",
				name:"blood",
				count:bloodCount
			}
			rewards.push(reward)
		}
	}
	var getSoldiersLoadTotal = function(soldiersForFight){
		var loadTotal = 0
		_.each(soldiersForFight, function(soldierForFight){
			loadTotal += soldierForFight.currentCount * soldierForFight.load
		})
		return loadTotal
	}

	var starParam = getStar(fightData)

	var attackPlayerKilledCitizenWithHelpDefenceSoldiers = _.isObject(fightData.helpDefenceSoldierFightData) ? getKilledCitizen(fightData.helpDefenceSoldierFightData.attackSoldiersAfterFight) : 0
	var attackPlayerKilledCitizenWithDefenceSoldiers = _.isObject(fightData.defenceSoldierFightData) ? getKilledCitizen(fightData.defenceSoldierFightData.attackSoldiersAfterFight) : 0
	var defenceWallHpDecreased = _.isObject(fightData.defenceWallFightData) ? fightData.defenceWallFightData.defenceWallAfterFight.totalHp - fightData.defenceWallFightData.defenceWallAfterFight.currentHp : 0
	var attackPlayerKilledCitizenWithDefenceWall = Math.floor(defenceWallHpDecreased * AllianceInit.floatInit.citizenCountPerWallHp.value)
	var helpDefencePlayerKilledCitizen = _.isObject(fightData.helpDefenceSoldierFightData) ? getKilledCitizen(fightData.helpDefenceSoldierFightData.defenceSoldiersAfterFight) : 0
	var defencePlayerKilledCitizenBySoldiers = _.isObject(fightData.defenceSoldierFightData) ? getKilledCitizen(fightData.defenceSoldierFightData.defenceSoldiersAfterFight) : 0
	var defencePlayerKilledCitizenByWall = _.isObject(fightData.defenceWallFightData) ? getKilledCitizen(fightData.defenceWallFightData.defenceWallAfterFight) : 0

	var attackDragonExpAddWithHelpDefenceTroop = getDragonExpAdd(attackPlayerKilledCitizenWithHelpDefenceSoldiers)
	var attackDragonExpAddWithDefenceTroop = getDragonExpAdd(attackPlayerKilledCitizenWithDefenceSoldiers)
	var helpDefenceDragonExpAdd = getDragonExpAdd(helpDefencePlayerKilledCitizen)
	var defenceDragonExpAdd = getDragonExpAdd(defencePlayerKilledCitizenBySoldiers)

	var attackPlayerGetBloodWithHelpDefencePlayer = _.isObject(fightData.helpDefenceSoldierFightData) ? getBlood(attackPlayerKilledCitizenWithHelpDefenceSoldiers + helpDefencePlayerKilledCitizen, _.isEqual(Consts.FightResult.AttackWin, fightData.helpDefenceSoldierFightData.fightResult)) : 0
	var attackPlayerGetBloodWithDefenceSoldiers = _.isObject(fightData.defenceSoldierFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceSoldiers + defencePlayerKilledCitizenBySoldiers, _.isEqual(Consts.FightResult.AttackWin, fightData.defenceSoldierFightData.fightResult)) : 0
	var attackPlayerGetBloodWithDefenceWall = _.isObject(fightData.defenceWallFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceWall + defencePlayerKilledCitizenByWall, _.isEqual(Consts.FightResult.AttackWin, fightData.defenceWallFightData.fightResult)) : 0
	var helpDefencePlayerGetBlood = _.isObject(fightData.helpDefenceSoldierFightData) ? getBlood(attackPlayerKilledCitizenWithHelpDefenceSoldiers + helpDefencePlayerKilledCitizen, _.isEqual(Consts.FightResult.DefenceWin, fightData.helpDefenceSoldierFightData.fightResult)) : 0
	var defencePlayerGetBloodBySoldiers = _.isObject(fightData.defenceSoldierFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceSoldiers + defencePlayerKilledCitizenBySoldiers, _.isEqual(Consts.FightResult.DefenceWin, fightData.defenceSoldierFightData.fightResult)) : 0
	var defencePlayerGetBloodByWall = _.isObject(fightData.defenceWallFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceWall + defencePlayerKilledCitizenByWall, _.isEqual(Consts.FightResult.DefenceWin, fightData.defenceWallFightData.fightResult)) : 0

	var attackPlayerRewards = []
	var helpDefencePlayerRewards = []
	var defencePlayerRewards = []

	pushBloodToRewards(attackPlayerGetBloodWithHelpDefencePlayer + attackPlayerGetBloodWithDefenceSoldiers + attackPlayerGetBloodWithDefenceWall, attackPlayerRewards)
	pushBloodToRewards(helpDefencePlayerGetBlood, helpDefencePlayerRewards)
	pushBloodToRewards(defencePlayerGetBloodBySoldiers + defencePlayerGetBloodByWall, defencePlayerRewards)

	if(starParam.attackStar >= 2){
		var attackDragonCurrentHp = attackPlayerData.dragon.currentHp
		var coinGet = defencePlayerData.playerDoc.resources.coin >= attackDragonCurrentHp ? attackDragonCurrentHp : defencePlayerData.playerDoc.resources.coin
		attackPlayerRewards.push({
			type:"resources",
			name:"coin",
			count:coinGet
		})
		defencePlayerRewards.push({
			type:"resources",
			name:"coin",
			count:-coinGet
		})

		var defencePlayerResources = defencePlayerData.playerDoc.resources
		var defencePlayerResourceTotal = defencePlayerResources.wood + defencePlayerResources.stone + defencePlayerResources.iron + defencePlayerResources.food
		var attackPlayerLoadTotal = getSoldiersLoadTotal(attackPlayerData.soldiers)
		var loadPercent = defencePlayerResourceTotal > 0 ? attackPlayerLoadTotal / defencePlayerResourceTotal : 0
		loadPercent = loadPercent > 1 ? 1 : loadPercent
		var resourceKeys = ["wood", "stone", "iron", "food"]
		var resourceGet = null
		_.each(resourceKeys, function(key){
			resourceGet = Math.floor(defencePlayerResources[key] * loadPercent)
			attackPlayerRewards.push({
				type:"resources",
				name:key,
				count:resourceGet
			})
			defencePlayerRewards.push({
				type:"resources",
				name:key,
				count:-resourceGet
			})
		})
	}

	var attackCityReport = {
		attackStar:starParam.attackStar,
		defenceStar:starParam.defenceStar,
		isRenamed:false,
		attackTarget:{
			id:defencePlayerData.playerDoc._id,
			name:defencePlayerData.playerDoc.basicInfo.name,
			cityName:defencePlayerData.playerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerData.playerDoc._id).location,
			terrain:defenceAllianceDoc.basicInfo.terrain
		},
		attackPlayerData:{
			id:attackPlayerData.playerDoc._id,
			name:attackPlayerData.playerDoc.basicInfo.name,
			icon:attackPlayerData.playerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			fightWithHelpDefenceTroop:!_.isObject(fightData.helpDefenceDragonFightData) ? null : {
				dragon:createDragonData(fightData.helpDefenceDragonFightData.attackDragonAfterFight, attackDragonExpAddWithHelpDefenceTroop),
				soldiers:createSoldiersDataAfterFight(fightData.helpDefenceSoldierFightData.attackSoldiersAfterFight)
			},
			fightWithDefenceTroop:!_.isObject(fightData.defenceDragonFightData) ? null : {
				dragon:createDragonData(fightData.defenceDragonFightData.attackDragonAfterFight, attackDragonExpAddWithDefenceTroop),
				soldiers:createSoldiersDataAfterFight(fightData.defenceSoldierFightData.attackSoldiersAfterFight)
			},
			fightWithDefenceWall:!_.isObject(fightData.defenceWallFightData) ? null : {
				soldiers:createSoldiersDataAfterFight(fightData.defenceWallFightData.attackSoldiersAfterFight)
			},
			rewards:attackPlayerRewards
		},
		helpDefencePlayerData:!_.isObject(fightData.helpDefenceDragonFightData) ? null : {
			id:helpDefencePlayerData.playerDoc._id,
			name:helpDefencePlayerData.playerDoc.basicInfo.name,
			icon:helpDefencePlayerData.playerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:createDragonData(fightData.helpDefenceDragonFightData.defenceDragonAfterFight, helpDefenceDragonExpAdd),
			soldiers:createSoldiersDataAfterFight(fightData.helpDefenceSoldierFightData.defenceSoldiersAfterFight),
			rewards:helpDefencePlayerRewards
		},
		defencePlayerData:_.isObject(fightData.helpDefenceDragonFightData) && _.isEqual(Consts.FightResult.DefenceWin, fightData.helpDefenceSoldierFightData.fightResult) ? null : {
			id:defencePlayerData.playerDoc._id,
			name:defencePlayerData.playerDoc.basicInfo.name,
			icon:defencePlayerData.playerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:!_.isObject(fightData.defenceDragonFightData) ? null : createDragonData(fightData.defenceDragonFightData.defenceDragonAfterFight, defenceDragonExpAdd),
			soldiers:!_.isObject(fightData.defenceSoldierFightData) ? null : createSoldiersDataAfterFight(fightData.defenceSoldierFightData.defenceSoldiersAfterFight),
			wall:!_.isObject(fightData.defenceWallFightData) ? null : {
				hp:fightData.defenceWallFightData.defenceWallAfterFight.totalHp,
				hpDecreased:fightData.defenceWallFightData.defenceWallAfterFight.totalHp - fightData.defenceWallFightData.defenceWallAfterFight.currentHp
			},
			rewards:defencePlayerRewards
		},
		fightWithHelpDefencePlayerReports:!_.isObject(fightData.helpDefenceDragonFightData) ? null : {
			attackPlayerDragonFightData:createDragonFightData(fightData.helpDefenceDragonFightData.attackDragonAfterFight),
			defencePlayerDragonFightData:createDragonFightData(fightData.helpDefenceDragonFightData.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:fightData.helpDefenceSoldierFightData.attackRoundDatas,
			defencePlayerSoldierRoundDatas:fightData.helpDefenceSoldierFightData.defenceRoundDatas
		},
		fightWithDefencePlayerReports:!_.isObject(fightData.defenceDragonFightData) && !_.isObject(fightData.defenceWallFightData) ? null : {
			attackPlayerDragonFightData:!_.isObject(fightData.defenceDragonFightData) ? null : createDragonFightData(fightData.defenceDragonFightData.attackDragonAfterFight),
			defencePlayerDragonFightData:!_.isObject(fightData.defenceDragonFightData) ? null : createDragonFightData(fightData.defenceDragonFightData.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:!_.isObject(fightData.defenceSoldierFightData) ? null : fightData.defenceSoldierFightData.attackRoundDatas,
			defencePlayerSoldierRoundDatas:!_.isObject(fightData.defenceSoldierFightData) ? null : fightData.defenceSoldierFightData.defenceRoundDatas,
			attackPlayerWallRoundDatas:!_.isObject(fightData.defenceWallFightData) ? null : fightData.defenceWallFightData.attackRoundDatas,
			defencePlayerWallRoundDatas:!_.isObject(fightData.defenceWallFightData) ? null : fightData.defenceWallFightData.defenceRoundDatas
		}
	}

	var report = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.AttackCity,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		attackCity:attackCityReport
	}

	var countData = {
		attackPlayerKill:attackPlayerKilledCitizenWithHelpDefenceSoldiers + attackPlayerKilledCitizenWithDefenceSoldiers + attackPlayerKilledCitizenWithDefenceWall,
		attackDragonExpAdd:attackDragonExpAddWithHelpDefenceTroop + attackDragonExpAddWithDefenceTroop,
		helpDefencePlayerKill:helpDefencePlayerKilledCitizen,
		helpDefenceDragonExpAdd:helpDefenceDragonExpAdd,
		defencePlayerKill:defencePlayerKilledCitizenBySoldiers + defencePlayerKilledCitizenByWall,
		defenceDragonExpAdd:defenceDragonExpAdd
	}
	return {report:report, countData:countData}
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
	var createDragonData = function(dragonAfterFight){
		var dragonData = {
			type:dragonAfterFight.type,
			level:dragonAfterFight.level,
			hp:dragonAfterFight.totalHp,
			hpDecreased:dragonAfterFight.totalHp - dragonAfterFight.currentHp
		}
		return dragonData
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
		_.each(soldiersInTroop, function(soldierInTroop){
			var soldier = {
				name:soldierInTroop.name,
				star:1,
				count:soldierInTroop.count
			}
			soldiers.push(soldier)
		})
		return soldiers
	}

	var attackDragonData = createDragonData(dragonFightData.attackDragonAfterFight)
	var defenceDragonData = createDragonData(dragonFightData.defenceDragonAfterFight)

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
			dragon:attackDragonData,
			rewards:[]
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
				defenceDragonData
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
			dragon:_.extend(
				{
					equipments:getDragonEquipments(attackPlayerDoc.dragons[attackDragonForFight.type])
				},
				attackDragonData
			)
		},
		helpDefencePlayerData:{
			id:helpDefencePlayerDoc._id,
			name:helpDefencePlayerDoc.basicInfo.name,
			icon:helpDefencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:defenceDragonData,
			rewards:[]
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
		type:Consts.PlayerReportType.CityBeStriked,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		cityBeStriked:cityBeStrikedReport
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
	var createDragonData = function(dragonAfterFight){
		var dragonData = {
			type:dragonAfterFight.type,
			level:dragonAfterFight.level,
			hp:dragonAfterFight.totalHp,
			hpDecreased:dragonAfterFight.totalHp - dragonAfterFight.currentHp
		}
		return dragonData
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

	var attackDragonData = createDragonData(dragonFightData.attackDragonAfterFight)
	var defenceDragonData = createDragonData(dragonFightData.defenceDragonAfterFight)
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
			dragon:attackDragonData,
			rewards:[{
				type:"resources",
				name:"coin",
				count:attackPlayerCoinGet
			}]
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
				defenceDragonData
			),
			soldiers:DataUtils.getPlayerDefenceSoldiers(defencePlayerDoc),
			resources:{
				wood:defencePlayerDoc.resources.wood,
				stone:defencePlayerDoc.resources.stone,
				iron:defencePlayerDoc.resources.iron,
				food:defencePlayerDoc.resources.food,
				coin:defencePlayerDoc.resources.coin,
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
			dragon:_.extend(
				{
					equipments:getDragonEquipments(attackPlayerDoc.dragons[attackDragonForFight.type])
				},
				attackDragonData
			)
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:defenceDragonData,
			rewards:[{
				type:"resources",
				name:"coin",
				count:-attackPlayerCoinGet
			}]
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
		type:Consts.PlayerReportType.CityBeStriked,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		cityBeStriked:cityBeStrikedReport
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

	var attackPlayerCoinGet = defencePlayerDoc.resources.coin >= attackDragonForFight.currentHp ? attackDragonForFight.currentHp : enemyPlayerDoc.resources.coin

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
			dragon:{
				type:attackDragonForFight.type,
				level:attackDragonForFight.level,
				hp:attackDragonForFight.currentHp,
				hpDecreased:0
			},
			rewards:[{
				type:"resources",
				name:"coin",
				count:attackPlayerCoinGet
			}]
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
				coin:defencePlayerDoc.resources.coin,
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
			alliance:createAllianceData(defenceAllianceDoc),
			rewards:[{
				type:"resources",
				name:"coin",
				count:-attackPlayerCoinGet
			}]
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
		cityBeStriked:cityBeStrikedReport
	}

	return {reportForAttackPlayer:reportForAttackPlayer, reportForDefencePlayer:reportForDefencePlayer}
}

/**
 * 创建进攻联盟村落并和村落野怪战斗的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @param dragonFightData
 * @param soldierFightData
 * @returns {*}
 */
Utils.createAttackVillageFightWithVillageTroopReport = function(attackAllianceDoc, attackPlayerDoc, defenceAllianceDoc, defenceVillage, dragonFightData, soldierFightData){
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
	var getDragonExpAdd = function(kill){
		return Math.floor(kill * AllianceInit.floatInit.dragonExpByKilledCitizen.value)
	}
	var getBlood = function(totalKill, isWinner){
		var blood = totalKill * AllianceInit.floatInit.bloodByKilledCitizen.value
		return Math.floor(blood * (isWinner ? 0.7 : 0.3))
	}
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag
		}
		return data
	}
	var createDragonData = function(dragonAfterFight, expAdd){
		var dragonData = {
			type:dragonAfterFight.type,
			level:dragonAfterFight.level,
			expAdd:expAdd,
			hp:dragonAfterFight.totalHp,
			hpDecreased:dragonAfterFight.totalHp - dragonAfterFight.currentHp
		}
		return dragonData
	}
	var pushBloodToRewards = function(bloodCount, rewards){
		if(bloodCount > 0){
			var reward = {
				type:"resources",
				name:"blood",
				count:bloodCount
			}
			rewards.push(reward)
		}
	}

	var attackPlayerKilledCitizen = getKilledCitizen(soldierFightData.attackSoldiersAfterFight)
	var attackDragonExpAdd = getDragonExpAdd(attackPlayerKilledCitizen)
	var attackPlayerGetBlood = getBlood(attackPlayerKilledCitizen)
	var attackPlayerRewards = []
	pushBloodToRewards(attackPlayerGetBlood, attackPlayerRewards)

	var attackVillageReport = {
		attackTarget:{
			type:defenceVillage.type,
			level:defenceVillage.level,
			location:defenceVillage.location,
			alliance:createAllianceData(defenceAllianceDoc)
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			dragon:createDragonData(dragonFightData.attackDragonAfterFight, attackDragonExpAdd),
			soldiers:createSoldiersDataAfterFight(soldierFightData.attackSoldiersAfterFight),
			rewards:attackPlayerRewards
		},
		defenceVillageData:{
			id:defenceVillage.id,
			type:defenceVillage.type,
			level:defenceVillage.level,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:createDragonData(dragonFightData.defenceDragonAfterFight, 0),
			soldiers:createSoldiersDataAfterFight(soldierFightData.defenceSoldiersAfterFight)
		},
		fightWithDefenceVillageReports:{
			attackPlayerDragonFightData:createDragonFightData(dragonFightData.attackDragonAfterFight),
			defenceVillageDragonFightData:createDragonFightData(dragonFightData.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:soldierFightData.attackRoundDatas,
			defenceVillageSoldierRoundDatas:soldierFightData.defenceRoundDatas
		}
	}

	var report = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.AttackVillage,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		attackVillage:attackVillageReport
	}

	var countData = {
		attackPlayerKill:attackPlayerKilledCitizen,
		attackDragonExpAdd:attackDragonExpAdd
	}
	return {report:report, countData:countData}
}

/**
 * 创建进攻联盟村落并和正在采集村落的部队战斗的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @param defencePlayerDoc
 * @param dragonFightData
 * @param soldierFightData
 * @returns {*}
 */
Utils.createAttackVillageFightWithDefenceTroopReport = function(attackAllianceDoc, attackPlayerDoc, defenceAllianceDoc, defenceVillage, defencePlayerDoc, dragonFightData, soldierFightData){
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
	var getDragonExpAdd = function(kill){
		return Math.floor(kill * AllianceInit.floatInit.dragonExpByKilledCitizen.value)
	}
	var getBlood = function(totalKill, isWinner){
		var blood = totalKill * AllianceInit.floatInit.bloodByKilledCitizen.value
		return Math.floor(blood * (isWinner ? 0.7 : 0.3))
	}
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag
		}
		return data
	}
	var createDragonData = function(dragonAfterFight, expAdd){
		var dragonData = {
			type:dragonAfterFight.type,
			level:dragonAfterFight.level,
			expAdd:expAdd,
			hp:dragonAfterFight.totalHp,
			hpDecreased:dragonAfterFight.totalHp - dragonAfterFight.currentHp
		}
		return dragonData
	}
	var pushBloodToRewards = function(bloodCount, rewards){
		if(bloodCount > 0){
			var reward = {
				type:"resources",
				name:"blood",
				count:bloodCount
			}
			rewards.push(reward)
		}
	}

	var attackPlayerKilledCitizen = getKilledCitizen(soldierFightData.attackSoldiersAfterFight)
	var attackDragonExpAdd = getDragonExpAdd(attackPlayerKilledCitizen)
	var attackPlayerGetBlood = getBlood(attackPlayerKilledCitizen)
	var attackPlayerRewards = []
	pushBloodToRewards(attackPlayerGetBlood, attackPlayerRewards)
	var defencePlayerKilledCitizen = getKilledCitizen(soldierFightData.defenceSoldiersAfterFight)
	var defenceDragonExpAdd = getDragonExpAdd(defencePlayerKilledCitizen)
	var defencePlayerGetBlood = getBlood(defencePlayerKilledCitizen)
	var defencePlayerRewards = []
	pushBloodToRewards(defencePlayerGetBlood, defencePlayerRewards)

	var attackVillageReport = {
		attackTarget:{
			type:defenceVillage.type,
			level:defenceVillage.level,
			location:defenceVillage.location,
			alliance:createAllianceData(defenceAllianceDoc)
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			dragon:createDragonData(dragonFightData.attackDragonAfterFight, attackDragonExpAdd),
			soldiers:createSoldiersDataAfterFight(soldierFightData.attackSoldiersAfterFight),
			rewards:attackPlayerRewards
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:createDragonData(dragonFightData.defenceDragonAfterFight, defenceDragonExpAdd),
			soldiers:createSoldiersDataAfterFight(soldierFightData.defenceSoldiersAfterFight),
			rewards:defencePlayerRewards
		},
		fightWithDefenceVillageReports:{
			attackPlayerDragonFightData:createDragonFightData(dragonFightData.attackDragonAfterFight),
			defencePlayerDragonFightData:createDragonFightData(dragonFightData.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:soldierFightData.attackRoundDatas,
			defencePlayerSoldierRoundDatas:soldierFightData.defenceRoundDatas
		}
	}

	var report = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.AttackVillage,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		attackVillage:attackVillageReport
	}

	var countData = {
		attackPlayerKill:attackPlayerKilledCitizen,
		attackDragonExpAdd:attackDragonExpAdd,
		defencePlayerKill:defencePlayerKilledCitizen,
		defenceDragonExpAdd:defenceDragonExpAdd
	}
	return {report:report, countData:countData}
}

/**
 * 创建采集村落回城战报
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @param rewards
 * @returns {*}
 */
Utils.createCollectVillageReport = function(defenceAllianceDoc, defenceVillage, rewards){
	var collectResource = {
		collectTarget:{
			type:defenceVillage.type,
			level:defenceVillage.level,
			location:defenceVillage.location,
			alliance:{
				id:defenceAllianceDoc._id,
				name:defenceAllianceDoc.basicInfo.name,
				tag:defenceAllianceDoc.basicInfo.tag
			}
		},
		rewards:rewards
	}

	var report = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.CollectResource,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		collectResource:collectResource
	}
	return report
}
