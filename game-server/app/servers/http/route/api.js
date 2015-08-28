"use strict"
/**
 * Created by modun on 15/8/17.
 */


module.exports = function(app, http){
	http.all('*', function(req, res, next){
		req.logService = app.get('logService');
		req.chatServerId = app.getServerFromConfig('chat-server-1').id;
		next();
	});

	http.post('/send-global-notice', function(req, res){
		req.logService.onGm('/send-global-notice', req.body);

		var servers = req.body.servers;
		var type = req.body.type;
		var content = req.body.content;
		app.rpc.chat.gmApiRemote.sendGlobalNotice.toServer(req.chatServerId, servers, type, content, function(e, resp){
			if(!!e){
				req.logService.onGmError('/send-global-notice', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	})

	http.get('/get-global-chats', function(req, res){
		req.logService.onGm('/get-global-chats', req.query);

		var time = Number(req.query.time);
		app.rpc.chat.gmApiRemote.getGlobalChats.toServer(req.chatServerId, time, function(e, resp){
			if(!!e){
				req.logService.onGmError('/get-global-chats', req.query, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	})

	http.post('/send-system-chat', function(req, res){
		req.logService.onGm('/send-system-chat', req.body);

		var content = req.body.content;
		app.rpc.chat.gmApiRemote.sendSysChat.toServer(req.chatServerId, content, function(e, resp){
			if(!!e){
				req.logService.onGmError('/send-system-chat', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	})


	http.post('/send-global-mail', function(req, res){
		req.logService.onGm('/send-global-mail', req.body);

		var servers = req.body.servers;
		var title = req.body.title;
		var content = req.body.content;
		app.rpc.chat.gmApiRemote.sendGlobalMail.toServer(req.chatServerId, servers, title, content, function(e, resp){
			if(!!e){
				req.logService.onGmError('/send-global-mail', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	})

	http.post('/send-mail-to-players', function(req, res){
		req.logService.onGm('/send-mail-to-players', req.body);

		var players = req.body.players;
		var title = req.body.title;
		var content = req.body.content;
		app.rpc.chat.gmApiRemote.sendMailToPlayers.toServer(req.chatServerId, players, title, content, function(e, resp){
			if(!!e){
				req.logService.onGmError('/send-mail-to-players', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	})

	http.get('/player/find-by-id', function(req, res){
		req.logService.onGm('/player/find-by-id', req.query);

		var playerId = req.query.playerId;
		app.rpc.chat.gmApiRemote.findPlayerById.toServer(req.chatServerId, playerId, function(e, resp){
			if(!!e){
				req.logService.onGmError('/player/find-by-id', req.query, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	});

	http.get('/player/find-by-name', function(req, res){
		req.logService.onGm('/player/find-by-name', req.query);

		var playerName = req.query.playerName;
		app.rpc.chat.gmApiRemote.findPlayerByName.toServer(req.chatServerId, playerName, function(e, resp){
			if(!!e){
				req.logService.onGmError('/player/find-by-name', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	});

	http.post('/player/temp-add-player-gem', function(req, res){
		req.logService.onGm('/player/temp-add-player-gem', req.body);

		var playerId = req.body.playerId;
		var gem = Number(req.body.gem);
		app.rpc.chat.gmApiRemote.tempAddPlayerGem.toServer(req.chatServerId, playerId, gem, function(e, resp){
			if(!!e){
				req.logService.onGmError('/player/temp-add-player-gem', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json(resp);
		})
	})
}
