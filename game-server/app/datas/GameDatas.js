"use strict"

var GameDatas = {}
module.exports = GameDatas

GameDatas.AllianceBuilding = {}
GameDatas.AllianceBuilding.palace = require("./AllianceBuilding_palace.js")
GameDatas.AllianceBuilding.moonGate = require("./AllianceBuilding_moonGate.js")
GameDatas.AllianceBuilding.orderHall = require("./AllianceBuilding_orderHall.js")
GameDatas.AllianceBuilding.shrine = require("./AllianceBuilding_shrine.js")
GameDatas.AllianceBuilding.shop = require("./AllianceBuilding_shop.js")

GameDatas.AllianceInitData = {}
GameDatas.AllianceInitData.intInit = require("./AllianceInitData_intInit.js")
GameDatas.AllianceInitData.floatInit = require("./AllianceInitData_floatInit.js")
GameDatas.AllianceInitData.stringInit = require("./AllianceInitData_stringInit.js")
GameDatas.AllianceInitData.right = require("./AllianceInitData_right.js")
GameDatas.AllianceInitData.buildingType = require("./AllianceInitData_buildingType.js")
GameDatas.AllianceInitData.donate = require("./AllianceInitData_donate.js")
GameDatas.AllianceInitData.decorateCount = require("./AllianceInitData_decorateCount.js")

GameDatas.AllianceShrine = {}
GameDatas.AllianceShrine.shrineStage = require("./AllianceShrine_shrineStage.js")

GameDatas.AllianceVillage = {}
GameDatas.AllianceVillage.woodVillage = require("./AllianceVillage_woodVillage.js")
GameDatas.AllianceVillage.foodVillage = require("./AllianceVillage_foodVillage.js")
GameDatas.AllianceVillage.stoneVillage = require("./AllianceVillage_stoneVillage.js")
GameDatas.AllianceVillage.ironVillage = require("./AllianceVillage_ironVillage.js")
GameDatas.AllianceVillage.coinVillage = require("./AllianceVillage_coinVillage.js")
GameDatas.AllianceVillage.gemVillage = require("./AllianceVillage_gemVillage.js")

GameDatas.BuildingFunction = {}
GameDatas.BuildingFunction.wall = require("./BuildingFunction_wall.js")
GameDatas.BuildingFunction.tower = require("./BuildingFunction_tower.js")
GameDatas.BuildingFunction.keep = require("./BuildingFunction_keep.js")
GameDatas.BuildingFunction.watchTower = require("./BuildingFunction_watchTower.js")
GameDatas.BuildingFunction.dragonEyrie = require("./BuildingFunction_dragonEyrie.js")
GameDatas.BuildingFunction.warehouse = require("./BuildingFunction_warehouse.js")
GameDatas.BuildingFunction.barracks = require("./BuildingFunction_barracks.js")
GameDatas.BuildingFunction.armyCamp = require("./BuildingFunction_armyCamp.js")
GameDatas.BuildingFunction.blackSmith = require("./BuildingFunction_blackSmith.js")
GameDatas.BuildingFunction.materialDepot = require("./BuildingFunction_materialDepot.js")
GameDatas.BuildingFunction.toolShop = require("./BuildingFunction_toolShop.js")
GameDatas.BuildingFunction.lumbermill = require("./BuildingFunction_lumbermill.js")
GameDatas.BuildingFunction.stoneMason = require("./BuildingFunction_stoneMason.js")
GameDatas.BuildingFunction.foundry = require("./BuildingFunction_foundry.js")
GameDatas.BuildingFunction.mill = require("./BuildingFunction_mill.js")
GameDatas.BuildingFunction.townHall = require("./BuildingFunction_townHall.js")
GameDatas.BuildingFunction.acdemy = require("./BuildingFunction_acdemy.js")
GameDatas.BuildingFunction.hospital = require("./BuildingFunction_hospital.js")
GameDatas.BuildingFunction.tradeGuild = require("./BuildingFunction_tradeGuild.js")
GameDatas.BuildingFunction.prison = require("./BuildingFunction_prison.js")
GameDatas.BuildingFunction.trainingGround = require("./BuildingFunction_trainingGround.js")
GameDatas.BuildingFunction.hunterhall = require("./BuildingFunction_hunterhall.js")
GameDatas.BuildingFunction.stable = require("./BuildingFunction_stable.js")
GameDatas.BuildingFunction.workshop = require("./BuildingFunction_workshop.js")

