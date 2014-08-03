/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var utils = require("../../../utils/utils")

var PlayerService = require("../../../services/playerService")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.playerService = Promise.promisifyAll(new PlayerService(this.app.get("redis")))
	this.globalChannelService = this.app.get("globalChannelService")
	this.globalChannelName = "logicChannel"
	this.serverId = this.app.getServerId()
}

var pro = Handler.prototype

pro.login = function(msg, session, next){
	var deviceId = msg.deviceId
	if(_.isNull(deviceId) || _.isUndefined(deviceId)){
		next(null, {code:500})
		return
	}

	var bindUserSession = Promisify(BindUserSession, this)
	var addUserToLogicChannel = Promisify(AddUserToLogicChannel, this)
	var addUserToChatChannel = Promisify(AddUserToChatChannel, this)

	var userDoc
	this.playerService.getPlayerByDeviceIdAsync(deviceId).then(function(doc){
		userDoc = doc
		return bindUserSession(session, doc)
	}).then(function(){
		return addUserToLogicChannel(session)
	}).then(function(){
		return addUserToChatChannel(session)
	}).then(function(){
		userDoc.time = Date.now()
		next(null, utils.next(utils.filter(userDoc), 200))
	}).catch(function(e){
		console.error(e)
		next(null, {code:500})
	})
}

var BindUserSession = function(session, doc, callback){
	session.bind(doc._id)
	session.on("closed", UserLeave.bind(this))
	session.pushAll()
	process.nextTick(callback)
}

var UserLeave = function(session, reason){
	console.log("user [" + session.uid + "] logout with reason [" + reason + "]")

	var removeUserFromLogicChannel = Promisify(RemoveUserFromLogicChannel, this)
	var removeUserFromChatChannel = Promisify(RemoveUserFromChatChannel, this)
	removeUserFromLogicChannel(session).then(function(){
		return removeUserFromChatChannel(session)
	}).catch(function(e){
		console.error(e)
	})
}

var AddUserToLogicChannel = function(session, callback){
	this.globalChannelService.add(this.globalChannelName, session.uid, this.serverId, callback)
}

var RemoveUserFromLogicChannel = function(session, callback){
	this.globalChannelService.leave(this.globalChannelName, session.uid, this.serverId, callback)
}

var AddUserToChatChannel = function(session, callback){
	this.app.rpc.chat.chatRemote.add(session, session.uid, this.serverId, callback)
}

var RemoveUserFromChatChannel = function(session, callback){
	this.app.rpc.chat.chatRemote.leave(session, session.uid, this.serverId, callback)
}