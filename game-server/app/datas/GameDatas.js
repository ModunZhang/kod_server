"use strict"

var GameDatas = {}
module.exports = GameDatas

GameDatas.Activities = {}
GameDatas.Activities.day60 = require("./Activities_day60.js")
GameDatas.Activities.online = require("./Activities_online.js")
GameDatas.Activities.day14 = require("./Activities_day14.js")
GameDatas.Activities.levelup = require("./Activities_levelup.js")

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
GameDatas.BuildingFunction.keep = require("./BuildingFunction_keep.js")
GameDatas.BuildingFunction.watchTower = require("./BuildingFunction_watchTower.js")
GameDatas.BuildingFunction.warehouse = require("./BuildingFunction_warehouse.js")
GameDatas.BuildingFunction.dragonEyrie = require("./BuildingFunction_dragonEyrie.js")
GameDatas.BuildingFunction.barracks = require("./BuildingFunction_barracks.js")
GameDatas.BuildingFunction.hospital = require("./BuildingFunction_hospital.js")
GameDatas.BuildingFunction.academy = require("./BuildingFunction_academy.js")
GameDatas.BuildingFunction.materialDepot = require("./BuildingFunction_materialDepot.js")
GameDatas.BuildingFunction.blackSmith = require("./BuildingFunction_blackSmith.js")
GameDatas.BuildingFunction.foundry = require("./BuildingFunction_foundry.js")
GameDatas.BuildingFunction.stoneMason = require("./BuildingFunction_stoneMason.js")
GameDatas.BuildingFunction.lumbermill = require("./BuildingFunction_lumbermill.js")
GameDatas.BuildingFunction.mill = require("./BuildingFunction_mill.js")
GameDatas.BuildingFunction.townHall = require("./BuildingFunction_townHall.js")
GameDatas.BuildingFunction.toolShop = require("./BuildingFunction_toolShop.js")
GameDatas.BuildingFunction.tradeGuild = require("./BuildingFunction_tradeGuild.js")
GameDatas.BuildingFunction.workshop = require("./BuildingFunction_workshop.js")
GameDatas.BuildingFunction.trainingGround = require("./BuildingFunction_trainingGround.js")
GameDatas.BuildingFunction.hunterHall = require("./BuildingFunction_hunterHall.js")
GameDatas.BuildingFunction.stable = require("./BuildingFunction_stable.js")
GameDatas.BuildingFunction.wall = require("./BuildingFunction_wall.js")
GameDatas.BuildingFunction.tower = require("./BuildingFunction_tower.js")

GameDatas.BuildingLevelUp = {}
GameDatas.BuildingLevelUp.keep = require("./BuildingLevelUp_keep.js")
GameDatas.BuildingLevelUp.watchTower = require("./BuildingLevelUp_watchTower.js")
GameDatas.BuildingLevelUp.warehouse = require("./BuildingLevelUp_warehouse.js")
GameDatas.BuildingLevelUp.dragonEyrie = require("./BuildingLevelUp_dragonEyrie.js")
GameDatas.BuildingLevelUp.barracks = require("./BuildingLevelUp_barracks.js")
GameDatas.BuildingLevelUp.hospital = require("./BuildingLevelUp_hospital.js")
GameDatas.BuildingLevelUp.academy = require("./BuildingLevelUp_academy.js")
GameDatas.BuildingLevelUp.materialDepot = require("./BuildingLevelUp_materialDepot.js")
GameDatas.BuildingLevelUp.blackSmith = require("./BuildingLevelUp_blackSmith.js")
GameDatas.BuildingLevelUp.foundry = require("./BuildingLevelUp_foundry.js")
GameDatas.BuildingLevelUp.stoneMason = require("./BuildingLevelUp_stoneMason.js")
GameDatas.BuildingLevelUp.lumbermill = require("./BuildingLevelUp_lumbermill.js")
GameDatas.BuildingLevelUp.mill = require("./BuildingLevelUp_mill.js")
GameDatas.BuildingLevelUp.townHall = require("./BuildingLevelUp_townHall.js")
GameDatas.BuildingLevelUp.toolShop = require("./BuildingLevelUp_toolShop.js")
GameDatas.BuildingLevelUp.tradeGuild = require("./BuildingLevelUp_tradeGuild.js")
GameDatas.BuildingLevelUp.workshop = require("./BuildingLevelUp_workshop.js")
GameDatas.BuildingLevelUp.trainingGround = require("./BuildingLevelUp_trainingGround.js")
GameDatas.BuildingLevelUp.hunterHall = require("./BuildingLevelUp_hunterHall.js")
GameDatas.BuildingLevelUp.stable = require("./BuildingLevelUp_stable.js")
GameDatas.BuildingLevelUp.wall = require("./BuildingLevelUp_wall.js")
GameDatas.BuildingLevelUp.tower = require("./BuildingLevelUp_tower.js")