GameDatas.BuildingLevelUp = {}
GameDatas.BuildingLevelUp.wall = require("./BuildingLevelUp_wall.js")
GameDatas.BuildingLevelUp.tower = require("./BuildingLevelUp_tower.js")
GameDatas.BuildingLevelUp.keep = require("./BuildingLevelUp_keep.js")
GameDatas.BuildingLevelUp.watchTower = require("./BuildingLevelUp_watchTower.js")
GameDatas.BuildingLevelUp.dragonEyrie = require("./BuildingLevelUp_dragonEyrie.js")
GameDatas.BuildingLevelUp.warehouse = require("./BuildingLevelUp_warehouse.js")
GameDatas.BuildingLevelUp.barracks = require("./BuildingLevelUp_barracks.js")
GameDatas.BuildingLevelUp.armyCamp = require("./BuildingLevelUp_armyCamp.js")
GameDatas.BuildingLevelUp.blackSmith = require("./BuildingLevelUp_blackSmith.js")
GameDatas.BuildingLevelUp.materialDepot = require("./BuildingLevelUp_materialDepot.js")
GameDatas.BuildingLevelUp.toolShop = require("./BuildingLevelUp_toolShop.js")
GameDatas.BuildingLevelUp.lumbermill = require("./BuildingLevelUp_lumbermill.js")
GameDatas.BuildingLevelUp.stoneMason = require("./BuildingLevelUp_stoneMason.js")
GameDatas.BuildingLevelUp.foundry = require("./BuildingLevelUp_foundry.js")
GameDatas.BuildingLevelUp.mill = require("./BuildingLevelUp_mill.js")
GameDatas.BuildingLevelUp.townHall = require("./BuildingLevelUp_townHall.js")
GameDatas.BuildingLevelUp.acdemy = require("./BuildingLevelUp_acdemy.js")
GameDatas.BuildingLevelUp.hospital = require("./BuildingLevelUp_hospital.js")
GameDatas.BuildingLevelUp.tradeGuild = require("./BuildingLevelUp_tradeGuild.js")
GameDatas.BuildingLevelUp.prison = require("./BuildingLevelUp_prison.js")
GameDatas.BuildingLevelUp.trainingGround = require("./BuildingLevelUp_trainingGround.js")
GameDatas.BuildingLevelUp.hunterhall = require("./BuildingLevelUp_hunterhall.js")
GameDatas.BuildingLevelUp.stable = require("./BuildingLevelUp_stable.js")
GameDatas.BuildingLevelUp.workshop = require("./BuildingLevelUp_workshop.js")

GameDatas.Buildings = {}
GameDatas.Buildings.buildings = require("./Buildings_buildings.js")

GameDatas.DragonEyrie = {}
GameDatas.DragonEyrie.crown = require("./DragonEyrie_crown.js")
GameDatas.DragonEyrie.armguardLeft = require("./DragonEyrie_armguardLeft.js")
GameDatas.DragonEyrie.armguardRight = require("./DragonEyrie_armguardRight.js")
GameDatas.DragonEyrie.chest = require("./DragonEyrie_chest.js")
GameDatas.DragonEyrie.sting = require("./DragonEyrie_sting.js")
GameDatas.DragonEyrie.orb = require("./DragonEyrie_orb.js")
GameDatas.DragonEyrie.equipmentBuff = require("./DragonEyrie_equipmentBuff.js")
GameDatas.DragonEyrie.dragonAttribute = require("./DragonEyrie_dragonAttribute.js")
GameDatas.DragonEyrie.dragons = require("./DragonEyrie_dragons.js")
GameDatas.DragonEyrie.dragonSkill = require("./DragonEyrie_dragonSkill.js")
GameDatas.DragonEyrie.fightFix = require("./DragonEyrie_fightFix.js")

