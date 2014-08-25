/**
 * Created by modun on 14-8-9.
 */

var life = module.exports

life.beforeStartup = function(app, cb){
	cb()
}

life.afterStartup = function(app, cb){
	cb()
}

life.beforeShutdown = function(app, cb){
	cb()
}

life.afterStartAll = function(app){

}