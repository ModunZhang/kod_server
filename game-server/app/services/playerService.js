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
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")

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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(deviceId)){
		callback(new Error("deviceId 不合法"))
		return
	}

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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

	this.dao.findAsync(playerId).then(function(doc){
		callback(null, doc)
	}).catch(function(e){
		callback(e)
	})
}

pro.updatePlayer = function(doc, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isObject(doc)){
		callback(new Error("doc 不合法"))
		return
	}

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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}

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
 * 创建建筑
 * @param playerId
 * @param buildingLocation
 * @param callback
 */
pro.createBuilding = function(playerId, buildingLocation, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}

	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var gem = 0
		var used = {}
		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(!_.isObject(building)){
			return Promise.reject(new Error("建筑不存在"))
		}
		//建筑是否正在升级中
		if(building.finishTime > 0){
			return Promise.reject(new Error("建筑正在升级"))
		}
		//检查是否不等于0级
		if(building.level != 0){
			return Promise.reject(new Error("建筑不存在或已经大于1级"))
		}
		//检查升级坑位是否合法
		if(!CheckBuildingCreateLocation(doc, buildingLocation)){
			return Promise.reject(new Error("建筑建造时,建筑坑位不合法"))
		}
		//检查建造数量是否超过上限
		if(DataUtils.getPlayerFreeBuildingsCount(doc) <= 0){
			return Promise.reject(new Error("建造数量已达建造上限"))
		}

		var upgradeRequired = DataUtils.getBuildingUpgradeRequired(building.type, 1)
		//资源是否足够
		if(!LogicUtils.isEnough(upgradeRequired.resources, DataUtils.getPlayerResources(doc))){
			var returned = DataUtils.getGemByResources(upgradeRequired.resources)
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
		self.refreshPlayerResources(doc)
		LogicUtils.reduce(used.resources, doc.resources)
		LogicUtils.reduce(used.materials, doc.materials)
		//是否立即完成
		building.level = 1
		LogicUtils.updateBuildingsLevel(doc.buildings)
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
		callback()
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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var gem = 0
		var used = {}
		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(!_.isObject(building)){
			return Promise.reject(new Error("建筑不存在"))
		}
		//建筑是否正在升级中
		if(building.finishTime > 0){
			return Promise.reject(new Error("建筑正在升级"))
		}
		//检查是否小于1级
		if(building.level < 1){
			return Promise.reject(new Error("建造还未建造"))
		}
		//是否已到最高等级
		if(DataUtils.isBuildingReachMaxLevel(building.type, building.level)){
			return Promise.reject(new Error("建筑已达到最高等级"))
		}
		//检查升级等级是否合法
		if(!CheckBuildingUpgradeLevelLimit(doc, buildingLocation)){
			return Promise.reject(new Error("建筑升级时,建筑等级不合法"))
		}

		var upgradeRequired = DataUtils.getBuildingUpgradeRequired(building.type, building.level + 1)
		//是否立即完成
		if(finishNow){
			gem += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
		}
		//资源是否足够
		if(!LogicUtils.isEnough(upgradeRequired.resources, DataUtils.getPlayerResources(doc))){
			var returned = DataUtils.getGemByResources(upgradeRequired.resources)
			gem += returned.gem
			used.resources = returned.resources
		}else{
			used.resources = upgradeRequired.resources
		}

		DataUtils.getGemByMaterials(upgradeRequired.materials)
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
		self.refreshPlayerResources(doc)
		LogicUtils.reduce(used.resources, doc.resources)
		LogicUtils.reduce(used.materials, doc.materials)
		//是否立即完成
		if(finishNow){
			building.level = building.level + 1
		}else{
			building.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, building.finishTime, self.excutePlayerCallback.bind(self))
		}
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isString(houseType)){
		callback(new Error("houseType 不合法"))
		return
	}
	if(!_.isNumber(houseLocation)){
		callback(new Error("houseLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var gem = 0
		var used = {}
		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(!_.isObject(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		//检查建筑等级是否大于1
		if(building.level <= 0){
			return Promise.reject(new Error("主体建筑必须大于等于1级"))
		}
		//检查小屋类型是否存在
		if(!DataUtils.isHouseTypeExist(houseType)){
			return Promise.reject(new Error("小屋类型不存在"))
		}
		//检查建造坑位是否合法
		if(houseLocation < 1 || houseLocation > 5){
			return Promise.reject(new Error("小屋location只能1<=location<=5"))
		}
		if(!DataUtils.isBuildingHasHouse(buildingLocation)){
			return Promise.reject(new Error("建筑周围不允许建造小屋"))
		}
		if(!CheckHouseCreateLocation(doc, buildingLocation, houseType, houseLocation)){
			return Promise.reject(new Error("创建小屋时,小屋坑位不合法"))
		}

		var upgradeRequired = DataUtils.getHouseUpgradeRequired(houseType, 1)
		//是否立即完成
		if(finishNow){
			gem += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
		}
		//资源是否足够
		if(!LogicUtils.isEnough(upgradeRequired.resources, DataUtils.getPlayerResources(doc))){
			var returned = DataUtils.getGemByResources(upgradeRequired.resources)
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
		self.refreshPlayerResources(doc)
		LogicUtils.reduce(used.resources, doc.resources)
		LogicUtils.reduce(used.materials, doc.materials)

		//检查是否建造小屋会造成可用城民小于0
		if(!_.isEqual("dwelling", houseType)){
			var willUse = DataUtils.getPlayerHouseUsedCitizen(houseType, 1)
			if(DataUtils.getPlayerCitizen(doc) - willUse < 0){
				return Promise.reject(new Error("建造小屋会造成可用城民小于0"))
			}
		}

		//再次更新玩家数据,防止城民爆仓
		self.refreshPlayerResources(doc)
		//创建小屋
		var house = {
			type:houseType,
			level:0,
			location:houseLocation,
			finishTime:0
		}
		//是否立即完成
		if(finishNow){
			house.level += 1
		}else{
			house.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, house.finishTime, self.excutePlayerCallback.bind(self))
		}
		//将小屋添加到大型建筑中
		building.houses.push(house)
		//如果是住宅,送玩家城民
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			doc.resources.citizen += next - previous
			self.refreshPlayerResources(doc)
		}
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
		callback()
	}).catch(function(e){
		callback(e)
	})
}


/**
 * 升级小屋
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param finishNow
 * @param callback
 */
pro.upgradeHouse = function(playerId, buildingLocation, houseLocation, finishNow, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isNumber(houseLocation)){
		callback(new Error("houseLocation 不合法"))
		return
	}
	if(!_.isBoolean(finishNow)){
		callback(new Error("finishNow 不合法"))
		return
	}

	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var gem = 0
		var used = {}
		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(_.isElement(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		//检查建筑等级是否大于1
		if(building.level <= 0){
			return Promise.reject(new Error("主体建筑必须大于等于1级"))
		}
		//检查小屋是否存在
		var house = null
		_.each(building.houses, function(value){
			if(value.location == houseLocation){
				house = value
			}
		})
		if(!_.isObject(house)){
			return Promise.reject(new Error("小屋不存在"))
		}
		//检查小屋是否正在升级
		if(house.finishTime > 0){
			return Promise.reject(new Error("小屋正在升级"))
		}
		var upgradeRequired = DataUtils.getHouseUpgradeRequired(house.type, house.level + 1)

		//是否立即完成
		if(finishNow){
			gem += DataUtils.getGemByTimeInterval(upgradeRequired.buildTime)
		}
		//资源是否足够
		if(!LogicUtils.isEnough(upgradeRequired.resources, DataUtils.getPlayerResources(doc))){
			var returned = DataUtils.getGemByResources(upgradeRequired.resources)
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
		self.refreshPlayerResources(doc)
		LogicUtils.reduce(used.resources, doc.resources)
		LogicUtils.reduce(used.materials, doc.materials)
		//检查是否建造小屋会造成可用城民小于0
		if(!_.isEqual("dwelling", house.type)){
			var currentLevelUsed = DataUtils.getPlayerHouseUsedCitizen(house.type, house.level)
			var nextLevelUsed = DataUtils.getPlayerHouseUsedCitizen(house.type, house.level + 1)
			var willUse = nextLevelUsed - currentLevelUsed
			if(DataUtils.getPlayerCitizen(doc) - willUse < 0){
				return Promise.reject(new Error("升级小屋会造成可用城民小于0"))
			}
		}
		//再次更新玩家数据,防止城民爆仓
		self.refreshPlayerResources(doc)
		//是否立即完成
		if(finishNow){
			house.level += 1
		}else{
			house.finishTime = Date.now() + (upgradeRequired.buildTime * 1000)
			self.callbackService.addPlayerCallback(doc._id, house.finishTime, self.excutePlayerCallback.bind(self))
		}
		//如果是住宅,送玩家城民
		if(_.isEqual("dwelling", house.type) && finishNow){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			doc.resources.citizen += next - previous
			self.refreshPlayerResources(doc)
		}
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
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
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}

	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}
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
		//更新资源数据
		self.refreshPlayerResources(doc)
		//修改建筑数据
		building.level = building.level + 1
		building.finishTime = 0
		//检查更新其他建筑等级数据
		LogicUtils.updateBuildingsLevel(doc.buildings)
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 加速建造小屋
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param callback
 */
pro.speedupHouseBuild = function(playerId, buildingLocation, houseLocation, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isNumber(houseLocation)){
		callback(new Error("houseLocation 不合法"))
		return
	}

	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(_.isElement(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		//检查建筑等级是否大于1
		if(building.level <= 0){
			return Promise.reject(new Error("主体建筑必须大于等于1级"))
		}
		//检查小屋是否存在
		var house = null
		_.each(building.houses, function(value){
			if(value.location == houseLocation){
				house = value
			}
		})
		if(!_.isObject(house)){
			return Promise.reject(new Error("小屋不存在"))
		}
		//检查小屋是否正在升级
		if(house.finishTime <= 0){
			return Promise.reject(new Error("小屋未处于升级状态"))
		}
		//获取剩余升级时间
		var timeRemain = house.finishTime - Date.now()
		//获取需要的宝石数量
		var gem = DataUtils.getGemByTimeInterval(timeRemain / 1000)
		//宝石是否足够
		if(gem > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gem
		//更新资源数据
		self.refreshPlayerResources(doc)
		//修改建筑数据
		house.level = house.level + 1
		house.finishTime = 0
		//如果是住宅,送玩家城民
		if(_.isEqual("dwelling", house.type)){
			var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
			var next = DataUtils.getDwellingPopulationByLevel(house.level)
			doc.resources.citizen += next - previous
			self.refreshPlayerResources(doc)
		}
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
		callback()
	}).catch(function(e){
		callback(e)
	})
}

/**
 * 拆除小屋
 * @param playerId
 * @param buildingLocation
 * @param houseLocation
 * @param callback
 */
pro.destroyHouse = function(playerId, buildingLocation, houseLocation, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isNumber(buildingLocation)){
		callback(new Error("buildingLocation 不合法"))
		return
	}
	if(!_.isNumber(houseLocation)){
		callback(new Error("houseLocation 不合法"))
		return
	}

	var self = this
	self.dao.findAsync(playerId).then(function(doc){
		if(!_.isObject(doc)){
			return Promise.reject(new Error("玩家不存在"))
		}

		var building = doc.buildings["location_" + buildingLocation]
		//检查建筑是否存在
		if(_.isElement(building)){
			return Promise.reject(new Error("主体建筑不存在"))
		}
		//检查小屋是否存在
		var house = null
		_.each(building.houses, function(value){
			if(value.location == houseLocation){
				house = value
			}
		})
		if(!_.isObject(house)){
			return Promise.reject(new Error("小屋不存在"))
		}
		//检查是否正在升级
		if(house.finishTime > 0){
			return Promise.reject(new Error("小屋正在升级"))
		}
		//获取需要的宝石数量
		var gem = 100
		//宝石是否足够
		if(gem > doc.basicInfo.gem){
			return Promise.reject(new Error("宝石不足"))
		}
		//修改玩家宝石数据
		doc.basicInfo.gem -= gem
		//更新资源数据
		self.refreshPlayerResources(doc)
		//退还城民给玩家
		doc.resources.citizen += DataUtils.getPlayerHouseUsedCitizen(house.type, house.level)
		//删除小屋
		var index = building.houses.indexOf(house)
		building.houses.splice(index, 1)
		//再次更新玩家数据,防止城民爆仓
		self.refreshPlayerResources(doc)
		//检查是否在拆除民宅,且民宅拆除后,是否会造成城民数量小于0
		if(DataUtils.getPlayerCitizen(doc) < 0){
			return Promise.reject(new Error("拆除此建筑后会造成可用城民数量小于0"))
		}
		//保存玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家数据到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
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
		//更新资源数据
		self.refreshPlayerResources(doc)
		//检查建筑
		_.each(doc.buildings, function(building){
			if(building.finishTime > 0 && building.finishTime <= finishTime){
				building.finishTime = 0
				building.level += 1
			}
			//检查小屋
			_.each(building.houses, function(house){
				if(house.finishTime > 0 && house.finishTime <= finishTime){
					house.finishTime = 0
					house.level += 1
					//如果是住宅,送玩家城民
					if(_.isEqual("dwelling", house.type)){
						var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
						var next = DataUtils.getDwellingPopulationByLevel(house.level)
						doc.resources.citizen += next - previous
						self.refreshPlayerResources(doc)
					}
				}
			})
		})
		//更新玩家数据
		return self.dao.updateAsync(doc)
	}).then(function(doc){
		//推送玩家信息到客户端
		self.pushService.pushToPlayer(Events.player.onPlayerDataChanged, doc, doc._id)
	}).catch(function(e){
		errorLogger.error("handle excutePlayerCallback Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle excutePlayerCallback Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}

/**
 * 刷新玩家资源数据
 * @param userDoc
 */
pro.refreshPlayerResources = function(userDoc){
	var resources = DataUtils.getPlayerResources(userDoc)
	_.each(resources, function(value, key){
		userDoc.resources[key] = value
	})
	userDoc.basicInfo.resourceRefreshTime = Date.now()
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
	return building.level <= keep.level
}

var CheckBuildingCreateLocation = function(userDoc, location){
	var previousLocation = LogicUtils.getPreviousBuildingLocation(location)
	var nextLocation = LogicUtils.getNextBuildingLocation(location)
	var frontLocation = LogicUtils.getFrontBuildingLocation(location)
	if(previousLocation){
		var previousBuilding = userDoc.buildings["location_" + previousLocation]
		if(previousBuilding.level > 0) return true
	}
	if(nextLocation){
		var nextBuilding = userDoc.buildings["location_" + nextLocation]
		if(nextBuilding.level > 0) return true
	}
	if(frontLocation){
		var frontBuilding = userDoc.buildings["location_" + frontLocation]
		if(frontBuilding.level > 0) return true
	}

	return false
}

var CheckHouseCreateLocation = function(userDoc, buildingLocation, houseType, houseLocation){
	var conditions = {
		location_1:{
			widthMax:2,
			heightMax:1
		},
		location_2:{
			widthMax:1,
			heightMax:1
		},
		location_3:{
			widthMax:1,
			heightMax:1
		},
		location_4:{
			widthMax:1,
			heightMax:2
		},
		location_5:{
			widthMax:1,
			heightMax:1
		}
	}

	var building = userDoc.buildings["location_" + buildingLocation]
	var houses = building.houses
	var willBeSize = DataUtils.getHouseSize(houseType)
	var condition = conditions["location_" + houseLocation]
	if(willBeSize.width > condition.widthMax) return false
	if(willBeSize.height > condition.heightMax) return false
	var wantUse = [houseLocation]
	if(willBeSize.width > 1 || willBeSize.height > 1){
		wantUse.push(houseLocation + 1)
	}

	var alreadyUsed = []
	for(var i = 0; i < houses.length; i++){
		var house = houses[i]
		var houseSize = DataUtils.getHouseSize(house.type)
		alreadyUsed.push(house.location)
		if(houseSize.width > 1 || houseSize.height > 1){
			wantUse.push(house.location + 1)
		}
	}

	return _.intersection(wantUse, alreadyUsed).length == 0
}