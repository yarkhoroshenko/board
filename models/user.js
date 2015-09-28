var crypto = require('crypto');
var async = require('async');
//var util = require('util');
var HttpError = require('../error').HttpError;

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var schema = new Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  hashedPassword: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  banned: {
    type: Boolean,
    default: false
  }
},
  {
    autoIndex: false
  });

schema.methods.encryptPassword = function(password) {
  return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
};

schema.virtual('password')
  .set(function(password) {
    this._plainPassword = password;
    this.salt = Math.random() + '';
    this.hashedPassword = this.encryptPassword(password);
  })
  .get(function() { return this._plainPassword; });


schema.methods.checkPassword = function(password) {
  return this.encryptPassword(password) === this.hashedPassword;
};

schema.statics.register = function(data, callback) {
  var User = this;
  async.waterfall([
    function(callback) {
      User.findOne({email: data.email}, callback);
    },
    function(user, callback) {
      if (!user) {
        User.findOne().sort('-id').exec(callback);
      } else {
        callback(new HttpError(422, [{"field":"email","message":"User exist"}]));
      }
    },
    function(user, callback) {
      var maxId;
      if (user) {
        maxId = (+user.id) + 1;
      } else {
        maxId = 1;
      }
      var newuser = new User({id: maxId, email: data.email, password: data.password, phone: data.phone, name: data.name});
      newuser.save(function(err) {
        if (err) return callback(err);
        callback(null, newuser);
      })
    }
  ], callback);
};

schema.statics.authorize = function(email, password, callback) {
  var User = this;

  async.waterfall([
    function(callback) {
      User.findOne({email: email}, callback);
    },
    function(user, callback) {
      if (user) {
        if (user.checkPassword(password)) {
          callback(null, user);
        } else {
          callback(new HttpError(422, [{"field":"password","message":"Wrong password"}]));
        }
      } else {
        callback(new HttpError(422, [{"field":"email","message":"User not found"}]));
      }
    }
  ], callback);
};

schema.statics.checkAuth = function (token, callback) {
  var User = this;
  if (!token) return callback(new HttpError(401));
  User.findOne({hashedPassword: token}, function (err, user) {
    if (user) {
      if (!user.banned) {
        callback(null, user);
      } else {
        callback(new HttpError(403));
      }
    } else {
      callback(new HttpError(401));
    }
  });
};

function convertUser (user) {
  var newuser = {};
  newuser.id = user.id;
  newuser.name = user.name;
  newuser.email = user.email;
  if (user.phone) newuser.phone = user.phone;
  return newuser;
}

schema.statics.convertUser = function (user) {
  var newuser = {};
  newuser.id = user.id;
  newuser.name = user.name;
  newuser.email = user.email;
  if (user.phone) newuser.phone = user.phone;
  return newuser;
};
schema.statics.findMe = function(user, callback) {
  var newuser = convertUser(user);
  callback(null, newuser);
};


function emptyObject(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
}

schema.statics.updateMe = function(user, data, callback) {
  var User = this;
  if (data.password) {
      var password = data.password;
      if (user.checkPassword(password)) {
        user.password = data.new_password;
      } else {
        callback(new HttpError(422, [{"field":"current_password","message":"Wrong current password"}]));
      }
  }
  if (data.phone && data.phone !== user.phone) {
    user.phone = data.phone;
  }
  if (data.name && data.name !== user.name) {
    user.name = data.name;
  }
  async.waterfall ([
    function(callback) {
      if (data.email) {
        if (data.email !== user.email) {
          User.findOne({email: data.email}, function (err, exist) {
            if (exist) return callback(new HttpError(422, [{"field":"email","message":"Email is already in use"}]));
            user.email = data.email;
            callback();
          });
        } else {
          callback();
        }
      } else {
        callback();
      }
    },
    function (callback) {
        user.save(function (err, user) {
          if (err) return callback(err);
          var newuser = convertUser(user);
          callback(null, newuser);
        });
    }
  ], callback);
};

schema.statics.findById = function(id, callback) {
  var User = this;
  User.findOne({id: id}, function (err, user) {
    if (err) return callback(err);
    if (!user) return callback(new HttpError(404));
    var newuser = convertUser(user);
    callback(null, newuser);
  })
};

schema.statics.search = function(data, callback) {
  var User = this;
  User.find(data, function (err, user) {
    if (err) return callback(err);
    var newuser = [];
    user.forEach(function(item) {
      newuser.push(convertUser(item));
    });
    callback(null, newuser);
  })
};

exports.User = mongoose.model('User', schema);