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
errors["playerNotExistInMongo"] = {
	key:"playerNotExistInMongo",
	code:505,
	message:"玩家不存在于mongo数据库"
}
errors["objectIsLocked"] = {
	key:"objectIsLocked",
	code:506,
	message:"对象被锁定"
}
errors["reLoginNeeded"] = {
	key:"reLoginNeeded",
	code:507,
	message:"需要重新登录"
}
errors["playerAlreadyLogin"] = {
	key:"playerAlreadyLogin",
	code:508,
	message:"玩家已经登录"
}
errors["allianceNotExist"] = {
	key:"allianceNotExist",
	code:509,
	message:"联盟不存在"
}
errors["serverUnderMaintain"] = {
	key:"serverUnderMaintain",
	code:510,
	message:"服务器维护中"
}
