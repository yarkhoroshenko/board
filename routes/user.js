var url = require('url');
var qstr = require('querystring');
var async = require('async');
var HttpError = require('../error').HttpError;
var User = require('../models/user').User;
var Item = require('../models/item').Item;

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function emptyObject(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
}

exports.get = function(req, res, next) {
    var data = qstr.parse(url.parse(req.url).query);
    if(!emptyObject(data)) {
    User.search(data, function (err, user) {
      if (err) return next(err);
      res.status(200).send(user);
    });
    } else {
      next(new HttpError(404))
    }
};


exports.getId = function(req, res, next) {
    var id = req.params.id;

    if (isNumeric(id)) {
      var token = req.headers.authorization;

      async.waterfall([
          function (callback) {
            User.checkAuth(token, function (err) {
              if (err) return callback(err);
              callback();
            })
          },
          function (callback) {
            User.findById(id, function (err, user) {
              if (err) return callback(err);
              callback(null, user);
            })
          }
        ], function (err, user) {
          if (err) return next(err);
          res.status(200).send(user);
        }
      );

    } else {
      next(new HttpError(404));
    }
};
