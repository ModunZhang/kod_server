"use strict"

/**
 * Created by modun on 14/10/29.
 */

var pomelo = require("./pomelo-client")
var Config = require("./config")
var _ = require("underscore")

var Api = module.exports


Api.loginPlayer = function(deviceId, callback){
	pomelo.disconnect()
	pomelo.init({
		host:Config.gateHost, port:Config.gatePort, log:true
	}, function(){
		var route = "gate.gateHandler.queryEntry"
		pomelo.request(route, {platform:Config.platform, deviceId:deviceId, tag:-1}, function(doc){
			pomelo.disconnect()
			pomelo.init({
				host:doc.data.host, port:doc.data.port, log:true
			}, function(){
				var route = "logic.entryHandler.login"
				pomelo.request(route, {deviceId:deviceId, needMapData:false, requestTime:Date.now()}, function(doc){
					callback(doc)
				})
			})
		})
	})
}

Api.sendChat = function(text, callback){
	var info = {
		text:text, channel:"global"
	}
	var route = "chat.chatHandler.send"
	pomelo.request(route, info, callback)
}

Api.sendAllianceChat = function(text, callback){
	var info = {
		text:text, channel:"alliance"
	}
	var route = "chat.chatHandler.send"
	pomelo.request(route, info, callback)
}

Api.sendAllianceFightChat = function(text, callback){
	var info = {
		text:text, channel:"allianceFight"
	}
	var route = "chat.chatHandler.send"
	pomelo.request(route, info, callback)
}

Api.getChats = function(channel, callback){
	var info = {
		channel:channel
	}
	var route = "chat.chatHandler.getAll"
	pomelo.request(route, info, callback)
}

