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
 * 创建攻打玩家城市和协防玩家作战的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @param helpDefencePlayerDoc
 * @param dragonFightData
 * @param soldierFightData
 * @returns {*}
 */
Utils.createAttackCityFightWithHelpDefencePlayerReport = function(attackAllianceDoc, attackPlayerDoc, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, dragonFightData, soldierFightData){
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
	var helpDefencePlayerKilledCitizen = getKilledCitizen(soldierFightData.defenceSoldiersAfterFight)
	var attackDragonExpAdd = getDragonExpAdd(attackPlayerKilledCitizen)
	var helpDefenceDragonExpAdd = getDragonExpAdd(helpDefencePlayerKilledCitizen)
	var attackPlayerGetBlood = getBlood(attackPlayerKilledCitizen + helpDefencePlayerKilledCitizen, _.isEqual(Consts.FightResult.AttackWin, soldierFightData.fightResult))
	var helpDefencePlayerGetBlood = getBlood(attackPlayerKilledCitizen + helpDefencePlayerKilledCitizen, _.isEqual(Consts.FightResult.DefenceWin, soldierFightData.fightResult))

	var attackPlayerRewards = []
	var helpDefencePlayerRewards = []

	pushBloodToRewards(attackPlayerGetBlood, attackPlayerRewards)
	pushBloodToRewards(helpDefencePlayerGetBlood, helpDefencePlayerRewards)

	var attackCityReport = {
		isRenamed:false,
		attackTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			cityName:defencePlayerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defenceAllianceDoc.basicInfo.terrain
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			fightWithHelpDefenceTroop:{
				dragon:createDragonData(dragonFightData.attackDragonAfterFight, attackDragonExpAdd),
				soldiers:createSoldiersDataAfterFight(soldierFightData.attackSoldiersAfterFight)
			},
			rewards:attackPlayerRewards
		},
		helpDefencePlayerData:{
			id:helpDefencePlayerDoc._id,
			name:helpDefencePlayerDoc.basicInfo.name,
			icon:helpDefencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:createDragonData(dragonFightData.defenceDragonAfterFight, helpDefenceDragonExpAdd),
			soldiers:createSoldiersDataAfterFight(soldierFightData.defenceSoldiersAfterFight),
			rewards:helpDefencePlayerRewards
		},
		fightWithHelpDefencePlayerReports:{
			attackPlayerDragonFightData:createDragonFightData(dragonFightData.attackDragonAfterFight),
			defencePlayerDragonFightData:createDragonFightData(dragonFightData.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:soldierFightData.attackRoundDatas,
			defencePlayerSoldierRoundDatas:soldierFightData.defenceRoundDatas
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
		attackPlayerKill:attackPlayerKilledCitizen,
		attackDragonExpAdd:attackDragonExpAdd,
		defencePlayerKill:helpDefencePlayerKilledCitizen,
		defenceDragonExpAdd:helpDefenceDragonExpAdd
	}
	return {report:report, countData:countData}
}

/**
 * 创建攻打玩家城市和防守玩家作战的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragonForFight
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @param dragonFightData
 * @param soldierFightData
 * @param wallFightData
 * @returns {*}
 */
Utils.createAttackCityFightWithDefencePlayerReport = function(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, attackSoldiersForFight, defenceAllianceDoc, defencePlayerDoc, dragonFightData, soldierFightData, wallFightData){
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
	var getSoldiersLoadTotal = function(soldiersForFight){
		var loadTotal = 0
		_.each(soldiersForFight, function(soldierForFight){
			loadTotal += soldierForFight.currentCount * soldierForFight.load
		})
		return loadTotal
	}

	var attackPlayerKilledCitizenWithDefenceSoldiers = _.isObject(soldierFightData) ? getKilledCitizen(soldierFightData.attackSoldiersAfterFight) : 0
	var defenceWallHpDecreased = _.isObject(wallFightData) ? wallFightData.defenceWallAfterFight.totalHp - wallFightData.defenceWallAfterFight.currentHp : 0
	var attackPlayerKilledCitizenWithDefenceWall = Math.floor(defenceWallHpDecreased * AllianceInit.floatInit.citizenCountPerWallHp.value)
	var defencePlayerKilledCitizenBySoldiers = _.isObject(soldierFightData) ? getKilledCitizen(soldierFightData.defenceSoldiersAfterFight) : 0
	var defencePlayerKilledCitizenByWall = _.isObject(wallFightData) ? getKilledCitizen(wallFightData.defenceWallAfterFight) : 0
	var attackDragonExpAdd = getDragonExpAdd(attackPlayerKilledCitizenWithDefenceSoldiers)
	var defenceDragonExpAdd = getDragonExpAdd(defencePlayerKilledCitizenBySoldiers)
	var attackPlayerGetBloodWithDefenceSoldiers = _.isObject(soldierFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceSoldiers + defencePlayerKilledCitizenBySoldiers, _.isEqual(Consts.FightResult.AttackWin, soldierFightData.fightResult)) : 0
	var attackPlayerGetBloodWithDefenceWall = _.isObject(wallFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceWall + defencePlayerKilledCitizenByWall, _.isEqual(Consts.FightResult.AttackWin, wallFightData.fightResult)) : 0
	var defencePlayerGetBloodBySoldiers = _.isObject(soldierFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceSoldiers + defencePlayerKilledCitizenBySoldiers, _.isEqual(Consts.FightResult.DefenceWin, soldierFightData.fightResult)) : 0
	var defencePlayerGetBloodByWall = _.isObject(wallFightData) ? getBlood(attackPlayerKilledCitizenWithDefenceWall + defencePlayerKilledCitizenByWall, _.isEqual(Consts.FightResult.DefenceWin, wallFightData.fightResult)) : 0

	var attackPlayerRewards = []
	var defencePlayerRewards = []

	pushBloodToRewards(attackPlayerGetBloodWithDefenceSoldiers + attackPlayerGetBloodWithDefenceWall, attackPlayerRewards)
	pushBloodToRewards(defencePlayerGetBloodBySoldiers + defencePlayerGetBloodByWall, defencePlayerRewards)

	if(!_.isObject(soldierFightData) || _.isEqual(Consts.FightResult.AttackWin, soldierFightData.fightResult)){
		var attackDragonCurrentHp = attackDragonForFight.currentHp
		var coinGet = defencePlayerDoc.resources.coin >= attackDragonCurrentHp ? attackDragonCurrentHp : defencePlayerDoc.resources.coin
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

		var defencePlayerResources = defencePlayerDoc.resources
		var defencePlayerResourceTotal = defencePlayerResources.wood + defencePlayerResources.stone + defencePlayerResources.iron + defencePlayerResources.food
		var attackPlayerLoadTotal = getSoldiersLoadTotal(attackSoldiersForFight)
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
		isRenamed:false,
		attackTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			cityName:defencePlayerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defenceAllianceDoc.basicInfo.terrain
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			fightWithDefenceTroop:!_.isObject(soldierFightData) ? null : {
				dragon:createDragonData(dragonFightData.attackDragonAfterFight, attackDragonExpAdd),
				soldiers:createSoldiersDataAfterFight(soldierFightData.attackSoldiersAfterFight)
			},
			fightWithDefenceWall:!_.isObject(wallFightData) ? null : {
				soldiers:createSoldiersDataAfterFight(wallFightData.attackSoldiersAfterFight)
			},
			rewards:attackPlayerRewards
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:!_.isObject(dragonFightData) ? null : createDragonData(dragonFightData.defenceDragonAfterFight, defenceDragonExpAdd),
			soldiers:!_.isObject(soldierFightData) ? null : createSoldiersDataAfterFight(soldierFightData.defenceSoldiersAfterFight),
			wall:!_.isObject(wallFightData) ? null : {
				hp:wallFightData.defenceWallAfterFight.totalHp,
				hpDecreased:wallFightData.defenceWallAfterFight.totalHp - wallFightData.defenceWallAfterFight.currentHp
			},
			rewards:defencePlayerRewards
		},
		fightWithDefencePlayerReports:!_.isObject(soldierFightData) && !_.isObject(wallFightData) ? null : {
			attackPlayerDragonFightData:!_.isObject(dragonFightData) ? null : createDragonFightData(dragonFightData.attackDragonAfterFight),
			defencePlayerDragonFightData:!_.isObject(dragonFightData) ? null : createDragonFightData(dragonFightData.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:!_.isObject(soldierFightData) ? null : soldierFightData.attackRoundDatas,
			defencePlayerSoldierRoundDatas:!_.isObject(soldierFightData) ? null : soldierFightData.defenceRoundDatas,
			attackPlayerWallRoundDatas:!_.isObject(wallFightData) ? null : wallFightData.attackRoundDatas,
			defencePlayerWallRoundDatas:!_.isObject(wallFightData) ? null : wallFightData.defenceRoundDatas
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
		attackPlayerKill:attackPlayerKilledCitizenWithDefenceSoldiers + attackPlayerKilledCitizenWithDefenceWall,
		attackDragonExpAdd:attackDragonExpAdd,
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
	var getReportLevel = function(powerCompare){
		var reportLevel = null
		if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.E
		else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 2 && powerCompare < 4) reportLevel = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 4 && powerCompare < 6) reportLevel = Consts.DragonStrikeReportLevel.A
		else reportLevel = Consts.DragonStrikeReportLevel.S
		return reportLevel
	}
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
	var getSoldiersInTroop = function(playerDoc, soldiersInTroop){
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
		level:getReportLevel(dragonFightData.powerCompare),
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			cityName:defencePlayerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
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
			soldiers:getSoldiersInTroop(helpDefencePlayerDoc, defencePlayerDoc.helpedByTroops[0].soldiers)
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
	var getReportLevel = function(powerCompare){
		var reportLevel = null
		if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.E
		else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 2 && powerCompare < 4) reportLevel = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 4 && powerCompare < 6) reportLevel = Consts.DragonStrikeReportLevel.A
		else reportLevel = Consts.DragonStrikeReportLevel.S
		return reportLevel
	}
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
		level:getReportLevel(dragonFightData.powerCompare),
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			cityName:defencePlayerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
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
 * 创建突袭玩家城市无协防无防守龙的战报
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
			alliance:createAllianceData(defenceAllianceDoc),
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
		type:Consts.PlayerReportType.CityBeStriked,
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
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defenceAllianceDoc.basicInfo.terrain
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
 * @param targetAllianceDoc
 * @param defenceVillage
 * @param defencePlayerDoc
 * @param dragonFightData
 * @param soldierFightData
 * @returns {*}
 */
Utils.createAttackVillageFightWithDefenceTroopReport = function(attackAllianceDoc, attackPlayerDoc, targetAllianceDoc, defenceVillage, defenceAllianceDoc, defencePlayerDoc, dragonFightData, soldierFightData){
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
			alliance:createAllianceData(targetAllianceDoc),
			terrain:defenceAllianceDoc.basicInfo.terrain
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
		fightWithDefencePlayerReports:{
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
 * 创建突袭村落和村落的采集者的龙发生战斗
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragonForFight
 * @param targetAllianceDoc
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @param defenceVillageEvent
 * @param defencePlayerDoc
 * @param defenceDragonForFight
 * @param dragonFightData
 * @returns {*}
 */
Utils.createStrikeVillageFightWithDefencePlayerDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, targetAllianceDoc, defenceVillage, defenceAllianceDoc, defenceVillageEvent, defencePlayerDoc, defenceDragonForFight, dragonFightData){
	var getReportLevel = function(powerCompare){
		var reportLevel = null
		if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.E
		else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 2 && powerCompare < 4) reportLevel = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 4 && powerCompare < 6) reportLevel = Consts.DragonStrikeReportLevel.A
		else reportLevel = Consts.DragonStrikeReportLevel.S
		return reportLevel
	}
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
	var getSoldiersInTroop = function(playerDoc, soldiersInTroop){
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
	var strikeVillageReport = {
		level:getReportLevel(dragonFightData.powerCompare),
		strikeTarget:{
			type:defenceVillage.type,
			level:defenceVillage.level,
			location:defenceVillage.location,
			alliance:createAllianceData(targetAllianceDoc),
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
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:_.extend(
				{
					equipments:getDragonEquipments(defencePlayerDoc.dragons[defenceDragonForFight.type]),
					skills:getDragonSkills(defencePlayerDoc.dragons[defenceDragonForFight.type])
				},
				defenceDragonData
			),
			soldiers:getSoldiersInTroop(defencePlayerDoc, defenceVillageEvent.playerData.soldiers)
		}
	}

	var villageBeStrikedReport = {
		level:strikeVillageReport.level,
		strikeTarget:strikeVillageReport.strikeTarget,
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
			rewards:[]
		}
	}

	var reportForAttackPlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeVillage,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		strikeVillage:strikeVillageReport
	}
	var reportForDefencePlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.VillageBeStriked,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		villageBeStriked:villageBeStrikedReport
	}

	return {reportForAttackPlayer:reportForAttackPlayer, reportForDefencePlayer:reportForDefencePlayer}
}

