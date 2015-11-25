"use strict"

/**
 * Created by modun on 15/2/1.
 */

var ShortId = require("shortid")
var request = require('request')
var Promise = require("bluebird")
var _ = require("underscore")
var DOMParser = require('xmldom').DOMParser;
var SignedXml = require('xml-crypto').SignedXml
	, FileKeyInfo = require('xml-crypto').FileKeyInfo
	, select = require('xml-crypto').xpath

var Utils = require("../utils/utils")
var DataUtils = require("../utils/dataUtils")
var LogicUtils = require("../utils/logicUtils")
var ErrorUtils = require("../utils/errorUtils")
var Events = require("../consts/events")
var Consts = require("../consts/consts")
var Define = require("../consts/define")

var GameDatas = require("../datas/GameDatas")
var StoreItems = GameDatas.StoreItems

var PlayerIAPService = function(app){
	this.app = app
	this.env = app.get("env")
	this.logService = app.get("logService")
	this.pushService = app.get("pushService")
	this.cacheService = app.get('cacheService');
	this.Billing = app.get("Billing")
	this.GemAdd = app.get("GemAdd")
	this.platform = app.get('serverConfig').platform;
	this.platformParams = app.get('serverConfig')[this.platform];
}

module.exports = PlayerIAPService
var pro = PlayerIAPService.prototype


/**
 21000
 The App Store could not read the JSON object you provided.
 21002
 The data in the receipt-data property was malformed or missing.
 21003
 The receipt could not be authenticated.
 21004
 The shared secret you provided does not match the shared secret on file for your account.
 Only returned for iOS 6 style transaction receipts for auto-renewable subscriptions.
 21005
 The receipt server is not currently available.
 21006
 This receipt is valid but the subscription has expired. When this status code is returned to your server, the receipt data is also decoded and returned as part of the response.
 Only returned for iOS 6 style transaction receipts for auto-renewable subscriptions.
 21007
 This receipt is from the test environment, but it was sent to the production environment for verification. Send it to the test environment instead.
 21008
 This receipt is from the production environment, but it was sent to the test environment for verification. Send it to the production environment instead.
 */

/**
 * 去苹果商店验证
 * @param playerDoc
 * @param receiptData
 * @param callback
 */
var IosBillingValidate = function(playerDoc, receiptData, callback){
	var self = this;
	var body = {
		"receipt-data":new Buffer(receiptData).toString("base64")
	}
	request.post(this.platformParams.iapValidateUrl, {form:body}, function(e, resp, body){
		if(!!e){
			e = new Error("请求苹果验证服务器网络错误,错误信息:" + e.message);
			self.logService.onError('cache.playerIAPService.IosBillingValidate', null, e.stack);
			return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
		}
		if(resp.statusCode != 200){
			e = new Error("服务器未返回正确的状态码:" + resp.statusCode);
			self.logService.onError('cache.playerIAPService.IosBillingValidate', {statusCode:resp.statusCode}, e.stack);
			return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
		}
		try{
			var jsonObj = JSON.parse(body)
		}catch(e){
			e = new Error("解析苹果返回的json信息出错,错误信息:" + e.message);
			self.logService.onError('cache.playerIAPService.IosBillingValidate', {body:body}, e.stack);
			return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
		}
		if(jsonObj.status == 0){
			callback(null, jsonObj.receipt)
		}else if(jsonObj.status == 21005){
			e = new Error("苹果验证服务器不可用");
			self.logService.onError('cache.playerIAPService.IosBillingValidate', {jsonObj:jsonObj}, e.stack);
			callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message))
		}else{
			callback(ErrorUtils.iapValidateFaild(playerDoc._id, jsonObj))
		}
	})
}

/**
 * 微软官方商店验证
 * @param playerDoc
 * @param receiptData
 * @param callback
 */
