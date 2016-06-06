'use strict';

var Promise = require('bluebird');
var pm2 = require('pm2');
var _ = require('underscore');
var fs = require('fs');
var adminClient = require('pomelo/node_modules/pomelo-admin').adminClient;

require('shelljs/global');

var ServerTypes = ['cache', 'rank', 'chat', 'logic', 'gate', 'http'];
var ModuleId = '__console__';

function connectToMaster(env, id, cb){
	var masterPath = __dirname + '/game-server/config/' + env + '/master.json';
	var masterConfig = require(masterPath);
	var config = {
		username:'admin',
		password:'admin',
		host:masterConfig.host,
		port:masterConfig.port
	}
	var client = new adminClient({username:config.username, password:config.password, md5:true});
	client.connect(id, config.host, config.port, function(e){
		if(!!e) cb(e)
		else cb(null, client)
	});
}

function execPomeloCommand(env, command){
	var masterPath = __dirname + '/game-server/config/' + env + '/master.json';
	var masterConfig = require(masterPath);
	exec('pomelo ' + command + ' --host ' + masterConfig.host + ' --port ' + masterConfig.port);
}

function isServerStarted(client, serverId, cb){
	Promise.fromCallback(function(callback){
		client.request(ModuleId, {signal:'list'}, callback)
	}).then(function(resp){
		if(!!resp.msg && resp.msg[serverId]) cb(null, true);
		else cb(null, false);
	}).catch(function(e){
		cb(e);
	})
}

function getOnlineServers(client, cb){
	Promise.fromCallback(function(callback){
		client.request(ModuleId, {signal:'list'}, callback)
	}).then(function(resp){
		var kvServers = resp.msg;
		var servers = [];
		_.each(ServerTypes, function(serverType){
			var typedServers = _.filter(kvServers, function(server){
				return server.serverType === serverType;
			})
			servers = servers.concat(typedServers);
		})
		cb(null, servers);
	}).catch(function(e){
		cb(e);
	})
}

function getServers(env){
	var pmServers = [];

	var masterConfig = getMasterConfig(env);
	var master = {
		name:env + ':master-server-1',
		script:__dirname + '/game-server/app.js',
		args:[
			'env=' + env,
			'type=master',
			'id=' + masterConfig.id,
			'host=' + masterConfig.host,
			'port=' + masterConfig.port
		],
		merge_logs:true,
		autorestart:true
	}
	pmServers.push(master);

	var serversPath = __dirname + '/game-server/config/' + env + '/servers.json';
	var serverConfigs = require(serversPath);
	_.each(serverConfigs, function(servers, serverType){
		_.each(servers, function(server){
			var pmServer = {
				name:env + ':' + server.id,
				script:__dirname + '/game-server/app.js',
				args:[
					'env=' + env,
					'id=' + server.id,
					'host=' + server.host,
					'port=' + server.port,
					'serverType=' + serverType
				],
				merge_logs:true,
				autorestart:false,
				error_file:"/dev/null",
				out_file:"/dev/null"
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
			}
			pmServers.push(pmServer);
		})
	})
	return pmServers;
}

function startAll(env){
	var masterPath = __dirname + '/game-server/config/' + env + '/master.json';
	Promise.fromCallback(function(callback){
		var masterConfig = require(masterPath);
		var pmMaster = {
			name:masterConfig.id,
			script:__dirname + '/game-server/app.js',
			args:[
				'env=' + env,
				'type=master',
				'id=' + masterConfig.id,
				'host=' + masterConfig.host,
				'port=' + masterConfig.port
			],
			merge_logs:true,
			autorestart:true
		};
		console.log('------------starting master server....')
		pm2.connect(function(){
			pm2.stop(pmMaster.name, function(){
				pm2.delete(pmMaster.name, function(){
					pm2.start(pmMaster, function(){
						pm2.disconnect();
						var tryTimes = 10;
						var currentTimes = 0;
						(function tryConnectToMaster(){
							currentTimes++;
							if(currentTimes >= tryTimes){
								return callback(new Error('master server start failed'));
							}
							setTimeout(function(){
								var id = 'check_is_master_started_' + Date.now();
								connectToMaster(env, id, function(e, client){
									if(!!e) return tryConnectToMaster()
									else{
										client.socket.disconnect();
										return callback();
									}
								})
							}, 2000)
						})();
					});
				});
			})
		});
	}).then(function(){
		var serversPath = __dirname + '/game-server/config/' + env + '/servers.json';
		var serverConfigs = require(serversPath);
		var servers = [];
		_.each(Array.prototype.slice.call(ServerTypes).reverse(), function(serverType){
			if(!!serverConfigs[serverType]) servers = servers.concat(serverConfigs[serverType]);
		})

		var execPath = __dirname + '/game-server';
		return Promise.fromCallback(function(callback){
			(function startServers(){
				if(servers.length <= 0) return callback();
				var server = servers.shift();
				console.log('\n------------starting ' + server.id + ' server....');
				exec('pomelo start -D -d ' + execPath + ' -e ' + env + ' -i ' + server.id);
				var id = 'check_is_server_started_' + Date.now();
				connectToMaster(env, id, function(e, client){
					if(!!e) return callback(e);
					else{
						var tryTimes = 20;
						var currentTimes = 0;
						(function checkServerStarted(){
							currentTimes++;
							if(currentTimes >= tryTimes){
								client.socket.disconnect();
								return callback(new Error('server ' + server.id + ' start failed'));
							}
							setTimeout(function(){
								isServerStarted(client, server.id, function(e, started){
									if(!!e){
										client.socket.disconnect();
										return callback(e);
									}
									if(started){
										client.socket.disconnect();
										startServers();
									}else checkServerStarted();
								})
							}, 2000)
						})();
					}
				})
			})();
		})
	}).then(function(){
		console.log('\n\n------------all server start success');
		execPomeloCommand(env, 'list');
	}).catch(function(e){
		throw e;
	})
}

