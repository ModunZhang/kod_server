"use strict"

/**
 * Created by modun on 14-8-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../../../utils/utils")
var DataUtils = require("../../../utils/dataUtils")
var LogicUtils = require("../../../utils/logicUtils")
var MapUtils = require("../../../utils/mapUtils")
var Consts = require("../../../consts/consts")

var GameDatas = require("../../../datas/GameDatas")
var AllianceInit = GameDatas.AllianceInitData
var AllianceBuildingConfig = GameDatas.AllianceBuilding
var PlayerInitData = GameDatas.PlayerInitData

var Player = require("../../../domains/player")

module.exports = function(app){
	return new CommandRemote(app)
}

var CommandRemote = function(app){
	this.app = app
	this.serverId = app.getServerId()
	this.redis = app.get("redis")
	this.scripto = app.get("scripto")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
	this.pushService = app.get("pushService")
	this.sessionService = app.get("backendSessionService")
	this.timeEventService = app.get("timeEventService")
}

var pro = CommandRemote.prototype

/**
 * 重置玩家数据
 * @param uid
 * @param callback
 */
pro.reset = function(uid, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var requiredInfo = {
			countInfo:{
				deviceId:"__testDeviceId2"
			},
			basicInfo:{
				name:"player_111111",
				cityName:"city_111111"
			}
		}
		var newPlayer = new Player(requiredInfo)
		newPlayer = Utils.clone(newPlayer)
		newPlayer._id = doc._id
		newPlayer.__v = doc.__v
		newPlayer.logicServerId = doc.logicServerId
		newPlayer.countInfo.deviceId = doc.countInfo.deviceId
		newPlayer.basicInfo.name = doc.basicInfo.name
		newPlayer.basicInfo.cityName = doc.basicInfo.cityName
		newPlayer.alliance = doc.alliance
		return self.playerDao.updateAsync(newPlayer)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		doc.resources.gem = gem
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		doc.resources.wood = count
		doc.resources.stone = count
		doc.resources.iron = count
		doc.resources.food = count
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改指定资源数量
 * @param uid
 * @param name
 * @param count
 * @param callback
 */
pro.resource = function(uid, name, count, callback){
	var self = this
	var playerData = {}
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(_.isUndefined(doc.resources[name])) return Promise.reject(new Error("资源不存在"))
		doc.resources[name] = count
		playerData.resources = doc.resources
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		DataUtils.refreshPlayerResources(doc)
		doc.resources.citizen = count
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		doc.resources.coin = count
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改玩家英雄之血的数量
 * @param uid
 * @param count
 * @param callback
 */
pro.blood = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		doc.resources.blood = count
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		DataUtils.refreshPlayerResources(doc)
		_.each(doc.buildings, function(building){
			if(building.level > 0){
				var buildingMaxLevel = DataUtils.getBuildingMaxLevel(building.type)
				building.level = level > buildingMaxLevel ? buildingMaxLevel : level
			}
			_.each(building.houses, function(house){
				var houseMaxLevel = DataUtils.getHouseMaxLevel(house.type)
				house.level = level > houseMaxLevel ? houseMaxLevel : level
			})
		})
		_.each(doc.towers, function(tower){
			if(tower.level > 0){
				var towerMaxLevel = DataUtils.getBuildingMaxLevel("tower")
				tower.level = level > towerMaxLevel ? towerMaxLevel : level
			}
		})
		var wallMaxLevel = DataUtils.getBuildingMaxLevel("wall")
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
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var keepMaxLevel = DataUtils.getBuildingMaxLevel("keep")
		doc.buildings.location_1.level = level > keepMaxLevel ? keepMaxLevel : level

		var events = []
		for(var i = 0; i < doc.buildingEvents.length; i++){
			var event = doc.buildingEvents[i]
			if(_.isEqual(event.location, 1)){
				events.push(event)
			}
		}
		LogicUtils.removeItemsInArray(doc.buildingEvents, events)

		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

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
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.materialEvents.length > 0){
			doc.materialEvents.pop()
		}
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
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
	var self = this
	var playerDoc = null
	var kickPlayer = Promise.promisify(this.sessionService.kickByUid, this)
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		return kickPlayer(playerDoc.logicServerId, playerDoc._id)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 统一修改玩家材料数量
 * @param uid
 * @param count
 * @param callback
 */
pro.material = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		doc.materials.blueprints = count
		doc.materials.tools = count
		doc.materials.tiles = count
		doc.materials.pulley = count
		doc.materials.trainingFigure = count
		doc.materials.bowTarget = count
		doc.materials.saddle = count
		doc.materials.ironPart = count
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 统一修改玩家特殊材料数量
 * @param uid
 * @param count
 * @param callback
 */
pro.soldiermaterial = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		doc.soldierMaterials.deathHand = count
		doc.soldierMaterials.heroBones = count
		doc.soldierMaterials.soulStone = count
		doc.soldierMaterials.magicBox = count
		doc.soldierMaterials.confessionHood = count
		doc.soldierMaterials.brightRing = count
		doc.soldierMaterials.holyBook = count
		doc.soldierMaterials.brightAlloy = count
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 清除士兵招募事件
 * @param uid
 * @param callback
 */
pro.rmsoldierevents = function(uid, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.soldierEvents.length > 0){
			doc.soldierEvents.pop()
		}
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 统一修改玩家制作龙装备的材料数量
 * @param uid
 * @param count
 * @param callback
 */
pro.dragonmaterial = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		_.each(doc.dragonMaterials, function(theCount, key){
			doc.dragonMaterials[key] = count
		})
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 统一修改玩家龙装备的数量
 * @param uid
 * @param count
 * @param callback
 */
pro.dragonequipment = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		_.each(doc.dragonEquipments, function(theCount, key){
			doc.dragonEquipments[key] = count
		})
		DataUtils.refreshPlayerResources(doc)
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 清除龙装备制造事件
 * @param uid
 * @param callback
 */
pro.rmdragonequipmentevents = function(uid, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.dragonEquipmentEvents.length > 0){
			doc.dragonEquipmentEvents.pop()
		}
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置士兵数量
 * @param uid
 * @param count
 * @param callback
 */
pro.soldiers = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		_.each(doc.soldiers, function(value, key){
			doc.soldiers[key] = count
		})
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置伤兵数量
 * @param uid
 * @param count
 * @param callback
 */
pro.woundedsoldiers = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		_.each(doc.woundedSoldiers, function(value, key){
			doc.woundedSoldiers[key] = count
		})
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 清除士兵治疗事件
 * @param uid
 * @param callback
 */
pro.rmtreatsoldierevents = function(uid, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.treatSoldierEvents.length > 0){
			doc.treatSoldierEvents.pop()
		}
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改指定龙的活力
 * @param uid
 * @param dragonType
 * @param count
 * @param callback
 */
pro.dragonhp = function(uid, dragonType, count, callback){
	var self = this
	var playerDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc

		var dragon = _.find(playerDoc.dragons, function(dragon){
			if(_.isEqual(dragon.type, dragonType)) return true
		})
		if(dragon && count >= 0){
			dragon.hp = count
			dragon.hpRefreshTime = Date.now()
			var deathEvent = null
			if(dragon.hp <= 0){
				deathEvent = DataUtils.createPlayerDragonDeathEvent(playerDoc, dragon)
				playerDoc.dragonDeathEvents.push(deathEvent)
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime])
			}else{
				deathEvent = _.find(playerDoc.dragonDeathEvents, function(deathEvent){
					return _.isEqual(deathEvent.dragonType, dragon.type)
				})
				if(_.isObject(deathEvent)){
					LogicUtils.removeItemInArray(playerDoc.dragonDeathEvents, deathEvent)
					eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, deathEvent.id])
				}
			}
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerDoc])
		}
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 设置龙的技能的等级
 * @param uid
 * @param dragonType
 * @param level
 * @param callback
 */
