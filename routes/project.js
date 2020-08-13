var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');

/* GET home page. */
module.exports = (db) => {
    // get page project
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        let users = req.session.users
        res.render('projects/listProject', {
            users,
            title: 'Dasrboard Project',
            url: 'projects',
    
        })
                 
    });
    



    //get users name in project/add
    router.get('/add', helpers.isLoggedIn,(req, res) => {     
            res.render('projects/add', {
                users: req.session.users,
                title:'DASBOARD PMSR',
                url: 'projects',
               
            })
    })

    //post add project
    router.post('/add', helpers.isLoggedIn, (req,res) => {
        const { name ,  member } = req.body;
        if (name && member) {
            const insertId = `INSERT INTO projects (name) VALUES ('${name}')`;
            db.query(insertId, (err, dataProject) => {
                if (err) res.status(500).json(err)
                let selectidMax = `SELECT MAX (projectid) FROM projects`;
                db.query(selectidMax, (err, dataMax) => {
                    if (err) res.status(500).json(err)
                    let insertidMax = dataMax.rows[0].max;
                    let insertMember = 'INSERT INTO members (usersid, role, projectid) VALUES'
                    if (typeof member == 'string') {
                        insertMember += `(${member}, ${insertidMax});`

                    } else {
                        let members = member.map(item => {
                            return `(${item}, ${insertidMax})`
                        }).join(',')
                        insertMember += `${members}`;
                    }
                    db.query(insertMember, (err, dataSelect) => {
                        res.redirect('/projects')
                    })
                })
            })
        }
    })

    return router;
}    