"use strict"

/**
 * Created by modun on 14/10/29.
 */

var pomelo = require("./pomelo-client")
var Config = require("./config")

var Api = module.exports




Api.loginPlayer = function(deviceId, callback){
	pomelo.disconnect()
	pomelo.init({
		host:Config.gateHost, port:Config.gatePort, log:true
	}, function(){
		var loginInfo = {
			deviceId:deviceId
		}
		var route = "gate.gateHandler.queryEntry"
		pomelo.request(route, loginInfo, function(doc){
			pomelo.disconnect()
			pomelo.init({
				host:doc.data.host, port:doc.data.port, log:true
			}, function(){
				var loginInfo = {
					deviceId:deviceId
				}
				var route = "logic.entryHandler.login"
				pomelo.request(route, loginInfo, callback)
			})
		})
	})
}


Api.sendChat = function(text, callback){
	var info = {
		text:text, type:"global"
	}
	var route = "chat.chatHandler.send"
	pomelo.request(route, info, callback)
}

Api.upgradeBuilding = function(location, finishNow, callback){
	var info = {
		location:location, finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeBuilding"
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

Api.destroyHouse = function(buildingLocation, houseLocation, callback){
	var info = {
		buildingLocation:buildingLocation, houseLocation:houseLocation
	}
	var route = "logic.playerHandler.destroyHouse"
	pomelo.request(route, info, callback)
}

Api.upgradeTower = function(location, finishNow, callback){
	var info = {
		location:location, finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeTower"
	pomelo.request(route, info, callback)
}

Api.upgradeWall = function(finishNow, callback){
	var info = {
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeWall"
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

Api.makeMaterial = function(category, finishNow, callback){
	var info = {
		category:category, finishNow:finishNow
	}
	var route = "logic.playerHandler.makeMaterial"
	pomelo.request(route, info, callback)
}

Api.getMaterials = function(category, callback){
	var info = {
		category:category
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

Api.upgradeDragonDragonSkill = function(dragonType, skillLocation, callback){
	var info = {
		dragonType:dragonType, skillLocation:skillLocation
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

Api.impose = function(callback){
	var route = "logic.playerHandler.impose"
	pomelo.request(route, null, callback)
}

Api.getPlayerInfo = function(memberId, callback){
	var info = {
		memberId:memberId
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

Api.sendMail = function(memberName, title, content, callback){
	var info = {
		memberName:memberName, title:title, content:content
	}
	var route = "logic.playerHandler.sendMail"
	pomelo.request(route, info, callback)
}

Api.readMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.readMail"
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

Api.deleteMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.deleteMail"
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

Api.createAlliance = function(name, tag, language, terrain, flag, callback){
	var info = {
		name:name, tag:tag, language:language, terrain:terrain, flag:flag
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

Api.getCanDirectJoinAlliances = function(callback){
	var route = "logic.allianceHandler.getCanDirectJoinAlliances"
	pomelo.request(route, null, callback)
}

Api.editAllianceBasicInfo = function(name, tag, language, flag, callback){
	var info = {
		name:name, tag:tag, language:language, flag:flag
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

Api.editAllianceTitleName = function(title, titleName, callback){
	var info = {
		title:title, titleName:titleName
	}
	var route = "logic.allianceHandler.editAllianceTitleName"
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

Api.handleJoinAllianceRequest = function(memberId, agree, callback){
	var info = {
		memberId:memberId, agree:agree
	}
	var route = "logic.allianceHandler.handleJoinAllianceRequest"
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

Api.moveAllianceBuilding = function(buildingName, locationX, locationY, callback){
	var info = {
		buildingName:buildingName,
		locationX:locationX,
		locationY:locationY
	}
	var route = "logic.allianceHandler.moveAllianceBuilding"
	pomelo.request(route, info, callback)
}

Api.moveAllianceMember = function(locationX, locationY, callback){
	var info = {
		locationX:locationX,
		locationY:locationY
	}
	var route = "logic.allianceHandler.moveAllianceMember"
	pomelo.request(route, info, callback)
}

Api.distroyAllianceDecorate = function(decorateId, callback){
	var info = {
		decorateId:decorateId
	}
	var route = "logic.allianceHandler.distroyAllianceDecorate"
	pomelo.request(route, info, callback)
}

Api.activateAllianceShrineStage = function(stageName, callback){
	var info = {
		stageName:stageName
	}
	var route = "logic.allianceHandler.activateAllianceShrineStage"
	pomelo.request(route, info, callback)
}