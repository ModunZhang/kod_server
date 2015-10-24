var crypto = require('crypto')
var path = require("path")
var pomelo = require("./pomelo-client")
var Promise = require("bluebird")
var Http = require('http')
var Https = require('https')
var _ = require("underscore")
var mongoBackup = require('mongodb_s3_backup')

//pomelo.init({host:'127.0.0.1', port:3011}, function(){
//	pomelo.request('gate.gateHandler.queryEntry', {a:'b'}, function(doc){
//		console.log(doc)
//	})
//})