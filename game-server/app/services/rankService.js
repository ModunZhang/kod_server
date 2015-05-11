"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var Promise = require("bluebird")
var ShortId = require("shortid")

var Consts = require("../consts/consts")
var Define = require("../consts/define")

var RankService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.Alliance = app.get("Alliance")
	this.Player = app.get("Player")
	this.refreshTimeout = 10 * 60 * 1000
	this.refreshTimeoutKey = null
	this.allianceCount = 100
	this.playerCount = 500
	this.allianceKills = []
	this.allianceKillIds = {}
	this.alliancePowers = []
	this.alliancePowerIds = {}
	this.playerKills = []
	this.playerKillIds = {}
	this.playerPowers = []
	this.playerPowerIds = {}
}
module.exports = RankService
var pro = RankService.prototype


var RefreshAlliancesAsync = function(){
	var self = this
	return new Promise(function(resolve, reject){
		var cursor = self.Alliance.collection.find({
			"serverId":self.app.get("cacheServerId")
		}, {
			_id:true,
			"basicInfo.name":true,
			"basicInfo.tag":true,
			"basicInfo.flag":true,
			"basicInfo.kill":true
		}).sort({"basicInfo.kill":-1}).limit(self.allianceCount)

		var alliances = []
		var allianceIds = {}
		var getNext = function(){
			cursor.next(function(e, doc){
				if(_.isObject(e)){
					reject(e)
					return
				}
				if(_.isObject(doc)){
					var theDoc = {
						id:doc._id,
						name:doc.basicInfo.name,
						tag:doc.basicInfo.tag,
						flag:doc.basicInfo.flag,
						value:doc.basicInfo.kill
					}
					alliances.push(theDoc)
					allianceIds[doc._id] = alliances.indexOf(theDoc)
					getNext()
				}else{
					self.allianceKills = alliances
					self.allianceKillIds = allianceIds
					resolve()
				}
			})
		}
		getNext()
	}).then(function(){
			return new Promise(function(resolve, reject){
				var cursor = self.Alliance.collection.find({
					"serverId":self.app.get("cacheServerId")
				}, {
					_id:true,
					"basicInfo.name":true,
					"basicInfo.tag":true,
					"basicInfo.flag":true,
					"basicInfo.power":true
				}).sort({"basicInfo.power":-1}).limit(self.allianceCount)

				var alliances = []
				var allianceIds = {}
				var getNext = function(){
					cursor.next(function(e, doc){
						if(_.isObject(e)){
							reject(e)
							return
						}
						if(_.isObject(doc)){
							var theDoc = {
								id:doc._id,
								name:doc.basicInfo.name,
								tag:doc.basicInfo.tag,
								flag:doc.basicInfo.flag,
								value:doc.basicInfo.power
							}
							alliances.push(theDoc)
							allianceIds[doc._id] = alliances.indexOf(theDoc)
							getNext()
						}else{
							self.alliancePowers = alliances
							self.alliancePowerIds = allianceIds
							resolve()
						}
					})
				}
				getNext()
			})
		})
}

