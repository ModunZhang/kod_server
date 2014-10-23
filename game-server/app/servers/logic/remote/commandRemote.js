"use strict"

/**
 * Created by modun on 14-8-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../../../utils/utils")
var DataUtis = require("../../../utils/dataUtils")
var LogicUtils = require("../../../utils/logicUtils")

var Player = require("../../../domains/player")
var AllianceDao = require("../../../dao/allianceDao")
var PlayerDao = require("../../../dao/playerDao")

module.exports = function(app){
	return new CommandRemote(app)
}

var CommandRemote = function(app){
	this.app = app
	this.serverId = this.app.getServerId()
	this.redis = app.get("redis")
	this.scripto = app.get("scripto")
	this.allianceDao = Promise.promisifyAll(new AllianceDao(this.redis, this.scripto))
	this.playerDao = Promise.promisifyAll(new PlayerDao(this.redis, this.scripto))
	this.playerService = this.app.get("playerService")
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
		newPlayer.eventServerId = doc.eventServerId
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
		LogicUtils.refreshPlayerResources(doc)
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
		LogicUtils.refreshPlayerResources(doc)
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

		doc.resources.citizen = count
		LogicUtils.refreshPlayerResources(doc)
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
		LogicUtils.refreshPlayerResources(doc)
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
 * 修改玩家能量数据
 * @param uid
 * @param count
 * @param callback
 */
pro.energy = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var maxEnergy = DataUtis.getPlayerEnergyUpLimit(doc)
		doc.resources.energy = maxEnergy > count ? count : maxEnergy
		LogicUtils.refreshPlayerResources(doc)
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
		LogicUtils.refreshPlayerResources(doc)
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

		LogicUtils.refreshPlayerResources(doc)
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
		LogicUtils.refreshPlayerResources(doc)
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
		LogicUtils.refreshPlayerResources(doc)
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
		LogicUtils.refreshPlayerResources(doc)
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
		LogicUtils.refreshPlayerResources(doc)
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

		doc.dragonMaterials.ironIngot = count
		doc.dragonMaterials.steelIngot = count
		doc.dragonMaterials.mithrilIngot = count
		doc.dragonMaterials.blackIronIngot = count
		doc.dragonMaterials.arcaniteIngot = count
		doc.dragonMaterials.wispOfFire = count
		doc.dragonMaterials.wispOfCold = count
		doc.dragonMaterials.wispOfWind = count
		doc.dragonMaterials.lavaSoul = count
		doc.dragonMaterials.iceSoul = count
		doc.dragonMaterials.forestSoul = count
		doc.dragonMaterials.infernoSoul = count
		doc.dragonMaterials.blizzardSoul = count
		doc.dragonMaterials.fairySoul = count
		doc.dragonMaterials.moltenShard = count
		doc.dragonMaterials.glacierShard = count
		doc.dragonMaterials.chargedShard = count
		doc.dragonMaterials.moltenShiver = count
		doc.dragonMaterials.glacierShiver = count
		doc.dragonMaterials.chargedShiver = count
		doc.dragonMaterials.moltenCore = count
		doc.dragonMaterials.glacierCore = count
		doc.dragonMaterials.chargedCore = count
		doc.dragonMaterials.moltenMagnet = count
		doc.dragonMaterials.glacierMagnet = count
		doc.dragonMaterials.chargedMagnet = count
		doc.dragonMaterials.challengeRune = count
		doc.dragonMaterials.suppressRune = count
		doc.dragonMaterials.rageRune = count
		doc.dragonMaterials.guardRune = count
		doc.dragonMaterials.poisonRune = count
		doc.dragonMaterials.giantRune = count
		doc.dragonMaterials.dolanRune = count
		doc.dragonMaterials.warsongRune = count
		doc.dragonMaterials.infernoRune = count
		doc.dragonMaterials.arcanaRune = count
		doc.dragonMaterials.eternityRune = count
		LogicUtils.refreshPlayerResources(doc)
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

		doc.dragonEquipments.moltenCrown = count
		doc.dragonEquipments.glacierCrown = count
		doc.dragonEquipments.chargedCrown = count
		doc.dragonEquipments.fireSuppressCrown = count
		doc.dragonEquipments.coldSuppressCrown = count
		doc.dragonEquipments.windSuppressCrown = count
		doc.dragonEquipments.rageCrown = count
		doc.dragonEquipments.frostCrown = count
		doc.dragonEquipments.poisonCrown = count
		doc.dragonEquipments.giantCrown = count
		doc.dragonEquipments.dolanCrown = count
		doc.dragonEquipments.warsongCrown = count
		doc.dragonEquipments.infernoCrown = count
		doc.dragonEquipments.blizzardCrown = count
		doc.dragonEquipments.eternityCrown = count
		doc.dragonEquipments.fireSuppressChest = count
		doc.dragonEquipments.coldSuppressChest = count
		doc.dragonEquipments.windSuppressChest = count
		doc.dragonEquipments.rageChest = count
		doc.dragonEquipments.frostChest = count
		doc.dragonEquipments.poisonChest = count
		doc.dragonEquipments.giantChest = count
		doc.dragonEquipments.dolanChest = count
		doc.dragonEquipments.warsongChest = count
		doc.dragonEquipments.infernoChest = count
		doc.dragonEquipments.blizzardChest = count
		doc.dragonEquipments.eternityChest = count
		doc.dragonEquipments.fireSuppressSting = count
		doc.dragonEquipments.coldSuppressSting = count
		doc.dragonEquipments.windSuppressSting = count
		doc.dragonEquipments.rageSting = count
		doc.dragonEquipments.frostSting = count
		doc.dragonEquipments.poisonSting = count
		doc.dragonEquipments.giantSting = count
		doc.dragonEquipments.dolanSting = count
		doc.dragonEquipments.warsongSting = count
		doc.dragonEquipments.infernoSting = count
		doc.dragonEquipments.blizzardSting = count
		doc.dragonEquipments.eternitySting = count
		doc.dragonEquipments.fireSuppressOrb = count
		doc.dragonEquipments.coldSuppressOrb = count
		doc.dragonEquipments.windSuppressOrb = count
		doc.dragonEquipments.rageOrb = count
		doc.dragonEquipments.frostOrb = count
		doc.dragonEquipments.poisonOrb = count
		doc.dragonEquipments.giantOrb = count
		doc.dragonEquipments.dolanOrb = count
		doc.dragonEquipments.warsongOrb = count
		doc.dragonEquipments.infernoOrb = count
		doc.dragonEquipments.blizzardOrb = count
		doc.dragonEquipments.eternityOrb = count
		doc.dragonEquipments.moltenArmguard = count
		doc.dragonEquipments.glacierArmguard = count
		doc.dragonEquipments.chargedArmguard = count
		doc.dragonEquipments.fireSuppressArmguard = count
		doc.dragonEquipments.coldSuppressArmguard = count
		doc.dragonEquipments.windSuppressArmguard = count
		doc.dragonEquipments.rageArmguard = count
		doc.dragonEquipments.frostArmguard = count
		doc.dragonEquipments.poisonArmguard = count
		doc.dragonEquipments.giantArmguard = count
		doc.dragonEquipments.dolanArmguard = count
		doc.dragonEquipments.warsongArmguard = count
		doc.dragonEquipments.infernoArmguard = count
		doc.dragonEquipments.blizzardArmguard = count
		doc.dragonEquipments.eternityArmguard = count
		LogicUtils.refreshPlayerResources(doc)
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
 * 设置伤兵数量
 * @param uid
 * @param count
 * @param callback
 */
