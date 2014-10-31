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
 */
Utils.createSpyVillageReport = function(allianceDoc, spyEvent){
	var report = {
		id:ShortId.generate()
	}
	if(!LogicUtils.isAllianceVillageBeingCollect(allianceDoc, spyEvent.targetId)){
		report.reportLevel = Consts.AllianceSpyReportLevel.S
		report.villageType = spyEvent.targetType
		report.villageLevel = spyEvent.targetLevel
		report.location = spyEvent.targetLocation
		report.spyTime = Date.now()
		report.dragonFrom = {
			type:spyEvent.dragon.type,
			expAdd:0,
			vitality:spyEvent.dragon.vitality
		}
	}
}

//_id:false,
//	id:{type:String, required:true},
//reportLevel:{type:Number, required:true},
//villageType:{type:String, required:true},
//villageLevel:{type:Number, required:true},
//location:{
//	x:{type:Number, required:true},
//	y:{type:Number, require:true}
//},
//spyTime:{type:Number, required:true},
//dragonFrom:{
//	required:true,
//		type:{
//		type:{type:String, required:true},
//		expAdd:{type:Number, required:true},
//		vitality:{type:Number, required:true},
//		vitalitySub:{type:Number, required:true}
//	}
//},
//dragonTo:{
//	required:false,
//		type:{
//		type:{type:String, required:true},
//		expAdd:{type:Number, required:true},
//		vitality:{type:Number, required:true},
//		vitalitySub:{type:Number, required:true}
//	},
//	equipments:[{
//		name:{type:String, required:true},
//		star:{type:Number, required:true}
//	}],
//		skills:[{
//		name:{type:String, required:true, default:skillName},
//		level:{type:Number, required:true, default:0}
//	}]
//},
//resource:{type:Number, required:true},
//soldiers:[{
//	type:{type:String, required:true},
//	count:{type:Number, required:true}
//}]