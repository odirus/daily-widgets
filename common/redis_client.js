"use strict";

var redis = require('redis');

var config = require('../config.js');
var logger = require('./logger.js');
var customError = require('./custom_error.js');

/**
* Get redis client (async)
*
* @param {requestCallback} callback(err, redisClient)
*/
var get = function(callback) {
    var client;
    
    client = redis.createClient(config.REDIS_SERVER_PORT, config.REDIS_SERVER_IP);
    client.auth(config.REDIS_SERVER_PASSWORD, function(err) {
	if (err) {
	    return callback(err);
	} else {
	    return callback(null, client);
	}
    });
    client.on('error', function(err) {
	if (err instanceof customError.AbstractError) {
	    logger.write('error', '捕获到错误信息，详细:' + err.stack);
	} else {
	    logger.write('emergency', 'redis客户端捕获到错误信息, 详细:' + err.stack);
	}
    });
};

exports.get = get;
