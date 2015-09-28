var async = require('async');
var HttpError = require('../error').HttpError;
var User = require('../models/user').User;

exports.get = function(req, res, next) {
  var token = req.headers.authorization;
  User.checkAuth(token, function (err, user) {
    if (err) return next(err);
    var tempUser = User.convertUser(user);
    res.status(200).send(tempUser);
  });
};


function emptyObject(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
}

exports.put =  function(req, res, next) {
  if (emptyObject(req.body)) return next(new HttpError(422, [{"field": "email", "message": "Fill any fields for updating"}]));
  if (req.body.email) req.checkBody('email', 'Wrong email').isEmail();
  if (req.body.name) req.checkBody('name', 'Name should contain only letters').isAlpha();
  if (req.body.name) req.checkBody('name', 'Name should be between 3 and 30 characters').len(3, 30);
  if (req.body.phone)  req.checkBody('phone', 'Phone should contain only letters').isNumeric();
  if (req.body.password || req.body.new_password) {
    if (req.body.password && req.body.new_password) {
      if (req.body.password == req.body.new_password) return next(new HttpError(422, [{
        "field": "password",
        "message": "Passwords should be different"
      }]));
      req.checkBody('new_password', 'New password should be between 6 and 30 characters').len(6, 30);
    } else {
      return next(new HttpError(422, [{"field": "password", "message": "Both passwords are required"}]));
    }
  }
  var errors = req.validationErrors();
  if (errors) {
    return next(new HttpError(422, errors));
  }

  var token = req.headers.authorization;
  var data = {};
  data.email = req.body.email;
  data.phone = req.body.phone;
  data.name = req.body.name;
  data.password = req.body.password;
  data.new_password = req.body.new_password;

  async.waterfall([
    function (callback) {
      User.checkAuth(token, function (err, user) {
        if (err) return callback(err);
        callback(null, user);
      });
    },
    function (user, callback) {
      User.updateMe(user, data, function (err, user) {
        if (err) return callback(err);
        callback(null, user);
      });
    }
  ], function (err, user){
    if (err) return next(err);
    res.status(200).send(user);
  })
};