pro.dragonskill = function(uid, dragonType, level, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var dragon = _.find(doc.dragons, function(dragon){
			if(_.isEqual(dragon.type, dragonType)) return true
		})
		if(dragon && level >= 0){
			_.each(dragon.skills, function(skill){
				if(DataUtils.isDragonSkillUnlocked(dragon, skill.name)){
					var maxLevel = DataUtils.getDragonSkillMaxLevel(skill)
					skill.level = maxLevel > level ? level : maxLevel
				}
			})
		}
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置龙装备的星级
 * @param uid
 * @param dragonType
 * @param star
 * @param callback
 */
pro.dragonequipmentstar = function(uid, dragonType, star, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var dragon = _.find(doc.dragons, function(dragon){
			if(_.isEqual(dragon.type, dragonType)) return true
		})
		if(dragon && star >= 0){
			_.each(dragon.equipments, function(equipment){
				if(!_.isEmpty(equipment.name)){
					var maxStar = DataUtils.getDragonEquipmentMaxStar(equipment.name)
					equipment.star = maxStar > star ? star : maxStar
				}
			})
		}
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置龙的星级
 * @param uid
 * @param dragonType
 * @param star
 * @param callback
 */
pro.dragonstar = function(uid, dragonType, star, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var dragon = doc.dragons[dragonType]
		if(dragon && star >= 0){
			var maxStar = DataUtils.getDragonMaxStar()
			dragon.star = maxStar > star ? star : maxStar
			var lowestLevel = DataUtils.getDragonLowestLevelOnStar(dragon)
			var highestLevel = DataUtils.getDragonHighestLevelOnStar(dragon)
			if(dragon.level < lowestLevel) dragon.level = lowestLevel
			if(dragon.level > highestLevel) dragon.level = highestLevel
			_.each(dragon.equipments, function(equipment){
				equipment.name = ""
				equipment.star = 0
				equipment.exp = 0
				equipment.buffs = []
			})
			dragon.hp = DataUtils.getDragonHpMax(dragon)
			dragon.hpRefreshTime = Date.now()
		}
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 修改玩家名字
 * @param uid
 * @param name
 * @param callback
 */
pro.editplayername = function(uid, name, callback){
	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(_.isEqual(playerDoc.basicInfo.name, name)){
			updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, uid])
			return Promise.resolve()
		}else{
			return self.playerDao.findByIndexAsync("basicInfo.name", name).then(function(doc){
				if(_.isObject(doc)) return Promise.reject(new Error("名称已被其他玩家占用"))
				playerDoc.basicInfo.name = name
				updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
				pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerDoc])
				return Promise.resolve()
			})
		}
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 修改玩家城市名字
 * @param uid
 * @param cityName
 * @param callback
 */
