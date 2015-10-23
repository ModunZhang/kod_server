var crypto = require('crypto')
var path = require("path")
var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
var Http = require('http')
var Https = require('https')
var _ = require("underscore")
var mongoBackup = require('mongodb_s3_backup')


//var challenge = crypto.randomBytes(8).toString('base64');
//var clientkey = crypto.randomBytes(8).toString('base64');

//var alice = crypto.getDiffieHellman('modp5');
//var bob = crypto.getDiffieHellman('modp5');
//alice.generateKeys();
//bob.generateKeys();
//var alice_secret = alice.computeSecret(bob.getPublicKey(), 'binary', 'base64');
//var bob_secret = bob.computeSecret(alice.getPublicKey(), 'binary', 'base64');
//
//console.log(alice_secret);
//console.log(bob_secret);
//console.log(bob.getPublicKey('base64'));
//console.log(alice.getPublicKey('base64'));
//
//var HandShakeType = {
//	TYPE_HANDSHAKE:1,
//	TYPE_HANDSHAKE_ACK:2
//}
//
pomelo.init({host:'127.0.0.1', port:3011}, function(){
	//var clientDiff = crypto.getDiffieHellman('modp5');
	//clientDiff.generateKeys();
	//var clientKey = clientDiff.getPublicKey('base64');
	//pomelo.request('logic.entryHandler.handShake', {type:HandShakeType.TYPE_HANDSHAKE, value:clientKey}, function(doc){
	//	if(doc.code === 200){
	//		var clientSecret = clientDiff.computeSecret(doc.data.serverKey, 'base64', 'base64');
	//		var cipher = crypto.createCipher('aes-128-cbc-hmac-sha1', clientSecret);
	//		var hmac = cipher.update(doc.data.challenge, 'utf8', 'base64');
	//		hmac += cipher.final('base64');
	//		pomelo.request('gate.gateHandler.handShake', {type:HandShakeType.TYPE_HANDSHAKE_ACK, value:hmac}, function(doc){
	//			console.log(doc);
	//		})
	//	}
	//})
})