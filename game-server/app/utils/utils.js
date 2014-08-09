var utils = module.exports
var _ = require("underscore")

/**
 * check and invoke callback function
 * @param cb
 */
utils.callback = function(cb){
	if(!!cb && typeof cb === 'function'){
		cb.apply(null, Array.prototype.slice.call(arguments, 1))
	}
}

function getStack(){
	var orig = Error.prepareStackTrace
	Error.prepareStackTrace = function(_, stack){
		return stack
	}
	var err = new Error()
	Error.captureStackTrace(err, arguments.callee)
	var stack = err.stack
	Error.prepareStackTrace = orig
	return stack
}

function getFileName(stack){
	return stack[1].getFileName()
}

function getLineNumber(stack){
	return stack[1].getLineNumber()
}

/**
 * output message with file and line number
 */
utils.print = function(){
	if(isPrintFlag){
		var len = arguments.length
		if(len <= 0){
			return
		}
		var stack = getStack()
		var aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n'
		for(var i = 0; i < len; ++i){
			aimStr += arguments[i] + ' '
		}
		console.log('\n' + aimStr)
	}
}

utils.filter = function(doc){
	var resp = _.omit(doc, "__v", "__changed")
	return resp
}

utils.next = function(doc, code){
	var resp = {}
	resp.code = code
	if(!_.isEmpty(doc)){
		resp.data = doc
	}
	return resp
}