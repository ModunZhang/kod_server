var crc = require('crc')

module.exports.dispatch = function(servers) {
	var index = Math.floor(Math.random() * servers.length)
	return servers[index]
}