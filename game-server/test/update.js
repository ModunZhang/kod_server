/**
 * Created by modun on 15/11/8.
 */

var Promise = require("bluebird")
var mongoose = require("mongoose")
var _ = require("underscore")

var DataUtils = require("../app/utils/dataUtils")
var LogicUtils = require("../app/utils/logicUtils")
var MapUtils = require("../app/utils/mapUtils")

var Config = require("./config")
var Player = Promise.promisifyAll(require("../app/domains/player"))
var Alliance = Promise.promisifyAll(require("../app/domains/alliance"))

var GameDatas = require('../app/datas/GameDatas.js')
var AllianceMap = GameDatas.AllianceMap;

var bigMapLength = DataUtils.getAllianceIntInit('bigMapLength');
var bigMap = function(){
	var mapIndexData = [];
	for(var i = 0; i < Math.pow(bigMapLength, 2); i++){
		mapIndexData[i] = false;
	}
	return mapIndexData;
}();

var getFreeMapIndex = function(){
	var mapIndex = null;
	var hasFound = _.some(AllianceMap.bigRound, function(round){
		var locationFrom = {x:round.locationFromX, y:round.locationFromY};
		return _.some(AllianceMap.roundIndex, function(index){
			var x = locationFrom.x + index.x;
			var y = locationFrom.y + index.y;
			mapIndex = x + (y * bigMapLength);
			return !bigMap[mapIndex];
		})
	})
	return hasFound ? mapIndex : null;
}

mongoose.connect('mongodb://54.223.166.65:27017/kod', function(){
	var updateAlliance = function(){
		return new Promise(function(resolve){
			Alliance.collection.find().toArray(function(e, docs){
				(function updateAlliance(){
					if(docs.length > 0){
						var doc = docs.pop();
						doc.lastActiveTime = Date.now();
						var mapIndex = getFreeMapIndex();
						doc.mapIndex = mapIndex;
						bigMap[mapIndex] = true;
						doc.basicInfo.terrainStyle = _.random(1, 6);
						doc.basicInfo.allianceMoveTime = 0;
						doc.basicInfo.status = 'peace';
						doc.basicInfo.statusStartTime = Date.now();
						doc.basicInfo.statusFinishTime = 0;
						delete doc.titles;
						_.each(doc.members, function(member){
							member.helpedByTroopsCount = 0;
							member.isProtected = false;
							delete member.allianceExp;
						})
						_.each(doc.villages, function(village){
							village.villageEvent = null;
						})
						var mapObjects = [];
						doc.mapObjects = mapObjects;
						var map = MapUtils.buildMap(doc.basicInfo.terrainStyle, mapObjects);
						_.each(doc.villages, function(village){
							var rect = MapUtils.getRect(map, 1, 1)
							var villageMapObject = MapUtils.addMapObject(map, mapObjects, rect, village.name)
							village.id = villageMapObject.id;
						})
						_.each(doc.monsters, function(monster){
							var rect = MapUtils.getRect(map, 1, 1)
							var monsterMapObject = MapUtils.addMapObject(map, mapObjects, rect, 'monster')
							monster.id = monsterMapObject.id;
						})
						_.each(doc.members, function(member){
							var rect = MapUtils.getRect(map, 1, 1)
							var memberMapObject = MapUtils.addMapObject(map, mapObjects, rect, 'member')
							member.mapId = memberMapObject.id;
						})
						_.each(doc.buildings, function(building){
							building.level *= 2;
							if(building.name === 'moonGate'){
								building.name = 'watchTower'
							}
						})
						_.each(doc.villageLevels, function(villageLevel, key){
							doc.villageLevels[key] *= 2;
						})

						delete doc.fightRequests;
						doc.shrineEvents = [];
						doc.villageEvents = [];
						doc.allianceFight = null;
						doc.allianceFightReports = [];
						delete doc.strikeMarchEvents;
						delete doc.strikeMarchReturnEvents;
						delete doc.attackMarchEvents;
						delete doc.attackMarchReturnEvents;
						doc.marchEvents = {
							strikeMarchEvents:[],
							strikeMarchReturnEvents:[],
							attackMarchEvents:[],
							attackMarchReturnEvents:[]
						}

						Alliance.collection.save(doc, function(e){
							if(!!e) console.log(e);
							else console.log('alliance ' + doc._id + ' update success!');
							updateAlliance();
						})
					}else{
						console.log('update alliance done!');
						resolve();
					}
				})();
			})
		})
	}
	var updatePlayer = function(){
		return new Promise(function(resolve){
			Player.collection.find().toArray(function(e, docs){
				(function updatePlayer(){
					if(docs.length > 0){
						var doc = docs.pop();
						doc.lastActiveTime = Date.now();
						doc.allianceData = {loyalty:doc.allianceInfo.loyalty};
						delete doc.allianceInfo;
						delete doc.buildings.location_2;
						doc.reports = [];
						doc.helpToTroops = [];
						doc.helpedByTroops = [];

						_.each(doc.troopsOut, function(troop){
							doc.dragons[troop.dragonType].status = 'free';
							LogicUtils.addPlayerSoldiers(doc, [], troop.soldiers);
						})
						doc.troopsOut = [];
						_.each(doc.productionTechs, function(tech){
							tech.level *= 2;
						})
						_.each(doc.militaryTechs, function(tech){
							tech.level *= 2;
						})
						for(var i = doc.growUpTasks.cityBuild.length - 1; i >= 0; i --){
							var cityBuild = doc.growUpTasks.cityBuild[i];
							if(cityBuild.name === 'watchTower'){
								doc.growUpTasks.cityBuild.splice(i, 1);
							}
						}

						Player.collection.save(doc, function(e){
							if(!!e) console.log(e);
							else console.log('player ' + doc._id + ' update success!');
							updatePlayer();
						})
					}else{
						console.log('update player done!');
						resolve();
					}
				})();
			})
		})
	}

	updateAlliance().then(function(){
		return updatePlayer();
	}).then(function(){
		console.log('all done!');
	})
})