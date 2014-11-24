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


describe("PlayerService", function(){
	var m_user

	before(function(done){
		playerDao.deleteAllAsync().then(function(){
			return allianceDao.deleteAllAsync()
		}).then(function(){
			done()
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


	//describe("playerHandler", function(){
	//	it("upgradeBuilding buildingLocation 不合法", function(done){
	//		Api.upgradeBuilding(26, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("buildingLocation 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeBuilding 建筑不存在", function(done){
	//		Api.upgradeBuilding(25, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("建筑不存在")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeBuilding 建筑正在升级", function(done){
	//		Api.upgradeBuilding(1, false, function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeBuilding(1, false, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("建筑正在升级")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("upgradeBuilding 建筑还未建造", function(done){
	//		Api.upgradeBuilding(10, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("建筑还未建造")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeBuilding 建筑建造时,建筑坑位不合法", function(done){
	//		Api.upgradeBuilding(7, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("建筑建造时,建筑坑位不合法")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeBuilding 建造数量已达建造上限", function(done){
	//		Api.upgradeBuilding(6, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("建造数量已达建造上限")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeBuilding 建筑升级时,建筑等级不合法", function(done){
	//		Api.upgradeBuilding(2, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("建筑升级时,建筑等级不合法")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeBuilding 建筑已达到最高等级", function(done){
	//		var func = function(){
	//			Api.upgradeBuilding(1, true, function(doc){
	//				if(doc.code == 200){
	//					func()
	//				}else{
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("建筑已达到最高等级")
	//					done()
	//				}
	//			})
	//		}
	//
	//		Api.sendChat("keep 22", function(doc){
	//			doc.code.should.equal(200)
	//			func()
	//		})
	//	})
	//
	//	it("upgradeBuilding 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeBuilding(3, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeBuilding 正常普通升级", function(done){
	//		Api.sendChat("rmbuildingevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeBuilding(2, false, function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//			var onPlayerDataChanged = function(doc){
	//				m_user.buildingEvents = doc.buildingEvents
	//				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
	//			}
	//			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
	//		})
	//	})
	//
	//	it("freeSpeedUp 正常免费加速", function(done){
	//		Api.freeSpeedUp("buildingEvents", m_user.buildingEvents[0].id, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("upgradeBuilding 正常升级立即完成", function(done){
	//		Api.upgradeBuilding(3, true, function(doc){
	//			doc.code.should.equal(200)
	//			Api.sendChat("rmbuildingevents", function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("createHouse buildingLocation 不合法", function(done){
	//		Api.createHouse("dwelling", 26, 1, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("buildingLocation 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("createHouse houseLocation 不合法", function(done){
	//		Api.createHouse("dwelling", 25, 4, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("houseLocation 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("createHouse 主体建筑不存在", function(done){
	//		Api.createHouse("dwelling", 25, 1, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("主体建筑不存在")
	//			done()
	//		})
	//	})
	//
	//	it("createHouse 主体建筑必须大于等于1级", function(done){
	//		Api.createHouse("dwelling", 5, 1, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("主体建筑必须大于等于1级")
	//			done()
	//		})
	//	})
	//
	//	it("createHouse 小屋类型不存在", function(done){
	//		Api.createHouse("dwellinga", 3, 1, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("小屋类型不存在")
	//			done()
	//		})
	//	})
	//
	//	it("createHouse 小屋数量超过限制", function(done){
	//		Api.upgradeBuilding(6, true, function(doc){
	//			doc.code.should.equal(200)
	//			Api.createHouse("dwelling", 3, 1, true, function(doc){
	//				doc.code.should.equal(200)
	//				Api.createHouse("dwelling", 3, 2, true, function(doc){
	//					doc.code.should.equal(200)
	//					Api.createHouse("dwelling", 3, 3, true, function(doc){
	//						doc.code.should.equal(200)
	//						Api.createHouse("dwelling", 6, 1, true, function(doc){
	//							doc.code.should.equal(500)
	//							doc.message.should.equal("小屋数量超过限制")
	//							Api.sendChat("rmbuildingevents", function(doc){
	//								doc.code.should.equal(200)
	//								Api.destroyHouse(3, 1, function(doc){
	//									doc.code.should.equal(200)
	//									Api.destroyHouse(3, 2, function(doc){
	//										doc.code.should.equal(200)
	//										Api.destroyHouse(3, 3, function(doc){
	//											doc.code.should.equal(200)
	//											done()
	//										})
	//									})
	//								})
	//							})
	//						})
	//					})
	//				})
	//			})
	//		})
	//	})
	//
	//	it("createHouse 建筑周围不允许建造小屋", function(done){
	//		Api.createHouse("dwelling", 1, 1, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("建筑周围不允许建造小屋")
	//			done()
	//		})
	//	})
	//
	//	it("createHouse 创建小屋时,小屋坑位不合法", function(done){
	//		Api.createHouse("dwelling", 3, 1, false, function(doc){
	//			doc.code.should.equal(200)
	//			Api.createHouse("dwelling", 3, 1, false, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("创建小屋时,小屋坑位不合法")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("createHouse 建造小屋会造成可用城民小于0", function(done){
	//		Api.createHouse("farmer", 3, 3, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("建造小屋会造成可用城民小于0")
	//			done()
	//		})
	//	})
	//
	//	it("createHouse 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.createHouse("dwelling", 3, 2, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("createHouse 正常加速创建", function(done){
	//		Api.createHouse("dwelling", 3, 2, true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("createHouse 正常普通创建", function(done){
	//		Api.sendChat("rmbuildingevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.createHouse("farmer", 3, 3, false, function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("upgradeHouse 主体建筑必须大于等于1级", function(done){
	//		Api.upgradeHouse(5, 1, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("主体建筑必须大于等于1级")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeHouse 小屋不存在", function(done){
	//		Api.upgradeHouse(4, 1, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("小屋不存在")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeHouse 小屋正在升级", function(done){
	//		Api.sendChat("rmbuildingevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeHouse(3, 1, false, function(doc){
	//				doc.code.should.equal(200)
	//				Api.upgradeHouse(3, 1, false, function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("小屋正在升级")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeHouse 小屋已达到最高等级", function(done){
	//		var func = function(){
	//			Api.upgradeHouse(3, 2, true, function(doc){
	//				if(doc.code == 200){
	//					func()
	//				}else{
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("小屋已达到最高等级")
	//					Api.sendChat("gem 5000", function(doc){
	//						doc.code.should.equal(200)
	//						done()
	//					})
	//				}
	//			})
	//		}
	//
	//		Api.sendChat("gem 5000000", function(doc){
	//			doc.code.should.equal(200)
	//			func()
	//		})
	//	})
	//
	//	it("upgradeHouse 升级小屋会造成可用城民小于0", function(done){
	//		Api.sendChat("citizen 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeHouse(3, 3, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("升级小屋会造成可用城民小于0")
	//				Api.sendChat("citizen 100", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeHouse 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeHouse(3, 3, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeHouse 正常升级", function(done){
	//		Api.upgradeHouse(3, 3, true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("destroyHouse 主体建筑不存在", function(done){
	//		Api.destroyHouse(25, 1, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("主体建筑不存在")
	//			done()
	//		})
	//	})
	//
	//	it("destroyHouse 小屋不存在", function(done){
	//		Api.destroyHouse(4, 1, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("小屋不存在")
	//			done()
	//		})
	//	})
	//
	//	it("destroyHouse 拆除此建筑后会造成可用城民数量小于0", function(done){
	//		Api.destroyHouse(3, 2, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("拆除此建筑后会造成可用城民数量小于0")
	//			done()
	//		})
	//	})
	//
	//	it("destroyHouse 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.destroyHouse(3, 3, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("destroyHouse 正常拆除", function(done){
	//		Api.destroyHouse(3, 3, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("upgradeTower towerLocation 不合法", function(done){
	//		Api.upgradeTower(20, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("towerLocation 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeTower 箭塔正在升级", function(done){
	//		Api.sendChat("rmbuildingevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeTower(1, false, function(doc){
	//				doc.code.should.equal(200)
	//				Api.upgradeTower(1, false, function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("箭塔正在升级")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeTower 箭塔还未建造", function(done){
	//		Api.upgradeTower(9, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("箭塔还未建造")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeTower 箭塔已达到最高等级", function(done){
	//		var func = function(){
	//			Api.upgradeTower(2, true, function(doc){
	//				if(doc.code == 200){
	//					func()
	//				}else{
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("箭塔已达到最高等级")
	//					Api.sendChat("gem 5000", function(doc){
	//						doc.code.should.equal(200)
	//						done()
	//					})
	//				}
	//			})
	//		}
	//
	//		Api.sendChat("gem 5000000", function(doc){
	//			doc.code.should.equal(200)
	//			func()
	//		})
	//	})
	//
	//	it("upgradeTower 箭塔升级时,建筑等级不合法", function(done){
	//		Api.sendChat("building 5", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeTower(1, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("箭塔升级时,建筑等级不合法")
	//				Api.sendChat("keep 6", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeTower 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeTower(1, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeTower 正常升级", function(done){
	//		Api.upgradeTower(1, true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("upgradeWall 城墙正在升级", function(done){
	//		Api.upgradeWall(false, function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeWall(false, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("城墙正在升级")
	//				Api.sendChat("rmbuildingevents", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeWall 城墙已达到最高等级", function(done){
	//		var func = function(){
	//			Api.upgradeWall(true, function(doc){
	//				if(doc.code == 200){
	//					func()
	//				}else{
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("城墙已达到最高等级")
	//					Api.sendChat("gem 5000", function(doc){
	//						doc.code.should.equal(200)
	//						done()
	//					})
	//				}
	//			})
	//		}
	//
	//		Api.sendChat("gem 5000000", function(doc){
	//			doc.code.should.equal(200)
	//			Api.sendChat("keep 22", function(doc){
	//				doc.code.should.equal(200)
	//				func()
	//			})
	//		})
	//	})
	//
	//	it("upgradeWall 城墙升级时,城墙等级不合法", function(done){
	//		Api.sendChat("building 5", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeWall(true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("城墙升级时,城墙等级不合法")
	//				Api.sendChat("keep 6", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeWall 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeWall(true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeWall 正常升级", function(done){
	//		Api.upgradeWall(true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("makeMaterial 工具作坊还未建造", function(done){
	//		Api.makeMaterial(Consts.MaterialType.Building, true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("工具作坊还未建造")
	//			done()
	//		})
	//	})
	//
	//	it("makeMaterial 同类型的材料正在制造", function(done){
	//		Api.upgradeBuilding(5, true, function(doc){
	//			doc.code.should.equal(200)
	//			Api.makeMaterial(Consts.MaterialType.Building, false, function(doc){
	//				doc.code.should.equal(200)
	//				Api.makeMaterial(Consts.MaterialType.Building, false, function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("同类型的材料正在制造")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("makeMaterial 不同类型的材料正在制造", function(done){
	//		Api.makeMaterial(Consts.MaterialType.Technology, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("不同类型的材料正在制造")
	//			done()
	//		})
	//	})
	//
	//	it("makeMaterial 同类型的材料制作完成后还未领取", function(done){
	//		Api.sendChat("rmmaterialevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.makeMaterial(Consts.MaterialType.Technology, true, function(doc){
	//				doc.code.should.equal(200)
	//				Api.makeMaterial(Consts.MaterialType.Technology, true, function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("同类型的材料制作完成后还未领取")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("makeMaterials 正常制造", function(done){
	//		Api.sendChat("rmmaterialevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.makeMaterial(Consts.MaterialType.Building, false, function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("getMaterials 没有材料建造事件存在", function(done){
	//		Api.getMaterials(Consts.MaterialType.Technology, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("没有材料建造事件存在")
	//			done()
	//		})
	//	})
	//
	//	it("getMaterials 同类型的材料正在制造", function(done){
	//		Api.getMaterials(Consts.MaterialType.Building, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("同类型的材料正在制造")
	//			done()
	//		})
	//	})
	//
	//	it("getMaterials 正常领取", function(done){
	//		Api.makeMaterial(Consts.MaterialType.Technology, true, function(doc){
	//			doc.code.should.equal(200)
	//			Api.getMaterials(Consts.MaterialType.Technology, function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("recruitNormalSoldier soldierName 普通兵种不存在", function(done){
	//		Api.recruitNormalSoldier("adf", 12, true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("soldierName 普通兵种不存在")
	//			done()
	//		})
	//	})
	//
	//	it("recruitNormalSoldier 兵营还未建造", function(done){
	//		Api.recruitNormalSoldier("swordsman", 12, true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("兵营还未建造")
	//			done()
	//		})
	//	})
	//
	//	it("recruitNormalSoldier 招募数量超过单次招募上限", function(done){
	//		Api.upgradeBuilding(8, true, function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitNormalSoldier("swordsman", 500, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("招募数量超过单次招募上限")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("recruitNormalSoldier 已有士兵正在被招募", function(done){
	//		Api.recruitNormalSoldier("swordsman", 5, false, function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitNormalSoldier("swordsman", 5, false, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("已有士兵正在被招募")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("recruitNormalSoldier 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitNormalSoldier("swordsman", 5, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("recruitNormalSoldier 正常立即招募", function(done){
	//		Api.recruitNormalSoldier("swordsman", 5, true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("recruitNormalSoldier 正常普通招募", function(done){
	//		Api.sendChat("rmsoldierevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitNormalSoldier("swordsman", 5, false, function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("recruitSpecialSoldier soldierName 特殊兵种不存在", function(done){
	//		Api.recruitSpecialSoldier("adf", 12, false, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("soldierName 特殊兵种不存在")
	//			done()
	//		})
	//	})
	//
	//	it("recruitSpecialSoldier 招募数量超过单次招募上限", function(done){
	//		Api.sendChat("rmsoldierevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitSpecialSoldier("skeletonWarrior", 100, false, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("招募数量超过单次招募上限")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("recruitSpecialSoldier 已有士兵正在被招募", function(done){
	//		Api.sendChat("rmsoldierevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitSpecialSoldier("skeletonWarrior", 5, false, function(doc){
	//				doc.code.should.equal(200)
	//				Api.recruitSpecialSoldier("skeletonWarrior", 5, false, function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("已有士兵正在被招募")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("recruitSpecialSoldier 材料不足", function(done){
	//		Api.sendChat("soldiermaterial 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("材料不足")
	//				Api.sendChat("soldiermaterial 1000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("recruitSpecialSoldier 正常立即招募", function(done){
	//		Api.sendChat("rmsoldierevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("recruitSpecialSoldier 正常普通招募", function(done){
	//		Api.recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("makeDragonEquipment equipmentName 装备不存在", function(done){
	//		Api.makeDragonEquipment("adf", true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("equipmentName 装备不存在")
	//			done()
	//		})
	//	})
	//
	//	it("makeDragonEquipment 铁匠铺还未建造", function(done){
	//		Api.makeDragonEquipment("moltenCrown", true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("铁匠铺还未建造")
	//			done()
	//		})
	//	})
	//
	//	it("makeDragonEquipment 材料不足", function(done){
	//		Api.sendChat("dragonmaterial 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeBuilding(9, true, function(doc){
	//				doc.code.should.equal(200)
	//				Api.makeDragonEquipment("moltenCrown", true, function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("材料不足")
	//					Api.sendChat("dragonmaterial 1000", function(doc){
	//						doc.code.should.equal(200)
	//						done()
	//					})
	//				})
	//			})
	//		})
	//	})
	//
	//	it("makeDragonEquipment 已有装备正在制作", function(done){
	//		Api.makeDragonEquipment("moltenCrown", false, function(doc){
	//			doc.code.should.equal(200)
	//			Api.makeDragonEquipment("moltenCrown", false, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("已有装备正在制作")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("makeDragonEquipment 正常普通制造", function(done){
	//		Api.sendChat("rmdragonequipmentevents", function(doc){
	//			doc.code.should.equal(200)
	//			Api.makeDragonEquipment("moltenCrown", false, function(doc){
	//				doc.code.should.equal(200)
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("makeDragonEquipment 正常立即制造", function(done){
	//		Api.makeDragonEquipment("moltenCrown", true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("treatSoldier soldiers 不合法", function(done){
	//		Api.treatSoldier("ad", true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("soldiers 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("treatSoldier 医院还未建造", function(done){
	//		Api.treatSoldier([], true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("医院还未建造")
	//			done()
	//		})
	//	})
	//
	//	it("treatSoldier 士兵不存在或士兵数量不合法1", function(done){
	//		Api.upgradeBuilding(1, true, function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeBuilding(7, true, function(doc){
	//				doc.code.should.equal(200)
	//				Api.upgradeBuilding(14, true, function(doc){
	//					doc.code.should.equal(200)
	//					Api.treatSoldier([], true, function(doc){
	//						doc.code.should.equal(500)
	//						doc.message.should.equal("士兵不存在或士兵数量不合法")
	//						done()
	//					})
	//				})
	//			})
	//		})
	//	})
	//
	//	it("treatSoldier 士兵不存在或士兵数量不合法2", function(done){
	//		Api.treatSoldier([{name:"add", count:12}], true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("士兵不存在或士兵数量不合法")
	//			done()
	//		})
	//	})
	//
	//	it("treatSoldier 士兵不存在或士兵数量不合法3", function(done){
	//		Api.treatSoldier([{name:"swordsman", count:1}], true, function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("士兵不存在或士兵数量不合法")
	//			done()
	//		})
	//	})
	//
	//	it("treatSoldier 士兵不存在或士兵数量不合法4", function(done){
	//		Api.sendChat("treatsoldiers 5", function(doc){
	//			doc.code.should.equal(200)
	//			Api.treatSoldier([{name:"swordsman", count:6}], true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("士兵不存在或士兵数量不合法")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("treatSoldier 士兵不存在或士兵数量不合法5", function(done){
	//		Api.treatSoldier([{name:"swordsman", count:5}], true, function(doc){
	//			doc.code.should.equal(200)
	//			Api.treatSoldier([{name:"swordsman", count:5}], true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("士兵不存在或士兵数量不合法")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("treatSoldier 已有士兵正在治疗", function(done){
	//		Api.treatSoldier([{name:"sentinel", count:5}, {name:"ranger", count:5}], false, function(doc){
	//			doc.code.should.equal(200)
	//			Api.treatSoldier([{name:"crossbowman", count:5}], false, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("已有士兵正在治疗")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("treatSoldier 宝石不足", function(done){
	//		Api.sendChat("gem 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.treatSoldier([{name:"crossbowman", count:5}], true, function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("宝石不足")
	//				Api.sendChat("gem 5000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("treatSoldier 正常普通治疗", function(done){
	//		Api.sendChat("treatsoldiers 5", function(doc){
	//			doc.code.should.equal(200)
	//			Api.sendChat("rmtreatsoldierevents", function(doc){
	//				doc.code.should.equal(200)
	//				Api.treatSoldier([{name:"sentinel", count:5}, {name:"ranger", count:5}], false, function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("treatSoldier 正常加速治疗", function(done){
	//		Api.treatSoldier([{name:"catapult", count:5}], true, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("hatchDragon 能量不足", function(done){
	//		Api.sendChat("energy 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.hatchDragon("redDragon", function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("能量不足")
	//				Api.sendChat("energy 100", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("hatchDragon 龙蛋早已成功孵化", function(done){
	//		Api.sendChat("dragonvitality redDragon 90", function(doc){
	//			doc.code.should.equal(200)
	//			Api.hatchDragon("redDragon", function(doc){
	//				doc.code.should.equal(200)
	//				Api.hatchDragon("redDragon", function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("龙蛋早已成功孵化")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("setDragonEquipment dragonType 不合法", function(done){
	//		Api.setDragonEquipment("redDragona", "crown", "moltenCrown", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("dragonType 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("setDragonEquipment equipmentCategory 不合法", function(done){
	//		Api.setDragonEquipment("redDragon", "crowna", "moltenCrown", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("equipmentCategory 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("setDragonEquipment equipmentName 不合法", function(done){
	//		Api.setDragonEquipment("redDragon", "crown", "moltenCrowna", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("equipmentName 不合法")
	//			done()
	//		})
	//	})
	//
	//	it("setDragonEquipment equipmentName 不能装备到equipmentCategory", function(done){
	//		Api.setDragonEquipment("redDragon", "crown", "fireSuppressChest", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("equipmentName 不能装备到equipmentCategory")
	//			done()
	//		})
	//	})
	//
	//	it("setDragonEquipment equipmentName 不能装备到dragonType", function(done){
	//		Api.setDragonEquipment("redDragon", "crown", "glacierCrown", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("equipmentName 不能装备到dragonType")
	//			done()
	//		})
	//	})
	//
	//	it("setDragonEquipment 龙还未孵化", function(done){
	//		Api.setDragonEquipment("blueDragon", "crown", "glacierCrown", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("龙还未孵化")
	//			done()
	//		})
	//	})
	//
	//	it("setDragonEquipment 装备与龙的星级不匹配", function(done){
	//		Api.setDragonEquipment("redDragon", "crown", "fireSuppressCrown", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("装备与龙的星级不匹配")
	//			done()
	//		})
	//	})
	//
	//	it("setDragonEquipment 仓库中没有此装备", function(done){
	//		Api.sendChat("dragonequipment 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("仓库中没有此装备")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("setDragonEquipment 龙身上已经存在相同类型的装备", function(done){
	//		Api.sendChat("dragonequipment 10", function(doc){
	//			doc.code.should.equal(200)
	//			Api.setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
	//				doc.code.should.equal(200)
	//				Api.setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("龙身上已经存在相同类型的装备")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("enhanceDragonEquipment 此分类还没有配置装备", function(done){
	//		Api.enhanceDragonEquipment("redDragon", "chest", [], function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("此分类还没有配置装备")
	//			done()
	//		})
	//	})
	//
	//	it("enhanceDragonEquipment 装备已到最高星级", function(done){
	//		Api.sendChat("dragonequipmentstar redDragon 10", function(doc){
	//			doc.code.should.equal(200)
	//			Api.enhanceDragonEquipment("redDragon", "crown", [{name:"moltenCrown", count:5}], function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("装备已到最高星级")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("enhanceDragonEquipment 被牺牲的装备不存在或数量不足1", function(done){
	//		Api.setDragonEquipment("redDragon", "armguardLeft", "moltenArmguard", function(doc){
	//			doc.code.should.equal(200)
	//			Api.enhanceDragonEquipment("redDragon", "armguardLeft", [], function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("被牺牲的装备不存在或数量不足")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("enhanceDragonEquipment 被牺牲的装备不存在或数量不足2", function(done){
	//		Api.enhanceDragonEquipment("redDragon", "armguardLeft", [{name:"moltenArmguard", count:30}], function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("被牺牲的装备不存在或数量不足")
	//			done()
	//		})
	//	})
	//
	//	it("enhanceDragonEquipment 被牺牲的装备不存在或数量不足3", function(done){
	//		Api.enhanceDragonEquipment("redDragon", "armguardLeft", [{name:"moltenArmguarda", count:5}], function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("被牺牲的装备不存在或数量不足")
	//			done()
	//		})
	//	})
	//
	//	it("enhanceDragonEquipment 被牺牲的装备不存在或数量不足4", function(done){
	//		Api.enhanceDragonEquipment("redDragon", "armguardLeft", [{name:"moltenArmguard", count:-1}], function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("被牺牲的装备不存在或数量不足")
	//			done()
	//		})
	//	})
	//
	//	it("enhanceDragonEquipment 正常强化", function(done){
	//		Api.enhanceDragonEquipment("redDragon", "armguardLeft", [{name:"moltenArmguard", count:5}], function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("resetDragonEquipment 此分类还没有配置装备", function(done){
	//		Api.resetDragonEquipment("redDragon", "chest", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("此分类还没有配置装备")
	//			done()
	//		})
	//	})
	//
	//	it("resetDragonEquipment 仓库中没有此装备", function(done){
	//		Api.sendChat("dragonequipment 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.resetDragonEquipment("redDragon", "crown", function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("仓库中没有此装备")
	//				Api.sendChat("dragonequipment 10", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("resetDragonEquipment 正常重置", function(done){
	//		Api.resetDragonEquipment("redDragon", "crown", function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//
	//	it("upgradeDragonSkill 龙还未孵化", function(done){
	//		Api.upgradeDragonDragonSkill("blueDragon", "skill_1", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("龙还未孵化")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeDragonSkill 此技能还未解锁", function(done){
	//		Api.upgradeDragonDragonSkill("redDragon", "skill_2", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("此技能还未解锁")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeDragonSkill 技能已达最高等级", function(done){
	//		Api.sendChat("dragonskill redDragon 60", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeDragonDragonSkill("redDragon", "skill_1", function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("技能已达最高等级")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("upgradeDragonSkill 能量不足", function(done){
	//		Api.sendChat("dragonskill redDragon 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.sendChat("energy 0", function(doc){
	//				doc.code.should.equal(200)
	//				Api.upgradeDragonDragonSkill("redDragon", "skill_1", function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("能量不足")
	//					Api.sendChat("energy 100", function(doc){
	//						doc.code.should.equal(200)
	//						done()
	//					})
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeDragonSkill 英雄之血不足", function(done){
	//		Api.sendChat("blood 0", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeDragonDragonSkill("redDragon", "skill_1", function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("英雄之血不足")
	//				Api.sendChat("blood 1000", function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeDragonSkill 正常升级", function(done){
	//		Api.upgradeDragonDragonSkill("redDragon", "skill_1", function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("upgradeDragonStar 龙还未孵化", function(done){
	//		Api.upgradeDragonStar("blueDragon", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("龙还未孵化")
	//			done()
	//		})
	//	})
	//
	//	it("upgradeDragonStar 龙的星级已达最高", function(done){
	//		Api.sendChat("dragonstar redDragon 10", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeDragonStar("redDragon", function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("龙的星级已达最高")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("upgradeDragonStar 龙的等级未达到晋级要求", function(done){
	//		Api.sendChat("dragonstar redDragon 1", function(doc){
	//			doc.code.should.equal(200)
	//			Api.sendChat("dragonstar redDragon 2", function(doc){
	//				doc.code.should.equal(200)
	//				Api.upgradeDragonStar("redDragon", function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("龙的等级未达到晋级要求")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("upgradeDragonStar 龙的装备未达到晋级要求", function(done){
	//		Api.sendChat("dragonstar redDragon 1", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeDragonStar("redDragon", function(doc){
	//				doc.code.should.equal(500)
	//				doc.message.should.equal("龙的装备未达到晋级要求")
	//				done()
	//			})
	//		})
	//	})
	//
	//	it("upgradeDragonStar 正常晋级", function(done){
	//		Api.setDragonEquipment("redDragon", "crown", "moltenCrown", function(doc){
	//			doc.code.should.equal(200)
	//			Api.setDragonEquipment("redDragon", "armguardLeft", "moltenArmguard", function(doc){
	//				doc.code.should.equal(200)
	//				Api.setDragonEquipment("redDragon", "armguardRight", "moltenArmguard", function(doc){
	//					doc.code.should.equal(200)
	//					Api.sendChat("dragonequipmentstar redDragon 5", function(doc){
	//						doc.code.should.equal(200)
	//						Api.upgradeDragonStar("redDragon", function(doc){
	//							doc.code.should.equal(200)
	//							done()
	//						})
	//					})
	//				})
	//			})
	//		})
	//	})
	//
	//	it("impose 市政厅还未建造", function(done){
	//		Api.impose(function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("市政厅还未建造")
	//			done()
	//		})
	//	})
	//
	//	it("impose 空闲城民不足", function(done){
	//		Api.sendChat("gem 500000", function(doc){
	//			doc.code.should.equal(200)
	//			Api.upgradeBuilding(1, true, function(doc){
	//				doc.code.should.equal(200)
	//				Api.upgradeBuilding(8, true, function(doc){
	//					doc.code.should.equal(200)
	//					Api.upgradeBuilding(9, true, function(doc){
	//						doc.code.should.equal(200)
	//						Api.upgradeBuilding(15, true, function(doc){
	//							doc.code.should.equal(200)
	//							Api.sendChat("citizen 0", function(doc){
	//								doc.code.should.equal(200)
	//								Api.impose(function(doc){
	//									doc.code.should.equal(500)
	//									doc.message.should.equal("空闲城民不足")
	//									done()
	//								})
	//							})
	//						})
	//					})
	//				})
	//			})
	//		})
	//	})
	//
	//	it("impose 正在收税中", function(done){
	//		Api.sendChat("citizen 1600", function(doc){
	//			doc.code.should.equal(200)
	//			Api.impose(function(doc){
	//				doc.code.should.equal(200)
	//				Api.impose(function(doc){
	//					doc.code.should.equal(500)
	//					doc.message.should.equal("正在收税中")
	//					done()
	//				})
	//			})
	//		})
	//	})
	//
	//	it("setPlayerLanguage", function(done){
	//		Api.setPlayerLanguage("cn", function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("getPlayerInfo", function(done){
	//		Api.getPlayerInfo(m_user._id, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("sendMail 不能给自己发邮件", function(done){
	//		Api.sendMail(m_user.basicInfo.name, "testMail", "this is a testMail", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("不能给自己发邮件")
	//			done()
	//		})
	//	})
	//
	//	it("sendMail 玩家不存在", function(done){
	//		Api.sendMail("adfadf", "testMail", "this is a testMail", function(doc){
	//			doc.code.should.equal(500)
	//			doc.message.should.equal("玩家不存在")
	//			done()
	//		})
	//	})
	//
	//	it("sendMail 正常发送", function(done){
	//		Api.loginPlayer(Config.deviceId2, function(doc){
	//			doc.code.should.equal(200)
	//			Api.sendMail(m_user.basicInfo.name, "testMail", "this is a testMail", function(doc){
	//				doc.code.should.equal(200)
	//				Api.loginPlayer(Config.deviceId, function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//				var onPlayerLoginSuccess = function(doc){
	//					m_user = doc
	//					pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
	//				}
	//				pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
	//			})
	//		})
	//	})
	//
	//	it("readMail 正常阅读", function(done){
	//		Api.readMail(m_user.mails[0].id, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("saveMail 正常收藏", function(done){
	//		Api.saveMail(m_user.mails[0].id, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("unSaveMail 正常取消收藏", function(done){
	//		Api.unSaveMail(m_user.mails[0].id, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("getMails 获取邮件", function(done){
	//		Api.getMails(0, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("getSendMails 获取已发邮件", function(done){
	//		Api.getSendMails(0, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("getSavedMails 获取已存邮件", function(done){
	//		Api.getSavedMails(0, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("deleteMail 正常删除收藏", function(done){
	//		Api.deleteMail(m_user.mails[0].id, function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("editPlayerName 正常修改", function(done){
	//		Api.editPlayerName("modun", function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("editPlayerCityName 正常修改", function(done){
	//		Api.editPlayerCityName("modun's city", function(doc){
	//			doc.code.should.equal(200)
	//			done()
	//		})
	//	})
	//
	//	it("getPlayerViewData 正常查看", function(done){
	//		var m_userData = null
	//		Api.loginPlayer(Config.deviceId2, function(doc){
	//			doc.code.should.equal(200)
	//			Api.loginPlayer(Config.deviceId, function(doc){
	//				doc.code.should.equal(200)
	//				Api.getPlayerViewData(m_userData._id, function(doc){
	//					doc.code.should.equal(200)
	//					done()
	//				})
	//			})
	//		})
	//		var onPlayerLoginSuccess = function(doc){
	//			m_userData = doc
	//			pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
	//		}
	//		pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
	//	})
	//})


	after(function(){
		pomelo.disconnect()
	})
})