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
errors["dragonEquipmentEventsExist"] = {
	key:"dragonEquipmentEventsExist",
	code:541,
	message:"龙装备制造事件已存在"
}
errors["dragonEquipmentMaterialsNotEnough"] = {
	key:"dragonEquipmentMaterialsNotEnough",
	code:542,
	message:"制作龙装备材料不足"
}
errors["soldierNotExistOrCountNotLegal"] = {
	key:"soldierNotExistOrCountNotLegal",
	code:543,
	message:"士兵不存在或士兵数量不合法"
}
errors["soldierTreatEventExist"] = {
	key:"soldierTreatEventExist",
	code:544,
	message:"士兵治疗事件已存在"
}
errors["dragonEggAlreadyHatched"] = {
	key:"dragonEggAlreadyHatched",
	code:545,
	message:"龙蛋早已成功孵化"
}
errors["dragonEggHatchEventExist"] = {
	key:"dragonEggHatchEventExist",
	code:546,
	message:"龙蛋孵化事件已存在"
}
errors["dragonNotHatched"] = {
	key:"dragonNotHatched",
	code:547,
	message:"龙还未孵化"
}
errors["dragonEquipmentNotMatchForTheDragon"] = {
	key:"dragonEquipmentNotMatchForTheDragon",
	code:548,
	message:"装备与龙的星级不匹配"
}
errors["dragonEquipmentNotEnough"] = {
	key:"dragonEquipmentNotEnough",
	code:549,
	message:"龙装备数量不足"
}
errors["dragonAlreadyHasTheSameCategory"] = {
	key:"dragonAlreadyHasTheSameCategory",
	code:550,
	message:"龙身上已经存在相同类型的装备"
}
errors["dragonDoNotHasThisEquipment"] = {
	key:"dragonDoNotHasThisEquipment",
	code:551,
	message:"此分类还没有配置装备"
}
errors["dragonEquipmentReachMaxStar"] = {
	key:"dragonEquipmentReachMaxStar",
	code:552,
	message:"装备已到最高星级"
}
errors["dragonEquipmentsNotExistOrNotEnough"] = {
	key:"dragonEquipmentsNotExistOrNotEnough",
	code:553,
	message:"被牺牲的装备不存在或数量不足"
}
errors["dragonSkillNotExist"] = {
	key:"dragonSkillNotExist",
	code:554,
	message:"龙技能不存在"
}
errors["dragonSkillIsLocked"] = {
	key:"dragonSkillIsLocked",
	code:555,
	message:"此龙技能还未解锁"
}
errors["dragonSkillReachMaxLevel"] = {
	key:"dragonSkillReachMaxLevel",
	code:556,
	message:"龙技能已达最高等级"
}
errors["heroBloodNotEnough"] = {
	key:"heroBloodNotEnough",
	code:557,
	message:"英雄之血不足"
}
errors["dragonReachMaxStar"] = {
	key:"dragonReachMaxStar",
	code:558,
	message:"龙的星级已达最高"
}
errors["dragonUpgradeStarFailedForLevelNotLegal"] = {
	key:"dragonUpgradeStarFailedForLevelNotLegal",
	code:559,
	message:"龙的等级未达到晋级要求"
}
errors["dragonUpgradeStarFailedForEquipmentNotLegal"] = {
	key:"dragonUpgradeStarFailedForEquipmentNotLegal",
	code:560,
	message:"龙的装备未达到晋级要求"
}
errors["dailyQuestNotExist"] = {
	key:"dailyQuestNotExist",
	code:561,
	message:"每日任务不存在"
}
errors["dailyQuestReachMaxStar"] = {
	key:"dailyQuestReachMaxStar",
	code:562,
	message:"每日任务已达最高星级"
}
errors["dailyQuestEventExist"] = {
	key:"dailyQuestEventExist",
	code:563,
	message:"每日任务事件已存在"
}
errors["dailyQuestEventNotExist"] = {
	key:"dailyQuestEventNotExist",
	code:564,
	message:"每日任务事件不存在"
}
errors["dailyQuestEventNotFinished"] = {
	key:"dailyQuestEventNotFinished",
	code:565,
	message:"每日任务事件还未完成"
}
errors["mailNotExist"] = {
	key:"mailNotExist",
	code:566,
	message:"邮件不存在"
}
errors["reportNotExist"] = {
	key:"reportNotExist",
	code:567,
	message:"战报不存在"
}
errors["dragonIsNotFree"] = {
	key:"dragonIsNotFree",
	code:568,
	message:"龙未处于空闲状态"
}
errors["dragonSelectedIsDead"] = {
	key:"dragonSelectedIsDead",
	code:569,
	message:"所选择的龙已经阵亡"
}
errors["noDragonInDefenceStatus"] = {
	key:"noDragonInDefenceStatus",
	code:570,
	message:"没有龙驻防在城墙"
}
errors["sellQueueNotEnough"] = {
	key:"sellQueueNotEnough",
	code:571,
	message:"没有足够的出售队列"
}
errors["resourceNotEnough"] = {
	key:"resourceNotEnough",
	code:572,
	message:"玩家资源不足"
}
errors["cartNotEnough"] = {
	key:"cartNotEnough",
	code:573,
	message:"马车数量不足"
}
errors["sellItemNotExist"] = {
	key:"sellItemNotExist",
	code:574,
	message:"商品不存在"
}
errors["coinNotEnough"] = {
	key:"coinNotEnough",
	code:575,
	message:"银币不足"
}
errors["sellItemNotSold"] = {
	key:"sellItemNotSold",
	code:576,
	message:"商品还未卖出"
}
errors["sellItemNotBelongsToYou"] = {
	key:"sellItemNotBelongsToYou",
	code:577,
	message:"您未出售此商品"
}
errors["sellItemAlreadySold"] = {
	key:"sellItemAlreadySold",
	code:578,
	message:"商品已经售出"
}
