var crypto = require('crypto')
var path = require("path")
var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
var Http = require('http')
var Https = require('https')
var request = require('request')
var _ = require("underscore")
var gcm = require('node-gcm');
var mongoBackup = require('mongodb_s3_backup')
var DOMParser = require('xmldom').DOMParser;
var SignedXml = require('xml-crypto').SignedXml
	, FileKeyInfo = require('xml-crypto').FileKeyInfo
	, select = require('xml-crypto').xpath;
var GameData = require('../game-server/app/datas/GameDatas')
//
//var count = 0;
//(function login(){
//	count ++;
//	console.log('run test of ' + count);
//	pomelo.disconnect();
//	pomelo.init({host:'52.69.0.58', port:13100}, function(){
//		pomelo.request('gate.gateHandler.queryEntry', {platform:'ios', deviceId:'test_a', tag:6567}, function(doc){
//			pomelo.disconnect();
//			if(!doc) return login();
//			pomelo.init({host:doc.data.host, port:doc.data.port}, function(e){
//				Promise.fromCallback(function(callback){
//					pomelo.request('logic.entryHandler.login', {
//						deviceId:'test_a',
//						requestTime:Date.now(),
//						needMapData:false
//					}, function(doc){
//						callback(null, doc);
//					})
//				}).then(function(doc){
//					if(doc.playerData.basicInfo.terrain === '__NONE__'){
//						return Promise.fromCallback(function(callback){
//							pomelo.request('logic.playerHandler.initPlayerData', {
//								terrain:'grassLand',
//								language:'cn'
//							}, function(){
//								callback();
//							})
//						})
//					}else{
//						return Promise.resolve();
//					}
//				}).then(function(){
//					return Promise.fromCallback(function(callback){
//						pomelo.request('logic.playerHandler.getMails', {
//							fromIndex:0
//						}, function(){
//							callback();
//						})
//					})
//				}).then(function(){
//					return Promise.fromCallback(function(callback){
//						pomelo.request('chat.chatHandler.send', {
//							text:'hello test of' + count,
//							channel:'global'
//						}, function(){
//							callback();
//						})
//					})
//				}).then(function(){
//					return Promise.fromCallback(function(callback){
//						pomelo.request('rank.rankHandler.getPlayerRankList', {
//							rankType:'power',
//							fromRank:0
//						}, function(){
//							callback();
//						})
//					})
//				}).then(function(){
//					login();
//				})
//			})
//		})
//	})
//})();

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

//var receptData = '<?xml version="1.0"?><Receipt Version="2.0" CertificateId="A656B9B1B3AA509EEA30222E6D5E7DBDA9822DCD" xmlns="http://schemas.microsoft.com/windows/2012/store/receipt"><ProductReceipt PurchasePrice="$0" PurchaseDate="2015-11-23T07:23:05.473Z" Id="16598a50-5c5b-42f5-b75b-f9aef548beeb" AppId="SugarcaneTechnologyGmbH.Dragonfall_vka414hek5xj8" ProductId="com.dragonfall.test" ProductType="Consumable" PublisherUserId="yQiVdk6Coi7RWvsx5RgEaA9VHzz/gdGdF7wUgZ/MGmE=" PublisherDeviceId="8puddmDDTnm4piSOrd0n8WOGBSh8MGNR6T2Crq0HLUI=" MicrosoftProductId="ed3dca70-266d-4dfc-8bf7-526f4df15f28" MicrosoftAppId="aa155f39-6b85-4c52-a388-4eacd55bbcb5" /><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" /><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" /><Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" /></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" /><DigestValue>cyyJnYbBe3PQUY8RzlCnxb2wd4zgDQSBNQeIoT/Ygfg=</DigestValue></Reference></SignedInfo><SignatureValue>RuUwh1JQxTpd5EiwCeVR7436fquGI8dWdf7TMATAptGsu9dTWfDzOeDPSR0x+nDtC7qdS8YP52xiqFIm8GKcJ0cpMH6D4sU6ZyAwXJJ3F3fiSXNjzl9cFIbRU6NIb4MsF2lWebIPBYulZRLdTYr9aHbLR4kcRqWigY1oDFZL0ra5srJUqyFH03DhE5zywm+hG+b4fK3Oz8LjKCxU690HTC7B02uVlejRcWJVlROAlw6VlwgOmQRXCfrJF1v1BgXh4Do39RJ7UeLehQF0ntRy8R2s8P2aUPaYifTiWiJU7T62DSFIplS5LsAwJyNQCXOPlM7RLwpN3DwnNScnic7Rqw==</SignatureValue></Signature></Receipt>'
//var doc = new DOMParser().parseFromString(receptData);
//var receipt = doc.getElementsByTagName('Receipt')[0];
//var certificateId = receipt.getAttribute('CertificateId');
//var productReceipt = receipt.getElementsByTagName('ProductReceipt')[0];
//var purchasePrice = productReceipt.getAttribute('PurchasePrice');
//var purchaseDate = productReceipt.getAttribute('PurchaseDate');
//var id = productReceipt.getAttribute('Id');
//var signature = select(doc, "/*/*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0]
//var sig = new SignedXml()
//sig.keyInfoProvider = new FileKeyInfo(path.resolve('game-server/config/local-wp-iap.pem'));
//sig.loadSignature(signature.toString())
//var res = sig.checkSignature(receptData)
//console.log(res)
//if(!res) console.log(sig.validationErrors)

//var form = {
//	uid:'YTFkMTFhMTE5ZjM1Mjk2MjFiOTI4ZGJmNmU1ODM4YjI%3D',
//	trade_no:'2015112421001004310209890233',
//	show_detail:1
//}
//request.post('http://www.adeasygo.com/payment/sync_server', {form:form}, function(e, resp, body){
//	console.log(e);
//	console.log(resp.statusCode);
//	console.log(JSON.parse(body));
//})

//var form = {
//	trade_no:'2015111121001004310034680689'
//}
//
//request.post('http://www.adeasygo.com/payment/update_server', {form:form}, function(e, resp, body){
//	console.log(e);
//	console.log(resp.statusCode);
//	console.log(body);
//})

var sendAndroidNotice = function(apiKey, token, message){
	var sender = new gcm.Sender(apiKey);
	var notice = new gcm.Message();
	notice.addNotification('body', message);
	sender.sendNoRetry(notice, {registrationTokens:[token]}, function(e, resp){
		console.log(e, resp)
	});
}

sendAndroidNotice('AIzaSyBgWSvfovLyEsJT1Al-vG-24reZOa6I5Jc', 'APA91bHFBb2hXfMmzmonJ0GvmbP7dBszZe82smX6w4oC8talVIDX3mMMxFzXIrGd3xpZzy0cSxN6tw8FcqAZcD5Hy4S2pftGy0cbVtQ6KFML-SefS1zO20KJRB7-Qn0cIqj6QhxF2Wr0', 'Hello Android!')