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
	var time = msg.__time__
	var now = Date.now()
	if(!_.isNumber(time)){
		next(new Error("Illegal request! info:" + msg.__route__))
	}else if(Math.abs((now - time)) / 1000 > 5){
		next(new Error("Illegal request! info:" + msg.__route__))
	}else{
		next()
	}
}
