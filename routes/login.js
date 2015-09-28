var HttpError = require('../error').HttpError;
var User = require('../models/user').User;

exports.post = function(req, res, next) {

  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Wrong email').isEmail();
  req.checkBody('password', 'Password is required').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return next(new HttpError(422, errors));
  }

  var email = req.body.email;
  var password = req.body.password;

  User.authorize(email, password, function(err, user) {
    if (err) return next(err);
    var data = JSON.stringify({"token": user.hashedPassword});
    res.status(200).send(data);
  });
};
