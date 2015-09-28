var express = require('express');
var router = express.Router();
var HttpError = require('../error').HttpError;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('../public/index.html');
});

router.post('/api/register', require('./register').post);

router.post('/api/login', require('./login').post);

router.get('/api/me', require('./me').get);

router.put('/api/me', require('./me').put);

router.get('/api/user', require('./user').get);

router.get('/api/user/:id', require('./user').getId);

router.post('/api/item', require('./item').post);

router.get('/api/item', require('./item').get);

router.get('/api/item/:id', require('./item').getId);

router.put('/api/item/:id/', require('./item').put);

router.delete('/api/item/:id', require('./item').delete);

router.post('/api/item/:id/image', require('./image').post);

router.delete('/api/item/:id/image', require('./image').delete);

router.all('*', function (req, res, next) {
  next (new HttpError(404));
});

module.exports = router;
