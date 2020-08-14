var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
// const { json } = require('express');

/* GET home page. */
module.exports = (db) => {
    // get page project all
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        let users = req.session.users
        let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects LEfT JOIN members ON members.projectid = projects.projectid LEFT JOIN users ON users.userid = members.userid `
        //filter logic
        let result = [];
        const { cid, cnama, cmember, idproject, namaproject, member } = req.query;

        if (cid && idproject) {
            result.push(`projects.projectid=${idproject}`)
        }

        if (cnama && namaproject) {
            result.push(`projects.name ILIKE '%${namaproject}%'`)
        }

        if (cmember && member) {
            result.push(`members.userid=${member}`)
        }

        if (result.length > 0) {
            getData += `WHERE ${result.join(" AND ")}`;
        }
        getData += `) AS projectname`;
        console.log('cek data', getData)
        //end filter logic

        db.query(getData, (err, totalData) => {
            if (err) res.status(500).json(err)

            //start pagenation logic
            const link = req.url == '/' ? '/?page=1' : req.url;
            const page = req.query.page || 1;
            const limit = 3;
            const offset = (page - 1) * limit;
            const total = totalData.rows[0].total
            const pages = Math.ceil(total / limit);
            let getData = `SELECT DISTINCT projects.projectid, projects.name, string_agg(users.firstname || ' ' || users.lastname, ', ') as nama FROM projects LEFT JOIN members ON members.projectid = projects.projectid
            LEFT JOIN users ON users.userid = members.userid `;

            if (result.length > 0) {
                getData += `WHERE ${result.join(" AND ")}`
            }

            getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset}`;
            console.log('data cari',getData)
            //end pagination logic


            db.query(getData, (err, dataProject) => {
                if (err) res.status(500).json(err)
                //let sql = `SELECT * from projects`
                // db.query(sql, (err, dataProject) => {
                //     if (err) res.status(500).json(err)
                    let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`
                    db.query(getUser, (err, dataUsers) => {
                        if (err) res.status(500).json(err)
                        res.render('projects/listProject', {
                            users,
                            url: 'projects',
                            result: dataProject.rows,
                            users: dataUsers.rows,
                            page,
                            pages,
                            link,
                        })
                    })
                //})
            })

        })
    });

    // for option table
    router.post("/option", helpers.isLoggedIn, (req, res) => {
        const user = req.session.users;
        let sqlUpdateOption = `UPDATE users SET optionprojects = '${JSON.stringify(req.body)}' WHERE userid=${user.userid}`;
        db.query(sqlUpdateOption, (err) => {
            if (err) res.status(500).json(err);
            res.redirect('/projects');
        })
    })

    //get users name in project/add
    router.get('/add', helpers.isLoggedIn, (req, res) => {
        const add = `SELECT * FROM users ORDER by userid`;
        db.query(add, (err, dataADD) => {
            if (err) res.status(500).json(err);
            let result = dataADD.rows;
            res.render('projects/add', {
                users: req.session.users,
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
            res.redirect('/projects')
        }
    })

    // get data @edit project
    router.get('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
        let projectid = req.params.projectid;
        let sql = `SELECT members.userid, projects.name, projects.projectid FROM projects LEFT JOIN members ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid}`;
        let sql2 = `SELECT members.userid, projects.name, projects.projectid FROM members LEFT JOIN projects ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid};`
        let sql3 = `SELECT * FROM users`;

        db.query(sql, (err, data) => {
            if (err) res.status(500).json(err)
            let dataProject = data.rows[0];
            db.query(sql2, (err, data) => {
                if (err) res.status(500).json(err)
                db.query(sql3, (err, dataUsers) => {
                    let dataUser = dataUsers.rows;
                    if (err) res.status(500).json(err)
                    res.render('projects/edit', {
                        title: 'Dasboard Edit Project',
                        url: 'projects',
                        user: req.session.user,
                        project: dataProject,
                        dataUser,
                        dataMembers: data.rows.map(item => item.userid),
                        projectMessage: req.flash('projectMessage')
                    })
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
        let sqlDeleteProject = `DELETE FROM members WHERE projectid=${projectid};
                                DELETE FROM projects WHERE projectid=${projectid}`;
        db.query(sqlDeleteProject, (err) => {
            if (err) res.status(500).json(err)
            res.redirect('/projects');
        })
    })


    //get page project/ overview

    router.get('/overview/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let sql = `SELECT * FROM projects WHERE projectid=${projectid}`;
        db.query(sql, (err, getData) => {
            if (err) res.status(500).json(err)
            res.render('projects/overview', {
                users: req.session.users,
                title : 'Dasboard Overview',
                result: getData.rows[0],
            })
        })

    })





    return router;
}    