Api.upgradeBuilding = function(location, finishNow, callback){
	var info = {
		location:location, finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeBuilding"
	pomelo.request(route, info, callback)
}

Api.switchBuilding = function(buildingLocation, newBuildingName, callback){
	var info = {
		buildingLocation:buildingLocation,
		newBuildingName:newBuildingName
	}
	var route = "logic.playerHandler.switchBuilding"
	pomelo.request(route, info, callback)
}

Api.createHouse = function(houseType, buildingLocation, houseLocation, finishNow, callback){
	var info = {
		buildingLocation:buildingLocation, houseType:houseType, houseLocation:houseLocation, finishNow:finishNow
	}
	var route = "logic.playerHandler.createHouse"
	pomelo.request(route, info, callback)
}

Api.upgradeHouse = function(buildingLocation, houseLocation, finishNow, callback){
	var info = {
		buildingLocation:buildingLocation, houseLocation:houseLocation, finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeHouse"
	pomelo.request(route, info, callback)
}

Api.freeSpeedUp = function(eventType, eventId, callback){
	var info = {
		eventType:eventType,
		eventId:eventId
	}
	var route = "logic.playerHandler.freeSpeedUp"
	pomelo.request(route, info, callback)
}

Api.makeMaterial = function(type, finishNow, callback){
	var info = {
		type:type,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.makeMaterial"
	pomelo.request(route, info, callback)
}

Api.getMaterials = function(eventId, callback){
	var info = {
		eventId:eventId
	}
	var route = "logic.playerHandler.getMaterials"
	pomelo.request(route, info, callback)
}

Api.recruitNormalSoldier = function(soldierName, count, finishNow, callback){
	var info = {
		soldierName:soldierName, count:count, finishNow:finishNow
	}
	var route = "logic.playerHandler.recruitNormalSoldier"
	pomelo.request(route, info, callback)
}

Api.recruitSpecialSoldier = function(soldierName, count, finishNow, callback){
	var info = {
		soldierName:soldierName, count:count, finishNow:finishNow
	}
	var route = "logic.playerHandler.recruitSpecialSoldier"
	pomelo.request(route, info, callback)
}

Api.makeDragonEquipment = function(equipmentName, finishNow, callback){
	var info = {
		equipmentName:equipmentName, finishNow:finishNow
	}
	var route = "logic.playerHandler.makeDragonEquipment"
	pomelo.request(route, info, callback)
}

Api.treatSoldier = function(soldiers, finishNow, callback){
	var info = {
		soldiers:soldiers, finishNow:finishNow
	}
	var route = "logic.playerHandler.treatSoldier"
	pomelo.request(route, info, callback)
}

Api.hatchDragon = function(dragonType, callback){
	var info = {
		dragonType:dragonType
	}
	var route = "logic.playerHandler.hatchDragon"
	pomelo.request(route, info, callback)
}

Api.setDragonEquipment = function(dragonType, equipmentCategory, equipmentName, callback){
	var info = {
		dragonType:dragonType, equipmentCategory:equipmentCategory, equipmentName:equipmentName
	}
	var route = "logic.playerHandler.setDragonEquipment"
	pomelo.request(route, info, callback)
}

Api.enhanceDragonEquipment = function(dragonType, equipmentCategory, equipments, callback){
	var info = {
		dragonType:dragonType, equipmentCategory:equipmentCategory, equipments:equipments
	}
	var route = "logic.playerHandler.enhanceDragonEquipment"
	pomelo.request(route, info, callback)
}

Api.resetDragonEquipment = function(dragonType, equipmentCategory, callback){
	var info = {
		dragonType:dragonType, equipmentCategory:equipmentCategory
	}
	var route = "logic.playerHandler.resetDragonEquipment"
	pomelo.request(route, info, callback)
}

Api.upgradeDragonDragonSkill = function(dragonType, skillKey, callback){
	var info = {
		dragonType:dragonType, skillKey:skillKey
	}
	var route = "logic.playerHandler.upgradeDragonSkill"
	pomelo.request(route, info, callback)
}

Api.upgradeDragonStar = function(dragonType, callback){
	var info = {
		dragonType:dragonType
	}
	var route = "logic.playerHandler.upgradeDragonStar"
	pomelo.request(route, info, callback)
}

Api.getDailyQuests = function(callback){
	var route = "logic.playerHandler.getDailyQuests"
	pomelo.request(route, null, callback)
}

Api.addDailyQuestStar = function(questId, callback){
	var info = {
		questId:questId
	}
	var route = "logic.playerHandler.addDailyQuestStar"
	pomelo.request(route, info, callback)
}

Api.startDailyQuest = function(questId, callback){
	var info = {
		questId:questId
	}
	var route = "logic.playerHandler.startDailyQuest"
	pomelo.request(route, info, callback)
}

Api.getDailyQeustReward = function(questEventId, callback){
	var info = {
		questEventId:questEventId
	}
	var route = "logic.playerHandler.getDailyQeustReward"
	pomelo.request(route, info, callback)
}

Api.getPlayerInfo = function(memberId, serverId, callback){
	var info = {
		memberId:memberId,
		serverId:serverId
	}
	var route = "logic.playerHandler.getPlayerInfo"
	pomelo.request(route, info, callback)
}

Api.setPlayerLanguage = function(language, callback){
	var info = {
		language:language
	}
	var route = "logic.playerHandler.setPlayerLanguage"
	pomelo.request(route, info, callback)
}

Api.sendMail = function(memberId, title, content, callback){
	var info = {
		memberId:memberId,
		title:title,
		content:content
	}
	var route = "logic.playerHandler.sendMail"
	pomelo.request(route, info, callback)
}

Api.readMails = function(mailIds, callback){
	var info = {
		mailIds:mailIds
	}
	var route = "logic.playerHandler.readMails"
	pomelo.request(route, info, callback)
}

Api.saveMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.saveMail"
	pomelo.request(route, info, callback)
}

Api.unSaveMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.unSaveMail"
	pomelo.request(route, info, callback)
}

Api.deleteMails = function(mailIds, callback){
	var info = {
		mailIds:mailIds
	}
	var route = "logic.playerHandler.deleteMails"
	pomelo.request(route, info, callback)
}

Api.deleteSendMails = function(mailIds, callback){
	var info = {
		mailIds:mailIds
	}
	var route = "logic.playerHandler.deleteSendMails"
	pomelo.request(route, info, callback)
}

Api.getMails = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getMails"
	pomelo.request(route, info, callback)
}