pro.editplayercityname = function(uid, cityName, callback){
	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		playerDoc.basicInfo.cityName = cityName
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 设置捐赠级别
 * @param uid
 * @param donatelevel
 * @param callback
 */
pro.donatelevel = function(uid, donatelevel, callback){
	var self = this
	var updateFuncs = []
	var pushFuncs = []
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		var docInAlliance = LogicUtils.getAllianceMemberById(allianceDoc, uid)
		docInAlliance.donateStatus = {
			wood:donatelevel,
			stone:donatelevel,
			iron:donatelevel,
			food:donatelevel,
			coin:donatelevel,
			gem:donatelevel
		}
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, uid])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.__members = [{
			type:Consts.DataChangedType.Edit,
			data:docInAlliance
		}]

		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置联盟荣耀
 * @param uid
 * @param honnour
 * @param callback
 */
pro.alliancehonour = function(uid, honnour, callback){
	var self = this
	var updateFuncs = []
	var pushFuncs = []
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.basicInfo.honour = honnour
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, uid])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置联盟感知力
 * @param uid
 * @param perception
 * @param callback
 */
pro.allianceperception = function(uid, perception, callback){
	var self = this
	var updateFuncs = []
	var pushFuncs = []
	var playerDoc = null
	var allianceDoc = null
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.basicInfo.perception = perception
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, uid])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 激活联盟对战
 * @param uid
 * @param targetAllianceTag
 * @param callback
 */
