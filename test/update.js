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

var GameDatas = require('../game-server/app/datas/GameDatas.js')

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
				doc.dragons.redDragon.skills.skill_1.name = 'hellFire';
				doc.dragons.redDragon.skills.skill_2.name = 'infantryEnhance';
				doc.dragons.redDragon.skills.skill_3.name = 'archerEnhance';
				doc.dragons.redDragon.skills.skill_4.name = 'cavalryEnhance';
				doc.dragons.redDragon.skills.skill_5.name = 'siegeEnhance';
				doc.dragons.redDragon.skills.skill_6.name = 'dragonBreath';
				doc.dragons.redDragon.skills.skill_7.name = 'dragonBlood';
				doc.dragons.redDragon.skills.skill_8.name = 'leadership';
				doc.dragons.redDragon.skills.skill_9.name = 'greedy';
				doc.dragons.blueDragon.skills.skill_1.name = 'lightningStorm';
				doc.dragons.blueDragon.skills.skill_2.name = 'infantryEnhance';
				doc.dragons.blueDragon.skills.skill_3.name = 'archerEnhance';
				doc.dragons.blueDragon.skills.skill_4.name = 'cavalryEnhance';
				doc.dragons.blueDragon.skills.skill_5.name = 'siegeEnhance';
				doc.dragons.blueDragon.skills.skill_6.name = 'dragonBreath';
				doc.dragons.blueDragon.skills.skill_7.name = 'dragonBlood';
				doc.dragons.blueDragon.skills.skill_8.name = 'leadership';
				doc.dragons.blueDragon.skills.skill_9.name = 'surge';
				doc.dragons.greenDragon.skills.skill_1.name = 'poisonNova';
				doc.dragons.greenDragon.skills.skill_2.name = 'infantryEnhance';
				doc.dragons.greenDragon.skills.skill_3.name = 'archerEnhance';
				doc.dragons.greenDragon.skills.skill_4.name = 'cavalryEnhance';
				doc.dragons.greenDragon.skills.skill_5.name = 'siegeEnhance';
				doc.dragons.greenDragon.skills.skill_6.name = 'dragonBreath';
				doc.dragons.greenDragon.skills.skill_7.name = 'dragonBlood';
				doc.dragons.greenDragon.skills.skill_8.name = 'leadership';
				doc.dragons.greenDragon.skills.skill_9.name = 'earthquake';

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
var dbRelease = 'mongodb://52.193.86.12:27017/dragonfall-tokyo-ios'

mongoose.connect(dbRelease, function(){
	updatePlayer().then(function(){
		mongoose.disconnect();
	})
})