Api.getSendMails = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getSendMails"
	pomelo.request(route, info, callback)
}

Api.getSavedMails = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getSavedMails"
	pomelo.request(route, info, callback)
}

Api.readReports = function(reportIds, callback){
	var info = {
		reportIds:reportIds
	}
	var route = "logic.playerHandler.readReports"
	pomelo.request(route, info, callback)
}

Api.saveReport = function(reportId, callback){
	var info = {
		reportId:reportId
	}
	var route = "logic.playerHandler.saveReport"
	pomelo.request(route, info, callback)
}

Api.unSaveReport = function(reportId, callback){
	var info = {
		reportId:reportId
	}
	var route = "logic.playerHandler.unSaveReport"
	pomelo.request(route, info, callback)
}

Api.deleteReports = function(reportIds, callback){
	var info = {
		reportIds:reportIds
	}
	var route = "logic.playerHandler.deleteReports"
	pomelo.request(route, info, callback)
}

Api.getReports = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getReports"
	pomelo.request(route, info, callback)
}

Api.getSavedReports = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getSavedReports"
	pomelo.request(route, info, callback)
}

Api.editPlayerName = function(name, callback){
	var info = {
		name:name
	}
	var route = "logic.playerHandler.editPlayerName"
	pomelo.request(route, info, callback)
}

Api.getPlayerViewData = function(targetPlayerId, callback){
	var info = {
		targetPlayerId:targetPlayerId
	}
	var route = "logic.playerHandler.getPlayerViewData"
	pomelo.request(route, info, callback)
}

Api.setDefenceTroop = function(dragonType, soldiers, callback){
	var info = {
		dragonType:dragonType,
		soldiers:soldiers
	}
	var route = "logic.playerHandler.setDefenceTroop"
	pomelo.request(route, info, callback)
}

Api.cancelDefenceTroop = function(callback){
	var route = "logic.playerHandler.cancelDefenceTroop"
	pomelo.request(route, null, callback)
}

Api.sellItem = function(type, name, count, price, callback){
	var info = {
		type:type,
		name:name,
		count:count,
		price:price
	}
	var route = "logic.playerHandler.sellItem"
	pomelo.request(route, info, callback)
}

Api.getSellItems = function(type, name, callback){
	var info = {
		type:type,
		name:name
	}
	var route = "logic.playerHandler.getSellItems"
	pomelo.request(route, info, callback)
}

Api.buySellItem = function(itemId, callback){
	var info = {
		itemId:itemId
	}
	var route = "logic.playerHandler.buySellItem"
	pomelo.request(route, info, callback)
}

Api.getMyItemSoldMoney = function(itemId, callback){
	var info = {
		itemId:itemId
	}
	var route = "logic.playerHandler.getMyItemSoldMoney"
	pomelo.request(route, info, callback)
}

Api.removeMySellItem = function(itemId, callback){
	var info = {
		itemId:itemId
	}
	var route = "logic.playerHandler.removeMySellItem"
	pomelo.request(route, info, callback)
}

Api.setPushId = function(pushId, callback){
	var info = {
		pushId:pushId
	}
	var route = "logic.playerHandler.setPushId"
	pomelo.request(route, info, callback)
}

