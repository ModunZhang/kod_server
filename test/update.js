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
				doc.growUpTasks.dragonSkill = [];
				_.each(doc.dragons, function(dragon){
					_.each(dragon.skills, function(skill){
						for(var i = 2; i <= skill.level; i++){
							TaskUtils.finishDragonSkillTaskIfNeed(doc, [], dragon.type, skill.name, i);
						}
					})
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

var dbLocal = 'mongodb://127.0.0.1:27017/dragonfall-local-ios';
var dbBatcatIos = 'mongodb://114.55.60.126:27017/dragonfall-batcat-ios'
var dbAiyingyongAndroid = 'mongodb://47.88.195.9:27017/dragonfall-aiyingyong-android'

mongoose.connect(dbAiyingyongAndroid, function(){
	//updatePlayer().then(function(){
	//	mongoose.disconnect();
	//})
})