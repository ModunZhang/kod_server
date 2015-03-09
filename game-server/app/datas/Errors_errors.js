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
errors["buildingNotExist"] = {
	key:"buildingNotExist",
	code:511,
	message:"建筑不存在"
}
errors["buildingUpgradingNow"] = {
	key:"buildingUpgradingNow",
	code:512,
	message:"建筑正在升级"
}
errors["buildingLocationNotLegal"] = {
	key:"buildingLocationNotLegal",
	code:513,
	message:"建筑坑位不合法"
}
errors["buildingCountReachUpLimit"] = {
	key:"buildingCountReachUpLimit",
	code:514,
	message:"建造数量已达建造上限"
}
errors["buildingLevelReachUpLimit"] = {
	key:"buildingLevelReachUpLimit",
	code:515,
	message:"建筑已达到最高等级"
}
errors["buildingUpgradePrefixNotMatch"] = {
	key:"buildingUpgradePrefixNotMatch",
	code:516,
	message:"建筑升级前置条件未满足"
}
errors["gemNotEnough"] = {
	key:"gemNotEnough",
	code:517,
	message:"宝石不足"
}
errors["onlyProductionBuildingCanSwitch"] = {
	key:"onlyProductionBuildingCanSwitch",
	code:518,
	message:"只有生产建筑才能转换"
}
errors["houseTooMuchMore"] = {
	key:"houseTooMuchMore",
	code:519,
	message:"小屋数量过多"
}
errors["hostBuildingLevelMustBiggerThanOne"] = {
	key:"hostBuildingLevelMustBiggerThanOne",
	code:520,
	message:"主体建筑必须大于等于1级"
}
errors["houseTypeNotExist"] = {
	key:"houseTypeNotExist",
	code:521,
	message:"小屋类型不存在"
}
errors["houseCountTooMuchMore"] = {
	key:"houseCountTooMuchMore",
	code:522,
	message:"小屋数量超过限制"
}
errors["buildingNotAllowHouseCreate"] = {
	key:"buildingNotAllowHouseCreate",
	code:523,
	message:"建筑周围不允许建造小屋"
}
errors["houseLocationNotLegal"] = {
	key:"houseLocationNotLegal",
	code:524,
	message:"小屋坑位不合法"
}
errors["noEnoughCitizenToCreateHouse"] = {
	key:"noEnoughCitizenToCreateHouse",
	code:525,
	message:"建造小屋会造成可用城民小于0"
}
errors["houseUpgradePrefixNotMatch"] = {
	key:"houseUpgradePrefixNotMatch",
	code:526,
	message:"小屋升级前置条件未满足"
}
errors["houseNotExist"] = {
	key:"houseNotExist",
	code:527,
	message:"小屋不存在"
}
errors["houseUpgradingNow"] = {
	key:"houseUpgradingNow",
	code:528,
	message:"小屋正在升级"
}
errors["houseReachMaxLevel"] = {
	key:"houseReachMaxLevel",
	code:529,
	message:"小屋已达到最高等级"
}
errors["noEnoughCitizenToUpgradeHouse"] = {
	key:"noEnoughCitizenToUpgradeHouse",
	code:530,
	message:"升级小屋会造成可用城民小于0"
}
errors["playerEventNotExist"] = {
	key:"playerEventNotExist",
	code:531,
	message:"玩家事件不存在"
}
errors["canNotFreeSpeedupNow"] = {
	key:"canNotFreeSpeedupNow",
	code:532,
	message:"还不能进行免费加速"
}
errors["buildingNotBuild"] = {
	key:"buildingNotBuild",
	code:533,
	message:"建筑还未建造"
}
errors["materialAsSameTypeIsMakeNow"] = {
	key:"materialAsSameTypeIsMakeNow",
	code:534,
	message:"同类型的材料正在制造"
}
errors["materialMakeFinishedButNotTakeAway"] = {
	key:"materialMakeFinishedButNotTakeAway",
	code:535,
	message:"同类型的材料制作完成后还未领取"
}
errors["materialAsDifferentTypeIsMakeNow"] = {
	key:"materialAsDifferentTypeIsMakeNow",
	code:536,
	message:"不同类型的材料正在制造"
}
errors["materialEventNotExistOrIsMakeing"] = {
	key:"materialEventNotExistOrIsMakeing",
	code:537,
	message:"材料事件不存在或者正在制作"
}
errors["soldiersAreRecruitingNow"] = {
	key:"soldiersAreRecruitingNow",
	code:538,
	message:"已有士兵正在被招募"
}
errors["recruitTooMuchOnce"] = {
	key:"recruitTooMuchOnce",
	code:539,
	message:"招募数量超过单次招募上限"
}
errors["soldierRecruitMaterialsNotEnough"] = {
	key:"soldierRecruitMaterialsNotEnough",
	code:540,
	message:"士兵招募材料不足"
}
