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
			if(multiple > 1){
				var effect = DataUtils.getSoldierFightFixEffect(multiple)
				attackTotalPower = Math.floor(attackTotalPower * (1 - effect))
			}else{
				var effect = DataUtils.getSoldierFightFixEffect(1 / multiple)
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
		var attackTreatedSoldierCount = Math.ceil(attackDamagedSoldierCount * attackTreatSoldierPercent)
		var defenceTreatedSoldierCount = Math.ceil(defenceDamagedSoldierCount * defenceTreatSoldierPercent)
		attackResults.push({
			soldierName:attackSoldier.name,
			soldierLevel:attackSoldier.level,
			soldierCount:attackSoldier.currentCount,
			solderDamagedCount:attackDamagedSoldierCount,
			solderTreatedCount:attackTreatedSoldierCount,
			isWin:attackTotalPower >= defenceTotalPower
		})
		defenceResults.push({
			soldierName:defenceSoldier.name,
			soldierLevel:defenceSoldier.level,
			soldierCount:defenceSoldier.currentCount,
			solderDamagedCount:defenceDamagedSoldierCount,
			solderTreatedCount:defenceTreatedSoldierCount,
			isWin:attackTotalPower < defenceTotalPower
		})
		attackSoldier.round += 1
		attackSoldier.currentCount -= attackDamagedSoldierCount
		attackSoldier.morale -= Math.ceil(attackDamagedSoldierCount * Math.pow(2, attackSoldier.round - 1) / attackSoldier.totalCount * 100)
		defenceSoldier.round += 1
		defenceSoldier.currentCount -= defenceDamagedSoldierCount
		defenceSoldier.morale -= Math.ceil(defenceDamagedSoldierCount * Math.pow(2, attackSoldier.round - 1) / defenceSoldier.totalCount * 100)
		if(attackTotalPower < defenceTotalPower || attackSoldier.morale <= 20) LogicUtils.removeItemInArray(attackSoldiers, attackSoldier)
		if(attackTotalPower >= defenceTotalPower || defenceSoldier.morale <= 20) LogicUtils.removeItemInArray(defenceSoldiers, defenceSoldier)
	}

	var result = null
	if(attackSoldiers.length > 0 || (attackSoldiers.length == 0 && defenceSoldiers.length == 0)){
		result = Consts.FightStatus.AttackWin
	}else{
		result = Consts.FightStatus.DefenceWin
	}

	var response = {
		attackRoundInfo:attackResults,
		defenceRoundInfo:defenceResults,
		result:result
	}
	return response
}

/**
 * 龙战斗
 * @param attackDragon
 * @param defenceDragon
 */
Utils.dragonToDragonFight = function(attackDragon, defenceDragon){

}