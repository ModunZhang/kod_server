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
	this.cacheServerIds = app.get('cacheServerIds');
	this.refreshTimeout = 10 * 60 * 1000
	this.refreshTimeoutKey = null
	this.allianceCount = 100
	this.playerCount = 500
	this.servers = {};
	var self = this;
	_.each(app.get('cacheServerIds'), function(serverId){
		self.servers[serverId] = {
			allianceKills:[],
			allianceKillIds:{},
			alliancePowers:[],
			alliancePowerIds:{},
			playerKills:[],
			playerKillIds:{},
			playerPowers:[],
			playerPowerIds:{}
		}
	})
}
module.exports = RankService
var pro = RankService.prototype


var RefreshAlliancesAsync = function(serverId){
	var self = this
	return new Promise(function(resolve, reject){
		var cursor = self.Alliance.collection.find({
			"serverId":serverId
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
					setImmediate(getNext)
				}else{
					self.servers[serverId].allianceKills = alliances
					self.servers[serverId].allianceKillIds = allianceIds
					resolve()
				}
			})
		}
		setImmediate(getNext)
	}).then(function(){
			return new Promise(function(resolve, reject){
				var cursor = self.Alliance.collection.find({
					"serverId":serverId
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
							setImmediate(getNext)
						}else{
							self.servers[serverId].alliancePowers = alliances
							self.servers[serverId].alliancePowerIds = allianceIds
							resolve()
						}
					})
				}
				setImmediate(getNext)
			})
		})
}

var RefreshPlayersAsync = function(serverId){
	var self = this
	return new Promise(function(resolve, reject){
		var cursor = self.Player.collection.find({
			"serverId":serverId
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
					setImmediate(getNext)
				}else{
					self.servers[serverId].playerKills = players
					self.servers[serverId].playerKillIds = playerIds
					resolve()
				}
			})
		}
		setImmediate(getNext)
	}).then(function(){
			return new Promise(function(resolve, reject){
				var cursor = self.Player.collection.find({
					"serverId":serverId
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
							setImmediate(getNext)
						}else{
							self.servers[serverId].playerPowers = players
							self.servers[serverId].playerPowerIds = playerIds
							resolve()
						}
					})
				}
				setImmediate(getNext)
			})
		})
}

var OnRefreshInterval = function(){
	var self = this;
	var currentIndex = 0;
	(function excute(){
		if(currentIndex < self.cacheServerIds.length){
			var serverId = self.cacheServerIds[currentIndex];
			RefreshAlliancesAsync.call(self, serverId).then(function(){
				return RefreshPlayersAsync.call(self, serverId)
			}).then(function(){
				self.logService.onEvent("rank.rankHandler.OnRefreshInterval", {serverId:serverId});
				excute();
			}).catch(function(e){
				self.logService.onEventError("rank.rankHandler.OnRefreshInterval", {serverId:serverId}, e.stack);
				excute();
			})
			currentIndex ++;
		}else{
			self.refreshTimeoutKey = setTimeout(OnRefreshInterval.bind(self), self.refreshTimeout)
		}
	})();
}

/**
 * 启动
 */
pro.start = function(){
	OnRefreshInterval.call(this);
}
pro.stop = function(){
	clearTimeout(this.refreshTimeoutKey)
}


/**
 * 获取玩家排名信息
 * @param serverId
 * @param playerId
 * @param rankType
 * @param fromRank
 * @param callback
 */
pro.getPlayerRankList = function(serverId, playerId, rankType, fromRank, callback){
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
		myData = {rank:_.isNumber(this.servers[serverId].playerKillIds[playerId]) ? this.servers[serverId].playerKillIds[playerId] : null}
		datas = this.servers[serverId].playerKills.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}else{
		myData = {rank:_.isNumber(this.servers[serverId].playerPowerIds[playerId]) ? this.servers[serverId].playerPowerIds[playerId] : null}
		datas = this.servers[serverId].playerPowers.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}
}

/**
 * 获取联盟排名信息
 * @param serverId
 * @param playerId
 * @param allianceId
 * @param rankType
 * @param fromRank
 * @param callback
 */
pro.getAllianceRankList = function(serverId, playerId, allianceId, rankType, fromRank, callback){
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
		myData = {rank:_.isNumber(this.servers[serverId].allianceKillIds[allianceId]) ? this.servers[serverId].allianceKillIds[allianceId] : null}
		datas = this.servers[serverId].allianceKills.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}else{
		myData = {rank:_.isNumber(this.servers[serverId].alliancePowerIds[allianceId]) ? this.servers[serverId].alliancePowerIds[allianceId] : null}
		datas = this.servers[serverId].alliancePowers.slice(fromRank, fromRank + Define.PlayerMaxReturnRankListSize)
		callback(null, [myData, datas])
	}
}