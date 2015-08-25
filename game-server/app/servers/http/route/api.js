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
		app.rpc.chat.chatRemote.sendGlobalNotice.toServer(req.chatServerId, servers, type, content, function(e){
			if(!!e){
				req.logService.onGmError('/send-global-notice', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json({code:200, data:null});
		})
	})

	http.post('/send-global-mail', function(req, res){
		req.logService.onGm('/send-global-mail', req.body);

		var servers = req.body.servers;
		var title = req.body.title;
		var content = req.body.content;
		app.rpc.chat.chatRemote.sendGlobalMail.toServer(req.chatServerId, servers, title, content, function(e){
			if(!!e){
				req.logService.onGmError('/send-global-mail', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json({code:200, data:null});
		})
	})

	http.post('/send-mail-to-players', function(req, res){
		req.logService.onGm('/send-mail-to-players', req.body);

		var players = req.body.players;
		var title = req.body.title;
		var content = req.body.content;
		app.rpc.chat.chatRemote.sendMailToPlayers.toServer(req.chatServerId, players, title, content, function(e){
			if(!!e){
				req.logService.onGmError('/send-mail-to-players', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json({code:200, data:null});
		})
	})

	http.get('/get-global-chats', function(req, res){
		req.logService.onGm('/get-global-chats', req.query);
		var time = Number(req.query.time);
		app.rpc.chat.chatRemote.getGlobalChats.toServer(req.chatServerId, time, function(e, chats){
			if(!!e){
				req.logService.onGmError('/get-global-chats', req.query, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json({code:200, data:chats});
		})
	})

	http.post('/send-system-chat', function(req, res){
		req.logService.onGm('/send-system-chat', req.body);
		var content = req.body.content;
		app.rpc.chat.chatRemote.sendSysChat.toServer(req.chatServerId, content, function(e, chat){
			if(!!e){
				req.logService.onGmError('/send-system-chat', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json({code:200, data:chat});
		})
	})
}
