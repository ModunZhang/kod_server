/**
 * Created by modun on 14-7-29.
 */

module.exports = function(app) {
	return new ChatRemote(app)
}

var ChatRemote = function(app) {
	this.app = app
	this.channelService = app.get("channelService")
	this.channel = this.channelService.getChannel("chatChannel", true)
}

var pro = ChatRemote.prototype

pro.add = function(uid, sid, cb){
	this.channel.add(uid, sid)
	cb()
}

pro.leave = function(uid, sid, cb){
	this.channel.leave(uid, sid)
	cb()
}