var WpOfficialBillingValidate = function(playerDoc, receiptData, callback){
	var doc = new DOMParser().parseFromString(receiptData);
	var signature = select(doc, "/*/*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0];
	var e = null;
	if(!signature){
		e = new Error("错误的receiptData");
		this.logService.onError('cache.playerIAPService.WpOfficialBillingValidate', {receiptData:receiptData}, e.stack);
		return callback(ErrorUtils.iapValidateFaild(playerDoc._id));
	}
	var sig = new SignedXml();
	sig.keyInfoProvider = new FileKeyInfo(this.app.getBase() + '/config/' + this.platformParams.officialIapValidateCert);
	sig.loadSignature(signature.toString());
	var res = sig.checkSignature(receiptData);
	if(!res)return callback(ErrorUtils.iapValidateFaild(playerDoc._id, sig.validationErrors));
	var receipt = doc.getElementsByTagName('Receipt')[0];
	var productReceipt = receipt.getElementsByTagName('ProductReceipt')[0];
	var productId = productReceipt.getAttribute('ProductId');
	var transactionId = productReceipt.getAttribute('Id');
	callback(null, {
		transactionId:transactionId,
		productId:productId,
		quantity:1
	})
}

/**
 * Wp Adeasygo 订单验证
 * @param playerDoc
 * @param uid
 * @param transactionId
 * @param callback
 */
var WpAdeasygoBillingValidate = function(playerDoc, uid, transactionId, callback){
	var self = this;
	var form = {
		uid:uid,
		trade_no:transactionId,
		show_detail:1
	}
	request.post(self.platformParams.adeasygoIapValidateUrl, {form:form}, function(e, resp, body){
		if(!!e){
			e = new Error("请求Adeasygo验证服务器网络错误,错误信息:" + e.message);
			self.logService.onError('cache.playerIAPService.WpAdeasygoBillingValidate', null, e.stack);
			return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
		}
		if(resp.statusCode != 200){
			e = new Error("服务器未返回正确的状态码:" + resp.statusCode);
			self.logService.onError('cache.playerIAPService.WpAdeasygoBillingValidate', {statusCode:resp.statusCode}, e.stack);
			return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
		}
		try{
			var jsonObj = JSON.parse(body)
		}catch(e){
			e = new Error("解析Adeasygo返回的json信息出错,错误信息:" + e.message);
			self.logService.onError('cache.playerIAPService.WpAdeasygoBillingValidate', {body:body}, e.stack);
			return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
		}
		if(jsonObj.code !== 1 || !jsonObj.trade_detail || jsonObj.trade_detail.app_id !== self.platformParams.adeasygoAppId){
			return callback(ErrorUtils.iapValidateFaild(playerDoc._id, jsonObj))
		}
		var productId = jsonObj.trade_detail.out_goods_id;
		var itemConfig = _.find(StoreItems.items, function(item){
			if(_.isObject(item)){
				return item.productId === productId
			}
		})
		if(!itemConfig){
			return callback(ErrorUtils.iapProductNotExist(playerId, productId));
		}


		var tryTimes = 0;
		var maxTryTimes = 5;
		(function finishTransaction(){
			tryTimes ++;
			var form = {
				trade_no:transactionId
			}
			request.post(self.platformParams.adeasygoIapStatusUpdateUrl, {form:form}, function(e, resp, body){
				if(!!e){
					e = new Error("请求Adeasygo更新订单状态出错,错误信息:" + e.message);
					self.logService.onError('cache.playerIAPService.WpAdeasygoBillingValidate', null, e.stack);
					if(tryTimes < maxTryTimes){
						return setTimeout(finishTransaction, 500);
					}else{
						return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message))
					}
				}
				if(resp.statusCode != 200){
					e = new Error("服务器未返回正确的状态码:" + resp.statusCode);
					self.logService.onError('cache.playerIAPService.WpAdeasygoBillingValidate', {statusCode:resp.statusCode}, e.stack);
					if(tryTimes < maxTryTimes){
						return setTimeout(finishTransaction, 500);
					}else{
						return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
					}
				}
				try{
					var jsonObj = JSON.parse(body)
				}catch(e){
					e = new Error("解析Adeasygo返回的json信息出错,错误信息:" + e.message);
					self.logService.onError('cache.playerIAPService.WpAdeasygoBillingValidate', {body:body}, e.stack);
					if(tryTimes < maxTryTimes){
						return setTimeout(finishTransaction, 500);
					}else{
						return callback(ErrorUtils.netErrorWithIapServer(playerDoc._id, e.message));
					}
				}
				if(jsonObj.code !== 1){
					if(tryTimes < maxTryTimes){
						return setTimeout(finishTransaction, 500);
					}else{
						return callback(ErrorUtils.iapValidateFaild(playerDoc._id, jsonObj))
					}
				}else{
					callback(null, {
						transactionId:transactionId,
						productId:productId,
						quantity:1
					})
				}
			})
		})();
	})
}

