"use strict"

var type = {}
module.exports = type

type["gacha"] = {
	type:"gacha",
	desc:"游乐场赛季",
	existHours:1,
	expireHours:1,
	maxRank:100,
	scoreIndex1:5,
	scoreIndex2:25,
	scoreIndex3:50,
	scoreIndex4:75,
	scoreIndex5:100,
	scoreRewards1:"items:casinoTokenClass_1:1,items:sweepScroll:5",
	scoreRewards2:"items:chest_1:2,items:warSpeedupClass_1:2",
	scoreRewards3:"items:chest_2:1,items:masterOfDefender_1:1",
	scoreRewards4:"items:chest_3:1,items:marchSpeedBonus_2:1",
	scoreRewards5:"items:chest_4:1,items:troopSizeBonus_2:1",
	rankPoint1:1,
	rankPoint2:2,
	rankPoint3:3,
	rankPoint4:4,
	rankPoint5:11,
	rankPoint6:26,
	rankPoint7:51,
	rankPoint8:76,
	rankRewards1:"items:dragonChest_3:5,items:coinClass_6:1,items:vipPoint_2:1,items:vipActive_3:2,items:unitHpBonus_2:1,items:marchSpeedBonus_2:1,items:speedup_4:2,items:gemClass_3:2",
	rankRewards2:"items:dragonChest_3:3,items:coinClass_6:1,items:vipPoint_1:2,items:vipActive_3:2,items:dragonExp_1:5,items:stamina_2:5,items:gemClass_3:1",
	rankRewards3:"items:dragonChest_3:3,items:coinClass_5:2,items:vipPoint_1:2,items:vipActive_3:2,items:stamina_2:2,items:gemClass_2:5",
	rankRewards4:"items:dragonChest_2:5,items:coinClass_5:2,items:vipPoint_1:2,items:quarterMaster_2:1,items:gemClass_2:5",
	rankRewards5:"items:dragonChest_2:3,items:marchSpeedBonus_1:2,items:unitHpBonus_1:2,items:gemClass_2:2",
	rankRewards6:"items:dragonChest_2:2,items:vipPoint_1:2,items:gemClass_1:5",
	rankRewards7:"items:dragonChest_2:1,items:gemClass_1:5",
	rankRewards8:"items:marchSpeedBonus_1:1"
}
type["collectResource"] = {
	type:"collectResource",
	desc:"资源掠夺赛季",
	existHours:1,
	expireHours:1,
	maxRank:100,
	scoreIndex1:10000,
	scoreIndex2:50000,
	scoreIndex3:150000,
	scoreIndex4:500000,
	scoreIndex5:2000000,
	scoreRewards1:"items:gemClass_2:1,items:casinoTokenClass_1:1",
	scoreRewards2:"items:gemClass_2:1,items:casinoTokenClass_2:1",
	scoreRewards3:"items:gemClass_2:2,items:casinoTokenClass_2:2",
	scoreRewards4:"items:gemClass_2:2,items:casinoTokenClass_3:1",
	scoreRewards5:"items:gemClass_2:5,items:casinoTokenClass_3:2",
	rankPoint1:1,
	rankPoint2:2,
	rankPoint3:3,
	rankPoint4:4,
	rankPoint5:11,
	rankPoint6:26,
	rankPoint7:51,
	rankPoint8:76,
	rankRewards1:"items:dragonExp_3:1,items:chest_4:2,items:masterOfDefender_2:2,items:infantryAtkBonus_2:2,items:archerAtkBonus_2:2,items:cavalryAtkBonus_2:2,items:siegeAtkBonus_2:2,items:gemClass_3:2",
	rankRewards2:"items:dragonExp_3:1,items:chest_4:1,items:infantryAtkBonus_2:2,items:archerAtkBonus_2:2,items:cavalryAtkBonus_2:2,items:siegeAtkBonus_2:2,items:gemClass_3:1",
	rankRewards3:"items:dragonExp_2:2,items:chest_4:1,items:dragonHp_2:5,items:infantryAtkBonus_2:2,items:archerAtkBonus_2:2,items:gemClass_2:5",
	rankRewards4:"items:dragonExp_2:1,items:chest_3:2,items:infantryAtkBonus_2:1,items:archerAtkBonus_2:1,items:gemClass_2:5",
	rankRewards5:"items:dragonExp_2:1,items:chest_3:1,items:coinClass_5:1,items:gemClass_2:2",
	rankRewards6:"items:dragonExp_1:1,items:chest_3:2,items:gemClass_2:1",
	rankRewards7:"items:dragonExp_1:1,items:chest_2:1",
	rankRewards8:"items:chest_2:1"
}
type["pveFight"] = {
	type:"pveFight",
	desc:"冒险家赛季",
	existHours:1,
	expireHours:1,
	maxRank:100,
	scoreIndex1:50,
	scoreIndex2:100,
	scoreIndex3:200,
	scoreIndex4:800,
	scoreIndex5:1600,
	scoreRewards1:"items:gemClass_2:1,items:chest_1:2",
	scoreRewards2:"items:coinClass_5:1,items:speedup_4:2",
	scoreRewards3:"items:vipPoint_1:1,items:unitHpBonus_1:1",
	scoreRewards4:"items:dragonHp_2:1,items:troopSizeBonus_2:1",
	scoreRewards5:"items:chest_4:1,items:dragonExp_1:2",
	rankPoint1:1,
	rankPoint2:2,
	rankPoint3:3,
	rankPoint4:4,
	rankPoint5:11,
	rankPoint6:26,
	rankPoint7:51,
	rankPoint8:76,
	rankRewards1:"items:heroBlood_2:1,items:chest_4:2,items:troopSizeBonus_2:3,items:masterOfDefender_2:3,items:quarterMaster_2:3,items:fogOfTrick_2:3,items:coinClass_7:1,items:gemClass_3:2",
	rankRewards2:"items:heroBlood_2:1,items:chest_4:2,items:troopSizeBonus_2:1,items:masterOfDefender_2:1,items:quarterMaster_2:1,items:coinClass_6:2,items:gemClass_3:1",
	rankRewards3:"items:heroBlood_2:1,items:chest_4:1,items:troopSizeBonus_2:1,items:masterOfDefender_2:1,items:quarterMaster_2:1,items:gemClass_3:1",
	rankRewards4:"items:chest_4:1,items:troopSizeBonus_2:1,items:quarterMaster_2:1,items:speedup_2:20,items:gemClass_3:1",
	rankRewards5:"items:chest_3:1,items:quarterMaster_2:1,items:speedup_2:20,items:gemClass_2:5",
	rankRewards6:"items:chest_3:1,items:speedup_2:10,items:gemClass_2:2",
	rankRewards7:"items:retreatTroop:20,items:gemClass_2:2",
	rankRewards8:"items:gemClass_2:2"
}
type["attackMonster"] = {
	type:"attackMonster",
	desc:"黑龙军团赛季",
	existHours:1,
	expireHours:1,
	maxRank:100,
	scoreIndex1:25,
	scoreIndex2:75,
	scoreIndex3:150,
	scoreIndex4:450,
	scoreIndex5:900,
	scoreRewards1:"items:gemClass_2:1,items:vipActive_3:1",
	scoreRewards2:"items:moveTheCity:1,items:vipPoint_1:1",
	scoreRewards3:"items:chest_3:1,items:movingConstruction:5",
	scoreRewards4:"items:coinClass_5:2,items:warSpeedupClass_2:1",
	scoreRewards5:"items:heroBlood_1:2,items:gemClass_3:1",
	rankPoint1:1,
	rankPoint2:2,
	rankPoint3:3,
	rankPoint4:4,
	rankPoint5:11,
	rankPoint6:26,
	rankPoint7:51,
	rankPoint8:76,
	rankRewards1:"items:dragonExp_3:1,items:chest_4:2,items:masterOfDefender_2:2,items:infantryAtkBonus_2:2,items:archerAtkBonus_2:2,items:cavalryAtkBonus_2:2,items:siegeAtkBonus_2:2,items:gemClass_3:2",
	rankRewards2:"items:dragonExp_3:1,items:chest_4:1,items:infantryAtkBonus_2:2,items:archerAtkBonus_2:2,items:cavalryAtkBonus_2:2,items:siegeAtkBonus_2:2,items:gemClass_3:1",
	rankRewards3:"items:dragonExp_2:2,items:chest_4:1,items:dragonHp_2:1,items:infantryAtkBonus_2:2,items:archerAtkBonus_2:2,items:gemClass_2:5",
	rankRewards4:"items:dragonExp_2:1,items:chest_3:2,items:infantryAtkBonus_2:1,items:archerAtkBonus_2:1,items:gemClass_2:2",
	rankRewards5:"items:dragonExp_2:1,items:chest_3:1,items:coinClass_5:1,items:gemClass_2:1",
	rankRewards6:"items:dragonExp_1:1,items:chest_3:1,items:gemClass_2:1",
	rankRewards7:"items:dragonExp_1:1,items:chest_2:1",
	rankRewards8:"items:chest_2:1"
}
type["collectHeroBlood"] = {
	type:"collectHeroBlood",
	desc:"杀戮之王赛季",
	existHours:1,
	expireHours:1,
	maxRank:100,
	scoreIndex1:1000,
	scoreIndex2:3000,
	scoreIndex3:9000,
	scoreIndex4:30000,
	scoreIndex5:100000,
	scoreRewards1:"items:coinClass_4:1,items:sweepScroll:5",
	scoreRewards2:"items:coinClass_5:1,items:dragonHp_1:5",
	scoreRewards3:"items:coinClass_5:1,items:marchSpeedBonus_1:1",
	scoreRewards4:"items:coinClass_5:2,items:troopSizeBonus_1:1",
	scoreRewards5:"items:coinClass_6:1,items:gemClass_3:1",
	rankPoint1:1,
	rankPoint2:2,
	rankPoint3:3,
	rankPoint4:4,
	rankPoint5:11,
	rankPoint6:26,
	rankPoint7:51,
	rankPoint8:76,
	rankRewards1:"items:dragonChest_3:5,items:coinClass_6:1,items:vipPoint_2:1,items:vipActive_3:2,items:unitHpBonus_2:1,items:marchSpeedBonus_2:1,items:speedup_4:5,items:gemClass_3:2",
	rankRewards2:"items:dragonChest_3:3,items:coinClass_6:1,items:vipPoint_2:1,items:vipActive_3:3,items:dragonExp_1:5,items:stamina_2:5,items:gemClass_3:1",
	rankRewards3:"items:dragonChest_3:3,items:coinClass_5:2,items:vipPoint_2:1,items:vipActive_3:2,items:stamina_2:2,items:gemClass_2:5",
	rankRewards4:"items:dragonChest_2:5,items:coinClass_5:2,items:vipPoint_1:2,items:quarterMaster_2:1,items:gemClass_2:2",
	rankRewards5:"items:dragonChest_2:3,items:marchSpeedBonus_1:2,items:unitHpBonus_1:2,items:gemClass_2:1",
	rankRewards6:"items:dragonChest_2:2,items:vipPoint_1:1,items:gemClass_1:5",
	rankRewards7:"items:dragonChest_2:1,items:gemClass_1:5",
	rankRewards8:"items:marchSpeedBonus_1:1"
}
type["recruitSoldiers"] = {
	type:"recruitSoldiers",
	desc:"军备竞赛赛季",
	existHours:1,
	expireHours:1,
	maxRank:100,
	scoreIndex1:500,
	scoreIndex2:2500,
	scoreIndex3:10000,
	scoreIndex4:50000,
	scoreIndex5:100000,
	scoreRewards1:"items:casinoTokenClass_1:1,items:sweepScroll:5",
	scoreRewards2:"items:chest_1:2,items:speedup_2:30",
	scoreRewards3:"items:chest_2:1,items:speedup_2:50",
	scoreRewards4:"items:chest_3:1,items:speedup_3:20",
	scoreRewards5:"items:chest_4:1,items:speedup_4:5",
	rankPoint1:1,
	rankPoint2:2,
	rankPoint3:3,
	rankPoint4:4,
	rankPoint5:11,
	rankPoint6:26,
	rankPoint7:51,
	rankPoint8:76,
	rankRewards1:"items:heroBlood_2:1,items:chest_4:2,items:troopSizeBonus_2:3,items:masterOfDefender_2:3,items:quarterMaster_2:3,items:fogOfTrick_2:3,items:coinClass_7:1,items:gemClass_3:2",
	rankRewards2:"items:heroBlood_2:1,items:chest_4:2,items:troopSizeBonus_2:1,items:masterOfDefender_2:1,items:quarterMaster_2:1,items:coinClass_6:2,items:gemClass_3:1",
	rankRewards3:"items:heroBlood_2:1,items:chest_4:1,items:troopSizeBonus_2:1,items:masterOfDefender_2:1,items:quarterMaster_2:1,items:gemClass_3:1",
	rankRewards4:"items:chest_4:1,items:troopSizeBonus_2:1,items:quarterMaster_2:1,items:speedup_2:20,items:gemClass_3:1",
	rankRewards5:"items:chest_3:1,items:quarterMaster_2:1,items:speedup_2:20,items:gemClass_2:5",
	rankRewards6:"items:chest_3:1,items:speedup_2:10,items:gemClass_2:2",
	rankRewards7:"items:retreatTroop:20,items:gemClass_2:2",
	rankRewards8:"items:gemClass_2:2"
}
