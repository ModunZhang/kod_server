/**
 * Created by modun on 14-7-25.
 */

var should = require('should')
var pomelo = require("../pomelo-client")
//var mongoose = require("mongoose")
var redis = require("redis")
var _ = require("underscore")
var path = require("path")
var Scripto = require('redis-scripto')
var Promise = require("bluebird")

var Consts = require("../../app/consts/consts")
var Config = require("../config")
var AllianceDao = require("../../app/dao/allianceDao")
var PlayerDao = require("../../app/dao/playerDao")
var LogicUtils = require("../../app/utils/logicUtils")

var commandDir = path.resolve(__dirname + "/../../app/commands")
var redisClient = redis.createClient(Config.redisPort, Config.redisAddr)
//mongoose.connect(Config.mongoAddr)
var scripto = new Scripto(redisClient)
scripto.loadFromDir(commandDir)
var allianceDao = Promise.promisifyAll(new AllianceDao(redisClient, scripto, "production"))
var playerDao = Promise.promisifyAll(new PlayerDao(redisClient, scripto, "production"))


var ClearTestAccount = function(callback){
	var funcs = []
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId2))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId2))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId3))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId3))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId4))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId4))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId5))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId5))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId6))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId6))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId7))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId7))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId8))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId8))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId9))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId9))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId10))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId10))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId11))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId11))
	funcs.push(playerDao.removeLockByIndexAsync("countInfo.deviceId", Config.deviceId12))
	funcs.push(playerDao.deleteByIndexAsync("countInfo.deviceId", Config.deviceId12))

	Promise.all(funcs).then(function(){
		callback()
	})
}

var ClearAlliance = function(callback){
	var funcs = []
	funcs.push(allianceDao.removeLockByIndexAsync("basicInfo.name", Config.allianceName))
	funcs.push(allianceDao.deleteByIndexAsync("basicInfo.name", Config.allianceName))
	funcs.push(allianceDao.removeLockByIndexAsync("basicInfo.name", Config.allianceName2))
	funcs.push(allianceDao.deleteByIndexAsync("basicInfo.name", Config.allianceName2))
	funcs.push(allianceDao.removeLockByIndexAsync("basicInfo.name", Config.allianceName3))
	funcs.push(allianceDao.deleteByIndexAsync("basicInfo.name", Config.allianceName3))
	funcs.push(allianceDao.removeLockByIndexAsync("basicInfo.name", Config.allianceName4))
	funcs.push(allianceDao.deleteByIndexAsync("basicInfo.name", Config.allianceName4))
	funcs.push(allianceDao.removeLockByIndexAsync("basicInfo.name", Config.allianceName5))
	funcs.push(allianceDao.deleteByIndexAsync("basicInfo.name", Config.allianceName5))
	funcs.push(allianceDao.removeLockByIndexAsync("basicInfo.name", Config.allianceName6))
	funcs.push(allianceDao.deleteByIndexAsync("basicInfo.name", Config.allianceName6))

	Promise.all(funcs).then(function(){
		callback()
	})
}