/**
 * 创建订单记录
 * @param playerId
 * @param type
 * @param transactionId
 * @param productId
 * @param quantity
 * @returns {*}
 */
var CreateBillingItem = function(playerId, type, transactionId, productId, quantity){
	var billing = {
		type:type,
		playerId:playerId,
		transactionId:transactionId,
		productId:productId,
		quantity:quantity
	}
	return billing
}

/**
 * 获取商品道具奖励
 * @param config
 * @returns {{rewardsToMe: Array, rewardToAllianceMember: *}}
 * @constructor
 */
var GetStoreItemRewardsFromConfig = function(config){
	var rewardsToMe = []
	var rewardToAllianceMember = null
	var configArray_1 = config.rewards.split(",")
	_.each(configArray_1, function(config){
		var rewardArray = config.split(":")
		var reward = {
			type:rewardArray[0],
			name:rewardArray[1],
			count:parseInt(rewardArray[2])
		}
		rewardsToMe.push(reward)
	})
	if(!_.isEmpty(config.allianceRewards)){
		var rewardArray = config.allianceRewards.split(":")
		rewardToAllianceMember = {
			type:rewardArray[0],
			name:rewardArray[1],
			count:parseInt(rewardArray[2])
		}
	}

	return {rewardsToMe:rewardsToMe, rewardToAllianceMember:rewardToAllianceMember}
}

var SendAllianceMembersRewardsAsync = function(senderId, senderName, memberId, reward){
	var self = this
	var memberDoc = null
	var memberData = []
	this.cacheService.findPlayerAsync(memberId).then(function(doc){
		memberDoc = doc
		var iapGift = {
			id:ShortId.generate(),
			from:senderName,
			name:reward.name,
			count:reward.count,
			time:Date.now()
		}
		if(memberDoc.iapGifts.length >= Define.PlayerIapGiftsMaxSize){
			var giftToRemove = memberDoc.iapGifts[0]
			memberData.push(["iapGifts." + memberDoc.iapGifts.indexOf(giftToRemove), null])
			LogicUtils.removeItemInArray(memberDoc.iapGifts, giftToRemove)
		}
		memberDoc.iapGifts.push(iapGift)
		memberData.push(["iapGifts." + memberDoc.iapGifts.indexOf(iapGift), iapGift])
		return self.cacheService.updatePlayerAsync(memberDoc._id, memberDoc)
	}).then(function(){
		return self.pushService.onPlayerDataChangedAsync(memberDoc, memberData)
	}).catch(function(e){
		self.logService.onError("logic.playerIAPService.SendAllianceMembersRewardsAsync", {
			senderId:senderId,
			memberId:memberId,
			reward:reward
		}, e.stack)
		var funcs = []
		if(_.isObject(memberDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(memberDoc._id, null))
		}
		return Promise.all(funcs).then(function(){
			return Promise.resolve()
		})
	})
}

/**
 * 上传IosIAP信息
 * @param playerId
 * @param productId
 * @param transactionId
 * @param receiptData
 * @param callback
 */