function stopAll(env){
	var masterPath = __dirname + '/game-server/config/' + env + '/master.json';
	Promise.fromCallback(function(callback){
		console.log('------------get online servers....');
		var id = 'stop_all_server_' + Date.now();
		connectToMaster(env, id, callback);
	}).then(function(client){
		return Promise.fromCallback(function(callback){
			getOnlineServers(client, function(e, servers){
				client.socket.disconnect();
				callback(e, servers);
			});
		})
	}).then(function(servers){
		return Promise.fromCallback(function(callback){
			(function stopServers(){
				if(servers.length <= 0) return callback();
				var server = servers.shift();
				console.log('\n------------stoping ' + server.serverId + ' server....');
				execPomeloCommand(env, 'stop ' + server.serverId)
				var id = 'check_is_server_started_' + Date.now();
				connectToMaster(env, id, function(e, client){
					if(!!e) return callback(e);
					else{
						var tryTimes = 30;
						var currentTimes = 0;
						(function checkServerStoped(){
							currentTimes++;
							if(currentTimes >= tryTimes){
								client.socket.disconnect();
								return callback(new Error('server ' + server.serverId + ' stop failed'));
							}
							setTimeout(function(){
								isServerStarted(client, server.serverId, function(e, started){
									if(!!e){
										client.socket.disconnect();
										return callback(e);
									}
									if(!started){
										client.socket.disconnect();
										stopServers();
									}else checkServerStoped();
								})
							}, 2000)
						})();
					}
				})
			})();
		})
	}).then(function(){
		return Promise.fromCallback(function(callback){
			var masterConfig = require(masterPath);
			var name = masterConfig.id;
			console.log('\n------------stoping master server....')
			pm2.connect(function(){
				pm2.stop(name, function(){
					pm2.delete(name, function(){
						pm2.disconnect();
						callback();
					});
				})
			});
		})
	}).then(function(){
		console.log('\n\n------------all server stop success');
	}).catch(function(e){
		throw e;
	})
}

function startMaster(env){
	var masterPath = __dirname + '/game-server/config/' + env + '/master.json';
	Promise.fromCallback(function(callback){
		var masterConfig = require(masterPath);
		var pmMaster = {
			name:masterConfig.id,
			script:__dirname + '/game-server/app.js',
			args:[
				'env=' + env,
				'type=master',
				'id=' + masterConfig.id,
				'host=' + masterConfig.host,
				'port=' + masterConfig.port
			],
			merge_logs:true,
			autorestart:true
		}
		console.log('------------starting master server....')
		pm2.connect(function(){
			pm2.stop(pmMaster.name, function(){
				pm2.delete(pmMaster.name, function(){
					pm2.start(pmMaster, function(){
						pm2.disconnect();
						var tryTimes = 10;
						var currentTimes = 0;
						(function tryConnectToMaster(){
							currentTimes++;
							if(currentTimes >= tryTimes){
								return callback(new Error('master server start failed'));
							}
							setTimeout(function(){
								var id = 'check_is_master_started_' + Date.now();
								connectToMaster(env, id, function(e, client){
									if(!!e) return tryConnectToMaster()
									else{
										client.socket.disconnect();
										return callback();
									}
								})
							}, 2000)
						})();
					});
				});
			})
		});
	}).then(function(){
		console.log('------------master server start success....')
	}).catch(function(e){
		throw e;
	})
}

function stopMaster(env){
	var masterPath = __dirname + '/game-server/config/' + env + '/master.json';
	Promise.fromCallback(function(callback){
		var masterConfig = require(masterPath);
		var name = masterConfig.id;
		console.log('------------stoping master server....')
		pm2.connect(function(){
			pm2.stop(name, function(){
				pm2.delete(name, function(){
					pm2.disconnect();
					callback();
				});
			})
		});
	}).then(function(){
		console.log('------------master server stop success....')
	}).catch(function(e){

	})
}

