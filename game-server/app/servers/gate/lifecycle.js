"use strict"

/**
 * Created by modun on 14-8-9.
 */

var life = module.exports

life.beforeStartup = function(app, callback){
	callback()
}

life.afterStartup = function(app, callback){
	callback()
}

life.beforeShutdown = function(app, callback){
	callback()
}

life.afterStartAll = function(app){

}