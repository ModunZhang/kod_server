"use strict"

/**
 * Created by modun on 14/10/31.
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
 *
 * @param playerDoc
 * @param playerInAlliance
 * @param playerDragon
 * @param villageInAlliance
 * @returns {*}
 */
Utils.createSpyVillageEvent = function(playerDoc, playerInAlliance, playerDragon, villageInAlliance){
	var event = {
		id:ShortId.generate(),
		fromId:playerDoc._id,
		fromName:playerDoc.basicInfo.name,
		fromLocation:playerInAlliance.location,
		dragion:{
			type:playerDragon.type,
			level:playerDragon.level,
			strength:playerDragon.strength,
			vitality:playerDragon.vitality
		},
		targetType:villageInAlliance.type,
		targetId:villageInAlliance.id,
		targetLevel:villageInAlliance.level,
		targetLocation:villageInAlliance.location,
		finishTime:DataUtils.getPlayerSpyTime(playerDoc, playerInAlliance.location, villageInAlliance.location)
	}
	return event
}

Utils.createSpyVillageReturnEvent = function(spyEvent){

}