function start(env, serverId){
	Promise.fromCallback(function(callback){
		var serversPath = __dirname + '/game-server/config/' + env + '/servers.json';
		var serverConfigs = require(serversPath);
		var servers = [];
		_.each(ServerTypes, function(serverType){
			if(!!serverConfigs[serverType]) servers = servers.concat(serverConfigs[serverType]);
		})
		var hasConfig = _.some(servers, function(server){
			return server.id === serverId;
		})
		if(!hasConfig) return callback(new Error('server ' + serverId + ' not exist'));
		var id = 'start_server_' + Date.now();
		connectToMaster(env, id, callback)
	}).then(function(client){
		return Promise.fromCallback(function(callback){
			isServerStarted(client, serverId, function(e, started){
				if(!!e){
					client.socket.disconnect();
					return callback(e);
				}
				client.socket.disconnect();
				callback(null, started);
			})
		})
	}).then(function(started){
		if(started){
			return Promise.reject(new Error('server ' + serverId + ' already started'));
		}
		return Promise.fromCallback(function(callback){
			console.log('------------starting ' + serverId + ' server....');
			var execPath = __dirname + '/game-server';
			exec('pomelo start -D -d ' + execPath + ' -e ' + env + ' -i ' + serverId);
			var id = 'check_is_server_started_' + Date.now();
			connectToMaster(env, id, function(e, client){
				if(!!e) return callback(e);
				else{
					var tryTimes = 20;
					var currentTimes = 0;
					(function checkServerStarted(){
						currentTimes++;
						if(currentTimes >= tryTimes){
							client.socket.disconnect();
							return callback(new Error('server ' + serverId + ' start failed'));
						}
						setTimeout(function(){
							isServerStarted(client, serverId, function(e, started){
								if(!!e){
									client.socket.disconnect();
									return callback(e);
								}
								if(started){
									client.socket.disconnect();
									callback();
								}else checkServerStarted();
							})
						}, 2000)
					})();
				}
			})
		})
	}).then(function(){
		console.log('------------server ' + serverId + ' start success');
	}).catch(function(e){
		throw e;
	})
}

function stop(env, serverId){
	Promise.fromCallback(function(callback){
		var serversPath = __dirname + '/game-server/config/' + env + '/servers.json';
		var serverConfigs = require(serversPath);
		var servers = [];
		_.each(ServerTypes, function(serverType){
			if(!!serverConfigs[serverType]) servers = servers.concat(serverConfigs[serverType]);
		})
		var hasConfig = _.some(servers, function(server){
			return server.id === serverId;
		})
		if(!hasConfig) return callback(new Error('server ' + serverId + ' not exist'));
		var id = 'stop_server_' + Date.now();
		connectToMaster(env, id, callback)
	}).then(function(client){
		return Promise.fromCallback(function(callback){
			isServerStarted(client, serverId, function(e, started){
				if(!!e){
					client.socket.disconnect();
					return callback(e);
				}
				client.socket.disconnect();
				callback(null, started);
			})
		})
	}).then(function(started){
		if(!started){
			return Promise.reject(new Error('server ' + serverId + ' already stoped'));
		}
		return Promise.fromCallback(function(callback){
			console.log('------------stoping ' + serverId + ' server....');
			execPomeloCommand(env, 'stop ' + serverId);
			var id = 'check_is_server_started_' + Date.now();
			connectToMaster(env, id, function(e, client){
				if(!!e) return callback(e);
				else{
					var tryTimes = 30;
					var currentTimes = 0;
					(function checkServerStoped(){
						currentTimes++;
						if(currentTimes >= tryTimes){
							client.socket.disconnect();
							return callback(new Error('server ' + serverId + ' stop failed'));
						}
						setTimeout(function(){
							isServerStarted(client, serverId, function(e, started){
								if(!!e){
									client.socket.disconnect();
									return callback(e);
								}
								if(!started){
									client.socket.disconnect();
									callback();
								}else checkServerStoped();
							})
						}, 2000)
					})();
				}
			});
		}).then(function(){
			console.log('------------server ' + serverId + ' stop success');
		}).catch(function(e){
			throw e;
		})
	})
}

var commands = ['startAll', 'stopAll', 'startMaster', 'stopMaster', 'start', 'stop', 'add'];

(function(){
	if(!which('pm2')){
		throw new Error('please install pm2 first');
	}
	if(!which('pomelo')){
		throw new Error('please install pomelo first');
	}

	var args = process.argv;
	if(args.length < 4) throw new Error('invalid params');
	var command = args[2];
	var env = args[3];
	var masterPath = __dirname + '/game-server/config/' + env + '/master.json';
	if(!fs.existsSync(masterPath)){
		throw new Error('invalid params');
	}

	if(!_.contains(commands, command)) throw new Error('invalid params');
	if(command === 'startAll') return startAll(args[3]);
	if(command === 'stopAll') return stopAll(args[3]);
	if(command === 'startMaster') return startMaster(args[3]);
	if(command === 'stopMaster') return stopMaster(args[3]);
	if(command === 'start') return start(args[3], args[4]);
	if(command === 'stop') return stop(args[3], args[4]);
})();