GameDatas.GemsPayment = {}
GameDatas.GemsPayment.time = require("./GemsPayment_time.js")
GameDatas.GemsPayment.wood = require("./GemsPayment_wood.js")
GameDatas.GemsPayment.stone = require("./GemsPayment_stone.js")
GameDatas.GemsPayment.iron = require("./GemsPayment_iron.js")
GameDatas.GemsPayment.food = require("./GemsPayment_food.js")
GameDatas.GemsPayment.coin = require("./GemsPayment_coin.js")
GameDatas.GemsPayment.citizen = require("./GemsPayment_citizen.js")
GameDatas.GemsPayment.material = require("./GemsPayment_material.js")

GameDatas.HouseFunction = {}
GameDatas.HouseFunction.dwelling = require("./HouseFunction_dwelling.js")
GameDatas.HouseFunction.woodcutter = require("./HouseFunction_woodcutter.js")
GameDatas.HouseFunction.quarrier = require("./HouseFunction_quarrier.js")
GameDatas.HouseFunction.miner = require("./HouseFunction_miner.js")
GameDatas.HouseFunction.farmer = require("./HouseFunction_farmer.js")

GameDatas.HouseLevelUp = {}
GameDatas.HouseLevelUp.dwelling = require("./HouseLevelUp_dwelling.js")
GameDatas.HouseLevelUp.woodcutter = require("./HouseLevelUp_woodcutter.js")
GameDatas.HouseLevelUp.farmer = require("./HouseLevelUp_farmer.js")
GameDatas.HouseLevelUp.quarrier = require("./HouseLevelUp_quarrier.js")
GameDatas.HouseLevelUp.miner = require("./HouseLevelUp_miner.js")

GameDatas.HouseReturn = {}
GameDatas.HouseReturn.dwelling = require("./HouseReturn_dwelling.js")
GameDatas.HouseReturn.woodcutter = require("./HouseReturn_woodcutter.js")
GameDatas.HouseReturn.quarrier = require("./HouseReturn_quarrier.js")
GameDatas.HouseReturn.miner = require("./HouseReturn_miner.js")
GameDatas.HouseReturn.farmer = require("./HouseReturn_farmer.js")

GameDatas.Houses = {}
GameDatas.Houses.houses = require("./Houses_houses.js")

GameDatas.PlayerInitData = {}
GameDatas.PlayerInitData.resources = require("./PlayerInitData_resources.js")
GameDatas.PlayerInitData.materials = require("./PlayerInitData_materials.js")
GameDatas.PlayerInitData.soldierMaterials = require("./PlayerInitData_soldierMaterials.js")
GameDatas.PlayerInitData.dragonMaterials = require("./PlayerInitData_dragonMaterials.js")
GameDatas.PlayerInitData.houses = require("./PlayerInitData_houses.js")
GameDatas.PlayerInitData.playerLevel = require("./PlayerInitData_playerLevel.js")
GameDatas.PlayerInitData.vipLevel = require("./PlayerInitData_vipLevel.js")

GameDatas.PlayerVillageExp = {}
GameDatas.PlayerVillageExp.exp = require("./PlayerVillageExp_exp.js")
GameDatas.PlayerVillageExp.wood = require("./PlayerVillageExp_wood.js")
GameDatas.PlayerVillageExp.stone = require("./PlayerVillageExp_stone.js")
GameDatas.PlayerVillageExp.iron = require("./PlayerVillageExp_iron.js")
GameDatas.PlayerVillageExp.food = require("./PlayerVillageExp_food.js")
GameDatas.PlayerVillageExp.coin = require("./PlayerVillageExp_coin.js")

GameDatas.SmithConfig = {}
GameDatas.SmithConfig.equipments = require("./SmithConfig_equipments.js")

GameDatas.UnitsConfig = {}
GameDatas.UnitsConfig.normal = require("./UnitsConfig_normal.js")
GameDatas.UnitsConfig.special = require("./UnitsConfig_special.js")