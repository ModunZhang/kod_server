/**
 * Created by modun on 14-7-25.
 */

var pomelo = require("../pomelo-client")
var redis = require("redis")
var path = require("path")
var Scripto = require('redis-scripto')
var Promise = require("bluebird")

var Consts = require("../../app/consts/consts")
var Config = require("../config")
var AllianceDao = require("../../app/dao/allianceDao")
var PlayerDao = require("../../app/dao/playerDao")
var Api = require("../api")

var commandDir = path.resolve(__dirname + "/../../app/commands")
var redisClient = redis.createClient(Config.redisPort, Config.redisAddr)
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



describe("AllianceService", function(){
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
			Api.loginPlayer(Config.deviceId, function(doc){
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


	describe("allianceHandler", function(){
		it("createAlliance language 不合法", function(done){
			Api.createAlliance(Config.allianceName, Config.allianceTag, "c", "grassLand", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("language 不合法")
				done()
			})
		})

		it("createAlliance terrain 不合法", function(done){
			Api.createAlliance(Config.allianceName, Config.allianceTag, "cn", "d", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("terrain 不合法")
				done()
			})
		})

		it("createAlliance 宝石不足", function(done){
			Api.sendChat("gem 0", function(doc){
				doc.code.should.equal(200)
				Api.createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")
					Api.sendChat("gem 5000", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("createAlliance 正常创建", function(done){
			Api.createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("createAlliance 玩家已加入了联盟", function(done){
			Api.createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("玩家已加入了联盟")
				done()
			})
		})

		it("createAlliance 联盟名称已经存在", function(done){
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.createAlliance(Config.allianceName, Config.allianceTag, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟名称已经存在")
					done()
				})
			})
		})

		it("createAlliance 联盟标签已经存在", function(done){
			Api.createAlliance("Hello", Config.allianceTag, "cn", "grassLand", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("联盟标签已经存在")
				done()
			})
		})

		it("sendAllianceMail 玩家未加入联盟", function(done){
			Api.sendAllianceMail("alliance mail", "this is a alliance mail", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("玩家未加入联盟")
				Api.loginPlayer(Config.deviceId, function(doc){
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
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.joinAllianceDirectly(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					Api.sendAllianceMail("alliance mail", "this is a alliance mail", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("此操作权限不足")
						done()
					})
				})
			})
		})

		it("sendAllianceMail 正常发送", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.sendAllianceMail("alliance mail", "this is a alliance mail", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceBasicInfo 玩家未加入联盟", function(done){
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceBasicInfo(Config.allianceName, Config.allianceTag, "cn", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceBasicInfo 此操作权限不足", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceBasicInfo(Config.allianceName, Config.allianceTag, "cn", "e", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceBasicInfo 联盟名称已经存在", function(done){
			Api.loginPlayer(Config.deviceId4, function(doc){
				doc.code.should.equal(200)
				Api.createAlliance("31231", Config.allianceTag2, "cn", "grassLand", "e", function(doc){
					doc.code.should.equal(200)
					Api.editAllianceBasicInfo(Config.allianceName, "adfad", "cn", "e", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("联盟名称已经存在")
						done()
					})
				})
			})
		})

		it("editAllianceBasicInfo 联盟标签已经存在", function(done){
			Api.editAllianceBasicInfo("adfad", Config.allianceTag, "cn", "e", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("联盟标签已经存在")
				done()
			})
		})

		it("editAllianceBasicInfo 正常修改", function(done){
			Api.editAllianceBasicInfo(Config.allianceName2, Config.allianceTag2, "cn", "e", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("editAllianceTerrian 联盟荣耀值不足", function(done){
			Api.editAllianceTerrian("grassLand", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("联盟荣耀值不足")
				done()
			})
		})

		it("editAllianceTerrian 正常编辑", function(done){
			Api.sendChat("alliancehonour 5000", function(doc){
				doc.code.should.equal(200)
				Api.editAllianceTerrian("grassLand", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editTitleName 玩家未加入联盟", function(done){
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceTitleName("archon", "老大", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editTitleName 此操作权限不足", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceTitleName("archon", "老大", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editTitleName 正常修改", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceTitleName("archon", "老大", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceNotice 玩家未加入联盟", function(done){
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceNotice("这是第一条公告", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceNotice 此操作权限不足", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceNotice("这是第一条公告", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceNotice 正常发布公告", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceNotice("这是第一条公告", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceDescription 玩家未加入联盟", function(done){
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceDescription("这是第一条描述", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceDescription 此操作权限不足", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceDescription("这是第一条描述", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceDescription 正常修改联盟描述", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceDescription("这是第一条描述", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceJoinType 玩家未加入联盟", function(done){
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceJoinType("all", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceJoinType 此操作权限不足", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceJoinType("all", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceJoinType 正常修改联盟描述", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceJoinType("all", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("editAllianceMemberTitle 玩家未加入联盟", function(done){
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceMemberTitle("asdfasdf", "general", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("editAllianceMemberTitle 此操作权限不足", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceMemberTitle("asdfasdf", "general", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("editAllianceMemberTitle 联盟没有此玩家", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceMemberTitle("asdfasdf", "general", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟没有此玩家")
					done()
				})
			})
		})

		it("editAllianceMemberTitle 不能将玩家的职级调整到与自己平级或者比自己高", function(done){
			var memberDoc = null
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.loginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					Api.editAllianceMemberTitle(memberDoc._id, "archon", function(doc){
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

		it("editAllianceMemberTitle 正常编辑", function(done){
			var memberDoc = null
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.loginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					Api.editAllianceMemberTitle(memberDoc._id, "general", function(doc){
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
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.kickAllianceMemberOff("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("kickAllianceMemberOff 此操作权限不足", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.kickAllianceMemberOff("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("此操作权限不足")
					done()
				})
			})
		})

		it("kickAllianceMemberOff 联盟没有此玩家", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.kickAllianceMemberOff("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟没有此玩家")
					done()
				})
			})
		})

		it("kickAllianceMemberOff 正常踢出", function(done){
			var memberDoc = null
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.loginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					Api.kickAllianceMemberOff(memberDoc._id, function(doc){
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
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.handOverAllianceArchon("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("handOverArchon 别逗了,你是不盟主好么", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.joinAllianceDirectly(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					Api.handOverAllianceArchon("asdfasdf", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("别逗了,你是不盟主好么")
						done()
					})
				})
			})
		})

		it("handOverArchon 玩家不存在", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.handOverAllianceArchon("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家不存在")
					done()
				})
			})
		})

		it("handOverArchon 正常移交", function(done){
			var memberDoc = null
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.loginPlayer(Config.deviceId, function(doc){
					doc.code.should.equal(200)
					Api.handOverAllianceArchon(memberDoc._id, function(doc){
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
			Api.loginPlayer(Config.deviceId2, function(doc){
				doc.code.should.equal(200)
				Api.quitAlliance(function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家未加入联盟")
					done()
				})
			})
		})

		it("quitAlliance 正常退出", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.quitAlliance(function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("joinAllianceDirectly 玩家已加入联盟", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.joinAllianceDirectly("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("玩家已加入联盟")
					done()
				})
			})
		})

		it("joinAllianceDirectly 联盟不存在", function(done){
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.joinAllianceDirectly("asdfasdf", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("联盟不存在")
					done()
				})
			})
		})

		it("joinAllianceDirectly 联盟不允许直接加入", function(done){
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				Api.editAllianceJoinType("audit", function(doc){
					doc.code.should.equal(200)
					Api.loginPlayer(Config.deviceId, function(doc){
						doc.code.should.equal(200)
						Api.joinAllianceDirectly(m_user.alliance.id, function(doc){
							doc.code.should.equal(500)
							doc.message.should.equal("联盟不允许直接加入")
							Api.loginPlayer(Config.deviceId3, function(doc){
								doc.code.should.equal(200)
								Api.editAllianceJoinType("all", function(doc){
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
			Api.loginPlayer(Config.deviceId, function(doc){
				doc.code.should.equal(200)
				Api.joinAllianceDirectly(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("requestToJoinAlliance 玩家已加入联盟", function(done){
			Api.requestToJoinAlliance(m_user.alliance.id, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("玩家已加入联盟")
				done()
			})
		})

		it("requestToJoinAlliance 对此联盟的申请已发出,请耐心等候审核", function(done){
			Api.loginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				Api.requestToJoinAlliance(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					Api.requestToJoinAlliance(m_user.alliance.id, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("对此联盟的申请已发出,请耐心等候审核")
						done()
					})
				})
			})
		})

		it("cancelJoinAllianceRequest 正常取消", function(done){
			Api.cancelJoinAllianceRequest(m_user.alliance.id, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("handleJoinAllianceRequest 正常处理 拒绝加入", function(done){
			var memberDoc = null
			Api.loginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				Api.requestToJoinAlliance(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					Api.loginPlayer(Config.deviceId3, function(doc){
						doc.code.should.equal(200)
						Api.handleJoinAllianceRequest(memberDoc._id, false, function(doc){
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
			Api.loginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				Api.requestToJoinAlliance(m_user.alliance.id, function(doc){
					doc.code.should.equal(200)
					Api.loginPlayer(Config.deviceId3, function(doc){
						doc.code.should.equal(200)
						Api.handleJoinAllianceRequest(memberDoc._id, true, function(doc){
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
			Api.loginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				Api.quitAlliance(function(doc){
					doc.code.should.equal(200)
					Api.loginPlayer(Config.deviceId3, function(doc){
						doc.code.should.equal(200)
						Api.inviteToJoinAlliance(memberDoc._id, function(doc){
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
			Api.loginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				Api.handleJoinAllianceInvite(m_user.alliance.id, false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("handleJoinAllianceInvite 正常处理 同意邀请", function(done){
			var memberDoc = null
			Api.loginPlayer(Config.deviceId5, function(doc){
				doc.code.should.equal(200)
				Api.loginPlayer(Config.deviceId3, function(doc){
					doc.code.should.equal(200)
					Api.inviteToJoinAlliance(memberDoc._id, function(doc){
						doc.code.should.equal(200)
						Api.loginPlayer(Config.deviceId4, function(doc){
							doc.code.should.equal(200)
							Api.inviteToJoinAlliance(memberDoc._id, function(doc){
								doc.code.should.equal(200)
								Api.loginPlayer(Config.deviceId5, function(doc){
									doc.code.should.equal(200)
									Api.handleJoinAllianceInvite(m_user.alliance.id, true, function(doc){
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

		it("buyAllianceArchon 购买盟主职位,正常购买", function(done){
			Api.buyAllianceArchon(function(doc){
				doc.code.should.equal(200)
				Api.loginPlayer(Config.deviceId3, function(doc){
					doc.code.should.equal(200)
					Api.buyAllianceArchon(function(doc){
						doc.code.should.equal(200)
						Api.loginPlayer(Config.deviceId5, function(doc){
							doc.code.should.equal(200)
							done()
						})
					})
				})
			})
		})

		it("searchAllianceByTag 正常搜索", function(done){
			Api.searchAllianceByTag("test", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getCanDirectJoinAlliances 正常获取", function(done){
			Api.getCanDirectJoinAlliances(function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("upgradeBuilding 加入联盟后", function(done){
			var playerDoc = null
			Api.upgradeBuilding(1, true, function(doc){
				doc.code.should.equal(200)
				Api.upgradeBuilding(1, false, function(doc){
					doc.code.should.equal(200)
					var buildEvent = playerDoc.buildingEvents[0]
					Api.requestAllianceToSpeedUp(Consts.AllianceHelpEventType.Building, buildEvent.id, function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
				var onPlayerDataChanged = function(doc){
					playerDoc = doc
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			})
		})

		it("createHouse 加入联盟后", function(done){
			var playerDoc = null
			Api.createHouse("dwelling", 3, 3, false, function(doc){
				doc.code.should.equal(200)
				var buildEvent = playerDoc.houseEvents[0]
				Api.requestAllianceToSpeedUp(Consts.AllianceHelpEventType.House, buildEvent.id, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
			var onPlayerDataChanged = function(doc){
				playerDoc = doc
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeHouse 加入联盟后", function(done){
			var playerDoc = null
			Api.createHouse("dwelling", 3, 1, true, function(doc){
				doc.code.should.equal(200)
				Api.upgradeHouse(3, 1, false, function(doc){
					doc.code.should.equal(200)
					var buildEvent = playerDoc.houseEvents[1]
					Api.requestAllianceToSpeedUp(Consts.AllianceHelpEventType.House, buildEvent.id, function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
				var onPlayerDataChanged = function(doc){
					playerDoc = doc
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			})
		})

		it("upgradeTower 加入联盟后", function(done){
			var playerDoc = null
			Api.upgradeTower(1, false, function(doc){
				doc.code.should.equal(200)
				var buildEvent = playerDoc.towerEvents[0]
				Api.requestAllianceToSpeedUp(Consts.AllianceHelpEventType.Tower, buildEvent.id, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
			var onPlayerDataChanged = function(doc){
				playerDoc = doc
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeWall 加入联盟后", function(done){
			var playerDoc = null
			Api.upgradeWall(false, function(doc){
				doc.code.should.equal(200)
				var buildEvent = playerDoc.wallEvents[0]
				Api.requestAllianceToSpeedUp(Consts.AllianceHelpEventType.Wall, buildEvent.id, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
			var onPlayerDataChanged = function(doc){
				playerDoc = doc
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("helpAllianceMemberSpeedUp 正常帮助1", function(done){
			var alliance = null
			Api.loginPlayer(Config.deviceId3, function(doc){
				doc.code.should.equal(200)
				getMyAllianceData(function(doc){
					doc.code.should.equal(200)
					var event = alliance.helpEvents[0]
					helpAllianceMemberSpeedUp(event.eventId, function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
				var onGetAllianceDataSuccess = function(doc){
					alliance = doc
					pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
				}
				pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
			})
		})

		it("helpAllianceMemberSpeedUp 正常帮助2", function(done){
			var alliance = null
			getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				var event = alliance.helpEvents[1]
				helpAllianceMemberSpeedUp(event.eventId, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
			var onGetAllianceDataSuccess = function(doc){
				alliance = doc
				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
			}
			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		})

		it("helpAllAllianceMemberSpeedUp 正常帮助", function(done){
			helpAllAllianceMemberSpeedUp(function(doc){
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

		it("donateToAlliance 资源不足", function(done){
			sendChat("rs 500", function(doc){
				doc.code.should.equal(200)
				donateToAlliance("wood", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("资源不足")
					done()
				})
			})
		})

		it("donateToAlliance 正常捐赠1", function(done){
			sendChat("rs 5000000", function(doc){
				doc.code.should.equal(200)
				sendChat("donatelevel 6", function(doc){
					doc.code.should.equal(200)
					donateToAlliance("wood", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("donateToAlliance 正常捐赠2", function(done){
			donateToAlliance("wood", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("donateToAlliance 正常捐赠3", function(done){
			sendChat("donatelevel 1", function(doc){
				doc.code.should.equal(200)
				donateToAlliance("stone", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("upgradeAllianceBuilding 盟主城堡等级不足", function(done){
			upgradeAllianceBuilding("palace", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("盟主城堡等级不足")
				done()
			})
		})

		it("upgradeAllianceBuilding 联盟荣耀值不足", function(done){
			sendChat("allianceHonour 10", function(doc){
				doc.code.should.equal(200)
				sendChat("keep 5", function(doc){
					doc.code.should.equal(200)
					upgradeAllianceBuilding("palace", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("联盟荣耀值不足")
						done()
					})
				})
			})
		})

		it("upgradeAllianceBuilding 正常升级", function(done){
			sendChat("allianceHonour 5000", function(doc){
				doc.code.should.equal(200)
				upgradeAllianceBuilding("palace", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("upgradeAllianceVillage 正常升级", function(done){
			upgradeAllianceVillage("wood", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})
	})


	after(function(){
		pomelo.disconnect()
	})
})