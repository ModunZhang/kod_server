var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")
var should = require('should')
var Utils = require("../app/utils/utils")

//function a(a, cb){
//	console.log(a)
//	cb(null, "b")
//}
//
//function b(b, cb){
//	console.log(b)
//	cb(null, "c")
//}
//
//function c(c, cb){
//	console.log(c)
//	cb(new Error("error occur!!"))
//	// cb(null, "d")
//}
//
//function d(d, cb){
//	console.log(d)
//	// throw new Error("error occur!!")
//}
//
//var aAsync = Promise.promisify(a)
//var bAsync = Promise.promisify(b)
//var cAsync = Promise.promisify(c)
//var dAsync = Promise.promisify(d)

// aAsync(1).then(function(res){
// 	console.log(res)
// 	return bAsync(2)
// }).then(function(res){
// 	console.log(res)
// 	return cAsync(3)
// }).then(function(res){
// 	console.log(res)
// 	return dAsync(4)
// }).error(function(e){
// 	console.log("--------------------------------" + e)
// })

// aAsync("a").then(bAsync).then(cAsync).then(dAsync).catch(function(err){
// 	console.log("--------------------------------" + err)
// })

// aAsync("a").then(bAsync).then(cAsync).then(dAsync).error(function(err){
// 	console.log("--------------------------------" + err)
// })

// Promise.method(function(condition){
// 	console.log(condition)
// 	return "abc"
// })(true).then(function(res){
// 	console.log(res)
// }).catch(function(e){
// 	console.log(e)
// })

// aAsync("a").then(function(res){
// 	return bAsync(res).then(function(res){
// 		console.log("11" + res)
// 		return aAsync(res)
// 	})
// }).then(function(res){
// 	console.log("33 " + res)
// }).catch(function(e){
// 	console.log(e + "-----------")
// })

//var GameDatas = require("../app/datas/GameDatas")
//
//describe("test", function(){
//	it("test1", function(){
//		var list = {}
//		list["1"] = "a"
//		list["2"] = "b"
//		console.log(list)
//		list = {1:"a", 2:"b"}
//		console.log(list)
//		list = []
//		list[0] = "a"
//		list[1] = "b"
//		console.log(list)
//		list = ["a", "b"]
//		console.log(list)
//		console.log(GameDatas.BuildGrowUpConfig.lumbermill)
//	})
//})

//var user = {
//	name:"modun",
//	finishTime:0,
//	level:0
//}
//
//function checkUserData(user){
//	console.log(user)
//	console.log(Date.now())
//	console.log(user.finishTime)
//
//	if(user.finishTime <= Date.now()){
//		user.level += 1
//		user.finishTime = 0
//	}
//	console.log(user)
//	console.log("\n")
//}
//
//describe("test", function(){
//	it("testEvent", function(done){
//		var start = Date.now()
//		var time = 2000
//		var end = start + time
//		user.finishTime = end
//		setTimeout(function(user){
//			checkUserData(user)
//			done()
//		}, time, user)
//	})
//})

//describe("test", function(){
//	it("testEvent", function(){
//		require('crypto').randomBytes(8, function(ex, buf) {
//			var token = buf.toString('hex')
//			console.log(token)
//		})
//	})
//})

//describe("test", function(){
//	it("testEvent", function(){
//		Promise.resolve("a").then(function(res){
//			console.log("\n---------------" + res + "------------------\n")
//		})
//	})
//})

//describe("test", function(){
//	it("testEvent", function(){
//		console.log(_.isEmpty(undefined))
//		console.log(_.isEmpty(null))
//	})
//})

//require('crypto').randomBytes(4, function(ex, buf){
//	var token = buf.toString("hex")
//	console.log(token)
//})

//Promise.resolve().then(function(){
//	require('crypto').randomBytes(4, function(ex, buf) {
//		var token = buf.toString("hex")
//		console.log(token + "  111")
//		return token
//	})
//}).then(function(doc){
//	console.log(doc + "  222")
//})


//require('crypto').randomBytes(4, function(err, buf) {
//		var token = buf.toString("hex")
//		console.log(ex)
//})

