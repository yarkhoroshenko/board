var async = require('async');
var multer = require('multer');
var HttpError = require('../error').HttpError;
var User = require('../models/user').User;
var Item = require('../models/item').Item;

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './images');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '.gif');
  }
});

var upload = multer({ storage: storage,
  limits: { fileSize: 3 * 1024 * 1024} }).single('file');

exports.post = function(req, res, next) {
  var token = req.headers.authorization;
  var id = req.params.id;
  if (isNumeric(id)) {

    async.waterfall([
        function (callback) {
          User.checkAuth(token, function (err, user) {
            if (err) return callback(err);
            callback(null, user);
          });
        },
        function (user, callback) {
          Item.findById(id, function (err, item) {
            if (err) return callback(err);
            if (!item) return callback(new HttpError(404, [{"field": "file", "message": "Item not found"}]));
            if (user.id === item.user_id) {
              callback(null, item, user);
            } else {
              return callback(new HttpError(403));
            }
          });
        },
        function (item, user, callback) {
          upload(req, res, function (err) {
            if (!req.file) return callback(new HttpError(422, [{"field": "file", "message": "File is required"}]));
            if (err) {
              if (err.code === 'LIMIT_FILE_SIZE') return callback(new HttpError(422, [{
                "field": "image",
                "message": "The file is too big."
              }]));
              return callback(err);
            } else {
              var tmp_path = req.file.path;
              var target_path = './images/' + id + '/' + req.file.filename;
              callback(null, user, item, tmp_path, target_path);
            }
          });
        },
        function (user, item, tmp_path, target_path, callback) {
          Item.createItemImage(item, tmp_path, target_path, function (err) {
            if (err) return callback(err);
            item.image = target_path;
            callback(null, item, user);
          });
        },
        function (item, user, callback) {
          Item.updateItem(item, function (err, item) {
            if (err) return callback(err);
            item.user = User.convertUser(user);
            callback(null, item);
          });
        }
      ],
      function (err, item) {
        if (err) return next(err);
        res.status(200).send(item);
      });
  } else {
    next(new HttpError(404));
  }
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
              callback(null, item, user);
            } else {
              return callback(new HttpError(403));
            }
          })
        },
        function(item, user, callback) {
          Item.deleteItemImage(id, function (err) {
            if (err) return callback(err);
            item.image = '';
            callback(null, item, user);
          })
        },
        function(item, user, callback) {
          Item.updateItem(item, function (err, item) {
            if (err) return next(err);
            item.user = User.convertUser(user);
            callback(null, item);
          });
        }

      ], function (err, item) {
        if (err) return next(err);
        res.status(200).send(item);
      });

  } else {
    next(new HttpError(404));
  }
};

