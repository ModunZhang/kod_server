'use strict';

var pm2 = require('pm2');
var _ = require('underscore');
var fs = require('fs');
require('shelljs/global');

var servers = require('./game-server/config/local-ios/servers')


function getServers(env){
	var pmServers = [];
	var master = {
		name:'master-server-1',
		script:__dirname + '/game-server/app.js',
		args:[
			'env=' + env,
			'type=master',
			'id=master-server-1',
			'host=127.0.0.1',
			'port=3005'
		],
		merge_logs:true,
		autorestart:true
	}
	pmServers.push(master);

	var serversPath = __dirname + '/game-server/config/' + env + '/servers.json';
	var otherServers = require(serversPath);
	_.each(otherServers, function(servers, serverType){
		_.each(servers, function(server){
			var pmServer = {
				name:server.id,
				script:__dirname + '/game-server/app.js',
				args:[
					'env=' + env,
					'id=' + server.id,
					'host=' + server.host,
					'port=' + server.port,
					'serverType=' + serverType
				],
				merge_logs:true,
				autorestart:false
			}
			if(server.frontend){
				pmServer.args.push('frontend=true');
				pmServer.args.push('clientPort=' + server.clientPort);
			}
			if(serverType === 'logic'){
				pmServer.args.push('clientHost=' + server.clientHost);
			}
			if(serverType === 'cache'){
				pmServer.args.push('name=' + server.name);
				pmServer.args.push('openAt=' + server.openAt);
			}
			pmServers.push(pmServer);
		})
	})
	return pmServers;
}

function startAll(env){
	console.log('starting servers');
	var filePath = __dirname + '/game-server/config/' + env + '/master.json';
	if(!fs.existsSync(filePath)){
		throw new Error('invalid params');
	}
	pm2.connect(function(){
		pm2.stop('all', function(){
			pm2.delete('all', function(){
				var servers = getServers(env);
				pm2.start(servers, function(){
					pm2.disconnect();
					exec('pm2 list');
				});
			});
		})
	});
}

function stopAll(){
	if(!which('pomelo')){
		throw new Error('please install pomelo first');
	}
	var serverTypes = ['cache', 'gate', 'logic', 'rank', 'chat', 'http'];
	var findOnlineServerByType = function(servers, serverType){
		var serverIds = [];
		_.each(servers, function(server){
			if(server.name.indexOf(serverType) === 0 && server.pm2_env.status === 'online'){
				serverIds.push(server.name);
			}
		})
		return serverIds;
	}

	pm2.connect(function(){
		(function stopServers(){
			if(serverTypes.length === 0){
				return pm2.stop('all', function(){
					console.log('\nall server stoped')
					pm2.disconnect();
					exec('pm2 list');
				})
			}

			var serverType = serverTypes.shift();
			pm2.list(function(e, servers){
				console.log('\nstoping ' + serverType + ' server group')
				var serverIds = findOnlineServerByType(servers, serverType);
				if(serverIds.length === 0) return stopServers();

				var serverIdsString = serverIds.join(' ');
				exec('pomelo stop ' + serverIdsString);
				var tryCount = 60;
				var currentTryCount = 0;
				(function checkClose(){
					currentTryCount++;
					setTimeout(function(){
						pm2.list(function(e, servers){
							var ids = findOnlineServerByType(servers, serverType);
							if(ids.length > 0){
								if(currentTryCount >= tryCount){
									console.log('gracefully stop ' + serverType + ' server group failed')
									return stopServers();
								}else{
									return checkClose();
								}
							}
							else return stopServers();
						})
					}, 1000)
				})();
			})
		})();
	});
}

function start(serverId){
	exec('pm2 start ' + serverId);
}

function stop(serverId){
	exec('pomelo stop ' + serverId);
}

function add(env, serverId){
	var filePath = __dirname + '/game-server/config/' + env + '/master.json';
	if(!fs.existsSync(filePath)){
		throw new Error('invalid params');
	}
	var servers = getServers(env);
	var pmServer = _.find(servers, function(server){
		return server.name === serverId;
	})
	if(!pmServer){
		throw  new Error('server not exist')
	}

	pm2.connect(function(){
		pm2.list(function(e, servers){
			var alreadyAdd = _.some(servers, function(server){
				return server.name === pmServer.name
			})
			if(alreadyAdd){
				return pm2.disconnect(function(){
					throw new Error('server already added');
				})
			}
			pm2.start(pmServer, function(){
				pm2.disconnect();
				exec('pm2 list');
			})
		})
	});
}

var commands = ['startAll', 'stopAll', 'start', 'stop', 'add'];

(function(){
	var args = process.argv;
	if(args.length < 3) throw new Error('invalid params');
	var command = args[2];
	if(!_.contains(commands, command)) throw new Error('invalid params');
	if(command === 'startAll') return startAll(args[3]);
	if(command === 'stopAll') return stopAll();
	if(command === 'start') return start(args[3]);
	if(command === 'stop') return stop(args[3]);
	if(command === 'add') return add(args[3], args[4]);
})();