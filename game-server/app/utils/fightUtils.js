"use strict"

/**
 * Created by modun on 14/10/31.
 */

var DataUtils = require("./dataUtils")
var LogicUtils = require("./logicUtils")
var Consts = require("../consts/consts")

var Utils = module.exports


/**
 * 军队战斗
 * @param attackSoldiers
 * @param attackTreatSoldierPercent
 * @param defenceSoldiers
 * @param defenceTreatSoldierPercent
 */
Utils.soldierToSoldierFight = function(attackSoldiers, attackTreatSoldierPercent, defenceSoldiers, defenceTreatSoldierPercent){
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
		if(round == 1){
			var multiple = defenceTotalPower /  attackTotalPower
			var effect = null
			if(multiple > 1){
				effect = DataUtils.getSoldierFightFixEffect(multiple)
				attackTotalPower = Math.floor(attackTotalPower * (1 - effect))
			}else{
				effect = DataUtils.getSoldierFightFixEffect(1 / multiple)
				defenceTotalPower = Math.floor(defenceTotalPower * (1 - effect))
			}
		}
		var attackDamagedSoldierCount = null
		var defenceDamagedSoldierCount = null
		if(attackTotalPower >= defenceTotalPower){
			attackDamagedSoldierCount = Math.round(defenceTotalPower * 0.5 / attackSoldier.hp)
			defenceDamagedSoldierCount = Math.round(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.5 / defenceSoldier.hp)
		}else{
			attackDamagedSoldierCount = Math.round(Math.sqrt(attackTotalPower * defenceTotalPower) * 0.5 / attackSoldier.hp)
			defenceDamagedSoldierCount = Math.round(attackTotalPower * 0.5 / defenceSoldier.hp)
		}
		if(attackDamagedSoldierCount > attackSoldier.currentCount) attackDamagedSoldierCount = attackSoldier.currentCount
		if(defenceDamagedSoldierCount > defenceSoldier.currentCount) defenceDamagedSoldierCount = defenceSoldier.currentCount

		var attackTreatedSoldierCount = Math.ceil(attackDamagedSoldierCount * attackTreatSoldierPercent)
		var defenceTreatedSoldierCount = Math.ceil(defenceDamagedSoldierCount * defenceTreatSoldierPercent)
		var attackMoraleDecreased = Math.ceil(attackDamagedSoldierCount * Math.pow(2, attackSoldier.round - 1) / attackSoldier.totalCount * 100)
		var dfenceMoraleDecreased = Math.ceil(defenceDamagedSoldierCount * Math.pow(2, attackSoldier.round - 1) / defenceSoldier.totalCount * 100)
		attackResults.push({
			soldierName:attackSoldier.name,
			soldierStar:attackSoldier.star,
			soldierCount:attackSoldier.currentCount,
			soldierDamagedCount:attackDamagedSoldierCount,
			soldierTreatedCount:attackTreatedSoldierCount,
			morale:attackSoldier.morale,
			moraleDecreased:attackMoraleDecreased > attackSoldier.morale ? attackSoldier.morale : attackMoraleDecreased,
			isWin:attackTotalPower >= defenceTotalPower
		})
		defenceResults.push({
			soldierName:defenceSoldier.name,
			soldierStar:defenceSoldier.star,
			soldierCount:defenceSoldier.currentCount,
			soldierDamagedCount:defenceDamagedSoldierCount,
			soldierTreatedCount:defenceTreatedSoldierCount,
			morale:defenceSoldier.morale,
			moraleDecreased:dfenceMoraleDecreased > defenceSoldier.morale ? defenceSoldier.morale : dfenceMoraleDecreased,
			isWin:attackTotalPower < defenceTotalPower
		})
		attackSoldier.round += 1
		attackSoldier.currentCount -= attackDamagedSoldierCount
		attackSoldier.morale -= attackMoraleDecreased
		defenceSoldier.round += 1
		defenceSoldier.currentCount -= defenceDamagedSoldierCount
		defenceSoldier.morale -= dfenceMoraleDecreased

		if(attackTotalPower < defenceTotalPower || attackSoldier.morale <= 20) LogicUtils.removeItemInArray(attackSoldiers, attackSoldier)
		if(attackTotalPower >= defenceTotalPower || defenceSoldier.morale <= 20) LogicUtils.removeItemInArray(defenceSoldiers, defenceSoldier)
	}

	var fightResult = null
	if(attackSoldiers.length > 0 || (attackSoldiers.length == 0 && defenceSoldiers.length == 0)){
		fightResult = Consts.FightResult.AttackWin
	}else{
		fightResult = Consts.FightResult.DefenceWin
	}

	var response = {
		attackRoundDatas:attackResults,
		defenceRoundDatas:defenceResults,
		fightResult:fightResult
	}
	return response
}

/**
 * 龙战斗
 * @param attackDragon
 * @param defenceDragon
 */
Utils.dragonToDragonFight = function(attackDragon, defenceDragon){
	if(attackDragon.hp == 0){
		return {
			attackDragonHpDecreased:0,
			defenceDragonHpDecreased:0,
			fightResult:Consts.FightResult.DefenceWin
		}
	}
	if(defenceDragon.hp == 0){
		return {
			attackDragonHpDecreased:0,
			defenceDragonHpDecreased:0,
			fightResult:Consts.FightResult.AttackWin
		}
	}

	var attackDragonPower = attackDragon.strength * attackDragon.vitality
	var defenceDragonPower = defenceDragon.strength * defenceDragon.vitality
	var attackDragonHpDecreased = null
	var defenceDragonHpDecreased = null
	if(attackDragonPower >= defenceDragonPower){
		attackDragonHpDecreased = Math.round(defenceDragonPower * 0.5 / attackDragon.strength)
		defenceDragonHpDecreased = Math.round(Math.sqrt(attackDragonPower * defenceDragonPower * 0.5 / defenceDragon.strength))
	}else{
		attackDragonHpDecreased = Math.round(Math.sqrt(attackDragonPower * defenceDragonPower * 0.5 / attackDragon.strength))
		defenceDragonHpDecreased = Math.round(attackDragonPower * 0.5 / defenceDragon.strength)
	}
	var response = {
		attackDragonHpDecreased:attackDragonHpDecreased > attackDragon.hp ? attackDragon.hp : attackDragonHpDecreased,
		defenceDragonHpDecreased:defenceDragonHpDecreased > defenceDragon.hp ? defenceDragon.hp : defenceDragonHpDecreased,
		fightResult:attackDragonPower >= defenceDragonPower ? Consts.FightResult.AttackWin : Consts.FightResult.DefenceWin
	}
	return response
}