/**
 * 创建突袭村落和村落的龙发生战斗
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragonForFight
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @param villageDragonForFight
 * @param dragonFightData
 * @returns {*}
 */
Utils.createStrikeVillageFightWithVillageDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragonForFight, defenceAllianceDoc, defenceVillage, villageDragonForFight, dragonFightData){
	var getReportLevel = function(powerCompare){
		var reportLevel = null
		if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.E
		else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 2 && powerCompare < 4) reportLevel = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 4 && powerCompare < 6) reportLevel = Consts.DragonStrikeReportLevel.A
		else reportLevel = Consts.DragonStrikeReportLevel.S
		return reportLevel
	}
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

	var attackDragonData = createDragonData(dragonFightData.attackDragonAfterFight)
	var defenceDragonData = createDragonData(dragonFightData.defenceDragonAfterFight)
	var strikeVillageReport = {
		level:getReportLevel(dragonFightData.powerCompare),
		strikeTarget:{
			type:defenceVillage.type,
			level:defenceVillage.level,
			location:defenceVillage.location,
			alliance:createAllianceData(defenceAllianceDoc),
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
		defenceVillageData:{
			type:defenceVillage.type,
			level:defenceVillage.level,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:_.extend(
				{
					equipments:[],
					skills:[]
				},
				defenceDragonData
			),
			soldiers:defenceVillage.soldiers
		}
	}

	var reportForAttackPlayer = {
		id:ShortId.generate(),
		type:Consts.PlayerReportType.StrikeVillage,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		strikeVillage:strikeVillageReport
	}

	return reportForAttackPlayer
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
