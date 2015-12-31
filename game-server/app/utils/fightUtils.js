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
	if(attackWoundedSoldierPercent > 1) attackWoundedSoldierPercent = 1;
	if(defenceWoundedSoldierPercent > 1) defenceWoundedSoldierPercent = 1;

	attackSoldiers = CommonUtils.clone(attackSoldiers)
	defenceSoldiers = CommonUtils.clone(defenceSoldiers)
	var attackSoldiersAfterFight = []
	var defenceSoldiersAfterFight = []
	var attackResults = []
	var defenceResults = []
	while(attackSoldiers.length > 0 && defenceSoldiers.length > 0){
		var attackSoldier = attackSoldiers[0]
		var defenceSoldier = defenceSoldiers[0]
		var attackSoldierType = attackSoldier.type
		var defenceSoldierType = defenceSoldier.type
		var attackTotalPower = attackSoldier.attackPower[defenceSoldierType] * attackSoldier.currentCount
		var defenceTotalPower = defenceSoldier.attackPower[attackSoldierType] * defenceSoldier.currentCount
		var attackDamagedSoldierCount = null
		var defenceDamagedSoldierCount = null
		if(attackTotalPower >= defenceTotalPower){
			attackDamagedSoldierCount = Math.ceil(defenceTotalPower * 0.3 / attackSoldier.hp)
			defenceDamagedSoldierCount = Math.ceil(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.3 / defenceSoldier.hp)
		}else{
			attackDamagedSoldierCount = Math.ceil(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.3 / attackSoldier.hp)
			defenceDamagedSoldierCount = Math.ceil(attackTotalPower * 0.3 / defenceSoldier.hp)
		}
		if(attackDamagedSoldierCount > attackSoldier.currentCount) attackDamagedSoldierCount = attackSoldier.currentCount
		if(defenceDamagedSoldierCount > defenceSoldier.currentCount) defenceDamagedSoldierCount = defenceSoldier.currentCount

		var attackWoundedSoldierCount = Math.floor(attackDamagedSoldierCount * attackWoundedSoldierPercent)
		var defenceWoundedSoldierCount = Math.floor(defenceDamagedSoldierCount * defenceWoundedSoldierPercent)
		var attackMoraleDecreased = Math.ceil(attackDamagedSoldierCount * Math.pow(attackSoldier.round, 3) * attackSoldierMoraleDecreasedPercent)
		var defenceMoraleDecreased = Math.ceil(defenceDamagedSoldierCount * Math.pow(defenceSoldier.round, 3) * defenceSoldierMoraleDecreasedPercent)
		if(attackMoraleDecreased > attackSoldier.morale)
			attackMoraleDecreased = attackSoldier.morale;
		if(defenceMoraleDecreased > defenceSoldier.morale)
			defenceMoraleDecreased = defenceSoldier.morale;

		attackResults.push({
			soldierName:attackSoldier.name,
			soldierStar:attackSoldier.star,
			soldierCount:attackSoldier.currentCount,
			soldierDamagedCount:attackDamagedSoldierCount,
			soldierWoundedCount:attackWoundedSoldierCount,
			morale:attackSoldier.morale,
			moraleDecreased:attackMoraleDecreased,
			isWin:attackTotalPower >= defenceTotalPower
		})
		defenceResults.push({
			soldierName:defenceSoldier.name,
			soldierStar:defenceSoldier.star,
			soldierCount:defenceSoldier.currentCount,
			soldierDamagedCount:defenceDamagedSoldierCount,
			soldierWoundedCount:defenceWoundedSoldierCount,
			morale:defenceSoldier.morale,
			moraleDecreased:defenceMoraleDecreased,
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
		defenceSoldier.morale -= defenceMoraleDecreased
		defenceSoldier.killedSoldiers.push({
			name:attackSoldier.name,
			star:attackSoldier.star,
			count:attackDamagedSoldierCount
		})

		if(attackTotalPower < defenceTotalPower || attackSoldier.morale <= 0 || attackSoldier.currentCount == 0){
			LogicUtils.removeItemInArray(attackSoldiers, attackSoldier)
			attackSoldiersAfterFight.push(attackSoldier)
		}
		if(attackTotalPower >= defenceTotalPower || defenceSoldier.morale <= 0 || defenceSoldier.currentCount == 0){
			LogicUtils.removeItemInArray(defenceSoldiers, defenceSoldier)
			defenceSoldiersAfterFight.push(defenceSoldier)
		}
	}
	attackSoldiersAfterFight = attackSoldiersAfterFight.concat(attackSoldiers)
	defenceSoldiersAfterFight = defenceSoldiersAfterFight.concat(defenceSoldiers)

	var fightResult = null
	if(attackSoldiers.length > 0)
		fightResult = Consts.FightResult.AttackWin;
	else if(defenceSoldiers.length > 0)
		fightResult = Consts.FightResult.DefenceWin;
	else{
		if(attackResults[attackResults.length - 1].isWin)
			fightResult = Consts.FightResult.AttackWin;
		else
			fightResult = Consts.FightResult.DefenceWin;
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
	var attackDragonEffect = effect.attackDragonEffect;
	var defenceDragonEffect = effect.defenceDragonEffect;
	var attackDragonHpDecreased = null
	var defenceDragonHpDecreased = null
	if(attackDragonStrength >= defenceDragonStrength){
		attackDragonHpDecreased = Math.ceil(defenceDragonStrength * 0.5 * attackDragonEffect);
		defenceDragonHpDecreased = Math.ceil(Math.sqrt(attackDragonStrength * defenceDragonStrength) * 0.5 * defenceDragonEffect);
	}else{
		attackDragonHpDecreased = Math.ceil(Math.sqrt(attackDragonStrength * defenceDragonStrength) * 0.5 * attackDragonEffect);
		defenceDragonHpDecreased = Math.ceil(attackDragonStrength * 0.5 * defenceDragonEffect);
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
 * @returns {*}
 */
Utils.soldierToWallFight = function(attackSoldiers, attackWoundedSoldierPercent, defenceWall){
	attackSoldiers = CommonUtils.clone(attackSoldiers)
	defenceWall = CommonUtils.clone(defenceWall)
	var attackSoldiersAfterFight = []
	var attackResults = []
	var defenceResults = []
	while(attackSoldiers.length > 0 && defenceWall.currentHp > 0){
		var attackSoldier = attackSoldiers[0]
		var attackSoldierType = attackSoldier.type
		var defenceSoldierType = "wall"
		var attackTotalPower = attackSoldier.attackPower[defenceSoldierType] * attackSoldier.currentCount
		var defenceTotalPower = defenceWall.attackPower[attackSoldierType] * defenceWall.currentHp
		var attackDamagedSoldierCount = null
		var defenceDamagedHp = null
		if(attackTotalPower >= defenceTotalPower){
			attackDamagedSoldierCount = Math.ceil(defenceTotalPower * 0.3 / attackSoldier.hp)
			defenceDamagedHp = Math.ceil(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.3 / defenceWall.defencePower)
		}else{
			attackDamagedSoldierCount = Math.ceil(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.3 / attackSoldier.hp)
			defenceDamagedHp = Math.ceil(attackTotalPower * 0.3 / defenceWall.defencePower)
		}
		if(attackDamagedSoldierCount > attackSoldier.currentCount) attackDamagedSoldierCount = attackSoldier.currentCount
		if(defenceDamagedHp > defenceWall.currentHp) defenceDamagedHp = defenceWall.currentHp

		var attackWoundedSoldierCount = Math.floor(attackDamagedSoldierCount * attackWoundedSoldierPercent)
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