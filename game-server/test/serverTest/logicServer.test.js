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
			var buildingInfo = {
				location:1.5,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑不存在")
				done()
			})
		})

		it("upgradeBuilding 建筑正在升级", function(done){
			var buildingInfo = {
				location:1,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)

				var buildingInfo = {
					location:1,
					finishNow:false
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("建筑正在升级")
					done()
				})
			})
		})

		it("upgradeBuilding 建筑还未建造", function(done){
			var buildingInfo = {
				location:10,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑还未建造")
				done()
			})
		})

		it("upgradeBuilding 建筑建造时,建筑坑位不合法", function(done){
			var buildingInfo = {
				location:7,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑建造时,建筑坑位不合法")
				done()
			})
		})

		it("upgradeBuilding 建造数量已达建造上限", function(done){
			var buildingInfo = {
				location:6,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建造数量已达建造上限")
				done()
			})
		})

		it("upgradeBuilding 建筑升级时,建筑等级不合法", function(done){
			var buildingInfo = {
				location:2,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
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

			var chatInfo = {
				text:"keep 22",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.buildings["location_1"].level.should.equal(22)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeBuilding 宝石不足", function(done){
			var func = function(){
				var buildingInfo = {
					location:3,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")

					var chatInfo = {
						text:"gem 5000",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.resources.gem.should.equal(5000)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"gem 0",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(0)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeBuilding 正常升级", function(done){
			var buildingInfo = {
				location:2,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, buildingInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.buildings["location_2"].level.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("createHouse 主体建筑不存在", function(done){
			var houseInfo = {
				buildingLocation:55,
				houseType:"dwelling",
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑不存在")
				done()
			})
		})

		it("createHouse 主体建筑必须大于等于1级", function(done){
			var houseInfo = {
				buildingLocation:5,
				houseType:"dwelling",
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑必须大于等于1级")
				done()
			})
		})

		it("createHouse 小屋类型不存在", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseType:"dwellinga",
				houseLocation:3,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
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
					finishNow:false
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
			var houseInfo = {
				buildingLocation:3,
				houseType:"dwelling",
				houseLocation:4,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("小屋location只能1<=location<=3")

				var houseInfo = {
					buildingLocation:3,
					houseType:"dwelling",
					houseLocation:0,
					finishNow:false
				}
				var route = "logic.playerHandler.createHouse"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("小屋location只能1<=location<=3")

					var houseInfo = {
						buildingLocation:3,
						houseType:"dwelling",
						houseLocation:1.5,
						finishNow:false
					}
					var route = "logic.playerHandler.createHouse"
					pomelo.request(route, houseInfo, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("小屋location只能1<=location<=3")
						done()
					})
				})
			})
		})

		it("createHouse 建筑周围不允许建造小屋", function(done){
			var houseInfo = {
				buildingLocation:1,
				houseType:"dwelling",
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建筑周围不允许建造小屋")
				done()
			})
		})

		it("createHouse 创建小屋时,小屋坑位不合法", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseType:"dwelling",
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)


				var houseInfo = {
					buildingLocation:3,
					houseType:"dwelling",
					houseLocation:1,
					finishNow:false
				}
				var route = "logic.playerHandler.createHouse"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("创建小屋时,小屋坑位不合法")
					done()
				})
			})
		})

		it("createHouse 建造小屋会造成可用城民小于0", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseType:"farmer",
				houseLocation:3,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("建造小屋会造成可用城民小于0")
				done()
			})
		})

		it("createHouse 宝石不足", function(done){
			var func = function(){
				var houseInfo = {
					buildingLocation:3,
					houseType:"dwelling",
					houseLocation:2,
					finishNow:true
				}
				var route = "logic.playerHandler.createHouse"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")

					var chatInfo = {
						text:"gem 5000",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.resources.gem.should.equal(5000)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"gem 0",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(0)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("createHouse 正常创建", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseType:"dwelling",
				houseLocation:2,
				finishNow:true
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				should.exist(doc)
				doc.buildings["location_3"].houses.length.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeHouse 主体建筑不存在", function(done){
			var houseInfo = {
				buildingLocation:55,
				houseLocation:1,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑不存在")
				done()
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
			var houseInfo = {
				buildingLocation:3,
				houseType:"farmer",
				houseLocation:3,
				finishNow:false
			}
			var route = "logic.playerHandler.createHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)

				var houseInfo = {
					buildingLocation:3,
					houseLocation:3,
					finishNow:false
				}
				var route = "logic.playerHandler.upgradeHouse"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("小屋正在升级")
					done()
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

						var chatInfo = {
							text:"gem 5000",
							type:"global"
						}
						var route = "chat.chatHandler.send"
						pomelo.request(route, chatInfo, function(doc){
							doc.code.should.equal(200)
						})

						var onPlayerDataChanged = function(doc){
							doc.resources.gem.should.equal(5000)
							done()
							pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
						}
						pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
					}
				})
			}

			var chatInfo = {
				text:"gem 5000000",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(5000000)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeHouse 升级小屋会造成可用城民小于0", function(done){
			var func = function(){
				var houseInfo = {
					buildingLocation:3,
					houseLocation:3,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeHouse"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("升级小屋会造成可用城民小于0")

					var chatInfo = {
						text:"citizen 100",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.resources.citizen.should.equal(100)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"rmbuildingevents",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)

				var chatInfo = {
					text:"citizen 0",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					doc.code.should.equal(200)
					func()
				})
			})
		})

		it("upgradeHouse 宝石不足", function(done){
			var func = function(){
				var houseInfo = {
					buildingLocation:3,
					houseLocation:3,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeHouse"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")

					var chatInfo = {
						text:"gem 5000",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.resources.gem.should.equal(5000)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"gem 0",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(0)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeHouse 正常升级", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:3,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				should.exist(doc)
				doc.buildings["location_3"].houses[2].level.should.equal(1)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("destroyHouse 主体建筑不存在", function(done){
			var houseInfo = {
				buildingLocation:55,
				houseLocation:1
			}
			var route = "logic.playerHandler.destroyHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("主体建筑不存在")
				done()
			})
		})

		it("destroyHouse 小屋不存在", function(done){
			var houseInfo = {
				buildingLocation:4,
				houseLocation:1
			}
			var route = "logic.playerHandler.destroyHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("小屋不存在")
				done()
			})
		})

		it("destroyHouse 拆除此建筑后会造成可用城民数量小于0", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:2
			}
			var route = "logic.playerHandler.destroyHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("拆除此建筑后会造成可用城民数量小于0")
				done()
			})
		})

		it("destroyHouse 宝石不足", function(done){
			var func = function(){
				var houseInfo = {
					buildingLocation:3,
					houseLocation:3
				}
				var route = "logic.playerHandler.destroyHouse"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")

					var chatInfo = {
						text:"gem 5000",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.resources.gem.should.equal(5000)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"gem 0",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(0)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("destroyHouse 正常拆除", function(done){
			var houseInfo = {
				buildingLocation:3,
				houseLocation:3
			}
			var route = "logic.playerHandler.destroyHouse"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.buildings["location_3"].houses.length.should.equal(2)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeTower 箭塔不存在", function(done){
			var houseInfo = {
				location:1.5,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeTower"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("箭塔不存在")
				done()
			})
		})

		it("upgradeTower 箭塔正在升级", function(done){
			var houseInfo = {
				location:1,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeTower"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)

				var houseInfo = {
					location:1,
					finishNow:false
				}
				var route = "logic.playerHandler.upgradeTower"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("箭塔正在升级")
					done()
				})
			})
		})

		it("upgradeTower 箭塔还未建造", function(done){
			var houseInfo = {
				location:9,
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeTower"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("箭塔还未建造")
				done()
			})
		})

		it("upgradeTower 箭塔已达到最高等级", function(done){
			var func = function(){
				var buildingInfo = {
					location:2,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeTower"
				pomelo.request(route, buildingInfo, function(doc){
					if(doc.code == 200){
						func()
					}else{
						doc.code.should.equal(500)
						doc.message.should.equal("箭塔已达到最高等级")

						var chatInfo = {
							text:"gem 5000",
							type:"global"
						}
						var route = "chat.chatHandler.send"
						pomelo.request(route, chatInfo, function(doc){
							doc.code.should.equal(200)
						})

						var onPlayerDataChanged = function(doc){
							doc.resources.gem.should.equal(5000)
							done()
							pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
						}
						pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
					}
				})
			}

			var chatInfo = {
				text:"gem 5000000",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(5000000)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeTower 箭塔升级时,建筑等级不合法", function(done){
			var func = function(){
				var buildingInfo = {
					location:1,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeTower"
				pomelo.request(route, buildingInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("箭塔升级时,建筑等级不合法")

					var chatInfo = {
						text:"keep 6",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.buildings["location_1"].level.should.equal(6)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"building 5",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.towers["location_1"].level.should.equal(5)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeTower 宝石不足", function(done){
			var func = function(){
				var houseInfo = {
					location:1,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeTower"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")

					var chatInfo = {
						text:"gem 5000",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.resources.gem.should.equal(5000)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"gem 0",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(0)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeTower 正常升级", function(done){
			var houseInfo = {
				location:1,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeTower"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.towers["location_1"].level.should.equal(6)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeWall 城墙正在升级", function(done){
			var houseInfo = {
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeWall"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)

				var houseInfo = {
					finishNow:false
				}
				var route = "logic.playerHandler.upgradeWall"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("城墙正在升级")

					var chatInfo = {
						text:"rmbuildingevents",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(){
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			})
		})

		it("upgradeWall 城墙已达到最高等级", function(done){
			var func = function(){
				var buildingInfo = {
					location:2,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeWall"
				pomelo.request(route, buildingInfo, function(doc){
					if(doc.code == 200){
						func()
					}else{
						doc.code.should.equal(500)
						doc.message.should.equal("城墙已达到最高等级")

						var chatInfo = {
							text:"gem 5000",
							type:"global"
						}
						var route = "chat.chatHandler.send"
						pomelo.request(route, chatInfo, function(doc){
							doc.code.should.equal(200)
						})

						var onPlayerDataChanged = function(doc){
							doc.resources.gem.should.equal(5000)

							var chatInfo = {
								text:"building 5",
								type:"global"
							}
							var route = "chat.chatHandler.send"
							pomelo.request(route, chatInfo, function(doc){
								doc.code.should.equal(200)
								done()
							})

							pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
						}
						pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
					}
				})
			}

			var chatInfo = {
				text:"gem 5000000",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(5000000)

				var chatInfo = {
					text:"keep 22",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					doc.code.should.equal(200)
					func()
				})
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeWall 城墙升级时,城墙等级不合法", function(done){
			var houseInfo = {
				finishNow:false
			}
			var route = "logic.playerHandler.upgradeWall"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("城墙升级时,城墙等级不合法")

				var chatInfo = {
					text:"keep 6",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(){
					done()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			})
		})

		it("upgradeWall 宝石不足", function(done){
			var func = function(){
				var houseInfo = {
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeWall"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("宝石不足")

					var chatInfo = {
						text:"gem 5000",
						type:"global"
					}
					var route = "chat.chatHandler.send"
					pomelo.request(route, chatInfo, function(doc){
						doc.code.should.equal(200)
					})

					var onPlayerDataChanged = function(doc){
						doc.resources.gem.should.equal(5000)
						done()
						pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
					}
					pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
				})
			}

			var chatInfo = {
				text:"gem 0",
				type:"global"
			}
			var route = "chat.chatHandler.send"
			pomelo.request(route, chatInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.resources.gem.should.equal(0)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("upgradeWall 正常升级", function(done){
			var houseInfo = {
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeWall"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.wall.level.should.equal(6)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("makeMaterial 工具作坊还未建造", function(done){
			var houseInfo = {
				finishNow:true,
				category:Consts.MaterialType.Building
			}
			var route = "logic.playerHandler.makeMaterial"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("工具作坊还未建造")
				done()
			})
		})

		it("makeMaterial 同类型的材料正在制造", function(done){
			var makeMaterialNotFinishedNow = function(){
				var houseInfo = {
					finishNow:false,
					category:Consts.MaterialType.Building
				}
				var route = "logic.playerHandler.makeMaterial"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.materialEvents.length.should.equal(1)
					makeMaterialNotFinishedNowError()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			}

			var makeMaterialNotFinishedNowError = function(){
				var houseInfo = {
					finishNow:false,
					category:Consts.MaterialType.Building
				}
				var route = "logic.playerHandler.makeMaterial"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("同类型的材料正在制造")
					done()
				})
			}

			var houseInfo = {
				location:5,
				finishNow:true
			}
			var route = "logic.playerHandler.upgradeBuilding"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.buildings["location_5"].level.should.equal(1)
				makeMaterialNotFinishedNow()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("makeMaterial 不同类型的材料正在制造", function(done){
			var makeMaterialNotFinishedNowError = function(){
				var houseInfo = {
					finishNow:false,
					category:Consts.MaterialType.Technology
				}
				var route = "logic.playerHandler.makeMaterial"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("不同类型的材料正在制造")
					done()
				})
			}

			makeMaterialNotFinishedNowError()
		})

		it("makeMaterial 同类型的材料制作完成后还未领取", function(done){
			var makeMaterialFinishedNow = function(){
				var houseInfo = {
					finishNow:true,
					category:Consts.MaterialType.Technology
				}
				var route = "logic.playerHandler.makeMaterial"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.materialEvents.length.should.equal(1)
					makeMaterialNotFinishedNowError()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			}

			var makeMaterialNotFinishedNowError = function(){
				var houseInfo = {
					finishNow:false,
					category:Consts.MaterialType.Technology
				}
				var route = "logic.playerHandler.makeMaterial"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("同类型的材料制作完成后还未领取")
					done()
				})
			}

			var clearEvents = function(){
				var chatInfo = {
					text:"rmmaterialevents",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.materialEvents.length.should.equal(0)
					makeMaterialFinishedNow()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			}

			clearEvents()
		})

		it("makeMaterials 正常制造", function(done){
			var clearEvents = function(){
				var chatInfo = {
					text:"rmmaterialevents",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.materialEvents.length.should.equal(0)
					makeMaterialsNotFinishNow()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			}

			var makeMaterialsNotFinishNow = function(){
				var houseInfo = {
					finishNow:false,
					category:Consts.MaterialType.Building
				}
				var route = "logic.playerHandler.makeMaterial"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.materialEvents.length.should.equal(1)
					done()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			}

			clearEvents()
		})

		it("getMaterials 没有材料建造事件存在", function(done){
			var houseInfo = {
				category:Consts.MaterialType.Technology
			}
			var route = "logic.playerHandler.getMaterials"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("没有材料建造事件存在")
				done()
			})
		})

		it("getMaterials 同类型的材料正在制造", function(done){
			var houseInfo = {
				category:Consts.MaterialType.Building
			}
			var route = "logic.playerHandler.getMaterials"
			pomelo.request(route, houseInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("同类型的材料正在制造")
				done()
			})
		})

		it("getMaterials 正常领取", function(done){
			var makeMaterialFinishNow = function(){
				var houseInfo = {
					finishNow:true,
					category:Consts.MaterialType.Technology
				}
				var route = "logic.playerHandler.makeMaterial"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.materialEvents.length.should.equal(2)
					getMaterial()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			}

			var getMaterial = function(){
				var houseInfo = {
					category:Consts.MaterialType.Technology
				}
				var route = "logic.playerHandler.getMaterials"
				pomelo.request(route, houseInfo, function(doc){
					doc.code.should.equal(200)
				})

				var onPlayerDataChanged = function(doc){
					doc.materialEvents.length.should.equal(1)
					done()
					pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
				}
				pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
			}

			makeMaterialFinishNow()
		})

		it("recruitNormalSoldier soldierName 普通兵种不存在", function(done){
			var soldierInfo = {
				soldierName:"adf",
				count:12,
				finishNow:true
			}
			var route = "logic.playerHandler.recruitNormalSoldier"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("soldierName 普通兵种不存在")
				done()
			})
		})

		it("recruitNormalSoldier 兵营还未建造", function(done){
			var soldierInfo = {
				soldierName:"swordsman",
				count:12,
				finishNow:true
			}
			var route = "logic.playerHandler.recruitNormalSoldier"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("兵营还未建造")
				done()
			})
		})

		it("recruitNormalSoldier 招募数量超过单次招募上限", function(done){
			var upgradeBuilding = function(callback){
				var buildingInfo = {
					location:8,
					finishNow:true
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					callback(doc)
				})
			}
			var recruiteSoldier = function(callback){
				var soldierInfo = {
					soldierName:"swordsman",
					count:500,
					finishNow:true
				}
				var route = "logic.playerHandler.recruitNormalSoldier"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			upgradeBuilding(function(doc){
				doc.code.should.equal(200)
				recruiteSoldier(function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("招募数量超过单次招募上限")
					done()
				})
			})
		})

		it("recruitNormalSoldier 已有士兵正在被招募", function(done){
			var recruiteSoldier = function(callback){
				var soldierInfo = {
					soldierName:"swordsman",
					count:5,
					finishNow:false
				}
				var route = "logic.playerHandler.recruitNormalSoldier"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			recruiteSoldier(function(doc){
				doc.code.should.equal(200)
				recruiteSoldier(function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("已有士兵正在被招募")
					done()
				})
			})
		})

		it("recruitNormalSoldier 宝石不足", function(done){
			var resetGem = function(gem, callback){
				var chatInfo = {
					text:"gem " + gem,
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}
			var recruiteSoldier = function(callback){
				var soldierInfo = {
					soldierName:"swordsman",
					count:5,
					finishNow:true
				}
				var route = "logic.playerHandler.recruitNormalSoldier"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}
			var rmsoldierevents = function(callback){
				var chatInfo = {
					text:"rmsoldierevents",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}

			rmsoldierevents(function(doc){
				doc.code.should.equal(200)
				resetGem(0, function(doc){
					doc.code.should.equal(200)
					recruiteSoldier(function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("宝石不足")
						resetGem(5000, function(){
							done()
						})
					})
				})
			})
		})

		it("recruitNormalSoldier 正常立即招募", function(done){
			var soldierInfo = {
				soldierName:"swordsman",
				count:5,
				finishNow:true
			}
			var route = "logic.playerHandler.recruitNormalSoldier"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.soldiers["swordsman"].should.equal(5)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("recruitNormalSoldier 正常普通招募", function(done){
			var soldierInfo = {
				soldierName:"swordsman",
				count:5,
				finishNow:false
			}
			var route = "logic.playerHandler.recruitNormalSoldier"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(200)
			})

			var onPlayerDataChanged = function(doc){
				doc.soldiers["swordsman"].should.equal(5)
				done()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})

		it("recruitSpecialSoldier soldierName 特殊兵种不存在", function(done){
			var soldierInfo = {
				soldierName:"adf",
				count:12
			}
			var route = "logic.playerHandler.recruitSpecialSoldier"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("soldierName 特殊兵种不存在")
				done()
			})
		})

		it("recruitSpecialSoldier 招募数量超过单次招募上限", function(done){
			var soldierInfo = {
				soldierName:"skeletonWarrior",
				count:100,
				finishNow:true
			}
			var route = "logic.playerHandler.recruitSpecialSoldier"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("招募数量超过单次招募上限")
				done()
			})
		})

		it("recruitSpecialSoldier 已有士兵正在被招募", function(done){
			var rmsoldierevents = function(callback){
				var chatInfo = {
					text:"rmsoldierevents",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}

			var recruiteSoldier = function(callback){
				var soldierInfo = {
					soldierName:"skeletonWarrior",
					count:5,
					finishNow:false
				}
				var route = "logic.playerHandler.recruitSpecialSoldier"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			rmsoldierevents(function(doc){
				doc.code.should.equal(200)
				recruiteSoldier(function(doc){
					doc.code.should.equal(200)
					recruiteSoldier(function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("已有士兵正在被招募")
						done()
					})
				})
			})
		})

		it("recruitSpecialSoldier 材料不足", function(done){
			var resetRs = function(rs, callback){
				var chatInfo = {
					text:"soldiermaterial " + rs,
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}
			var recruiteSoldier = function(callback){
				var soldierInfo = {
					soldierName:"skeletonWarrior",
					count:5,
					finishNow:true
				}
				var route = "logic.playerHandler.recruitSpecialSoldier"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			resetRs(0, function(doc){
				doc.code.should.equal(200)
				recruiteSoldier(function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("材料不足")
					resetRs(1000, function(){
						done()
					})
				})
			})
		})

		it("recruitSpecialSoldier 正常立即招募", function(done){
			var rmsoldierEvents = function(callback){
				var chatInfo = {
					text:"rmsoldierevents",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}
			var recruitSpecialSoldier = function(soldierName, count, finishNow, callback){
				var soldierInfo = {
					soldierName:soldierName,
					count:count,
					finishNow:finishNow
				}
				var route = "logic.playerHandler.recruitSpecialSoldier"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			rmsoldierEvents(function(doc){
				doc.code.should.equal(200)
				recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("recruitSpecialSoldier 正常普通招募", function(done){
			var recruitSpecialSoldier = function(soldierName, count, finishNow, callback){
				var soldierInfo = {
					soldierName:soldierName,
					count:count,
					finishNow:finishNow
				}
				var route = "logic.playerHandler.recruitSpecialSoldier"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			recruitSpecialSoldier("skeletonWarrior", 5, true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})

		it("makeDragonEquipment equipmentName 装备不存在", function(done){
			var soldierInfo = {
				equipmentName:"adf",
				finishNow:false
			}
			var route = "logic.playerHandler.makeDragonEquipment"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("equipmentName 装备不存在")
				done()
			})
		})

		it("makeDragonEquipment 铁匠铺还未建造", function(done){
			var soldierInfo = {
				equipmentName:"moltenCrown",
				finishNow:false
			}
			var route = "logic.playerHandler.makeDragonEquipment"
			pomelo.request(route, soldierInfo, function(doc){
				doc.code.should.equal(500)
				doc.message.should.equal("铁匠铺还未建造")
				done()
			})
		})

		it("makeDragonEquipment 材料不足", function(done){
			var dragonmaterial = function(count, callback){
				var chatInfo = {
					text:"dragonmaterial " + count,
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}
			var upgradeBuilding = function(location, finishNow, callback){
				var buildingInfo = {
					location:location,
					finishNow:finishNow
				}
				var route = "logic.playerHandler.upgradeBuilding"
				pomelo.request(route, buildingInfo, function(doc){
					callback(doc)
				})
			}
			var makeEquipment = function(equipmentName, finishNow, callback){
				var soldierInfo = {
					equipmentName:equipmentName,
					finishNow:finishNow
				}
				var route = "logic.playerHandler.makeDragonEquipment"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			upgradeBuilding(9, true, function(doc){
				doc.code.should.equal(200)
				dragonmaterial(0, function(doc){
					doc.code.should.equal(200)
					makeEquipment("moltenCrown", false, function(doc){
						doc.code.should.equal(500)
						doc.message.should.equal("材料不足")
						dragonmaterial(1000, function(doc){
							doc.code.should.equal(200)
							done()
						})
					})
				})
			})
		})

		it("makeDragonEquipment 已近有装备正在制作", function(done){
			var makeEquipment = function(equipmentName, finishNow, callback){
				var soldierInfo = {
					equipmentName:equipmentName,
					finishNow:finishNow
				}
				var route = "logic.playerHandler.makeDragonEquipment"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			makeEquipment("moltenCrown", false, function(doc){
				doc.code.should.equal(200)
				makeEquipment("moltenCrown", false, function(doc){
					doc.code.should.equal(500)
					doc.message.should.equal("已近有装备正在制作")
					done()
				})
			})
		})

		it("makeDragonEquipment 正常普通制造", function(done){
			var rmdragonequipmentevents = function(callback){
				var chatInfo = {
					text:"rmdragonequipmentevents",
					type:"global"
				}
				var route = "chat.chatHandler.send"
				pomelo.request(route, chatInfo, function(doc){
					callback(doc)
				})
			}
			var makeEquipment = function(equipmentName, finishNow, callback){
				var soldierInfo = {
					equipmentName:equipmentName,
					finishNow:finishNow
				}
				var route = "logic.playerHandler.makeDragonEquipment"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			rmdragonequipmentevents(function(doc){
				doc.code.should.equal(200)
				makeEquipment("moltenCrown", false, function(doc){
					doc.code.should.equal(200)
					done()
				})
			})
		})

		it("makeDragonEquipment 正常立即制造", function(done){
			var makeEquipment = function(equipmentName, finishNow, callback){
				var soldierInfo = {
					equipmentName:equipmentName,
					finishNow:finishNow
				}
				var route = "logic.playerHandler.makeDragonEquipment"
				pomelo.request(route, soldierInfo, function(doc){
					callback(doc)
				})
			}

			makeEquipment("moltenCrown", true, function(doc){
				doc.code.should.equal(200)
				done()
			})
		})
	})


	after(function(){
		pomelo.disconnect()
	})
})