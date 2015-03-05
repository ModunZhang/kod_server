"use strict"

var errors = {}
module.exports = errors

errors["deviceNotExist"] = {
	key:"deviceNotExist",
	code:501,
	expected:false,
	desc:"device不存在"
}
