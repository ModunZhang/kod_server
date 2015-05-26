"use strict"

/**
 * Created by modun on 15/3/19.
 */

var _ = require("underscore")

var Consts = require("../consts/consts")
var Define = require("../consts/define")

var ChatService = function(app){
	this.app = app
	this.chats = []
	this.allianceChats = {}
	this.allianceFightChats = {}
	this.maxChatCount = 50
	this.maxAllianceChatCount = 50
	this.maxAllianceFightChatCount = 50
}
module.exports = ChatService
var pro = ChatService.prototype

