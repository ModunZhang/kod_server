"use strict"

/**
 * Created by modun on 14/10/31.
 */

var DataUtils = require("./dataUtils")
var LogicUtils = require("./logicUtils")
var CommonUtils = require("./utils")
var Consts = require("../consts/consts")

var Utils = module.exports


/**
 * 军队战斗
 * @param attackSoldiers
 * @param attackWoundedSoldierPercent
 * @param attackSoldierMoraleDecreasedPercent
 * @param defenceSoldiers
 * @param defenceWoundedSoldierPercent
 * @param defenceSoldierMoraleDecreasedPercent
 * @returns {*}
 */
Utils.soldierToSoldierFight = function(attackSoldiers, attackWoundedSoldierPercent, attackSoldierMoraleDecreasedPercent, defenceSoldiers, defenceWoundedSoldierPercent, defenceSoldierMoraleDecreasedPercent){
	attackSoldiers = CommonUtils.clone(attackSoldiers)
	defenceSoldiers = CommonUtils.clone(defenceSoldiers)
	var attackSoldiersAfterFight = []
	var defenceSoldiersAfterFight = []
	var attackResults = []
	var defenceResults = []
	var round = 0
	while(attackSoldiers.length > 0 && defenceSoldiers.length > 0){
		round += 1
		var attackSoldier = attackSoldiers[0]
		var defenceSoldier = defenceSoldiers[0]
		var attackSoldierType = attackSoldier.type
		var defenceSoldierType = defenceSoldier.type
		var attackTotalPower = attackSoldier.attackPower[defenceSoldierType] * attackSoldier.currentCount
		var defenceTotalPower = defenceSoldier.attackPower[attackSoldierType] * defenceSoldier.currentCount
		var attackDamagedSoldierCount = null
		var defenceDamagedSoldierCount = null
		if(attackTotalPower >= defenceTotalPower){
			attackDamagedSoldierCount = Math.round(defenceTotalPower * 0.5 / attackSoldier.hp)
			defenceDamagedSoldierCount = Math.round(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.5 / defenceSoldier.hp)
		}else{
			attackDamagedSoldierCount = Math.round(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.5 / attackSoldier.hp)
			defenceDamagedSoldierCount = Math.round(attackTotalPower * 0.5 / defenceSoldier.hp)
		}
		if(attackDamagedSoldierCount > attackSoldier.currentCount * 0.7) attackDamagedSoldierCount = Math.floor(attackSoldier.currentCount * 0.7)
		if(defenceDamagedSoldierCount > defenceSoldier.currentCount * 0.7) defenceDamagedSoldierCount = Math.floor(defenceSoldier.currentCount * 0.7)

		var attackWoundedSoldierCount = Math.ceil(attackDamagedSoldierCount * attackWoundedSoldierPercent)
		var defenceWoundedSoldierCount = Math.ceil(defenceDamagedSoldierCount * defenceWoundedSoldierPercent)
		var attackMoraleDecreased = Math.ceil(attackDamagedSoldierCount * Math.pow(2, attackSoldier.round - 1) / attackSoldier.totalCount * 100 * attackSoldierMoraleDecreasedPercent)
		var dfenceMoraleDecreased = Math.ceil(defenceDamagedSoldierCount * Math.pow(2, attackSoldier.round - 1) / defenceSoldier.totalCount * 100 * defenceSoldierMoraleDecreasedPercent)
		attackResults.push({
			soldierName:attackSoldier.name,
			soldierStar:attackSoldier.star,
			soldierCount:attackSoldier.currentCount,
			soldierDamagedCount:attackDamagedSoldierCount,
			soldierWoundedCount:attackWoundedSoldierCount,
			morale:attackSoldier.morale,
			moraleDecreased:attackMoraleDecreased > attackSoldier.morale ? attackSoldier.morale : attackMoraleDecreased,
			isWin:attackTotalPower >= defenceTotalPower
		})
		defenceResults.push({
			soldierName:defenceSoldier.name,
			soldierStar:defenceSoldier.star,
			soldierCount:defenceSoldier.currentCount,
			soldierDamagedCount:defenceDamagedSoldierCount,
			soldierWoundedCount:defenceWoundedSoldierCount,
			morale:defenceSoldier.morale,
			moraleDecreased:dfenceMoraleDecreased > defenceSoldier.morale ? defenceSoldier.morale : dfenceMoraleDecreased,
			isWin:attackTotalPower < defenceTotalPower
		})
		attackSoldier.round += 1
		attackSoldier.currentCount -= attackDamagedSoldierCount
		attackSoldier.woundedCount += attackWoundedSoldierCount
		attackSoldier.morale -= attackMoraleDecreased
		attackSoldier.killedSoldiers.push({
			name:defenceSoldier.name,
			star:defenceSoldier.star,
			count:defenceDamagedSoldierCount
		})
		defenceSoldier.round += 1
		defenceSoldier.currentCount -= defenceDamagedSoldierCount
		defenceSoldier.woundedCount += defenceWoundedSoldierCount
		defenceSoldier.morale -= dfenceMoraleDecreased
		defenceSoldier.killedSoldiers.push({
			name:attackSoldier.name,
			star:attackSoldier.star,
			count:attackDamagedSoldierCount
		})

		if(attackTotalPower < defenceTotalPower || attackSoldier.morale <= 20 || attackSoldier.currentCount == 0){
			LogicUtils.removeItemInArray(attackSoldiers, attackSoldier)
			attackSoldiersAfterFight.push(attackSoldier)
		}
		if(attackTotalPower >= defenceTotalPower || defenceSoldier.morale <= 20 || defenceSoldier.currentCount == 0){
			LogicUtils.removeItemInArray(defenceSoldiers, defenceSoldier)
			defenceSoldiersAfterFight.push(defenceSoldier)
		}
	}
	attackSoldiersAfterFight = attackSoldiersAfterFight.concat(attackSoldiers)
	defenceSoldiersAfterFight = defenceSoldiersAfterFight.concat(defenceSoldiers)

	var fightResult = null
	if(attackSoldiers.length > 0 || (attackSoldiers.length == 0 && defenceSoldiers.length == 0)){
		fightResult = Consts.FightResult.AttackWin
	}else{
		fightResult = Consts.FightResult.DefenceWin
	}

	var response = {
		attackRoundDatas:attackResults,
		defenceRoundDatas:defenceResults,
		fightResult:fightResult,
		attackSoldiersAfterFight:attackSoldiersAfterFight,
		defenceSoldiersAfterFight:defenceSoldiersAfterFight
	}
	return response
}