Api.upgradeProductionTech = function(techName, finishNow, callback){
	var info = {
		techName:techName,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeProductionTech"
	pomelo.request(route, info, callback)
}

Api.upgradeMilitaryTech = function(techName, finishNow, callback){
	var info = {
		techName:techName,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeMilitaryTech"
	pomelo.request(route, info, callback)
}

Api.upgradeSoldierStar = function(soldierName, finishNow, callback){
	var info = {
		soldierName:soldierName,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeSoldierStar"
	pomelo.request(route, info, callback)
}

Api.setTerrain = function(terrain, callback){
	var info = {
		terrain:terrain
	}
	var route = "logic.playerHandler.setTerrain"
	pomelo.request(route, info, callback)
}

Api.buyItem = function(itemName, count, callback){
	var info = {
		itemName:itemName,
		count:count
	}
	var route = "logic.playerHandler.buyItem"
	pomelo.request(route, info, callback)
}

Api.useItem = function(itemName, params, callback){
	var info = {
		itemName:itemName,
		params:params
	}
	var route = "logic.playerHandler.useItem"
	pomelo.request(route, info, callback)
}

Api.buyAndUseItem = function(itemName, params, callback){
	var info = {
		itemName:itemName,
		params:params
	}
	var route = "logic.playerHandler.buyAndUseItem"
	pomelo.request(route, info, callback)
}

Api.gacha = function(type, callback){
	var info = {
		type:type
	}
	var route = "logic.playerHandler.gacha"
	pomelo.request(route, info, callback)
}

Api.bindGc = function(type, gcId, gcName, callback){
	var info = {
		type:type,
		gcId:gcId,
		gcName:gcName
	}
	var route = "logic.playerHandler.bindGc"
	pomelo.request(route, info, callback)
}

Api.updateGcName = function(gcName, callback){
	var info = {
		gcName:gcName
	}
	var route = "logic.playerHandler.updateGcName"
	pomelo.request(route, info, callback)
}

Api.switchGc = function(gcId, callback){
	var info = {
		gcId:gcId
	}
	var route = "logic.playerHandler.switchGc"
	pomelo.request(route, info, callback)
}

Api.getDay60Reward = function(callback){
	var route = "logic.playerHandler.getDay60Reward"
	pomelo.request(route, null, callback)
}

Api.getOnlineReward = function(timePoint, callback){
	var info = {
		timePoint:timePoint
	}
	var route = "logic.playerHandler.getOnlineReward"
	pomelo.request(route, info, callback)
}

Api.getDay14Reward = function(callback){
	var route = "logic.playerHandler.getDay14Reward"
	pomelo.request(route, null, callback)
}

Api.getLevelupReward = function(levelupIndex, callback){
	var info = {
		levelupIndex:levelupIndex
	}
	var route = "logic.playerHandler.getLevelupReward"
	pomelo.request(route, info, callback)
}

Api.addIosPlayerBillingData = function(receiptData, callback){
	var info = {
		receiptData:receiptData
	}
	var route = "logic.playerHandler.addIosPlayerBillingData"
	pomelo.request(route, info, callback)
}

Api.addWpOfficialPlayerBillingData = function(receiptData, callback){
	var info = {
		receiptData:receiptData
	}
	var route = "logic.playerHandler.addWpOfficialPlayerBillingData"
	pomelo.request(route, info, callback)
}

Api.addWpAdeasygoPlayerBillingData = function(uid, transactionId, callback){
	var info = {
		uid:uid,
		transactionId:transactionId
	}
	var route = "logic.playerHandler.addWpAdeasygoPlayerBillingData"
	pomelo.request(route, info, callback)
}

Api.getFirstIAPRewards = function(callback){
	var route = "logic.playerHandler.getFirstIAPRewards"
	pomelo.request(route, null, callback)
}

Api.getDailyTaskRewards = function(callback){
	var route = "logic.playerHandler.getDailyTaskRewards"
	pomelo.request(route, null, callback)
}

Api.getGrowUpTaskRewards = function(taskType, taskId, callback){
	var info = {
		taskType:taskType,
		taskId:taskId
	}
	var route = "logic.playerHandler.getGrowUpTaskRewards"
	pomelo.request(route, info, callback)
}

Api.getPlayerRankList = function(rankType, fromRank, callback){
	var info = {
		rankType:rankType,
		fromRank:fromRank
	}
	var route = "rank.rankHandler.getPlayerRankList"
	pomelo.request(route, info, callback)
}

Api.getAllianceRankList = function(rankType, fromRank, callback){
	var info = {
		rankType:rankType,
		fromRank:fromRank
	}
	var route = "rank.rankHandler.getAllianceRankList"
	pomelo.request(route, info, callback)
}

Api.getIapGift = function(giftId, callback){
	var info = {
		giftId:giftId
	}
	var route = "logic.playerHandler.getIapGift"
	pomelo.request(route, info, callback)
}

Api.getServers = function(callback){
	var route = "logic.playerHandler.getServers"
	pomelo.request(route, null, callback)
}

Api.switchServer = function(serverId, callback){
	var info = {
		serverId:serverId
	}
	var route = "logic.playerHandler.switchServer"
	pomelo.request(route, info, callback)
}

Api.setPlayerIcon = function(icon, callback){
	var info = {
		icon:icon
	}
	var route = "logic.playerHandler.setPlayerIcon"
	pomelo.request(route, info, callback)
}

Api.unlockPlayerSecondMarchQueue = function(callback){
	var route = "logic.playerHandler.unlockPlayerSecondMarchQueue"
	pomelo.request(route, null, callback)
}

Api.initPlayerData = function(terrain, language, callback){
	var info = {
		terrain:terrain,
		language:language
	}
	var route = "logic.playerHandler.initPlayerData"
	pomelo.request(route, info, callback)
}

Api.getFirstJoinAllianceReward = function(callback){
	var route = "logic.playerHandler.getFirstJoinAllianceReward"
	pomelo.request(route, null, callback)
}

Api.finishFTE = function(callback){
	var route = "logic.playerHandler.finishFTE"
	pomelo.request(route, null, callback)
}

Api.getPlayerWallInfo = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.playerHandler.getPlayerWallInfo"
	pomelo.request(route, info, callback)
}

Api.attackPveSection = function(sectionName, dragonType, soldiers, callback){
	var info = {
		sectionName:sectionName,
		dragonType:dragonType,
		soldiers:soldiers
	}
	var route = "logic.playerHandler.attackPveSection"
	pomelo.request(route, info, callback)
}

Api.getPveStageReward = function(stageName, callback){
	var info = {
		stageName:stageName
	}
	var route = "logic.playerHandler.getPveStageReward"
	pomelo.request(route, info, callback)
}


Api.createAlliance = function(name, tag, country, terrain, flag, callback){
	var info = {
		name:name, tag:tag, country:country, terrain:terrain, flag:flag
	}
	var route = "logic.allianceHandler.createAlliance"
	pomelo.request(route, info, callback)
}

Api.sendAllianceMail = function(title, content, callback){
	var info = {
		title:title, content:content
	}
	var route = "logic.allianceHandler.sendAllianceMail"
	pomelo.request(route, info, callback)
}

Api.getMyAllianceData = function(callback){
	var route = "logic.allianceHandler.getMyAllianceData"
	pomelo.request(route, null, callback)
}

Api.searchAllianceByTag = function(tag, callback){
	var info = {
		tag:tag
	}
	var route = "logic.allianceHandler.searchAllianceByTag"
	pomelo.request(route, info, callback)
}

Api.getCanDirectJoinAlliances = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.allianceHandler.getCanDirectJoinAlliances"
	pomelo.request(route, info, callback)
}

Api.editAllianceBasicInfo = function(name, tag, country, flag, callback){
	var info = {
		name:name, tag:tag, country:country, flag:flag
	}
	var route = "logic.allianceHandler.editAllianceBasicInfo"
	pomelo.request(route, info, callback)
}

Api.editAllianceTerrian = function(terrain, callback){
	var info = {
		terrain:terrain
	}
	var route = "logic.allianceHandler.editAllianceTerrian"
	pomelo.request(route, info, callback)
}

Api.editAllianceNotice = function(notice, callback){
	var info = {
		notice:notice
	}
	var route = "logic.allianceHandler.editAllianceNotice"
	pomelo.request(route, info, callback)
}

Api.editAllianceDescription = function(description, callback){
	var info = {
		description:description
	}
	var route = "logic.allianceHandler.editAllianceDescription"
	pomelo.request(route, info, callback)
}

Api.editAllianceJoinType = function(joinType, callback){
	var info = {
		joinType:joinType
	}
	var route = "logic.allianceHandler.editAllianceJoinType"
	pomelo.request(route, info, callback)
}

Api.editAllianceMemberTitle = function(memberId, title, callback){
	var info = {
		memberId:memberId, title:title
	}
	var route = "logic.allianceHandler.editAllianceMemberTitle"
	pomelo.request(route, info, callback)
}

Api.kickAllianceMemberOff = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.allianceHandler.kickAllianceMemberOff"
	pomelo.request(route, info, callback)
}

