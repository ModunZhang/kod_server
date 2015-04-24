//var path = require("path")
//var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
//var Promisify = Promise.promisify
var _ = require("underscore")
var Api = require("./api")
var MapUtils = require("../app/utils/mapUtils")
var DataUtils = require("../app/utils/dataUtils")
var Utils = require("../app/utils/utils")
var LogicUtils = require("../app/utils/logicUtils")
var FightUtils = require("../app/utils/fightUtils")
var GameDatas = require("../app/datas/GameDatas")

//var should = require('should')
//var Utils = require("../app/utils/utils")
//var redis = require("redis")
//var redisClient = redis.createClient(6379)
//var Scripto = require('redis-scripto')
//var scriptManager = new Scripto(redisClient)
//
//var scriptDir = path.resolve("../app/commands")
//scriptManager.loadFromDir(scriptDir)
//Promise.promisifyAll(scriptManager)
//
//
//var player1 = {
//	_id:"1",
//	basicInfo:{
//		name:"modun1",
//		password:"zhang1"
//	},
//	cityName:"华阳1"
//}
//
//var player2 = {
//	_id:"2",
//	basicInfo:{
//		name:"modun2",
//		password:"zhang2"
//	},
//	cityName:"华阳2"
//}
//
//var player3 = {
//	_id:"3",
//	basicInfo:{
//		name:"modun3",
//		password:"zhang3"
//	},
//	cityName:"华阳3"
//}
//
//var player4 = {
//	_id:"4",
//	basicInfo:{
//		name:"modun4",
//		password:"zhang4"
//	},
//	cityName:"华阳4"
//}
//
//var player5 = {
//	_id:"5",
//	basicInfo:{
//		name:"modun5",
//		password:"zhang5"
//	},
//	cityName:"华阳5"
//}
//
//var docString = JSON.stringify(player1)
//scriptManager.runAsync("add", ["player", docString], ["basicInfo.name", "basicInfo.password", "cityName"]).then(function(){
//	console.log(docString)
//}).catch(function(e){
//	console.log(e.message)
//})
//
//scriptManager.runAsync("findByIndex", ["player", "basicInfo.name", "modun1"]).then(function(docString){
//	console.log(docString)
//}).catch(function(e){
//	console.log(e.message)
//})
//
//scriptManager.runAsync("findById", ["player", "1"]).then(function(docString){
//	console.log(docString)
//}).catch(function(e){
//	console.log(e.message)
//})
//
//player1.basicInfo.name = "zhangxuemin"
//var docString = JSON.stringify(player1)
//scriptManager.runAsync("update", ["player", docString], ["basicInfo.name", "basicInfo.password", "cityName"]).then(function(){
//	console.log(docString)
//}).catch(function(e){
//	console.log(e.message)
//})
//
//scriptManager.runAsync("removeById", ["player", "1"], ["basicInfo.name", "basicInfo.password", "cityName"]).then(function(){
//	console.log(docString)
//}).catch(function(e){
//	console.log(e.message)
//})
//
//var players = [player1, player2, player3, player4, player5]
//var docsString = JSON.stringify(players)
//scriptManager.runAsync("addAll", ["player", docsString], ["basicInfo.name", "basicInfo.password", "cityName"]).then(function(){
//	console.log(docsString)
//}).catch(function(e){
//	console.log(e.message)
//})
//
//var func = function(callback){
//	callback(null, 1, 2, 3)
//}
//
//var funcAsync = Promise.promisify(func)
//funcAsync().spread(function(a, b, c){
//	console.log(a)
//	console.log(b)
//	console.log(c)
//})
//
//var func = function(a){
//	return Promise.resolve(a)
//}
//
//var funcs = []
//funcs.push(func("123"))
//
//Promise.all(funcs).then(function(res){
//	console.log(res[0])
//})
//
//var func = function(callback){
//	return Promise.reject(new Error("asdfasdfa"))
//}
//
//func().then(function(){
//
//}).catch(function(e){
//	console.log(e.message)
//	console.log(e)
//})
//
//var a = {}
//a.b = function(param){
//	console.log(param)
//}
//
//console.log([a])
//[a].b("adaf")
//var funca = Promise.method(function(a){
//	console.log(a)
//})
//
//var array = []
//array.push(funca)
//Promise.all(array).spread(function(res){
//	console.log(res)
//})
//
//var excuteAll = function(functionObjects){
//	var funcs = []
//	_.each(functionObjects, function(functionObj){
//		var caller = functionObj[0]
//		var func = functionObj[1]
//		funcs.push(func.apply(caller, Array.prototype.slice.call(functionObj, 2)))
//	})
//	return Promise.all(funcs)
//}
//
//var func = function(a){
//	console.log(a)
//	return Promise.resolve(a)
//}
//
//var func2 = function(a, b){
//	console.log(a + "__" + b)
//	return Promise.resolve(a + "__" + b)
//}
//
//var functionObjects = []
//functionObjects.push([null, func, "a"])
//functionObjects.push([null, func2, "a", "b"])
//
////excuteAll(functionObjects).spread(function(a, b){
////	console.log(a)
////	console.log(b)
////})
//
//var a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
//var b = [1, 2, 3]
//console.log(a.slice(0, 10))
//console.log(a.slice(10, 10 + 10))
//console.log(b.slice(0, 10))
//console.log(b.slice(5, 15))
//
//var testArray = [
//	{a:"1", b:"2"},
//	{a:"2", b:"3"},
//	{a:"1", b:"4"}
//]
//
//var res = _.indexBy(testArray, "a")
//_.each(res, function(value, key){
//	console.log(value)
//	console.log(key)
//})
//
//var mapObjects = MapUtils.create()
//var map = MapUtils.buildMap(mapObjects)
//MapUtils.outputMap(map)
//
//var attackSolders = [
//	{
//		name:"swordsman",
//		type:"infantry",
//		level:1,
//		currentCount:50,
//		totalCount:50,
//		power:6,
//		hp:40,
//		morale:100,
//		round:0,
//		attackPower:{
//			infantry:30,
//			archer:24,
//			cavalry:15,
//			siege:45,
//			wall:36
//		}
//	},{
//		name:"ranger",
//		type:"archer",
//		level:1,
//		currentCount:50,
//		totalCount:50,
//		power:7,
//		hp:40,
//		morale:100,
//		round:0,
//		attackPower:{
//			infantry:79,
//			archer:53,
//			cavalry:63,
//			siege:27,
//			wall:42
//		}
//	},
//]
//
//var defenceSoldiers = [
//	{
//		name:"ranger",
//		type:"archer",
//		level:1,
//		currentCount:50,
//		totalCount:50,
//		power:7,
//		hp:40,
//		morale:100,
//		round:0,
//		attackPower:{
//			infantry:79,
//			archer:53,
//			cavalry:63,
//			siege:27,
//			wall:42
//		}
//	},
//	{
//		name:"swordsman",
//		type:"infantry",
//		level:1,
//		currentCount:50,
//		totalCount:50,
//		power:6,
//		hp:40,
//		morale:100,
//		round:0,
//		attackPower:{
//			infantry:30,
//			archer:24,
//			cavalry:15,
//			siege:45,
//			wall:36
//		}
//	}
//]
//
//var response = FightUtils.soldierToSoldierFight(attackSolders, 0.4, defenceSoldiers, 0.4)
//console.log(response)
//
//var a = [1,3,2,4]
//console.log(Math.random() * a.length << 0)
//
//var rs = {
//	a:100,
//	b:20,
//	c:30,
//	d:10
//}
//
//var need = 80
//var total = rs.a + rs.b + rs.c + rs.d
//var needPercent = need / total
//
//console.log(rs.a * needPercent)
//console.log(rs.b * needPercent)
//console.log(rs.c * needPercent)
//console.log(rs.d * needPercent)
//
//
//require('shelljs/global')
//
//var getGitVersion = function(){
//	var commitCount = exec("git rev-list HEAD | wc -l | tr -d ' \\n'", {silent:true}).output
//	var logVersion = exec("git rev-parse --short HEAD | tr -d ' \\n'", {silent:true}).output
//	return commitCount + "." + logVersion
//}
//console.log(getGitVersion())
//console.log((Math.random() * 4) << 0)
//
//var x = 3
//var y = 4
//var z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
//console.log(z)
//
//var a= [1,2,3,4,5]
//var i = a.length
//while(i--){
//	var d = a[i]
//	if(d == 3){
//		LogicUtils.removeItemInArray(a, d)
//	}
//}
//console.log(a)

