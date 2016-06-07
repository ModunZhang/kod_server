"use strict";

/**
 * Created by modun on 15/11/8.
 */

var Promise = require("bluebird");
var mongoose = require("mongoose");
var _ = require("underscore");

var DataUtils = require("../game-server/app/utils/dataUtils");
var LogicUtils = require("../game-server/app/utils/logicUtils");
var MapUtils = require("../game-server/app/utils/mapUtils");
var TaskUtils = require("../game-server/app/utils/taskUtils");
var CommonUtils = require("../game-server/app/utils/utils");
var Consts = require("../game-server/app/consts/consts");

var Config = require("./config");
var Player = Promise.promisifyAll(require("../game-server/app/domains/player"));
var Alliance = Promise.promisifyAll(require("../game-server/app/domains/alliance"));
var Billing = Promise.promisifyAll(require("../game-server/app/domains/billing"));
var Deal = Promise.promisifyAll(require("../game-server/app/domains/deal"));
var GemChange = Promise.promisifyAll(require("../game-server/app/domains/gemChange"));

var GameDatas = require('../game-server/app/datas/GameDatas.js');
var PlayerInitData = GameDatas.PlayerInitData;

var fixPlayerGrowupTasks = function(){
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
};

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
				});
				doc.troopsOut = [];
				doc.helpToTroops = [];
				doc.helpedByTroop = null;
				_.each(doc.deals, function(deal){
					if(deal.isSold){
						var totalPrice = deal.itemData.count * deal.itemData.price;
						doc.resources.coin += totalPrice;
					}else{
						var type = deal.itemData.type;
						var name = deal.itemData.name;
						var count = deal.itemData.count;
						var realCount = _.isEqual(type, "resources") ? count * 1000 : count;
						doc[type][name] += realCount;
					}
				});
				doc.deals = [];
				Player.collection.save(doc, function(e){
					if(!!e){
						console.log(e);
					}else{
						console.log('player ' + doc._id + ' fix success!');
					}
					updatePlayer();
				});
			});
		})();
	}).then(function(){
		return Deal.removeAsync({});
	});
};

var fixAllianceData = function(){
	return new Promise(function(resolve){
		var cursor = Alliance.collection.find();
		(function updateAlliance(){
			cursor.next(function(e, doc){
				if(!doc){
					console.log('fix alliance done!');
					return resolve();
				}
				if(doc.basicInfo.status === 'fight'){
					var allianceFight = doc.allianceFight;
					var allianceFightInitHonour = DataUtils.getAllianceIntInit('allianceFightRewardHonour');
					var attackAllianceKill = allianceFight.attacker.allianceCountData.kill;
					var defenceAllianceKill = allianceFight.defencer.allianceCountData.kill;
					var allianceFightResult = attackAllianceKill >= defenceAllianceKill ? Consts.FightResult.AttackWin : Consts.FightResult.DefenceWin;
					var allianceFightHonourTotal = allianceFightInitHonour + ((attackAllianceKill + defenceAllianceKill) * 2);
					var attackAllianceRoutCount = allianceFight.attacker.allianceCountData.routCount;
					var defenceAllianceRoutCount = allianceFight.defencer.allianceCountData.routCount;
					var allianceFightRoutResult = attackAllianceRoutCount - defenceAllianceRoutCount;
					var attackAllianceHonourGetPercent = (_.isEqual(allianceFightResult, Consts.FightResult.AttackWin) ? 0.7 : 0.3) + (0.01 * allianceFightRoutResult);
					if(attackAllianceHonourGetPercent > 1){
						attackAllianceHonourGetPercent = 1;
					}else if(attackAllianceHonourGetPercent < 0){
						attackAllianceHonourGetPercent = 0;
					}
					var attackAllianceHonourGet = Math.floor(allianceFightHonourTotal * attackAllianceHonourGetPercent);
					var defenceAllianceHonourGet = allianceFightHonourTotal - attackAllianceHonourGet;
					if(doc._id === allianceFight.attacker.alliance.id){
						doc.basicInfo.honour += attackAllianceHonourGet;
					}else{
						doc.basicInfo.honour += defenceAllianceHonourGet;
					}
				}
				doc.basicInfo.status = 'peace';
				doc.basicInfo.statusStartTime = Date.now();
				doc.basicInfo.statusFinishTime = 0;
				doc.allianceFight = null;
				_.each(doc.members, function(member){
					member.beHelped = false;
				});
				_.each(doc.villages, function(village){
					village.villageEvent = null;
				});
				doc.shrineEvents = [];
				doc.marchEvents.strikeMarchEvents = [];
				doc.marchEvents.strikeMarchReturnEvents = [];
				doc.marchEvents.attackMarchEvents = [];
				Promise.fromCallback(function(callback){
					(function returnVillageResource(){
						if(doc.villageEvents.length === 0){
							return callback();
						}
						var villageEvent = doc.villageEvents.pop();
						var playerId = villageEvent.playerData.id;
						var resourceName = villageEvent.villageData.name.slice(0, -7);
						var resourceCollected = villageEvent.villageData.collectTotal;
						return Promise.fromCallback(function(_callback){
							Player.collection.findOne({_id:playerId}, _callback);
						}).then(function(_doc){
							_doc.resources[resourceName] += resourceCollected;
							return Promise.fromCallback(function(_callback){
								Player.collection.save(_doc, _callback);
							});
						}).then(function(){
							returnVillageResource();
						}).catch(function(e){
							callback(e);
						});
					})();
				}).then(function(){
					return Promise.fromCallback(function(callback){
						(function returnMarchResource(){
							if(doc.marchEvents.attackMarchReturnEvents.length === 0){
								return callback();
							}
							var marchReturnEvent = doc.marchEvents.attackMarchReturnEvents.pop();
							var playerId = marchReturnEvent.attackPlayerData.id;
							return Promise.fromCallback(function(_callback){
								Player.collection.findOne({_id:playerId}, _callback);
							}).then(function(_doc){
								var rewards = marchReturnEvent.attackPlayerData.rewards;
								_.each(rewards, function(reward){
									var type = reward.type;
									var name = reward.name;
									var count = reward.count;
									if(_.contains(Consts.MaterialDepotTypes, type)){
										LogicUtils.addPlayerMaterials(_doc, [], type, [{name:name, count:count}], false);
									}else{
										_doc[type][name] += count;
									}
								});
								return Promise.fromCallback(function(_callback){
									Player.collection.save(_doc, _callback);
								});
							}).then(function(){
								returnMarchResource();
							}).catch(function(e){
								callback(e);
							});
						})();
					});
				}).then(function(){
					return Promise.fromCallback(function(callback){
						Alliance.collection.save(doc, callback);
					});
				}).then(function(){
					console.log('alliance ' + doc._id + ' fix success!');
					updateAlliance();
				}).catch(function(e){
					console.log(e);
				});
			});
		})();
	});
};

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

})