pro.addtreatsoldiers = function(uid, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		_.each(doc.treatSoldiers, function(value, key){
			doc.treatSoldiers[key] = count
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
pro.dragonvitality = function(uid, dragonType, count, callback){
	var self = this
	this.playerDao.findByIdAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var dragon = _.find(doc.dragons, function(dragon){
			if(_.isEqual(dragon.type.toLowerCase(), dragonType)) return true
		})
		if(dragon && count >= 0){
			dragon.vitality = count
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
			if(_.isEqual(dragon.type.toLowerCase(), dragonType)) return true
		})
		if(dragon && level >= 0){
			_.each(dragon.skills, function(skill){
				if(DataUtis.isDragonSkillUnlocked(dragon, skill.name)){
					var maxLevel = DataUtis.getDragonSkillMaxLevel(skill)
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
			if(_.isEqual(dragon.type.toLowerCase(), dragonType)) return true
		})
		if(dragon && star >= 0){
			_.each(dragon.equipments, function(equipment){
				if(!_.isEmpty(equipment.name)){
					var maxStar = DataUtis.getDragonEquipmentMaxStar(equipment.name)
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

		var dragon = _.find(doc.dragons, function(dragon){
			if(_.isEqual(dragon.type.toLowerCase(), dragonType)) return true
		})
		if(dragon && star >= 0){
			var maxStar = DataUtis.getDragonMaxStar()
			dragon.star = maxStar > star ? star : maxStar
			var lowestLevel = DataUtis.getDragonLowestLevelOnStar(dragon)
			var highestLevel = DataUtis.getDragonHighestLevelOnStar(dragon)
			if(dragon.level < lowestLevel) dragon.level = lowestLevel
			if(dragon.level > highestLevel) dragon.level = highestLevel
			_.each(dragon.equipments, function(equipment){
				equipment.name = ""
				equipment.star = 0
				equipment.exp = 0
				equipment.buffs = []
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
		pushFuncs.push([self.pushService, self.pushService.onAllianceMemberDataChangedAsync, allianceDoc, docInAlliance])
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
 * @param allianceHonour
 * @param callback
 */
pro.alliancehonour = function(uid, allianceHonour, callback){
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
		allianceDoc.basicInfo.honour = allianceHonour
		updateFuncs.push([self.playerDao, self.playerDao.removeLockByIdAsync, uid])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
		var allianceData = {}
		allianceData.basicInfo = allianceDoc.basicInfo
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc, allianceData])
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