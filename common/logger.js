"use strict";

var async = require('async');
var fs = require('fs');
var log = require('log');
var tar = require('tar');
var fstream = require('fstream');

var config = require('../config.js');
var customError = require('./custom_error.js');

var infoLog;
var errorLog;
var alertLog;
var noticeLog;
var emergencyLog;

/**
* Initialize log (async)
*
* @param {string} projectName - project name
* @param {requestCallback} callback(err)
*/
var init = function(projectName, callback) {
    if (typeof projectName === 'undefined') {
	return callback(new customError.InitError('环境变量projectName未设置'));
    }
    if (projectName !== 'lunchserver') {
	return callback(new customError.InitError('变量projectName=' + projectName + '不被支持'));
    }
    
    try {
	fs.mkdirSync('../log/' + projectName + '/', '0775');
    } catch(e) {
	if (e.code === 'EEXIST') {
	    //目标目录已经存在
	} else {
	    return callback(new customError.InitError('创建包含日志文件的文件夹时出现错误,详细:' + e.message));
	}
    }
    
    var logFilesPath = '../log/' + projectName + '/';
    var files = fs.readdirSync(logFilesPath);
    
    if (files.length > 0) {
	console.log('日志文件夹中存在历史日志文件，准备打包文件，请自行下载并清理文件...');
	var dirDestination = fs.createWriteStream('../trash/' + projectName + '.tar');
	fstream.Reader({path: logFilesPath, type: 'Directory'})
	    .pipe(tar.Pack({noProprietary: true}))
	    .pipe(dirDestination);
	console.log('旧日志文件已经打包成功，准备删除这些日志文件，并创建新的文件流');
	fs.readdirSync(logFilesPath).forEach(function(file, index) {
	    fs.unlinkSync(logFilesPath + file);
	});
    }
    
    if (config.LOG_MODE === 'log') {
	var option = {'flags': 'a', 'encoding': 'utf8', 'mode': '0775'};
	async.parallel({
	    'noticeLog': function(cb) {
		var noticeLogStream = fs.createWriteStream('../log/' + projectName + '/notice.log', option);
		noticeLogStream.on('open', function(fd) {
		    return cb(null, new log('notice', noticeLogStream));
		});
	     },
	    'infoLog': function(cb) {
		var infoLogStream = fs.createWriteStream('../log/' + projectName + '/info.log', option);
		infoLogStream.on('open', function(fd) {
		    return cb(null, new log('info', infoLogStream));
		});
	    },
	    'errorLog': function(cb) {
		var errorLogStream = fs.createWriteStream('../log/' + projectName + '/error.log', option);
		errorLogStream.on('open', function(fd) {
		    return cb(null, new log('error', errorLogStream));
		});
	    },
	    'alertLog': function(cb) {
		var alertLogStream = fs.createWriteStream('../log/' + projectName + '/alert.log', option);
		alertLogStream.on('open', function(fd) {
		    return cb(null, new log('alert', alertLogStream));
		});
	    },
	    'emergencyLog': function(cb) {
		var emergencyLogStream = fs.createWriteStream('../log/' + projectName + '/emergency.log', option);
		emergencyLogStream.on('open', function(fd) {
		    return cb(null, new log('emergency', emergencyLogStream));
		});
	    }
	}, function(err, results) {
	    if (err) {
		return callback(new customError.InitError('建立日志文件时出现问题,详细:' + err.message));
	    }
	    noticeLog = results['noticeLog'];
	    infoLog = results['infoLog'];
	    errorLog = results['errorLog'];
	    alertLog = results['alertLog'];
	    emergencyLog = results['emergencyLog'];
	    return callback(null);
	});
    } else {
	return callback(null);
    }
};

/**
* Write message to log
*
* @param {string} level emergency | alert | error | info | notice
 * @param {string} message
*/
var write = function(level, message) {
    if (config.LOG_MODE === 'console') {
	console.log(level + ': ' + message);
    } else {
	try {
	    switch(level) {
		case 'notice':
		    noticeLog.notice(message);
		    break;
	        case 'emergency':
	            emergencyLog.emergency(message);
		    break;
	        case 'error':
	            errorLog.error(message);
		    break;
	        case 'alert':
	            alertLog.alert(message);
		    break;
	        default:
	            infoLog.info(message);
	    }
	} catch (err) {
	    console.log(level + ':' + message);
	}
    }
};

exports.init = init;
exports.write = write;
