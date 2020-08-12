var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');


module.exports = (db) => {
  /* GET home page. */
  router.get('/', function (req, res, next) {
    res.render('login', { pesanKesalahan: req.flash('pesanKesalahan') });
  });

  router.post('/login', function (req, res, next) {
    console.log(req.body)
    db.query('SELECT * from users where email = $1', [req.body.email], (err, data) => {
      if (err) {
        req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
        return res.redirect('/');
      }
      if (data.rows.length == 0) {
        req.flash('pesanKesalahan', 'email atau password salah')
        return res.redirect('/');
      }
      bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
        if (err) {
          req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
          return res.redirect('/');
        }
        if (!result) {
          req.flash('pesanKesalahan', 'email atau password salah')
          return res.redirect('/');
        }

        //lanjut
        let users = data.rows[0]
        delete users['password']
        console.log(users)
        req.session.users = users;
        res.redirect('/projects')
      });
    })
  });

  router.get('/logout', function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect('/')
    })
  });


  return router;

}

