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
errors["buildingUpgradePreConditionNotMatch"] = {
	key:"buildingUpgradePreConditionNotMatch",
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
errors["theSoldierIsLocked"] = {
	key:"theSoldierIsLocked",
	code:538,
	message:"此士兵还处于锁定状态"
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
errors["dragonEggAlreadyHatched"] = {
	key:"dragonEggAlreadyHatched",
	code:544,
	message:"龙蛋早已成功孵化"
}
errors["dragonEggHatchEventExist"] = {
	key:"dragonEggHatchEventExist",
	code:545,
	message:"龙蛋孵化事件已存在"
}
errors["dragonNotHatched"] = {
	key:"dragonNotHatched",
	code:546,
	message:"龙还未孵化"
}
errors["dragonEquipmentNotMatchForTheDragon"] = {
	key:"dragonEquipmentNotMatchForTheDragon",
	code:547,
	message:"装备与龙的星级不匹配"
}
errors["dragonEquipmentNotEnough"] = {
	key:"dragonEquipmentNotEnough",
	code:548,
	message:"龙装备数量不足"
}
errors["dragonAlreadyHasTheSameCategory"] = {
	key:"dragonAlreadyHasTheSameCategory",
	code:549,
	message:"龙身上已经存在相同类型的装备"
}
errors["dragonDoNotHasThisEquipment"] = {
	key:"dragonDoNotHasThisEquipment",
	code:550,
	message:"此分类还没有配置装备"
}
errors["dragonEquipmentReachMaxStar"] = {
	key:"dragonEquipmentReachMaxStar",
	code:551,
	message:"装备已到最高星级"
}
errors["dragonEquipmentsNotExistOrNotEnough"] = {
	key:"dragonEquipmentsNotExistOrNotEnough",
	code:552,
	message:"被牺牲的装备不存在或数量不足"
}
errors["dragonSkillNotExist"] = {
	key:"dragonSkillNotExist",
	code:553,
	message:"龙技能不存在"
}
errors["dragonSkillIsLocked"] = {
	key:"dragonSkillIsLocked",
	code:554,
	message:"此龙技能还未解锁"
}
errors["dragonSkillReachMaxLevel"] = {
	key:"dragonSkillReachMaxLevel",
	code:555,
	message:"龙技能已达最高等级"
}
errors["heroBloodNotEnough"] = {
	key:"heroBloodNotEnough",
	code:556,
	message:"英雄之血不足"
}
errors["dragonReachMaxStar"] = {
	key:"dragonReachMaxStar",
	code:557,
	message:"龙的星级已达最高"
}
errors["dragonUpgradeStarFailedForLevelNotLegal"] = {
	key:"dragonUpgradeStarFailedForLevelNotLegal",
	code:558,
	message:"龙的等级未达到晋级要求"
}
errors["dragonUpgradeStarFailedForEquipmentNotLegal"] = {
	key:"dragonUpgradeStarFailedForEquipmentNotLegal",
	code:559,
	message:"龙的装备未达到晋级要求"
}
errors["dailyQuestNotExist"] = {
	key:"dailyQuestNotExist",
	code:560,
	message:"每日任务不存在"
}
errors["dailyQuestReachMaxStar"] = {
	key:"dailyQuestReachMaxStar",
	code:561,
	message:"每日任务已达最高星级"
}
errors["dailyQuestEventExist"] = {
	key:"dailyQuestEventExist",
	code:562,
	message:"每日任务事件已存在"
}
errors["dailyQuestEventNotExist"] = {
	key:"dailyQuestEventNotExist",
	code:563,
	message:"每日任务事件不存在"
}
errors["dailyQuestEventNotFinished"] = {
	key:"dailyQuestEventNotFinished",
	code:564,
	message:"每日任务事件还未完成"
}
errors["mailNotExist"] = {
	key:"mailNotExist",
	code:565,
	message:"邮件不存在"
}
errors["reportNotExist"] = {
	key:"reportNotExist",
	code:566,
	message:"战报不存在"
}
errors["dragonIsNotFree"] = {
	key:"dragonIsNotFree",
	code:567,
	message:"龙未处于空闲状态"
}
errors["dragonSelectedIsDead"] = {
	key:"dragonSelectedIsDead",
	code:568,
	message:"所选择的龙已经阵亡"
}
errors["noDragonInDefenceStatus"] = {
	key:"noDragonInDefenceStatus",
	code:569,
	message:"没有龙驻防在城墙"
}
errors["sellQueueNotEnough"] = {
	key:"sellQueueNotEnough",
	code:570,
	message:"没有足够的出售队列"
}
errors["resourceNotEnough"] = {
	key:"resourceNotEnough",
	code:571,
	message:"玩家资源不足"
}
errors["cartNotEnough"] = {
	key:"cartNotEnough",
	code:572,
	message:"马车数量不足"
}
errors["sellItemNotExist"] = {
	key:"sellItemNotExist",
	code:573,
	message:"商品不存在"
}
errors["sellItemNotSold"] = {
	key:"sellItemNotSold",
	code:574,
	message:"商品还未卖出"
}
errors["sellItemNotBelongsToYou"] = {
	key:"sellItemNotBelongsToYou",
	code:575,
	message:"您未出售此商品"
}
errors["sellItemAlreadySold"] = {
	key:"sellItemAlreadySold",
	code:576,
	message:"商品已经售出"
}
errors["techReachMaxLevel"] = {
	key:"techReachMaxLevel",
	code:577,
	message:"科技已达最高等级"
}
errors["techUpgradePreConditionNotMatch"] = {
	key:"techUpgradePreConditionNotMatch",
	code:578,
	message:"前置科技条件不满足"
}
errors["techIsUpgradingNow"] = {
	key:"techIsUpgradingNow",
	code:579,
	message:"所选择的科技正在升级"
}
errors["soldierReachMaxStar"] = {
	key:"soldierReachMaxStar",
	code:580,
	message:"士兵已达最高星级"
}
errors["techPointNotEnough"] = {
	key:"techPointNotEnough",
	code:581,
	message:"科技点不足"
}
errors["soldierIsUpgradingNow"] = {
	key:"soldierIsUpgradingNow",
	code:582,
	message:"此兵种正在升级中"
}
errors["itemNotSell"] = {
	key:"itemNotSell",
	code:583,
	message:"此道具未出售"
}
errors["itemNotExist"] = {
	key:"itemNotExist",
	code:584,
	message:"道具不存在"
}
errors["houseCanNotBeMovedNow"] = {
	key:"houseCanNotBeMovedNow",
	code:585,
	message:"小屋当前不能被移动"
}
errors["playerNameCanNotBeTheSame"] = {
	key:"playerNameCanNotBeTheSame",
	code:586,
	message:"不能修改为相同的玩家名称"
}
errors["playerNameAlreadyUsed"] = {
	key:"playerNameAlreadyUsed",
	code:587,
	message:"玩家名称已被其他玩家占用"
}
errors["cityNameCanNotBeTheSame"] = {
	key:"cityNameCanNotBeTheSame",
	code:588,
	message:"不能修改为相同的城市名称"
}
errors["playerNotJoinAlliance"] = {
	key:"playerNotJoinAlliance",
	code:589,
	message:"玩家未加入联盟"
}
errors["marchEventNotExist"] = {
	key:"marchEventNotExist",
	code:590,
	message:"行军事件不存在"
}
errors["allianceInFightStatus"] = {
	key:"allianceInFightStatus",
	code:591,
	message:"联盟正处于战争期"
}
errors["playerHasMarchEvent"] = {
	key:"playerHasMarchEvent",
	code:592,
	message:"玩家有部队正在行军中"
}
errors["canNotMoveToTargetPlace"] = {
	key:"canNotMoveToTargetPlace",
	code:593,
	message:"不能移动到目标点位"
}
errors["itemCanNotBeUsedDirectly"] = {
	key:"itemCanNotBeUsedDirectly",
	code:594,
	message:"此道具不允许直接使用"
}
errors["casinoTokenNotEnough"] = {
	key:"casinoTokenNotEnough",
	code:595,
	message:"赌币不足"
}
errors["loginRewardAlreadyGet"] = {
	key:"loginRewardAlreadyGet",
	code:596,
	message:"今日登陆奖励已领取"
}
errors["onlineTimeNotEough"] = {
	key:"onlineTimeNotEough",
	code:597,
	message:"在线时间不足,不能领取"
}
errors["onlineTimeRewardAlreadyGet"] = {
	key:"onlineTimeRewardAlreadyGet",
	code:598,
	message:"此时间节点的在线奖励已经领取"
}
errors["wonderAssistanceRewardAlreadyGet"] = {
	key:"wonderAssistanceRewardAlreadyGet",
	code:599,
	message:"今日王城援军奖励已领取"
}
errors["levelUpRewardExpired"] = {
	key:"levelUpRewardExpired",
	code:600,
	message:"冲级奖励时间已过"
}
errors["levelUpRewardAlreadyGet"] = {
	key:"levelUpRewardAlreadyGet",
	code:601,
	message:"当前等级的冲级奖励已经领取"
}
errors["levelUpRewardCanNotBeGetForCastleLevelNotMatch"] = {
	key:"levelUpRewardCanNotBeGetForCastleLevelNotMatch",
	code:602,
	message:"玩家城堡等级不足以领取当前冲级奖励"
}
errors["firstIAPNotHappen"] = {
	key:"firstIAPNotHappen",
	code:603,
	message:"玩家还未进行首次充值"
}
errors["firstIAPRewardAlreadyGet"] = {
	key:"firstIAPRewardAlreadyGet",
	code:604,
	message:"首次充值奖励已经领取"
}
errors["dailyTaskRewardAlreadyGet"] = {
	key:"dailyTaskRewardAlreadyGet",
	code:605,
	message:"日常任务奖励已经领取"
}
errors["dailyTaskNotFinished"] = {
	key:"dailyTaskNotFinished",
	code:606,
	message:"日常任务还未完成"
}
errors["growUpTaskNotExist"] = {
	key:"growUpTaskNotExist",
	code:607,
	message:"成长任务不存在"
}
errors["growUpTaskRewardCanNotBeGetForPreTaskRewardNotGet"] = {
	key:"growUpTaskRewardCanNotBeGetForPreTaskRewardNotGet",
	code:608,
	message:"前置任务奖励未领取"
}
errors["duplicateIAPTransactionId"] = {
	key:"duplicateIAPTransactionId",
	code:609,
	message:"重复的订单号"
}
errors["iapProductNotExist"] = {
	key:"iapProductNotExist",
	code:610,
	message:"订单商品不存在"
}
errors["iapValidateFaild"] = {
	key:"iapValidateFaild",
	code:611,
	message:"订单验证失败"
}
errors["netErrorWithIapServer"] = {
	key:"netErrorWithIapServer",
	code:612,
	message:"IAP服务器通讯出错"
}
errors["iapServerNotAvailable"] = {
	key:"iapServerNotAvailable",
	code:613,
	message:"IAP服务器关闭"
}
errors["playerAlreadyJoinAlliance"] = {
	key:"playerAlreadyJoinAlliance",
	code:614,
	message:"玩家已加入了联盟"
}
errors["allianceNameExist"] = {
	key:"allianceNameExist",
	code:615,
	message:"联盟名称已经存在"
}
errors["allianceTagExist"] = {
	key:"allianceTagExist",
	code:616,
	message:"联盟标签已经存在"
}
errors["allianceOperationRightsIllegal"] = {
	key:"allianceOperationRightsIllegal",
	code:617,
	message:"联盟操作权限不足"
}
errors["allianceHonourNotEnough"] = {
	key:"allianceHonourNotEnough",
	code:618,
	message:"联盟荣耀值不足"
}
errors["allianceDoNotHasThisMember"] = {
	key:"allianceDoNotHasThisMember",
	code:619,
	message:"联盟没有此玩家"
}
errors["allianceInFightStatusCanNotKickMemberOff"] = {
	key:"allianceInFightStatusCanNotKickMemberOff",
	code:620,
	message:"联盟正在战争准备期或战争期,不能将玩家踢出联盟"
}
errors["canNotKickAllianceMemberOffForTitleIsUpperThanMe"] = {
	key:"canNotKickAllianceMemberOffForTitleIsUpperThanMe",
	code:621,
	message:"不能将职级高于或等于自己的玩家踢出联盟"
}
errors["youAreNotTheAllianceArchon"] = {
	key:"youAreNotTheAllianceArchon",
	code:622,
	message:"别逗了,你是不盟主好么"
}
errors["allianceArchonCanNotQuitAlliance"] = {
	key:"allianceArchonCanNotQuitAlliance",
	code:623,
	message:"别逗了,仅当联盟成员为空时,盟主才能退出联盟"
}
errors["allianceInFightStatusCanNotQuitAlliance"] = {
	key:"allianceInFightStatusCanNotQuitAlliance",
	code:624,
	message:"联盟正在战争准备期或战争期,不能退出联盟"
}
errors["allianceDoNotAllowJoinDirectly"] = {
	key:"allianceDoNotAllowJoinDirectly",
	code:625,
	message:"联盟不允许直接加入"
}
errors["joinAllianceRequestIsFull"] = {
	key:"joinAllianceRequestIsFull",
	code:626,
	message:"联盟申请已满,请撤消部分申请后再来申请"
}
errors["joinTheAllianceRequestAlreadySend"] = {
	key:"joinTheAllianceRequestAlreadySend",
	code:627,
	message:"对此联盟的申请已发出,请耐心等候审核"
}
errors["allianceJoinRequestMessagesIsFull"] = {
	key:"allianceJoinRequestMessagesIsFull",
	code:628,
	message:"此联盟的申请信息已满,请等候其处理后再进行申请"
}
errors["joinAllianceRequestNotExist"] = {
	key:"joinAllianceRequestNotExist",
	code:629,
	message:"联盟申请事件不存在"
}
errors["playerCancelTheJoinRequestToTheAlliance"] = {
	key:"playerCancelTheJoinRequestToTheAlliance",
	code:630,
	message:"玩家已经取消对此联盟的申请"
}
errors["inviteRequestMessageIsFullForThisPlayer"] = {
	key:"inviteRequestMessageIsFullForThisPlayer",
	code:631,
	message:"此玩家的邀请信息已满,请等候其处理后再进行邀请"
}
errors["allianceInviteEventNotExist"] = {
	key:"allianceInviteEventNotExist",
	code:632,
	message:"联盟邀请事件不存在"
}
errors["playerAlreadyTheAllianceArchon"] = {
	key:"playerAlreadyTheAllianceArchon",
	code:633,
	message:"玩家已经是盟主了"
}
errors["onlyAllianceArchonMoreThanSevenDaysNotOnLinePlayerCanBuyArchonTitle"] = {
	key:"onlyAllianceArchonMoreThanSevenDaysNotOnLinePlayerCanBuyArchonTitle",
	code:634,
	message:"盟主连续7天不登陆时才能购买盟主职位"
}
errors["speedupRequestAlreadySendForThisEvent"] = {
	key:"speedupRequestAlreadySendForThisEvent",
	code:635,
	message:"此事件已经发送了加速请求"
}
errors["allianceHelpEventNotExist"] = {
	key:"allianceHelpEventNotExist",
	code:636,
	message:"帮助事件不存在"
}
errors["canNotHelpSelfSpeedup"] = {
	key:"canNotHelpSelfSpeedup",
	code:637,
	message:"不能帮助自己加速建造"
}
errors["youAlreadyHelpedTheEvent"] = {
	key:"youAlreadyHelpedTheEvent",
	code:638,
	message:"您已经帮助过此事件了"
}
errors["allianceBuildingReachMaxLevel"] = {
	key:"allianceBuildingReachMaxLevel",
	code:639,
	message:"联盟建筑已达到最高等级"
}
errors["theAllianceShrineEventAlreadyActived"] = {
	key:"theAllianceShrineEventAlreadyActived",
	code:640,
	message:"此联盟事件已经激活"
}
errors["alliancePerceptionNotEnough"] = {
	key:"alliancePerceptionNotEnough",
	code:641,
	message:"联盟感知力不足"
}
errors["dragonLeaderShipNotEnough"] = {
	key:"dragonLeaderShipNotEnough",
	code:642,
	message:"所选择的龙领导力不足"
}
errors["noFreeMarchQueue"] = {
	key:"noFreeMarchQueue",
	code:643,
	message:"没有空闲的行军队列"
}
errors["shrineStageEventNotFound"] = {
	key:"shrineStageEventNotFound",
	code:644,
	message:"关卡激活事件不存在"
}
errors["theShrineStageIsLocked"] = {
	key:"theShrineStageIsLocked",
	code:645,
	message:"此联盟圣地关卡还未解锁"
}
errors["youHadSendTroopToTheShrineStage"] = {
	key:"youHadSendTroopToTheShrineStage",
	code:646,
	message:"玩家已经对此关卡派出了部队"
}
errors["allianceInFightStatus"] = {
	key:"allianceInFightStatus",
	code:647,
	message:"联盟正处于战争准备期或战争期"
}
errors["alreadySendAllianceFightRequest"] = {
	key:"alreadySendAllianceFightRequest",
	code:648,
	message:"已经发送过开战请求"
}
errors["canNotFindAllianceToFight"] = {
	key:"canNotFindAllianceToFight",
	code:649,
	message:"未能找到战力相匹配的联盟"
}
errors["allianceFightReportNotExist"] = {
	key:"allianceFightReportNotExist",
	code:650,
	message:"联盟战报不存在"
}
errors["winnerOfAllianceFightCanNotRevenge"] = {
	key:"winnerOfAllianceFightCanNotRevenge",
	code:651,
	message:"联盟战胜利方不能发起复仇"
}
errors["allianceFightRevengeTimeExpired"] = {
	key:"allianceFightRevengeTimeExpired",
	code:652,
	message:"超过最长复仇期限"
}
errors["targetAllianceNotInPeaceStatus"] = {
	key:"targetAllianceNotInPeaceStatus",
	code:653,
	message:"目标联盟未处于和平期,不能发起复仇"
}
errors["playerAlreadySendHelpDefenceTroopToTargetPlayer"] = {
	key:"playerAlreadySendHelpDefenceTroopToTargetPlayer",
	code:654,
	message:"玩家已经对目标玩家派出了协防部队"
}
errors["targetPlayersHelpDefenceTroopsCountReachMax"] = {
	key:"targetPlayersHelpDefenceTroopsCountReachMax",
	code:655,
	message:"目标玩家协防部队数量已达最大"
}
errors["noHelpDefenceTroopInTargetPlayerCity"] = {
	key:"noHelpDefenceTroopInTargetPlayerCity",
	code:656,
	message:"玩家没有协防部队驻扎在目标玩家城市"
}
errors["allianceNotInFightStatus"] = {
	key:"allianceNotInFightStatus",
	code:657,
	message:"联盟未处于战争期"
}
errors["playerNotInEnemyAlliance"] = {
	key:"playerNotInEnemyAlliance",
	code:658,
	message:"玩家不在敌对联盟中"
}
errors["playerInProtectStatus"] = {
	key:"playerInProtectStatus",
	code:659,
	message:"玩家处于保护状态"
}
errors["targetAllianceNotTheEnemyAlliance"] = {
	key:"targetAllianceNotTheEnemyAlliance",
	code:660,
	message:"目标联盟非当前匹配的敌对联盟"
}
errors["villageNotExist"] = {
	key:"villageNotExist",
	code:661,
	message:"村落不存在"
}
errors["villageCollectEventNotExist"] = {
	key:"villageCollectEventNotExist",
	code:662,
	message:"村落采集事件不存在"
}
errors["noHelpDefenceTroopByThePlayer"] = {
	key:"noHelpDefenceTroopByThePlayer",
	code:663,
	message:"没有此玩家的协防部队"
}
errors["theItemNotSellInAllianceShop"] = {
	key:"theItemNotSellInAllianceShop",
	code:664,
	message:"此道具未在联盟商店出售"
}
errors["normalItemsNotNeedToAdd"] = {
	key:"normalItemsNotNeedToAdd",
	code:665,
	message:"普通道具不需要进货补充"
}
errors["playerLevelNotEoughCanNotBuyAdvancedItem"] = {
	key:"playerLevelNotEoughCanNotBuyAdvancedItem",
	code:666,
	message:"玩家级别不足,不能购买高级道具"
}
errors["itemCountNotEnough"] = {
	key:"itemCountNotEnough",
	code:667,
	message:"道具数量不足"
}
errors["playerLoyaltyNotEnough"] = {
	key:"playerLoyaltyNotEnough",
	code:668,
	message:"玩家忠诚值不足"
}
errors["allianceEventNotExist"] = {
	key:"allianceEventNotExist",
	code:669,
	message:"联盟事件不存在"
}
errors["illegalAllianceStatus"] = {
	key:"illegalAllianceStatus",
	code:670,
	message:"非法的联盟状态"
}
errors["playerAlreadyBindGCAId"] = {
	key:"playerAlreadyBindGCAId",
	code:671,
	message:"玩家GameCenter账号已经绑定"
}
errors["theGCIdAlreadyBindedByOtherPlayer"] = {
	key:"theGCIdAlreadyBindedByOtherPlayer",
	code:672,
	message:"此GameCenter账号已被其他玩家绑定"
}
errors["theGCIdIsNotBindedByOtherPlayer"] = {
	key:"theGCIdIsNotBindedByOtherPlayer",
	code:673,
	message:"此GameCenter账号未被其他玩家绑定"
}
errors["thePlayerDoNotBindGCId"] = {
	key:"thePlayerDoNotBindGCId",
	code:674,
	message:"当前玩家还未绑定GameCenter账号"
}
errors["theGCIdAlreadyBindedByCurrentPlayer"] = {
	key:"theGCIdAlreadyBindedByCurrentPlayer",
	code:675,
	message:"此GameCenter账号已绑定当前玩家"
}
errors["apnIdAlreadySeted"] = {
	key:"apnIdAlreadySeted",
	code:676,
	message:"ApnId已经设置"
}
errors["theAllianceBuildingNotAllowMove"] = {
	key:"theAllianceBuildingNotAllowMove",
	code:677,
	message:"此联盟建筑不允许移动"
}
errors["theAllianceBuildingCanNotMoveToTargetPoint"] = {
	key:"theAllianceBuildingCanNotMoveToTargetPoint",
	code:678,
	message:"不能移动到目标点位"
}
errors["giftNotExist"] = {
	key:"giftNotExist",
	code:679,
	message:"礼品不存在"
}
errors["serverNotExist"] = {
	key:"serverNotExist",
	code:680,
	message:"服务器不存在"
}
errors["canNotSwitchToTheSameServer"] = {
	key:"canNotSwitchToTheSameServer",
	code:681,
	message:"不能切换到相同的服务器"
}
errors["playerNotInCurrentServer"] = {
	key:"playerNotInCurrentServer",
	code:682,
	message:"玩家未在当前服务器"
}
errors["noEventsNeedTobeSpeedup"] = {
	key:"noEventsNeedTobeSpeedup",
	code:683,
	message:"没有事件需要协助加速"
}
errors["allianceMemberCountReachMax"] = {
	key:"allianceMemberCountReachMax",
	code:684,
	message:"联盟人数已达最大"
}
errors["allianceFightWillEndCanNotSendTroops"] = {
	key:"allianceFightWillEndCanNotSendTroops",
	code:685,
	message:"联盟战即将结束,不能派兵"
}
