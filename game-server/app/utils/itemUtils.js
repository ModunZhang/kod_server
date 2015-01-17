"use strict"

/**
 * Created by modun on 15/1/17.
 */


var _ = require("underscore")
var Consts = require("../consts/consts")
var LogicUtils = require("./logicUtils")
var DataUtils = require("./dataUtils")
var GameDatas = require("../datas/GameDatas")
var Items = GameDatas.Items
var Buildings = GameDatas.Buildings

var Utils = module.exports

/**
 *
 * @param itemName
 * @param params
 * @returns {*}
 */
Utils.isParamsLegal = function(itemName, params){
	var itemParams = _.isObject(params[itemName]) ? params[itemName] : null
	if(_.isEqual(itemName, movingConstruction )){
		if(!_.isObject(itemParams)) return false
		var fromBuildingLocation = itemParams.fromBuildingLocation
		var fromHouseLocation = itemParams.fromHouseLocation
		var toBuildingLocation = itemParams.toBuildingLocation
		var toHouseLocation = itemParams.toHouseLocation

		if(!_.isNumber(fromBuildingLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 20) return false
		if(!_.isNumber(fromHouseLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 3) return false
		if(!_.isNumber(toBuildingLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 20) return false
		if(!_.isNumber(toHouseLocation) || fromBuildingLocation % 1 !== 0 || fromBuildingLocation < 1 || fromBuildingLocation > 3) return false
		if(fromBuildingLocation == toBuildingLocation && fromHouseLocation == toHouseLocation) return false
		return Buildings[toBuildingLocation].hasHouse
	}


}