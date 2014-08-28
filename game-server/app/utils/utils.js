"use strict"

var utils = module.exports
var _ = require("underscore")

utils.filter = function(doc){
	return doc
}

utils.shuffle = function(array){
	for(var tmp, cur, top = array.length; top--;){
		cur = (Math.random() * (top + 1)) << 0
		tmp = array[cur]
		array[cur] = array[top]
		array[top] = tmp
	}
	return array
}

utils.next = function(doc, code){
	var resp = {}
	resp.code = code
	if(!_.isEmpty(doc)){
		resp.data = doc
	}
	return resp
}

utils.clone = function(json){
	return JSON.parse(JSON.stringify(json))
}