var HttpError = require('../error').HttpError;
var User = require('../models/user').User;

exports.post = function(req, res, next) {

  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Wrong email').isEmail();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password', 'Password should be between 6 and 30 characters').len(6, 30);
  req.checkBody('name', 'Name is required').notEmpty();
  req.checkBody('name', 'Name should contain only letters').isAlpha();
  req.checkBody('name', 'Name should be between 3 and 30 characters').len(3, 30);
  req.checkBody('phone', 'Phone should contain only numbers').isNumeric();

  var errors = req.validationErrors();
  if (errors) {
    return next(new HttpError(422, errors));
  }

  var newUser = {};
  newUser.password = req.body.password;
  newUser.email = req.body.email;
  newUser.phone = req.body.phone;
  newUser.name = req.body.name;

  User.register(newUser, function(err, user) {
    if (err) return next(err);
    var data = JSON.stringify({"token": user.hashedPassword});
    res.status(200).send(data);
  });

};