GameDatas.Buildings = {}
GameDatas.Buildings.buildings = require("./Buildings_buildings.js")

GameDatas.DailyQuests = {}
GameDatas.DailyQuests.dailyQuests = require("./DailyQuests_dailyQuests.js")
GameDatas.DailyQuests.dailyQuestStar = require("./DailyQuests_dailyQuestStar.js")
GameDatas.DailyQuests.dailyQuestStyle = require("./DailyQuests_dailyQuestStyle.js")

GameDatas.DragonEquipments = {}
GameDatas.DragonEquipments.equipments = require("./DragonEquipments_equipments.js")
GameDatas.DragonEquipments.equipmentBuff = require("./DragonEquipments_equipmentBuff.js")
GameDatas.DragonEquipments.crown = require("./DragonEquipments_crown.js")
GameDatas.DragonEquipments.armguardLeft = require("./DragonEquipments_armguardLeft.js")
GameDatas.DragonEquipments.armguardRight = require("./DragonEquipments_armguardRight.js")
GameDatas.DragonEquipments.chest = require("./DragonEquipments_chest.js")
GameDatas.DragonEquipments.sting = require("./DragonEquipments_sting.js")
GameDatas.DragonEquipments.orb = require("./DragonEquipments_orb.js")

GameDatas.Dragons = {}
GameDatas.Dragons.dragons = require("./Dragons_dragons.js")
GameDatas.Dragons.dragonAttributes = require("./Dragons_dragonAttributes.js")
GameDatas.Dragons.dragonSkills = require("./Dragons_dragonSkills.js")
GameDatas.Dragons.fightFix = require("./Dragons_fightFix.js")

GameDatas.Errors = {}
GameDatas.Errors.errors = require("./Errors_errors.js")

GameDatas.Gacha = {}
GameDatas.Gacha.normal = require("./Gacha_normal.js")
GameDatas.Gacha.advanced = require("./Gacha_advanced.js")

GameDatas.GemsPayment = {}
GameDatas.GemsPayment.time = require("./GemsPayment_time.js")
GameDatas.GemsPayment.wood = require("./GemsPayment_wood.js")
GameDatas.GemsPayment.stone = require("./GemsPayment_stone.js")
GameDatas.GemsPayment.iron = require("./GemsPayment_iron.js")
GameDatas.GemsPayment.food = require("./GemsPayment_food.js")
GameDatas.GemsPayment.coin = require("./GemsPayment_coin.js")
GameDatas.GemsPayment.citizen = require("./GemsPayment_citizen.js")
GameDatas.GemsPayment.material = require("./GemsPayment_material.js")