var RefreshPlayersAsync = function(){
	var self = this
	return new Promise(function(resolve, reject){
		var cursor = self.Player.collection.find({
			"serverId":self.app.get("cacheServerId")
		}, {
			_id:true,
			"basicInfo.name":true,
			"basicInfo.icon":true,
			"basicInfo.kill":true
		}).sort({"basicInfo.kill":-1}).limit(self.playerCount)

		var players = []
		var playerIds = {}
		var getNext = function(){
			cursor.next(function(e, doc){
				if(_.isObject(e)){
					reject(e)
					return
				}
				if(_.isObject(doc)){
					var theDoc = {id:doc._id, name:doc.basicInfo.name, icon:doc.basicInfo.icon, value:doc.basicInfo.kill}
					players.push(theDoc)
					playerIds[doc._id] = players.indexOf(theDoc)
					getNext()
				}else{
					self.playerKills = players
					self.playerKillIds = playerIds
					resolve()
				}
			})
		}
		getNext()
	}).then(function(){
			return new Promise(function(resolve, reject){
				var cursor = self.Player.collection.find({
					"serverId":self.app.get("cacheServerId")
				}, {
					_id:true,
					"basicInfo.name":true,
					"basicInfo.icon":true,
					"basicInfo.power":true
				}).sort({"basicInfo.power":-1}).limit(self.playerCount)

				var players = []
				var playerIds = {}
				var getNext = function(){
					cursor.next(function(e, doc){
						if(_.isObject(e)){
							reject(e)
							return
						}
						if(_.isObject(doc)){
							var theDoc = {id:doc._id, name:doc.basicInfo.name, icon:doc.basicInfo.icon, value:doc.basicInfo.power}
							players.push(theDoc)
							playerIds[doc._id] = players.indexOf(theDoc)
							getNext()
						}else{
							self.playerPowers = players
							self.playerPowerIds = playerIds
							resolve()
						}
					})
				}
				getNext()
			})
		})
}

var OnRefreshInterval = function(){
	var self = this
	return RefreshAlliancesAsync.call(this).then(function(){
		return RefreshPlayersAsync.call(self)
	}).then(function(){
		self.refreshTimeoutKey = setTimeout(OnRefreshInterval.bind(self), self.refreshTimeout)
		return Promise.resolve()
	}).catch(function(e){
		self.logService.onEventError("rank.rankHandler.OnRefreshInterval", {}, e.stack)
		self.refreshTimeoutKey = setTimeout(OnRefreshInterval.bind(self), self.refreshTimeout)
		return Promise.resolve()
	})
}

/**
 * 启动
 */
pro.start = function(callback){
	OnRefreshInterval.call(this).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}
pro.stop = function(callback){
	clearTimeout(this.refreshTimeoutKey)
	callback()
}


/**
 * 获取玩家排名信息
 * @param playerId
 * @param rankType
 * @param fromRank
 * @param callback
 */
pro.getPlayerRankList = function(playerId, rankType, fromRank, callback){
	if(!_.contains(Consts.RankTypes, rankType)){
		callback(new Error("rankType 不合法"))
		return
	}
	if(!_.isNumber(fromRank) || fromRank % 1 !== 0 || fromRank < 0 || fromRank > 80){
		callback(new Error("fromRank 不合法"))
		return
	}

	var myData = null
	var datas = null
	if(_.isEqual(Consts.RankTypes.Kill, rankType)){
		myData = {rank:_.isNumber(this.playerKillIds[playerId]) ? this.playerKillIds[playerId] : null}
		datas = this.playerKills.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}else{
		myData = {rank:_.isNumber(this.playerPowerIds[playerId]) ? this.playerPowerIds[playerId] : null}
		datas = this.playerPowers.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}
}

/**
 * 获取联盟排名信息
 * @param playerId
 * @param allianceId
 * @param rankType
 * @param fromRank
 * @param callback
 */
pro.getAllianceRankList = function(playerId, allianceId, rankType, fromRank, callback){
	if(_.isString(allianceId) && !ShortId.isValid(allianceId)){
		callback(new Error("allianceId 不合法"))
		return
	}
	if(!_.contains(Consts.RankTypes, rankType)){
		callback(new Error("rankType 不合法"))
		return
	}
	if(!_.isNumber(fromRank) || fromRank % 1 !== 0 || fromRank < 0 || fromRank > 80){
		callback(new Error("fromRank 不合法"))
		return
	}

	var myData = null
	var datas = null
	if(_.isEqual(Consts.RankTypes.Kill, rankType)){
		myData = {rank:_.isNumber(this.allianceKillIds[allianceId]) ? this.allianceKillIds[allianceId] : null}
		datas = this.allianceKills.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}else{
		myData = {rank:_.isNumber(this.alliancePowerIds[allianceId]) ? this.alliancePowerIds[allianceId] : null}
		datas = this.alliancePowers.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}
}