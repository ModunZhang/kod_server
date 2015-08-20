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

		var serverId = req.body.serverId;
		var ids = req.body.ids;
		var title = req.body.title;
		var content = req.body.content;
		app.rpc.cache.cacheRemote.sendMailToPlayers.toServer(serverId, ids, title, content, function(e){
			if(!!e){
				req.logService.onGmError('/send-mail-to-players', req.body, e.stack);
				res.json({code:500, data:e.message});
			}else
				res.json({code:200, data:null});
		})
	})
}
