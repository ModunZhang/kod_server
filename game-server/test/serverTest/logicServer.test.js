/**
 * Created by modun on 14-7-25.
 */

var should = require('should')
var pomelo = require("../pomelo-client")
var mongoose = require("mongoose")
var _ = require("underscore")
var Consts = require("../../app/consts/consts")

var Config = require("../config")
var Player = require("../../app/domains/player")

var ClearTestAccount = function(callback){
	mongoose.connect(Config.mongoAddr, function(){
		Player.findOneAndRemove({"countInfo.deviceId":Config.deviceId}, callback)
	})
}

var sendChat = function(text, callback){
	var info = {
		text:text,
		type:"global"
	}
	var route = "chat.chatHandler.send"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var upgradeBuilding = function(location, finishNow, callback){
	var info = {
		location:location,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeBuilding"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var createHouse = function(houseType, buildingLocation, houseLocation, finishNow, callback){
	var info = {
		buildingLocation:buildingLocation,
		houseType:houseType,
		houseLocation:houseLocation,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.createHouse"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var upgradeHouse = function(buildingLocation, houseLocation, finishNow, callback){
	var info = {
		buildingLocation:buildingLocation,
		houseLocation:houseLocation,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeHouse"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var destroyHouse = function(buildingLocation, houseLocation, callback){
	var info = {
		buildingLocation:buildingLocation,
		houseLocation:houseLocation
	}
	var route = "logic.playerHandler.destroyHouse"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var upgradeTower = function(location, finishNow, callback){
	var info = {
		location:location,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeTower"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var upgradeWall = function(finishNow, callback){
	var info = {
		finishNow:finishNow
	}
	var route = "logic.playerHandler.upgradeWall"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var makeMaterial = function(category, finishNow, callback){
	var info = {
		category:category,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.makeMaterial"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var getMaterials = function(category, callback){
	var info = {
		category:category
	}
	var route = "logic.playerHandler.getMaterials"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var recruitNormalSoldier = function(soldierName, count, finishNow, callback){
	var info = {
		soldierName:soldierName,
		count:count,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.recruitNormalSoldier"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var recruitSpecialSoldier = function(soldierName, count, finishNow, callback){
	var info = {
		soldierName:soldierName,
		count:count,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.recruitSpecialSoldier"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var makeDragonEquipment = function(equipmentName, finishNow, callback){
	var info = {
		equipmentName:equipmentName,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.makeDragonEquipment"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}

var treatSoldier = function(soldiers, finishNow, callback){
	var info = {
		soldiers:soldiers,
		finishNow:finishNow
	}
	var route = "logic.playerHandler.treatSoldier"
	pomelo.request(route, info, function(doc){
		callback(doc)
	})
}


describe("LogicServer", function(){
	var m_user

	before(function(done){
		ClearTestAccount(function(){
			pomelo.init({
				host:Config.gateHost,
				port:Config.gatePort,
				log:true
			}, function(){
				var loginInfo = {
					deviceId:Config.deviceId
				}
				var route = "gate.gateHandler.queryEntry"
				pomelo.request(route, loginInfo, function(doc){
					pomelo.disconnect()
					pomelo.init({
						host:doc.data.host,
						port:doc.data.port,
						log:true
					}, function(){
						done()
					})
				})
			})
		})
	})


	describe("entryHandler", function(){
		it("login", function(done){
			var loginInfo = {
				deviceId:Config.deviceId
			}
			var route = "front.entryHandler.login"
			pomelo.request(route, loginInfo, function(doc){
				doc.code.should.equal(200)
			})
			var onPlayerLoginSuccess = function(doc){
				m_user = doc
				done()
				pomelo.removeListener("onPlayerLoginSuccess", onPlayerLoginSuccess)
			}
			pomelo.on("onPlayerLoginSuccess", onPlayerLoginSuccess)
		})
	})


	describe("playerHandler", function(){
		it("upgradeBuilding 建筑不存在", function(done){
			upgradeBuilding(1.5, false, function(doc){
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

		it("upgradeBuilding 没有空闲的建造队列", function(done){
			upgradeBuilding(2, false, function(doc){
				doc.code.should.equal(200)
				upgradeBuilding(3, false, function(doc){
					doc.code.should.equal(500)
					done()
				})
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

		it("createHouse 主体建筑不存在", function(done){
			createHouse("dwelling", 55, 1, false, function(doc){
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

		it("createHouse 小屋location只能1<=location<=3", function(done){
			createHouse("dwelling", 3, 4, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("小屋location只能1<=location<=3")

				createHouse("dwelling", 3, 0, false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("小屋location只能1<=location<=3")

					createHouse("dwelling", 3, 1.5, false, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("小屋location只能1<=location<=3")
						done()
					})
				})
			})
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

		it("createHouse 没有空闲的建造队列", function(done){
			createHouse("dwelling", 3, 3, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("没有空闲的建造队列")
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

		it("upgradeHouse 没有空闲的建造队列", function(done){
			upgradeHouse(3, 3, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("没有空闲的建造队列")
				done()
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
			destroyHouse(55, 1, function(doc){
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

		it("upgradeTower 箭塔不存在", function(done){
			upgradeTower(1.5, false, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("箭塔不存在")
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

		it("upgradeTower 没有空闲的建造队列", function(done){
			upgradeTower(1, false, function(doc){
				doc.code.should.equal(200)
				upgradeTower(2, false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("没有空闲的建造队列")
					sendChat("rmbuildingevents", function(doc){
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

		it("upgradeWall 没有空闲的建造队列", function(done){
			upgradeBuilding(2, false, function(doc){
				doc.code.should.equal(200)
				upgradeWall(false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("没有空闲的建造队列")
					sendChat("rmbuildingevents", function(doc){
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

		it("treatSoldier 正常加速治疗", function(done){
			treatSoldier([
				{name:"catapult", count:5}
			], true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})
	})


	after(function(){
		pomelo.disconnect()
	})
})