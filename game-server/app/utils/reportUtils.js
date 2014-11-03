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
 * 创建侦查村落的战报
 * @param allianceDoc
 * @param spyEvent
 * @return {*}
 */
Utils.createSpyVillageReport = function(allianceDoc, spyEvent){
	var village = LogicUtils.getAllianceVillageById(allianceDoc, spyEvent.targetId)
	var report = {}
	report.id = ShortId.generate()
	report.reportLevel = Consts.AllianceSpyReportLevel.S
	report.villageType = village.type
	report.villageLevel = village.level
	report.location = village.location
	report.spyTime = Date.now()
	report.getCoin = 0
	report.dragonFrom = {
		type:spyEvent.dragon.type,
		expAdd:0,
		vitality:spyEvent.dragon.vitality,
		vitalitySub:0
	}
	report.resource = village.resource
	report.soldiers = village.soldiers

	return report
}