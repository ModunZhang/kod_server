"use strict"

/**
 * Created by modun on 14-8-23.
 */

var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../../../utils/utils")
var DataUtils = require("../../../utils/dataUtils")
var LogicUtils = require("../../../utils/logicUtils")
var ErrorUtils = require("../../../utils/errorUtils")
var Consts = require("../../../consts/consts")

var GameDatas = require("../../../datas/GameDatas")
var PlayerInitData = GameDatas.PlayerInitData
var Dragons = GameDatas.Dragons

module.exports = function(app){
	return new CommandRemote(app)
}

var CommandRemote = function(app){
	this.app = app
	this.serverId = app.getServerId()
	this.pushService = app.get("pushService")
	this.sessionService = app.get("backendSessionService")
	this.timeEventService = app.get("timeEventService")
	this.playerTimeEventService = app.get("playerTimeEventService")
	this.dataService = app.get("dataService")
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		if(_.isUndefined(playerDoc.resources[name])) return Promise.reject(new Error("资源不存在"))
		playerDoc.resources[name] = count
		DataUtils.refreshPlayerResources(playerDoc)
		playerData.push(["resources", playerDoc.resources])

		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
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
		funcs.push(self.dataService.updatePlayerAsync(playerDoc, playerDoc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		if(!_.isArray(playerDoc[eventType])) return Promise.reject(new Error("玩家事件类型不存在"))
		var funcs = []
		while(playerDoc[eventType].length > 0){
			var event = playerDoc[eventType].pop()
			funcs.push(self.timeEventService.removePlayerTimeEventAsync(playerDoc, eventType, event.id))
		}
		playerData.push([eventType, playerDoc[eventType]])
		funcs.push(self.dataService.updatePlayerAsync(doc, doc))
		return Promise.all(funcs)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		playerDoc.materials.blueprints = count
		playerDoc.materials.tools = count
		playerDoc.materials.tiles = count
		playerDoc.materials.pulley = count
		playerDoc.materials.trainingFigure = count
		playerDoc.materials.bowTarget = count
		playerDoc.materials.saddle = count
		playerDoc.materials.ironPart = count
		playerData.push(["materials", playerDoc.materials])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		playerDoc.soldierMaterials.deathHand = count
		playerDoc.soldierMaterials.heroBones = count
		playerDoc.soldierMaterials.soulStone = count
		playerDoc.soldierMaterials.magicBox = count
		playerDoc.soldierMaterials.confessionHood = count
		playerDoc.soldierMaterials.brightRing = count
		playerDoc.soldierMaterials.holyBook = count
		playerDoc.soldierMaterials.brightAlloy = count
		playerData.push(["soldierMaterials", playerDoc.soldierMaterials])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		_.each(playerDoc.dragonMaterials, function(theCount, key){
			playerDoc.dragonMaterials[key] = count
		})
		playerData.push(["dragonMaterials", playerDoc.dragonMaterials])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		_.each(playerDoc.dragonEquipments, function(theCount, key){
			playerDoc.dragonEquipments[key] = count
		})
		playerData.push(["dragonEquipments", playerDoc.dragonEquipments])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		_.each(playerDoc.soldiers, function(value, key){
			playerDoc.soldiers[key] = count
		})
		playerData.push(["soldiers", playerDoc.soldiers])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		_.each(playerDoc.woundedSoldiers, function(value, key){
			playerDoc.woundedSoldiers[key] = count
		})
		playerData.push(["woundedSoldiers", playerDoc.woundedSoldiers])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
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
			updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		var dragon = _.find(playerDoc.dragons, function(dragon){
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
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		var dragon = _.find(playerDoc.dragons, function(dragon){
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
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
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
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
				callback(e)
			})
		}else{
			callback(e)
		}
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
	var playerDoc = null
	var playerData = []
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		var dragon = playerDoc.dragons[dragonType]
		if(dragon){
			var maxLevel = Dragons.dragonStar[dragon.star].levelMax
			var minLevel = dragon.star == 1 ? 1 : Dragons.dragonStar[dragon.star - 1].levelMax + 1
			dragon.level = level > maxLevel ? maxLevel : level < minLevel ? minLevel : level
			dragon.hp = DataUtils.getDragonMaxHp(dragon)
			dragon.hpRefreshTime = Date.now()
		}
		playerData.push(["dragons." + dragon.type, dragon])
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(playerDoc, playerData)
	}).then(function(){
		callback()
	}).catch(function(e){
		if(_.isObject(playerDoc)){
			return self.dataService.updatePlayerAsync(playerDoc, null).then(function(){
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		_.each(playerDoc.allianceDonate, function(value, key){
			playerDoc.allianceDonate[key] = donatelevel
		})
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
		if(!_.isString(doc.allianceId)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		allianceDoc.basicInfo.honour = honnour
		allianceData.push(["basicInfo", allianceDoc.basicInfo])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, null])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
		if(!_.isString(doc.allianceId)){
			return Promise.reject(new Error("玩家未加入联盟"))
		}
		playerDoc = doc
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		allianceDoc = doc
		allianceDoc.basicInfo.perception = perception
		allianceDoc.basicInfo.perceptionRefreshTime = Date.now()
		allianceData.push(["basicInfo", allianceDoc.basicInfo])

		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, null])
		updateFuncs.push([self.dataService, self.dataService.updateAllianceAsync, allianceDoc, allianceDoc])
		pushFuncs.push([self.pushService, self.pushService.onAllianceDataChangedAsync, allianceDoc._id, allianceData])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		if(_.isObject(allianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(allianceDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		playerDoc.basicInfo.levelExp = PlayerInitData.playerLevel[level].expFrom
		playerData.push(["basicInfo", playerDoc.basicInfo])
		updateFuncs.push([self.dataService, self.dataService.updatePlayerAsync, playerDoc, playerDoc])
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
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
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
	this.dataService.findPlayerAsync(uid).then(function(doc){
		playerDoc = doc
		playerDoc.gcId = null
		return self.dataService.updatePlayerAsync(playerDoc, playerDoc)
	}).then(function(){
		callback()
		return Promise.resolve()
	}).then(function(){
		kickPlayer(playerDoc.logicServerId, playerDoc._id)
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
		}
		return Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 开启联盟战
 * @param playerId
 * @param defenceAllianceId
 * @param callback
 */
pro.alliancefight = function(playerId, defenceAllianceId, callback){
	var self = this
	var playerDoc = null
	var attackAllianceDoc = null
	var attackAllianceData = []
	var defenceAllianceDoc = null
	var defenceAllianceData = []
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isString(playerDoc.allianceId)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.findAllianceAsync(playerDoc.allianceId)
	}).then(function(doc){
		attackAllianceDoc = doc
		var playerObject = LogicUtils.getAllianceMemberById(attackAllianceDoc, playerId)
		if(!DataUtils.isAllianceOperationLegal(playerObject.title, "findAllianceToFight")){
			return Promise.reject(ErrorUtils.allianceOperationRightsIllegal(playerId, playerDoc.allianceId, "findAllianceToFight"))
		}
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Prepare) || _.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Fight)){
			return Promise.reject(ErrorUtils.allianceInFightStatus(playerId, attackAllianceDoc._id))
		}
		return self.dataService.findAllianceAsync(defenceAllianceId)
	}).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(ErrorUtils.allianceNotExist(defenceAllianceId))
		defenceAllianceDoc = doc
		if(_.isEqual(attackAllianceDoc.basicInfo.status, Consts.AllianceStatus.Protect)){
			eventFuncs.push([self.timeEventService, self.timeEventService.removeAllianceTimeEventAsync, attackAllianceDoc, Consts.AllianceStatusEvent, Consts.AllianceStatusEvent])
		}
		var now = Date.now()
		var finishTime = now + (DataUtils.getAllianceIntInit("allianceFightPrepareMinutes") * 60 * 1000)
		LogicUtils.prepareForAllianceFight(attackAllianceDoc, defenceAllianceDoc, finishTime)
		attackAllianceData.push(["basicInfo", attackAllianceDoc.basicInfo])
		attackAllianceData.push(["allianceFight", attackAllianceDoc.allianceFight])
		defenceAllianceData.push(["basicInfo", defenceAllianceDoc.basicInfo])
		defenceAllianceData.push(["allianceFight", defenceAllianceDoc.allianceFight])
		attackAllianceDoc.fightRequests = []
		attackAllianceData.push(["fightRequests", attackAllianceDoc.fightRequests])
		defenceAllianceDoc.fightRequests = []
		defenceAllianceData.push(["fightRequests", defenceAllianceDoc.fightRequests])

		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, attackAllianceDoc, attackAllianceDoc])
		updateFuncs.push([self.dataService, self.dataService.flushAllianceAsync, defenceAllianceDoc, defenceAllianceDoc])
		eventFuncs.push([self.timeEventService, self.timeEventService.addAllianceFightTimeEventAsync, attackAllianceDoc, defenceAllianceDoc, finishTime - Date.now()])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, attackAllianceDoc._id, attackAllianceData, LogicUtils.getAllianceViewData(defenceAllianceDoc)])
		pushFuncs.push([self.pushService, self.pushService.onAllianceFightAsync, defenceAllianceDoc._id, defenceAllianceData, LogicUtils.getAllianceViewData(attackAllianceDoc)])

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
		if(_.isObject(attackAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(attackAllianceDoc, null))
		}
		if(_.isObject(defenceAllianceDoc)){
			funcs.push(self.dataService.updateAllianceAsync(defenceAllianceDoc, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}