var LoginPlayer = function(deviceId, callback){
	pomelo.disconnect()
	pomelo.init({
		host:Config.gateHost,
		port:Config.gatePort,
		log:true
	}, function(){
		var loginInfo = {
			deviceId:deviceId
		}
		var route = "gate.gateHandler.queryEntry"
		pomelo.request(route, loginInfo, function(doc){
			pomelo.disconnect()
			pomelo.init({
				host:doc.data.host,
				port:doc.data.port,
				log:true
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


var sendChat = function(text, callback){
	var info = {
		text:text,
		type:"global"
	}
	var route = "chat.chatHandler.send"
	pomelo.request(route, info, callback)
}

var upgradeBuilding = function(location, finishNow, callback){
	var info = {
		location:location,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeBuilding"
	pomelo.request(route, info, callback)
}

var createHouse = function(houseType, buildingLocation, houseLocation, finishNow, callback){
	var info = {
		buildingLocation:buildingLocation,
		houseType:houseType,
		houseLocation:houseLocation,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.createHouse"
	pomelo.request(route, info, callback)
}

var upgradeHouse = function(buildingLocation, houseLocation, finishNow, callback){
	var info = {
		buildingLocation:buildingLocation,
		houseLocation:houseLocation,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeHouse"
	pomelo.request(route, info, callback)
}

var destroyHouse = function(buildingLocation, houseLocation, callback){
	var info = {
		buildingLocation:buildingLocation,
		houseLocation:houseLocation
	}
	var route = "logic.playerHandler.destroyHouse"
	pomelo.request(route, info, callback)
}

var upgradeTower = function(location, finishNow, callback){
	var info = {
		location:location,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeTower"
	pomelo.request(route, info, callback)
}

var upgradeWall = function(finishNow, callback){
	var info = {
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeWall"
	pomelo.request(route, info, callback)
}

var makeMaterial = function(category, finishNow, callback){
	var info = {
		category:category,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.makeMaterial"
	pomelo.request(route, info, callback)
}

var getMaterials = function(category, callback){
	var info = {
		category:category
	}
	var route = "logic.playerHandler.getMaterials"
	pomelo.request(route, info, callback)
}

var recruitNormalSoldier = function(soldierName, count, finishNow, callback){
	var info = {
		soldierName:soldierName,
		count:count,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.recruitNormalSoldier"
	pomelo.request(route, info, callback)
}

var recruitSpecialSoldier = function(soldierName, count, finishNow, callback){
	var info = {
		soldierName:soldierName,
		count:count,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.recruitSpecialSoldier"
	pomelo.request(route, info, callback)
}

var makeDragonEquipment = function(equipmentName, finishNow, callback){
	var info = {
		equipmentName:equipmentName,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.makeDragonEquipment"
	pomelo.request(route, info, callback)
}

var treatSoldier = function(soldiers, finishNow, callback){
	var info = {
		soldiers:soldiers,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.treatSoldier"
	pomelo.request(route, info, callback)
}

var hatchDragon = function(dragonType, callback){
	var info = {
		dragonType:dragonType
	}
	var route = "logic.playerHandler.hatchDragon"
	pomelo.request(route, info, callback)
}

var setDragonEquipment = function(dragonType, equipmentCategory, equipmentName, callback){
	var info = {
		dragonType:dragonType,
		equipmentCategory:equipmentCategory,
		equipmentName:equipmentName
	}
	var route = "logic.playerHandler.setDragonEquipment"
	pomelo.request(route, info, callback)
}

var enhanceDragonEquipment = function(dragonType, equipmentCategory, equipments, callback){
	var info = {
		dragonType:dragonType,
		equipmentCategory:equipmentCategory,
		equipments:equipments
	}
	var route = "logic.playerHandler.enhanceDragonEquipment"
	pomelo.request(route, info, callback)
}

var resetDragonEquipment = function(dragonType, equipmentCategory, callback){
	var info = {
		dragonType:dragonType,
		equipmentCategory:equipmentCategory
	}
	var route = "logic.playerHandler.resetDragonEquipment"
	pomelo.request(route, info, callback)
}

var upgradeDragonDragonSkill = function(dragonType, skillLocation, callback){
	var info = {
		dragonType:dragonType,
		skillLocation:skillLocation
	}
	var route = "logic.playerHandler.upgradeDragonSkill"
	pomelo.request(route, info, callback)
}

var upgradeDragonStar = function(dragonType, callback){
	var info = {
		dragonType:dragonType
	}
	var route = "logic.playerHandler.upgradeDragonStar"
	pomelo.request(route, info, callback)
}

var impose = function(callback){
	var route = "logic.playerHandler.impose"
	pomelo.request(route, null, callback)
}

var createAlliance = function(name, tag, language, terrain, flag, callback){
	var info = {
		name:name,
		tag:tag,
		language:language,
		terrain:terrain,
		flag:flag
	}
	var route = "logic.playerHandler.createAlliance"
	pomelo.request(route, info, callback)
}

var searchAllianceByTag = function(tag, callback){
	var info = {
		tag:tag
	}
	var route = "logic.playerHandler.searchAllianceByTag"
	pomelo.request(route, info, callback)
}

var getCanDirectJoinAlliances = function(callback){
	var route = "logic.playerHandler.getCanDirectJoinAlliances"
	pomelo.request(route, null, callback)
}

var editAllianceBasicInfo = function(name, tag, language, terrain, flag, callback){
	var info = {
		name:name,
		tag:tag,
		language:language,
		terrain:terrain,
		flag:flag
	}
	var route = "logic.playerHandler.editAllianceBasicInfo"
	pomelo.request(route, info, callback)
}

var editTitleName = function(title, titleName, callback){
	var info = {
		title:title,
		titleName:titleName
	}
	var route = "logic.playerHandler.editTitleName"
	pomelo.request(route, info, callback)
}

var editAllianceNotice = function(notice, callback){
	var info = {
		notice:notice
	}
	var route = "logic.playerHandler.editAllianceNotice"
	pomelo.request(route, info, callback)
}

var editAllianceDescription = function(description, callback){
	var info = {
		description:description
	}
	var route = "logic.playerHandler.editAllianceDescription"
	pomelo.request(route, info, callback)
}

var editAllianceJoinType = function(joinType, callback){
	var info = {
		joinType:joinType
	}
	var route = "logic.playerHandler.editAllianceJoinType"
	pomelo.request(route, info, callback)
}

var modifyAllianceMemberTitle = function(memberId, title, callback){
	var info = {
		memberId:memberId,
		title:title
	}
	var route = "logic.playerHandler.modifyAllianceMemberTitle"
	pomelo.request(route, info, callback)
}

var getPlayerInfo = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.playerHandler.getPlayerInfo"
	pomelo.request(route, info, callback)
}

var kickAllianceMemberOff = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.playerHandler.kickAllianceMemberOff"
	pomelo.request(route, info, callback)
}

var handOverArchon = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.playerHandler.handOverArchon"
	pomelo.request(route, info, callback)
}

var sendMail = function(memberName, title, content, callback){
	var info = {
		memberName:memberName,
		title:title,
		content:content
	}
	var route = "logic.playerHandler.sendMail"
	pomelo.request(route, info, callback)
}

var readMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.readMail"
	pomelo.request(route, info, callback)
}

var saveMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.saveMail"
	pomelo.request(route, info, callback)
}

var unSaveMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.unSaveMail"
	pomelo.request(route, info, callback)
}

var deleteMail = function(mailId, callback){
	var info = {
		mailId:mailId
	}
	var route = "logic.playerHandler.deleteMail"
	pomelo.request(route, info, callback)
}

var getMails = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getMails"
	pomelo.request(route, info, callback)
}

var getSendMails = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getSendMails"
	pomelo.request(route, info, callback)
}

var getSavedMails = function(fromIndex, callback){
	var info = {
		fromIndex:fromIndex
	}
	var route = "logic.playerHandler.getSavedMails"
	pomelo.request(route, info, callback)
}

var sendAllianceMail = function(title, content, callback){
	var info = {
		title:title,
		content:content
	}
	var route = "logic.playerHandler.sendAllianceMail"
	pomelo.request(route, info, callback)
}

var quitAlliance = function(callback){
	var route = "logic.playerHandler.quitAlliance"
	pomelo.request(route, null, callback)
}

var requestToJoinAlliance = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.playerHandler.requestToJoinAlliance"
	pomelo.request(route, info, callback)
}

var cancelJoinAllianceRequest = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.playerHandler.cancelJoinAllianceRequest"
	pomelo.request(route, info, callback)
}

var setPlayerLanguage = function(language, callback){
	var info = {
		language:language
	}
	var route = "logic.playerHandler.setPlayerLanguage"
	pomelo.request(route, info, callback)
}

var handleJoinAllianceRequest = function(memberId, agree, callback){
	var info = {
		memberId:memberId,
		agree:agree
	}
	var route = "logic.playerHandler.handleJoinAllianceRequest"
	pomelo.request(route, info, callback)
}

var inviteToJoinAlliance = function(memberId, callback){
	var info = {
		memberId:memberId
	}
	var route = "logic.playerHandler.inviteToJoinAlliance"
	pomelo.request(route, info, callback)
}

var handleJoinAllianceInvite = function(allianceId, agree, callback){
	var info = {
		allianceId:allianceId,
		agree:agree
	}
	var route = "logic.playerHandler.handleJoinAllianceInvite"
	pomelo.request(route, info, callback)
}

var joinAllianceDirectly = function(allianceId, callback){
	var info = {
		allianceId:allianceId
	}
	var route = "logic.playerHandler.joinAllianceDirectly"
	pomelo.request(route, info, callback)
}

var helpAllianceMemberSpeedUp = function(eventIndex, callback){
	var info = {
		eventIndex:eventIndex
	}
	var route = "logic.playerHandler.helpAllianceMemberSpeedUp"
	pomelo.request(route, info, callback)
}

var getMyAllianceData = function(callback){
	var route = "logic.playerHandler.getMyAllianceData"
	pomelo.request(route, null, callback)
}

describe("LogicServer", function(){
	var m_user

	before(function(done){
		ClearTestAccount(function(){
			ClearAlliance(function(){
				done()
			})
		})
	})


	describe("entryHandler", function(){
		it("login", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				done()
			})
			var onPlayerLoginSuccess = function(doc){
				m_user = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})
	})


	describe("playerHandler", function(){
		it("upgradeBuilding buildingLocation 不合法", function(done){
			upgradeBuilding(26, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("buildingLocation 不合法")
				done()
			})
		})

		it("upgradeBuilding 建筑不存在", function(done){
			upgradeBuilding(25, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑不存在")
				done()
			})
		})

		it("upgradeBuilding 建筑正在升级", function(done){
			upgradeBuilding(1, false, function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(1, false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("建筑正在升级")
					done()
				})
			})
		})

		it("upgradeBuilding 建筑还未建造", function(done){
			upgradeBuilding(10, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑还未建造")
				done()
			})
		})

		it("upgradeBuilding 建筑建造时,建筑坑位不合法", function(done){
			upgradeBuilding(7, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑建造时,建筑坑位不合法")
				done()
			})
		})

		it("upgradeBuilding 建造数量已达建造上限", function(done){
			upgradeBuilding(6, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建造数量已达建造上限")
				done()
			})
		})

		it("upgradeBuilding 建筑升级时,建筑等级不合法", function(done){
			upgradeBuilding(2, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑升级时,建筑等级不合法")
				done()
			})
		})

		it("upgradeBuilding 建筑已达到最高等级", function(done){
			var func = function(){
				var buildingInfo = {
					location:1,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					if(doc.code == 200){
						func()
					}else{
						doc.code.should.equal(500)
						done()
					}
				})
			}

			sendChat("keep 22", function(doc){
				doc.code.should.equal(200)
				func()
			})
		})

		it("upgradeBuilding 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(3, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeBuilding 正常普通升级", function(done){
			sendChat("rmbuildingevents", function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(2, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("upgradeBuilding 正常升级立即完成", function(done){
			upgradeBuilding(3, true, function(doc){
				doc.code.should.equal(200)
				sendChat("rmbuildingevents", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("createHouse buildingLocation 不合法", function(done){
			createHouse("dwelling", 26, 1, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("buildingLocation 不合法")
				done()
			})
		})

		it("createHouse houseLocation 不合法", function(done){
			createHouse("dwelling", 25, 4, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("houseLocation 不合法")
				done()
			})
		})

		it("createHouse 主体建筑不存在", function(done){
			createHouse("dwelling", 25, 1, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑不存在")
				done()
			})
		})

		it("createHouse 主体建筑必须大于等于1级", function(done){
			createHouse("dwelling", 5, 1, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑必须大于等于1级")
				done()
			})
		})

		it("createHouse 小屋类型不存在", function(done){
			createHouse("dwellinga", 3, 1, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("小屋类型不存在")
				done()
			})
		})

		it("createHouse 小屋数量超过限制", function(done){
			var createHouse = function(buildingLocation, houseLocation, callback){
				var houseInfo = {
					buildingLocation:buildingLocation,
					houseType:"dwelling",
					houseLocation:houseLocation,
					finishNow:true
				}
				var route = "logic.playerHandler.createHouse"
				pomelo.request(route, houseInfo, function(doc){
					callback(doc)
				})
			}

			var clearEvents = function(callback){
				var chatInfo = {
					text:"rmbuildingevents",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}

			var destroyHouse = function(buildingLocation, houseLocation, callback){
				var houseInfo = {
					buildingLocation:buildingLocation,
					houseLocation:houseLocation
				}
				var route = "logic.playerHandler.destroyHouse"
				pomelo.request(route, houseInfo, function(doc){
					callback(doc)
				})
			}

			var upgradeBuilding = function(){
				var buildingInfo = {
					location:6,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					doc.code.should.equal(200)

					createHouse(3, 1, function(doc){
						doc.code.should.equal(200)
						createHouse(3, 2, function(doc){
							doc.code.should.equal(200)
							createHouse(3, 3, function(doc){
								doc.code.should.equal(200)
								createHouse(6, 1, function(doc){
									doc.code.should.equal(500)
									doc.message.should.equal("小屋数量超过限制")

									clearEvents(function(doc){
										doc.code.should.equal(200)
										destroyHouse(3, 1, function(doc){
											doc.code.should.equal(200)
											destroyHouse(3, 2, function(doc){
												doc.code.should.equal(200)
												destroyHouse(3, 3, function(doc){
													doc.code.should.equal(200)
													done()
												})
											})
										})
									})
								})
							})
						})
					})
				})
			}

			upgradeBuilding()
		})

		it("createHouse 建筑周围不允许建造小屋", function(done){
			createHouse("dwelling", 1, 1, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑周围不允许建造小屋")
				done()
			})
		})

		it("createHouse 创建小屋时,小屋坑位不合法", function(done){
			createHouse("dwelling", 3, 1, false, function(doc){
				doc.code.should.equal(200)
				createHouse("dwelling", 3, 1, false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("创建小屋时,小屋坑位不合法")
					done()
				})
			})
		})

		it("createHouse 建造小屋会造成可用城民小于0", function(done){
			createHouse("farmer", 3, 3, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建造小屋会造成可用城民小于0")
				done()
			})
		})

		it("createHouse 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				createHouse("dwelling", 3, 2, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("createHouse 正常加速创建", function(done){
			createHouse("dwelling", 3, 2, true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("createHouse 正常普通创建", function(done){
			sendChat("rmbuildingevents", function(doc){
				doc.code.should.equal(200)
				createHouse("farmer", 3, 3, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("upgradeHouse 主体建筑必须大于等于1级", function(done){
			var houseInfo = {
				buildingLocation:5,
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑必须大于等于1级")
				done()
			})
		})

		it("upgradeHouse 小屋不存在", function(done){
			var houseInfo = {
				buildingLocation:4,
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("小屋不存在")
				done()
			})
		})

		it("upgradeHouse 小屋正在升级", function(done){
			sendChat("rmbuildingevents", function(doc){
				doc.code.should.equal(200)
				upgradeHouse(3, 1, false, function(doc){
					doc.code.should.equal(200)
					upgradeHouse(3, 1, false, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("小屋正在升级")
						done()
					})
				})
			})
		})

		it("upgradeHouse 小屋已达到最高等级", function(done){
			var func = function(){
				var buildingInfo = {
					buildingLocation:3,
					houseLocation:2,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeHouse"
				pomelo.request(route, buildingInfo, function(doc){
					if(doc.code == 200){
						func()
					}else{
						doc.code.should.equal(500)
						doc.message.should.equal("小屋已达到最高等级")

						sendChat("gem 5000", function(doc){
							doc.code.should.equal(200)
							done()
						})
					}
				})
			}

			sendChat("gem 5000000", function(doc){
				doc.code.should.equal(200)
				func()
			})
		})

		it("upgradeHouse 升级小屋会造成可用城民小于0", function(done){
			sendChat("citizen 0", function(doc){
				doc.code.should.equal(200)
				upgradeHouse(3, 3, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("升级小屋会造成可用城民小于0")
					sendChat("citizen 100", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})

			})
		})

		it("upgradeHouse 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				upgradeHouse(3, 3, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeHouse 正常升级", function(done){
			upgradeHouse(3, 3, true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("destroyHouse 主体建筑不存在", function(done){
			destroyHouse(25, 1, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑不存在")
				done()
			})
		})

		it("destroyHouse 小屋不存在", function(done){
			destroyHouse(4, 1, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("小屋不存在")
				done()
			})
		})

		it("destroyHouse 拆除此建筑后会造成可用城民数量小于0", function(done){
			destroyHouse(3, 2, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("拆除此建筑后会造成可用城民数量小于0")
				done()
			})
		})

		it("destroyHouse 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				destroyHouse(3, 3, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("destroyHouse 正常拆除", function(done){
			destroyHouse(3, 3, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeTower towerLocation 不合法", function(done){
			upgradeTower(20, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("towerLocation 不合法")
				done()
			})
		})

		it("upgradeTower 箭塔正在升级", function(done){
			sendChat("rmbuildingevents", function(doc){
				doc.code.should.equal(200)
				upgradeTower(1, false, function(doc){
					doc.code.should.equal(200)
					upgradeTower(1, false, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("箭塔正在升级")
						done()
					})
				})
			})
		})

		it("upgradeTower 箭塔还未建造", function(done){
			upgradeTower(9, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("箭塔还未建造")
				done()
			})
		})

		it("upgradeTower 箭塔已达到最高等级", function(done){
			var func = function(){
				upgradeTower(2, true, function(doc){
					if(doc.code == 200){
						func()
					}else{
						doc.code.should.equal(500)
						doc.message.should.equal("箭塔已达到最高等级")

						sendChat("gem 5000", function(doc){
							doc.code.should.equal(200)
							done()
						})
					}
				})
			}

			sendChat("gem 5000000", function(doc){
				doc.code.should.equal(200)
				func()
			})
		})

		it("upgradeTower 箭塔升级时,建筑等级不合法", function(done){
			sendChat("building 5", function(doc){
				doc.code.should.equal(200)
				upgradeTower(1, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("箭塔升级时,建筑等级不合法")
					sendChat("keep 6", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeTower 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				upgradeTower(1, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeTower 正常升级", function(done){
			upgradeTower(1, true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeWall 城墙正在升级", function(done){
			upgradeWall(false, function(doc){
				doc.code.should.equal(200)
				upgradeWall(false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("城墙正在升级")
					sendChat("rmbuildingevents", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeWall 城墙已达到最高等级", function(done){
			var func = function(){
				upgradeWall(true, function(doc){
					if(doc.code == 200){
						func()
					}else{
						doc.code.should.equal(500)
						doc.message.should.equal("城墙已达到最高等级")

						sendChat("gem 5000", function(doc){
							doc.code.should.equal(200)
							done()
						})
					}
				})
			}

			sendChat("gem 5000000", function(doc){
				doc.code.should.equal(200)
				sendChat("keep 22", function(doc){
					doc.code.should.equal(200)
					func()
				})
			})
		})

		it("upgradeWall 城墙升级时,城墙等级不合法", function(done){
			sendChat("building 5", function(doc){
				doc.code.should.equal(200)
				upgradeWall(true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("城墙升级时,城墙等级不合法")
					sendChat("keep 6", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeWall 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				upgradeWall(true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeWall 正常升级", function(done){
			upgradeWall(true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("makeMaterial 工具作坊还未建造", function(done){
			makeMaterial(Consts.MaterialType.Building, true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("工具作坊还未建造")
				done()
			})
		})

		it("makeMaterial 同类型的材料正在制造", function(done){
			upgradeBuilding(5, true, function(doc){
				doc.code.should.equal(200)
				makeMaterial(Consts.MaterialType.Building, false, function(doc){
					doc.code.should.equal(200)
					makeMaterial(Consts.MaterialType.Building, false, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("同类型的材料正在制造")
						done()
					})
				})
			})
		})

		it("makeMaterial 不同类型的材料正在制造", function(done){
			makeMaterial(Consts.MaterialType.Technology, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("不同类型的材料正在制造")
				done()
			})
		})

		it("makeMaterial 同类型的材料制作完成后还未领取", function(done){
			sendChat("rmmaterialevents", function(doc){
				doc.code.should.equal(200)
				makeMaterial(Consts.MaterialType.Technology, true, function(doc){
					doc.code.should.equal(200)
					makeMaterial(Consts.MaterialType.Technology, true, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("同类型的材料制作完成后还未领取")
						done()
					})
				})
			})
		})

		it("makeMaterials 正常制造", function(done){
			sendChat("rmmaterialevents", function(doc){
				doc.code.should.equal(200)
				makeMaterial(Consts.MaterialType.Building, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("getMaterials 没有材料建造事件存在", function(done){
			getMaterials(Consts.MaterialType.Technology, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("没有材料建造事件存在")
				done()
			})
		})

		it("getMaterials 同类型的材料正在制造", function(done){
			getMaterials(Consts.MaterialType.Building, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("同类型的材料正在制造")
				done()
			})
		})

		it("getMaterials 正常领取", function(done){
			makeMaterial(Consts.MaterialType.Technology, true, function(doc){
				doc.code.should.equal(200)
				getMaterials(Consts.MaterialType.Technology, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("recruitNormalSoldier soldierName 普通兵种不存在", function(done){
			recruitNormalSoldier("adf", 12, true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("soldierName 普通兵种不存在")
				done()
			})
		})

		it("recruitNormalSoldier 兵营还未建造", function(done){
			recruitNormalSoldier("swordsman", 12, true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("兵营还未建造")
				done()
			})
		})

		it("recruitNormalSoldier 招募数量超过单次招募上限", function(done){
			upgradeBuilding(8, true, function(doc){
				doc.code.should.equal(200)
				recruitNormalSoldier("swordsman", 500, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("招募数量超过单次招募上限")
					done()
				})
			})
		})

		it("recruitNormalSoldier 已有士兵正在被招募", function(done){
			recruitNormalSoldier("swordsman", 5, false, function(doc){
				doc.code.should.equal(200)
				recruitNormalSoldier("swordsman", 5, false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("已有士兵正在被招募")
					done()
				})
			})
		})

		it("recruitNormalSoldier 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				recruitNormalSoldier("swordsman", 5, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("recruitNormalSoldier 正常立即招募", function(done){
			recruitNormalSoldier("swordsman", 5, true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("recruitNormalSoldier 正常普通招募", function(done){
			sendChat("rmsoldierevents", function(doc){
				doc.code.should.equal(200)
				recruitNormalSoldier("swordsman", 5, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("recruitSpecialSoldier soldierName 特殊兵种不存在", function(done){
			recruitSpecialSoldier("adf", 12, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("soldierName 特殊兵种不存在")
				done()
			})
		})

		it("recruitSpecialSoldier 招募数量超过单次招募上限", function(done){
			sendChat("rmsoldierevents", function(doc){
				doc.code.should.equal(200)
				recruitSpecialSoldier("skeletonWarrior", 100, false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("招募数量超过单次招募上限")
					done()
				})
			})
		})

		it("recruitSpecialSoldier 已有士兵正在被招募", function(done){
			sendChat("rmsoldierevents", function(doc){
				doc.code.should.equal(200)
				recruitSpecialSoldier("skeletonWarrior", 5, false, function(doc){
					doc.code.should.equal(200)
					recruitSpecialSoldier("skeletonWarrior", 5, false, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("已有士兵正在被招募")
						done()
					})
				})
			})
		})

		it("recruitSpecialSoldier 材料不足", function(done){
			sendChat("soldiermaterial 0", function(doc){
				doc.code.should.equal(200)
				recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("材料不足")
					sendChat("soldiermaterial 1000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("recruitSpecialSoldier 正常立即招募", function(done){
			sendChat("rmsoldierevents", function(doc){
				doc.code.should.equal(200)
				recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("recruitSpecialSoldier 正常普通招募", function(done){
			recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("makeDragonEquipment equipmentName 装备不存在", function(done){
			makeDragonEquipment("adf", true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("equipmentName 装备不存在")
				done()
			})
		})

		it("makeDragonEquipment 铁匠铺还未建造", function(done){
			makeDragonEquipment("moltenCrown", true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("铁匠铺还未建造")
				done()
			})
		})

		it("makeDragonEquipment 材料不足", function(done){
			sendChat("dragonmaterial 0", function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(9, true, function(doc){
					doc.code.should.equal(200)
					makeDragonEquipment("moltenCrown", true, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("材料不足")
						sendChat("dragonmaterial 1000", function(doc){
							doc.code.should.equal(200)
							done()
						})
					})
				})
			})
		})

		it("makeDragonEquipment 已有装备正在制作", function(done){
			makeDragonEquipment("moltenCrown", false, function(doc){
				doc.code.should.equal(200)
				makeDragonEquipment("moltenCrown", false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("已有装备正在制作")
					done()
				})
			})
		})

		it("makeDragonEquipment 正常普通制造", function(done){
			sendChat("rmdragonequipmentevents", function(doc){
				doc.code.should.equal(200)
				makeDragonEquipment("moltenCrown", false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("makeDragonEquipment 正常立即制造", function(done){
			makeDragonEquipment("moltenCrown", true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("treatSoldier soldiers 不合法", function(done){
			treatSoldier("ad", true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("soldiers 不合法")
				done()
			})
		})

		it("treatSoldier 医院还未建造", function(done){
			treatSoldier([], true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("医院还未建造")
				done()
			})
		})

		it("treatSoldier 士兵不存在或士兵数量不合法1", function(done){
			upgradeBuilding(1, true, function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(7, true, function(doc){
					doc.code.should.equal(200)
					upgradeBuilding(14, true, function(doc){
						doc.code.should.equal(200)
						treatSoldier([], true, function(doc){
							doc.code.should.equal(500)
							doc.message.should.equal("士兵不存在或士兵数量不合法")
							done()
						})
					})
				})
			})
		})

		it("treatSoldier 士兵不存在或士兵数量不合法2", function(done){
			treatSoldier([
				{name:"add", count:12}
			], true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("士兵不存在或士兵数量不合法")
				done()
			})
		})

		it("treatSoldier 士兵不存在或士兵数量不合法3", function(done){
			treatSoldier([
				{name:"swordsman", count:1}
			], true, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("士兵不存在或士兵数量不合法")
				done()
			})
		})

		it("treatSoldier 士兵不存在或士兵数量不合法4", function(done){
			sendChat("addtreatsoldiers 5", function(doc){
				doc.code.should.equal(200)
				treatSoldier([
					{name:"swordsman", count:6}
				], true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("士兵不存在或士兵数量不合法")
					done()
				})
			})
		})

		it("treatSoldier 士兵不存在或士兵数量不合法5", function(done){
			treatSoldier([
				{name:"swordsman", count:5}
			], true, function(doc){
				doc.code.should.equal(200)
				treatSoldier([
					{name:"swordsman", count:5}
				], true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("士兵不存在或士兵数量不合法")
					done()
				})
			})
		})

		it("treatSoldier 已有士兵正在治疗", function(done){
			treatSoldier([
				{name:"sentinel", count:5},
				{name:"archer", count:5}
			], false, function(doc){
				doc.code.should.equal(200)
				treatSoldier([
					{name:"crossbowman", count:5}
				], false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("已有士兵正在治疗")
					done()
				})
			})
		})

		it("treatSoldier 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				treatSoldier([
					{name:"crossbowman", count:5}
				], true, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("treatSoldier 正常普通治疗", function(done){
			sendChat("addtreatsoldiers 5", function(doc){
				doc.code.should.equal(200)
				sendChat("rmtreatsoldierevents", function(doc){
					doc.code.should.equal(200)
					treatSoldier([
						{name:"sentinel", count:5},
						{name:"archer", count:5}
					], false, function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("treatSoldier 正常加速治疗", function(done){
			treatSoldier([
				{name:"catapult", count:5}
			], true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("hatchDragon 能量不足", function(done){
			sendChat("energy 0", function(doc){
				doc.code.should.equal(200)
				hatchDragon("redDragon", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("能量不足")
					sendChat("energy 100", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("hatchDragon 龙蛋早已成功孵化", function(done){
			sendChat("dragonvitality redDragon 90", function(doc){
				doc.code.should.equal(200)
				hatchDragon("redDragon", function(doc){
					doc.code.should.equal(200)
					hatchDragon("redDragon", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("龙蛋早已成功孵化")
						done()
					})
				})
			})
		})

		it("setDragonEquipment dragonType 不合法", function(done){
			setDragonEquipment("redDragona", "crown", "moltenCrown", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("dragonType 不合法")
				done()
			})
		})

		it("setDragonEquipment equipmentCategory 不合法", function(done){
			setDragonEquipment("redDragon", "crowna", "moltenCrown", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("equipmentCategory 不合法")
				done()
			})
		})

		it("setDragonEquipment equipmentName 不合法", function(done){
			setDragonEquipment("redDragon", "crown", "moltenCrowna", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("equipmentName 不合法")
				done()
			})
		})

		it("setDragonEquipment equipmentName 不能装备到equipmentCategory", function(done){
			setDragonEquipment("redDragon", "crown", "fireSuppressChest", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("equipmentName 不能装备到equipmentCategory")
				done()
			})
		})

		it("setDragonEquipment equipmentName 不能装备到dragonType", function(done){
			setDragonEquipment("redDragon", "crown", "glacierCrown", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("equipmentName 不能装备到dragonType")
				done()
			})
		})

		it("setDragonEquipment 龙还未孵化", function(done){
			setDragonEquipment("blueDragon", "crown", "glacierCrown", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("龙还未孵化")
				done()
			})
		})

		it("setDragonEquipment 装备与龙的星级不匹配", function(done){
			setDragonEquipment("redDragon", "crown", "fireSuppressCrown", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("装备与龙的星级不匹配")
				done()
			})
		})

		it("setDragonEquipment 仓库中没有此装备", function(done){
			sendChat("dragonequipment 0", function(doc){
				doc.code.should.equal(200)
				setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("仓库中没有此装备")
					done()
				})
			})
		})

		it("setDragonEquipment 龙身上已经存在相同类型的装备", function(done){
			sendChat("dragonequipment 10", function(doc){
				doc.code.should.equal(200)
				setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
					doc.code.should.equal(200)
					setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("龙身上已经存在相同类型的装备")
						done()
					})
				})
			})
		})

		it("enhanceDragonEquipment 此分类还没有配置装备", function(done){
			enhanceDragonEquipment("redDragon", "chest", [], function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("此分类还没有配置装备")
				done()
			})
		})

		it("enhanceDragonEquipment 装备已到最高星级", function(done){
			sendChat("dragonequipmentstar redDragon 10", function(doc){
				doc.code.should.equal(200)
				enhanceDragonEquipment("redDragon", "crown", [
					{name:"moltenCrown", count:5}
				], function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("装备已到最高星级")
					done()
				})
			})
		})

		it("enhanceDragonEquipment 被强化的装备不存在或数量不足1", function(done){
			setDragonEquipment("redDragon", "armguardLeft", "moltenArmguard", function(doc){
				doc.code.should.equal(200)
				enhanceDragonEquipment("redDragon", "armguardLeft", [], function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("被强化的装备不存在或数量不足")
					done()
				})
			})
		})

		it("enhanceDragonEquipment 被强化的装备不存在或数量不足2", function(done){
			enhanceDragonEquipment("redDragon", "armguardLeft", [
				{name:"moltenArmguard", count:30}
			], function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("被强化的装备不存在或数量不足")
				done()
			})
		})

		it("enhanceDragonEquipment 被强化的装备不存在或数量不足3", function(done){
			enhanceDragonEquipment("redDragon", "armguardLeft", [
				{name:"moltenArmguarda", count:5}
			], function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("被强化的装备不存在或数量不足")
				done()
			})
		})

		it("enhanceDragonEquipment 被强化的装备不存在或数量不足4", function(done){
			enhanceDragonEquipment("redDragon", "armguardLeft", [
				{name:"moltenArmguard", count:-1}
			], function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("被强化的装备不存在或数量不足")
				done()
			})
		})

		it("enhanceDragonEquipment 正常强化", function(done){
			enhanceDragonEquipment("redDragon", "armguardLeft", [
				{name:"moltenArmguard", count:5}
			], function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("resetDragonEquipment 此分类还没有配置装备", function(done){
			resetDragonEquipment("redDragon", "chest", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("此分类还没有配置装备")
				done()
			})
		})

		it("resetDragonEquipment 仓库中没有此装备", function(done){
			sendChat("dragonequipment 0", function(doc){
				doc.code.should.equal(200)
				resetDragonEquipment("redDragon", "crown", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("仓库中没有此装备")
					sendChat("dragonequipment 10", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("resetDragonEquipment 正常重置", function(done){
			resetDragonEquipment("redDragon", "crown", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeDragonSkill skillLocation 不合法1", function(done){
			upgradeDragonDragonSkill("redDragon", 0, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("skillLocation 不合法")
				done()
			})
		})

		it("upgradeDragonSkill skillLocation 不合法2", function(done){
			upgradeDragonDragonSkill("redDragon", 1.5, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("skillLocation 不合法")
				done()
			})
		})

		it("upgradeDragonSkill 龙还未孵化", function(done){
			upgradeDragonDragonSkill("blueDragon", 1, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("龙还未孵化")
				done()
			})
		})

		it("upgradeDragonSkill 此技能还未解锁", function(done){
			upgradeDragonDragonSkill("redDragon", 2, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("此技能还未解锁")
				done()
			})
		})

		it("upgradeDragonSkill 技能已达最高等级", function(done){
			sendChat("dragonskill redDragon 60", function(doc){
				doc.code.should.equal(200)
				upgradeDragonDragonSkill("redDragon", 1, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("技能已达最高等级")
					done()
				})
			})
		})

		it("upgradeDragonSkill 能量不足", function(done){
			sendChat("dragonskill redDragon 0", function(doc){
				doc.code.should.equal(200)
				sendChat("energy 0", function(doc){
					doc.code.should.equal(200)
					upgradeDragonDragonSkill("redDragon", 1, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("能量不足")
						sendChat("energy 100", function(doc){
							doc.code.should.equal(200)
							done()
						})
					})
				})
			})
		})

		it("upgradeDragonSkill 英雄之血不足", function(done){
			sendChat("blood 0", function(doc){
				doc.code.should.equal(200)
				upgradeDragonDragonSkill("redDragon", 1, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("英雄之血不足")
					sendChat("blood 1000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("upgradeDragonSkill 正常升级", function(done){
			upgradeDragonDragonSkill("redDragon", 1, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeDragonStar 龙还未孵化", function(done){
			upgradeDragonStar("blueDragon", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("龙还未孵化")
				done()
			})
		})

		it("upgradeDragonStar 龙的星级已达最高", function(done){
			sendChat("dragonstar redDragon 10", function(doc){
				doc.code.should.equal(200)
				upgradeDragonStar("redDragon", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("龙的星级已达最高")
					done()
				})
			})
		})

		it("upgradeDragonStar 龙的等级未达到晋级要求", function(done){
			sendChat("dragonstar redDragon 1", function(doc){
				doc.code.should.equal(200)
				sendChat("dragonstar redDragon 2", function(doc){
					doc.code.should.equal(200)
					upgradeDragonStar("redDragon", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("龙的等级未达到晋级要求")
						done()
					})
				})
			})
		})

		it("upgradeDragonStar 龙的装备未达到晋级要求", function(done){
			sendChat("dragonstar redDragon 1", function(doc){
				doc.code.should.equal(200)
				upgradeDragonStar("redDragon", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("龙的装备未达到晋级要求")
					done()
				})
			})
		})

		it("upgradeDragonStar 正常晋级", function(done){
			setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
				doc.code.should.equal(200)
				setDragonEquipment("redDragon", "armguardLeft", "moltenArmguard", function(doc){
					doc.code.should.equal(200)
					setDragonEquipment("redDragon", "armguardRight", "moltenArmguard", function(doc){
						doc.code.should.equal(200)
						sendChat("dragonequipmentstar redDragon 5", function(doc){
							doc.code.should.equal(200)
							upgradeDragonStar("redDragon", function(doc){
								doc.code.should.equal(200)
								done()
							})
						})
					})
				})
			})
		})

		it("impose 市政厅还未建造", function(done){
			impose(function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("市政厅还未建造")
				done()
			})
		})

		it("impose 空闲城民不足", function(done){
			sendChat("gem 500000", function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(1, true, function(doc){
					doc.code.should.equal(200)
					upgradeBuilding(8, true, function(doc){
						doc.code.should.equal(200)
						upgradeBuilding(9, true, function(doc){
							doc.code.should.equal(200)
							upgradeBuilding(15, true, function(doc){
								doc.code.should.equal(200)
								sendChat("citizen 0", function(doc){
									doc.code.should.equal(200)
									impose(function(doc){
										doc.code.should.equal(500)
										doc.message.should.equal("空闲城民不足")
										done()
									})
								})
							})
						})
					})
				})
			})
		})

		it("impose 正在收税中", function(done){
			sendChat("citizen 1600", function(doc){
				doc.code.should.equal(200)
				impose(function(doc){
					doc.code.should.equal(200)
					impose(function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("正在收税中")
						done()
					})
				})
			})
		})

		it("setPlayerLanguage", function(done){
			setPlayerLanguage("cn", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getPlayerInfo", function(done){
			getPlayerInfo(m_user._id, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("sendMail 不能给自己发邮件", function(done){
			sendMail(m_user.basicInfo.name, "testMail", "this is a testMail", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("不能给自己发邮件")
				done()
			})
		})

		it("sendMail 玩家不存在", function(done){
			sendMail("adfadf", "testMail", "this is a testMail", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("玩家不存在")
				done()
			})
		})

		it("sendMail 正常发送", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				sendMail(m_user.basicInfo.name, "testMail", "this is a testMail", function(doc){
					doc.code.should.equal(200)
					LoginPlayer(Config.deviceId, function(doc){
						doc.code.should.equal(200)
						done()
					})
					var onPlayerLoginSuccess = function(doc){
						m_user = doc
						pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
					}
					pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
				})
			})
		})

		it("readMail 正常阅读", function(done){
				readMail(m_user.mails[0].id, function(doc){
					doc.code.should.equal(200)
					done()
				})
		})

		it("saveMail 正常收藏", function(done){
			saveMail(m_user.mails[0].id, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("unSaveMail 正常取消收藏", function(done){
			unSaveMail(m_user.mails[0].id, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getMails 获取邮件", function(done){
			getMails(0, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getSendMails 获取已发邮件", function(done){
			getSendMails(0, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getSavedMails 获取已存邮件", function(done){
			getSavedMails(0, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("deleteMail 正常删除收藏", function(done){
			deleteMail(m_user.mails[0].id, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("createAlliance language 不合法", function(done){
			createAlliance(Config.allianceName, Config.allianceTag, "c", "grassLand", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("language 不合法")
				done()
			})
		})

		it("createAlliance terrain 不合法", function(done){
			createAlliance(Config.allianceName, Config.allianceTag, "cn", "d", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("terrain 不合法")
				done()
			})
		})

		it("createAlliance 宝石不足", function(done){
			sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("createAlliance 正常创建", function(done){
			createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("createAlliance 玩家已加入了联盟", function(done){
			createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("玩家已加入了联盟")
				done()
			})
		})

		it("createAlliance 联盟名称已经存在", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟名称已经存在")
					done()
				})
			})
		})

		it("createAlliance 联盟标签已经存在", function(done){
			createAlliance("Hello", Config.allianceTag, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("联盟标签已经存在")
				done()
			})
		})

		it("sendAllianceMail 玩家未加入联盟", function(done){
			sendAllianceMail("alliance mail", "this is a alliance mail", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("玩家未加入联盟")
				LoginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					done()
				})
				var onPlayerLoginSuccess = function(doc){
					m_user = doc
					pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
				}
				pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
			})
		})

		it("sendAllianceMail 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				joinAllianceDirectly(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					sendAllianceMail("alliance mail", "this is a alliance mail", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("此操作权限不足")
						done()
					})
				})
			})
		})

		it("sendAllianceMail 正常发送", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				sendAllianceMail("alliance mail", "this is a alliance mail", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceBasicInfo 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				editAllianceBasicInfo(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceBasicInfo 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				editAllianceBasicInfo(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceBasicInfo 联盟名称已经存在", function(done){
			LoginPlayer(Config.deviceId4, function(doc){
				doc.code.should.equal(200)
				createAlliance("31231", Config.allianceTag2, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(200)
					editAllianceBasicInfo(Config.allianceName, "adfad", "cn", "grassLand", "e", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("联盟名称已经存在")
						done()
					})
				})
			})
		})

		it("editAllianceBasicInfo 联盟标签已经存在", function(done){
			editAllianceBasicInfo("adfad", Config.allianceTag, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("联盟标签已经存在")
				done()
			})
		})

		it("editAllianceBasicInfo 正常修改", function(done){
			editAllianceBasicInfo(Config.allianceName2, Config.allianceTag2, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("editTitleName 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				editTitleName("archon", "老大", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editTitleName 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				editTitleName("archon", "老大", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editTitleName 正常修改", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				editTitleName("archon", "老大", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceNotice 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				editAllianceNotice("这是第一条公告", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceNotice 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				editAllianceNotice("这是第一条公告", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceNotice 正常发布公告", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				editAllianceNotice("这是第一条公告", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceDescription 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				editAllianceDescription("这是第一条描述", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceDescription 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				editAllianceDescription("这是第一条描述", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceDescription 正常修改联盟描述", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				editAllianceDescription("这是第一条描述", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceJoinType 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				editAllianceJoinType("all", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceJoinType 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				editAllianceJoinType("all", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceJoinType 正常修改联盟描述", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				editAllianceJoinType("all", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("modifyAllianceMemberTitle 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				modifyAllianceMemberTitle("asdfasdf", "general", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("modifyAllianceMemberTitle 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				modifyAllianceMemberTitle("asdfasdf", "general", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("modifyAllianceMemberTitle 联盟没有此玩家", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				modifyAllianceMemberTitle("asdfasdf", "general", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟没有此玩家")
					done()
				})
			})
		})

		it("modifyAllianceMemberTitle 不能将玩家的职级调整到与自己平级或者比自己高", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				LoginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					modifyAllianceMemberTitle(memberDoc._id, "archon", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("不能将玩家的职级调整到与自己平级或者比自己高")
						done()
					})
				})
			})
			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("modifyAllianceMemberTitle 正常编辑", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				LoginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					modifyAllianceMemberTitle(memberDoc._id, "general", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("kickAllianceMemberOff 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				kickAllianceMemberOff("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("kickAllianceMemberOff 此操作权限不足", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				kickAllianceMemberOff("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("kickAllianceMemberOff 联盟没有此玩家", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				kickAllianceMemberOff("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟没有此玩家")
					done()
				})
			})
		})

		it("kickAllianceMemberOff 正常踢出", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				LoginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					kickAllianceMemberOff(memberDoc._id, function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("handOverArchon 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				handOverArchon("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("handOverArchon 别逗了,你是不盟主好么", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				joinAllianceDirectly(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					handOverArchon("asdfasdf", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("别逗了,你是不盟主好么")
						done()
					})
				})
			})
		})

		it("handOverArchon 玩家不存在", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				handOverArchon("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家不存在")
					done()
				})
			})
		})

		it("handOverArchon 正常移交", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				LoginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					handOverArchon(memberDoc._id, function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("quitAlliance 玩家未加入联盟", function(done){
			LoginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				quitAlliance(function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("quitAlliance 正常退出", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				quitAlliance(function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("joinAllianceDirectly 玩家已加入联盟", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				joinAllianceDirectly("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家已加入联盟")
					done()
				})
			})
		})

		it("joinAllianceDirectly 联盟不存在", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				joinAllianceDirectly("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟不存在")
					done()
				})
			})
		})

		it("joinAllianceDirectly 联盟不允许直接加入", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				editAllianceJoinType("audit", function(doc){
					doc.code.should.equal(200)
					LoginPlayer(Config.deviceId, function(doc){
						doc.code.should.equal(200)
						joinAllianceDirectly(m_user.alliance.id, function(doc){
							doc.code.should.equal(500)
							doc.message.should.equal("联盟不允许直接加入")
							LoginPlayer(Config.deviceId3, function(doc){
								doc.code.should.equal(200)
								editAllianceJoinType("all", function(doc){
									doc.code.should.equal(200)
									done()
								})
							})
						})
					})
				})
			})
		})

		it("joinAllianceDirectly 正常加入", function(done){
			LoginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				joinAllianceDirectly(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("requestToJoinAlliance 玩家已加入联盟", function(done){
			requestToJoinAlliance(m_user.alliance.id, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("玩家已加入联盟")
				done()
			})
		})

		it("requestToJoinAlliance 对此联盟的申请已发出,请耐心等候审核", function(done){
			LoginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				requestToJoinAlliance(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					requestToJoinAlliance(m_user.alliance.id, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("对此联盟的申请已发出,请耐心等候审核")
						done()
					})
				})
			})
		})

		it("cancelJoinAllianceRequest 正常取消", function(done){
			cancelJoinAllianceRequest(m_user.alliance.id, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("handleJoinAllianceRequest 正常处理 拒绝加入", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				requestToJoinAlliance(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					LoginPlayer(Config.deviceId3, function(doc){
						doc.code.should.equal(200)
						handleJoinAllianceRequest(memberDoc._id, false, function(doc){
							doc.code.should.equal(200)
							done()
						})
					})
				})
			})

			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("handleJoinAllianceRequest 正常处理 允许加入", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				requestToJoinAlliance(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					LoginPlayer(Config.deviceId3, function(doc){
						doc.code.should.equal(200)
						handleJoinAllianceRequest(memberDoc._id, true, function(doc){
							doc.code.should.equal(200)
							done()
						})
					})
				})
			})
			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("inviteToJoinAlliance 正常邀请", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				quitAlliance(function(doc){
					doc.code.should.equal(200)
					LoginPlayer(Config.deviceId3, function(doc){
						doc.code.should.equal(200)
						inviteToJoinAlliance(memberDoc._id, function(doc){
							doc.code.should.equal(200)
							done()
						})
					})
				})
			})
			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("handleJoinAllianceInvite 正常处理 拒绝邀请", function(done){
			LoginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				handleJoinAllianceInvite(m_user.alliance.id, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("handleJoinAllianceInvite 正常处理 同意邀请", function(done){
			var memberDoc = null
			LoginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				LoginPlayer(Config.deviceId3, function(doc){
					doc.code.should.equal(200)
					inviteToJoinAlliance(memberDoc._id, function(doc){
						doc.code.should.equal(200)
						LoginPlayer(Config.deviceId4, function(doc){
							doc.code.should.equal(200)
							inviteToJoinAlliance(memberDoc._id, function(doc){
								doc.code.should.equal(200)
								LoginPlayer(Config.deviceId5, function(doc){
									doc.code.should.equal(200)
									handleJoinAllianceInvite(m_user.alliance.id, true, function(doc){
										doc.code.should.equal(200)
										done()
									})
								})
							})
						})
					})
				})
			})
			var onPlayerLoginSuccess = function(doc){
				memberDoc = doc
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})

		it("searchAllianceByTag 正常搜索", function(done){
			searchAllianceByTag("test", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getCanDirectJoinAlliances 正常获取", function(done){
			getCanDirectJoinAlliances(function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeBuilding 加入联盟后", function(done){
			upgradeBuilding(1, true, function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(1, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("createHouse 加入联盟后", function(done){
			createHouse("dwelling", 3, 3, false, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeHouse 加入联盟后", function(done){
			createHouse("dwelling", 3, 1, true, function(doc){
				doc.code.should.equal(200)
				upgradeHouse(3, 1, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("upgradeTower 加入联盟后", function(done){
			upgradeTower(1, false, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeWall 加入联盟后", function(done){
			upgradeWall(false, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("helpAllianceMemberSpeedUp 正常帮助1", function(done){
			LoginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				helpAllianceMemberSpeedUp(0, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("helpAllianceMemberSpeedUp 正常帮助2", function(done){
			helpAllianceMemberSpeedUp(1, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("helpAllianceMemberSpeedUp 正常帮助3", function(done){
			helpAllianceMemberSpeedUp(2, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("helpAllianceMemberSpeedUp 正常帮助4", function(done){
			helpAllianceMemberSpeedUp(1, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("helpAllianceMemberSpeedUp 正常帮助5", function(done){
			helpAllianceMemberSpeedUp(1, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getMyAllianceData 正常获取", function(done){
			getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				done()
			})
		})
	})


	after(function(){
		pomelo.disconnect()
	})
})