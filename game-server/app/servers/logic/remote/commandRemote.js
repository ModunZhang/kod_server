"use strict"

/**
 * Created by modun on 14-8-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../../../utils/utils")
var DataUtils = require("../../../utils/dataUtils")
var LogicUtils = require("../../../utils/logicUtils")
var Consts = require("../../../consts/consts")

var GameDatas = require("../../../datas/GameDatas")
var PlayerInitData = GameDatas.PlayerInitData
var Dragons = GameDatas.Dragons
var AllianceBuilding = GameDatas.AllianceBuilding

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
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.User = app.get("User")
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
	var playerDoc = null
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		playerDoc = doc
		var building = playerDoc.buildings["location_" + location]
		if(!_.isObject(building)) return Promise.reject(new Error("建筑不存在"))
		building.level = level
		playerData.push(["buildings.location_" + building.location, building])
		var events = _.each(playerDoc.buildingEvents, function(event){
			return _.isEqual(event.type, building.type)
		})
		var funcs = []
		_.each(events, function(event){
			funcs.push(self.timeEventService.removePlayerTimeEventAsync(playerDoc, "buildingEvents", event.id))
		})
		LogicUtils.removeItemsInArray(playerDoc.buildingEvents, events)
		playerData.push(["buildingEvents", playerDoc.buildingEvents])
		funcs.push(self.playerDao.updateAsync(playerDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 清除玩家事件
 * @param uid
 * @param eventType
 * @param callback
 */
