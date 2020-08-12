var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');

/* GET home page. */
module.exports = (db) => {
    // localhost:3000/projects
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        res.render('projects/listProject', {
            
        })
    });

    return router;
}    