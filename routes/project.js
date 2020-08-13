var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
const { json } = require('express');

/* GET home page. */
module.exports = (db) => {
    // get page project
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        let users = req.session.users
        let sql = `SELECT * from projects`
        db.query(sql, (err, dataProject) => {
            if (err) res.status(500).json(err)
            console.log('hahah', dataProject.rows)
            res.render('projects/listProject', {
                users,
                title: 'Dasrboard Project',
                url: 'projects',
                result: dataProject.rows

            })
        })
    });

    //get users name in project/add
    router.get('/add', helpers.isLoggedIn, (req, res) => {
        const add = `SELECT * FROM users ORDER by userid`;
        db.query(add, (err, dataADD) => {
            if (err) res.status(500).json(err);
            let result = dataADD.rows;
            res.render('projects/add', {
                users: req.session.users,
                title: 'DASBOARD PMSR',
                url: 'projects',
                result,
            })
        })

    })

    // post add project
    router.post('/add', helpers.isLoggedIn, (req, res) => {
        const { name, member } = req.body;
        if (name && member) {
            const insertId = `INSERT INTO projects (name) VALUES ('${name}')`;
            db.query(insertId, (err, dataProject) => {
                if (err) res.status(500).json(err)
                let selectidMax = `SELECT MAX (projectid) FROM projects`;
                db.query(selectidMax, (err, dataMax) => {
                    if (err) res.status(500).json(err)
                    let insertidMax = dataMax.rows[0].max;
                    let insertMember = 'INSERT INTO members (userid, role, projectid) VALUES '
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
        } else {
            res.redirect('/projects/add')
        }
    })


    // get data edit project
    router.get('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
        let projectid = req.params.projectid;
        let sql = `SELECT members.userid, projects.name, projects.projectid FROM projects LEFT JOIN members ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid}`;
        let sql3 = `SELECT * FROM users`; 
        db.query(sql, (err, data) => {
            if (err) res.status(500).json(err)
            let dataProject = data.rows[0];
            db.query(sql3, (err, data) => {
                if (err) res.status(500).json(err)
                res.render('projects/edit', {
                    url:'projects',
                    users: req.session.users,
                    project: dataProject,
                    result,
                    dataMembers: data.rows.map(item => item.userid),
                })
            })

        })
    })



     // save data edit project
     router.post('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
        const { editname, editmember } = req.body;
        let projectid = req.params.projectid;
        let sql = `UPDATE projects SET name= '${editname}' WHERE projectid = ${projectid}`
        if (projectid && editname && editmember) {
            db.query(sql, (err) => {
                if (err) res.status(500).json(err)
                let sqlDeleteMember = `DELETE FROM members WHERE projectid = ${projectid}`;

                db.query(sqlDeleteMember, (err) => {
                    if (err) res.status(500).json(err)
                    let result = [];
                    if (typeof editmember == "string") {
                        result.push(`(${editmember}, ${projectid})`);
                    } else {
                        for (let i = 0; i < editmember.length; i++) {
                            result.push(`(${editmember[i]}, ${projectid})`);
                        }
                    }
                    let sqlUpdate = `INSERT INTO members (userid, role, projectid) VALUES ${result.join(",")}`;
                    db.query(sqlUpdate, (err) => {
                        if (err) res.status(500).json(err)
                        res.redirect('/projects')
                    })
                })
            })
        } else {
            req.flash('projectMessage', 'Please add members, members cant empty')
            res.redirect(`/projects/edit/${projectid}`);
        }
    })



    // to delete project 
    router.get('/delete/:projectid', helpers.isLoggedIn, (req, res) => {
        const projectid = req.params.projectid;
        let sqlDeleteProject = `DELETE FROM projects WHERE projectid=${projectid}`;
        db.query(sqlDeleteProject, (err) => {
            if (err) res.status(500).json(err)
            res.redirect('/projects');
        })
    })





    return router;
}    