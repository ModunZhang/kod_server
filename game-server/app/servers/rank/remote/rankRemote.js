"use strict"

/**
 * Created by modun on 14-7-29.
 */

var Consts = require("../../../consts/consts")

module.exports = function(app) {
	return new RankRemote(app)
}

var RankRemote = function(app) {
	this.app = app
}

var pro = RankRemote.prototype
