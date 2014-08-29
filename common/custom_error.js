/**
* 一般情况下都应该采用自定义类型错误，便于进行错误处理
*/

"use strict";

var util = require('util');

var AbstractError = function(msg, constructor) {
    Error.captureStackTrace(this, constructor || this);
    this.message = msg || 'Error';
};

util.inherits(AbstractError, Error);
AbstractError.prototype.name = 'Abstract Error';

var InitError = function(msg) {
    InitError.super_.call(this, msg, this.constructor);
};
util.inherits(InitError, AbstractError);
InitError.prototype.name = 'Init Error';

var DatabaseError = function(msg) {
    DatabaseError.super_.call(this, msg, this.constructor);
};
util.inherits(DatabaseError, AbstractError);
DatabaseError.prototype.name = 'Database Error';

var NonFatalError = function(msg) {
    NonFatalError.super_.call(this, msg, this.constructor);
};
util.inherits(NonFatalError, AbstractError);
NonFatalError.prototype.name = 'Non fatal Error';

exports.AbstractError = AbstractError;
exports.InitError = InitError;
exports.DatabaseError = DatabaseError;
exports.NonFatalError = NonFatalError;
