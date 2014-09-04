"use strict"

/**
 * Created by modun on 14-9-3.
 */

module.exports = function(){
	return new Filter()
}

var Filter = function(){
}

var pro = Filter.prototype

pro.before = function(msg, session, next){
	if(!!session.uid){
		next()
	}else{
		next(new Error("玩家未登录"))
	}
}
