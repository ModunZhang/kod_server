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

module.exports = function(app){
	return new CommandRemote(app)
}

var CommandRemote = function(app){
	this.app = app
	this.serverId = app.getServerId()
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
	this.pushService = app.get("pushService")
	this.sessionService = app.get("backendSessionService")
	this.timeEventService = app.get("timeEventService")
}

var pro = CommandRemote.prototype

/**
 * 修改指定资源数量
 * @param uid
 * @param name
 * @param count
 * @param callback
 */
pro.resources = function(uid, name, count, callback){
	var self = this
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(_.isUndefined(doc.resources[name])) return Promise.reject(new Error("资源不存在"))
		doc.resources[name] = count
		DataUtils.refreshPlayerResources(doc)
		playerData.push(["resources", doc.resources])

		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 设置建筑等级
 * @param uid
 * @param location
 * @param level
 * @param callback
 */
pro.buildinglevel = function(uid, location, level, callback){
	var self = this
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		var building = doc.buildings["location_" + location]
		if(!_.isObject(building)) return Promise.reject(new Error("建筑不存在"))
		building.level = level
		playerData.push(["buildings.location_" + building.location, building])
		var events = _.each(doc.buildingEvents, function(event){
			return _.isEqual(event.type, building.type)
		})
		LogicUtils.removeItemsInArray(doc.buildingEvents, events)
		playerData.push(["buildingEvents", doc.buildingEvents])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.buildingEvents.length > 0){
			doc.buildingEvents.pop()
		}
		while(doc.houseEvents.length > 0){
			doc.houseEvents.pop()
		}

		DataUtils.refreshPlayerResources(doc)
		playerData.push(["resources", doc.resources])
		playerData.push(["buildingEvents", []])
		playerData.push(["houseEvents", []])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.materialEvents.length > 0){
			doc.materialEvents.pop()
		}
		playerData.push(["materialEvents", []])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		return self.playerDao.removeLockAsync(playerDoc._id)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
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
		playerData.push(["materials", doc.materials])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
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
		playerData.push(["soldierMaterials", doc.soldierMaterials])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.soldierEvents.length > 0){
			doc.soldierEvents.pop()
		}
		playerData.push(["soldierEvents", []])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		_.each(doc.dragonMaterials, function(theCount, key){
			doc.dragonMaterials[key] = count
		})
		playerData.push(["dragonMaterials", doc.dragonMaterials])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		_.each(doc.dragonEquipments, function(theCount, key){
			doc.dragonEquipments[key] = count
		})
		playerData.push(["dragonEquipments", doc.dragonEquipments])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.dragonEquipmentEvents.length > 0){
			doc.dragonEquipmentEvents.pop()
		}
		playerData.push(["dragonEquipmentEvents", []])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		_.each(doc.soldiers, function(value, key){
			doc.soldiers[key] = count
		})
		playerData.push(["soldiers", doc.soldiers])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		_.each(doc.woundedSoldiers, function(value, key){
			doc.woundedSoldiers[key] = count
		})
		playerData.push(["woundedSoldiers", doc.woundedSoldiers])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		while(doc.treatSoldierEvents.length > 0){
			doc.treatSoldierEvents.pop()
		}
		playerData.push(["treatSoldierEvents", []])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(uid).then(function(doc){
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
				eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonDeathEvents", deathEvent.id, deathEvent.finishTime - Date.now()])
			}else{
				deathEvent = _.find(playerDoc.dragonDeathEvents, function(deathEvent){
					return _.isEqual(deathEvent.dragonType, dragon.type)
				})
				if(_.isObject(deathEvent)){
					LogicUtils.removeItemInArray(playerDoc.dragonDeathEvents, deathEvent)
					eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, deathEvent.id])
				}
			}
			playerData.push(["dragonDeathEvents", playerDoc.dragonDeathEvents])
			playerData.push(["dragons." + dragon.type, dragon])
			updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
			pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
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
		playerData.push(["dragons." + dragon.type, dragon])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
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
		playerData.push(["dragons." + dragon.type, dragon])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
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
			dragon.hp = DataUtils.getDragonMaxHp(dragon)
			dragon.hpRefreshTime = Date.now()
		}
		playerData.push(["dragons." + dragon.type, dragon])
		return self.playerDao.updateAsync(doc)
	}).then(function(doc){
		return self.pushService.onPlayerDataChangedAsync(doc, playerData)
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
	var allianceData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findAsync(playerDoc.alliance.id)
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
		allianceData.push(["members." + allianceDoc.members.indexOf(docInAlliance), docInAlliance])

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, uid])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
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
	var allianceData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.basicInfo.honour = honnour
		allianceData.push(["basicInfo", allianceDoc.basicInfo])

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, uid])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
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
	var allianceData = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		if(!_.isObject(doc.alliance) || _.isEmpty(doc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("联盟不存在"))
		}
		allianceDoc = doc
		allianceDoc.basicInfo.perception = perception
		allianceDoc.basicInfo.perceptionRefreshTime = Date.now()
		allianceData.push(["basicInfo", allianceDoc.basicInfo])

		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, uid])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, allianceDoc])
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
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findAsync(uid).then(function(doc){
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
		updateFuncs.push([self.playerDao, self.playerDao.removeLockAsync, playerDoc._id])
		return self.allianceDao.findAsync(playerDoc.alliance.id)
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
		return self.allianceDao.findAsync(doc._id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		defenceAllianceDoc = doc
		var now = Date.now()
		var finishTime = now + DataUtils.getAllianceFightPrepareTime()
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, attackAllianceDoc, true])
		updateFuncs.push([self.allianceDao, self.allianceDao.updateAsync, defenceAllianceDoc, true])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime - Date.now()])

		attackAllianceData.push(["fightRequests", []])
		attackAllianceData.push(["basicInfo", attackAllianceDoc.basicInfo])
		attackAllianceData.push(["allianceFight", attackAllianceDoc.allianceFight])
		attackAllianceData.push(["enemyAllianceDoc", LogicUtils.getAllianceViewData(defenceAllianceDoc)])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, attackAllianceDoc._id, attackAllianceData])

		defenceAllianceData.push(["fightRequests", []])
		defenceAllianceData.fightRequests = []
		defenceAllianceData.push(["basicInfo", defenceAllianceDoc.basicInfo])
		defenceAllianceData.push(["allianceFight", defenceAllianceDoc.allianceFight])
		defenceAllianceData.push(["enemyAllianceDoc", LogicUtils.getAllianceViewData(attackAllianceDoc)])
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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
		}
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(attackAllianceDoc._id))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.allianceDao.removeLockAsync(defenceAllianceDoc._id))
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
			allianceData.push(["members." + allianceDoc.members.indexOf(member) + ".donateStatus", member.donateStatus])
		})
	}
	var ResetMapDecorates = function(allianceDoc, allianceData){
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
					var mapObject = MapUtils.addMapObject(map, mapObjects, {
						x:rect.x,
						y:rect.y,
						width:rect.width,
						height:rect.height
					}, key)
					allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject), mapObject])
				}
			}
		})
	}
	var ResetVillages = function(allianceDoc, allianceData, enemyAllianceDoc){
		var getVillageCountByType = function(villageType){
			var count = 0
			_.each(allianceDoc.villages, function(village){
				if(_.isEqual(village.type, villageType)) count += 1
			})
			return count
		}

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
			allianceData.push(["villages." + allianceDoc.villages.indexOf(village), null])
			LogicUtils.removeItemInArray(allianceDoc.villages, village)
			var mapObject = LogicUtils.getAllianceMapObjectByLocation(allianceDoc, village.location)
			allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject), null])
			LogicUtils.removeItemInArray(allianceDoc.mapObjects, mapObject)
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
				allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(mapObject), mapObject])
				var villageObject = DataUtils.addAllianceVillageObject(allianceDoc, mapObject)
				allianceData.push(["villages." + allianceDoc.villages.indexOf(villageObject), villageObject])
			}
		})
	}
	var ResolveAllianceStatus = function(allianceId){
		var self = this
		var allianceDoc = null
		var enemyAllianceDoc = null
		var allianceData = []
		var enemyAllianceData = []
		var updateFuncs = []
		var pushFuncs = []
		return this.allianceDao.findAsync(allianceId, true).then(function(doc){
			if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
			allianceDoc = doc
			if(_.isObject(allianceDoc.allianceFight)){
				var allianceFight = allianceDoc.allianceFight
				var enemyAllianceId = _.isEqual(allianceDoc._id, allianceFight.attackAllianceId) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
				return self.allianceDao.findAsync(enemyAllianceId, true)
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
				updateFuncs.push([self.allianceDao, self.allianceDao.removeLockAsync, enemyAllianceDoc._id])
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
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance) || _.isEmpty(playerDoc.alliance.id)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		return ResolveAllianceStatus.call(self, playerDoc.alliance.id)
	}).then(function(){
		self.playerDao.removeLockAsync(playerDoc._id)
	}).then(function(){
		callback()
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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
	var playerData = []
	var updateFuncs = []
	var pushFuncs = []
	this.playerDao.findAsync(uid).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
		playerDoc = doc
		playerDoc.basicInfo.levelExp = PlayerInitData.playerLevel[level].expFrom
		playerData.push(["basicInfo", playerDoc.basicInfo])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])

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
			funcs.push(self.playerDao.removeLockAsync(playerDoc._id))
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