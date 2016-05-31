/**
 * Created by modun on 15/11/8.
 */

var Promise = require("bluebird")
var mongoose = require("mongoose")
var _ = require("underscore")

var DataUtils = require("../game-server/app/utils/dataUtils")
var LogicUtils = require("../game-server/app/utils/logicUtils")
var MapUtils = require("../game-server/app/utils/mapUtils")
var TaskUtils = require("../game-server/app/utils/taskUtils")
var CommonUtils = require("../game-server/app/utils/utils")

var Config = require("./config")
var Player = Promise.promisifyAll(require("../game-server/app/domains/player"))
var Alliance = Promise.promisifyAll(require("../game-server/app/domains/alliance"))
var Billing = Promise.promisifyAll(require("../game-server/app/domains/billing"))
var Deal = Promise.promisifyAll(require("../game-server/app/domains/deal"))
var GemChange = Promise.promisifyAll(require("../game-server/app/domains/gemChange"))

var GameDatas = require('../game-server/app/datas/GameDatas.js')
var PlayerInitData = GameDatas.PlayerInitData;

var updateBilling = function(){
	return new Promise(function(resolve){
		var cursor = Billing.collection.find();
		(function updateBilling(){
			cursor.next(function(e, doc){
				if(!doc){
					console.log('update billing done!');
					return resolve();
				}
				doc.serverId = 'cache-server-1';
				Billing.collection.save(doc, function(e){
					if(!!e) console.log(e);
					else console.log('billing ' + doc._id + ' update success!');
					updateBilling();
				})
			})
		})();
	})
}

var updateAlliance = function(){
	return new Promise(function(resolve){
		var cursor = Alliance.collection.find();
		(function updateAlliance(){
			cursor.next(function(e, doc){
				if(!doc){
					console.log('update alliance done!');
					return resolve();
				}

				doc.lastThreeDaysDonateData = [];
				doc.lastGvGKillData = [];
				doc.prestige = {
					score:0,
					startTime:0
				}
				_.each(doc.shrineDatas, function(data){
					delete data.maxStar;
				})
				doc.shrineReports = [];
				_.each(doc.members, function(member){
					member.beHelped = member.helpedByTroopsCount > 0;
					delete member.helpedByTroopsCount;
				})
				Alliance.collection.save(doc, function(e){
					if(!!e) console.log(e);
					else console.log('alliance ' + doc._id + ' update success!');
					updateAlliance();
				})
			})
		})();
	})
}

var updatePlayer = function(){
	return new Promise(function(resolve){
		var cursor = Player.collection.find();
		(function updatePlayer(){
			cursor.next(function(e, doc){
				if(!doc){
					console.log('update player done!');
					return resolve();
				}

				//doc.growUpTasks.dragonSkill = [];
				//_.each(doc.dragons, function(dragon){
				//	_.each(dragon.skills, function(skill){
				//		for(var i = 2; i <= skill.level; i++){
				//			TaskUtils.finishDragonSkillTaskIfNeed(doc, [], dragon.type, skill.name, i);
				//		}
				//	})
				//})

				doc.growUpTasks.cityBuild = [];
				_.each(doc.buildings, function(building){
					TaskUtils.finishCityBuildTaskIfNeed(doc, [], building.type, building.level);
					var hasBuildEvent = _.some(doc.buildingEvents, function(event){
						return event.location === building.location;
					})
					if(hasBuildEvent) TaskUtils.finishCityBuildTaskIfNeed(doc, [], building.type, building.level + 1);
					_.each(building.houses, function(house){
						TaskUtils.finishCityBuildTaskIfNeed(doc, [], house.type, house.level);
						var hasHouseEvent = _.some(doc.houseEvents, function(event){
							return event.buildingLocation === building.location && event.houseLocation === house.location;
						})
						if(hasHouseEvent) TaskUtils.finishCityBuildTaskIfNeed(doc, [], house.type, house.level + 1);
					})
				})

				doc.growUpTasks.productionTech = [];
				_.each(doc.productionTechs, function(tech, name){
					for(var i = 1; i <= tech.level; i++){
						TaskUtils.finishProductionTechTaskIfNeed(doc, [], name, i);
					}
					var hasTechEvent = _.some(doc.productionTechEvents, function(event){
						return event.name === name;
					})
					if(hasTechEvent) TaskUtils.finishProductionTechTaskIfNeed(doc, [], name, tech.level + 1);
				})

				doc.growUpTasks.pveCount = [];
				TaskUtils.finishPveCountTaskIfNeed(doc, []);

				doc.growUpTasks.soldierCount = [];
				_.each(doc.soldiers, function(count, name){
					TaskUtils.finishSoldierCountTaskIfNeed(doc, [], name);
				})

				Player.collection.save(doc, function(e){
					if(!!e) console.log(e);
					else console.log('player ' + doc._id + ' update success!');
					updatePlayer();
				})
			})
		})();
	})
}

