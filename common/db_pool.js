"use strict";

var async = require('async');
var underscore = require('underscore');

var config = require('../config.js');
var logger = require('./logger.js');
var redisClient = require('./redis_client.js');
var mongodbClient = require('./mongodb_client.js');
var customError = require('./custom_error.js');

var hasInitDbPool = false;
var redisPool = {
    'common': [],
    'publisher': [],
    'subscriber': null
};
var mongodbPool = {
    'common': []
};

/**
* 初始化所有数据库 (async)
*
* @param {requestCallback} callback(err)
*/
var initDbPool = function(callback) {
    if (hasInitDbPool === true) {
	return callback(new Error('数据库连接已经经过初始化'));
    }
    
    async.parallel({
	redisPoolCommon: function(cb) {
	    var redisCommonClientCount = config.REDIS_SERVER_CONNECTION_COMMON_COUNT;
	    
	    async.whilst(
		function() {
		    return redisCommonClientCount > 0;
		},
		function(c) {
		    redisCommonClientCount--;
		    redisClient.get(function(err, client) {
			if (err) {
			    return c(err);
			}
			redisPool.common.push(client);
			return c(null);
		    });
		},
		function(err) {
		    if (err) {
			return cb(err);
		    }
		    return cb(null);
		}
	    );
	},
	redisPoolPublisher: function(cb) {
	    var redisPublisherClientCount = config.REDIS_SERVER_CONNECTION_PUBLISHSER_COUNT;
	    
	    async.whilst(
		function() {
		    return redisPublisherClientCount > 0;
		},
		function(c) {
		    redisPublisherClientCount--;
		    redisClient.get(function(err, client) {
			if (err) {
			    return c(err);
			}
			redisPool.publisher.push(client);
			return c(null);
		    });
		},
		function(err) {
		    if (err) {
			return cb(err);
		    }
		    return cb(null);
		}
	    );
	},
	redisPoolSubscriber: function(cb) {
	    redisClient.get(function(err, client) {
		if (err) {
		    return cb(err);
		}
		redisPool.subscriber = client;
		return cb(null);
	    });
	    
	},
	mongodbPoolCommon: function(cb) {
	    var mongodbCommonClientCount = config.MONGODB_SERVER_CONNECTION_COMMON_COUNT;
	    
	    async.whilst(
		function() {
		    return mongodbCommonClientCount > 0;
		},
		function(c) {
		    mongodbCommonClientCount--;
		    mongodbClient.get(function(err, client) {
			if (err) {
			    return c(err);
			}
			mongodbPool.common.push(client);
			return c(null);
		    });
		},
		function(err) {
		    if (err) {
			return cb(err);
		    }
		    return cb(null);
		}
	    );
	}
    }, function(err, results) {
	if (err) {
	    return callback(err);
	}
	hasInitDbPool = true;
	return callback(null);
    });
};

/**
* 初始化特定数据库 (async)
* 
* @param {string} dbType => [redis, mongodb]
* @param {string} use redis => [common, publisher, subscriber]
                      mongodb => [common]
* @param {requestCallback} callback(err)
*/
var initSpecifiedDbClient = function(dbType, use, callback) {
    if (dbType == 'redis') {
	if (use === 'common') {
	    var redisCommonClientCount = config.REDIS_SERVER_CONNECTION_COMMON_COUNT;
	    
	    async.whilst(
		function() {
		    return redisCommonClientCount > 0;
		},
		function(cb) {
		    redisCommonClientCount--;
		    redisClient.get(function(err, client) {
			if (err) {
			    return cb(err);
			}
			if (redisPool.common.length < config.REDIS_SERVER_CONNECTION_COMMON_COUNT) {
			    redisPool.common.push(client);
			    return cb(null);
			} else {
			    return cb(null);
			}
		    });
		},
		function(err) {
		    if (err) {
			return callback(err);
		    }
		    return callback(null);
		}
	    );
	} else if (use === 'publisher') {
	    var redisPublisherClientCount = config.REDIS_SERVER_CONNECTION_PUBLISHSER_COUNT;

	    async.whilst(
		function() {
		    return redisPublisherClientCount > 0;
		},
		function(cb) {
		    redisPublisherClientCount--;
		    redisClient.get(function(err, client) {
			if (err) {
			    return cb(err);
			}
			if (redisPool.publisher.length < config.REDIS_SERVER_CONNECTION_PUBLISHSER_COUNT) {
			    redisPool.publisher.push(client);
			    return cb(null);
			} else {
			    return cb(null);
			}
		    });
		},
		function(err) {
		    if (err) {
			return callback(err);
		    }
		    return callback(null);
		}
	    );
	} else if (use === 'subscriber') {
	    redisClient.get(function(err, client) {
		if (err) {
		    return callback(err);
		}
		if (redisPool.subscriber === null) {
		    redisPool.subscriber = client;
		    return callback(null);
		} else {
		    return callback(null);
		}
	    });
	} else {
	    return callback(new TypeError('参数use不被支持,传入的use=' + use));
	}
    } else if (dbType == 'mongodb') {
	var mongodbCommonClientCount = config.MONGODB_SERVER_CONNECTION_COMMON_COUNT;

	async.whilst(
	    function() {
		return mongodbCommonClientCount > 0;
	    },
	    function(cb) {
		mongodbCommonClientCount--;
		mongodbClient.get(function(err, client) {
		    if (err) {
			return cb(err);
		    }
		    if (mongodbPool.common.length < config.MONGODB_SERVER_CONNECTION_COMMON_COUNT) {
			mongodbPool.common.push(client);
			return cb(null);
		    }
		    return cb(null);
		});
	    },
	    function(err) {
		if (err) {
		    return callback(err);
		}
		return callback(null);
	    }
	);
    } else {
	return callback(new TypeError('参数dbType不被支持,传入的dbType=' + use));
    }
};