//var sortFunc = function(objects){
//	var totalWeight = 0
//	var weightedObjects = []
//	_.each(objects, function(object){
//		totalWeight += object.weight + 1
//	})
//
//	_.each(objects, function(object){
//		var weight = object.weight + 1 + (Math.random() * totalWeight << 0)
//		weightedObjects.push({
//			object:object,
//			weight:weight
//		})
//	})
//
//	return _.sortBy(weightedObjects, function(weightedObject){
//		return -weightedObject.weight
//	})
//}
//
//var objects = [
//	{obj:"a", weight:10},
//	{obj:"b", weight:15},
//	{obj:"c", weight:20},
//	{obj:"d", weight:50},
//	{obj:"e", weight:70},
//	{obj:"f", weight:2},
//	{obj:"g", weight:80},
//]
//
//var times = {a:0, b:0, c:0, d:0, e:0, f:0, g:0}
//
//for(var i = 0; i < 10000; i ++){
//	var res = sortFunc(objects)
//	times[res[0].object.obj] += 1
//}
//
//console.log("obj appear percent")
//_.each(times, function(count, key){
//	console.log(key + "   " + count + "    " + Math.round(count / 10000 * 100) + "%")
//})

//var startFrom = process.argv[2]
//console.log("startFrom:", startFrom)
//var totalCount = 1000
//var currentCount = 0
//var now = Date.now()
//var loginPlayer = function(){
//	Api.loginPlayer(startFrom.toString(), function(){
//		currentCount ++
//		startFrom ++
//		if(currentCount < totalCount){
//			loginPlayer()
//		}else{
//			var after = Date.now()
//			console.log((after - now) / 1000)
//			console.log("loginPlayer finished with time:" + ((after - now) / 1000))
//		}
//	})
//}
//loginPlayer()
//setInterval(function(){
//	console.log("currentCount:", currentCount, "currentId:", startFrom)
//}, 1000)