Api.handOverAllianceArchon = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.allianceHandler.handOverAllianceArchon"
	pomelo.request(route, info, callback)
}

Api.quitAlliance = function(callback){
	var route = "logic.allianceHandler.quitAlliance"
	pomelo.request(route, null, callback)
}

Api.requestToJoinAlliance = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.allianceHandler.requestToJoinAlliance"
	pomelo.request(route, info, callback)
}

Api.cancelJoinAllianceRequest = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.allianceHandler.cancelJoinAllianceRequest"
	pomelo.request(route, info, callback)
}

Api.approveJoinAllianceRequest = function(requestEventId, callback){
	var info = {
		requestEventId:requestEventId
	}
	var route = "logic.allianceHandler.approveJoinAllianceRequest"
	pomelo.request(route, info, callback)
}

Api.removeJoinAllianceReqeusts = function(requestEventIds, callback){
	var info = {
		requestEventIds:requestEventIds
	}
	var route = "logic.allianceHandler.removeJoinAllianceReqeusts"
	pomelo.request(route, info, callback)
}

Api.inviteToJoinAlliance = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.allianceHandler.inviteToJoinAlliance"
	pomelo.request(route, info, callback)
}

Api.handleJoinAllianceInvite = function(allianceId, agree, callback){
	var info = {
		allianceId:allianceId, agree:agree
	}
	var route = "logic.allianceHandler.handleJoinAllianceInvite"
	pomelo.request(route, info, callback)
}