pro.addIosPlayerBillingData = function(playerId, productId, transactionId, receiptData, callback){
	var self = this
	var playerDoc = null
	var allianceDoc = null
	var billing = null
	var playerData = []
	var updateFuncs = []
	var rewards = null

	var itemConfig = _.find(StoreItems.items, function(item){
		if(_.isObject(item)){
			return _.isEqual(item.productId, productId)
		}
	})
	if(!_.isObject(itemConfig))
		return callback(ErrorUtils.iapProductNotExist(playerId, productId));

	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.Billing.findOneAsync({transactionId:transactionId})
	}).then(function(doc){
		if(_.isObject(doc)) return Promise.reject(ErrorUtils.duplicateIAPTransactionId(playerId, transactionId))
		var billingValidateAsync = Promise.promisify(IosBillingValidate, {context:self})
		return billingValidateAsync(playerDoc, receiptData)
	}).then(function(respData){
		billing = CreateBillingItem(playerId, Consts.BillingType.Ios, respData.transaction_id, respData.product_id, respData.quantity);
		return self.Billing.createAsync(billing)
	}).then(function(){
		var quantity = billing.quantity
		playerDoc.resources.gem += itemConfig.gem * quantity
		playerData.push(["resources.gem", playerDoc.resources.gem])
		playerDoc.countInfo.iapCount += 1
		playerData.push(["countInfo.iapCount", playerDoc.countInfo.iapCount])
		rewards = GetStoreItemRewardsFromConfig(itemConfig)
		_.each(rewards.rewardsToMe, function(reward){
			var resp = LogicUtils.addPlayerItem(playerDoc, reward.name, reward.count * quantity)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})
		var gemAdd = {
			playerId:playerId,
			add:itemConfig.gem * quantity,
			left:playerDoc.resources.gem,
			from:Consts.GemAddFrom.Iap,
			rewards:rewards
		}
		updateFuncs.push([self.GemAdd, self.GemAdd.createAsync, gemAdd])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
		if(_.isObject(rewards.rewardToAllianceMember) && !_.isEmpty(playerDoc.allianceId)){
			return self.cacheService.directFindAllianceAsync(playerDoc.allianceId).then(function(doc){
				allianceDoc = doc
				var funcs = []
				_.each(allianceDoc.members, function(member){
					if(!_.isEqual(member.id, playerId)){
						funcs.push(SendAllianceMembersRewardsAsync.call(self, playerId, playerDoc.basicInfo.name, member.id, rewards.rewardToAllianceMember))
					}
				})
				return Promise.all(funcs)
			}).catch(function(e){
				self.logService.onError("logic.playerIAPService.addPlayerBillingData", {
					playerId:playerId,
					transactionId:transactionId
				}, e.stack)
			})
		}
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 上传Wp官方IAP信息
 * @param playerId
 * @param productId
 * @param transactionId
 * @param receiptData
 * @param callback
 */
pro.addWpOfficialPlayerBillingData = function(playerId, productId, transactionId, receiptData, callback){
	var self = this
	var playerDoc = null
	var allianceDoc = null
	var billing = null
	var playerData = []
	var updateFuncs = []
	var rewards = null

	var itemConfig = _.find(StoreItems.items, function(item){
		if(_.isObject(item)){
			return _.isEqual(item.productId, productId)
		}
	})
	if(!_.isObject(itemConfig))
		return callback(ErrorUtils.iapProductNotExist(playerId, productId));

	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.Billing.findOneAsync({transactionId:transactionId})
	}).then(function(doc){
		if(_.isObject(doc)) return Promise.reject(ErrorUtils.duplicateIAPTransactionId(playerId, transactionId))
		var billingValidateAsync = Promise.promisify(WpOfficialBillingValidate, {context:self})
		return billingValidateAsync(playerDoc, receiptData)
	}).then(function(respData){
		billing = CreateBillingItem(playerId, Consts.BillingType.WpOfficial, respData.transactionId, respData.productId, respData.quantity);
		return self.Billing.createAsync(billing)
	}).then(function(){
		var quantity = billing.quantity
		playerDoc.resources.gem += itemConfig.gem * quantity
		playerData.push(["resources.gem", playerDoc.resources.gem])
		playerDoc.countInfo.iapCount += 1
		playerData.push(["countInfo.iapCount", playerDoc.countInfo.iapCount])
		rewards = GetStoreItemRewardsFromConfig(itemConfig)
		_.each(rewards.rewardsToMe, function(reward){
			var resp = LogicUtils.addPlayerItem(playerDoc, reward.name, reward.count * quantity)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})
		var gemAdd = {
			playerId:playerId,
			add:itemConfig.gem * quantity,
			left:playerDoc.resources.gem,
			from:Consts.GemAddFrom.Iap,
			rewards:rewards
		}
		updateFuncs.push([self.GemAdd, self.GemAdd.createAsync, gemAdd])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, playerData)
		if(_.isObject(rewards.rewardToAllianceMember) && !_.isEmpty(playerDoc.allianceId)){
			return self.cacheService.directFindAllianceAsync(playerDoc.allianceId).then(function(doc){
				allianceDoc = doc
				var funcs = []
				_.each(allianceDoc.members, function(member){
					if(!_.isEqual(member.id, playerId)){
						funcs.push(SendAllianceMembersRewardsAsync.call(self, playerId, playerDoc.basicInfo.name, member.id, rewards.rewardToAllianceMember))
					}
				})
				return Promise.all(funcs)
			}).catch(function(e){
				self.logService.onError("logic.playerIAPService.addPlayerBillingData", {
					playerId:playerId,
					transactionId:transactionId
				}, e.stack)
			})
		}
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}

/**
 * 上传Wp Adeasygo IAP信息
 * @param playerId
 * @param uid
 * @param transactionId
 * @param callback
 * @returns {*}
 */
pro.addWpAdeasygoPlayerBillingData = function(playerId, uid, transactionId, callback){
	var self = this
	var playerDoc = null
	var allianceDoc = null
	var billing = null
	var playerData = []
	var updateFuncs = []
	var rewards = null

	this.cacheService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		return self.Billing.findOneAsync({transactionId:transactionId})
	}).then(function(doc){
		if(_.isObject(doc)) return Promise.reject(ErrorUtils.duplicateIAPTransactionId(playerId, transactionId))
		var billingValidateAsync = Promise.promisify(WpAdeasygoBillingValidate, {context:self})
		return billingValidateAsync(playerDoc, uid, transactionId)
	}).then(function(respData){
		billing = CreateBillingItem(playerId, Consts.BillingType.WpAdeasygo, respData.transactionId, respData.productId, respData.quantity);
		return self.Billing.createAsync(billing)
	}).then(function(){
		var itemConfig = _.find(StoreItems.items, function(item){
			if(_.isObject(item)){
				return _.isEqual(item.productId, billing.productId);
			}
		})
		var quantity = billing.quantity
		playerDoc.resources.gem += itemConfig.gem * quantity
		playerData.push(["resources.gem", playerDoc.resources.gem])
		playerDoc.countInfo.iapCount += 1
		playerData.push(["countInfo.iapCount", playerDoc.countInfo.iapCount])
		rewards = GetStoreItemRewardsFromConfig(itemConfig)
		_.each(rewards.rewardsToMe, function(reward){
			var resp = LogicUtils.addPlayerItem(playerDoc, reward.name, reward.count * quantity)
			playerData.push(["items." + playerDoc.items.indexOf(resp.item), resp.item])
		})
		var gemAdd = {
			playerId:playerId,
			add:itemConfig.gem * quantity,
			left:playerDoc.resources.gem,
			from:Consts.GemAddFrom.Iap,
			rewards:rewards
		}
		updateFuncs.push([self.GemAdd, self.GemAdd.createAsync, gemAdd])
		updateFuncs.push([self.cacheService, self.cacheService.flushPlayerAsync, playerDoc._id, playerDoc])
		return Promise.resolve()
	}).then(function(){
		return LogicUtils.excuteAll(updateFuncs)
	}).then(function(){
		callback(null, [playerData, billing.productId])
		if(_.isObject(rewards.rewardToAllianceMember) && !_.isEmpty(playerDoc.allianceId)){
			return self.cacheService.directFindAllianceAsync(playerDoc.allianceId).then(function(doc){
				allianceDoc = doc
				var funcs = []
				_.each(allianceDoc.members, function(member){
					if(!_.isEqual(member.id, playerId)){
						funcs.push(SendAllianceMembersRewardsAsync.call(self, playerId, playerDoc.basicInfo.name, member.id, rewards.rewardToAllianceMember))
					}
				})
				return Promise.all(funcs)
			}).catch(function(e){
				self.logService.onError("logic.playerIAPService.addPlayerBillingData", {
					playerId:playerId,
					transactionId:transactionId
				}, e.stack)
			})
		}
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.cacheService.updatePlayerAsync(playerDoc._id, null))
		}
		Promise.all(funcs).then(function(){
			callback(e)
		})
	})
}