//Promisify(require('crypto').randomBytes)(4).then(function(buf){
//	var token = buf.toString("hex")
//	console.log(token)
//})
//

//Promise.method(require('crypto').randomBytes)(4).then(function(buf){
//	var token = buf.toString("hex")
//	console.log(token)
//})
//
//function a(){
//	return setTimeout(b, 5000)
//}
//
//function b(){
//	console.log("asdfjas;kdfjaskldf")
//}
//
//var id = a()
//console.log(id)
//
//setTimeout(function(){
//	console.log("clearSetTimeout")
//	clearTimeout(id)
//}, 6000)
//
//Promise.method(function(){
//	console.log("aaaa")
//	return
//})().then(function(){
//	console.log("bbbb")
//})
//
//function a(){
//	return "b"
//}
//
//var b = a.call(this)
//console.log(b + "----------")
//
//
//var Utils = {}
//
//Utils.getPreviousBuildingLocation = function(currentLocation){
//	var round = this.getBuildingCurrentRound(currentLocation)
//	var previousRound = this.getBuildingCurrentRound(currentLocation - 1)
//	if(_.isEqual(round, previousRound)) return currentLocation - 1
//	return null
//}
//
//Utils.getNextBuildingLocation = function(currentLocation){
//	var round = this.getBuildingCurrentRound(currentLocation)
//	var previousRound = this.getBuildingCurrentRound(currentLocation + 1)
//	if(_.isEqual(round, previousRound)) return currentLocation + 1
//	return null
//}
//
//Utils.getFrontBuildingLocation = function(currentLocation){
//	var round = this.getBuildingCurrentRound(currentLocation)
//	var middle = Math.floor(this.getBuildingRoundMiddleLocation(round))
//
//	if(currentLocation == middle) return null
//	if(currentLocation < middle){
//		return currentLocation - ((round - 1) * 2) + 1
//	}else if(currentLocation > middle){
//		return currentLocation - ((round - 1) * 2) - 1
//	}
//	return null
//}
//
//Utils.getBuildingCurrentRound = function(currentLocation){
//	var nextFrom = 1
//	for(var i = 1; i <= 5; i++){
//		var from = nextFrom
//		var to = from + (i - 1) * 2 + 1
//		nextFrom = to
//		if(currentLocation >= from && currentLocation < to){
//			return i
//		}
//	}
//
//	return null
//}
//
//Utils.getBuildingRoundFromAndEnd = function(currentRound){
//	var from = null
//	var to = null
//	var nextFrom = 1
//	for(var i = 1; i <= currentRound; i++){
//		var from = nextFrom
//		var to = from + (i - 1) * 2 + 1
//		nextFrom = to
//	}
//
//	return {from:from, to:to}
//}
//
//Utils.getBuildingRoundMiddleLocation = function(currentRound){
//	var fromAndTo = this.getBuildingRoundFromAndEnd(currentRound)
//	var middle = fromAndTo.from + ((fromAndTo.to - fromAndTo.from) / 2)
//	return middle
//}
//
//Utils.updateBuildingsLevel = function(playerDoc){
//	var buildings = playerDoc.buildings
//	var towers = playerDoc.towers
//	for(var i = 1; i <= _.size(buildings); i++){
//		var building = buildings["location_" + i]
//		if(building.level == -1){
//			for(var j = i - 1; j >= 1; j--){
//				var preBuilding = buildings["location_" + j]
//				if(preBuilding.level <= 0){
//					return
//				}
//			}
//
//			var round = this.getBuildingCurrentRound(i)
//			var fromToEnd = this.getBuildingRoundFromAndEnd(round)
//			for(var k = fromToEnd.from; k < fromToEnd.to; k ++){
//				buildings["location_" + k].level = 0
//			}
//
//			fromToEnd = this.getBuildingRoundFromAndEnd(round - 1)
//			var totalActiveTowerCount = fromToEnd.to - fromToEnd.from + 2
//			for(var l = totalActiveTowerCount - 2 + 1; l <= totalActiveTowerCount; l ++){
//				var tower = towers["location_" + l]
//				tower.level = 1
//			}
//
//			return
//		}
//	}
//}
//
//
//describe("getPreviousBuildingLocation", function(){
//	should(Utils.getPreviousBuildingLocation(1)).eql(null)
//	should(Utils.getPreviousBuildingLocation(2)).eql(null)
//	should(Utils.getPreviousBuildingLocation(3)).eql(2)
//	should(Utils.getPreviousBuildingLocation(4)).eql(3)
//	should(Utils.getPreviousBuildingLocation(5)).eql(null)
//	should(Utils.getPreviousBuildingLocation(6)).eql(5)
//	should(Utils.getPreviousBuildingLocation(10)).eql(null)
//	should(Utils.getPreviousBuildingLocation(11)).eql(10)
//})
//
//describe("getNextBuildingLocation", function(){
//	should(Utils.getNextBuildingLocation(1)).eql(null)
//	should(Utils.getNextBuildingLocation(2)).eql(3)
//	should(Utils.getNextBuildingLocation(3)).eql(4)
//	should(Utils.getNextBuildingLocation(4)).eql(null)
//	should(Utils.getNextBuildingLocation(5)).eql(6)
//	should(Utils.getNextBuildingLocation(9)).eql(null)
//	should(Utils.getNextBuildingLocation(15)).eql(16)
//	should(Utils.getNextBuildingLocation(16)).eql(null)
//	should(Utils.getNextBuildingLocation(17)).eql(18)
//	should(Utils.getNextBuildingLocation(21)).eql(22)
//	should(Utils.getNextBuildingLocation(24)).eql(25)
//	should(Utils.getNextBuildingLocation(25)).eql(null)
//})
//
//describe("getFrontBuildingLocation", function(){
//	should(Utils.getFrontBuildingLocation(1)).eql(null)
//	should(Utils.getFrontBuildingLocation(2)).eql(1)
//	should(Utils.getFrontBuildingLocation(3)).eql(null)
//	should(Utils.getFrontBuildingLocation(4)).eql(1)
//	should(Utils.getFrontBuildingLocation(5)).eql(2)
//	should(Utils.getFrontBuildingLocation(7)).eql(null)
//	should(Utils.getFrontBuildingLocation(9)).eql(4)
//	should(Utils.getFrontBuildingLocation(15)).eql(8)
//	should(Utils.getFrontBuildingLocation(16)).eql(9)
//	should(Utils.getFrontBuildingLocation(17)).eql(10)
//	should(Utils.getFrontBuildingLocation(20)).eql(13)
//	should(Utils.getFrontBuildingLocation(21)).eql(null)
//	should(Utils.getFrontBuildingLocation(24)).eql(15)
//	should(Utils.getFrontBuildingLocation(25)).eql(16)
//})
//
//var playerDoc = {}
//
//playerDoc.buildings = {
//	"location_1":{
//		level:1
//	},
//	"location_2":{
//		level:1
//	},
//	"location_3":{
//		level:1
//	},
//	"location_4":{
//		level:1
//	},
//	"location_5":{
//		level:1
//	},
//	"location_6":{
//		level:1
//	},
//	"location_7":{
//		level:1
//	},
//	"location_8":{
//		level:1
//	},
//	"location_9":{
//		level:0
//	},
//	"location_10":{
//		level:-1
//	},
//	"location_11":{
//		level:-1
//	},
//	"location_12":{
//		level:-1
//	},
//	"location_13":{
//		level:-1
//	},
//	"location_14":{
//		level:-1
//	},
//	"location_15":{
//		level:-1
//	},
//	"location_16":{
//		level:-1
//	}
//}
//
//playerDoc.towers = {
//	"location_1":{
//		level:1
//	},
//	"location_2":{
//		level:1
//	},
//	"location_3":{
//		level:1
//	},
//	"location_4":{
//		level:-1
//	},
//	"location_5":{
//		level:-1
//	},
//	"location_6":{
//		level:-1
//	},
//	"location_7":{
//		level:-1
//	},
//	"location_8":{
//		level:-1
//	},
//	"location_9":{
//		level:-1
//	},
//	"location_10":{
//		level:-1
//	},
//	"location_11":{
//		level:-1
//	}
//}
//
//describe("updateBuildingsLevel", function(){
//	Utils.updateBuildingsLevel(playerDoc)
//	console.log(playerDoc)
//})
//
//var a = [1, 2, 3, 4]
//var b = [2, 4, 2]
//for(var i = 0; i < b.length; i++){
//	for(var j = 0; j < a.length; j++){
//		if(_.isEqual(b[i], a[j])){
//			a.splice(j, 1)
//			break
//		}
//	}
//}
//
//console.log(a)
//
//var a = ["a", "b", "c", "d", "e"]
//console.log(Utils.shuffle(a)[0])
//
//var b = [1,2,3,4,5]
//console.log(Utils.shuffle(b)[0])
//
//var categoryConfig = [
//	"blueprints",
//	"tools",
//	"tiles",
//	"pulley"
//]
//
//var poduction = 15
//var materialTypeCount = 3
//var materialTypes = categoryConfig
//materialTypes = Utils.shuffle(materialTypes)
//var materialCountArray = []
//for(var i = 1; i <= poduction; i ++){
//	materialCountArray.push(i)
//}
//materialCountArray = Utils.shuffle(materialCountArray)
//
//var materials = []
//var totalGenerated = 0
//for(var i = 0; i < materialTypeCount; i ++){
//	var material = {
//		type:materialTypes[i],
//		count:materialCountArray[i]
//	}
//	materials.push(material)
//	totalGenerated += materialCountArray[i]
//
//	console.log(poduction + "__" + totalGenerated + "__" + materialCountArray[i])
//	if(poduction <= totalGenerated){
//		material.count -= totalGenerated - poduction
//		break
//	}
//
//	if(i == materialTypeCount - 1 && poduction > totalGenerated){
//		material.count += poduction - totalGenerated
//	}
//}
//
//console.log(materials)
//
//var res = 1 / 1.02
//console.log(res)
//res = Math.floor(res * 1000000) / 1000000
//console.log(res)
//
//var a = {}
//if(!a["1"]){
//	console.log("success")
//}else{
//	console.log("failed")
//}
//
//var equipmentInDragon = {
//	star:0,
//	exp:0
//}
//var config = {
//	"1_0":40,
//	"1_1":40,
//	"2_0":120,
//	"2_1":160,
//	"2_2":200,
//	"3_0":600,
//	"3_1":800,
//	"3_2":1000,
//	"3_3":1200,
//	"4_0":1600,
//	"4_1":2000,
//	"4_2":2400,
//	"4_3":2800,
//	"4_4":3200,
//	"5_0":4000,
//	"5_1":4800,
//	"5_2":5600,
//	"5_3":6400,
//	"5_4":7200,
//	"5_5":8000
//}
//var maxStar = 5
//var currentStar = equipmentInDragon.star
//var currentExp = equipmentInDragon.exp
//var totalExp = 17000
//while(totalExp > 0 && currentStar < maxStar){
//	var maxExp = config[maxStar + "_" + currentStar]
//	var expNeeded = maxExp - currentExp
//	if(expNeeded <= totalExp){
//		currentStar += 1
//		currentExp = 0
//		totalExp -= expNeeded
//	}else{
//		currentExp += totalExp
//		totalExp = 0
//	}
//}
//equipmentInDragon.star = currentStar
//equipmentInDragon.exp = currentExp
//
//console.log(equipmentInDragon)
//
//String.prototype.toUnicode = function(){
//    var result = "";
//    for(var i = 0; i < this.length; i++){
//        result += "\\u" + ("000" + this[i].charCodeAt(0).toString(16)).substr(-4);
//    }
//    return result;
//}
//var pattern = /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g
//
//var str = "😄"
//for(var i = 0; i < str.length; i ++){
//	var code = str[i].toUnicode()
//	console.log(code)
//	console.log(pattern.test(code))
//}

var a = {1:"a", 2:"b", 3:"c", 4:"d"}
console.log(a)
var b = 1
console.log(a[b])