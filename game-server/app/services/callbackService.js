/**
 * Created by modun on 14-8-7.
 */

var _ = require("underscore")
var Events = require("../consts/events")

var CallbackService = function(app){
	this.app = app

	this.callbackPrefix = {
		player:"player_"
	}
	this.callbacks = {}
}

module.exports = CallbackService

var pro = CallbackService.prototype

/**
 * 添加某个玩家的时间回调
 * @param playerId
 * @param finishTime
 * @param callback
 */
pro.addPlayerCallback = function(playerId, finishTime, callback){
	var id = setTimeout(excutePlayerCallback.bind(this), finishTime - Date.now(), playerId, finishTime, callback)
	var key = this.callbackPrefix.player + playerId
	var callbacks = this.callbacks[key]
	if(_.isEmpty(callbacks)){
		callbacks = {}
		this.callbacks[key] = callbacks
	}
	callbacks[finishTime] = id
}

/**
 * 移除某个玩家的时间回调
 * @param playerId
 * @param finishTime
 */
pro.removePlayerCallback = function(playerId, finishTime){
	var key = this.callbackPrefix.player + playerId
	var callbacks = this.callbacks[key]
	var id = callbacks[finishTime]
	if(!_.isEmpty(id)){
		clearTimeout(id)
	}
	delete callbacks[finishTime]
}

/**
 * 移除某个玩家所有的时间回调,通常在玩家下线时调用
 * @param playerId
 */
pro.removeAllPlayerCallback = function(playerId){
	var key = this.callbackPrefix.player + playerId
	var callbacks = this.callbacks[key]
	_.each(callbacks, function(value){
		clearTimeout(value)
	})
	delete this.callbacks[key]
}


var excutePlayerCallback = function(playerId, finishTime, callback){
	var key = this.callbackPrefix.player + playerId
	var callbacks = this.callbacks[key]
	delete callbacks[finishTime]

	callback(playerId, finishTime)
}