GameDatas.GrowUpTasks = {}
GameDatas.GrowUpTasks.cityBuild = require("./GrowUpTasks_cityBuild.js")
GameDatas.GrowUpTasks.dragonLevel = require("./GrowUpTasks_dragonLevel.js")
GameDatas.GrowUpTasks.dragonStar = require("./GrowUpTasks_dragonStar.js")
GameDatas.GrowUpTasks.dragonSkill = require("./GrowUpTasks_dragonSkill.js")
GameDatas.GrowUpTasks.productionTech = require("./GrowUpTasks_productionTech.js")
GameDatas.GrowUpTasks.militaryTech = require("./GrowUpTasks_militaryTech.js")
GameDatas.GrowUpTasks.soldierStar = require("./GrowUpTasks_soldierStar.js")
GameDatas.GrowUpTasks.soldierCount = require("./GrowUpTasks_soldierCount.js")
GameDatas.GrowUpTasks.pveCount = require("./GrowUpTasks_pveCount.js")
GameDatas.GrowUpTasks.attackWin = require("./GrowUpTasks_attackWin.js")
GameDatas.GrowUpTasks.strikeWin = require("./GrowUpTasks_strikeWin.js")
GameDatas.GrowUpTasks.playerKill = require("./GrowUpTasks_playerKill.js")
GameDatas.GrowUpTasks.playerPower = require("./GrowUpTasks_playerPower.js")

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

GameDatas.Items = {}
GameDatas.Items.special = require("./Items_special.js")
GameDatas.Items.buff = require("./Items_buff.js")
GameDatas.Items.resource = require("./Items_resource.js")
GameDatas.Items.speedup = require("./Items_speedup.js")
GameDatas.Items.buffTypes = require("./Items_buffTypes.js")

GameDatas.KillDropItems = {}
GameDatas.KillDropItems.grassLand = require("./KillDropItems_grassLand.js")
GameDatas.KillDropItems.desert = require("./KillDropItems_desert.js")
GameDatas.KillDropItems.iceField = require("./KillDropItems_iceField.js")

GameDatas.MilitaryTechLevelUp = {}
GameDatas.MilitaryTechLevelUp.infantry_infantry = require("./MilitaryTechLevelUp_infantry_infantry.js")
GameDatas.MilitaryTechLevelUp.infantry_archer = require("./MilitaryTechLevelUp_infantry_archer.js")
GameDatas.MilitaryTechLevelUp.infantry_cavalry = require("./MilitaryTechLevelUp_infantry_cavalry.js")
GameDatas.MilitaryTechLevelUp.infantry_siege = require("./MilitaryTechLevelUp_infantry_siege.js")
GameDatas.MilitaryTechLevelUp.archer_infantry = require("./MilitaryTechLevelUp_archer_infantry.js")
GameDatas.MilitaryTechLevelUp.archer_archer = require("./MilitaryTechLevelUp_archer_archer.js")
GameDatas.MilitaryTechLevelUp.archer_cavalry = require("./MilitaryTechLevelUp_archer_cavalry.js")
GameDatas.MilitaryTechLevelUp.archer_siege = require("./MilitaryTechLevelUp_archer_siege.js")
GameDatas.MilitaryTechLevelUp.cavalry_infantry = require("./MilitaryTechLevelUp_cavalry_infantry.js")
GameDatas.MilitaryTechLevelUp.cavalry_archer = require("./MilitaryTechLevelUp_cavalry_archer.js")
GameDatas.MilitaryTechLevelUp.cavalry_cavalry = require("./MilitaryTechLevelUp_cavalry_cavalry.js")
GameDatas.MilitaryTechLevelUp.cavalry_siege = require("./MilitaryTechLevelUp_cavalry_siege.js")
GameDatas.MilitaryTechLevelUp.siege_infantry = require("./MilitaryTechLevelUp_siege_infantry.js")
GameDatas.MilitaryTechLevelUp.siege_archer = require("./MilitaryTechLevelUp_siege_archer.js")
GameDatas.MilitaryTechLevelUp.siege_cavalry = require("./MilitaryTechLevelUp_siege_cavalry.js")
GameDatas.MilitaryTechLevelUp.siege_siege = require("./MilitaryTechLevelUp_siege_siege.js")

GameDatas.MilitaryTechs = {}
GameDatas.MilitaryTechs.militaryTechs = require("./MilitaryTechs_militaryTechs.js")