Api.buyAllianceArchon = function(callback){
	var route = "logic.allianceHandler.buyAllianceArchon"
	pomelo.request(route, null, callback)
}

Api.joinAllianceDirectly = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.allianceHandler.joinAllianceDirectly"
	pomelo.request(route, info, callback)
}

Api.requestAllianceToSpeedUp = function(eventType, eventId, callback){
	var info = {
		eventType:eventType, eventId:eventId
	}
	var route = "logic.allianceHandler.requestAllianceToSpeedUp"
	pomelo.request(route, info, callback)
}

Api.helpAllianceMemberSpeedUp = function(eventId, callback){
	var info = {
		eventId:eventId
	}
	var route = "logic.allianceHandler.helpAllianceMemberSpeedUp"
	pomelo.request(route, info, callback)
}

Api.helpAllAllianceMemberSpeedUp = function(callback){
	var route = "logic.allianceHandler.helpAllAllianceMemberSpeedUp"
	pomelo.request(route, null, callback)
}

Api.donateToAlliance = function(donateType, callback){
	var info = {
		donateType:donateType
	}
	var route = "logic.allianceHandler.donateToAlliance"
	pomelo.request(route, info, callback)
}

Api.upgradeAllianceBuilding = function(buildingName, callback){
	var info = {
		buildingName:buildingName
	}
	var route = "logic.allianceHandler.upgradeAllianceBuilding"
	pomelo.request(route, info, callback)
}

