"use strict";

var mongodbClient = require('mongodb').MongoClient;

var config = require('../config.js');
var logger = require('./logger.js');

/**
* Get mongodb client
*
* @param {function} callback(err, client)
*/
var get = function(callback) {
    var client;
    
    var mongodbConnection = 'mongodb://' + config.MONGODB_SERVER_IP + ':' +
	    config.MONGODB_SREVER_PORT + '/' +
	    config.MONGODB_SERVER_DATABASE;
    mongodbClient.connect(mongodbConnection, function(err, client) {
	if (err) {
	    return callback(err);
	}
	client.authenticate(config.MONGODB_SERVER_USER,
			    config.MONGODB_SERVER_PASSWORD,
			    function(err, res) {
				if (err) {
				    return callback(err);
				}
				return callback(null, client);
			    });
	client.on('error', function(err) {
	    logger.write('emergency', 'mongodb连接遇到错误,详细:' + err.stack);
	});
    });
};

exports.get = get;
