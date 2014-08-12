/**
 * Created by modun on 14-7-23.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var crypto = require('crypto')

var PlayerDao = require("../dao/playerDao")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var Utils = require("../utils/utils")

var PlayerService = function(app){
	this.app = app
	this.dao = Promise.promisifyAll(new PlayerDao(this.app.get("redis")))
	this.pushService = this.app.get("pushService")
	this.callbackService = this.app.get("callbackService")
}

module.exports = PlayerService
var pro = PlayerService.prototype

/**
 * 根据设备号获取玩家信息
 * @param deviceId
 * @param callback
 */
pro.getPlayerByDeviceId = function(deviceId, callback){
	var self = this
	var createPlayer = Promisify(CreatePlayer, this)

	this.dao.findFromMongoAsync({"basicInfo.deviceId":deviceId}).then(function(doc){
		if(_.isNull(doc)){
			return createPlayer(deviceId)
		}else{
			return self.dao.findAsync(doc._id)
		}
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 根据主键获取玩家信息
 * @param playerId
 * @param callback
 */
pro.getPlayerById = function(playerId, callback){
	this.dao.findAsync(playerId).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

pro.updatePlayer = function(doc, callback){
	this.dao.updateAsync(doc).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 将玩家数据持久化到mongo,通常在玩家下线时调用
 * @param playerId
 * @param callback
 */
pro.savePlayer = function(playerId, callback){
	var self = this
	this.dao.findAsync(playerId).then(function(doc){
		return self.dao.clearAsync(doc)
	}).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 升级大型建筑
 * @param playerId
 * @param buildingLocation
 * @param finishNow
 * @param callback
 */
pro.upgradeBuilding = function(playerId, buildingLocation, finishNow, callback){
	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		var gem = 0
		var used = {}
		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(_.isElement(building)){
			return Promise.reject(new Error("建筑不存在"))
		}
		//建筑是否正在升级中
		if(building.finishTime > 0){
			return Promise.reject(new Error("建筑正在升级"))
		}
		//是否已到最高等级
		if(DataUtils.isBuildingReachMaxLevel(building.type, building.level)){
			return Promise.reject(new Error("建筑已达到最高等级"))
		}
		//检查升级等级是否合法
		if(!CheckBuildingUpgradeLevelLimit(doc, buildingLocation)){
			return Promise.reject(new Error("建筑升级时,建筑等级不合法"))
		}
		//检查升级坑位是否合法
		if(!CheckBuildingUpgradeLocation(doc, buildingLocation)){
			return Promise.reject(new Error("建筑升级时,建筑坑位不合法"))
		}

		var upgradeRequired = DataUtils.getBuildingUpgradeRequired(building.type, building.level + 1)
		//是否立即完成
		if(finishNow){
			gem += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
		}
		//资源是否足够
		if(!LogicUtils.isEnough(upgradeRequired.resources, doc.resources)){
			var returned = DataUtils.getGemByResources(upgradeRequired.resources)
			console.error(returned)
			gem += returned.gem
			used.resources = returned.resources
		}else{
			used.resources = upgradeRequired.resources
		}
		//材料是否足够
		if(!LogicUtils.isEnough(upgradeRequired.materials, doc.materials)){
			gem += DataUtils.getGemByMaterials(upgradeRequired.materials)
			used.materials = {}
		}else{
			used.materials = upgradeRequired.materials
		}
		//宝石是否足够
		if(gem > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gem
		//修改玩家资源数据
		LogicUtils.reduce(used.resources, doc.resources)
		LogicUtils.reduce(used.materials, doc.materials)
		//是否立即完成
		if(finishNow){
			building.level = building.level + 1
			LogicUtils.updateBuildingsLevel(doc.buildings)
		}else{
			building.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, building.finishTime, self.excutePlayerCallback.bind(self))
		}
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, Utils.filter(doc), doc._id)

		return self.dao.updateAsync(doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 创建小屋
 * @param playerId
 * @param buildingLocation
 * @param houseType
 * @param houseLocation
 * @param finishNow
 * @param callback
 */
pro.createHouse = function(playerId, buildingLocation, houseType, houseLocation, finishNow, callback){
	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		var gem = 0
		var used = {}
		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(_.isElement(building)){
			return Promise.reject(new Error("建筑不存在"))
		}
		//检查建筑等级是否大于1
		if(building.level <= 0){
			return Promise.reject(new Error("主体建筑必须大于等于1级"))
		}
		//检查建造坑位是否合法
		if(!CheckHouseCreateLocation(doc, buildingLocation)){
			return Promise.reject(new Error("创建小屋时,小屋坑位不合法"))
		}

		var upgradeRequired = DataUtils.getBuildingUpgradeRequired(building.type, building.level + 1)
		//是否立即完成
		if(finishNow){
			gem += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
		}
		//资源是否足够
		if(!LogicUtils.isEnough(upgradeRequired.resources, doc.resources)){
			var returned = DataUtils.getGemByResources(upgradeRequired.resources)
			console.error(returned)
			gem += returned.gem
			used.resources = returned.resources
		}else{
			used.resources = upgradeRequired.resources
		}
		//材料是否足够
		if(!LogicUtils.isEnough(upgradeRequired.materials, doc.materials)){
			gem += DataUtils.getGemByMaterials(upgradeRequired.materials)
			used.materials = {}
		}else{
			used.materials = upgradeRequired.materials
		}
		//宝石是否足够
		if(gem > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gem
		//修改玩家资源数据
		LogicUtils.reduce(used.resources, doc.resources)
		LogicUtils.reduce(used.materials, doc.materials)
		//是否立即完成
		if(finishNow){
			building.level = building.level + 1
			LogicUtils.updateBuildingsLevel(doc.buildings)
		}else{
			building.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, building.finishTime, self.excutePlayerCallback.bind(self))
		}
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, Utils.filter(doc), doc._id)

		return self.dao.updateAsync(doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 建筑加速
 * @param playerId
 * @param buildingLocation
 * @param callback
 */
pro.speedupBuildingBuild = function(playerId, buildingLocation, callback){
	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(_.isElement(building)){
			return Promise.reject(new Error("建筑不存在"))
		}
		//检查建筑是否正在升级
		if(building.finishTime <= 0){
			return Promise.reject(new Error("建筑未处于升级状态"))
		}
		//获取剩余升级时间
		var timeRemain = building.finishTime - Date.now()
		//获取需要的宝石数量
		var gem = DataUtils.getGemByTimeInterval(timeRemain / 1000)
		//宝石是否足够
		if(gem > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gem
		//修改建筑数据
		building.level = building.level + 1
		building.finishTime = 0
		//检查更新其他建筑等级数据
		LogicUtils.updateBuildingsLevel(doc.buildings)
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, Utils.filter(doc), doc._id)
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 延迟执行玩家回调
 * @param playerId
 * @param finishTime
 */
pro.excutePlayerCallback = function(playerId, finishTime){
	var self = this
	this.dao.findAsync(playerId).then(function(doc){
		//检查建筑
		_.each(doc.buildings, function(building){
			if(building.finishTime > 0 && building.finishTime <= finishTime){
				building.finishTime = 0
				building.level += 1
			}
		})
		//更新玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家信息到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, Utils.filter(doc), doc._id)
	}).catch(function(e){
		console.error(e)
	})
}



var CreatePlayer = function(deviceId, callback){
	var self = this
	Promisify(crypto.randomBytes)(4).then(function(buf){
		var token = buf.toString("hex")
		return Promise.resolve(token)
	}).then(function(token){
		var doc = {
			basicInfo:{
				deviceId:deviceId,
				name:"player_" + token
			}
		}
		return Promise.resolve(doc)
	}).then(function(doc){
		return self.dao.addAsync(doc)
	}).then(function(doc){
		return callback(null, doc)
	}).catch(function(e){
		return callback(e)
	})
}

var CheckBuildingUpgradeLevelLimit = function(userDoc, location){
	var building = userDoc.buildings["location_" + location]
	var keep = userDoc.buildings["location_1"]
	if(location == 1) return true

	if(building.level >= keep.level){
		return false
	}

	return true
}

var CheckBuildingUpgradeLocation = function(userDoc, location){
	var building = userDoc.buildings["location_" + location]
	if(building.level < 0){
		return false
	}

	return true
}

var CheckHouseCreateLocation = function(userDoc, buildingLocation, houseType, houseLocation){
	var building = userDoc.buildings["location_" + buildingLocation]
	var houses = building.houses

}