Api.upgradeAllianceVillage = function(villageType, callback){
	var info = {
		villageType:villageType
	}
	var route = "logic.allianceHandler.upgradeAllianceVillage"
	pomelo.request(route, info, callback)
}

Api.activateAllianceShrineStage = function(stageName, callback){
	var info = {
		stageName:stageName
	}
	var route = "logic.allianceHandler.activateAllianceShrineStage"
	pomelo.request(route, info, callback)
}

Api.attackAllianceShrine = function(shrineEventId, dragonType, soldiers, callback){
	var info = {
		shrineEventId:shrineEventId,
		dragonType:dragonType,
		soldiers:soldiers
	}
	var route = "logic.allianceHandler.attackAllianceShrine"
	pomelo.request(route, info, callback)
}

Api.attackAlliance = function(targetAllianceId, callback){
	var route = "logic.allianceHandler.attackAlliance"
	var info = {
		targetAllianceId:targetAllianceId
	}
	pomelo.request(route, info, callback)
}

Api.getAllianceViewData = function(targetAllianceId, callback){
	var info = {
		targetAllianceId:targetAllianceId
	}
	var route = "logic.allianceHandler.getAllianceViewData"
	pomelo.request(route, info, callback)
}

Api.getNearedAllianceInfos = function(callback){
	var route = "logic.allianceHandler.getNearedAllianceInfos"
	pomelo.request(route, null, callback)
}

Api.searchAllianceInfoByTag = function(tag, callback){
	var info = {
		tag:tag
	}
	var route = "logic.allianceHandler.searchAllianceInfoByTag"
	pomelo.request(route, info, callback)
}

Api.helpAllianceMemberDefence = function(dragonType, soldiers, targetPlayerId, callback){
	var info = {
		dragonType:dragonType,
		soldiers:soldiers,
		targetPlayerId:targetPlayerId
	}
	var route = "logic.allianceHandler.helpAllianceMemberDefence"
	pomelo.request(route, info, callback)
}

Api.retreatFromBeHelpedAllianceMember = function(beHelpedPlayerId, callback){
	var info = {
		beHelpedPlayerId:beHelpedPlayerId
	}
	var route = "logic.allianceHandler.retreatFromBeHelpedAllianceMember"
	pomelo.request(route, info, callback)
}

Api.strikePlayerCity = function(dragonType, defenceAllianceId, defencePlayerId, callback){
	var info = {
		dragonType:dragonType,
		defenceAllianceId:defenceAllianceId,
		defencePlayerId:defencePlayerId
	}
	var route = "logic.allianceHandler.strikePlayerCity"
	pomelo.request(route, info, callback)
}

Api.attackPlayerCity = function(dragonType, soldiers, defenceAllianceId, defencePlayerId, callback){
	var info = {
		dragonType:dragonType,
		soldiers:soldiers,
		defenceAllianceId:defenceAllianceId,
		defencePlayerId:defencePlayerId
	}
	var route = "logic.allianceHandler.attackPlayerCity"
	pomelo.request(route, info, callback)
}

Api.attackVillage = function(dragonType, soldiers, defenceAllianceId, defenceVillageId, callback){
	var info = {
		dragonType:dragonType,
		soldiers:soldiers,
		defenceAllianceId:defenceAllianceId,
		defenceVillageId:defenceVillageId
	}
	var route = "logic.allianceHandler.attackVillage"
	pomelo.request(route, info, callback)
}

Api.attackMonster = function(dragonType, soldiers, defenceAllianceId, defenceMonsterId, callback){
	var info = {
		dragonType:dragonType,
		soldiers:soldiers,
		defenceAllianceId:defenceAllianceId,
		defenceMonsterId:defenceMonsterId
	}
	var route = "logic.allianceHandler.attackMonster"
	pomelo.request(route, info, callback)
}

Api.retreatFromVillage = function(villageEventId, callback){
	var info = {
		villageEventId:villageEventId
	}
	var route = "logic.allianceHandler.retreatFromVillage"
	pomelo.request(route, info, callback)
}

