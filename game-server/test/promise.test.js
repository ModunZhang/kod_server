//var path = require("path")
//var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
//var Promisify = Promise.promisify
var _ = require("underscore")
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
//var a = ["a", "b"]
//a.splice(-1,1)
//console.log(a)