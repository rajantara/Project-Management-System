var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
const bcrypt = require('bcrypt');
const saltRounds = 10;


/* GET home page. */
module.exports = (db) => {

  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    let users = req.session.users
    console.log(users)
    let sql = `SELECT * FROM users WHERE email = '${users.email}'`
    db.query(sql, (err, data) => {
      console.log(sql)
      let result = data.rows[0]
      if (err) return res.send(err)
      res.render('profile/listProfile', {
        title: '𝔼𝕕𝕚𝕥 ℙ𝕣𝕠𝕗𝕚𝕝𝕖',
        result,
        url : 'profile',
        users
      })
    })
    
  });
    
  //update data profile
  router.post('/', helpers.isLoggedIn, (req, res) => {
    const {password, firstname, lastname, position, job } = req.body;
    let users =req.session.users;
    bcrypt.hash(password,saltRounds, function (err, hash) {
      if (err) return res.send(err)
      let sql = `UPDATE users SET password = '${hash}', firstname ='${firstname}',lastname = '${lastname}',position = '${position}', isfulltime='${job == 'Full Time' ? 'Full Time' : 'Part Time'}' WHERE email = '${users.email}'`;
      console.log('masuk',sql)
      db.query(sql, (err) => {
        if (err) return res.send(err);
        res.redirect('/projects')
      }) 
    })
  })
  

  return router;
}