Api.strikeVillage = function(dragonType, defenceAllianceId, defenceVillageId, callback){
	var info = {
		dragonType:dragonType,
		defenceAllianceId:defenceAllianceId,
		defenceVillageId:defenceVillageId
	}
	var route = "logic.allianceHandler.strikeVillage"
	pomelo.request(route, info, callback)
}

Api.getAttackMarchEventDetail = function(enemyAllianceId, eventId, callback){
	var info = {
		enemyAllianceId:enemyAllianceId,
		eventId:eventId
	}
	var route = "logic.allianceHandler.getAttackMarchEventDetail"
	pomelo.request(route, info, callback)
}

Api.getStrikeMarchEventDetail = function(enemyAllianceId, eventId, callback){
	var info = {
		enemyAllianceId:enemyAllianceId,
		eventId:eventId
	}
	var route = "logic.allianceHandler.getStrikeMarchEventDetail"
	pomelo.request(route, info, callback)
}

Api.getHelpDefenceMarchEventDetail = function(allianceId, eventId, callback){
	var info = {
		allianceId:allianceId,
		eventId:eventId
	}
	var route = "logic.allianceHandler.getHelpDefenceMarchEventDetail"
	pomelo.request(route, info, callback)
}

Api.getHelpDefenceTroopDetail = function(playerId, helpedByPlayerId, callback){
	var info = {
		playerId:playerId,
		helpedByPlayerId:helpedByPlayerId
	}
	var route = "logic.allianceHandler.getHelpDefenceTroopDetail"
	pomelo.request(route, info, callback)
}

Api.addShopItem = function(itemName, count, callback){
	var info = {
		itemName:itemName,
		count:count
	}
	var route = "logic.allianceHandler.addShopItem"
	pomelo.request(route, info, callback)
}

Api.buyShopItem = function(itemName, count, callback){
	var info = {
		itemName:itemName,
		count:count
	}
	var route = "logic.allianceHandler.buyShopItem"
	pomelo.request(route, info, callback)
}

Api.giveLoyaltyToAllianceMember = function(memberId, count, callback){
	var info = {
		memberId:memberId,
		count:count
	}
	var route = "logic.allianceHandler.giveLoyaltyToAllianceMember"
	pomelo.request(route, info, callback)
}

Api.getAllianceInfo = function(allianceId, serverId, callback){
	var info = {
		allianceId:allianceId,
		serverId:serverId
	}
	var route = "logic.allianceHandler.getAllianceInfo"
	pomelo.request(route, info, callback)
}

Api.getJoinRequestEvents = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.allianceHandler.getJoinRequestEvents"
	pomelo.request(route, info, callback)
}

Api.getShrineReports = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.allianceHandler.getShrineReports"
	pomelo.request(route, info, callback)
}

Api.getAllianceFightReports = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.allianceHandler.getAllianceFightReports"
	pomelo.request(route, info, callback)
}

Api.getItemLogs = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.allianceHandler.getItemLogs"
	pomelo.request(route, info, callback)
}

Api.enterMapIndex = function(mapIndex, callback){
	var info = {
		mapIndex:mapIndex
	}
	var route = "logic.allianceHandler.enterMapIndex"
	pomelo.request(route, info, callback)
}

Api.leaveMapIndex = function(mapIndex, callback){
	var info = {
		mapIndex:mapIndex
	}
	var route = "logic.allianceHandler.leaveMapIndex"
	pomelo.request(route, info, callback)
}

Api.getMapAllianceDatas = function(mapIndexs, callback){
	var info = {
		mapIndexs:mapIndexs
	}
	var route = 'logic.allianceHandler.getMapAllianceDatas';
	pomelo.request(route, info, callback);
}

Api.moveAlliance = function(targetMapIndex, callback){
	var info = {
		targetMapIndex:targetMapIndex
	}
	var route = 'logic.allianceHandler.moveAlliance';
	pomelo.request(route, info, callback);
}