"use strict";

var events = require('events');

var config = require('../../config.js');
var dbPool = require('../../common/db_pool.js');

var redisCommonClient = null;

var index = function(req, res) {
    res.render('admin/index.html');
};

function getRedisCommonClient(callback) {
    if (redisCommonClient === null) {
	dbPool.getSpecifiedDbClient('redis', 'common', function(err, client) {
	    if (err) {
		return callback(err);
	    } else {
		redisCommonClient = client;
		return callback(null);
	    }
	});
    } else {
	callback(null);
    }
};

var updateMenu_POST = function(req, res) {
    var newMenu = JSON.parse(req.body.menu);

    var emitter = new events.EventEmitter();

    emitter.on('getRedisCommonClient', function() {
	getRedisCommonClient(function(err) {
	    if (err) {
		return res.send('error:' + err.message);
	    } else {
		return emitter.emit('updateMenu');
	    }
	});
    });
    emitter.on('updateMenu', function() {
	var multi = redisCommonClient.multi();
	
	multi.del('lunch:available:menu');
	for (var index in newMenu) {
	    multi.hmset('lunch:available:menu', index, newMenu[index]);
	}
	multi.expire('lunch:available:menu', config.LUNCH_SERVER_DATA_EXPIRE_TIME);
	multi.exec(function(err) {
	    if (err) {
		return res.send('error:' + err.message);
	    } else {
		return res.send('ok');
	    }
	});
    });
    emitter.emit('getRedisCommonClient');
};

exports.index = index;
exports.updateMenu_POST = updateMenu_POST;
