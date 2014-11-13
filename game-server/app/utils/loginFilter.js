"use strict"

/**
 * Created by modun on 14-9-3.
 */

var _ = require("underscore")

module.exports = function(){
	return new Filter()
}

var Filter = function(){
}

var pro = Filter.prototype

pro.before = function(msg, session, next){
	if(_.isEqual("logic.entryHandler.login", msg.__route__)){
		next()
	}else if(!!session.uid){
		next()
	}else{
		next(new Error("Illegal request! info:" + msg.__route__))
	}
}