var fixPlayerDragons = function(playerId, dragonTypes){
	return Promise.fromCallback(function(callback){
		Player.collection.findOne({_id:playerId}, function(e, doc){
			if(!doc) return callback();
			_.each(dragonTypes, function(dragonType){
				var troop = _.find(doc.troopsOut, function(troop){
					return troop.dragonType = dragonType;
				})
				if(!!troop){
					LogicUtils.addPlayerSoldiers(doc, [], troop.soldiers);
					doc.dragons[dragonType].status = 'free';
					LogicUtils.removeItemInArray(doc.troopsOut, troop)
				}
			})
			Player.collection.save(doc, function(e){
				if(!!e) return callback(e);
				else console.log('player ' + doc._id + ' update success!');
				callback();
			})
		})
	})
}

var fixPlayerData = function(){
	return new Promise(function(resolve){
		var cursor = Player.collection.find();
		(function updatePlayer(){
			cursor.next(function(e, doc){
				if(!doc){
					console.log('fix player done!');
					return resolve();
				}
				doc.defenceTroop = null;
				_.each(doc.troopsOut, function(troop){
					LogicUtils.addPlayerSoldiers(doc, [], troop.soldiers);
					doc.dragons[troop.dragonType].status = 'free';
				})
				doc.troopsOut = [];
				doc.deals = [];
				Player.collection.save(doc, function(e){
					if(!!e) console.log(e);
					else console.log('player ' + doc._id + ' fix success!');
					updatePlayer();
				})
			})
		})();
	}).then(function(){
		return Deal.removeAsync({});
	})
}

var fixAllianceData = function(){
	return new Promise(function(resolve){
		var cursor = Alliance.collection.find();
		(function updateAlliance(){
			cursor.next(function(e, doc){
				if(!doc){
					console.log('fix alliance done!');
					return resolve();
				}
				doc.basicInfo.status = 'peace';
				doc.basicInfo.statusStartTime = Date.now();
				doc.basicInfo.statusFinishTime = 0;
				_.each(doc.members, function(member){
					member.beHelped = false
				})
				_.each(doc.villages, function(village){
					village.villageEvent = null;
				})
				doc.shrineEvents = [];
				doc.villageEvents = [];
				doc.allianceFight = null;
				doc.marchEvents.strikeMarchEvents = [];
				doc.marchEvents.strikeMarchReturnEvents = [];
				doc.marchEvents.attackMarchEvents = [];
				doc.marchEvents.attackMarchReturnEvents = [];

				Alliance.collection.save(doc, function(e){
					if(!!e) console.log(e);
					else console.log('alliance ' + doc._id + ' fix success!');
					updateAlliance();
				})
			})
		})();
	})
}