/**
 * 龙战斗
 * @param attackDragon
 * @param defenceDragon
 * @param effect
 * @returns {*}
 */
Utils.dragonToDragonFight = function(attackDragon, defenceDragon, effect){
	attackDragon = CommonUtils.clone(attackDragon)
	defenceDragon = CommonUtils.clone(defenceDragon)

	var attackDragonStrength = attackDragon.strength
	var defenceDragonStrength = defenceDragon.strength
	if(effect >= 0){
		defenceDragonStrength -= defenceDragonStrength * effect
	}else{
		attackDragonStrength -= attackDragonStrength * (-effect)
	}
	var attackDragonHpDecreased = null
	var defenceDragonHpDecreased = null
	if(attackDragonStrength >= defenceDragonStrength){
		attackDragonHpDecreased = Math.floor(defenceDragonStrength * 0.5)
		defenceDragonHpDecreased = Math.floor(Math.sqrt(attackDragonStrength * defenceDragonStrength) * 0.5)
	}else{
		attackDragonHpDecreased = Math.floor(Math.sqrt(attackDragonStrength * defenceDragonStrength) * 0.5)
		defenceDragonHpDecreased = Math.floor(attackDragonStrength * 0.5)
	}
	attackDragon.currentHp = attackDragonHpDecreased > attackDragon.currentHp ? 0 : attackDragon.currentHp - attackDragonHpDecreased
	defenceDragon.currentHp = defenceDragonHpDecreased > defenceDragon.currentHp ? 0 : defenceDragon.currentHp - defenceDragonHpDecreased
	attackDragon.isWin = attackDragonStrength >= defenceDragonStrength
	defenceDragon.isWin = attackDragonStrength < defenceDragonStrength

	var response = {
		powerCompare:attackDragonStrength / defenceDragonStrength,
		attackDragonHpDecreased:attackDragon.totalHp - attackDragon.currentHp,
		defenceDragonHpDecreased:defenceDragon.totalHp - defenceDragon.currentHp,
		fightResult:attackDragonStrength >= defenceDragonStrength ? Consts.FightResult.AttackWin : Consts.FightResult.DefenceWin,
		attackDragonAfterFight:attackDragon,
		defenceDragonAfterFight:defenceDragon
	}
	return response
}

