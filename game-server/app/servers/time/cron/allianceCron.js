"use strict"

var _ = require("underscore")

var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var MapUtils = require("../../../utils/mapUtils")
var LogicUtils = require("../../../utils/logicUtils")
var DataUtils = require("../../../utils/dataUtils")

var GameDatas = require("../../../datas/GameDatas")
var AllianceInit = GameDatas.AllianceInitData
var AllianceBuildingConfig = GameDatas.AllianceBuilding

/**
 * Created by modun on 14-10-22.
 */

module.exports = function(app){
	return new Cron(app)
}
var Cron = function(app){
	this.app = app
	this.playerDao = app.get("playerDao")
	this.allianceDao = app.get("allianceDao")
}
var pro = Cron.prototype

pro.resetAllianceStatus = function(){
	var self = this
	this.allianceDao.findAllAsync().then(function(docs){
		ResetDonateStatus(docs)
		ResetMapDecorates(docs)
		return self.allianceDao.updateAllAsync(docs)
	}).catch(function(e){
		errorLogger.error("handle time.cron.resetDonateStatus Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle time.cron.resetDonateStatus Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}

/**
 * 重置联盟玩家捐赠状态
 * @param allianceDocs
 */
var ResetDonateStatus = function(allianceDocs){
	_.each(allianceDocs, function(allianceDoc){
		_.each(allianceDoc.members, function(member){
			var donateStatus = {
				wood:1,
				stone:1,
				iron:1,
				food:1,
				coin:1,
				gem:1
			}
			member.donateStatus = donateStatus
		})
	})
}

/**
 * 重置联盟地图装饰物
 * @param allianceDocs
 */
var ResetMapDecorates = function(allianceDocs){
	_.each(allianceDocs, function(allianceDoc){
		var mapObjects = allianceDoc.mapObjects
		var map = MapUtils.buildMap(mapObjects)
		_.each(AllianceInit.decorateCount, function(countConfig, key){
			var countHas = LogicUtils.getAllianceDecorateObjectCountByType(allianceDoc, key)
			var config = AllianceInit.buildingType[key]
			var width = config.width
			var height = config.height
			var count = countConfig.count - countHas
			for(var i = 0; i < count; i++){
				var rect = MapUtils.getRect(map, width, height)
				if(_.isObject(rect)){
					MapUtils.markMap(map, mapObjects, {x:rect.x, y:rect.y, width:rect.width, height:rect.height}, key)
				}
			}
		})
	})
}