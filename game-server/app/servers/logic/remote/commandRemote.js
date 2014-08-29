"use strict"

/**
 * Created by modun on 14-8-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var BasicPlayerInfo = require("../../../consts/basicPlayerInfo")
var Utils = require("../../../utils/utils")
var DataUtis = require("../../../utils/dataUtils")
var LogicUtils = require("../../../utils/logicUtils")

module.exports = function(app){
	return new CommandRemote(app)
}

var CommandRemote = function(app){
	this.app = app
	this.playerService = this.app.get("playerService")
	this.cacheService = this.app.get("cacheService")
	this.pushService = this.app.get("pushService")
	this.sessionService = this.app.get("backendSessionService")
}

var pro = CommandRemote.prototype


/**
 * 重置玩家数据
 * @param uid
 * @param callback
 */
pro.reset = function(uid, callback){
	var self = this
	var basicPlayerInfo = Utils.clone(BasicPlayerInfo)
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		basicPlayerInfo._id = doc._id
		basicPlayerInfo.__v = doc.__v
		basicPlayerInfo.frontServerId = doc.frontServerId
		basicPlayerInfo.countInfo.deviceId = doc.countInfo.deviceId
		basicPlayerInfo.basicInfo.name = doc.basicInfo.name
		basicPlayerInfo.basicInfo.cityName = doc.basicInfo.cityName
		return self.cacheService.updatePlayerAsync(basicPlayerInfo)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改玩家宝石数据
 * @param uid
 * @param gem
 * @param callback
 */
pro.gem = function(uid, gem, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		doc.basicInfo.gem = gem
		self.playerService.refreshPlayerResources(doc)
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改玩家资源数据
 * @param uid
 * @param count
 * @param callback
 */
pro.rs = function(uid, count, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		doc.resources.wood = count
		doc.resources.stone = count
		doc.resources.iron = count
		doc.resources.food = count
		self.playerService.refreshPlayerResources(doc)
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改玩家城民数据
 * @param uid
 * @param count
 * @param callback
 */
pro.citizen = function(uid, count, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		doc.resources.citizen = count
		self.playerService.refreshPlayerResources(doc)
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改玩家银币数据
 * @param uid
 * @param count
 * @param callback
 */
pro.coin = function(uid, count, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		doc.basicInfo.coin = count
		self.playerService.refreshPlayerResources(doc)
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改所有建筑的等级
 * @param uid
 * @param level
 * @param callback
 */
pro.building = function(uid, level, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		self.playerService.refreshPlayerResources(doc)
		_.each(doc.buildings, function(building){
			if(building.level > 0){
				var buildingMaxLevel = DataUtis.getBuildingMaxLevel(building.type)
				building.level = level > buildingMaxLevel ? buildingMaxLevel : level
			}
			_.each(building.houses, function(house){
				var houseMaxLevel = DataUtis.getHouseMaxLevel(house.type)
				house.level = level > houseMaxLevel ? houseMaxLevel : level
			})
		})
		_.each(doc.towers, function(tower){
			if(tower.level > 0){
				var towerMaxLevel = DataUtis.getBuildingMaxLevel("tower")
				tower.level = level > towerMaxLevel ? towerMaxLevel : level
			}
		})
		var wallMaxLevel = DataUtis.getBuildingMaxLevel("wall")
		doc.wall.level = level > wallMaxLevel ? wallMaxLevel : level
		while(doc.buildingEvents.length > 0){
			doc.buildingEvents.pop()
		}
		while(doc.houseEvents.length > 0){
			doc.houseEvents.pop()
		}
		while(doc.towerEvents.length > 0){
			doc.towerEvents.pop()
		}
		while(doc.wallEvents.length > 0){
			doc.wallEvents.pop()
		}
		self.playerService.refreshPlayerResources(doc)
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置城堡等级
 * @param uid
 * @param level
 * @param callback
 */
pro.keep = function(uid, level, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		var keepMaxLevel = DataUtis.getBuildingMaxLevel("keep")
		doc.buildings["location_1"].level = level > keepMaxLevel ? keepMaxLevel : level

		var events = []
		for(var i = 0; i < doc.buildingEvents.length; i++){
			var event = doc.buildingEvents[i]
			if(_.isEqual(event.location, 1)){
				events.push(event)
			}
		}
		LogicUtils.removeEvents(events, doc.buildingEvents)

		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 清除所有建筑的建造事件
 * @param uid
 * @param callback
 */
pro.rmbuildingevents = function(uid, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		while(doc.buildingEvents.length > 0){
			doc.buildingEvents.pop()
		}
		while(doc.houseEvents.length > 0){
			doc.houseEvents.pop()
		}
		while(doc.towerEvents.length > 0){
			doc.towerEvents.pop()
		}
		while(doc.wallEvents.length > 0){
			doc.wallEvents.pop()
		}
		self.playerService.refreshPlayerResources(doc)
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 清除材料制造事件
 * @param uid
 * @param callback
 */
pro.rmmaterialevents = function(uid, callback){
	var self = this
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		while(doc.materialEvents.length > 0){
			doc.materialEvents.pop()
		}
		return self.cacheService.updatePlayerAsync(doc)
	}).then(function(doc){
		self.pushService.onPlayerDataChanged(doc)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将玩家踢下线
 * @param uid
 * @param callback
 */
pro.kickme = function(uid, callback){
	var kickPlayer = Promise.promisify(this.sessionService.kickByUid, this)
	this.cacheService.getPlayerAsync(uid).then(function(doc){
		return kickPlayer(doc.frontServerId, doc._id)
	}, function(){
		return Promise.resolve()
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}