pro.rmevents = function(uid, eventType, callback){
	var self = this
	var playerDoc = null
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		playerDoc = doc
		if(!_.isArray(playerDoc[eventType])) return Promise.reject(new Error("玩家事件类型不存在"))
		var funcs = []
		while(playerDoc[eventType].length > 0){
			var event = playerDoc[eventType].pop()
			funcs.push(self.timeEventService.removePlayerTimeEventAsync(playerDoc, eventType, event.id))
		}
		playerData.push([eventType, playerDoc[eventType]])
		funcs.push(self.playerDao.updateAsync(doc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
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
		playerDoc = doc
		return self.playerDao.removeLockAsync(playerDoc._id)
	}).then(function(){
		callback()
		return Promise.resolve()
	}).then(function(){
		kickPlayer(playerDoc.logicServerId, playerDoc._id)
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
 * 统一修改玩家制作龙装备的材料数量
 * @param uid
 * @param count
 * @param callback
 */
pro.dragonmaterial = function(uid, count, callback){
	var self = this
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
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
 * 设置士兵数量
 * @param uid
 * @param count
 * @param callback
 */
pro.soldiers = function(uid, count, callback){
	var self = this
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
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
					eventFuncs.push([self.timeEventService, self.timeEventService.removePlayerTimeEventAsync, playerDoc, "dragonDeathEvents", deathEvent.id])
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
		var dragon = _.find(doc.dragons, function(dragon){
			if(_.isEqual(dragon.type, dragonType)) return true
		})
		if(dragon && level >= 0){
			_.each(dragon.skills, function(skill){
				if(DataUtils.isDragonSkillUnlocked(dragon, skill.name)){
					var maxLevel = DataUtils.getDragonSkillMaxLevel()
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
		var dragon = doc.dragons[dragonType]
		if(dragon && star >= 0 && star <= 5){
			var maxStar = DataUtils.getDragonMaxStar()
			dragon.star = maxStar > star ? star : maxStar
			_.each(dragon.equipments, function(equipment){
				equipment.name = ""
				equipment.star = 0
				equipment.exp = 0
				equipment.buffs = []
			})

			var maxLevel = Dragons.dragonStar[dragon.star].levelMax
			var minLevel = dragon.star == 1 ? 1 : Dragons.dragonStar[dragon.star - 1].levelMax + 1
			if(dragon.level > maxLevel) dragon.level = maxLevel
			if(dragon.level < minLevel) dragon.level = minLevel
			dragon.hp = DataUtils.getDragonMaxHp(dragon)
			dragon.hpRefreshTime = Date.now()
			playerData.push(["dragons." + dragon.type, dragon])
		}
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
 * 设置龙的等级
 * @param uid
 * @param dragonType
 * @param level
 * @param callback
 */
pro.dragonlevel = function(uid, dragonType, level, callback){
	var self = this
	var playerData = []
	this.playerDao.findAsync(uid).then(function(doc){
		var dragon = doc.dragons[dragonType]
		if(dragon){
			var maxLevel = Dragons.dragonStar[dragon.star].levelMax
			var minLevel = dragon.star == 1 ? 1 : Dragons.dragonStar[dragon.star - 1].levelMax + 1
			dragon.level = level > maxLevel ? maxLevel : level < minLevel ? minLevel : level
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
		if(!_.isObject(doc.alliance)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
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
		if(!_.isObject(doc.alliance)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
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
		if(!_.isObject(doc.alliance)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.allianceDao.findAsync(playerDoc.alliance.id)
	}).then(function(doc){
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
		attackAllianceDoc = doc
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(new Error("联盟正在战争准备期或战争期"))
		}
		return self.allianceDao.getModel().findOneAsync({
			"_id":{$ne:attackAllianceDoc._id},
			"serverId":playerDoc.serverId,
			"basicInfo.tag":targetAllianceTag,
			"basicInfo.status":Consts.AllianceStatus.Peace
		})
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("未能找到战力相匹配的联盟"))
		return self.allianceDao.findAsync(doc._id)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("联盟不存在"))
		defenceAllianceDoc = doc
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent])
		}
		var now = Date.now()
		var finishTime = now + (DataUtils.getAllianceIntInit("allianceFightPrepareMinutes") * 1000)
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
pro.resetalliancestatus = function(uid, callback){
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
	var ResetVillages = function(allianceDoc, allianceData, enemyAllianceDoc){
		var getVillageCountByName = function(villageName){
			var count = 0
			_.each(allianceDoc.villages, function(village){
				if(_.isEqual(village.name, villageName)) count += 1
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
			var villageMapObject = LogicUtils.getAllianceMapObjectById(allianceDoc, village.id)
			allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(villageMapObject), null])
			LogicUtils.removeItemInArray(allianceDoc.mapObjects, villageMapObject)
		})

		var mapObjects = allianceDoc.mapObjects
		var map = MapUtils.buildMap(mapObjects)
		var orderHallLevel = _.find(allianceDoc.buildings, function(building){
			return _.isEqual(building.name, Consts.AllianceBuildingNames.OrderHall)
		}).level
		var orderHallConfig = AllianceBuilding.orderHall[orderHallLevel]
		var villageTypeConfigs = DataUtils.getAllianceVillageTypeConfigs()
		_.each(villageTypeConfigs, function(typeConfig){
			var villageTotalCount = orderHallConfig[typeConfig.name + "Count"]
			var villageCurrentCount = getVillageCountByName(typeConfig.name)
			var villageNeedTobeCreated = villageTotalCount - villageCurrentCount
			var config = AllianceInitData.buildingName[typeConfig.name]
			var width = config.width
			var height = config.height
			for(var i = 0; i < villageNeedTobeCreated; i ++){
				var rect = MapUtils.getRect(map, width, height)
				if(_.isObject(rect)){
					var villageMapObject = MapUtils.addMapObject(map, mapObjects, rect, typeConfig.name)
					allianceData.push(["mapObjects." + allianceDoc.mapObjects.indexOf(villageMapObject), villageMapObject])
					var village = DataUtils.addAllianceVillageObject(allianceDoc, villageMapObject)
					allianceData.push(["villages." + allianceDoc.villages.indexOf(village), village])
				}
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

/**
 * 清除所有玩家的GC
 * @param uid
 * @param callback
 */
pro.cleargc = function(uid, callback){
	var self = this
	var playerDoc = null
	var kickPlayer = Promise.promisify(this.sessionService.kickByUid, this)
	this.playerDao.findAsync(uid).then(function(doc){
		playerDoc = doc
		return self.playerDao.removeLockAsync(playerDoc._id)
	}).then(function(){
		return self.User.updateAsync(null, {$set:{gcId:null}}, {multi:true})
	}).then(function(){
		callback()
		return Promise.resolve()
	}).then(function(){
		kickPlayer(playerDoc.logicServerId, playerDoc._id)
	}).catch(function(e){
		callback(e)
	})
}