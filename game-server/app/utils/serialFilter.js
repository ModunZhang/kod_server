/**
 * Filter to keep request sequence.
 */

var _ = require("underscore")
var logger = require("pomelo/node_modules/pomelo-logger").getLogger('pomelo', __filename)
var taskManager = require('pomelo/lib/common/manager/taskManager')

module.exports = function(timeout){
	return new Filter(timeout)
}

var Filter = function(timeout){
	this.timeout = timeout
}

/**
 * request serialization after filter
 */
Filter.prototype.before = function(msg, session, next){
	if(_.isEqual("logic.playerHandler.addPlayerBillingData", msg.__route__)){
		next()
		return
	}

	taskManager.addTask(session.id, function(task){
		session.__serialTask__ = task
		next()
	}, function(){
		logger.error('[serial filter] msg timeout, msg:' + JSON.stringify(msg));
	}, this.timeout)
}

/**
 * request serialization after filter
 */
Filter.prototype.after = function(err, msg, session, resp, next){
	if(_.isEqual("logic.playerHandler.addPlayerBillingData", msg.__route__)){
		next()
		return
	}

	var task = session.__serialTask__
	if(task){
		if(!task.done() && !err){
			err = new Error('task time out. msg:' + JSON.stringify(msg))
		}
	}
	next(err)
}
