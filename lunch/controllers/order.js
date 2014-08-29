"use strict";

var events = require('events');
var underscore = require('underscore');

var config = require('../../config');
var dbPool = require('../../common/db_pool.js');

var redisCommonClient = null;

var index = function(req, res) {
    res.render('order/index.html');
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

var availableMenu_GET = function(req, res) {
    var emitter = new events.EventEmitter();

    emitter.on('getRedisCommonClient', function() {
	getRedisCommonClient(function(err) {
	    if (err) {
		return res.send('error:' + err.message);
	    } else {
		return emitter.emit('getAvailableMenu');
	    }
	});
    });
    emitter.on('getAvailableMenu', function() {
	redisCommonClient.hgetall('lunch:available:menu', function(err, replies) {
	    var availableMenu = {};
	    
	    if (err) {
		//重定向页面
		return res.send('error:' + err.message);
	    } else {
		for (var prop in replies) {
		    if (replies.hasOwnProperty(prop)) {
			availableMenu[prop] = {
			    name: replies[prop].split(",")[0],
			    price: replies[prop].split(",")[1]
			};
		    }
		}
		return res.send(JSON.stringify(availableMenu));
	    }
	});
    });
    emitter.emit('getRedisCommonClient');
};

var submitOrder_POST = function(req, res) {
    var username = req.body.username;
    var order = JSON.parse(req.body.order);
    
    var emitter = new events.EventEmitter();

    emitter.on('getRedisCommonClient', function() {
	getRedisCommonClient(function(err) {
	    if (err) {
		//重定向页面
		return res.send('error:' + err.message);
	    } else {
		return emitter.emit('getOrder');
	    }
	});
    });
    emitter.on('getOrder', function() {
	var multi = redisCommonClient.multi();
	
	multi.hgetall('lunch:user:order:' + username);
	multi.smembers('lunch:user:list');
	multi.expire('lunch:user:order', config.LUNCH_SERVER_DATA_EXPIRE_TIME);
	multi.exec(function(err, replies) {
	    if (err) {
		//重定向页面
		return res.send('err:' + err);
	    } else {
		var newOrder = {};
		
		for (var index in order) {
		    if (replies[0] && typeof replies[0][index] !== 'undefined') {
			newOrder[index] = parseInt(replies[0][index]) + parseInt(order[index]); 
		    } else {
			newOrder[index] = parseInt(order[index]);
		    }
		}
		if (underscore.indexOf(replies[1], username) === -1) {
		    return emitter.emit('updateOrder', newOrder, true, username);
		} else {
		    return emitter.emit('updateOrder', newOrder, false, username);
		}
	    }
	});
    });
    emitter.on('updateOrder', function(newOrder, flag, username) {
	var multi = redisCommonClient.multi();
	
	for (var index in newOrder) {
	    multi.hmset('lunch:user:order:' + username, index, newOrder[index]);
	}
	if (flag) {
	    multi.sadd('lunch:user:list', username);
	}
	multi.expire('lunch:user:order:' + username, config.LUNCH_SERVER_DATA_EXPIRE_TIME);
	multi.exec(function(err) {
	    if (err) {
		return res.send('err' + err.message);
	    } else {
		return res.send('ok');
	    }
	});
    });
    emitter.emit('getRedisCommonClient');
};

var userOrder_GET = function(req, res) {
    var username = req.query.username;
    var emitter = new events.EventEmitter();
    
    emitter.on('getRedisCommonClient', function() {
	getRedisCommonClient(function(err) {
	    if (err) {
		//重定向页面
		return res.send('error:' + err.message);
	    } else {
		return emitter.emit('getUserOrder');
	    }
	});
    });
    emitter.on('getUserOrder', function() {
	redisCommonClient.hgetall('lunch:user:order:' + username, function(err, replies) {
	    if (err) {
		//重定向页面
		return res.send('error:' + err.message);
	    } else {
		return res.send(JSON.stringify(replies));
	    }
	});
    });
    emitter.emit('getRedisCommonClient');
};

var userOrder_DELETE = function(req, res) {
    var username = req.query.username;
    var emitter = new events.EventEmitter();
    
    emitter.on('getRedisCommonClient', function() {
	getRedisCommonClient(function(err) {
	    if (err) {
		//重定向页面
		return res.send('error:' + err.message);
	    } else {
		return emitter.emit('cancelUserOrder');
	    }
	});
    });
    emitter.on('cancelUserOrder', function() {
	redisCommonClient.del('lunch:user:order:' + username, function(err, reply) {
	    if (err) {
		//重定向页面
		return res.send('error:' + err.message);
	    } else {
		return res.send('ok');
	    }
	});
    });
    emitter.emit('getRedisCommonClient');
};

exports.index = index;
exports.availableMenu_GET = availableMenu_GET;
exports.submitOrder_POST = submitOrder_POST;
exports.userOrder_GET = userOrder_GET;
exports.userOrder_DELETE = userOrder_DELETE;
