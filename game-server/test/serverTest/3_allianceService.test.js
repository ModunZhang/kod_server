/**
 * Created by modun on 14-7-25.
 */

var pomelo = require("../pomelo-client")
var redis = require("redis")
var path = require("path")
var Scripto = require('redis-scripto')
var Promise = require("bluebird")
var _ = require("underscore")

var Consts = require("../../app/consts/consts")
var Config = require("../config")
var AllianceDao = require("../../app/dao/allianceDao")
var PlayerDao = require("../../app/dao/playerDao")
var Api = require("../api")
var MapUtils = require("../../app/utils/mapUtils")

var commandDir = path.resolve(__dirname + "/../../app/commands")
var redisClient = redis.createClient(Config.redisPort, Config.redisAddr)
var scripto = new Scripto(redisClient)
scripto.loadFromDir(commandDir)
var allianceDao = Promise.promisifyAll(new AllianceDao(redisClient, scripto, "production"))
var playerDao = Promise.promisifyAll(new PlayerDao(redisClient, scripto, "production"))


describe("AllianceService", function(){
	var m_user

	before(function(done){
		done()
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
				Api.getMyAllianceData(function(doc){
					doc.code.should.equal(200)
					var event = alliance.helpEvents[0]
					Api.helpAllianceMemberSpeedUp(event.eventId, function(doc){
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
			Api.getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				var event = alliance.helpEvents[1]
				Api.helpAllianceMemberSpeedUp(event.eventId, function(doc){
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
			Api.helpAllAllianceMemberSpeedUp(function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("getMyAllianceData 正常获取", function(done){
			Api.getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("donateToAlliance 资源不足", function(done){
			Api.sendChat("rs 500", function(doc){
				doc.code.should.equal(200)
				Api.donateToAlliance("wood", function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("资源不足")
					done()
				})
			})
		})

		it("donateToAlliance 正常捐赠1", function(done){
			Api.sendChat("rs 5000000", function(doc){
				doc.code.should.equal(200)
				Api.sendChat("donatelevel 6", function(doc){
					doc.code.should.equal(200)
					Api.donateToAlliance("wood", function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
		})

		it("donateToAlliance 正常捐赠2", function(done){
			Api.donateToAlliance("wood", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("donateToAlliance 正常捐赠3", function(done){
			Api.sendChat("donatelevel 1", function(doc){
				doc.code.should.equal(200)
				Api.donateToAlliance("stone", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("upgradeAllianceBuilding 盟主城堡等级不足", function(done){
			Api.upgradeAllianceBuilding("palace", function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("盟主城堡等级不足")
				done()
			})
		})

		it("upgradeAllianceBuilding 联盟荣耀值不足", function(done){
			Api.sendChat("allianceHonour 10", function(doc){
				doc.code.should.equal(200)
				Api.sendChat("keep 5", function(doc){
					doc.code.should.equal(200)
					Api.upgradeAllianceBuilding("palace", function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("联盟荣耀值不足")
						done()
					})
				})
			})
		})

		it("upgradeAllianceBuilding 正常升级", function(done){
			Api.sendChat("allianceHonour 5000", function(doc){
				doc.code.should.equal(200)
				Api.upgradeAllianceBuilding("palace", function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("upgradeAllianceVillage 正常升级", function(done){
			Api.upgradeAllianceVillage("woodVillage", function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("moveAllianceBuilding 正常移动", function(done){
			var m_allianceData = null
			Api.getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				var map = MapUtils.buildMap(m_allianceData.mapObjects)
				var rect = MapUtils.getRect(map, 3, 3)
				Api.moveAllianceBuilding("palace", rect.x, rect.y, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
			var onGetAllianceDataSuccess = function(doc){
				m_allianceData = doc
				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
			}
			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		})

		it("moveAllianceMember 正常移动", function(done){
			var m_allianceData = null
			Api.getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				var map = MapUtils.buildMap(m_allianceData.mapObjects)
				var rect = MapUtils.getRect(map, 1, 1)
				Api.moveAllianceMember(rect.x, rect.y, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
			var onGetAllianceDataSuccess = function(doc){
				m_allianceData = doc
				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
			}
			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		})

		it("distroyAllianceDecorate 正常拆除", function(done){
			var m_allianceData = null
			Api.getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				for(var i = 0; i < m_allianceData.mapObjects.length; i++){
					var mapObject = m_allianceData.mapObjects[i]
					if(mapObject.type.indexOf("decorate") >= 0){
						Api.distroyAllianceDecorate(mapObject.id, function(doc){
							doc.code.should.equal(200)
							done()
						})
						break
					}
				}
			})
			var onGetAllianceDataSuccess = function(doc){
				m_allianceData = doc
				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
			}
			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		})

		//it("activateAllianceShrineStage 正常激活", function(done){
		//	Api.activateAllianceShrineStage("1_1", function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("activateAllianceShrineStage 此联盟事件已经激活", function(done){
		//	Api.activateAllianceShrineStage("1_1", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("此联盟事件已经激活")
		//		done()
		//	})
		//})
		//
		//it("activateAllianceShrineStage 联盟感知力不足", function(done){
		//	Api.sendChat("allianceperception 0", function(doc){
		//		doc.code.should.equal(200)
		//		Api.activateAllianceShrineStage("1_2", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("联盟感知力不足")
		//			done()
		//		})
		//	})
		//})
		//
		//it("attackAllianceShrine 正常行军1", function(done){
		//	var m_allianceData = null
		//	Api.sendChat("dragonstar redDragon 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("soldiers 1000", function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				Api.attackAllianceShrine(m_allianceData.shrineEvents[0].id, "redDragon", [
		//					{
		//						name:"swordsman",
		//						count:20
		//					},
		//					{
		//						name:"sentinel",
		//						count:20
		//					},
		//					{
		//						name:"ranger",
		//						count:20
		//					}
		//				], function(doc){
		//					doc.code.should.equal(200)
		//					done()
		//				})
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_allianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	})
		//})
		//
		//it("attackAllianceShrine 正常行军2", function(done){
		//	var m_allianceData = null
		//	Api.loginPlayer(Config.deviceId, function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("dragonstar redDragon 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("soldiers 1000", function(doc){
		//				doc.code.should.equal(200)
		//				Api.getMyAllianceData(function(doc){
		//					doc.code.should.equal(200)
		//					Api.attackAllianceShrine(m_allianceData.shrineEvents[0].id, "redDragon", [
		//						{
		//							name:"swordsman",
		//							count:20
		//						},
		//						{
		//							name:"sentinel",
		//							count:20
		//						},
		//						{
		//							name:"ranger",
		//							count:20
		//						}
		//					], function(doc){
		//						doc.code.should.equal(200)
		//						done()
		//					})
		//				})
		//				var onGetAllianceDataSuccess = function(doc){
		//					m_allianceData = doc
		//					pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			})
		//		})
		//	})
		//})
		//
		//it("attackAllianceShrine 正常行军3", function(done){
		//	var m_allianceData = null
		//	Api.loginPlayer(Config.deviceId5, function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("dragonstar redDragon 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("soldiers 1000", function(doc){
		//				doc.code.should.equal(200)
		//				Api.getMyAllianceData(function(doc){
		//					doc.code.should.equal(200)
		//					Api.attackAllianceShrine(m_allianceData.shrineEvents[0].id, "redDragon", [
		//						{
		//							name:"swordsman",
		//							count:20
		//						},
		//						{
		//							name:"sentinel",
		//							count:20
		//						},
		//						{
		//							name:"ranger",
		//							count:20
		//						}
		//					], function(doc){
		//						doc.code.should.equal(200)
		//						done()
		//					})
		//				})
		//				var onGetAllianceDataSuccess = function(doc){
		//					m_allianceData = doc
		//					pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			})
		//		})
		//	})
		//})

		//it("requestAllianceToFight 正常请求", function(done){
		//	Api.loginPlayer(Config.deviceId3, function(doc){
		//		doc.code.should.equal(200)
		//		Api.requestAllianceToFight(function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("requestAllianceToFight 已经发送过开战请求", function(done){
		//	Api.requestAllianceToFight(function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("已经发送过开战请求")
		//		done()
		//	})
		//})

		it("alliancefight 正常激活", function(done){
			var m_allianceDoc = null
			Api.getMyAllianceData(function(doc){
				doc.code.should.equal(200)
				Api.loginPlayer(Config.deviceId4, function(doc){
					doc.code.should.equal(200)
					Api.sendChat("alliancefight " + m_allianceDoc.basicInfo.tag, function(doc){
						doc.code.should.equal(200)
						done()
					})
				})
			})
			var onGetAllianceDataSuccess = function(doc){
				m_allianceDoc = doc
				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
			}
			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		})

		//it("findAllianceToFight 正常查找", function(done){
		//	Api.findAllianceToFight(function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getAllianceViewData 正常获取", function(done){
		//	var m_allianceData = null
		//	Api.getMyAllianceData(function(doc){
		//		doc.code.should.equal(200)
		//		Api.getAllianceViewData(m_allianceData._id, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//	var onGetAllianceDataSuccess = function(doc){
		//		m_allianceData = doc
		//		pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	}
		//	pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//})
		//
		//it("getNearedAllianceInfos 正常获取", function(done){
		//	Api.getNearedAllianceInfos(function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("searchAllianceInfoByTag 正常搜索", function(done){
		//	Api.searchAllianceInfoByTag("test", function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})

		//it("helpAllianceMemberDefence 正常协助", function(done){
		//	Api.loginPlayer(Config.deviceId3, function(doc){
		//		doc.code.should.equal(200)
		//		var m_allianceData = null
		//		Api.getMyAllianceData(function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("dragonstar blueDragon 1", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("soldiers 1000", function(doc){
		//					doc.code.should.equal(200)
		//					Api.helpAllianceMemberDefence(
		//						"blueDragon",
		//						[
		//							{
		//								name:"swordsman",
		//								count:5
		//							},
		//							{
		//								name:"sentinel",
		//								count:5
		//							},
		//							{
		//								name:"ranger",
		//								count:5
		//							}
		//						],
		//						m_allianceData.members[1].id,
		//						function(doc){
		//							doc.code.should.equal(200)
		//							done()
		//						})
		//				})
		//			})
		//		})
		//		var onGetAllianceDataSuccess = function(doc){
		//			m_allianceData = doc
		//			pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		}
		//		pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	})
		//})

		//it("retreatFromBeHelpedAllianceMember 玩家没有协防部队驻扎在目标玩家城市", function(done){
		//	var m_allianceData = null
		//	Api.getMyAllianceData(function(doc){
		//		doc.code.should.equal(200)
		//		Api.retreatFromBeHelpedAllianceMember(m_allianceData.members[1].id, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("玩家没有协防部队驻扎在目标玩家城市")
		//			done()
		//		})
		//	})
		//	var onGetAllianceDataSuccess = function(doc){
		//		m_allianceData = doc
		//		pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	}
		//	pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//})

		//it("retreatFromHelpedAllianceMember 正常撤回", function(done){
		//	var m_allianceData = null
		//	Api.getMyAllianceData(function(doc){
		//		doc.code.should.equal(200)
		//		setTimeout(function(){
		//			Api.retreatFromBeHelpedAllianceMember(m_allianceData.members[1].id, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		}, 7 * 1000)
		//	})
		//	var onGetAllianceDataSuccess = function(doc){
		//		m_allianceData = doc
		//		pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	}
		//	pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//})

		//it("revengeAlliance 正常复仇", function(done){
		//	setTimeout(function(){
		//		var m_allianceData = null
		//		Api.loginPlayer(Config.deviceId3, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				Api.revengeAlliance(m_allianceData.allianceFightReports[0].id, function(doc){
		//					doc.code.should.equal(200)
		//					done()
		//				})
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_allianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 37 * 1000)
		//})

		//it("setDefenceDragon 正常设置", function(done){
		//	Api.loginPlayer(Config.deviceId, function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("dragonstar greenDragon 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("soldiers 10", function(doc){
		//				doc.code.should.equal(200)
		//				Api.setDefenceDragon("greenDragon", function(doc){
		//					doc.code.should.equal(200)
		//					done()
		//				})
		//			})
		//		})
		//	})
		//})

		//it("strikePlayerCity 有协防玩家,协防方胜利", function(done){
		//	Api.loginPlayer(Config.deviceId3, function(doc){
		//		doc.code.should.equal(200)
		//		var m_allianceData = null
		//		Api.getMyAllianceData(function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("dragonstar blueDragon 2", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("soldiers 1000", function(doc){
		//					doc.code.should.equal(200)
		//					Api.helpAllianceMemberDefence(
		//						"blueDragon",
		//						[
		//							{
		//								name:"swordsman",
		//								count:5
		//							},
		//							{
		//								name:"sentinel",
		//								count:5
		//							},
		//							{
		//								name:"ranger",
		//								count:5
		//							}
		//						],
		//						m_allianceData.members[1].id,
		//						function(doc){
		//							doc.code.should.equal(200)
		//						})
		//				})
		//			})
		//		})
		//		var onGetAllianceDataSuccess = function(doc){
		//			m_allianceData = doc
		//			pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		}
		//		pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	})
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 1", function(doc){
		//						doc.code.should.equal(200)
		//						Api.strikePlayerCity("greenDragon", m_enemyAllianceData.members[1].id, function(doc){
		//							doc.code.should.equal(200)
		//							done()
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})

		//it("strikePlayerCity 有协防玩家,协防方失败", function(done){
		//	Api.loginPlayer(Config.deviceId3, function(doc){
		//		doc.code.should.equal(200)
		//		var m_allianceData = null
		//		Api.getMyAllianceData(function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("dragonstar blueDragon 1", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("soldiers 1000", function(doc){
		//					doc.code.should.equal(200)
		//					Api.helpAllianceMemberDefence(
		//						"blueDragon",
		//						[
		//							{
		//								name:"swordsman",
		//								count:5
		//							},
		//							{
		//								name:"sentinel",
		//								count:5
		//							},
		//							{
		//								name:"ranger",
		//								count:5
		//							}
		//						],
		//						m_allianceData.members[1].id,
		//						function(doc){
		//							doc.code.should.equal(200)
		//						})
		//				})
		//			})
		//		})
		//		var onGetAllianceDataSuccess = function(doc){
		//			m_allianceData = doc
		//			pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		}
		//		pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	})
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 2", function(doc){
		//						doc.code.should.equal(200)
		//						Api.strikePlayerCity("greenDragon", m_enemyAllianceData.members[1].id, function(doc){
		//							doc.code.should.equal(200)
		//							done()
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})

		//it("strikePlayerCity 无协防玩家,防守玩家有龙", function(done){
		//	Api.loginPlayer(Config.deviceId, function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("dragonstar greenDragon 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("soldiers 10", function(doc){
		//				doc.code.should.equal(200)
		//				Api.setDefenceDragon("greenDragon", function(doc){
		//					doc.code.should.equal(200)
		//				})
		//			})
		//		})
		//	})
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 2", function(doc){
		//						doc.code.should.equal(200)
		//						Api.strikePlayerCity("greenDragon", m_enemyAllianceData.members[1].id, function(doc){
		//							doc.code.should.equal(200)
		//							done()
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})

		//it("strikePlayerCity 无协防玩家,防守玩家无龙", function(done){
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 1", function(doc){
		//						doc.code.should.equal(200)
		//						Api.strikePlayerCity("greenDragon", m_enemyAllianceData.members[1].id, function(doc){
		//							doc.code.should.equal(200)
		//							done()
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})


		//it("readReports 正常阅读", function(done){
		//	setTimeout(function(){
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.readReports([m_user.reports[0].id], function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//		var onPlayerLoginSuccess = function(doc){
		//			m_user = doc
		//			pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//		}
		//		pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//	}, 5 * 1000)
		//})
		//
		//it("saveReport 正常收藏", function(done){
		//	Api.saveReport(m_user.reports[0].id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("unSaveReport 正常取消收藏", function(done){
		//	Api.unSaveReport(m_user.reports[0].id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getReports 获取战报", function(done){
		//	Api.getReports(0, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getSavedReports 获取已存战报", function(done){
		//	Api.getSavedReports(0, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("deleteReports 正常删除收藏战报", function(done){
		//	Api.deleteReports([m_user.reports[0].id], function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})

		//it("attackPlayerCity 有协防玩家,且协防玩家胜利", function(done){
		//	Api.loginPlayer(Config.deviceId3, function(doc){
		//		doc.code.should.equal(200)
		//		var m_allianceData = null
		//		Api.getMyAllianceData(function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("dragonstar blueDragon 2", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("soldiers 1000", function(doc){
		//					doc.code.should.equal(200)
		//					Api.helpAllianceMemberDefence(
		//						"blueDragon",
		//						[
		//							{
		//								name:"swordsman",
		//								count:30
		//							},
		//							{
		//								name:"sentinel",
		//								count:30
		//							},
		//							{
		//								name:"ranger",
		//								count:30
		//							}
		//						],
		//						m_allianceData.members[1].id,
		//						function(doc){
		//							doc.code.should.equal(200)
		//						})
		//				})
		//			})
		//		})
		//		var onGetAllianceDataSuccess = function(doc){
		//			m_allianceData = doc
		//			pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		}
		//		pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	})
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 1", function(doc){
		//						doc.code.should.equal(200)
		//						Api.sendChat("soldiers 1000", function(doc){
		//							doc.code.should.equal(200)
		//							Api.attackPlayerCity("greenDragon",[
		//								{
		//									name:"swordsman",
		//									count:20
		//								},
		//								{
		//									name:"sentinel",
		//									count:20
		//								},
		//								{
		//									name:"ranger",
		//									count:20
		//								}
		//							], m_enemyAllianceData.members[1].id, function(doc){
		//								doc.code.should.equal(200)
		//								done()
		//							})
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})

		//it("attackPlayerCity 有协防玩家,且协防玩家失败,防守玩家胜利", function(done){
		//	Api.loginPlayer(Config.deviceId3, function(doc){
		//		doc.code.should.equal(200)
		//		var m_allianceData = null
		//		Api.getMyAllianceData(function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("dragonstar blueDragon 1", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("soldiers 1000", function(doc){
		//					doc.code.should.equal(200)
		//					Api.helpAllianceMemberDefence(
		//						"blueDragon",
		//						[
		//							{
		//								name:"swordsman",
		//								count:10
		//							},
		//							{
		//								name:"sentinel",
		//								count:10
		//							},
		//							{
		//								name:"ranger",
		//								count:10
		//							}
		//						],
		//						m_allianceData.members[1].id,
		//						function(doc){
		//							doc.code.should.equal(200)
		//							Api.loginPlayer(Config.deviceId, function(doc){
		//								doc.code.should.equal(200)
		//								Api.sendChat("dragonstar greenDragon 1", function(doc){
		//									doc.code.should.equal(200)
		//									Api.sendChat("soldiers 20", function(doc){
		//										doc.code.should.equal(200)
		//										Api.setDefenceDragon("greenDragon", function(doc){
		//											doc.code.should.equal(200)
		//										})
		//									})
		//								})
		//							})
		//						})
		//				})
		//			})
		//		})
		//		var onGetAllianceDataSuccess = function(doc){
		//			m_allianceData = doc
		//			pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		}
		//		pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	})
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 1", function(doc){
		//						doc.code.should.equal(200)
		//						Api.sendChat("soldiers 1000", function(doc){
		//							doc.code.should.equal(200)
		//							Api.attackPlayerCity("greenDragon", [
		//								{
		//									name:"swordsman",
		//									count:20
		//								},
		//								{
		//									name:"sentinel",
		//									count:20
		//								},
		//								{
		//									name:"ranger",
		//									count:20
		//								}
		//							], m_enemyAllianceData.members[1].id, function(doc){
		//								doc.code.should.equal(200)
		//								done()
		//							})
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})

		//it("attackPlayerCity 有协防玩家,且协防玩家失败,防守玩家失败", function(done){
		//	Api.loginPlayer(Config.deviceId3, function(doc){
		//		doc.code.should.equal(200)
		//		var m_allianceData = null
		//		Api.getMyAllianceData(function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("dragonstar blueDragon 1", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("soldiers 1000", function(doc){
		//					doc.code.should.equal(200)
		//					Api.helpAllianceMemberDefence(
		//						"blueDragon",
		//						[
		//							{
		//								name:"swordsman",
		//								count:10
		//							},
		//							{
		//								name:"sentinel",
		//								count:10
		//							},
		//							{
		//								name:"ranger",
		//								count:10
		//							}
		//						],
		//						m_allianceData.members[1].id,
		//						function(doc){
		//							doc.code.should.equal(200)
		//							Api.loginPlayer(Config.deviceId, function(doc){
		//								doc.code.should.equal(200)
		//								Api.sendChat("dragonstar greenDragon 1", function(doc){
		//									doc.code.should.equal(200)
		//									Api.sendChat("soldiers 1", function(doc){
		//										doc.code.should.equal(200)
		//										Api.setDefenceDragon("greenDragon", function(doc){
		//											doc.code.should.equal(200)
		//										})
		//									})
		//								})
		//							})
		//						})
		//				})
		//			})
		//		})
		//		var onGetAllianceDataSuccess = function(doc){
		//			m_allianceData = doc
		//			pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		}
		//		pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	})
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 1", function(doc){
		//						doc.code.should.equal(200)
		//						Api.sendChat("soldiers 1000", function(doc){
		//							doc.code.should.equal(200)
		//							Api.attackPlayerCity("greenDragon", [
		//								{
		//									name:"swordsman",
		//									count:30
		//								},
		//								{
		//									name:"sentinel",
		//									count:30
		//								},
		//								{
		//									name:"ranger",
		//									count:30
		//								}
		//							], m_enemyAllianceData.members[1].id, function(doc){
		//								doc.code.should.equal(200)
		//								done()
		//							})
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})

		//it("attackPlayerCity 无协防玩家,有防守玩家", function(done){
		//	Api.loginPlayer(Config.deviceId, function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("dragonstar greenDragon 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("soldiers 1000", function(doc){
		//				doc.code.should.equal(200)
		//				Api.setDefenceDragon("greenDragon", function(doc){
		//					doc.code.should.equal(200)
		//				})
		//			})
		//		})
		//	})
		//
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 2", function(doc){
		//						doc.code.should.equal(200)
		//						Api.sendChat("soldiers 2000", function(doc){
		//							doc.code.should.equal(200)
		//							Api.attackPlayerCity("greenDragon", [
		//								{
		//									name:"swordsman",
		//									count:2000
		//								},
		//								{
		//									name:"sentinel",
		//									count:2000
		//								},
		//								{
		//									name:"ranger",
		//									count:2000
		//								}
		//							], m_enemyAllianceData.members[1].id, function(doc){
		//								doc.code.should.equal(200)
		//								done()
		//							})
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})

		//it("attackVillage 进攻本联盟村落", function(done){
		//	var m_myAllianceData = null
		//	Api.loginPlayer(Config.deviceId4, function(doc){
		//		doc.code.should.equal(200)
		//		Api.getMyAllianceData(function(doc){
		//			doc.code.should.equal(200)
		//			Api.sendChat("dragonstar greenDragon 1", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("soldiers 1000", function(doc){
		//					doc.code.should.equal(200)
		//					Api.attackVillage(
		//						"greenDragon",
		//						[
		//							{
		//								name:"swordsman",
		//								count:100
		//							},
		//							{
		//								name:"sentinel",
		//								count:100
		//							},
		//							{
		//								name:"ranger",
		//								count:100
		//							}
		//						],
		//						m_myAllianceData._id,
		//						m_myAllianceData.villages[0].id,
		//						function(doc){
		//							doc.code.should.equal(200)
		//							done()
		//						}
		//					)
		//				})
		//			})
		//		})
		//	})
		//	var onGetAllianceDataSuccess = function(doc){
		//		m_myAllianceData = doc
		//		pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//	}
		//	pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//})

		//it("attackVillage 进攻敌对玩家村落", function(done){
		//	setTimeout(function(){
		//		var m_myAllianceData = null
		//		var m_enemyAllianceData = null
		//		Api.loginPlayer(Config.deviceId4, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMyAllianceData(function(doc){
		//				doc.code.should.equal(200)
		//				var allianceFight = m_myAllianceData.allianceFight
		//				var enemyAllianceId = _.isEqual(allianceFight.attackAllianceId, m_myAllianceData._id) ? allianceFight.defenceAllianceId : allianceFight.attackAllianceId
		//				Api.getAllianceViewData(enemyAllianceId, function(doc){
		//					doc.code.should.equal(200)
		//					Api.sendChat("dragonstar greenDragon 1", function(doc){
		//						doc.code.should.equal(200)
		//						Api.sendChat("soldiers 1000", function(doc){
		//							doc.code.should.equal(200)
		//							Api.attackVillage(
		//								"greenDragon",
		//								[
		//									{
		//										name:"swordsman",
		//										count:100
		//									},
		//									{
		//										name:"sentinel",
		//										count:100
		//									},
		//									{
		//										name:"ranger",
		//										count:100
		//									}
		//								],
		//								m_enemyAllianceData._id,
		//								m_enemyAllianceData.villages[0].id,
		//								function(doc){
		//									doc.code.should.equal(200)
		//									done()
		//								}
		//							)
		//						})
		//					})
		//				})
		//				var onGetAllianceViewDataSuccess = function(doc){
		//					m_enemyAllianceData = doc
		//					pomelo.removeListener("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//				}
		//				pomelo.on("onGetAllianceViewDataSuccess", onGetAllianceViewDataSuccess)
		//			})
		//			var onGetAllianceDataSuccess = function(doc){
		//				m_myAllianceData = doc
		//				pomelo.removeListener("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//			}
		//			pomelo.on("onGetAllianceDataSuccess", onGetAllianceDataSuccess)
		//		})
		//	}, 6 * 1000)
		//})
	})


	after(function(){
		pomelo.disconnect()
	})
})