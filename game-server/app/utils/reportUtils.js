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
var Soldiers = GameDatas.Soldiers
var AllianceInitData = GameDatas.AllianceInitData
var BuildingFunction = GameDatas.BuildingFunction
var Items = GameDatas.Items
var Vip = GameDatas.Vip

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
				if(DataUtils.isNormalSoldier(soldier.name)){
					var soldierFullKey = soldier.name + "_" + soldier.star
					config = Soldiers.normal[soldierFullKey]
					killed += soldier.count * config.killScore
				}else{
					config = Soldiers.special[soldier.name]
					killed += soldier.count * config.killScore
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

	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag
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

	var attackDragon = attackPlayerDoc.dragons[dragonFightData.attackDragonAfterFight.type]
	var attackPlayerKilledCitizen = getKilledCitizen(soldierFightData.attackSoldiersAfterFight)
	var helpDefenceDragon = helpDefencePlayerDoc.dragons[dragonFightData.defenceDragonAfterFight.type]
	var helpDefencePlayerKilledCitizen = getKilledCitizen(soldierFightData.defenceSoldiersAfterFight)
	var attackDragonExpAdd = DataUtils.getDragonExpAdd(attackPlayerKilledCitizen)
	var helpDefenceDragonExpAdd = DataUtils.getDragonExpAdd(helpDefencePlayerKilledCitizen)
	var attackPlayerGetBlood = DataUtils.getBloodAdd(attackDragon, attackPlayerKilledCitizen + helpDefencePlayerKilledCitizen, _.isEqual(Consts.FightResult.AttackWin, soldierFightData.fightResult))
	var helpDefencePlayerGetBlood = DataUtils.getBloodAdd(helpDefenceDragon, attackPlayerKilledCitizen + helpDefencePlayerKilledCitizen, _.isEqual(Consts.FightResult.DefenceWin, soldierFightData.fightResult))

	var attackPlayerRewards = []
	var helpDefencePlayerRewards = []

	pushBloodToRewards(attackPlayerGetBlood, attackPlayerRewards)
	pushBloodToRewards(helpDefencePlayerGetBlood, helpDefencePlayerRewards)
	LogicUtils.mergeRewards(attackPlayerRewards, DataUtils.getRewardsByKillScoreAndTerrain(attackPlayerKilledCitizen, defenceAllianceDoc.basicInfo.terrain))
	LogicUtils.mergeRewards(helpDefencePlayerRewards, DataUtils.getRewardsByKillScoreAndTerrain(helpDefencePlayerKilledCitizen, defenceAllianceDoc.basicInfo.terrain))

	var attackCityReport = {
		attackTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defencePlayerDoc.basicInfo.terrain
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
 * @param attackSoldiersForFight
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
				if(DataUtils.isNormalSoldier(soldier.name)){
					var soldierFullKey = soldier.name + "_" + soldier.star
					config = Soldiers.normal[soldierFullKey]
					killed += soldier.count * config.killScore
				}else{
					config = Soldiers.special[soldier.name]
					killed += soldier.count * config.killScore
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
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag
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
	var getDragonSkillResourceLootPercentAdd = function(dragon){
		var skillBuff = DataUtils.getDragonSkillBuff(dragon, "greedy")
		return skillBuff
	}
	var getPlayerItemBuffForResourceLootPercentSubtract = function(playerDoc){
		var itemBuff = 0
		var eventType = "masterOfDefender"
		var itemEvent = _.find(playerDoc.itemEvents, function(event){
			return _.isEqual(event.type, eventType)
		})
		if(_.isObject(itemEvent)) itemBuff = Items.buffTypes.masterOfDefender.effect2
		return itemBuff
	}
	var getBuildingBuffForResourceProtectPercent = function(playerDoc, resourceName){
		var buildingName = Consts.ResourceBuildingMap[resourceName]
		var buildings = LogicUtils.getPlayerBuildingsByType(playerDoc, buildingName)
		var protectPercent = 0
		_.each(buildings, function(building){
			if(building.level >= 1){
				var config = BuildingFunction[buildingName][building.level]
				protectPercent += config.protection
			}
		})
		return protectPercent
	}
	var getDefencePlayerResourceProtectCount = function(defencePlayerDoc, resourceName, attackDragon){
		var basePercent = DataUtils.getPlayerIntInit("playerResourceProtectPercent") / 100
		var buildingBuffAddPercent = getBuildingBuffForResourceProtectPercent(defencePlayerDoc, resourceName)
		var itemBuffAddPercent = getPlayerItemBuffForResourceLootPercentSubtract(defencePlayerDoc)
		var vipBuffAddPercent = Vip.level[defencePlayerDoc.vipEvents.length > 0 ? DataUtils.getPlayerVipLevel(defencePlayerDoc) : 0].storageProtectAdd
		var attackDragonBuffSubtractPercent = getDragonSkillResourceLootPercentAdd(attackDragon)
		var finalPercent = (basePercent * (1 + buildingBuffAddPercent + itemBuffAddPercent + vipBuffAddPercent)) - attackDragonBuffSubtractPercent
		finalPercent = finalPercent > 0.9 ? 0.9 : finalPercent < 0.1 ? 0.1 : finalPercent
		return Math.floor(DataUtils.getPlayerResourceUpLimit(defencePlayerDoc, resourceName) * finalPercent)
	}

	var attackPlayerKilledCitizenWithDefenceSoldiers = _.isObject(soldierFightData) ? getKilledCitizen(soldierFightData.attackSoldiersAfterFight) : 0
	var defenceWallHpDecreased = _.isObject(wallFightData) ? wallFightData.defenceWallAfterFight.totalHp - wallFightData.defenceWallAfterFight.currentHp : 0
	var attackPlayerKilledCitizenWithDefenceWall = Math.floor(defenceWallHpDecreased * AllianceInitData.intInit.KilledCitizenPerWallHp.value)
	var defencePlayerKilledCitizenBySoldiers = _.isObject(soldierFightData) ? getKilledCitizen(soldierFightData.defenceSoldiersAfterFight) : 0
	var defencePlayerKilledCitizenByWall = _.isObject(wallFightData) ? getKilledCitizen([wallFightData.defenceWallAfterFight]) : 0
	var attackDragon = attackPlayerDoc.dragons[attackDragonForFight.type]
	var attackDragonExpAdd = DataUtils.getDragonExpAdd(attackPlayerKilledCitizenWithDefenceSoldiers)
	var defenceDragon = _.isObject(dragonFightData) ? defencePlayerDoc.dragons[dragonFightData.defenceDragonAfterFight.type] : null
	var defenceDragonExpAdd = DataUtils.getDragonExpAdd(defencePlayerKilledCitizenBySoldiers)
	var attackPlayerGetBloodWithDefenceSoldiers = _.isObject(soldierFightData) ? DataUtils.getBloodAdd(attackDragon, attackPlayerKilledCitizenWithDefenceSoldiers + defencePlayerKilledCitizenBySoldiers, _.isEqual(Consts.FightResult.AttackWin, soldierFightData.fightResult)) : 0
	var attackPlayerGetBloodWithDefenceWall = _.isObject(wallFightData) ? DataUtils.getBloodAdd(null, attackPlayerKilledCitizenWithDefenceWall + defencePlayerKilledCitizenByWall, _.isEqual(Consts.FightResult.AttackWin, wallFightData.fightResult)) : 0
	var defencePlayerGetBloodBySoldiers = _.isObject(soldierFightData) ? DataUtils.getBloodAdd(defenceDragon, attackPlayerKilledCitizenWithDefenceSoldiers + defencePlayerKilledCitizenBySoldiers, _.isEqual(Consts.FightResult.DefenceWin, soldierFightData.fightResult)) : 0
	var defencePlayerGetBloodByWall = _.isObject(wallFightData) ? DataUtils.getBloodAdd(null, attackPlayerKilledCitizenWithDefenceWall + defencePlayerKilledCitizenByWall, _.isEqual(Consts.FightResult.DefenceWin, wallFightData.fightResult)) : 0

	var attackPlayerRewards = []
	var defencePlayerRewards = []

	pushBloodToRewards(attackPlayerGetBloodWithDefenceSoldiers + attackPlayerGetBloodWithDefenceWall, attackPlayerRewards)
	pushBloodToRewards(defencePlayerGetBloodBySoldiers + defencePlayerGetBloodByWall, defencePlayerRewards)

	if(!_.isObject(soldierFightData) || _.isEqual(Consts.FightResult.AttackWin, soldierFightData.fightResult)){
		var attackDragonCurrentHp = attackDragonForFight.currentHp
		var coinCanGet = attackDragonCurrentHp * 100
		var coinGet = defencePlayerDoc.resources.coin >= coinCanGet ? coinCanGet : defencePlayerDoc.resources.coin
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
		var woodProtectCount = getDefencePlayerResourceProtectCount(defencePlayerDoc, "wood", attackDragon)
		var stoneProtectCount = getDefencePlayerResourceProtectCount(defencePlayerDoc, "stone", attackDragon)
		var ironProtectCount = getDefencePlayerResourceProtectCount(defencePlayerDoc, "iron", attackDragon)
		var foodProtectCount = getDefencePlayerResourceProtectCount(defencePlayerDoc, "food", attackDragon)
		var woodLootCount = defencePlayerResources.wood > woodProtectCount ? defencePlayerResources.wood - woodProtectCount : 0
		var stoneLootCount = defencePlayerResources.stone > stoneProtectCount ? defencePlayerResources.stone - woodProtectCount : 0
		var ironLootCount = defencePlayerResources.iron > ironProtectCount ? defencePlayerResources.iron - woodProtectCount : 0
		var foodLootCount = defencePlayerResources.food > foodProtectCount ? defencePlayerResources.food - woodProtectCount : 0
		var resourceLootTotal = woodLootCount + stoneLootCount + ironLootCount + foodLootCount
		var attackPlayerLoadTotal = getSoldiersLoadTotal(attackSoldiersForFight)
		var canLootPercent = resourceLootTotal > 0 ? attackPlayerLoadTotal / resourceLootTotal : 0
		canLootPercent = canLootPercent > 1 ? 1 : canLootPercent
		attackPlayerRewards.push({
			type:"resources",
			name:"wood",
			count:Math.floor(woodLootCount * canLootPercent)
		})
		defencePlayerRewards.push({
			type:"resources",
			name:"wood",
			count:-Math.floor(woodLootCount * canLootPercent)
		})
		attackPlayerRewards.push({
			type:"resources",
			name:"stone",
			count:Math.floor(stoneLootCount * canLootPercent)
		})
		defencePlayerRewards.push({
			type:"resources",
			name:"stone",
			count:-Math.floor(stoneLootCount * canLootPercent)
		})
		attackPlayerRewards.push({
			type:"resources",
			name:"iron",
			count:Math.floor(ironLootCount * canLootPercent)
		})
		defencePlayerRewards.push({
			type:"resources",
			name:"iron",
			count:-Math.floor(ironLootCount * canLootPercent)
		})
		attackPlayerRewards.push({
			type:"resources",
			name:"food",
			count:Math.floor(foodLootCount * canLootPercent)
		})
		defencePlayerRewards.push({
			type:"resources",
			name:"food",
			count:-Math.floor(foodLootCount * canLootPercent)
		})
	}
	LogicUtils.mergeRewards(attackPlayerRewards, DataUtils.getRewardsByKillScoreAndTerrain(attackPlayerKilledCitizenWithDefenceSoldiers + attackPlayerKilledCitizenWithDefenceWall, defenceAllianceDoc.basicInfo.terrain))
	LogicUtils.mergeRewards(defencePlayerRewards, DataUtils.getRewardsByKillScoreAndTerrain(defencePlayerKilledCitizenBySoldiers + defencePlayerKilledCitizenByWall, defenceAllianceDoc.basicInfo.terrain))

	var attackCityReport = {
		attackTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defencePlayerDoc.basicInfo.terrain
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
 * @param attackDragon
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @param helpDefencePlayerDoc
 * @param helpDefenceDragon
 * @returns {*}
 */
Utils.createStrikeCityFightWithHelpDefenceDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, helpDefencePlayerDoc, helpDefenceDragon){
	var getReportLevel = function(powerCompare){
		var reportLevel = null
		if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 2 && powerCompare < 3) reportLevel = Consts.DragonStrikeReportLevel.A
		else reportLevel = Consts.DragonStrikeReportLevel.S
		return reportLevel
	}
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag
		}
		return data
	}
	var createDragonData = function(dragon, hpDecreased){
		var dragonData = {
			type:dragon.type,
			level:dragon.level,
			hp:dragon.hp,
			hpDecreased:hpDecreased
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
	var getMilitaryTechs = function(playerDoc){
		var techs = []
		_.each(playerDoc.militaryTechs, function(tech, name){
			if(tech.level > 0)techs.push({name:name, level:tech.level})
		})
		return techs
	}

	var attackDragonPower = DataUtils.getDragonStrength(attackDragon, defencePlayerDoc.basicInfo.terrain)
	var defenceDragonPower = DataUtils.getDragonStrength(helpDefenceDragon, defencePlayerDoc.basicInfo.terrain)
	var powerCompare = attackDragonPower / defenceDragonPower
	var attackDragonMaxHp = DataUtils.getDragonMaxHp(attackDragon)
	var attackDragonHpDecreasedPercent = AllianceInitData.intInit.dragonStrikeHpDecreasedPercent.value / 100
	var attackDragonHpDecreased = Math.ceil(attackDragonMaxHp * attackDragonHpDecreasedPercent)
	attackDragonHpDecreased = attackDragonHpDecreased > attackDragon.hp ? attackDragon.hp : attackDragonHpDecreased
	var attackDragonData = createDragonData(attackDragon, attackDragonHpDecreased)
	var defenceDragonData = createDragonData(helpDefenceDragon, 0)

	var strikeCityReport = {
		level:getReportLevel(powerCompare),
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defencePlayerDoc.basicInfo.terrain,
			fogOfTrick:DataUtils.isPlayerHasItemEvent(defencePlayerDoc, "fogOfTrick")
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			dragon:attackDragonData
		},
		helpDefencePlayerData:{
			id:helpDefencePlayerDoc._id,
			name:helpDefencePlayerDoc.basicInfo.name,
			icon:helpDefencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:_.extend(
				{
					equipments:getDragonEquipments(helpDefenceDragon),
					skills:getDragonSkills(helpDefenceDragon)
				},
				defenceDragonData
			),
			soldiers:getSoldiersInTroop(helpDefencePlayerDoc, defencePlayerDoc.helpedByTroops[0].soldiers),
			militaryTechs:getMilitaryTechs(helpDefencePlayerDoc)
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
					equipments:getDragonEquipments(attackDragon)
				},
				attackDragonData
			)
		},
		helpDefencePlayerData:{
			id:helpDefencePlayerDoc._id,
			name:helpDefencePlayerDoc.basicInfo.name,
			icon:helpDefencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:defenceDragonData
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

	return {
		reportForAttackPlayer:reportForAttackPlayer,
		reportForDefencePlayer:reportForDefencePlayer,
		powerCompare:powerCompare
	}
}

/**
 * 创建突袭玩家城市和防守玩家的龙发生战斗的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragon
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @param defenceDragon
 * @returns {*}
 */
Utils.createStrikeCityFightWithDefenceDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc, defenceDragon){
	var getReportLevel = function(powerCompare){
		var reportLevel = null
		if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 2 && powerCompare < 3) reportLevel = Consts.DragonStrikeReportLevel.A
		else reportLevel = Consts.DragonStrikeReportLevel.S
		return reportLevel
	}
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag
		}
		return data
	}
	var createDragonData = function(dragon, hpDecreased){
		var dragonData = {
			type:dragon.type,
			level:dragon.level,
			hp:dragon.hp,
			hpDecreased:hpDecreased
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
	var getDefenceSoldiers = function(playerDoc){
		var soldiers = DataUtils.getPlayerDefenceSoldiers(playerDoc)
		_.each(soldiers, function(soldier){
			soldier.star = playerDoc.soldierStars[soldier.name]
		})
		return soldiers
	}
	var getMilitaryTechs = function(playerDoc){
		var techs = []
		_.each(playerDoc.militaryTechs, function(tech, name){
			if(tech.level > 0)techs.push({name:name, level:tech.level})
		})
		return techs
	}
	var getPlayerItemBuffForResourceLootPercentSubtract = function(playerDoc){
		var itemBuff = 0
		var eventType = "masterOfDefender"
		var itemEvent = _.find(playerDoc.itemEvents, function(event){
			return _.isEqual(event.type, eventType)
		})
		if(_.isObject(itemEvent)) itemBuff = Items.buffTypes.masterOfDefender.effect2
		return itemBuff
	}
	var getBuildingBuffForResourceProtectPercent = function(playerDoc, resourceName){
		var buildingName = Consts.ResourceBuildingMap[resourceName]
		var buildings = LogicUtils.getPlayerBuildingsByType(playerDoc, buildingName)
		var protectPercent = 0
		_.each(buildings, function(building){
			if(building.level >= 1){
				var config = BuildingFunction[buildingName][building.level]
				protectPercent += config.protection
			}
		})
		return protectPercent
	}
	var getPlayerResourceProtectCount = function(defencePlayerDoc, resourceName){
		var basePercent = DataUtils.getPlayerIntInit("playerResourceProtectPercent") / 100
		var buildingBuffAddPercent = getBuildingBuffForResourceProtectPercent(defencePlayerDoc, resourceName)
		var itemBuffAddPercent = getPlayerItemBuffForResourceLootPercentSubtract(defencePlayerDoc)
		var vipBuffAddPercent = Vip.level[defencePlayerDoc.vipEvents.length > 0 ? DataUtils.getPlayerVipLevel(defencePlayerDoc) : 0].storageProtectAdd
		var finalPercent = basePercent * (1 + buildingBuffAddPercent + itemBuffAddPercent + vipBuffAddPercent)
		finalPercent = finalPercent > 0.9 ? 0.9 : finalPercent < 0.1 ? 0.1 : finalPercent
		return Math.floor(DataUtils.getPlayerResourceUpLimit(defencePlayerDoc, resourceName) * finalPercent)
	}

	var attackDragonPower = DataUtils.getDragonStrength(attackDragon, defencePlayerDoc.basicInfo.terrain)
	var defenceDragonPower = DataUtils.getDragonStrength(defenceDragon, defencePlayerDoc.basicInfo.terrain)
	var powerCompare = attackDragonPower / defenceDragonPower
	var attackDragonMaxHp = DataUtils.getDragonMaxHp(attackDragon)
	var attackDragonHpDecreasedPercent = AllianceInitData.intInit.dragonStrikeHpDecreasedPercent.value / 100
	var attackDragonHpDecreased = Math.ceil(attackDragonMaxHp * attackDragonHpDecreasedPercent)
	attackDragonHpDecreased = attackDragonHpDecreased > attackDragon.hp ? attackDragon.hp : attackDragonHpDecreased
	var attackDragonData = createDragonData(attackDragon, attackDragonHpDecreased)
	var defenceDragonData = createDragonData(defenceDragon, 0)

	var strikeCityReport = {
		level:getReportLevel(powerCompare),
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defencePlayerDoc.basicInfo.terrain,
			fogOfTrick:DataUtils.isPlayerHasItemEvent(defencePlayerDoc, "fogOfTrick")
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			dragon:attackDragonData
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:_.extend(
				{
					equipments:getDragonEquipments(defenceDragon),
					skills:getDragonSkills(defenceDragon)
				},
				defenceDragonData
			),
			soldiers:getDefenceSoldiers(defencePlayerDoc),
			militaryTechs:getMilitaryTechs(defencePlayerDoc),
			resources:{
				wood:defencePlayerDoc.resources.wood - getPlayerResourceProtectCount(defencePlayerDoc, "wood"),
				stone:defencePlayerDoc.resources.stone - getPlayerResourceProtectCount(defencePlayerDoc, "stone"),
				iron:defencePlayerDoc.resources.iron - getPlayerResourceProtectCount(defencePlayerDoc, "iron"),
				food:defencePlayerDoc.resources.food - getPlayerResourceProtectCount(defencePlayerDoc, "food"),
				coin:defencePlayerDoc.resources.coin
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
					equipments:getDragonEquipments(attackDragon)
				},
				attackDragonData
			)
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:defenceDragonData
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

	return {
		reportForAttackPlayer:reportForAttackPlayer,
		reportForDefencePlayer:reportForDefencePlayer,
		powerCompare:powerCompare
	}
}

/**
 * 创建突袭玩家城市无协防无防守龙的战报
 * @param attackAllianceDoc
 * @param attackPlayerDoc
 * @param attackDragon
 * @param defenceAllianceDoc
 * @param defencePlayerDoc
 * @returns {*}
 */
Utils.createStrikeCityNoDefenceDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragon, defenceAllianceDoc, defencePlayerDoc){
	var reportLevel = Consts.DragonStrikeReportLevel.S
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag
		}
		return data
	}
	var createDragonData = function(dragon, hpDecreased){
		var dragonData = {
			type:dragon.type,
			level:dragon.level,
			hp:dragon.hp,
			hpDecreased:hpDecreased
		}
		return dragonData
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
	var getPlayerItemBuffForResourceLootPercentSubtract = function(playerDoc){
		var itemBuff = 0
		var eventType = "masterOfDefender"
		var itemEvent = _.find(playerDoc.itemEvents, function(event){
			return _.isEqual(event.type, eventType)
		})
		if(_.isObject(itemEvent)) itemBuff = Items.buffTypes.masterOfDefender.effect2
		return itemBuff
	}
	var getBuildingBuffForResourceProtectPercent = function(playerDoc, resourceName){
		var buildingName = Consts.ResourceBuildingMap[resourceName]
		var buildings = LogicUtils.getPlayerBuildingsByType(playerDoc, buildingName)
		var protectPercent = 0
		_.each(buildings, function(building){
			if(building.level >= 1){
				var config = BuildingFunction[buildingName][building.level]
				protectPercent += config.protection
			}
		})
		return protectPercent
	}
	var getPlayerResourceProtectCount = function(defencePlayerDoc, resourceName){
		var basePercent = DataUtils.getPlayerIntInit("playerResourceProtectPercent") / 100
		var buildingBuffAddPercent = getBuildingBuffForResourceProtectPercent(defencePlayerDoc, resourceName)
		var itemBuffAddPercent = getPlayerItemBuffForResourceLootPercentSubtract(defencePlayerDoc)
		var vipBuffAddPercent = Vip.level[defencePlayerDoc.vipEvents.length > 0 ? DataUtils.getPlayerVipLevel(defencePlayerDoc) : 0].storageProtectAdd
		var finalPercent = basePercent * (1 + buildingBuffAddPercent + itemBuffAddPercent + vipBuffAddPercent)
		finalPercent = finalPercent > 0.9 ? 0.9 : finalPercent < 0.1 ? 0.1 : finalPercent
		return Math.floor(DataUtils.getPlayerResourceUpLimit(defencePlayerDoc, resourceName) * finalPercent)
	}

	var attackDragonData = createDragonData(attackDragon, 0)
	var strikeCityReport = {
		level:reportLevel,
		strikeTarget:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			location:LogicUtils.getAllianceMemberMapObjectById(defenceAllianceDoc, defencePlayerDoc._id).location,
			alliance:createAllianceData(defenceAllianceDoc),
			terrain:defencePlayerDoc.basicInfo.terrain,
			fogOfTrick:DataUtils.isPlayerHasItemEvent(defencePlayerDoc, "fogOfTrick")
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			dragon:createDragonData(attackDragon, 0)
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			resources:{
				wood:defencePlayerDoc.resources.wood - getPlayerResourceProtectCount(defencePlayerDoc, "wood"),
				stone:defencePlayerDoc.resources.stone - getPlayerResourceProtectCount(defencePlayerDoc, "stone"),
				iron:defencePlayerDoc.resources.iron - getPlayerResourceProtectCount(defencePlayerDoc, "iron"),
				food:defencePlayerDoc.resources.food - getPlayerResourceProtectCount(defencePlayerDoc, "food"),
				coin:defencePlayerDoc.resources.coin
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
					equipments:getDragonEquipments(attackDragon)
				},
				attackDragonData
			)
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
		type:Consts.PlayerReportType.CityBeStriked,
		createTime:Date.now(),
		isRead:false,
		isSaved:false,
		cityBeStriked:cityBeStrikedReport
	}

	return {reportForAttackPlayer:reportForAttackPlayer, reportForDefencePlayer:reportForDefencePlayer}
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
				if(DataUtils.isNormalSoldier(soldier.name)){
					var soldierFullKey = soldier.name + "_" + soldier.star
					config = Soldiers.normal[soldierFullKey]
					killed += soldier.count * config.killScore
				}else{
					config = Soldiers.special[soldier.name]
					killed += soldier.count * config.killScore
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

	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag
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
	var defencePlayerKilledCitizen = getKilledCitizen(soldierFightData.defenceSoldiersAfterFight)
	var totalKilledCitizen = attackPlayerKilledCitizen + defencePlayerKilledCitizen
	var attackDragon = attackPlayerDoc.dragons[dragonFightData.attackDragonAfterFight.type]
	var attackDragonExpAdd = DataUtils.getDragonExpAdd(attackPlayerKilledCitizen)
	var attackPlayerGetBlood = DataUtils.getBloodAdd(attackDragon, totalKilledCitizen, _.isEqual(Consts.FightResult.AttackWin, soldierFightData.fightResult))
	var defenceDragon = defencePlayerDoc.dragons[dragonFightData.defenceDragonAfterFight.type]
	var defenceDragonExpAdd = DataUtils.getDragonExpAdd(defencePlayerKilledCitizen)
	var defencePlayerGetBlood = DataUtils.getBloodAdd(defenceDragon, totalKilledCitizen, _.isEqual(Consts.FightResult.DefenceWin, soldierFightData.fightResult))

	var attackPlayerRewards = []
	var defencePlayerRewards = []
	pushBloodToRewards(attackPlayerGetBlood, attackPlayerRewards)
	pushBloodToRewards(defencePlayerGetBlood, defencePlayerRewards)
	LogicUtils.mergeRewards(attackPlayerRewards, DataUtils.getRewardsByKillScoreAndTerrain(attackPlayerKilledCitizen, defenceAllianceDoc.basicInfo.terrain))
	LogicUtils.mergeRewards(defencePlayerRewards, DataUtils.getRewardsByKillScoreAndTerrain(defencePlayerKilledCitizen, defenceAllianceDoc.basicInfo.terrain))

	var attackVillageReport = {
		attackTarget:{
			name:defenceVillage.name,
			level:defenceVillage.level,
			location:LogicUtils.getAllianceMapObjectById(targetAllianceDoc, defenceVillage.id).location,
			alliance:createAllianceData(targetAllianceDoc),
			terrain:defencePlayerDoc.basicInfo.terrain
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
 * @param attackDragon
 * @param targetAllianceDoc
 * @param defenceAllianceDoc
 * @param defenceVillage
 * @param defenceVillageEvent
 * @param defencePlayerDoc
 * @param defenceDragon
 * @returns {*}
 */
Utils.createStrikeVillageFightWithDefencePlayerDragonReport = function(attackAllianceDoc, attackPlayerDoc, attackDragon, targetAllianceDoc, defenceVillage, defenceAllianceDoc, defenceVillageEvent, defencePlayerDoc, defenceDragon){
	var getReportLevel = function(powerCompare){
		var reportLevel = null
		if(powerCompare < 1) reportLevel = Consts.DragonStrikeReportLevel.D
		else if(powerCompare >= 1 && powerCompare < 1.5) reportLevel = Consts.DragonStrikeReportLevel.C
		else if(powerCompare >= 1.5 && powerCompare < 2) reportLevel = Consts.DragonStrikeReportLevel.B
		else if(powerCompare >= 2 && powerCompare < 3) reportLevel = Consts.DragonStrikeReportLevel.A
		else reportLevel = Consts.DragonStrikeReportLevel.S
		return reportLevel
	}
	var createAllianceData = function(allianceDoc){
		var data = {
			id:allianceDoc._id,
			name:allianceDoc.basicInfo.name,
			tag:allianceDoc.basicInfo.tag,
			flag:allianceDoc.basicInfo.flag
		}
		return data
	}
	var createDragonData = function(dragon, hpDecreased){
		var dragonData = {
			type:dragon.type,
			level:dragon.level,
			hp:dragon.hp,
			hpDecreased:hpDecreased
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
	var getMilitaryTechs = function(playerDoc){
		var techs = []
		_.each(playerDoc.militaryTechs, function(tech, name){
			if(tech.level > 0)techs.push({name:name, level:tech.level})
		})
		return techs
	}

	var attackDragonPower = DataUtils.getDragonStrength(attackDragon, targetAllianceDoc.basicInfo.terrain)
	var defenceDragonPower = DataUtils.getDragonStrength(defenceDragon, targetAllianceDoc.basicInfo.terrain)
	var powerCompare = attackDragonPower / defenceDragonPower
	var attackDragonMaxHp = DataUtils.getDragonMaxHp(attackDragon)
	var attackDragonHpDecreasedPercent = AllianceInitData.intInit.dragonStrikeHpDecreasedPercent.value / 100
	var attackDragonHpDecreased = Math.ceil(attackDragonMaxHp * attackDragonHpDecreasedPercent)
	attackDragonHpDecreased = attackDragonHpDecreased > attackDragon.hp ? attackDragon.hp : attackDragonHpDecreased
	var attackDragonData = createDragonData(attackDragon, attackDragonHpDecreased)
	var defenceDragonData = createDragonData(defenceDragon, 0)

	var strikeVillageReport = {
		level:getReportLevel(powerCompare),
		strikeTarget:{
			name:defenceVillage.name,
			level:defenceVillage.level,
			location:LogicUtils.getAllianceMapObjectById(targetAllianceDoc, defenceVillage.id).location,
			alliance:createAllianceData(targetAllianceDoc),
			terrain:targetAllianceDoc.basicInfo.terrain
		},
		attackPlayerData:{
			id:attackPlayerDoc._id,
			name:attackPlayerDoc.basicInfo.name,
			icon:attackPlayerDoc.basicInfo.icon,
			alliance:createAllianceData(attackAllianceDoc),
			dragon:attackDragonData
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:_.extend(
				{
					equipments:getDragonEquipments(defenceDragon),
					skills:getDragonSkills(defenceDragon)
				},
				defenceDragonData
			),
			soldiers:getSoldiersInTroop(defencePlayerDoc, defenceVillageEvent.playerData.soldiers),
			militaryTechs:getMilitaryTechs(helpDefencePlayerDoc)
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
					equipments:getDragonEquipments(attackDragon)
				},
				attackDragonData
			)
		},
		defencePlayerData:{
			id:defencePlayerDoc._id,
			name:defencePlayerDoc.basicInfo.name,
			icon:defencePlayerDoc.basicInfo.icon,
			alliance:createAllianceData(defenceAllianceDoc),
			dragon:defenceDragonData
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

	return {
		reportForAttackPlayer:reportForAttackPlayer,
		reportForDefencePlayer:reportForDefencePlayer,
		powerCompare:powerCompare
	}
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
			name:defenceVillage.name,
			level:defenceVillage.level,
			location:LogicUtils.getAllianceMapObjectById(defenceAllianceDoc, defenceVillage.id).location,
			alliance:{
				id:defenceAllianceDoc._id,
				name:defenceAllianceDoc.basicInfo.name,
				tag:defenceAllianceDoc.basicInfo.tag,
				flag:defenceAllianceDoc.basicInfo.flag
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

/**
 * 获取部队详细信息
 * @param playerDoc
 * @param marchEventId
 * @param dragon
 * @param soldiers
 * @return {*}
 */
Utils.getPlayerMarchTroopDetail = function(playerDoc, marchEventId, dragon, soldiers){
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
	var getMiliraryTechs = function(playerDoc){
		var techs = []
		_.each(playerDoc.militaryTechs, function(theTech, name){
			if(theTech.level > 0){
				var tech = {
					name:name,
					level:theTech.level
				}
				techs.push(tech)
			}
		})
		return techs
	}
	var getMilitaryBuffs = function(playerDoc){
		return _.filter(playerDoc.itemEvents, function(event){
			return _.contains(Consts.MilitaryItemEventTypes, event.type)
		})
	}
	dragon = playerDoc.dragons[dragon.type]
	var detail = {
		marchEventId:marchEventId,
		dragon:{
			type:dragon.type,
			star:dragon.star,
			level:dragon.level,
			hp:dragon.hp,
			equipments:getDragonEquipments(dragon),
			skills:getDragonSkills(dragon)
		},
		soldiers:_.isArray(soldiers) ? getSoldiersInTroop(playerDoc, soldiers) : null,
		militaryTechs:getMiliraryTechs(playerDoc),
		militaryBuffs:getMilitaryBuffs(playerDoc)
	}

	if(!_.isArray(soldiers)) delete detail.soldiers

	return detail
}
