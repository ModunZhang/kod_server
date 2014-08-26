/**
 * Created by modun on 14-7-25.
 */

var should = require('should')
var pomelo = require("../pomelo-client")
var mongoose = require("mongoose")
var _ = require("underscore")

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
				doc.buildings["location_1"].finishTime.should.equal(0)
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
						doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(0)
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
						doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(0)
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
							doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(5000000)
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
				text:"resetfinishtime",
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
						doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(0)
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
						doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(0)
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
							doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(5000000)
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
						doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(0)
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
						text:"resetfinishtime",
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
							doc.basicInfo.gem.should.equal(5000)

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
				doc.basicInfo.gem.should.equal(5000000)

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
						doc.basicInfo.gem.should.equal(5000)
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
				doc.basicInfo.gem.should.equal(0)
				func()
				pomelo.removeListener("onPlayerDataChanged", onPlayerDataChanged)
			}
			pomelo.on("onPlayerDataChanged", onPlayerDataChanged)
		})
	})


	after(function(){
		pomelo.disconnect()
	})
})