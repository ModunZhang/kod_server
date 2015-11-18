var crypto = require('crypto')
var path = require("path")
var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
var Http = require('http')
var Https = require('https')
var request = require('request')
var _ = require("underscore")
var mongoBackup = require('mongodb_s3_backup')

//pomelo.init({host:'127.0.0.1', port:3011}, function(){
	//pomelo.request('gate.gateHandler.queryEntry', {a:'b'}, function(doc){
	//	console.log(doc)
	//})
//})
//
//var getToken = function(callback){
//	var url = 'https://login.live.com/accesstoken.srf'
//	var body = {
//		grant_type:'client_credentials',
//		client_id:'ms-app://s-1-15-2-1660332833-921522504-1106393704-573897398-3715077025-4286219832-184998983',
//		client_secret:'WDNnecImUGbLJp0KIexNPyhmfTI7czfn',
//		scope:'notify.windows.com'
//	}
//	var options = {
//		url:url,
//		method:'post',
//		form:body
//	}
//	request(options, function(e, resp, body){
//		if(!!e) return callback(e);
//		if(resp.statusCode !== 200) return callback(new Error(resp.body))
//		else callback(null, JSON.parse(body));
//	})
//}
//
//var sendNotice = function(token, message){
//	var url = 'https://hk2.notify.windows.com/?token=AwYAAADUIVHHaeDgj8Vv69eso6qlyc2r2HTFu45xpo1f5Ku3Y0jWA7%2bib01OKAdJrkGKS152ZbQwWJNpfPufuc1cnbnCWzshsi%2bcUrMpdlpcQW5xyC%2bs%2fWxhB0Jhog5NbXMzBqQ%3d'
//	var body = '<toast><visual><binding template="ToastText01"><text id="1">' + message +'</text></binding></visual></toast>'
//
//	var options = {
//		url:url,
//		method:'POST',
//		headers:{
//			'Content-Type': 'text/xml',
//			'X-WNS-Type':'wns/toast',
//			'Authorization':'bearer ' + token
//		},
//		body:body
//	}
//
//	request(options, function(e, resp, body){
//		console.log(e)
//		console.log(resp.statusCode)
//		console.log(resp.headers)
//		console.log(body)
//	})
//}
//
//getToken(function(e, resp){
//	console.log(e);
//	console.log(resp);
//});
//sendNotice('EgAbAQMAAAAEgAAAC4AAfyJTLplEBV/o4G9e+aXeLEPn+VrtshSOnuPiXp85pmI84F8cXkMAMGLQcD3BB9fC5j13TMzmG/L18M3AEJmUZtcofDXMhvDSmLbfZiXyZHHRNKoEU4EpH51crRDyrZsosP1uwMGV+DnddtBffPZ6xI2ySBfjB2xXpBqYOl0roayKAFoAigAAAAAAVi8XQLrWSla61kpW60gEAA4AMTEwLjE4NC43MC42MgAAAAAAXABtcy1hcHA6Ly9zLTEtMTUtMi0xNjYwMzMyODMzLTkyMTUyMjUwNC0xMTA2MzkzNzA0LTU3Mzg5NzM5OC0zNzE1MDc3MDI1LTQyODYyMTk4MzItMTg0OTk4OTgzAA==', '你妈叫你回家吃饭');

