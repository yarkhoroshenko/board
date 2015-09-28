var path = require('path');
var util = require('util');
var http = require('http');

function HttpError(status, message) {
  console.log(arguments);
  Error.apply(this, arguments);
  Error.captureStackTrace(this, HttpError);

  this.status = status;
  if (typeof message !== 'string') JSON.stringify(message);
  this.message = message;
}

util.inherits(HttpError, Error);

HttpError.prototype.name = 'HttpError';

exports.HttpError = HttpError;
