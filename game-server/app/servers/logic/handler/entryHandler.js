/**
 * Created by modun on 14-7-22.
 */

var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var utils = require("../../../utils/utils")

var Consts = require("../../../consts/consts")
var errorLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-error")
var errorMailLogger = require("pomelo/node_modules/pomelo-logger").getLogger("kod-mail-error")
var DataUtils = require("../../../utils/dataUtils")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.playerService = this.app.get("playerService")
	this.callbackService = this.app.get("callbackService")
	this.pushService = this.app.get("pushService")
	this.sessionService = this.app.get("sessionService")
	this.globalChannelService = this.app.get("globalChannelService")
	this.globalChannelName = Consts.GlobalChannelName
	this.serverId = this.app.getServerId()
}

var pro = Handler.prototype

/**
 * 玩家登陆
 * @param msg
 * @param session
 * @param next
 */
pro.login = function(msg, session, next){
	var self = this
	var deviceId = msg.deviceId
	if(_.isNull(deviceId) || _.isUndefined(deviceId)){
		next(null, {code:500})
		return
	}

	var updatePlayerData = Promisify(UpdatePlayerData, this)
	var bindPlayerSession = Promisify(BindPlayerSession, this)
	var addPlayerToLogicChannel = Promisify(AddPlayerToLogicChannel, this)
	var addPlayerToChatChannel = Promisify(AddPlayerToChatChannel, this)

	var userDoc

	this.playerService.getPlayerByDeviceIdAsync(deviceId).then(function(doc){
		userDoc = doc
		return updatePlayerData(userDoc)
	}).then(function(){
		return self.playerService.updatePlayerAsync(userDoc)
	}).then(function(){
		return bindPlayerSession(session, userDoc)
	}).then(function(){
		return addPlayerToLogicChannel(session)
	}).then(function(){
		return addPlayerToChatChannel(session)
	}).then(function(){
		userDoc.time = Date.now()
		next(null, utils.next(utils.filter(userDoc), 200))
	}).catch(function(e){
		next(e, {code:500, message:e.message})
	})
}

var BindPlayerSession = function(session, doc, callback){
	session.bind(doc._id)
	session.set("serverId", this.serverId)
	session.on("closed", PlayerLeave.bind(this))
	session.pushAll()
	process.nextTick(callback)
}

var PlayerLeave = function(session, reason){
	console.log("user [" + session.uid + "] logout with reason [" + reason + "]")

	var self = this
	var clearPlayerCallback = Promisify(ClearPlayerCallback, this)
	var savePlayerData = Promisify(SavePlayerData, this)
	var removePlayerFromGlobalChannel = Promisify(RemovePlayerFromGlobalChannel, this)
	var removePlayerFromChatChannel = Promisify(RemovePlayerFromChatChannel, this)

	clearPlayerCallback(session).then(function(){
		return removePlayerFromChatChannel(session)
	}).then(function(){
		return removePlayerFromGlobalChannel(session)
	}).then(function(){
		return savePlayerData(session)
	}).catch(function(e){
		errorLogger.error("handle playerLogout Error -----------------------------")
		errorLogger.error(e.stack)
		if(_.isEqual("production", self.app.get("env"))){
			errorMailLogger.error("handle playerLogout Error -----------------------------")
			errorMailLogger.error(e.stack)
		}
	})
}

var AddPlayerToLogicChannel = function(session, callback){
	this.globalChannelService.add(this.globalChannelName, session.uid, this.serverId, callback)
}

var RemovePlayerFromGlobalChannel = function(session, callback){
	this.globalChannelService.leave(this.globalChannelName, session.uid, this.serverId, callback)
}

var AddPlayerToChatChannel = function(session, callback){
	this.app.rpc.chat.chatRemote.add(session, session.uid, this.serverId, callback)
}

var RemovePlayerFromChatChannel = function(session, callback){
	this.app.rpc.chat.chatRemote.leave(session, session.uid, this.serverId, callback)
}

var ClearPlayerCallback = function(session, callback){
	this.callbackService.removeAllPlayerCallback(session.uid)
	callback()
}

var SavePlayerData = function(session, callback){
	this.playerService.savePlayerAsync(session.uid).then(function(){
		callback()
	}).catch(function(e){
		callback(e)
	})
}

var UpdatePlayerData = function(userDoc, callback){
	var self = this
	userDoc.basicInfo.lastLoginTime = Date.now()
	userDoc.basicInfo.loginCount += 1
	//更新资源数据
	self.playerService.refreshPlayerResources(userDoc)
	_.each(userDoc.buildings, function(building){
		//检查建筑
		if(building.finishTime > 0){
			if(building.finishTime <= Date.now()){
				building.finishTime = 0
				building.level += 1
			}else{
				self.callbackService.addPlayerCallback(userDoc._id, building.finishTime, self.playerService.excutePlayerCallback.bind(self.playerService))
			}
		}
		//检查小屋
		_.each(building.houses, function(house){
			if(house.finishTime > 0){
				if(house.finishTime <= Date.now()){
					house.finishTime = 0
					house.level += 1
					//如果是住宅,送玩家城民
					if(_.isEqual("dwelling", house.type)){
						var previous = DataUtils.getDwellingPopulationByLevel(house.level - 1)
						var next = DataUtils.getDwellingPopulationByLevel(house.level)
						userDoc.resources.citizen += next - previous
						self.playerService.refreshPlayerResources(userDoc)
					}
				}else{
					self.callbackService.addPlayerCallback(userDoc._id, house.finishTime, self.playerService.excutePlayerCallback.bind(self.playerService))
				}
			}
		})
	})

	callback()
}