pro.alliancefight = function(uid, targetAllianceTag, callback){
	var self = this
	var playerDoc = null
	var attackAllianceDoc = null
	var defenceAllianceDoc = null
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		if(!DataUtils.isAllianceOperationLegal(playerDoc.alliance.title, "findAllianceToFight")){
			return Promise.reject(new Error("此操作权限不足"))
		}
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, playerDoc._id])
		return self.allianceDao.findByIdAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		attackAllianceDoc = doc
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟正在战争准备期或战争期"))
		}
		return self.allianceDao.getModel().findOne({
			"_id":{$ne:attackAllianceDoc._id},
			"basicInfo.tag":targetAllianceTag,
			"basicInfo.status":Consts.AllianceStatus.Peace
		}).exec()
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("未能找到战力相匹配的联盟"))
		return self.allianceDao.findByIdAsync(doc._id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		defenceAllianceDoc = doc
		var now = Date.now()
		var finishTime = now + DataUtils.getAllianceFightPrepareTime()
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime])
		var attackAllianceData = {}
		attackAllianceData.fightRequests = []
		attackAllianceData.basicInfo = attackAllianceDoc.basicInfo
		attackAllianceData.allianceFight = attackAllianceDoc.allianceFight
		attackAllianceData.enemyAllianceDoc = LogicUtils.getAllianceViewData(defenceAllianceDoc)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])
		var defenceAllianceData = {}
		defenceAllianceData.fightRequests = []
		defenceAllianceData.basicInfo = defenceAllianceDoc.basicInfo
		defenceAllianceData.allianceFight = defenceAllianceDoc.allianceFight
		defenceAllianceData.enemyAllianceDoc = LogicUtils.getAllianceViewData(attackAllianceDoc)
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, defenceAllianceDoc._id, defenceAllianceData])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockByIdAsync(defenceAllianceDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 重置联盟状态
 * @param uid
 * @param callback
 */
pro.resetAllianceStatus = function(uid, callback){
	var ResetDonateStatus = function(allianceDoc, allianceData){
		if(!_.isArray(allianceData.__members)) allianceData.__members = []
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
			allianceData.__members.push({
				type:Consts.DataChangedType.Edit,
				data:member
			})
		})
	}
	var ResetMapDecorates = function(allianceDoc, allianceData){
		var mapObjects = allianceDoc.mapObjects
		var map = MapUtils.buildMap(mapObjects)
		if(!_.isArray(allianceData.__mapObjects)) allianceData.__mapObjects = []
		_.each(AllianceInit.decorateCount, function(countConfig, key){
			var countHas = LogicUtils.getAllianceDecorateObjectCountByType(allianceDoc, key)
			var config = AllianceInit.buildingType[key]
			var width = config.width
			var height = config.height
			var count = countConfig.count - countHas
			for(var i = 0; i < count; i++){
				var rect = MapUtils.getRect(map, width, height)
				if(_.isObject(rect)){
					var mapObject = MapUtils.addMapObject(map, mapObjects, {
						x:rect.x,
						y:rect.y,
						width:rect.width,
						height:rect.height
					}, key)
					allianceData.__mapObjects.push({
						type:Consts.DataChangedType.Add,
						data:mapObject
					})
				}
			}
		})

		if(_.isEmpty(allianceData.__mapObjects)) delete allianceData.__mapObjects
	}
	var ResetVillages = function(allianceDoc, allianceData, enemyAllianceDoc){
		var getVillageCountByType = function(villageType){
			var count = 0
			_.each(allianceDoc.villages, function(village){
				if(_.isEqual(village.type, villageType)) count += 1
			})
			return count
		}

		if(!_.isArray(allianceData.__villages)) allianceData.__villages = []
		if(!_.isArray(allianceData.__mapObjects)) allianceData.__mapObjects = []

		var villageTobeRemoved = []
		_.each(allianceDoc.villages, function(village){
			var villageEvent = _.find(allianceDoc.villageEvents, function(villageEvent){
				return _.isEqual(villageEvent.villageData.id, village.id)
			})
			if(!_.isObject(villageEvent) && _.isObject(enemyAllianceDoc)){
				villageEvent = _.find(enemyAllianceDoc.villageEvents, function(villageEvent){
					return _.isEqual(villageEvent.villageData.id, village.id)
				})
			}
			if(!_.isObject(villageEvent)) villageTobeRemoved.push(village)
		})
		_.each(villageTobeRemoved, function(village){
			LogicUtils.removeItemInArray(allianceDoc.villages, village)
			var mapObject = LogicUtils.removeAllianceMapObjectByLocation(allianceDoc, village.location)
			allianceData.__villages.push({
				type:Consts.DataChangedType.Remove,
				data:village
			})
			allianceData.__mapObjects.push({
				type:Consts.DataChangedType.Remove,
				data:mapObject
			})
		})

		var orderHallLevel = allianceDoc.buildings.orderHall.level
		var orderHallConfig = AllianceBuildingConfig.orderHall[orderHallLevel]
		var villageTypeConfigs = DataUtils.getAllianceVillageTypeConfigs()
		var map = MapUtils.buildMap(allianceDoc.mapObjects)
		var mapObjects = allianceDoc.mapObjects
		_.each(villageTypeConfigs, function(config){
			var villageWidth = config.width
			var villageHeight = config.height
			var villageTotalCount = orderHallConfig[config.type + "Count"]
			var villageCurrentCount = getVillageCountByType(config.type)
			var villageNeedTobeCreated = villageTotalCount - villageCurrentCount
			for(var i = 0; i < villageNeedTobeCreated; i++){
				var rect = MapUtils.getRect(map, villageWidth, villageHeight)
				var mapObject = MapUtils.addMapObject(map, mapObjects, {
					x:rect.x,
					y:rect.y,
					width:rect.width,
					height:rect.height
				}, config.type)
				allianceData.__mapObjects.push({
					type:Consts.DataChangedType.Add,
					data:mapObject
				})
				var villageObject = DataUtils.addAllianceVillageObject(allianceDoc, mapObject)
				allianceData.__villages.push({
					type:Consts.DataChangedType.Add,
					data:villageObject
				})
			}
		})

		if(!_.isArray(allianceData.__villages)) delete allianceData.__villages
		if(!_.isArray(allianceData.__mapObjects)) delete allianceData.__mapObjects
	}
	var ResolveOneAlliance = function(allianceId){
		var self = this
		var allianceDoc = null
		var enemyAllianceDoc = null
		var allianceData = {}
		var enemyAllianceData = {}
		var updateFuncs = []
		var pushFuncs = []
		return this.allianceDao.findByIdAsync(allianceId, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			allianceDoc = doc
			if(_.isObject(allianceDoc.allianceFight)){
				var allianceFight = allianceDoc.allianceFight
				var enemyAllianceId = _.isEqual(allianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
				return self.allianceDao.findByIdAsync(enemyAllianceId, true)
			}
			return Promise.resolve()
		}).then(function(doc){
			if(_.isObject(allianceDoc.allianceFight)){
				if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
				enemyAllianceDoc = doc
			}
			ResetDonateStatus(allianceDoc, allianceData)
			ResetMapDecorates(allianceDoc, allianceData)
			ResetVillages(allianceDoc, allianceData, enemyAllianceDoc)
			updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
			pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
			if(_.isObject(enemyAllianceDoc)){
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockByIdAsync, enemyAllianceDoc._id])
				LogicUtils.putAllianceDataToEnemyAllianceData(allianceData, enemyAllianceData)
				pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, enemyAllianceDoc._id, enemyAllianceData])
			}

			return Promise.resolve()
		}).then(function(){
			return LogicUtils.excuteAll(updateFuncs)
		}).then(function(){
			return LogicUtils.excuteAll(pushFuncs)
		})
	}
	var self = this
	var playerDoc = null
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return ResolveOneAlliance.call(self, playerDoc.alliance.id)
	}).then(function(){
		self.playerDao.removeLockByIdAsync(playerDoc._id)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}

/**
 * 设置玩家等级
 * @param uid
 * @param level
 * @param callback
 */
pro.playerlevel = function(uid, level, callback){
	var self = this
	var playerDoc = null
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc

		playerDoc.basicInfo.levelExp = PlayerInitData.playerLevel[level].expFrom
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerDoc])

		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(pushFuncs)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockByIdAsync(playerDoc._id))
		}
		if(funcs.length > 0){
			Promise.all(funcs).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
	})
}