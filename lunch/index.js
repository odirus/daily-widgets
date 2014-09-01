"use strict";

var async = require('async');
var events = require('events');
var express = require('express');
var bodyParser = require('body-parser');

var config = require('../config.js');
var dbPool = require('../common/db_pool.js');
var logger = require('../common/logger.js');

var cOrder = require('./controllers/order.js');
var cAdmin = require('./controllers/admin.js');

var PROJECT_NAME = 'lunchserver';
var serverInitEmitter = new events.EventEmitter();

serverInitEmitter.on('initRedisAndLogger', function() {
    async.parallel({
	initRedis: function(callback) {
	    dbPool.initSpecifiedDbClient('redis', 'common', function(err) {
		if (err) {
		    return callback(err);
		} else {
		    return callback(null);
		}
	    });
	},
	initLogger: function(callback) {
	    logger.init(PROJECT_NAME, function(err) {
		if (err) {
		    return callback(err);
		} else {
		    return callback(null);
		}
	    });
	}
    }, function(err) {
	if (err) {
	    console.log('初始化数据库连接和日志文件出现错误，详情：' + err.stack);
	    return process.exit(1);
	} else {
	    console.log('初始化数据库连接和日志文件成功');
	    return serverInitEmitter.emit('initServer');
	}
    });
});

serverInitEmitter.on('initServer', function() {
    var app = express();
    var router = express.Router();

    app.engine('html', require('ejs').renderFile);
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(express.static(__dirname, '/public'));

    app.get('/', cOrder.index);
    app.get('/order/availableMenu', cOrder.availableMenu_GET);
    app.post('/order/submitOrder', cOrder.submitOrder_POST);
    app.get('/order/userOrder', cOrder.userOrder_GET);
    app.delete('/order/userOrder', cOrder.userOrder_DELETE);
    app.get('/admin', cAdmin.index);
    app.post('/admin/updateMenu', cAdmin.updateMenu_POST);
    app.get('/admin/allUserOrder', cAdmin.allUserOrder_GET);
    
    app.listen(config.LUNCH_SERVER_LISTEN_PORT);
});

serverInitEmitter.emit('initRedisAndLogger');