/**
* 获取特定数据库连接 (async)
*
* @param {string}    dbType => [redis, mongodb]
* @param {string}    use redis => [common, publisher, subscriber]
*                        mongodb => [common]
* @param {requestCallback}  callback (err, client)
*/
var getSpecifiedDbClient = function(dbType, use, callback) {
    if (dbType != 'redis' && dbType != 'mongodb') {
	return callback(new TypeError('参数dbType传入值(' + dbType + ')不被支持'));
    }
    
    var dbClient;
    
    var getdbClient = function() {
	if (dbType === 'redis') {
	    if (use === 'common') {
		var index = underscore.random(0, config.REDIS_SERVER_CONNECTION_COMMON_COUNT - 1);
		
		dbClient = redisPool.common[index];
	    } else if (use === 'publisher') {
		var index = underscore.random(0, config.REDIS_SERVER_CONNECTION_PUBLISHSER_COUNT - 1);
		
		dbClient = redisPool.publisher[index];
	    } else if (use === 'subscriber') {
		dbClient = redisPool.subscriber;
	    } else {
		throw new TypeError('参数use传入值(' + use + ')不被支持');
	    }
	} else {
	    if (use === 'common') {
		var index = underscore.random(0, config.MONGODB_SERVER_CONNECTION_COMMON_COUNT - 1);
		
		dbClient = mongodbPool.common[index];
	    } else {
		throw new TypeError('参数use传入值(' + use + ')不被支持');
	    }
	}
    };
    
    try {
	getdbClient();
    } catch (e) {
	return callback(e);
    }
    
    if (!dbClient) {
	initSpecifiedDbClient(dbType, use, function(err) {
	    if (err) {
		return callback(err);
	    }
	    try {
		getdbClient();
	    } catch (e) {
		return callback(e);
	    }
	    return callback(null, dbClient);
	});
    } else {
	return callback(null, dbClient);
    }
};

/**
* 获取 redis common 类型连接 需要经过初始化后才能调用 (sync)
*
* @returns {object}
*/
var redisCommonClient = function() {
    if (hasInitDbPool === false) {
	throw new Error('系统未经过初始化，不能获取数据库连接');
    }
    
    var index = underscore.random(0, config.REDIS_SERVER_CONNECTION_COMMON_COUNT - 1);

    return redisPool.common[index];
};

/**
* 获取 redis publisher 类型连接 需要经过初始化后才能调用 (sync)
*
* @returns {object}
*/
var redisPublisherClient = function() {
    if (hasInitDbPool === false) {
	throw new Error('系统未经过初始化，不能获取数据库连接');
    }
    
    var index = underscore.random(0, config.REDIS_SERVER_CONNECTION_PUBLISHSER_COUNT - 1);

    return redisPool.publisher[index];
};

/**
* 获取 redis subscriber 类型的客户端 需要经过初始化后才能调用 (sync)
*
* @returns {object}
*/
var redisSubscriberClient = function() {
    if (hasInitDbPool ===  false) {
	throw new Error('系统未经过初始化，不能获取数据库连接');
    }
    
    return redisPool.subscriber;
};

/**
* 获取mongodb common类型客户端 需要经过初始化后才能调用 (sync)
*
* @returns {object}
*/
var mongodbCommonClient = function() {
    if (hasInitDbPool === false) {
	throw new Error('系统未经过初始化，不能获取数据库连接');
    }
    
    var index = underscore.random(0, config.MONGODB_SERVER_CONNECTION_COMMON_COUNT - 1);

    return mongodbPool.common[index];
};

exports.initDbPool = initDbPool;
exports.initSpecifiedDbClient = initSpecifiedDbClient;
exports.getSpecifiedDbClient = getSpecifiedDbClient;
exports.redisCommonClient = redisCommonClient;
exports.redisPublisherClient = redisPublisherClient;
exports.redisSubscriberClient = redisSubscriberClient;
exports.mongodbCommonClient = mongodbCommonClient;
