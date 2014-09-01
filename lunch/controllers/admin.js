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

/**
* update menu
*
* @param {string} scheme zdm | manual
* @param {string} newMenu new menu list
*/
var updateMenu_POST = function(req, res) {
    var scheme = req.body.scheme;
    var newMenu = req.body.menu;
    
    try {
	if (scheme === 'manual') {
	    newMenu = JSON.parse(newMenu);
	} else {
	    newMenu = parseZdmScheme(newMenu);
	}
    } catch (e) {
	return res.send('error:' + e.message);
    }
    
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

/**
* parse zdm scheme
*
* @param {string} newMenu
*/
var parseZdmScheme = function(newMenu) {
    var newMenuAfterTrim = newMenu.replace(/(?:\r\n|\r|\n)/g, '');
    var newMenuArray = newMenuAfterTrim.split('）');
    var menu = {};
    
    for (var i = 0; i < newMenuArray.length; i++) {
	var item = newMenuArray[i].trim();
	
	if (item !== '') {
	    var menuItem = item.split('：');
	    
	    var menuId = parseInt(menuItem[0].match(/\d+/g));
	    var menuName = menuItem[1].match(/[\u4E00-\u9FA5\uF900-\uFA2D]+/)[0];
	    var menuPrice = menuItem[3];
	    
	    menu[menuId] = menuName + ',' + menuPrice;
	}
    }
    return menu;
};

/**
* get user order
*/
var allUserOrder_GET = function(req, res) {
    var foods = {};
    var emitter = new events.EventEmitter();
    
    //foods => {foodId => {name, price, count, users => [], userCount => []}}
    emitter.on('getRedisCommonClient', function() {
	getRedisCommonClient(function(err) {
	    if (err) {
		return res.send('error:' + err.message);
	    } else {
		return emitter.emit('getUserList');
	    }
	});
    });
    emitter.on('getUserList', function() {
	redisCommonClient.smembers('lunch:user:list', function(err, reply) {
	    if (err) {
		return res.send('error:' + err.message);
	    } else {
		return emitter.emit('getAvailableMenu', reply);
	    }
	});
    });
    emitter.on('getAvailableMenu', function(userList) {
	redisCommonClient.hgetall('lunch:available:menu', function(err, reply) {
	    for (var index in reply) {
		if (typeof foods[index] === 'undefined') {
		    foods[index] = {};
		    foods[index].name = reply[index].split(',')[0];
		    foods[index].price = reply[index].split(',')[1];
		}
	    }
	    return emitter.emit('getUserOrder', userList);
	});
    });
    emitter.on('getUserOrder', function(userList) {
	var multi = redisCommonClient.multi();

	for (var i = 0; i < userList.length; i++) {
	    multi.hgetall('lunch:user:order:' + userList[i]);
	}
	multi.exec(function(err, replies) {
	    for (var index in replies) {
		var userId = userList[index];
		var userOrder = replies[index];

		for (var foodId in userOrder) {
		    foodId = foodId + '';
		    
		    if (typeof foods[foodId] !== 'undefined') {
			
			if (typeof foods[foodId]['count'] === 'undefined') {
			    foods[foodId]['count'] = 0;
			}
			if (typeof foods[foodId]['users'] === 'undefined') {
			    foods[foodId]['users'] = [];
			}
			if (typeof foods[foodId]['userCount'] === 'undefined') {
			    foods[foodId]['userCount'] = [];
			}
			foods[foodId]['count'] += parseInt(userOrder[foodId]);
			foods[foodId]['users'].push(userId);
			foods[foodId]['userCount'].push(parseInt(userOrder[foodId]));
		    }
		}
	    }
	    res.send(foods);
	});
    });
    emitter.emit('getRedisCommonClient');
};
    
exports.index = index;
exports.updateMenu_POST = updateMenu_POST;
exports.allUserOrder_GET = allUserOrder_GET;
