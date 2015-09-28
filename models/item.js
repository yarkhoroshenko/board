var async = require('async');
var fs = require('fs');
var HttpError = require('../error').HttpError;

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var schema = new Schema({
    id: {
      type: Number,
      unique: true,
      required: true
    },
    created_at: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    image: {
      type: String
    },
    user_id: {
      type: Number,
      required: true
    }
  },
  {
    autoIndex: false
  });

function convertItem (item) {
  var newitem = {};
  newitem.id = item.id;
  newitem.created_at = item.created_at;
  newitem.title = item.title;
  newitem.price = item.price;
  newitem.user_id = item.user_id;
  newitem.image = item.image;
  return newitem;
}

schema.statics.convertItem = function (item) {
  var newitem = {};
  newitem.id = item.id;
  newitem.created_at = item.created_at;
  newitem.title = item.title;
  newitem.price = item.price;
  newitem.user_id = item.user_id;
  newitem.image = item.image;
  return newitem;
};

schema.statics.createItem = function(user, data, callback) {
  var Item = this;
  async.waterfall([
    function(callback) {
      Item.findOne().sort('-id').exec(callback);
    },
    function(item, callback) {
      var maxId;
      if (item) {
        maxId = (+item.id) + 1;
      } else {
        maxId = 1;
      }
      var date = new Date();
      date.toLocaleTimeString();
      var timestamp = date.getTime();
      var newitem = new Item({id: maxId, created_at: timestamp, title: data.title, price: data.price, image: "", user_id: user.id});
      newitem.save(function(err) {
        if (err) return callback(err);
        newitem = convertItem(newitem);
        callback(null, newitem);
      })
    }
  ], callback);
};

schema.statics.findById = function(id, callback) {
  var Item = this;
  Item.findOne({id: id}, function (err, item) {
    if (err) return callback(err);
    if (!item) return callback(new HttpError(404));
    callback(null, item);
  })
};

schema.statics.search = function(data, callback) {
  var query = {};
  var options= {};
  var sortBy = data.order_by;
  var sortType = data.order_type;
  if (data.title) {
    //query.title = data.title[0].toUpperCase() + data.title.substring(1);
    query.title = data.title;
  }
  if (data.user_id) {
    query.user_id = data.user_id;
  }
  if (sortBy && !options.hasOwnProperty(sortBy)) {
    if (sortType) {
      options[sortBy] = sortType;
    } else {
      options[sortBy] = -1;
    }
  } else {
    options.created_at = -1;
  }
  var Item = this;
  Item.find(query, null, {sort: options}, function (err, item) {
    if (err) return callback(err);
    if (item.length == 0) return callback(null, item);
    var newitem = [];
    item.forEach(function(item) {
      newitem.push(convertItem(item));
    });
    callback(null, newitem);
  })
};

schema.statics.updateItem = function(item, callback) {
      item.save(function(err, item) {
        if (err) return callback(err);
        var newitem = convertItem(item);
        callback(null, newitem);
      });
};

schema.statics.deleteItem = function(id, callback) {
  var Item = this;

  async.waterfall([
    function (callback) {
      Item.findOne({id: id}, callback);
    },
    function (item, callback) {
      if (item) {
        item.remove(function (err) {
          if (err) return callback(err);
          callback(null, item);
        });
      } else {
        callback(new HttpError(404));
      }
    }
  ], callback)
};

schema.statics.createItemImage = function(item, tmp_path, target_path, callback) {

  async.waterfall([
    function (callback) {
      fs.exists('./images/' + item.id, function (exists) {
        callback(null, exists);
      });
    },
    function (exists, callback) {
      if (!exists) {
        fs.mkdir('./images/' + item.id, function (err) {
          if (err) return callback(err);
          callback();
        });
      } else {
        fs.unlink(tmp_path, function (err) {
          console.log(err);
          if (err) return callback(err);
          callback(new HttpError(422, [{"field": "file", "message": "File already exist"}]));
        });
      }
    },
    function (callback) {
      fs.rename(tmp_path, target_path, function (err) {
        if (err) return callback(err);
        callback();
      });
    }
  ], callback);

};

var rmdirAsync = function(path, callback) {
  fs.readdir(path, function(err, files) {
    if(err) {
      callback(err, []);
      return;
    }
    var wait = files.length,
      count = 0,
      folderDone = function(err) {
        count++;
        if( count >= wait || err) {
          fs.rmdir(path,callback);
        }
      };
    if(!wait) {
      folderDone();
      return;
    }
    files.forEach(function(file) {
      var curPath = path + "/" + file;
      fs.lstat(curPath, function(err, stats) {
        if( err ) {
          callback(err, []);
          return;
        }
        if( stats.isDirectory() ) {
          rmdirAsync(curPath, folderDone);
        } else {
          fs.unlink(curPath, folderDone);
        }
      });
    });
  });
};

schema.statics.deleteItemImage = function(id, callback) {
  var target_path = './images/' + id;

  async.waterfall([
    function(callback) {
      fs.exists(target_path, function (exists) {
        if (!exists) return callback(new HttpError(404));
        callback();
      });
    },
    function (callback) {
      rmdirAsync(target_path, function (err) {
        if (err) return callback(err);
        callback();
      })
    }
  ], callback);

};

exports.Item = mongoose.model('Item', schema);
