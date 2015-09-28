var express = require('express');
var path = require('path');
var config = require('./config');
var logger = require('morgan');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

mongoose.connect(config.get('mongoose:uri'));                     // connect database

var routes = require('./routes/index');
var app = express();
var HttpError = require('./error').HttpError;

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressValidator({
  errorFormatter: function(param, message) {
    var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      field : param,
      message : message
    };
  }
}));

app.use('/', routes);

app.use(function(err, req, res, next) {
  if (typeof err == 'number') {
    err = new HttpError(err);
  } else if (!(err instanceof HttpError)) {
    err = new HttpError(500);
  }
  res.status(err.status).send(err.message);
});


module.exports = app;
