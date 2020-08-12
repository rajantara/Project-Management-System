var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');


/* GET home page. */
module.exports = (db) => {

  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    db.query()
    res.render('profile/view')
  });

  router.post('/', helpers.isLoggedIn, function (req, res, next) {
    res.redirect('/profile')
  });
  

  return router;
}


