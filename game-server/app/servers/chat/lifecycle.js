/**
 * Created by modun on 14-8-9.
 */

var Promise = require("bluebird")

var PlayerService = require("../../services/playerService")

var life = module.exports

life.beforeStartup = function(app, cb){
	cb()
}

life.afterStartup = function(app, cb){
	app.set("playerService", Promise.promisifyAll(new PlayerService(app)))

	cb()
}

life.beforeShutdown = function(app, cb){
	cb()
}

life.afterStartAll = function(app){

}