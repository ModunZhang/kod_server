"use strict"

/**
 * Created by modun on 15/2/1.
 */

var Https = require("https")
var Promise = require("bluebird")
var _ = require("underscore")

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var GameDatas = require("../datas/GameDatas")
var StoreItems = GameDatas.StoreItems

var PlayerIAPService = function(app){
	this.app = app
	this.env = app.get("env")
	this.pushService = app.get("pushService")
	this.timeEventService = app.get("timeEventService")
	this.globalChannelService = app.get("globalChannelService")
	this.allianceDao = app.get("allianceDao")
	this.playerDao = app.get("playerDao")
	this.Billing = app.get("Billing")
	this.billingValidateHost = "sandbox.itunes.apple.com"
	this.billingValidatePath = "/verifyReceipt"
}

module.exports = PlayerIAPService
var pro = PlayerIAPService.prototype

/**
 * 去苹果商店验证
 * @param receiptData
 * @param callback
 */
var BillingValidate = function(receiptData, callback){
	var postData = {
		"receipt-data":new Buffer(receiptData).toString("base64")
	}
	var httpOptions = {
		host:this.billingValidateHost,
		path:this.billingValidatePath,
		method:"post"
	}
	var request = Https.request(httpOptions, function(response){
		response.on("data", function(data){
			var jsonObj = JSON.parse(data.toString())
			if(jsonObj.status !== 0) callback(new Error("订单验证失败,错误码:" + jsonObj.status))
			else{
				callback(null, jsonObj.receipt)
			}
		})
	})

	request.on("error", function(e){
		callback(new Error("请求错误,错误信息:" + e.message))
	})
	request.write(JSON.stringify(postData))
	request.end()
}

/**
 * 创建订单记录
 * @param playerId
 * @param receiptObject
 * @returns {{playerId: *, transactionId: *, productId: *, quantity: (*|billingSchema.quantity), itemId: *, purchaseDate: *}}
 */
var CreateBillingItem = function(playerId, receiptObject){
	var billing = {
		playerId:playerId,
		transactionId:receiptObject.transaction_id,
		productId:receiptObject.product_id,
		quantity:receiptObject.quantity,
		itemId:receiptObject.item_id,
		purchaseDate:receiptObject.purchase_date
	}
	return billing
}

/**
 * 获取商品道具奖励
 * @param config
 * @returns {Array}
 */
var GetStoreItemRewardsFromConfig = function(config){
	var objects = []
	var configArray_1 = config.rewards.split(",")
	_.each(configArray_1, function(config_1){
		var configArray_2 = config_1.split(":")
		var object = {
			type:configArray_2[0],
			name:configArray_2[1],
			count:parseInt(configArray_2[2])
		}
		objects.push(object)
	})
	return objects
}

/**
 * 上传IAP信息
 * @param playerId
 * @param transactionId
 * @param receiptData
 * @param callback
 */
pro.addPlayerBillingData = function(playerId, transactionId, receiptData, callback){
	if(!_.isFunction(callback)){
		throw new Error("callback 不合法")
	}
	if(!_.isString(playerId)){
		callback(new Error("playerId 不合法"))
		return
	}
	if(!_.isString(transactionId)){
		callback(new Error("transactionId 不合法"))
		return
	}
	if(!_.isString(receiptData) || _.isEmpty(receiptData.trim())){
		callback(new Error("receiptData 不合法"))
	}

	var self = this
	var playerDoc = null
	var playerData = {}
	var pushFuncs = []
	var eventFuncs = []
	var updateFuncs = []
	this.playerDao.findByIdAsync(playerId).then(function(doc){
		if(!_.isObject(doc)) return Promise.reject(new Error("玩家不存在"))
		playerDoc = doc
		return self.Billing.findOneAsync({transactionId:transactionId})
	}).then(function(doc){
		if(_.isObject(doc)) return Promise.reject(new Error("重复的订单号"))
		var billingValidateAsync = Promise.promisify(BillingValidate, self)
		return billingValidateAsync(receiptData)
	}).then(function(doc){
		var billing = CreateBillingItem(playerId, doc)
		var quantity = billing.quantity
		var itemConfig = _.find(StoreItems.items, function(item){
			if(_.isObject(item)){
				return _.isEqual(item.productId, billing.productId)
			}
		})
		if(!_.isObject(itemConfig)) return Promise.reject(new Error("订单商品不存在"))
		playerDoc.resources.gem += itemConfig.gem * quantity
		playerData.resources = playerDoc.resources
		var rewards = GetStoreItemRewardsFromConfig(itemConfig)
		playerData.__items = []
		_.each(rewards, function(reward){
			var resp = LogicUtils.addPlayerItem(playerDoc, reward.name, reward.count * quantity)
			if(resp.newlyCreated){
				playerData.__items.push({
					type:Consts.DataChangedType.Add,
					data:resp.item
				})
			}else{
				playerData.__items.push({
					type:Consts.DataChangedType.Edit,
					data:resp.item
				})
			}
		})

		updateFuncs.push([self.Billing, self.Billing.createAsync, billing])
		updateFuncs.push([self.playerDao, self.playerDao.updateAsync, playerDoc])
		pushFuncs.push([self.pushService, self.pushService.onAddPlayerBillingDataSuccessAsync, playerDoc, billing.transactionId])
		pushFuncs.push([self.pushService, self.pushService.onPlayerDataChangedAsync, playerDoc, playerData])
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