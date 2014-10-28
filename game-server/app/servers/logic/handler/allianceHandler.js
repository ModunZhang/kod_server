"use strict"

/**
 * Created by modun on 14-10-28.
 */

var Promise = require("bluebird")
var _ = require("underscore")

module.exports = function(app){
	return new Handler(app)
}

var Handler = function(app){
	this.app = app
	this.playerService = app.get("playerService")
}