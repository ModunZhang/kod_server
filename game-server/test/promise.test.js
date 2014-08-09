var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
var Promisify = Promise.promisify
var _ = require("underscore")

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

