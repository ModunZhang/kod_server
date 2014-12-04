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
				if(self.hasNormalSoldier(soldier.name)){
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
				countDecreased:soldierForFight.damagedCount
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

	var starParam = getStar()
	var now = Date.now()
	var attackRewards = []
	var report = {
		fightTime:now,
		attackStar:starParam.attackStar,
		defenceStar:starParam.defenceStar,
		attackTarget:{
			name:defencePlayerData.playerDoc.basicInfo.name,
			cityName:defencePlayerData.playerDoc.basicInfo.cityName,
			location:LogicUtils.getAllianceMemberById(defenceAllianceDoc, defencePlayerData.playerDoc._id).location
		}
	}
	report.attackPlayerData = {
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
				hpDecreased:attackPlayerData.dragon.damagedHp
			},
			soldiers:createSoldiersDataAfterFight(attackPlayerData.soldiers)
		},
		rewards:attackRewards
	}

	if(_.isObject(fightData.helpDefenceDragonFightResult)){
		report.helpDefencePlayerData = {
			id:helpDefencePlayerData.playerDoc._id,
			name:helpDefencePlayerData.playerDoc.name,
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
					hpDecreased:helpDefencePlayerData.dragon.damagedHp
				},
				soldiers:createSoldiersDataAfterFight(helpDefencePlayerData.soldiers)
			},
			rewards:[]
		}
		report.fightWithHelpDefencePlayerReports = {
			fightResult:fightData.helpDefenceSoldierFightResult.fightResult,
			attackPlayerDragonFightData:createDragonFightData(fightData.helpDefenceDragonFightResult.attackDragonAfterFight),
			defencePlayerDragonFightData:createDragonFightData(fightData.helpDefenceDragonFightResult.defenceDragonAfterFight),
			attackPlayerSoldierRoundDatas:fightData.helpDefenceSoldierFightResult.attackRoundDatas,
			defencePlayerSoldierRoundDatas:fightData.helpDefenceSoldierFightResult.defenceRoundDatas
		}
	}

	if(_.isObject(fightData.defenceDragonFightResult) || _.isObject(fightData.defenceWallFightResult)){
		report.defencePlayerData = {
			id:defencePlayerData.playerDoc._id,
			name:defencePlayerData.playerDoc.name,
			allianceName:defencePlayerData.playerDoc.alliance.name,
			rewards:[]
		}
		if(_.isObject(fightData.defenceDragonFightResult)){
			report.defencePlayerData.troopData = {
				troopTotal:getSoldierCitizen(defencePlayerData.soldiers, "totalCount"),
				troopSurvived:getSoldierCitizen(defencePlayerData.soldiers, "currentCount"),
				troopWounded:getSoldierCitizen(defencePlayerData.soldiers, "treatCount"),
				kill:getKilledCitizen(defencePlayerData.soldiers),
				dragon:{
					type:defencePlayerData.dragon.type,
					level:defencePlayerData.dragon.level,
					xpAdd:0,
					hp:defencePlayerData.dragon.totalHp,
					hpDecreased:defencePlayerData.dragon.damagedHp
				},
				soldiers:createSoldiersDataAfterFight(defencePlayerData.soldiers)
			}
			if(_.isEqual(fightData.defenceDragonFightResult.fightResult, Consts.FightResult.AttackWin)){
				var attackDragonHpDecreased = fightData.defenceDragonFightResult.attackDragonAfterFight.attackDragonHpDecreased
				var coinGet = enemyPlayerDoc.resources.coin >= attackDragonHpDecreased ? attackDragonHpDecreased : enemyPlayerDoc.resources.coin
				attackRewards.push({
					type:"resources",
					name:"coin",
					count:coinGet
				})
			}
			if(_.isEqual(fightData.defenceSoldierFightResult.fightResult, Consts.FightResult.AttackWin)){
				var defencePlayerResources = defencePlayerData.playerDoc.resources
				var defencePlayerResourceTotal = defencePlayerResources.wood + defencePlayerResources.stone + defencePlayerResources.iron + defencePlayerResources.food
				var getLoadTotal = function(soldiersAfterFight){
					var loadTotal = 0
					_.each(soldiersAfterFight, function(soldierAfterFight){
						loadTotal += soldierAfterFight.currentCount * soldierAfterFight.load
					})
				}
				var attackPlayerLoadTotal = getLoadTotal(fightData.defenceSoldierFightResult.attackSoldiersAfterFight)
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
		}

		if(_.isObject(fightData.defenceWallFightResult)){
			report.defencePlayerData.wall = {
				hp:fightData.defenceWallFightResult.defenceWallAfterFight.totalHp,
				hpDecreased:fightData.defenceWallFightResult.defenceWallAfterFight.damagedHp
			}
		}

		if(_.isObject(fightData.defenceDragonFightResult) && !_.isObject(fightData.defenceWallFightResult)){
			report.fightWithDefencePlayerReports = {
				fightResult:fightData.defenceSoldierFightResult.fightResult,
				attackPlayerDragonFightData:createDragonFightData(fightData.defenceDragonFightResult.attackDragonAfterFight),
				defencePlayerDragonFightData:createDragonFightData(fightData.defenceDragonFightResult.defenceDragonAfterFight),
				attackPlayerSoldierRoundDatas:fightData.defenceSoldierFightResult.attackRoundDatas,
				defencePlayerSoldierRoundDatas:fightData.defenceSoldierFightResult.defenceRoundDatas
			}
		}
		if(!_.isObject(fightData.defenceDragonFightResult) && _.isObject(fightData.defenceWallFightResult)){
			report.fightWithDefencePlayerReports = {
				fightResult:fightData.defenceWallFightResult.fightResult,
				attackPlayerWallRoundDatas:fightData.defenceWallFightResult.attackRoundDatas,
				defencePlayerWallRoundDatas:fightData.defenceWallFightResult.defenceRoundDatas
			}
		}
		if(_.isObject(fightData.defenceDragonFightResult) && _.isObject(fightData.defenceWallFightResult)){
			report.fightWithDefencePlayerReports = {
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

	return report
}