/**
 * 士兵和城墙的战斗
 * @param attackSoldiers
 * @param attackWoundedSoldierPercent
 * @param defenceWall
 * @param defenceWallDamageDecreasedPercent
 * @returns {*}
 */
Utils.soldierToWallFight = function(attackSoldiers, attackWoundedSoldierPercent, defenceWall, defenceWallDamageDecreasedPercent){
	attackSoldiers = CommonUtils.clone(attackSoldiers)
	defenceWall = CommonUtils.clone(defenceWall)
	var attackSoldiersAfterFight = []
	var attackResults = []
	var defenceResults = []
	var round = 0
	while(attackSoldiers.length > 0 && defenceWall.currentHp > 0){
		round += 1
		var attackSoldier = attackSoldiers[0]
		var attackSoldierType = attackSoldier.type
		var defenceSoldierType = "wall"
		var attackTotalPower = attackSoldier.attackPower[defenceSoldierType] * attackSoldier.currentCount
		var defenceTotalPower = defenceWall.attackPower[attackSoldierType] * defenceWall.currentHp
		var attackDamagedSoldierCount = null
		var defenceDamagedHp = null
		if(attackTotalPower >= defenceTotalPower){
			attackDamagedSoldierCount = Math.round(defenceTotalPower * 0.5 / attackSoldier.hp)
			defenceDamagedHp = Math.round(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.5 / defenceWall.defencePower * (1 - defenceWallDamageDecreasedPercent))
		}else{
			attackDamagedSoldierCount = Math.round(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.5 / attackSoldier.hp)
			defenceDamagedHp = Math.round(attackTotalPower * 0.5 / defenceWall.defencePower * (1 - defenceWallDamageDecreasedPercent))
		}
		if(attackDamagedSoldierCount > attackSoldier.currentCount * 0.7) attackDamagedSoldierCount = Math.floor(attackSoldier.currentCount * 0.7)
		if(defenceDamagedHp > defenceWall.currentHp) defenceDamagedHp = defenceWall.currentHp

		var attackWoundedSoldierCount = Math.ceil(attackDamagedSoldierCount * attackWoundedSoldierPercent)
		attackResults.push({
			soldierName:attackSoldier.name,
			soldierStar:attackSoldier.star,
			soldierCount:attackSoldier.currentCount,
			soldierDamagedCount:attackDamagedSoldierCount,
			soldierWoundedCount:attackWoundedSoldierCount,
			isWin:defenceWall.currentHp - defenceDamagedHp <= 0
		})
		defenceResults.push({
			wallMaxHp:defenceWall.maxHp,
			wallHp:defenceWall.currentHp,
			wallDamagedHp:defenceDamagedHp,
			isWin:defenceWall.currentHp - defenceDamagedHp > 0
		})
		attackSoldier.round += 1
		attackSoldier.currentCount -= attackDamagedSoldierCount
		attackSoldier.damagedCount += attackDamagedSoldierCount
		attackSoldier.woundedCount += attackWoundedSoldierCount
		defenceWall.round += 1
		defenceWall.currentHp -= defenceDamagedHp
		defenceWall.killedSoldiers.push({
			name:attackSoldier.name,
			star:attackSoldier.star,
			count:attackDamagedSoldierCount
		})

		LogicUtils.removeItemInArray(attackSoldiers, attackSoldier)
		attackSoldiersAfterFight.push(attackSoldier)
	}
	attackSoldiersAfterFight = attackSoldiersAfterFight.concat(attackSoldiers)
	var fightResult = null
	if(attackSoldiers.length > 0 || (attackSoldiers.length == 0 && defenceWall.currentHp <= 0)){
		fightResult = Consts.FightResult.AttackWin
	}else{
		fightResult = Consts.FightResult.DefenceWin
	}

	var response = {
		attackRoundDatas:attackResults,
		defenceRoundDatas:defenceResults,
		fightResult:fightResult,
		attackSoldiersAfterFight:attackSoldiersAfterFight,
		defenceWallAfterFight:defenceWall
	}
	return response
}