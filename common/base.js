"use strict";

var moment = require('moment');
var uuid = require('node-uuid');

/**
* Convert JSON to Object (sync)
*
* @param {string} str - JSON string
* @returns {object}
*/
var convertJSONToObject = function(str) {
    try {
	return JSON.parse(str);
    } catch(e) {
	throw new TypeError('将字符串' + str + '转换为对象时遇到解析错误,详情:' + e.message);
    }
};

/**
* Convert Object to JSON (sync)
*
* @param {object} obj - JSON object
* @returns {string}
*/
var convertObjectToJSON = function(obj) {
    if (typeof obj !== 'object') {
	throw new TypeError('参数obj传入值的类型(' + typeof obj + ')不被支持');
    }
    return JSON.stringify(obj);
};

/**
* Get universal time
*
* @returns {object}
*/
var UniversalTime = function() {
    return moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
};

exports.convertJSONToObject = convertJSONToObject;
exports.convertObjectToJSON = convertObjectToJSON;
exports.UniversalTime = UniversalTime;
