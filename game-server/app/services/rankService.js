"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var RankService = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.Alliance = app.get("Alliance")
	this.Player = app.get("Player")
	this.refreshTimeout = 5 * 1000
	this.refreshTimeoutKey = null
	this.allianceCount = 100
	this.playerCount = 500
	this.alliances = []
	this.allianceIds = {}
	this.players = []
	this.playerIds = {}
}
module.exports = RankService
var pro = RankService.prototype


var RefreshAlliancesAsync = function(){
	var self = this
	return new Promise(function(resolve, reject){
		self.Alliance.collection.find({
			"serverId":self.app.get("cacheServerId")
		}, {
			_id:true,
			"basicInfo.name":true,
			"basicInfo.tag":true,
			"basicInfo.flag":true
		}).sort({"basicInfo.power":-1}).limit(self.allianceCount).toArray(function(e, docs){
			if(_.isObject(e)) reject(e)
			else{
				self.alliances = []
				self.allianceIds = {}
				for(var i = 0; i < docs.length; i ++){
					self.alliances.push(docs[i])
					self.allianceIds[docs[i]._id] = i
				}
				resolve()
			}
		})
	})
}

var RefreshPlayersAsync = function(){
	var self = this
	return new Promise(function(resolve, reject){
		self.Player.collection.find({
			"serverId":self.app.get("cacheServerId")
		}, {
			_id:true,
			"basicInfo.name":true,
			"basicInfo.icon":true
		}).sort({"basicInfo.power":-1}).limit(self.playerCount).toArray(function(e, docs){
			if(_.isObject(e)) reject(e)
			else{
				self.players = []
				self.playerIds = {}
				for(var i = 0; i < docs.length; i ++){
					self.players.push(docs[i])
					self.playerIds[docs[i]._id] = i
				}
				resolve()
			}
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

	var self = this
	var playerDoc = null
	var myData = null
	var ids = []
	var scores = []
	var datas = []
	this.dataService.directFindPlayerAsync(playerId).then(function(doc){
		playerDoc = doc

		return self.redis.zrevrankAsync([playerDoc.serverId + ".player.basicInfo." + rankType, playerId])
	}).then(function(rank){
		myData = {rank:rank}
		return self.redis.zrevrangeAsync([playerDoc.serverId + ".player.basicInfo." + rankType, fromRank, fromRank + Define.PlayerMaxReturnRankListSize - 1, "WITHSCORES"])
	}).then(function(res){
		for(var i = 0; i < res.length; i += 2){
			ids.push(res[i])
			scores.push(res[i + 1])
		}
		if(ids.length > 0){
			return self.playerDao.findAllAsync(ids)
		}
		return Promise.resolve([])
	}).then(function(docs){
		for(var i = 0; i < docs.length; i++){
			var data = {
				id:docs[i]._id,
				name:docs[i].basicInfo.name,
				icon:docs[i].basicInfo.icon,
				value:scores[i]
			}
			datas.push(data)
		}
		return Promise.resolve()
	}).then(function(){
		callback(null, [myData, datas])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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
 * 获取联盟排名信息
 * @param playerId
 * @param rankType
 * @param fromRank
 * @param callback
 */
pro.getAllianceRankList = function(playerId, rankType, fromRank, callback){
	if(!_.contains(Consts.RankTypes, rankType)){
		callback(new Error("rankType 不合法"))
		return
	}
	if(!_.isNumber(fromRank) || fromRank % 1 !== 0 || fromRank < 0 || fromRank > 80){
		callback(new Error("fromRank 不合法"))
		return
	}

	var self = this
	var playerDoc = null
	var myData = null
	var ids = []
	var scores = []
	var datas = []
	this.dataService.findPlayerAsync(playerId).then(function(doc){
		playerDoc = doc
		if(!_.isObject(playerDoc.alliance)) return Promise.reject(ErrorUtils.playerNotJoinAlliance(playerId))
		return self.dataService.updatePlayerAsync(playerDoc, null)
	}).then(function(){
		return self.redis.zrevrankAsync([playerDoc.serverId + ".alliance.basicInfo." + rankType, playerDoc.alliance.id])
	}).then(function(rank){
		myData = {rank:rank}
		return self.redis.zrevrangeAsync([playerDoc.serverId + ".alliance.basicInfo." + rankType, fromRank, fromRank + Define.PlayerMaxReturnRankListSize - 1, "WITHSCORES"])
	}).then(function(res){
		for(var i = 0; i < res.length; i += 2){
			ids.push(res[i])
			scores.push(res[i + 1])
		}
		if(ids.length > 0){
			return self.allianceDao.findAllAsync(ids)
		}
		return Promise.resolve([])
	}).then(function(docs){
		for(var i = 0; i < docs.length; i++){
			var data = {
				id:docs[i]._id,
				name:docs[i].basicInfo.name,
				tag:docs[i].basicInfo.tag,
				flag:docs[i].basicInfo.flag,
				value:scores[i]
			}
			datas.push(data)
		}
		return Promise.resolve()
	}).then(function(){
		return self.dataService.updatePlayerAsync(playerDoc, null)
	}).then(function(){
		callback(null, [myData, datas])
	}).catch(function(e){
		var funcs = []
		if(_.isObject(playerDoc)){
			funcs.push(self.dataService.updatePlayerAsync(playerDoc, null))
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