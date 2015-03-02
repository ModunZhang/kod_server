/**
 * Created by modun on 14-7-25.
 */

var pomelo = require("../pomelo-client")
var redis = require("redis")
var path = require("path")
var Scripto = require('redis-scripto')
var Promise = require("bluebird")
var mongoose = require("mongoose")
var should = require('should')

var Consts = require("../../app/consts/consts")
var Config = require("../config")
var AllianceDao = require("../../app/dao/allianceDao")
var PlayerDao = require("../../app/dao/playerDao")
var Deal = Promise.promisifyAll(require("../../app/domains/deal"))
var Billing = Promise.promisifyAll(require("../../app/domains/billing"))
var Api = require("../api")
var commandDir = path.resolve(__dirname + "/../../app/commands")
var allianceDao = null
var playerDao = null

describe("PlayerService", function(){
	var m_user

	before(function(done){
		mongoose.connect(Config.mongoAddr, function(){
			var redisClient = redis.createClient(Config.redisPort, Config.redisAddr)
			var scripto = new Scripto(redisClient)
			scripto.loadFromDir(commandDir)

			allianceDao = Promise.promisifyAll(new AllianceDao(redisClient, scripto, "production"))
			playerDao = Promise.promisifyAll(new PlayerDao(redisClient, scripto, "production"))
			playerDao.deleteAllAsync().then(function(){
				return allianceDao.deleteAllAsync()
			}).then(function(){
				return Deal.removeAsync()
			}).then(function(){
				return Billing.removeAsync()
			}).then(function(){
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


	describe("playerHandler", function(){
		//it("upgradeBuilding location 不合法", function(done){
		//	Api.upgradeBuilding(26, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("location 不合法")
		//		done()
		//	})
		//})
		//
		//it("upgradeBuilding 建筑正在升级", function(done){
		//	Api.upgradeBuilding(1, false, function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeBuilding(1, false, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("建筑正在升级")
		//			done()
		//		})
		//	})
		//})
		//
		//it("upgradeBuilding 建筑还未建造", function(done){
		//	Api.upgradeBuilding(10, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("建筑还未建造")
		//		done()
		//	})
		//})
		//
		//it("upgradeBuilding 建筑建造时,建筑坑位不合法", function(done){
		//	Api.upgradeBuilding(7, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("建筑建造时,建筑坑位不合法")
		//		done()
		//	})
		//})
		//
		//it("upgradeBuilding 建造数量已达建造上限", function(done){
		//	Api.upgradeBuilding(6, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("建造数量已达建造上限")
		//		done()
		//	})
		//})
		//
		//it("upgradeBuilding 建筑已达到最高等级", function(done){
		//	var func = function(){
		//		Api.upgradeBuilding(3, true, function(doc){
		//			if(doc.code == 200){
		//				func()
		//			}else{
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("建筑已达到最高等级")
		//				done()
		//			}
		//		})
		//	}
		//
		//	Api.sendChat("buildinglevel 1 40", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("buildinglevel 3 39")
		//		Api.sendChat("resources gem 5000000", function(doc){
		//			doc.code.should.equal(200)
		//			func()
		//		})
		//	})
		//})
		//
		//it("upgradeBuilding 正常普通升级", function(done){
		//	Api.sendChat("rmbuildingevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeBuilding(2, false, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//		var onPlayerDataChanged = function(doc){
		//			m_user.buildingEvents = doc.buildingEvents
		//			pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
		//		}
		//		pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		//	})
		//})
		//
		//it("freeSpeedUp 正常免费加速", function(done){
		//	Api.freeSpeedUp("buildingEvents", m_user.buildingEvents[0].id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("upgradeBuilding 正常升级立即完成", function(done){
		//	Api.upgradeBuilding(2, true, function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("rmbuildingevents", function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("createHouse buildingLocation 不合法", function(done){
		//	Api.createHouse("dwelling", 26, 1, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("buildingLocation 不合法")
		//		done()
		//	})
		//})
		//
		//it("createHouse houseLocation 不合法", function(done){
		//	Api.createHouse("dwelling", 25, 4, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("houseLocation 不合法")
		//		done()
		//	})
		//})
		//
		//it("createHouse 主体建筑不存在", function(done){
		//	Api.createHouse("dwelling", 25, 1, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("主体建筑不存在")
		//		done()
		//	})
		//})
		//
		//it("createHouse 主体建筑必须大于等于1级", function(done){
		//	Api.createHouse("dwelling", 5, 1, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("主体建筑必须大于等于1级")
		//		done()
		//	})
		//})
		//
		//it("createHouse 小屋类型不存在", function(done){
		//	Api.createHouse("dwellinga", 3, 1, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("小屋类型不存在")
		//		done()
		//	})
		//})
		//
		//it("createHouse 建筑周围不允许建造小屋", function(done){
		//	Api.createHouse("dwelling", 1, 1, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("建筑周围不允许建造小屋")
		//		done()
		//	})
		//})
		//
		//it("createHouse 创建小屋时,小屋坑位不合法", function(done){
		//	Api.createHouse("dwelling", 3, 1, false, function(doc){
		//		doc.code.should.equal(200)
		//		Api.createHouse("dwelling", 3, 1, false, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("创建小屋时,小屋坑位不合法")
		//			done()
		//		})
		//	})
		//})
		//
		//it("createHouse 建造小屋会造成可用城民小于0", function(done){
		//	Api.createHouse("farmer", 3, 3, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("建造小屋会造成可用城民小于0")
		//		done()
		//	})
		//})
		//
		//it("createHouse 正常加速创建", function(done){
		//	Api.createHouse("dwelling", 3, 2, true, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("createHouse 正常普通创建", function(done){
		//	Api.sendChat("rmbuildingevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.createHouse("farmer", 3, 3, false, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("upgradeHouse 主体建筑必须大于等于1级", function(done){
		//	Api.upgradeHouse(5, 1, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("主体建筑必须大于等于1级")
		//		done()
		//	})
		//})
		//
		//it("upgradeHouse 小屋不存在", function(done){
		//	Api.upgradeHouse(4, 1, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("小屋不存在")
		//		done()
		//	})
		//})
		//
		//it("upgradeHouse 小屋正在升级", function(done){
		//	Api.sendChat("rmbuildingevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeHouse(3, 1, false, function(doc){
		//			doc.code.should.equal(200)
		//			Api.upgradeHouse(3, 1, false, function(doc){
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("小屋正在升级")
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("upgradeHouse 小屋已达到最高等级", function(done){
		//	var func = function(){
		//		Api.upgradeHouse(3, 2, true, function(doc){
		//			if(doc.code == 200){
		//				func()
		//			}else{
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("小屋已达到最高等级")
		//				done()
		//			}
		//		})
		//	}
		//
		//	func()
		//})
		//
		//it("upgradeHouse 升级小屋会造成可用城民小于0", function(done){
		//	Api.sendChat("resources citizen 0", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeHouse(3, 3, true, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("升级小屋会造成可用城民小于0")
		//			Api.sendChat("resources citizen 100", function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("upgradeHouse 正常升级1", function(done){
		//	Api.upgradeHouse(3, 3, true, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("switchBuilding 正常转换", function(done){
		//	Api.sendChat("buildinglevel 10 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("buildinglevel 5 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.createHouse("quarrier", 5, 1, true, function(doc){
		//				doc.code.should.equal(200)
		//				Api.upgradeHouse(5, 1, true, function(doc){
		//					doc.code.should.equal(200)
		//					Api.switchBuilding(10, "stoneMason", function(doc){
		//						doc.code.should.equal(200)
		//						done()
		//					})
		//				})
		//			})
		//		})
		//	})
		//})
		//
		//it("makeMaterial 工具作坊还未建造", function(done){
		//	Api.makeMaterial(Consts.MaterialType.BuildingMaterials, true, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("工具作坊还未建造")
		//		done()
		//	})
		//})
		//
		//it("makeMaterial 同类型的材料正在制造", function(done){
		//	Api.sendChat("buildinglevel 15 2", function(doc){
		//		doc.code.should.equal(200)
		//		Api.makeMaterial(Consts.MaterialType.BuildingMaterials, true, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getMaterials(Consts.MaterialType.BuildingMaterials, function(doc){
		//				doc.code.should.equal(200)
		//				Api.makeMaterial(Consts.MaterialType.BuildingMaterials, false, function(doc){
		//					doc.code.should.equal(200)
		//					Api.makeMaterial(Consts.MaterialType.BuildingMaterials, false, function(doc){
		//						doc.code.should.equal(500)
		//						doc.message.should.equal("同类型的材料正在制造")
		//						done()
		//					})
		//				})
		//			})
		//		})
		//	})
		//})
		//
		//it("makeMaterial 不同类型的材料正在制造", function(done){
		//	Api.makeMaterial(Consts.MaterialType.TechnologyMaterials, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("不同类型的材料正在制造")
		//		done()
		//	})
		//})
		//
		//it("makeMaterial 同类型的材料制作完成后还未领取", function(done){
		//	Api.sendChat("rmmaterialevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.makeMaterial(Consts.MaterialType.TechnologyMaterials, true, function(doc){
		//			doc.code.should.equal(200)
		//			Api.makeMaterial(Consts.MaterialType.TechnologyMaterials, true, function(doc){
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("同类型的材料制作完成后还未领取")
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("makeMaterials 正常制造", function(done){
		//	Api.sendChat("rmmaterialevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.makeMaterial(Consts.MaterialType.BuildingMaterials, false, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("getMaterials 没有材料建造事件存在", function(done){
		//	Api.getMaterials(Consts.MaterialType.TechnologyMaterials, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("没有材料建造事件存在")
		//		done()
		//	})
		//})
		//
		//it("getMaterials 同类型的材料正在制造", function(done){
		//	Api.getMaterials(Consts.MaterialType.BuildingMaterials, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("同类型的材料正在制造")
		//		done()
		//	})
		//})
		//
		//it("getMaterials 正常领取", function(done){
		//	Api.makeMaterial(Consts.MaterialType.TechnologyMaterials, true, function(doc){
		//		doc.code.should.equal(200)
		//		Api.getMaterials(Consts.MaterialType.TechnologyMaterials, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("recruitNormalSoldier soldierName 普通兵种不存在", function(done){
		//	Api.recruitNormalSoldier("adf", 12, true, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("soldierName 普通兵种不存在")
		//		done()
		//	})
		//})
		//
		//it("recruitNormalSoldier 招募数量超过单次招募上限", function(done){
		//	Api.sendChat("buildinglevel 5 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.recruitNormalSoldier("swordsman", 500, true, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("招募数量超过单次招募上限")
		//			done()
		//		})
		//	})
		//})
		//
		//it("recruitNormalSoldier 已有士兵正在被招募", function(done){
		//	Api.recruitNormalSoldier("swordsman", 5, false, function(doc){
		//		doc.code.should.equal(200)
		//		Api.recruitNormalSoldier("swordsman", 5, false, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("已有士兵正在被招募")
		//			done()
		//		})
		//	})
		//})
		//
		//it("recruitNormalSoldier 正常立即招募", function(done){
		//	Api.recruitNormalSoldier("swordsman", 5, true, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("recruitNormalSoldier 正常普通招募", function(done){
		//	Api.sendChat("rmsoldierevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.recruitNormalSoldier("swordsman", 5, false, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("recruitSpecialSoldier soldierName 特殊兵种不存在", function(done){
		//	Api.recruitSpecialSoldier("adf", 12, false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("soldierName 特殊兵种不存在")
		//		done()
		//	})
		//})
		//
		//it("recruitSpecialSoldier 招募数量超过单次招募上限", function(done){
		//	Api.sendChat("rmsoldierevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.recruitSpecialSoldier("skeletonWarrior", 100, false, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("招募数量超过单次招募上限")
		//			done()
		//		})
		//	})
		//})
		//
		//it("recruitSpecialSoldier 已有士兵正在被招募", function(done){
		//	Api.sendChat("rmsoldierevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.recruitSpecialSoldier("skeletonWarrior", 5, false, function(doc){
		//			doc.code.should.equal(200)
		//			Api.recruitSpecialSoldier("skeletonWarrior", 5, false, function(doc){
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("已有士兵正在被招募")
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("recruitSpecialSoldier 材料不足", function(done){
		//	Api.sendChat("soldiermaterial 0", function(doc){
		//		doc.code.should.equal(200)
		//		Api.recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("材料不足")
		//			Api.sendChat("soldiermaterial 1000", function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("recruitSpecialSoldier 正常立即招募", function(done){
		//	Api.sendChat("rmsoldierevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("recruitSpecialSoldier 正常普通招募", function(done){
		//	Api.recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("makeDragonEquipment equipmentName 装备不存在", function(done){
		//	Api.makeDragonEquipment("adf", true, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("equipmentName 装备不存在")
		//		done()
		//	})
		//})
		//
		//it("makeDragonEquipment 材料不足", function(done){
		//	Api.sendChat("dragonmaterial 0", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("buildinglevel 9 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.makeDragonEquipment("redCrown_s1", true, function(doc){
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("材料不足")
		//				Api.sendChat("dragonmaterial 1000", function(doc){
		//					doc.code.should.equal(200)
		//					done()
		//				})
		//			})
		//		})
		//	})
		//})
		//
		//it("makeDragonEquipment 已有装备正在制作", function(done){
		//	Api.makeDragonEquipment("redCrown_s1", false, function(doc){
		//		doc.code.should.equal(200)
		//		Api.makeDragonEquipment("redCrown_s1", false, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("已有装备正在制作")
		//			done()
		//		})
		//	})
		//})
		//
		//it("makeDragonEquipment 正常普通制造", function(done){
		//	Api.sendChat("rmdragonequipmentevents", function(doc){
		//		doc.code.should.equal(200)
		//		Api.makeDragonEquipment("redCrown_s1", false, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("makeDragonEquipment 正常立即制造", function(done){
		//	Api.makeDragonEquipment("redCrown_s1", true, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("treatSoldier soldiers 不合法", function(done){
		//	Api.treatSoldier("ad", true, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("soldiers 不合法")
		//		done()
		//	})
		//})
		//
		//it("treatSoldier 士兵不存在或士兵数量不合法1", function(done){
		//	Api.sendChat("buildinglevel 6 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.treatSoldier([], true, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("士兵不存在或士兵数量不合法")
		//			done()
		//		})
		//	})
		//})
		//
		//it("treatSoldier 士兵不存在或士兵数量不合法2", function(done){
		//	Api.treatSoldier([{name:"add", count:12}], true, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("士兵不存在或士兵数量不合法")
		//		done()
		//	})
		//})
		//
		//it("treatSoldier 士兵不存在或士兵数量不合法3", function(done){
		//	Api.treatSoldier([{name:"swordsman", count:1}], true, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("士兵不存在或士兵数量不合法")
		//		done()
		//	})
		//})
		//
		//it("treatSoldier 士兵不存在或士兵数量不合法4", function(done){
		//	Api.sendChat("woundedsoldiers 5", function(doc){
		//		doc.code.should.equal(200)
		//		Api.treatSoldier([{name:"swordsman", count:6}], true, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("士兵不存在或士兵数量不合法")
		//			done()
		//		})
		//	})
		//})
		//
		//it("treatSoldier 士兵不存在或士兵数量不合法5", function(done){
		//	Api.treatSoldier([{name:"swordsman", count:5}], true, function(doc){
		//		doc.code.should.equal(200)
		//		Api.treatSoldier([{name:"swordsman", count:5}], true, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("士兵不存在或士兵数量不合法")
		//			done()
		//		})
		//	})
		//})
		//
		//it("treatSoldier 已有士兵正在治疗", function(done){
		//	Api.treatSoldier([{name:"sentinel", count:5}, {name:"ranger", count:5}], false, function(doc){
		//		doc.code.should.equal(200)
		//		Api.treatSoldier([{name:"crossbowman", count:5}], false, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("已有士兵正在治疗")
		//			done()
		//		})
		//	})
		//})
		//
		//it("treatSoldier 正常普通治疗", function(done){
		//	Api.sendChat("woundedsoldiers 5", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("rmtreatsoldierevents", function(doc){
		//			doc.code.should.equal(200)
		//			Api.treatSoldier([{name:"sentinel", count:5}, {name:"ranger", count:5}], false, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("treatSoldier 正常加速治疗", function(done){
		//	Api.treatSoldier([{name:"catapult", count:5}], true, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("hatchDragon 龙蛋早已成功孵化", function(done){
		//	Api.hatchDragon("redDragon", function(doc){
		//		doc.code.should.equal(200)
		//		Api.hatchDragon("redDragon", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("龙蛋早已成功孵化")
		//			done()
		//		})
		//	})
		//})
		//
		//it("hatchDragon 正常孵化", function(done){
		//	Api.hatchDragon("blueDragon", function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("hatchDragon 已有龙蛋正在孵化", function(done){
		//	Api.hatchDragon("blueDragon", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("已有龙蛋正在孵化")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment dragonType 不合法", function(done){
		//	Api.setDragonEquipment("redDragona", "crown", "moltenCrown", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("dragonType 不合法")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment equipmentCategory 不合法", function(done){
		//	Api.setDragonEquipment("redDragon", "crowna", "moltenCrown", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("equipmentCategory 不合法")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment equipmentName 不合法", function(done){
		//	Api.setDragonEquipment("redDragon", "crown", "moltenCrowna", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("equipmentName 不合法")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment equipmentName 不能装备到equipmentCategory", function(done){
		//	Api.setDragonEquipment("redDragon", "crown", "blueChest_s2", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("equipmentName 不能装备到equipmentCategory")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment equipmentName 不能装备到dragonType", function(done){
		//	Api.setDragonEquipment("redDragon", "crown", "blueCrown_s1", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("equipmentName 不能装备到dragonType")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment 龙还未孵化", function(done){
		//	Api.setDragonEquipment("blueDragon", "crown", "blueCrown_s1", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("龙还未孵化")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment 装备与龙的星级不匹配", function(done){
		//	Api.setDragonEquipment("redDragon", "crown", "redCrown_s2", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("装备与龙的星级不匹配")
		//		done()
		//	})
		//})
		//
		//it("setDragonEquipment 仓库中没有此装备", function(done){
		//	Api.sendChat("dragonequipment 0", function(doc){
		//		doc.code.should.equal(200)
		//		Api.setDragonEquipment("redDragon", "crown", "redCrown_s1", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("仓库中没有此装备")
		//			done()
		//		})
		//	})
		//})
		//
		//it("setDragonEquipment 龙身上已经存在相同类型的装备", function(done){
		//	Api.sendChat("dragonequipment 10", function(doc){
		//		doc.code.should.equal(200)
		//		Api.setDragonEquipment("redDragon", "crown", "redCrown_s1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.setDragonEquipment("redDragon", "crown", "redCrown_s1", function(doc){
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("龙身上已经存在相同类型的装备")
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("enhanceDragonEquipment 此分类还没有配置装备", function(done){
		//	Api.enhanceDragonEquipment("redDragon", "chest", [], function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("此分类还没有配置装备")
		//		done()
		//	})
		//})
		//
		//it("enhanceDragonEquipment 装备已到最高星级", function(done){
		//	Api.sendChat("dragonequipmentstar redDragon 10", function(doc){
		//		doc.code.should.equal(200)
		//		Api.enhanceDragonEquipment("redDragon", "crown", [{name:"redCrown_s1", count:5}], function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("装备已到最高星级")
		//			done()
		//		})
		//	})
		//})
		//
		//it("enhanceDragonEquipment 被牺牲的装备不存在或数量不足1", function(done){
		//	Api.setDragonEquipment("redDragon", "armguardLeft", "redArmguard_s1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.enhanceDragonEquipment("redDragon", "armguardLeft", [], function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("被牺牲的装备不存在或数量不足")
		//			done()
		//		})
		//	})
		//})
		//
		//it("enhanceDragonEquipment 被牺牲的装备不存在或数量不足2", function(done){
		//	Api.enhanceDragonEquipment("redDragon", "armguardLeft", [{name:"redCrown_s2", count:30}], function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("被牺牲的装备不存在或数量不足")
		//		done()
		//	})
		//})
		//
		//it("enhanceDragonEquipment 被牺牲的装备不存在或数量不足3", function(done){
		//	Api.enhanceDragonEquipment("redDragon", "armguardLeft", [{name:"redCrown_s6", count:5}], function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("被牺牲的装备不存在或数量不足")
		//		done()
		//	})
		//})
		//
		//it("enhanceDragonEquipment 正常强化", function(done){
		//	Api.enhanceDragonEquipment("redDragon", "armguardLeft", [{name:"redArmguard_s1", count:5}], function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("resetDragonEquipment 此分类还没有配置装备", function(done){
		//	Api.resetDragonEquipment("redDragon", "chest", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("此分类还没有配置装备")
		//		done()
		//	})
		//})
		//
		//it("resetDragonEquipment 仓库中没有此装备", function(done){
		//	Api.sendChat("dragonequipment 0", function(doc){
		//		doc.code.should.equal(200)
		//		Api.resetDragonEquipment("redDragon", "crown", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("仓库中没有此装备")
		//			Api.sendChat("dragonequipment 10", function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("resetDragonEquipment 正常重置", function(done){
		//	Api.resetDragonEquipment("redDragon", "crown", function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("upgradeDragonSkill 龙还未孵化", function(done){
		//	Api.upgradeDragonDragonSkill("blueDragon", "skill_1", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("龙还未孵化")
		//		done()
		//	})
		//})
		//
		//it("upgradeDragonSkill 此技能还未解锁", function(done){
		//	Api.upgradeDragonDragonSkill("redDragon", "skill_4", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("此技能还未解锁")
		//		done()
		//	})
		//})
		//
		//it("upgradeDragonSkill 技能已达最高等级", function(done){
		//	Api.sendChat("dragonskill redDragon 60", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeDragonDragonSkill("redDragon", "skill_1", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("技能已达最高等级")
		//			Api.sendChat("dragonskill redDragon 0", function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("upgradeDragonSkill 英雄之血不足", function(done){
		//	Api.sendChat("resources blood 0", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeDragonDragonSkill("redDragon", "skill_1", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("英雄之血不足")
		//			Api.sendChat("resources blood 1000", function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("upgradeDragonSkill 正常升级", function(done){
		//	Api.upgradeDragonDragonSkill("redDragon", "skill_1", function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("upgradeDragonStar 龙还未孵化", function(done){
		//	Api.upgradeDragonStar("blueDragon", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("龙还未孵化")
		//		done()
		//	})
		//})
		//
		//it("upgradeDragonStar 龙的星级已达最高", function(done){
		//	Api.sendChat("dragonstar redDragon 10", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeDragonStar("redDragon", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("龙的星级已达最高")
		//			done()
		//		})
		//	})
		//})
		//
		//it("upgradeDragonStar 龙的等级未达到晋级要求", function(done){
		//	Api.sendChat("dragonstar redDragon 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("dragonstar redDragon 2", function(doc){
		//			doc.code.should.equal(200)
		//			Api.upgradeDragonStar("redDragon", function(doc){
		//				doc.code.should.equal(500)
		//				doc.message.should.equal("龙的等级未达到晋级要求")
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("upgradeDragonStar 龙的装备未达到晋级要求", function(done){
		//	Api.sendChat("dragonstar redDragon 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeDragonStar("redDragon", function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("龙的装备未达到晋级要求")
		//			done()
		//		})
		//	})
		//})
		//
		//it("upgradeDragonStar 正常晋级", function(done){
		//	Api.setDragonEquipment("redDragon", "crown", "redCrown_s1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.setDragonEquipment("redDragon", "armguardLeft", "redArmguard_s1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.setDragonEquipment("redDragon", "armguardRight", "redArmguard_s1", function(doc){
		//				doc.code.should.equal(200)
		//				Api.sendChat("dragonequipmentstar redDragon 5", function(doc){
		//					doc.code.should.equal(200)
		//					Api.upgradeDragonStar("redDragon", function(doc){
		//						doc.code.should.equal(200)
		//						done()
		//					})
		//				})
		//			})
		//		})
		//	})
		//})
		//
		//it("getDailyQuests 成功获取", function(done){
		//	Api.sendChat("gem 500000", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("buildinglevel 14 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.getDailyQuests(function(doc){
		//				doc.code.should.equal(200)
		//				Api.getDailyQuests(function(doc){
		//					doc.code.should.equal(200)
		//					done()
		//				})
		//				var onPlayerDataChanged = function(doc){
		//					m_user.dailyQuests = doc.dailyQuests
		//					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
		//				}
		//				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		//			})
		//		})
		//	})
		//})
		//
		//it("addDailyQuestStar 成功升星", function(done){
		//	Api.addDailyQuestStar(m_user.dailyQuests.quests[0].id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("startDailyQuest 成功开始", function(done){
		//	Api.startDailyQuest(m_user.dailyQuests.quests[0].id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//	var onPlayerDataChanged = function(doc){
		//		m_user.dailyQuestEvents.push(doc.__dailyQuestEvents[0].data)
		//		pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
		//	}
		//	pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		//})
		//
		//it("startDailyQuest 任务不存在", function(done){
		//	Api.startDailyQuest(m_user.dailyQuests.quests[0].id, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("任务不存在")
		//		done()
		//	})
		//})
		//
		//it("startDailyQuest 已经有任务正在进行中", function(done){
		//	Api.startDailyQuest(m_user.dailyQuests.quests[1].id, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("已经有任务正在进行中")
		//		done()
		//	})
		//})
		//
		////it("getDailyQeustReward 正常领取", function(done){
		////	setTimeout(function(){
		////		Api.getDailyQeustReward(m_user.dailyQuestEvents[0].id, function(doc){
		////			doc.code.should.equal(200)
		////			done()
		////		})
		////	}, 2000)
		////})
		//
		//it("setPlayerLanguage", function(done){
		//	Api.setPlayerLanguage("cn", function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getPlayerInfo", function(done){
		//	Api.getPlayerInfo(m_user._id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("sendMail 不能给自己发邮件", function(done){
		//	Api.sendMail(m_user.basicInfo.name, "testMail", "this is a testMail", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("不能给自己发邮件")
		//		done()
		//	})
		//})
		//
		//it("sendMail 玩家不存在", function(done){
		//	Api.sendMail("adfadf", "testMail", "this is a testMail", function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("玩家不存在")
		//		done()
		//	})
		//})
		//
		//it("sendMail 正常发送", function(done){
		//	Api.loginPlayer(Config.deviceId2, function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendMail(m_user.basicInfo.name, "testMail", "this is a testMail", function(doc){
		//			doc.code.should.equal(200)
		//			Api.loginPlayer(Config.deviceId, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//			var onPlayerLoginSuccess = function(doc){
		//				m_user = doc
		//				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//			}
		//			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//		})
		//	})
		//})
		//
		//it("readMails 正常阅读", function(done){
		//	Api.readMails([m_user.mails[0].id], function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("saveMail 正常收藏", function(done){
		//	Api.saveMail(m_user.mails[0].id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("unSaveMail 正常取消收藏", function(done){
		//	Api.unSaveMail(m_user.mails[0].id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getMails 获取邮件", function(done){
		//	Api.getMails(0, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getSendMails 获取已发邮件", function(done){
		//	Api.getSendMails(0, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getSavedMails 获取已存邮件", function(done){
		//	Api.getSavedMails(0, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("deleteMails 正常删除收藏", function(done){
		//	Api.deleteMails([m_user.mails[0].id], function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getPlayerViewData 正常查看", function(done){
		//	var m_userData = null
		//	Api.loginPlayer(Config.deviceId2, function(doc){
		//		doc.code.should.equal(200)
		//		Api.loginPlayer(Config.deviceId, function(doc){
		//			doc.code.should.equal(200)
		//			Api.getPlayerViewData(m_userData._id, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//	var onPlayerLoginSuccess = function(doc){
		//		m_userData = doc
		//		pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//	}
		//	pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//})
		//
		//it("setDefenceDragon 正常设置", function(done){
		//	Api.sendChat("dragonstar greenDragon 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.setDefenceDragon("greenDragon", function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("cancelDefenceDragon 正常取消", function(done){
		//	Api.cancelDefenceDragon(function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("sellItem 没有足够的出售队列", function(done){
		//	Api.sellItem("resources", "wood", 1000, 1, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("没有足够的出售队列")
		//		done()
		//	})
		//})
		//
		//it("sellItem 玩家资源不足", function(done){
		//	Api.sendChat("buildinglevel 16 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sellItem("resources", "wood", 10000000, 1000, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("玩家资源不足")
		//			done()
		//		})
		//	})
		//})
		//
		//it("sellItem 马车数量不足", function(done){
		//	Api.sellItem("resources", "wood", 100, 1000, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("马车数量不足")
		//		done()
		//	})
		//})
		//
		//it("sellItem 正常出售", function(done){
		//	Api.sendChat("resources cart 100", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sellItem("resources", "wood", 2, 1, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//var sellItems = null
		//it("getSellItems 正常获取", function(done){
		//	Api.loginPlayer(Config.deviceId2, function(doc){
		//		doc.code.should.equal(200)
		//		Api.getSellItems("resources", "wood", function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//		var onGetSellItemsSuccess = function(docs){
		//			sellItems = docs
		//			pomelo.removeListener("onGetSellItemsSuccess", onGetSellItemsSuccess)
		//		}
		//		pomelo.on("onGetSellItemsSuccess", onGetSellItemsSuccess)
		//	})
		//})
		//
		//it("buySellItem 正常购买", function(done){
		//	Api.buySellItem(sellItems[0]._id, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getMyItemSoldMoney 正常获取", function(done){
		//	Api.loginPlayer(Config.deviceId, function(doc){
		//		doc.code.should.equal(200)
		//		Api.getMyItemSoldMoney(sellItems[0]._id, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("removeMySellItem 正常下架", function(done){
		//	var deal = null
		//	Api.sellItem("resources", "wood", 1, 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.removeMySellItem(deal.id, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//	var onPlayerDataChanged = function(doc){
		//		deal = doc.__deals[0].data
		//		pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
		//	}
		//	pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		//})
		//
		//it("upgradeProductionTech 前置科技条件不满足", function(done){
		//	Api.sendChat("buildinglevel 7 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeProductionTech("fastFix", true, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("前置科技条件不满足")
		//			done()
		//		})
		//	})
		//})
		//
		//it("upgradeProductionTech 正常升级", function(done){
		//	Api.upgradeBuilding(7, true, function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeProductionTech("crane", false, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("upgradeProductionTech 正常升级", function(done){
		//	Api.upgradeProductionTech("crane", false, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("upgradeMilitaryTech 建筑还未建造", function(done){
		//	Api.upgradeMilitaryTech("infantry_infantry", false, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("建筑还未建造")
		//		done()
		//	})
		//})
		//
		//it("upgradeMilitaryTech 正常升级", function(done){
		//	Api.sendChat("keep 15", function(doc){
		//		doc.code.should.equal(200)
		//		Api.sendChat("buildinglevel 18 1", function(doc){
		//			doc.code.should.equal(200)
		//			Api.upgradeMilitaryTech("infantry_infantry", true, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("upgradeMilitaryTech 正常升级", function(done){
		//	Api.upgradeMilitaryTech("infantry_infantry", false, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("upgradeSoldierStar 科技点不足", function(done){
		//	Api.upgradeSoldierStar("ranger", true, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("科技点不足")
		//		done()
		//	})
		//})
		//
		//it("upgradeSoldierStar 正常升级", function(done){
		//	Api.sendChat("buildinglevel 19 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeMilitaryTech("archer_infantry", true, function(doc){
		//			doc.code.should.equal(200)
		//			Api.upgradeSoldierStar("ranger", true, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("upgradeSoldierStar 正常升级", function(done){
		//	Api.upgradeMilitaryTech("archer_infantry", true, function(doc){
		//		doc.code.should.equal(200)
		//		Api.upgradeSoldierStar("ranger", false, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("setTerrain 正常设置", function(done){
		//	Api.setTerrain(Consts.AllianceTerrain.IceField, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("buyAndUseItem changePlayerName", function(done){
		//	Api.buyAndUseItem("changePlayerName", {
		//		changePlayerName:{
		//			playerName:"modunzhang"
		//		}
		//	}, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("useItem movingConstruction", function(done){
		//	Api.buyItem("movingConstruction", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("movingConstruction", {
		//			movingConstruction:{
		//				fromBuildingLocation:3,
		//				fromHouseLocation:2,
		//				toBuildingLocation:5,
		//				toHouseLocation:2
		//			}
		//		}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem torch", function(done){
		//	Api.buyItem("torch", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("torch", {
		//			torch:{
		//				buildingLocation:5,
		//				houseLocation:2
		//			}
		//		}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem changePlayerName", function(done){
		//	Api.buyItem("changePlayerName", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("changePlayerName", {
		//			changePlayerName:{
		//				playerName:"modunzhang1"
		//			}
		//		}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem changeCityName", function(done){
		//	Api.buyItem("changeCityName", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("changeCityName", {
		//			changeCityName:{
		//				cityName:"modunzhang"
		//			}
		//		}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem dragonExp_2", function(done){
		//	Api.buyItem("dragonExp_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("dragonExp_2", {
		//			dragonExp_2:{
		//				dragonType:"redDragon"
		//			}
		//		}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem dragonHp_2", function(done){
		//	Api.buyItem("dragonHp_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("dragonHp_2", {
		//			dragonHp_2:{
		//				dragonType:"redDragon"
		//			}
		//		}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem heroBlood_2", function(done){
		//	Api.buyItem("heroBlood_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("heroBlood_2", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem stamina_2", function(done){
		//	Api.buyItem("stamina_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("stamina_2", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem restoreWall_2", function(done){
		//	Api.buyItem("restoreWall_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("restoreWall_2", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem dragonChest_2", function(done){
		//	Api.buyItem("dragonChest_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("dragonChest_2", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem chest_4 道具不存在或数量不足", function(done){
		//	Api.buyItem("chest_4", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("chest_4", {}, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("道具不存在或数量不足")
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem chest_4", function(done){
		//	Api.buyItem("chest_4", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.buyItem("chestKey_4", 1, function(doc){
		//			doc.code.should.equal(200)
		//			Api.useItem("chest_4", {}, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//})
		//
		//it("useItem vipActive_3", function(done){
		//	Api.buyItem("vipActive_3", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("vipActive_3", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem vipPoint_3", function(done){
		//	Api.buyItem("vipPoint_3", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("vipPoint_3", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem masterOfDefender_2", function(done){
		//	Api.buyItem("masterOfDefender_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("masterOfDefender_2", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem stoneBonus_1", function(done){
		//	Api.buyItem("stoneBonus_1", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("stoneBonus_1", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem stoneBonus_2", function(done){
		//	Api.buyItem("stoneBonus_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("stoneBonus_2", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem woodClass_3", function(done){
		//	Api.buyItem("woodClass_3", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("woodClass_3", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem casinoTokenClass_2", function(done){
		//	Api.buyItem("casinoTokenClass_2", 1, function(doc){
		//		doc.code.should.equal(200)
		//		Api.useItem("casinoTokenClass_2", {}, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("useItem speedup_3", function(done){
		//	Api.loginPlayer(Config.deviceId, function(doc){
		//		doc.code.should.equal(200)
		//		Api.buyItem("speedup_3", 1, function(doc){
		//			doc.code.should.equal(200)
		//			Api.useItem("speedup_3", {
		//				speedup_3:{
		//					eventType:"productionTechEvents",
		//					eventId:m_user.productionTechEvents[0].id
		//				}
		//			}, function(doc){
		//				doc.code.should.equal(200)
		//				done()
		//			})
		//		})
		//	})
		//	var onPlayerLoginSuccess = function(doc){
		//		m_user = doc
		//		pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//	}
		//	pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		//})
		//
		//it("setPveData 正常设置", function(done){
		//	Api.setPveData(
		//		{
		//			staminaUsed:5,
		//			location:{
		//				x:1,
		//				y:1,
		//				z:1
		//			},
		//			floor:{
		//				level:1,
		//				fogs:"asdfasdfasf",
		//				objects:"asdfasdfasfd"
		//			}
		//		},
		//		{
		//			dragon:{
		//				type:"redDragon",
		//				hpDecreased:12,
		//				expAdd:12
		//			},
		//			soldiers:[{
		//				name:"swordsman",
		//				damagedCount:10,
		//				woundedCount:5
		//			}]
		//		},
		//		[{
		//			type:"resources",
		//			name:"wood",
		//			count:12
		//		}, {
		//			type:"resources",
		//			name:"gem",
		//			count:-2
		//		}, {
		//			type:"items",
		//			name:"torch",
		//			count:2
		//		}],
		//		function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//})
		//
		//it("gacha 正常Gacha1", function(done){
		//	Api.gacha(Consts.GachaType.Normal, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("gacha 正常Gacha2", function(done){
		//	Api.gacha(Consts.GachaType.Advanced, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getDay60Reward 正常领取", function(done){
		//	Api.getDay60Reward(function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getDay60Reward 今日登陆奖励已领取", function(done){
		//	Api.getDay60Reward(function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("今日登陆奖励已领取")
		//		done()
		//	})
		//})
		//
		//it("getOnlineReward 在线时间不足,不能领取", function(done){
		//	Api.getOnlineReward(Consts.OnlineTimePoint.M15, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("在线时间不足,不能领取")
		//		done()
		//	})
		//})
		//
		////it("getOnlineReward 正常领取", function(done){
		////	setTimeout(function(){
		////		Api.getOnlineReward(Consts.OnlineTimePoint.M15, function(doc){
		////			doc.code.should.equal(200)
		////			done()
		////		})
		////	}, 15 * 1000)
		////})
		//
		////it("getOnlineReward 此时间节点的在线奖励已经领取", function(done){
		////	Api.getOnlineReward(Consts.OnlineTimePoint.M15, function(doc){
		////		doc.code.should.equal(500)
		////		doc.message.should.equal("此时间节点的在线奖励已经领取")
		////		done()
		////	})
		////})
		//
		//it("getDay14Reward 正常领取", function(done){
		//	Api.getDay14Reward(function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getDay14Reward 今日王城援军奖励已领取", function(done){
		//	Api.getDay14Reward(function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("今日王城援军奖励已领取")
		//		done()
		//	})
		//})
		//
		//it("getLevelupReward 玩家城堡等级不足以领取当前冲级奖励", function(done){
		//	Api.sendChat("buildinglevel 1 1", function(doc){
		//		doc.code.should.equal(200)
		//		Api.getLevelupReward(1, function(doc){
		//			doc.code.should.equal(500)
		//			doc.message.should.equal("玩家城堡等级不足以领取当前冲级奖励")
		//			done()
		//		})
		//	})
		//})
		//
		//it("getLevelupReward 正常领取", function(done){
		//	Api.sendChat("buildinglevel 1 5", function(doc){
		//		doc.code.should.equal(200)
		//		Api.getLevelupReward(1, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
		//
		//it("getLevelupReward 当前等级的冲级奖励已经领取", function(done){
		//	Api.getLevelupReward(1, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("当前等级的冲级奖励已经领取")
		//		done()
		//	})
		//})
		//
		////it("addPlayerBillingData 正常添加", function(done){
		////	Api.addPlayerBillingData("1000000141446814", "{\"signature\" = \"AlRBqfH3oqIh5txcPfPPhWdnYONJ+hFv5iwib8ngQ9HXDczSEg46IiLEN/myPzP2LyTvnLI8BGZSnELH2F0oc0EtwbA2GLNxfByBtBbXuNgr9a+QKvGSFExV1yqGWI6QX7GWmDOeNZw2krl34VPdjOYsSYHy49zhhG/dNx/UqrwEAAADVzCCA1MwggI7oAMCAQICCBup4+PAhm/LMA0GCSqGSIb3DQEBBQUAMH8xCzAJBgNVBAYTAlVTMRMwEQYDVQQKDApBcHBsZSBJbmMuMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTEzMDEGA1UEAwwqQXBwbGUgaVR1bmVzIFN0b3JlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MB4XDTE0MDYwNzAwMDIyMVoXDTE2MDUxODE4MzEzMFowZDEjMCEGA1UEAwwaUHVyY2hhc2VSZWNlaXB0Q2VydGlmaWNhdGUxGzAZBgNVBAsMEkFwcGxlIGlUdW5lcyBTdG9yZTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMmTEuLgjimLwRJxy1oEf0esUNDVEIe6wDsnnal14hNBt1v195X6n93YO7gi3orPSux9D554SkMp+Sayg84lTc362UtmYLpWnb34nqyGx9KBVTy5OGV4ljE1OwC+oTnRM+QLRCmeNxMbPZhS47T+eZtDEhVB9usk3+JM2Cogfwo7AgMBAAGjcjBwMB0GA1UdDgQWBBSJaEeNuq9Df6ZfN68Fe+I2u22ssDAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFDYd6OKdgtIBGLUyaw7XQwuRWEM6MA4GA1UdDwEB/wQEAwIHgDAQBgoqhkiG92NkBgUBBAIFADANBgkqhkiG9w0BAQUFAAOCAQEAeaJV2U51rxfcqAAe5C2/fEW8KUl4iO4lMuta7N6XzP1pZIz1NkkCtIIweyNj5URYHK+HjRKSU9RLguNl0nkfxqObiMckwRudKSq69NInrZyCD66R4K77nb9lMTABSSYlsKt8oNtlhgR/1kjSSRQcHktsDcSiQGKMdkSlp4AyXf7vnHPBe4yCwYV2PpSN04kboiJ3pBlxsGwV/ZlL26M2ueYHKYCuXhdqFwxVgm52h3oeJOOt/vY4EcQq7eqHm6m03Z9b7PRzYM2KGXHDmOMk7vDpeMVlLDPSGYz1+U3sDxJzebSpbaJmT7imzUKfggEY7xxf4czfH0yj5wNzSGTOvQ==\";\"purchase-info\" = \"ewoJIm9yaWdpbmFsLXB1cmNoYXNlLWRhdGUtcHN0IiA9ICIyMDE1LTAyLTAxIDE5OjExOjQ1IEFtZXJpY2EvTG9zX0FuZ2VsZXMiOwoJInVuaXF1ZS1pZGVudGlmaWVyIiA9ICIwOThjNTYyYjMzY2M1NzFmYmUwNzA4NmI2NTRmMjA5NDVmMjc3M2VhIjsKCSJvcmlnaW5hbC10cmFuc2FjdGlvbi1pZCIgPSAiMTAwMDAwMDE0MTQ0NjgxNCI7CgkiYnZycyIgPSAiMS4wIjsKCSJ0cmFuc2FjdGlvbi1pZCIgPSAiMTAwMDAwMDE0MTQ0NjgxNCI7CgkicXVhbnRpdHkiID0gIjEiOwoJIm9yaWdpbmFsLXB1cmNoYXNlLWRhdGUtbXMiID0gIjE0MjI4NDY3MDU5NDYiOwoJInVuaXF1ZS12ZW5kb3ItaWRlbnRpZmllciIgPSAiNjQwQjAxNUMtQzQ1Qi00MzJBLTgxRDgtNjkwNzlDQjQzOThDIjsKCSJwcm9kdWN0LWlkIiA9ICJwcm9kdWN0XzEiOwoJIml0ZW0taWQiID0gIjk2MzU2OTg1NSI7CgkiYmlkIiA9ICJjb20uYmF0Y2F0c3R1ZGlvLmtvZCI7CgkicHVyY2hhc2UtZGF0ZS1tcyIgPSAiMTQyMjg0NjcwNTk0NiI7CgkicHVyY2hhc2UtZGF0ZSIgPSAiMjAxNS0wMi0wMiAwMzoxMTo0NSBFdGMvR01UIjsKCSJwdXJjaGFzZS1kYXRlLXBzdCIgPSAiMjAxNS0wMi0wMSAxOToxMTo0NSBBbWVyaWNhL0xvc19BbmdlbGVzIjsKCSJvcmlnaW5hbC1wdXJjaGFzZS1kYXRlIiA9ICIyMDE1LTAyLTAyIDAzOjExOjQ1IEV0Yy9HTVQiOwp9\";\"environment\" = \"Sandbox\";\"pod\" = \"100\";\"signing-status\" = \"0\";}", function(doc){
		////		doc.code.should.equal(200)
		////		done()
		////	})
		////})
		////
		////it("addPlayerBillingData 重复的订单号", function(done){
		////	Api.addPlayerBillingData("1000000141446814", "{\"signature\" = \"AlRBqfH3oqIh5txcPfPPhWdnYONJ+hFv5iwib8ngQ9HXDczSEg46IiLEN/myPzP2LyTvnLI8BGZSnELH2F0oc0EtwbA2GLNxfByBtBbXuNgr9a+QKvGSFExV1yqGWI6QX7GWmDOeNZw2krl34VPdjOYsSYHy49zhhG/dNx/UqrwEAAADVzCCA1MwggI7oAMCAQICCBup4+PAhm/LMA0GCSqGSIb3DQEBBQUAMH8xCzAJBgNVBAYTAlVTMRMwEQYDVQQKDApBcHBsZSBJbmMuMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTEzMDEGA1UEAwwqQXBwbGUgaVR1bmVzIFN0b3JlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MB4XDTE0MDYwNzAwMDIyMVoXDTE2MDUxODE4MzEzMFowZDEjMCEGA1UEAwwaUHVyY2hhc2VSZWNlaXB0Q2VydGlmaWNhdGUxGzAZBgNVBAsMEkFwcGxlIGlUdW5lcyBTdG9yZTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMmTEuLgjimLwRJxy1oEf0esUNDVEIe6wDsnnal14hNBt1v195X6n93YO7gi3orPSux9D554SkMp+Sayg84lTc362UtmYLpWnb34nqyGx9KBVTy5OGV4ljE1OwC+oTnRM+QLRCmeNxMbPZhS47T+eZtDEhVB9usk3+JM2Cogfwo7AgMBAAGjcjBwMB0GA1UdDgQWBBSJaEeNuq9Df6ZfN68Fe+I2u22ssDAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFDYd6OKdgtIBGLUyaw7XQwuRWEM6MA4GA1UdDwEB/wQEAwIHgDAQBgoqhkiG92NkBgUBBAIFADANBgkqhkiG9w0BAQUFAAOCAQEAeaJV2U51rxfcqAAe5C2/fEW8KUl4iO4lMuta7N6XzP1pZIz1NkkCtIIweyNj5URYHK+HjRKSU9RLguNl0nkfxqObiMckwRudKSq69NInrZyCD66R4K77nb9lMTABSSYlsKt8oNtlhgR/1kjSSRQcHktsDcSiQGKMdkSlp4AyXf7vnHPBe4yCwYV2PpSN04kboiJ3pBlxsGwV/ZlL26M2ueYHKYCuXhdqFwxVgm52h3oeJOOt/vY4EcQq7eqHm6m03Z9b7PRzYM2KGXHDmOMk7vDpeMVlLDPSGYz1+U3sDxJzebSpbaJmT7imzUKfggEY7xxf4czfH0yj5wNzSGTOvQ==\";\"purchase-info\" = \"ewoJIm9yaWdpbmFsLXB1cmNoYXNlLWRhdGUtcHN0IiA9ICIyMDE1LTAyLTAxIDE5OjExOjQ1IEFtZXJpY2EvTG9zX0FuZ2VsZXMiOwoJInVuaXF1ZS1pZGVudGlmaWVyIiA9ICIwOThjNTYyYjMzY2M1NzFmYmUwNzA4NmI2NTRmMjA5NDVmMjc3M2VhIjsKCSJvcmlnaW5hbC10cmFuc2FjdGlvbi1pZCIgPSAiMTAwMDAwMDE0MTQ0NjgxNCI7CgkiYnZycyIgPSAiMS4wIjsKCSJ0cmFuc2FjdGlvbi1pZCIgPSAiMTAwMDAwMDE0MTQ0NjgxNCI7CgkicXVhbnRpdHkiID0gIjEiOwoJIm9yaWdpbmFsLXB1cmNoYXNlLWRhdGUtbXMiID0gIjE0MjI4NDY3MDU5NDYiOwoJInVuaXF1ZS12ZW5kb3ItaWRlbnRpZmllciIgPSAiNjQwQjAxNUMtQzQ1Qi00MzJBLTgxRDgtNjkwNzlDQjQzOThDIjsKCSJwcm9kdWN0LWlkIiA9ICJwcm9kdWN0XzEiOwoJIml0ZW0taWQiID0gIjk2MzU2OTg1NSI7CgkiYmlkIiA9ICJjb20uYmF0Y2F0c3R1ZGlvLmtvZCI7CgkicHVyY2hhc2UtZGF0ZS1tcyIgPSAiMTQyMjg0NjcwNTk0NiI7CgkicHVyY2hhc2UtZGF0ZSIgPSAiMjAxNS0wMi0wMiAwMzoxMTo0NSBFdGMvR01UIjsKCSJwdXJjaGFzZS1kYXRlLXBzdCIgPSAiMjAxNS0wMi0wMSAxOToxMTo0NSBBbWVyaWNhL0xvc19BbmdlbGVzIjsKCSJvcmlnaW5hbC1wdXJjaGFzZS1kYXRlIiA9ICIyMDE1LTAyLTAyIDAzOjExOjQ1IEV0Yy9HTVQiOwp9\";\"environment\" = \"Sandbox\";\"pod\" = \"100\";\"signing-status\" = \"0\";}", function(doc){
		////		doc.code.should.equal(500)
		////		doc.message.should.equal("重复的订单号")
		////		done()
		////	})
		////})
		////
		////it("getFirstIAPRewards 正常获取", function(done){
		////	Api.getFirstIAPRewards(function(doc){
		////		doc.code.should.equal(200)
		////		done()
		////	})
		////})
		////
		////it("getFirstIAPRewards 奖励已经领取", function(done){
		////	Api.getFirstIAPRewards(function(doc){
		////		doc.code.should.equal(500)
		////		doc.message.should.equal("奖励已经领取")
		////		done()
		////	})
		////})
		//
		//it("passSelinasTest 正常通过", function(done){
		//	Api.passSelinasTest(function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getDailyTaskRewards 正常领取", function(done){
		//	Api.getDailyTaskRewards(Consts.DailyTaskTypes.EmpireRise, function(doc){
		//		doc.code.should.equal(200)
		//		done()
		//	})
		//})
		//
		//it("getDailyTaskRewards 奖励已经领取", function(done){
		//	Api.getDailyTaskRewards(Consts.DailyTaskTypes.EmpireRise, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("奖励已经领取")
		//		done()
		//	})
		//})
		//
		//it("getGrowUpTaskRewards 任务未完成或奖励已领取", function(done){
		//	Api.getGrowUpTaskRewards(Consts.GrowUpTaskTypes.CityBuild, 123, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("任务未完成或奖励已领取")
		//		done()
		//	})
		//})
		//
		//it("getGrowUpTaskRewards 还有前置任务奖励未领取", function(done){
		//	Api.getGrowUpTaskRewards(Consts.GrowUpTaskTypes.CityBuild, 860, function(doc){
		//		doc.code.should.equal(500)
		//		doc.message.should.equal("还有前置任务奖励未领取")
		//		done()
		//	})
		//})
		//
		//it("getGrowUpTaskRewards 正常领取", function(done){
		//	Api.getGrowUpTaskRewards(Consts.GrowUpTaskTypes.CityBuild, 858, function(doc){
		//		doc.code.should.equal(200)
		//		Api.getGrowUpTaskRewards(Consts.GrowUpTaskTypes.CityBuild, 859, function(doc){
		//			doc.code.should.equal(200)
		//			done()
		//		})
		//	})
		//})
	})


	after(function(){
		pomelo.disconnect()
	})
})