GameDatas.PlayerInitData = {}
GameDatas.PlayerInitData.intInit = require("./PlayerInitData_intInit.js")
GameDatas.PlayerInitData.floatInit = require("./PlayerInitData_floatInit.js")
GameDatas.PlayerInitData.stringInit = require("./PlayerInitData_stringInit.js")
GameDatas.PlayerInitData.resources = require("./PlayerInitData_resources.js")
GameDatas.PlayerInitData.materials = require("./PlayerInitData_materials.js")
GameDatas.PlayerInitData.soldierMaterials = require("./PlayerInitData_soldierMaterials.js")
GameDatas.PlayerInitData.dragonMaterials = require("./PlayerInitData_dragonMaterials.js")
GameDatas.PlayerInitData.houses = require("./PlayerInitData_houses.js")
GameDatas.PlayerInitData.playerLevel = require("./PlayerInitData_playerLevel.js")
GameDatas.PlayerInitData.collectLevel = require("./PlayerInitData_collectLevel.js")

GameDatas.PlayerVillageExp = {}
GameDatas.PlayerVillageExp.exp = require("./PlayerVillageExp_exp.js")
GameDatas.PlayerVillageExp.wood = require("./PlayerVillageExp_wood.js")
GameDatas.PlayerVillageExp.stone = require("./PlayerVillageExp_stone.js")
GameDatas.PlayerVillageExp.iron = require("./PlayerVillageExp_iron.js")
GameDatas.PlayerVillageExp.food = require("./PlayerVillageExp_food.js")
GameDatas.PlayerVillageExp.coin = require("./PlayerVillageExp_coin.js")

GameDatas.ProductionTechLevelUp = {}
GameDatas.ProductionTechLevelUp.crane = require("./ProductionTechLevelUp_crane.js")
GameDatas.ProductionTechLevelUp.stoneCarving = require("./ProductionTechLevelUp_stoneCarving.js")
GameDatas.ProductionTechLevelUp.forestation = require("./ProductionTechLevelUp_forestation.js")
GameDatas.ProductionTechLevelUp.fastFix = require("./ProductionTechLevelUp_fastFix.js")
GameDatas.ProductionTechLevelUp.ironSmelting = require("./ProductionTechLevelUp_ironSmelting.js")
GameDatas.ProductionTechLevelUp.cropResearch = require("./ProductionTechLevelUp_cropResearch.js")
GameDatas.ProductionTechLevelUp.reinforcing = require("./ProductionTechLevelUp_reinforcing.js")
GameDatas.ProductionTechLevelUp.seniorTower = require("./ProductionTechLevelUp_seniorTower.js")
GameDatas.ProductionTechLevelUp.beerSupply = require("./ProductionTechLevelUp_beerSupply.js")
GameDatas.ProductionTechLevelUp.rescueTent = require("./ProductionTechLevelUp_rescueTent.js")
GameDatas.ProductionTechLevelUp.colonization = require("./ProductionTechLevelUp_colonization.js")
GameDatas.ProductionTechLevelUp.negotiation = require("./ProductionTechLevelUp_negotiation.js")
GameDatas.ProductionTechLevelUp.trap = require("./ProductionTechLevelUp_trap.js")
GameDatas.ProductionTechLevelUp.hideout = require("./ProductionTechLevelUp_hideout.js")
GameDatas.ProductionTechLevelUp.logistics = require("./ProductionTechLevelUp_logistics.js")
GameDatas.ProductionTechLevelUp.healingAgent = require("./ProductionTechLevelUp_healingAgent.js")
GameDatas.ProductionTechLevelUp.sketching = require("./ProductionTechLevelUp_sketching.js")
GameDatas.ProductionTechLevelUp.mintedCoin = require("./ProductionTechLevelUp_mintedCoin.js")

GameDatas.ProductionTechs = {}
GameDatas.ProductionTechs.productionTechs = require("./ProductionTechs_productionTechs.js")

GameDatas.Soldiers = {}
GameDatas.Soldiers.normal = require("./Soldiers_normal.js")
GameDatas.Soldiers.special = require("./Soldiers_special.js")

GameDatas.StoreItems = {}
GameDatas.StoreItems.items = require("./StoreItems_items.js")

GameDatas.Vip = {}
GameDatas.Vip.level = require("./Vip_level.js")
GameDatas.Vip.loginDays = require("./Vip_loginDays.js")