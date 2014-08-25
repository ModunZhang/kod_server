"use strict"

var utils = module.exports
var _ = require("underscore")

utils.filter = function(doc){
	return doc
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