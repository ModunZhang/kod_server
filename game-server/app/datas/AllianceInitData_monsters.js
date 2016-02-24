"use strict"

var monsters = []
module.exports = monsters

monsters[1] = {
	level:1,
	dragon:"blackDragon:1:1",
	soldiers:"crossbowman_2:1:10,ballista_2:1:4,swordsman_2:1:5;sentinel_2:1:10,lancer_2:1:4,horseArcher_2:1:3;horseArcher_2:1:5,catapult_2:1:4,sentinel_2:1:5",
	rewards:"items:woodClass_1:2:2,items:stoneClass_1:2:2,items:ironClass_1:2:2,items:foodClass_1:2:2,items:coinClass_1:2:1,items:gemClass_1:1:1,buildingMaterials:blueprints:1:25,buildingMaterials:tools:1:25,buildingMaterials:tiles:1:25,buildingMaterials:pulley:1:25"
}
monsters[2] = {
	level:2,
	dragon:"blackDragon:1:2",
	soldiers:"crossbowman_2:1:20,ballista_2:1:8,swordsman_2:1:10;sentinel_2:1:20,lancer_2:1:8,horseArcher_2:1:5;horseArcher_2:1:10,catapult_2:1:8,sentinel_2:1:10",
	rewards:"items:woodClass_1:5:2,items:stoneClass_1:5:2,items:ironClass_1:5:2,items:foodClass_1:5:2,items:coinClass_1:5:1,items:gemClass_1:2:1,buildingMaterials:blueprints:2:25,buildingMaterials:tools:2:25,buildingMaterials:tiles:2:25,buildingMaterials:pulley:2:25"
}
monsters[3] = {
	level:3,
	dragon:"blackDragon:1:3",
	soldiers:"crossbowman_2:1:30,ballista_2:1:12,swordsman_2:1:15;sentinel_2:1:30,lancer_2:1:12,horseArcher_2:1:8;horseArcher_2:1:15,catapult_2:1:12,sentinel_2:1:15",
	rewards:"items:woodClass_1:10:2,items:stoneClass_1:10:2,items:ironClass_1:10:2,items:foodClass_1:10:2,items:coinClass_1:10:1,items:gemClass_1:3:1,buildingMaterials:blueprints:3:25,buildingMaterials:tools:3:25,buildingMaterials:tiles:3:25,buildingMaterials:pulley:3:25"
}
monsters[4] = {
	level:4,
	dragon:"blackDragon:1:4",
	soldiers:"swordsman_2:1:40,crossbowman_2:1:30,ballista_2:1:10;lancer_2:1:20,horseArcher_2:1:15,swordsman_2:1:20;catapult_2:1:20,ballista_2:1:15,lancer_2:1:10",
	rewards:"items:woodClass_1:15:2,items:stoneClass_1:15:2,items:ironClass_1:15:2,items:foodClass_1:15:2,items:coinClass_1:15:1,items:gemClass_1:4:1,buildingMaterials:blueprints:4:25,buildingMaterials:tools:4:25,buildingMaterials:tiles:4:25,buildingMaterials:pulley:4:25"
}
monsters[5] = {
	level:5,
	dragon:"blackDragon:1:5",
	soldiers:"swordsman_2:1:50,crossbowman_2:1:38,ballista_2:1:13;lancer_2:1:25,horseArcher_2:1:19,swordsman_2:1:25;catapult_2:1:25,ballista_2:1:19,lancer_2:1:13",
	rewards:"items:woodClass_2:1:2,items:stoneClass_2:1:2,items:ironClass_2:1:2,items:foodClass_2:1:2,items:coinClass_2:1:1,items:gemClass_1:5:1,buildingMaterials:blueprints:5:25,buildingMaterials:tools:5:25,buildingMaterials:tiles:5:25,buildingMaterials:pulley:5:25"
}
monsters[6] = {
	level:6,
	dragon:"blackDragon:1:6",
	soldiers:"swordsman_2:1:80,crossbowman_2:1:60,ballista_2:1:20;lancer_2:1:40,horseArcher_2:1:30,swordsman_2:1:40;catapult_2:1:40,ballista_2:1:30,lancer_2:1:20",
	rewards:"items:woodClass_2:2:2,items:stoneClass_2:2:2,items:ironClass_2:2:2,items:foodClass_2:2:2,items:coinClass_2:2:1,items:gemClass_1:6:1,buildingMaterials:blueprints:6:25,buildingMaterials:tools:6:25,buildingMaterials:tiles:6:25,buildingMaterials:pulley:6:25"
}
monsters[7] = {
	level:7,
	dragon:"blackDragon:1:7",
	soldiers:"sentinel_2:1:100,swordsman_2:1:75,crossbowman_2:1:50;horseArcher_2:1:50,swordsman_2:1:75,catapult_2:1:25;ballista_2:1:50,lancer_2:1:38,horseArcher_2:1:25",
	rewards:"items:woodClass_2:3:2,items:stoneClass_2:3:2,items:ironClass_2:3:2,items:foodClass_2:3:2,items:coinClass_2:3:1,items:gemClass_1:7:1,buildingMaterials:blueprints:7:25,buildingMaterials:tools:7:25,buildingMaterials:tiles:7:25,buildingMaterials:pulley:7:25"
}
monsters[8] = {
	level:8,
	dragon:"blackDragon:1:8",
	soldiers:"sentinel_2:1:120,swordsman_2:1:90,crossbowman_2:1:60;horseArcher_2:1:60,swordsman_2:1:90,catapult_2:1:30;ballista_2:1:60,lancer_2:1:45,horseArcher_2:1:30",
	rewards:"items:woodClass_2:4:2,items:stoneClass_2:4:2,items:ironClass_2:4:2,items:foodClass_2:4:2,items:coinClass_2:4:1,items:gemClass_1:8:1,buildingMaterials:blueprints:8:25,buildingMaterials:tools:8:25,buildingMaterials:tiles:8:25,buildingMaterials:pulley:8:25"
}
monsters[9] = {
	level:9,
	dragon:"blackDragon:1:9",
	soldiers:"sentinel_2:1:150,swordsman_2:1:113,crossbowman_2:1:75;horseArcher_2:1:75,swordsman_2:1:113,catapult_2:1:38;ballista_2:1:75,lancer_2:1:57,horseArcher_2:1:38",
	rewards:"items:woodClass_2:5:2,items:stoneClass_2:5:2,items:ironClass_2:5:2,items:foodClass_2:5:2,items:coinClass_2:5:1,items:gemClass_1:9:1,buildingMaterials:blueprints:9:25,buildingMaterials:tools:9:25,buildingMaterials:tiles:9:25,buildingMaterials:pulley:9:25"
}
monsters[10] = {
	level:10,
	dragon:"blackDragon:1:10",
	soldiers:"ranger_2:1:190,sentinel_2:1:143,swordsman_2:1:95;swordsman_2:1:190,catapult_2:1:72,ballista_2:1:48;lancer_2:1:95,ranger_2:1:143,swordsman_2:1:95",
	rewards:"items:woodClass_2:6:2,items:stoneClass_2:6:2,items:ironClass_2:6:2,items:foodClass_2:6:2,items:coinClass_2:6:1,items:gemClass_2:1:1,buildingMaterials:blueprints:10:25,buildingMaterials:tools:10:25,buildingMaterials:tiles:10:25,buildingMaterials:pulley:10:25"
}
monsters[11] = {
	level:11,
	dragon:"blackDragon:2:11",
	soldiers:"ranger_2:1:230,sentinel_2:1:173,swordsman_2:1:115;swordsman_2:1:230,catapult_2:1:87,ballista_2:1:58;lancer_2:1:115,ranger_2:1:173,swordsman_2:1:115",
	rewards:"items:woodClass_2:7:2,items:stoneClass_2:7:2,items:ironClass_2:7:2,items:foodClass_2:7:2,items:coinClass_2:7:1,items:gemClass_1:11:1,buildingMaterials:blueprints:11:25,buildingMaterials:tools:11:25,buildingMaterials:tiles:11:25,buildingMaterials:pulley:11:25"
}
monsters[12] = {
	level:12,
	dragon:"blackDragon:2:12",
	soldiers:"ranger_2:1:270,sentinel_2:1:203,swordsman_2:1:135;swordsman_2:1:270,catapult_2:1:102,ballista_2:1:68;lancer_2:1:135,ranger_2:1:203,swordsman_2:1:135",
	rewards:"items:woodClass_2:8:2,items:stoneClass_2:8:2,items:ironClass_2:8:2,items:foodClass_2:8:2,items:coinClass_2:8:1,items:gemClass_1:12:1,buildingMaterials:blueprints:12:25,buildingMaterials:tools:12:25,buildingMaterials:tiles:12:25,buildingMaterials:pulley:12:25"
}
monsters[13] = {
	level:13,
	dragon:"blackDragon:2:13",
	soldiers:"lancer_2:1:155,ranger_2:1:233,sentinel_2:1:155;catapult_2:1:155,ballista_2:1:117,swordsman_2:1:155;ranger_2:1:310,crossbowman_2:1:233,catapult_2:1:78",
	rewards:"items:woodClass_2:9:2,items:stoneClass_2:9:2,items:ironClass_2:9:2,items:foodClass_2:9:2,items:coinClass_2:9:1,items:gemClass_1:13:1,buildingMaterials:blueprints:13:25,buildingMaterials:tools:13:25,buildingMaterials:tiles:13:25,buildingMaterials:pulley:13:25"
}
monsters[14] = {
	level:14,
	dragon:"blackDragon:2:14",
	soldiers:"lancer_2:1:180,ranger_2:1:270,sentinel_2:1:180;catapult_2:1:180,ballista_2:1:135,swordsman_2:1:180;ranger_2:1:360,crossbowman_2:1:270,catapult_2:1:90",
	rewards:"items:woodClass_3:2:2,items:stoneClass_3:2:2,items:ironClass_3:2:2,items:foodClass_3:2:2,items:coinClass_3:2:1,items:gemClass_1:14:1,buildingMaterials:blueprints:14:25,buildingMaterials:tools:14:25,buildingMaterials:tiles:14:25,buildingMaterials:pulley:14:25"
}
monsters[15] = {
	level:15,
	dragon:"blackDragon:2:15",
	soldiers:"lancer_2:1:205,ranger_2:1:308,sentinel_2:1:205;catapult_2:1:205,ballista_2:1:154,swordsman_2:1:205;ranger_2:1:410,crossbowman_2:1:308,catapult_2:1:103",
	rewards:"items:woodClass_2:12:2,items:stoneClass_2:12:2,items:ironClass_2:12:2,items:foodClass_2:12:2,items:coinClass_2:12:1,items:gemClass_1:15:1,buildingMaterials:blueprints:15:25,buildingMaterials:tools:15:25,buildingMaterials:tiles:15:25,buildingMaterials:pulley:15:25"
}
monsters[16] = {
	level:16,
	dragon:"blackDragon:2:16",
	soldiers:"horseArcher_2:2:230,lancer_2:2:173,ranger_2:2:230;ballista_2:2:230,swordsman_2:2:345,sentinel_2:2:230;crossbowman_2:2:460,horseArcher_2:2:173,ballista_2:2:115",
	rewards:"items:woodClass_2:14:2,items:stoneClass_2:14:2,items:ironClass_2:14:2,items:foodClass_2:14:2,items:coinClass_2:14:1,items:gemClass_1:4:1,buildingMaterials:blueprints:16:25,buildingMaterials:tools:16:25,buildingMaterials:tiles:16:25,buildingMaterials:pulley:16:25"
}
monsters[17] = {
	level:17,
	dragon:"blackDragon:2:17",
	soldiers:"horseArcher_2:2:270,lancer_2:2:203,ranger_2:2:270;ballista_2:2:270,swordsman_2:2:405,sentinel_2:2:270;crossbowman_2:2:540,horseArcher_2:2:203,ballista_2:2:135",
	rewards:"items:woodClass_2:16:2,items:stoneClass_2:16:2,items:ironClass_2:16:2,items:foodClass_2:16:2,items:coinClass_2:16:1,items:gemClass_1:17:1,buildingMaterials:blueprints:17:25,buildingMaterials:tools:17:25,buildingMaterials:tiles:17:25,buildingMaterials:pulley:17:25"
}
monsters[18] = {
	level:18,
	dragon:"blackDragon:2:18",
	soldiers:"horseArcher_2:2:315,lancer_2:2:237,ranger_2:2:315;ballista_2:2:315,swordsman_2:2:473,sentinel_2:2:315;crossbowman_2:2:630,horseArcher_2:2:237,ballista_2:2:158",
	rewards:"items:woodClass_2:18:2,items:stoneClass_2:18:2,items:ironClass_2:18:2,items:foodClass_2:18:2,items:coinClass_2:18:1,items:gemClass_1:18:1,buildingMaterials:blueprints:18:25,buildingMaterials:tools:18:25,buildingMaterials:tiles:18:25,buildingMaterials:pulley:18:25"
}
monsters[19] = {
	level:19,
	dragon:"blackDragon:2:19",
	soldiers:"catapult_2:2:360,horseArcher_2:2:270,lancer_2:2:180;swordsman_2:2:720,sentinel_2:2:540,ranger_2:2:360;horseArcher_2:2:360,lancer_2:2:270,swordsman_2:2:360",
	rewards:"items:woodClass_3:4:2,items:stoneClass_3:4:2,items:ironClass_3:4:2,items:foodClass_3:4:2,items:coinClass_3:4:1,items:gemClass_1:19:1,buildingMaterials:blueprints:19:25,buildingMaterials:tools:19:25,buildingMaterials:tiles:19:25,buildingMaterials:pulley:19:25"
}
monsters[20] = {
	level:20,
	dragon:"blackDragon:2:20",
	soldiers:"catapult_2:2:410,horseArcher_2:2:308,lancer_2:2:205;swordsman_2:2:820,sentinel_2:2:615,ranger_2:2:410;horseArcher_2:2:410,lancer_2:2:308,swordsman_2:2:410",
	rewards:"items:woodClass_4:1:2,items:stoneClass_4:1:2,items:ironClass_4:1:2,items:foodClass_4:1:2,items:coinClass_4:1:1,items:gemClass_2:2:1,buildingMaterials:blueprints:20:25,buildingMaterials:tools:20:25,buildingMaterials:tiles:20:25,buildingMaterials:pulley:20:25"
}
monsters[21] = {
	level:21,
	dragon:"blackDragon:3:21",
	soldiers:"catapult_2:2:460,horseArcher_2:2:345,lancer_2:2:230;swordsman_2:2:920,sentinel_2:2:690,ranger_2:2:460;horseArcher_2:2:460,lancer_2:2:345,swordsman_2:2:460",
	rewards:"items:woodClass_3:6:2,items:stoneClass_3:6:2,items:ironClass_3:6:2,items:foodClass_3:6:2,items:coinClass_3:6:1,items:gemClass_1:21:1,buildingMaterials:blueprints:21:25,buildingMaterials:tools:21:25,buildingMaterials:tiles:21:25,buildingMaterials:pulley:21:25"
}
monsters[22] = {
	level:22,
	dragon:"blackDragon:3:22",
	soldiers:"ballista_2:2:510,catapult_2:2:383,horseArcher_2:2:255;sentinel_2:2:1020,ranger_2:2:765,lancer_2:2:255;lancer_2:2:510,crossbowman_2:2:765,sentinel_2:2:510",
	rewards:"items:woodClass_3:7:2,items:stoneClass_3:7:2,items:ironClass_3:7:2,items:foodClass_3:7:2,items:coinClass_3:7:1,items:gemClass_1:22:1,buildingMaterials:blueprints:22:25,buildingMaterials:tools:22:25,buildingMaterials:tiles:22:25,buildingMaterials:pulley:22:25"
}
monsters[23] = {
	level:23,
	dragon:"blackDragon:3:23",
	soldiers:"ballista_2:2:565,catapult_2:2:424,horseArcher_2:2:283;sentinel_2:2:1130,ranger_2:2:848,lancer_2:2:283;lancer_2:2:565,crossbowman_2:2:848,sentinel_2:2:565",
	rewards:"items:woodClass_3:8:2,items:stoneClass_3:8:2,items:ironClass_3:8:2,items:foodClass_3:8:2,items:coinClass_3:8:1,items:gemClass_1:23:1,buildingMaterials:blueprints:23:25,buildingMaterials:tools:23:25,buildingMaterials:tiles:23:25,buildingMaterials:pulley:23:25"
}
monsters[24] = {
	level:24,
	dragon:"blackDragon:3:24",
	soldiers:"ballista_2:2:620,catapult_2:2:465,horseArcher_2:2:310;sentinel_2:2:1240,ranger_2:2:930,lancer_2:2:310;lancer_2:2:620,crossbowman_2:2:930,sentinel_2:2:620",
	rewards:"items:woodClass_3:9:2,items:stoneClass_3:9:2,items:ironClass_3:9:2,items:foodClass_3:9:2,items:coinClass_3:9:1,items:gemClass_1:24:1,buildingMaterials:blueprints:24:25,buildingMaterials:tools:24:25,buildingMaterials:tiles:24:25,buildingMaterials:pulley:24:25"
}
monsters[25] = {
	level:25,
	dragon:"blackDragon:3:25",
	soldiers:"swordsman_2:2:1360,sentinel_2:2:1020,ranger_2:2:680;lancer_2:2:680,horseArcher_2:2:510,catapult_2:2:340;ballista_2:2:680,swordsman_2:2:1020,horseArcher_2:2:340",
	rewards:"items:woodClass_4:2:2,items:stoneClass_4:2:2,items:ironClass_4:2:2,items:foodClass_4:2:2,items:coinClass_4:2:1,items:gemClass_1:25:1,buildingMaterials:blueprints:25:25,buildingMaterials:tools:25:25,buildingMaterials:tiles:25:25,buildingMaterials:pulley:25:25"
}
monsters[26] = {
	level:26,
	dragon:"blackDragon:3:26",
	soldiers:"swordsman_2:3:1480,sentinel_2:3:1110,ranger_2:3:740;lancer_2:3:740,horseArcher_2:3:555,catapult_2:3:370;ballista_2:3:740,swordsman_2:3:1110,horseArcher_2:3:370",
	rewards:"items:woodClass_4:3:2,items:stoneClass_4:3:2,items:ironClass_4:3:2,items:foodClass_4:3:2,items:coinClass_4:3:1,items:gemClass_1:26:1,buildingMaterials:blueprints:26:25,buildingMaterials:tools:26:25,buildingMaterials:tiles:26:25,buildingMaterials:pulley:26:25"
}
monsters[27] = {
	level:27,
	dragon:"blackDragon:3:27",
	soldiers:"sentinel_2:3:1680,ranger_2:3:1260,crossbowman_2:3:840;horseArcher_2:3:840,catapult_2:3:630,ballista_2:3:420;catapult_2:3:840,sentinel_2:3:1260,swordsman_2:3:840",
	rewards:"items:woodClass_4:4:2,items:stoneClass_4:4:2,items:ironClass_4:4:2,items:foodClass_4:4:2,items:coinClass_4:4:1,items:gemClass_1:27:1,buildingMaterials:blueprints:27:25,buildingMaterials:tools:27:25,buildingMaterials:tiles:27:25,buildingMaterials:pulley:27:25"
}
monsters[28] = {
	level:28,
	dragon:"blackDragon:3:28",
	soldiers:"sentinel_2:3:1900,ranger_2:3:1425,crossbowman_2:3:950;horseArcher_2:3:950,catapult_2:3:713,ballista_2:3:475;catapult_2:3:950,sentinel_2:3:1425,swordsman_2:3:950",
	rewards:"items:woodClass_4:5:2,items:stoneClass_4:5:2,items:ironClass_4:5:2,items:foodClass_4:5:2,items:coinClass_4:5:1,items:gemClass_1:28:1,buildingMaterials:blueprints:28:25,buildingMaterials:tools:28:25,buildingMaterials:tiles:28:25,buildingMaterials:pulley:28:25"
}
monsters[29] = {
	level:29,
	dragon:"blackDragon:3:29",
	soldiers:"ranger_2:3:2120,crossbowman_2:3:1590,lancer_2:3:530;catapult_2:3:1060,ballista_2:3:795,swordsman_2:3:1060;horseArcher_2:3:1060,ranger_2:3:1590,sentinel_2:3:1060",
	rewards:"items:woodClass_4:6:2,items:stoneClass_4:6:2,items:ironClass_4:6:2,items:foodClass_4:6:2,items:coinClass_4:6:1,items:gemClass_1:29:1,buildingMaterials:blueprints:29:25,buildingMaterials:tools:29:25,buildingMaterials:tiles:29:25,buildingMaterials:pulley:29:25"
}
monsters[30] = {
	level:30,
	dragon:"blackDragon:3:30",
	soldiers:"ranger_2:3:2360,crossbowman_2:3:1770,lancer_2:3:590;catapult_2:3:1180,ballista_2:3:885,swordsman_2:3:1180;horseArcher_2:3:1180,ranger_2:3:1770,sentinel_2:3:1180",
	rewards:"items:woodClass_4:7:2,items:stoneClass_4:7:2,items:ironClass_4:7:2,items:foodClass_4:7:2,items:coinClass_4:7:1,items:gemClass_2:3:1,buildingMaterials:blueprints:30:25,buildingMaterials:tools:30:25,buildingMaterials:tiles:30:25,buildingMaterials:pulley:30:25"
}
monsters[31] = {
	level:31,
	dragon:"blackDragon:4:31",
	soldiers:"crossbowman_3:1:2520,lancer_3:1:945,horseArcher_3:1:630;ballista_3:1:1260,swordsman_3:1:1890,sentinel_3:1:1260;lancer_3:1:1260,crossbowman_3:1:1890,sentinel_3:1:1260",
	rewards:"items:woodClass_4:8:2,items:stoneClass_4:8:2,items:ironClass_4:8:2,items:foodClass_4:8:2,items:coinClass_4:8:1,items:gemClass_1:31:1,buildingMaterials:blueprints:31:25,buildingMaterials:tools:31:25,buildingMaterials:tiles:31:25,buildingMaterials:pulley:31:25"
}
monsters[32] = {
	level:32,
	dragon:"blackDragon:4:32",
	soldiers:"crossbowman_3:1:2680,lancer_3:1:1005,horseArcher_3:1:670;ballista_3:1:1340,swordsman_3:1:2010,sentinel_3:1:1340;lancer_3:1:1340,crossbowman_3:1:2010,catapult_3:1:670",
	rewards:"items:woodClass_5:3:2,items:stoneClass_5:3:2,items:ironClass_5:3:2,items:foodClass_5:3:2,items:coinClass_5:3:1,items:gemClass_1:32:1,buildingMaterials:blueprints:32:25,buildingMaterials:tools:32:25,buildingMaterials:tiles:32:25,buildingMaterials:pulley:32:25"
}
monsters[33] = {
	level:33,
	dragon:"blackDragon:4:33",
	soldiers:"lancer_3:1:1425,horseArcher_3:1:1069,catapult_3:1:713;swordsman_3:1:2850,sentinel_3:1:2138,lancer_3:1:713;crossbowman_3:1:2850,lancer_3:1:1069,ballista_3:1:713",
	rewards:"items:woodClass_6:1:2,items:stoneClass_6:1:2,items:ironClass_6:1:2,items:foodClass_6:1:2,items:coinClass_6:1:1,items:gemClass_1:33:1,buildingMaterials:blueprints:33:25,buildingMaterials:tools:33:25,buildingMaterials:tiles:33:25,buildingMaterials:pulley:33:25"
}
monsters[34] = {
	level:34,
	dragon:"blackDragon:4:34",
	soldiers:"lancer_3:1:1505,horseArcher_3:1:1129,ballista_3:1:753;swordsman_3:1:3010,sentinel_3:1:2258,horseArcher_3:1:753;crossbowman_3:1:3010,lancer_3:1:1129,swordsman_3:1:1505",
	rewards:"items:woodClass_5:4:2,items:stoneClass_5:4:2,items:ironClass_5:4:2,items:foodClass_5:4:2,items:coinClass_5:4:1,items:gemClass_1:34:1,buildingMaterials:blueprints:34:25,buildingMaterials:tools:34:25,buildingMaterials:tiles:34:25,buildingMaterials:pulley:34:25"
}
monsters[35] = {
	level:35,
	dragon:"blackDragon:4:35",
	soldiers:"horseArcher_3:1:1580,catapult_3:1:1185,ballista_3:1:790;sentinel_3:1:3160,lancer_3:1:1185,ranger_3:1:790;ranger_3:1:3160,horseArcher_3:1:1185,sentinel_3:1:1580",
	rewards:"items:woodClass_5:5:2,items:stoneClass_5:5:2,items:ironClass_5:5:2,items:foodClass_5:5:2,items:coinClass_5:5:1,items:gemClass_1:35:1,buildingMaterials:blueprints:35:25,buildingMaterials:tools:35:25,buildingMaterials:tiles:35:25,buildingMaterials:pulley:35:25"
}
monsters[36] = {
	level:36,
	dragon:"blackDragon:4:36",
	soldiers:"horseArcher_3:2:1660,ballista_3:2:1245,catapult_3:2:830;sentinel_3:2:3320,horseArcher_3:2:830,catapult_3:2:830;ranger_3:2:3320,horseArcher_3:2:1245,catapult_3:2:830",
	rewards:"items:woodClass_5:6:2,items:stoneClass_5:6:2,items:ironClass_5:6:2,items:foodClass_5:6:2,items:coinClass_5:6:1,items:gemClass_1:36:1,buildingMaterials:blueprints:36:25,buildingMaterials:tools:36:25,buildingMaterials:tiles:36:25,buildingMaterials:pulley:36:25"
}
monsters[37] = {
	level:37,
	dragon:"blackDragon:4:37",
	soldiers:"catapult_3:2:1820,ballista_3:2:1365,sentinel_3:2:1820;lancer_3:2:1820,sentinel_3:2:1820,ballista_3:2:910;swordsman_3:2:3640,catapult_3:2:1365,lancer_3:2:910",
	rewards:"items:woodClass_5:7:2,items:stoneClass_5:7:2,items:ironClass_5:7:2,items:foodClass_5:7:2,items:coinClass_5:7:1,items:gemClass_1:37:1,buildingMaterials:blueprints:37:25,buildingMaterials:tools:37:25,buildingMaterials:tiles:37:25,buildingMaterials:pulley:37:25"
}
monsters[38] = {
	level:38,
	dragon:"blackDragon:4:38",
	soldiers:"ballista_3:2:1980,catapult_3:2:1485,sentinel_3:2:1980;horseArcher_3:2:1980,catapult_3:2:990,ranger_3:2:1980;sentinel_3:2:3960,ballista_3:2:1485,horseArcher_3:2:990",
	rewards:"items:woodClass_5:8:2,items:stoneClass_5:8:2,items:ironClass_5:8:2,items:foodClass_5:8:2,items:coinClass_5:8:1,items:gemClass_1:38:1,buildingMaterials:blueprints:38:25,buildingMaterials:tools:38:25,buildingMaterials:tiles:38:25,buildingMaterials:pulley:38:25"
}
monsters[39] = {
	level:39,
	dragon:"blackDragon:4:39",
	soldiers:"ballista_3:2:2140,swordsman_3:2:3210,ranger_3:2:2140;lancer_3:2:2140,ballista_3:2:1070,crossbowman_3:2:2140;swordsman_3:2:4280,ranger_3:2:3210,ballista_3:2:1070",
	rewards:"items:woodClass_5:9:2,items:stoneClass_5:9:2,items:ironClass_5:9:2,items:foodClass_5:9:2,items:coinClass_5:9:1,items:gemClass_1:39:1,buildingMaterials:blueprints:39:25,buildingMaterials:tools:39:25,buildingMaterials:tiles:39:25,buildingMaterials:pulley:39:25"
}
monsters[40] = {
	level:40,
	dragon:"blackDragon:4:40",
	soldiers:"catapult_3:3:2295,swordsman_3:3:3443,ranger_3:3:2295;horseArcher_3:3:2295,crossbowman_3:3:2295,catapult_3:3:1148;sentinel_3:3:4590,lancer_3:3:1722,catapult_3:3:1148",
	rewards:"items:woodClass_6:3:2,items:stoneClass_6:3:2,items:ironClass_6:3:2,items:foodClass_6:3:2,items:coinClass_6:3:1,items:gemClass_2:4:1,buildingMaterials:blueprints:40:25,buildingMaterials:tools:40:25,buildingMaterials:tiles:40:25,buildingMaterials:pulley:40:25"
}
