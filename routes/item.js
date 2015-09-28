var url = require('url');
var qstr = require('querystring');
var async = require('async');
var HttpError = require('../error').HttpError;
var User = require('../models/user').User;
var Item = require('../models/item').Item;

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

exports.post = function(req, res, next) {
  var token = req.headers.authorization;

  async.waterfall([
      function (callback) {
        User.checkAuth(token, function (err, user) {
          if (err) return callback(err);
          callback(null, user);
        })
      },
      function (user, callback) {

        req.checkBody('title', 'Title is required').notEmpty();
        req.checkBody('title', 'Title should contain at least 3 characters').len(3);
        req.checkBody('price', 'Price is required').notEmpty();
        req.checkBody('price', 'Price should contain only numbers').isNumeric();
        req.checkBody('price', 'Price should contain at least 1 characters').len(1);

        var errors = req.validationErrors();
        if (errors) {
          return next(new HttpError(422, errors));
        }

        var newItem = {};
        newItem.title = req.body.title;
        newItem.price = req.body.price;

        Item.createItem(user, newItem, function (err, item) {
          if (err) return callback(err);
          item.user = User.convertUser(user);
          callback(null, item);
        });
      }
    ], function(err, item) {
      if (err) return next(err);
      res.status(200).send(item);
    }
  );
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
          Item.findById(id, function (err, item) {
            if (err) return callback(err);
            var tempItem = Item.convertItem(item);
            callback(null, tempItem);
          })
        },
        function (item, callback) {
          User.findById(item.user_id, function (err, user) {
            if (err) return callback(err);
            item.user = User.convertUser(user);
            callback(null, item);
          })
        }
      ],
      function (err, item) {
        if (err) return next(err);
        res.status(200).send(item);
      }
    );

  } else {
    next(new HttpError(404));
  }
};

exports.put = function(req, res, next) {
  var id = req.params.id;
  if (isNumeric(id)) {

    if (req.body.title || req.body.price) {
      if (req.body.title) {
        req.checkBody('title', 'Title should contain at least 3 characters').len(3);
        req.checkBody('title', 'Title should contain only letters and numbers').isAlphanumeric();
      }
      if (req.body.price) {
        req.checkBody('price', 'Price should contain at least 1 characters').len(1);
        req.checkBody('price', 'Price should contain only numbers').isNumeric();
      }
    } else return next(new HttpError(422, [{"field":"title","message":"Fill one or both field for updating"}]));

    var errors = req.validationErrors();
    if (errors) {
      return next(new HttpError(422, errors));
    }
    var token = req.headers.authorization;

    async.waterfall([
        function (callback) {
          User.checkAuth(token, function (err, user) {
            if (err) return callback(err);
            callback(null, user);
          })
        },
        function (user, callback) {
          Item.findById(id, function (err, item) {
            if (err) return callback(err);
            callback(null, item, user);
          })
        },
        function (item, user, callback) {
          if (user.id === item.user_id) {
            if (req.body.title) {
              item.title = req.body.title;
            }
            if (req.body.price) {
              item.price = req.body.price;
            }
            Item.updateItem(item, function (err, item) {
              if (err) return callback(err);
              item.user = User.convertUser(user);
              callback(null, item);
            });
          } else {
            return callback(new HttpError(403));
          }
        }
      ],
      function (err, item) {
        if (err) return next(err);
        res.status(200).send(item);
      }
    );

  } else {
    next(new HttpError(404));
  }
};

function emptyObject(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
}

exports.get = function(req, res, next) {
  var query = qstr.parse(url.parse(req.url).query);
  async.waterfall([
    function(callback) {
      Item.search(query, function(err, item) {
        if (err) return callback(err);
        callback(null, item);

      })
    },
    function(item, callback) {
      if (item.length == 0) {
        callback(null, item);
      } else {
        var newitems = [];
        item.forEach(function (item, index, array) {
          User.findById(item.user_id, function (err, user) {
            if (err) return callback(err);
            item.user = User.convertUser(user);
            newitems.push(item);
            if (index === array.length - 1) {
              callback(null, newitems);
            }
          })
        });
      }
    }
  ], function(err, item) {
    if (err) return next(err);
    res.status(200).send(item);
  });
};




exports.delete = function(req, res, next) {
  var token = req.headers.authorization;
  var id = req.params.id;
  if (isNumeric(id)) {
      async.waterfall([
        function(callback) {
          User.checkAuth(token, function (err, user) {
            if (err) return callback(err);
            callback(null, user);
          });
        },
        function(user, callback) {
          Item.findById(id, function (err, item) {
            if (err) return callback(err);
            if (user.id === item.user_id) {
              callback(null, item);
            } else {
              return callback(new HttpError(403));
            }
          })
        },
        function(item, callback) {
          Item.deleteItem(id, function (err) {
            if (err) return callback(err);
            callback(null);
          })
        }
      ], function (err) {
        if (err) return next(err);
        res.status(200).send();
      });
    }
};