var Analyse = function(dateString){
	var dateTime = LogicUtils.getDateTimeFromString(dateString);
	var nextDateTime = LogicUtils.getNextDateTime(dateTime, 1);
	var analyse = {}
	//每玩家等级玩家数量
	return Promise.fromCallback(function(callback){
		console.log('分析每城堡等级玩家数量...')
		analyse.keepLevels = {};
		var currentLevel = 40;
		(function countLevel(){
			if(currentLevel < 0) return callback();
			var sql = {
				'countInfo.lastLoginTime':{$gte:dateTime},
				'buildings.location_1.level':currentLevel
			};
			Player.countAsync(sql).then(function(count){
				analyse.keepLevels[currentLevel] = count
			}).finally(function(){
				currentLevel--;
				countLevel();
			})
		})();
	}).then(function(){
		console.log('分析新手通过率...')
		analyse.fteData = {}
		return Player.countAsync({
			'countInfo.registerTime':{$gte:dateTime, $lt:nextDateTime}
		}).then(function(count){
			analyse.fteData.playerTotal = count;
			return Player.countAsync({
				'countInfo.registerTime':{$gte:dateTime, $lt:nextDateTime},
				'countInfo.isFTEFinished':true
			})
		}).then(function(count){
			analyse.fteData.ftePassed = count;
			analyse.ftePercent = Number(analyse.fteData.ftePassed / analyse.fteData.playerTotal * 100).toFixed(2) + "%";
		})
	}).then(function(){
		console.log('分析宝石消耗...')
		analyse.gemUse = {};
		return GemChange.aggregateAsync([
			{
				$match:{
					changed:{$lt:0},
					time:{$gte:dateTime, $lt:nextDateTime}
				}
			},
			{$group:{_id:null, totalUsed:{$sum:'$changed'}}}
		]).then(function(datas){
			if(datas.length > 0){
				analyse.gemUse.gemUsedTotal = -datas[0].totalUsed;
			}else{
				analyse.gemUse.gemUsedTotal = 0;
			}
			return Player.count({
				'countInfo.lastLoginTime':{$gte:dateTime},
				'countInfo.registerTime':{$lt:nextDateTime}
			})
		}).then(function(count){
			analyse.gemUse.activePlayer = count;
			analyse.gemUse.gemUsePerPlayer = Number(analyse.gemUse.gemUsedTotal / analyse.gemUse.activePlayer).toFixed(2);
		})
	}).then(function(){
		console.log('分析宝石剩余...')
		analyse.gemLeft = {};
		return Player.aggregateAsync([
			{
				$match:{
					'countInfo.lastLoginTime':{$gte:dateTime}
				}
			},
			{$group:{_id:null, gemsTotal:{$sum:'$resources.gem'}}}
		]).then(function(datas){
			if(datas.length > 0){
				analyse.gemLeft.gemLeftTotal = datas[0].gemsTotal;
			}else{
				analyse.gemLeft.gemLeftTotal = 0;
			}
			analyse.gemLeft.activePlayer = analyse.gemUse.activePlayer;
			analyse.gemLeft.gemLeftPerPlayer = Number(analyse.gemLeft.gemLeftTotal / analyse.gemUse.activePlayer).toFixed(2);
		})
	}).then(function(){
		return Promise.resolve(analyse);
	})
}

var dbLocal = 'mongodb://127.0.0.1:27017/dragonfall-local-ios';
var dbBatcatIos = 'mongodb://114.55.60.126:27017/dragonfall-batcat-ios'
var dbDevWp = 'mongodb://54.223.172.65:27017/dragonfall-develop-wp'
var dbAiyingyongAndroid = 'mongodb://47.88.195.9:27017/dragonfall-aiyingyong-android'
var dbScmobileWp = 'mongodb://10.24.138.234:27017/dragonfall-scmobile-wp'

//
//mongoose.connect(dbScmobileWp, function(){
//	fixAllianceData().then(function(){
//		return fixPlayerData();
//	}).then(function(){
//		console.log('all fixed');
//		mongoose.disconnect();
//	})
//})

mongoose.connect(dbScmobileWp, function(){
	fixAllianceData().then(function(){
		return fixPlayerData();
	}).then(function(){
		mongoose.disconnect();
	})
})