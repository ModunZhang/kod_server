"use strict"

/**
 * Created by modun on 14-7-29.
 */

var _ = require("underscore")
var Promise = require("bluebird")

var Consts = require("../../../consts/consts")
var Events = require("../../../consts/events")
var ErrorUtils = require("../../../utils/errorUtils")

module.exports = function(app){
	return new RankHandler(app)
}

var RankHandler = function(app){
	this.app = app
	this.logService = app.get("logService")
	this.Alliance = app.get("Alliance")
	this.Player = app.get("Player")
	this.refreshInterval = 5 * 60 * 1000
	this.allianceCount = 100
	this.playerCount = 500
	this.alliances = []
	this.allianceIds = {}
	this.players = []
	this.playerIds = {}
	OnRefreshInterval.call(this)
}

var pro = RankHandler.prototype

var RefreshAlliancesAsync = function(){

}

var RefreshPlayersAsync = function(){

}

var OnRefreshInterval = function(){
	RefreshAlliancesAsync().then(function(){
		return RefreshPlayersAsync()
	}).then(function(){

	}).catch(function(e){

	})
}