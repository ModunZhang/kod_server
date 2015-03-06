"use strict"

var errors = {}
module.exports = errors

errors["deviceNotExist"] = {
	key:"deviceNotExist",
	code:501,
	message:"设备不存在"
}
errors["userNotExist"] = {
	key:"userNotExist",
	code:502,
	message:"用户不存在"
}
errors["noActivePlayerId"] = {
	key:"noActivePlayerId",
	code:503,
	message:"没有激活的玩家Id"
}
errors["playerNotExist"] = {
	key:"playerNotExist",
	code:504,
	message:"玩家不存在"
}
errors["objectIsLocked"] = {
	key:"objectIsLocked",
	code:505,
	message:"对象被锁定"
}
