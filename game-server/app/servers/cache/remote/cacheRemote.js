"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Consts = require("../../../consts/consts")

module.exports = function(app) {
	return new ChatRemote(app)
}

var CacheRemote = function(app) {
	this.app = app
}

var pro = CacheRemote.prototype

