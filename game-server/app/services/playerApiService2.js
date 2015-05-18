"use strict"

/**
 * Created by modun on 14-7-23.
 */

var ShortId = require("shortid")
var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var TaskUtils = require("../utils/taskUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var PlayerApiService2 = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.dataService = app.get("dataService")
	this.GemUse = app.get("GemUse")
}
module.exports = PlayerApiService2
var pro = PlayerApiService2.prototype

/**
 * 制作龙的装备
 * @param playerId
 * @param equipmentName
 * @param finishNow
 * @param callback
 */
pro.makeDragonEquipment = function(playerId, equipmentName, finishNow, callback){
	if(!DataUtils.isDragonEquipment(equipmentName)){
		callback(new Error("equipmentName 装备不存在"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'resources', 'buildings', 'productionTechs', 'soldiers', 'soldierStars', 'dragonMaterials', 'dragonEquipments', 'dailyTasks', 'growUpTasks', 'vipEvents', 'itemEvents', 'dragonEquipmentEvents', 'houseEvents'], false).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings.location_9
		if(building.level < 1) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, building.location))
		var gemUsed = 0
		var makeRequired = DataUtils.getPlayerMakeDragonEquipmentRequired(playerDoc, equipmentName)
		if(!LogicUtils.isEnough(makeRequired.materials, playerDoc.dragonMaterials)) return Promise.reject(ErrorUtils.dragonEquipmentMaterialsNotEnough(playerId, equipmentName))

		var buyedResources = null
		var preMakeEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(makeRequired.makeTime)
			buyedResources = DataUtils.buyResources(playerDoc, {coin:makeRequired.coin}, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			if(playerDoc.dragonEquipmentEvents.length > 0){
				preMakeEvent = playerDoc.dragonEquipmentEvents[0]
				var timeRemain = (preMakeEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
			buyedResources = DataUtils.buyResources(playerDoc, {coin:makeRequired.coin}, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"makeDragonEuipment"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce({coin:makeRequired.coin}, playerDoc.resources)
		LogicUtils.reduce(makeRequired.materials, playerDoc.dragonMaterials)
		_.each(makeRequired.materials, function(value, key){
			playerData.push(["dragonMaterials." + key, playerDoc.dragonMaterials[key]])
		})
		if(finishNow){
			playerDoc.dragonEquipments[equipmentName] += 1
			playerData.push(["dragonEquipments." + equipmentName, playerDoc.dragonEquipments[equipmentName]])
			TaskUtils.finishPlayerDailyTaskIfNeeded(playerDoc, playerData, Consts.DailyTaskTypes.GrowUp, Consts.DailyTaskIndexMap.GrowUp.MakeDragonEquipment)
		}else{
			if(_.isObject(preMakeEvent)){
				self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, "dragonEquipmentEvents", preMakeEvent.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, "dragonEquipmentEvents", preMakeEvent.id])
			}
			var finishTime = Date.now() + (makeRequired.makeTime * 1000)
			var event = LogicUtils.createDragonEquipmentEvent(playerDoc, equipmentName, finishTime)
			playerDoc.dragonEquipmentEvents.push(event)
			playerData.push(["dragonEquipmentEvents." + playerDoc.dragonEquipmentEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonEquipmentEvents", event.id, event.finishTime - Date.now()])
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 治疗伤兵
 * @param playerId
 * @param soldiers
 * @param finishNow
 * @param callback
 */
pro.treatSoldier = function(playerId, soldiers, finishNow, callback){
	if(!_.isArray(soldiers)){
		callback(new Error("soldiers 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'resources', 'buildings', 'soldiers', 'soldierStars', 'woundedSoldiers', 'productionTechs', 'growUpTasks', 'vipEvents', 'itemEvents', 'treatSoldierEvents', 'houseEvents'], false).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings.location_6
		if(building.level < 1) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, building.location))
		if(!LogicUtils.isTreatSoldierLegal(playerDoc, soldiers)) return Promise.reject(ErrorUtils.soldierNotExistOrCountNotLegal(playerId, soldiers))

		var gemUsed = 0
		var treatRequired = DataUtils.getPlayerTreatSoldierRequired(playerDoc, soldiers)
		var buyedResources = null
		var preTreatEvent = null
		DataUtils.refreshPlayerResources(playerDoc)
		if(finishNow){
			gemUsed += DataUtils.getGemByTimeInterval(treatRequired.treatTime)
			buyedResources = DataUtils.buyResources(playerDoc, treatRequired.resources, {})
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
		}else{
			buyedResources = DataUtils.buyResources(playerDoc, treatRequired.resources, playerDoc.resources)
			gemUsed += buyedResources.gemUsed
			LogicUtils.increace(buyedResources.totalBuy, playerDoc.resources)
			if(playerDoc.treatSoldierEvents.length > 0){
				preTreatEvent = playerDoc.treatSoldierEvents[0]
				var timeRemain = (preTreatEvent.finishTime - Date.now()) / 1000
				gemUsed += DataUtils.getGemByTimeInterval(timeRemain)
			}
		}
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		if(gemUsed > 0){
			playerDoc.resources.gem -= gemUsed
			var gemUse = {
				playerId:playerId,
				used:gemUsed,
				left:playerDoc.resources.gem,
				api:"treatSoldier"
			}
			updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])
		}
		LogicUtils.reduce(treatRequired.resources, playerDoc.resources)
		if(finishNow){
			_.each(soldiers, function(soldier){
				playerDoc.soldiers[soldier.name] += soldier.count
				playerDoc.woundedSoldiers[soldier.name] -= soldier.count
				playerData.push(["soldiers." + soldier.name, playerDoc.soldiers[soldier.name]])
				playerData.push(["woundedSoldiers." + soldier.name, playerDoc.woundedSoldiers[soldier.name]])
			})
			DataUtils.refreshPlayerPower(playerDoc, playerData)
			TaskUtils.finishPlayerPowerTaskIfNeed(playerDoc, playerData)
		}else{
			if(_.isObject(preTreatEvent)){
				self.playerTimeEventService.onPlayerEvent(playerDoc, playerData, "treatSoldierEvents", preTreatEvent.id)
				eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, "treatSoldierEvents", preTreatEvent.id])
			}
			_.each(soldiers, function(soldier){
				playerDoc.woundedSoldiers[soldier.name] -= soldier.count
				playerData.push(["woundedSoldiers." + soldier.name, playerDoc.woundedSoldiers[soldier.name]])
			})
			var finishTime = Date.now() + (treatRequired.treatTime * 1000)
			var event = LogicUtils.createTreatSoldierEvent(playerDoc, soldiers, finishTime)
			playerDoc.treatSoldierEvents.push(event)
			playerData.push(["treatSoldierEvents." + playerDoc.treatSoldierEvents.indexOf(event), event])
			eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "treatSoldierEvents", event.id, event.finishTime - Date.now()])
		}
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 孵化龙蛋
 * @param playerId
 * @param dragonType
 * @param callback
 */
pro.hatchDragon = function(playerId, dragonType, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'dragons', 'dragonHatchEvents'], false).then(function(doc){
		playerDoc = doc
		var dragons = playerDoc.dragons
		var dragon = dragons[dragonType]
		if(dragon.star > 0) return Promise.reject(ErrorUtils.dragonEggAlreadyHatched(playerId, dragonType))
		if(playerDoc.dragonHatchEvents.length > 0) return Promise.reject(ErrorUtils.dragonEggHatchEventExist(playerId, dragonType))
		var event = DataUtils.createPlayerHatchDragonEvent(playerDoc, dragon)
		playerDoc.dragonHatchEvents.push(event)
		playerData.push(["dragonHatchEvents." + playerDoc.dragonHatchEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dragonHatchEvents", event.id, event.finishTime - Date.now()])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 设置龙的某部位的装备
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param equipmentName
 * @param callback
 */
pro.setDragonEquipment = function(playerId, dragonType, equipmentCategory, equipmentName, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		callback(new Error("equipmentCategory 不合法"))
		return
	}
	if(!DataUtils.isDragonEquipment(equipmentName)){
		callback(new Error("equipmentName 不合法"))
		return
	}
	if(!DataUtils.isDragonEquipmentLegalAtCategory(equipmentName, equipmentCategory)){
		callback(new Error("equipmentName 不能装备到equipmentCategory"))
		return
	}
	if(!DataUtils.isDragonEquipmentLegalOnDragon(equipmentName, dragonType)){
		callback(new Error("equipmentName 不能装备到dragonType"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'dragons', 'dragonEquipments'], false).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(!DataUtils.isDragonEquipmentStarEqualWithDragonStar(equipmentName, dragon)) return Promise.reject(ErrorUtils.dragonEquipmentNotMatchForTheDragon(playerId, dragonType, equipmentCategory, equipmentName))
		if(playerDoc.dragonEquipments[equipmentName] <= 0) return Promise.reject(ErrorUtils.dragonEquipmentNotEnough(playerId, dragonType, equipmentCategory, equipmentName))
		var equipment = dragon.equipments[equipmentCategory]
		if(!_.isEmpty(equipment.name)) return Promise.reject(ErrorUtils.dragonAlreadyHasTheSameCategory(playerId, dragonType, equipmentCategory, equipmentName))
		equipment.name = equipmentName
		equipment.buffs = DataUtils.generateDragonEquipmentBuffs(equipmentName)
		playerDoc.dragonEquipments[equipmentName] -= 1
		playerData.push(["dragonEquipments." + equipmentName, playerDoc.dragonEquipments[equipmentName]])
		playerData.push(["dragons." + dragonType + ".equipments." + equipmentCategory, equipment])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 强化龙的装备
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param equipments
 * @param callback
 */
pro.enhanceDragonEquipment = function(playerId, dragonType, equipmentCategory, equipments, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		callback(new Error("equipmentCategory 不合法"))
		return
	}
	if(!_.isArray(equipments)){
		callback(new Error("equipments 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'dragons', 'dragonEquipments'], false).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		var equipment = dragon.equipments[equipmentCategory]
		if(_.isEmpty(equipment.name)) return Promise.reject(ErrorUtils.dragonDoNotHasThisEquipment(playerId, dragonType, equipmentCategory))
		if(DataUtils.isDragonEquipmentReachMaxStar(equipment)) return Promise.reject(ErrorUtils.dragonEquipmentReachMaxStar(playerId, dragonType, equipmentCategory))
		if(!LogicUtils.isEnhanceDragonEquipmentLegal(playerDoc, equipments)) return Promise.reject(ErrorUtils.dragonEquipmentsNotExistOrNotEnough(playerId, equipments))
		DataUtils.enhancePlayerDragonEquipment(playerDoc, playerDoc.dragons[dragonType], equipmentCategory, equipments)
		_.each(equipments, function(equipment){
			playerDoc.dragonEquipments[equipment.name] -= equipment.count
			playerData.push(["dragonEquipments." + equipment.name, playerDoc.dragonEquipments[equipment.name]])
		})
		playerData.push(["dragons." + dragonType + ".equipments." + equipmentCategory, equipment])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 重置装备随机属性
 * @param playerId
 * @param dragonType
 * @param equipmentCategory
 * @param callback
 */
pro.resetDragonEquipment = function(playerId, dragonType, equipmentCategory, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.contains(Consts.DragonEquipmentCategory, equipmentCategory)){
		callback(new Error("equipmentCategory 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'dragons', 'dragonEquipments'], false).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		var equipment = dragon.equipments[equipmentCategory]
		if(_.isEmpty(equipment.name)) return Promise.reject(ErrorUtils.dragonDoNotHasThisEquipment(playerId, dragonType, equipmentCategory))
		if(playerDoc.dragonEquipments[equipment.name] <= 0) return Promise.reject(ErrorUtils.dragonEquipmentNotEnough(playerId, dragonType, equipmentCategory, equipment.name))

		equipment.buffs = DataUtils.generateDragonEquipmentBuffs(equipment.name)
		playerDoc.dragonEquipments[equipment.name] -= 1
		playerData.push(["dragonEquipments." + equipment.name, playerDoc.dragonEquipments[equipment.name]])
		playerData.push(["dragons." + dragonType + ".equipments." + equipmentCategory, equipment])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 升级龙的技能
 * @param playerId
 * @param dragonType
 * @param skillKey
 * @param callback
 */
pro.upgradeDragonSkill = function(playerId, dragonType, skillKey, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}
	if(!_.isString(skillKey) || skillKey.trim().length > Define.InputLength.DragonSkillKey){
		callback(new Error("skillKey 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'resources', 'dragons', 'growUpTasks'], false).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star <= 0) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		var skill = dragon.skills[skillKey]
		if(!_.isObject(skill)) return Promise.reject(ErrorUtils.dragonSkillNotExist(playerId, dragonType, skillKey))
		if(!DataUtils.isDragonSkillUnlocked(dragon, skill.name)) return Promise.reject(ErrorUtils.dragonSkillIsLocked(playerId, dragonType, skillKey))
		if(DataUtils.isDragonSkillReachMaxLevel(skill)) return Promise.reject(ErrorUtils.dragonSkillReachMaxLevel(playerId, dragonType, skillKey))
		var upgradeRequired = DataUtils.getDragonSkillUpgradeRequired(dragon, skill)

		if(playerDoc.resources.blood < upgradeRequired.blood) return Promise.reject(ErrorUtils.heroBloodNotEnough(playerId, upgradeRequired.blood, playerDoc.resources.blood))
		skill.level += 1
		TaskUtils.finishDragonSkillTaskIfNeed(playerDoc, playerData, dragon.type, skill.name, skill.level)
		playerDoc.resources.blood -= upgradeRequired.blood
		playerData.push(["resources.blood", playerDoc.resources.blood])
		playerData.push(["dragons." + dragonType + ".skills." + skillKey, skill])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 升级龙的星级
 * @param playerId
 * @param dragonType
 * @param callback
 */
pro.upgradeDragonStar = function(playerId, dragonType, callback){
	if(!DataUtils.isDragonTypeExist(dragonType)){
		callback(new Error("dragonType 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'dragons', 'buildings', 'growUpTasks', 'vipEvents', 'itemEvents'], false).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon.star < 1) return Promise.reject(ErrorUtils.dragonNotHatched(playerId, dragonType))
		if(DataUtils.isDragonReachMaxStar(dragon)) return Promise.reject(ErrorUtils.dragonReachMaxStar(playerId, dragonType, dragon.star))
		if(!DataUtils.isDragonReachUpgradeLevel(dragon)) return Promise.reject(ErrorUtils.dragonUpgradeStarFailedForLevelNotLegal(playerId, dragon.type))
		if(!DataUtils.isDragonEquipmentsReachUpgradeLevel(dragon)) return Promise.reject(ErrorUtils.dragonUpgradeStarFailedForEquipmentNotLegal(playerId, dragon.type))

		dragon.star += 1
		_.each(dragon.equipments, function(equipment){
			equipment.name = ""
			equipment.star = 0
			equipment.exp = 0
			equipment.buffs = []
		})
		TaskUtils.finishDragonStarTaskIfNeed(playerDoc, playerData, dragon.type, dragon.star)
		DataUtils.refreshPlayerDragonsHp(playerDoc, dragon)
		playerData.push(["dragons." + dragonType, playerDoc.dragons[dragonType]])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 获取每日任务列表
 * @param playerId
 * @param callback
 */
pro.getDailyQuests = function(playerId, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'buildings', 'dailyQuests'], false).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings.location_15
		if(building.level <= 0) return Promise.reject(ErrorUtils.buildingNotBuild(playerId, building.location))
		var refreshTime = DataUtils.getDailyQuestsRefreshTime()
		var now = Date.now()
		if(playerDoc.dailyQuests.refreshTime + refreshTime <= now){
			var dailyQuests = DataUtils.createDailyQuests()
			playerDoc.dailyQuests.quests = dailyQuests
			playerDoc.dailyQuests.refreshTime = now
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		}else{
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, null])
		}
		playerData.push(["dailyQuests", playerDoc.dailyQuests])
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 为每日任务中某个任务增加星级
 * @param playerId
 * @param questId
 * @param callback
 */
pro.addDailyQuestStar = function(playerId, questId, callback){
	if(!_.isString(questId) || !ShortId.isValid(questId)){
		callback(new Error("questId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'resources', 'dailyQuests'], false).then(function(doc){
		playerDoc = doc
		var quest = _.find(playerDoc.dailyQuests.quests, function(quest){
			return _.isEqual(quest.id, questId)
		})
		if(!_.isObject(quest)) return Promise.reject(ErrorUtils.dailyQuestNotExist(playerId, questId))
		if(quest.star >= 5) return Promise.reject(ErrorUtils.dailyQuestReachMaxStar(playerId, quest))
		var gemUsed = DataUtils.getDailyQuestAddStarNeedGemCount()
		if(gemUsed > playerDoc.resources.gem) return Promise.reject(ErrorUtils.gemNotEnough(playerId))
		playerDoc.resources.gem -= gemUsed
		playerData.push(["resources.gem", playerDoc.resources.gem])
		var gemUse = {
			playerId:playerId,
			used:gemUsed,
			left:playerDoc.resources.gem,
			api:"addDailyQuestStar"
		}
		updateFuncs.push([self.GemUse, self.GemUse.createAsync, gemUse])

		quest.star += 1
		playerData.push(["dailyQuests.quests." + playerDoc.dailyQuests.quests.indexOf(quest) + ".star", quest.star])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 开始一个每日任务
 * @param playerId
 * @param questId
 * @param callback
 */
pro.startDailyQuest = function(playerId, questId, callback){
	if(!_.isString(questId) || !ShortId.isValid(questId)){
		callback(new Error("questId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'dailyQuests', 'dailyQuestEvents'], false).then(function(doc){
		playerDoc = doc
		var quest = _.find(playerDoc.dailyQuests.quests, function(quest){
			return _.isEqual(quest.id, questId)
		})
		if(!_.isObject(quest)) return Promise.reject(ErrorUtils.dailyQuestNotExist(playerId, questId))
		if(playerDoc.dailyQuestEvents.length > 0) return Promise.reject(ErrorUtils.dailyQuestEventExist(playerId, playerDoc.dailyQuestEvents))
		playerData.push(["dailyQuests.quests." + playerDoc.dailyQuests.quests.indexOf(quest), null])
		LogicUtils.removeItemInArray(playerDoc.dailyQuests.quests, quest)
		var event = DataUtils.createPlayerDailyQuestEvent(playerDoc, quest)
		playerDoc.dailyQuestEvents.push(event)
		playerData.push(["dailyQuestEvents." + playerDoc.dailyQuestEvents.indexOf(event), event])
		eventFuncs.push([self.timeEventService, self.timeEventService.addPlayerTimeEventAsync, playerDoc, "dailyQuestEvents", event.id, event.finishTime - Date.now()])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 领取每日任务奖励
 * @param playerId
 * @param questEventId
 * @param callback
 */
pro.getDailyQeustReward = function(playerId, questEventId, callback){
	if(!_.isString(questEventId) || !ShortId.isValid(questEventId)){
		callback(new Error("questEventId 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo', 'resources', 'buildings', 'soldiers', 'soldierStars', 'productionTechs', 'dailyQuestEvents', 'vipEvents', 'itemEvents', 'houseEvents'], false).then(function(doc){
		playerDoc = doc
		var questEvent = _.find(playerDoc.dailyQuestEvents, function(event){
			return _.isEqual(event.id, questEventId)
		})
		if(!_.isObject(questEvent)) return Promise.reject(ErrorUtils.dailyQuestEventNotExist(playerId, questEventId, playerDoc.dailyQuestEvents))
		if(questEvent.finishTime > 0) return Promise.reject(ErrorUtils.dailyQuestEventNotFinished(playerId, questEvent))
		playerData.push(["dailyQuestEvents." + playerDoc.dailyQuestEvents.indexOf(questEvent), null])
		LogicUtils.removeItemInArray(playerDoc.dailyQuestEvents, questEvent)

		var rewards = DataUtils.getPlayerDailyQuestEventRewards(playerDoc, questEvent)
		DataUtils.refreshPlayerResources(playerDoc)
		_.each(rewards, function(reward){
			playerDoc[reward.type][reward.name] += reward.count
			if(!_.isEqual(reward.type, "resources")){
				playerData.push([reward.type + "." + reward.name, playerDoc[reward.type][reward.name]])
			}
		})
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 设置玩家语言
 * @param playerId
 * @param language
 * @param callback
 */
pro.setPlayerLanguage = function(playerId, language, callback){
	if(!_.contains(Consts.AllianceLanguage, language)){
		callback(new Error("language 不合法"))
		return
	}
	var self = this
	var playerDoc = null
	var playerData = []
	var updateFuncs = []
	var eventFuncs = []
	this.dataService.findPlayerAsync(playerId, ['_id', 'basicInfo'], false).then(function(doc){
		playerDoc = doc
		playerDoc.basicInfo.language = language
		playerData.push(["basicInfo.language", language])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		return LogicUtils.excuteAll(eventFuncs)
	}).then(function(){
		callback(null, playerData)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 获取玩家个人信息
 * @param playerId
 * @param memberId
 * @param callback
 */
pro.getPlayerInfo = function(playerId, memberId, callback){
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}

	var self = this
	var playerViewData = null
	var memberDoc = null
	this.dataService.directFindPlayerAsync(memberId, ['_id', 'logicServerId', 'allianceId', 'countInfo', 'basicInfo'], false).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.playerNotExist(playerId, memberId))
		memberDoc = doc

		playerViewData = {
			id:memberDoc._id,
			name:memberDoc.basicInfo.name,
			icon:memberDoc.basicInfo.icon,
			power:memberDoc.basicInfo.power,
			kill:memberDoc.basicInfo.kill,
			levelExp:memberDoc.basicInfo.levelExp,
			vipExp:memberDoc.basicInfo.vipExp,
			lastLoginTime:memberDoc.countInfo.lastLoginTime,
			online:!_.isEmpty(memberDoc.logicServerId)
		}

		if(_.isString(memberDoc.allianceId)){
			return self.dataService.directFindAllianceAsync(memberDoc.allianceId, ['_id', 'basicInfo', 'titles', 'members'], false).then(function(doc){
				var memberObject = LogicUtils.getAllianceMemberById(doc, memberId)
				playerViewData.alliance = {
					name:doc.basicInfo.name,
					tag:doc.basicInfo.tag,
					title:memberObject.title,
					titleName:doc.titles[memberObject.title]
				}
				return Promise.resolve()
			})
		}else{
			return Promise.resolve()
		}
	}).then(function(){
		callback(null, playerViewData)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 发送个人邮件
 * @param playerId
 * @param memberId
 * @param title
 * @param content
 * @param callback
 */
pro.sendMail = function(playerId, memberId, title, content, callback){
	if(!_.isString(memberId) || !ShortId.isValid(memberId)){
		callback(new Error("memberId 不合法"))
		return
	}
	if(_.isEqual(playerId, memberId)){
		callback(new Error("playerId, memberId 不能给自己发邮件"))
		return
	}
	if(!_.isString(title) || title.trim().length > Define.InputLength.MailTitle){
		callback(new Error("title 不合法"))
		return
	}
	if(!_.isString(content) || content.trim().length > Define.InputLength.MailContent){
		callback(new Error("content 不合法"))
		return
	}

	this.dataService.sendPlayerMailAsync(playerId, memberId, title, content).then(function(){
		callback(null)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 阅读邮件
 * @param playerId
 * @param mailIds
 * @param callback
 */
pro.readMails = function(playerId, mailIds, callback){
	if(!_.isArray(mailIds) || mailIds.length == 0){
		callback(new Error("mailIds 不合法"))
		return
	}
	for(var i = 0; i < mailIds.length; i++){
		if(!ShortId.isValid(mailIds[i])){
			callback(new Error("mailIds 不合法"))
			return
		}
	}

	this.dataService.readPlayerMailsAsync(playerId, mailIds).then(function(data){
		callback(null, data)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 收藏邮件
 * @param playerId
 * @param mailId
 * @param callback
 */
pro.saveMail = function(playerId, mailId, callback){
	if(!_.isString(mailId) || !ShortId.isValid(mailId)){
		callback(new Error("mailId 不合法"))
		return
	}

	this.dataService.savePlayerMailAsync(playerId, mailId).then(function(data){
		callback(null, data)
	}).catch(function(e){
		callback(e)
	})
}