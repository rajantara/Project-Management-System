var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
const { title } = require('process');



// let for columns options
let checkOption = {
    id: true,
    name: true,
    member: true,
}

let optionMember = {
    id: true,
    name: true,
    position: true
}


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

            //end pagination logic


            db.query(getData, (err, dataProject) => {
                if (err) res.status(500).json(err)
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
                        option: checkOption,
                    })
                })
            })

        })
    });


    // localhost:3000/option
    router.post('/option', helpers.isLoggedIn, (req, res) => {
        checkOption.id = req.body.checkid;
        checkOption.name = req.body.checkname;
        checkOption.member = req.body.checkmember;
        res.redirect('/projects')
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
        let sql1 = `SELECT users.firstname, users.lastname , members.role FROM members 
    LEFT JOIN users ON members.userid = users.userid 
    LEFT JOIN projects ON members.projectid = projects.projectid
    WHERE members.projectid = ${projectid}`;
        let sql2 = `SELECT * FROM issues WHERE projectid = ${projectid}`
        db.query(sql, (err, getData) => {
            if (err) res.status(500).json(err)
            db.query(sql1, (err, dataUser) => {
                if (err) res.status(500).json(err)
                db.query(sql2, (err, dataIssues) => {
                    if (err) res.status(500).json(err)
                    let bugOpen = 0;
                    let bugTotal = 0;
                    let featureOpen = 0;
                    let featureTotal = 0;
                    let supportOpen = 0;
                    let supportTotal = 0;

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'bug' && item.status !== "Closed") {
                            bugOpen += 1;
                        }
                        if (item.tracker == 'bug') {
                            bugTotal += 1;
                        }
                    })

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'feature' && item.status !== "Closed") {
                            featureOpen += 1;
                        }
                        if (item.tracker == 'feature') {
                            featureTotal += 1;
                        }
                    })

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'support' && item.status !== "Closed") {
                            supportOpen += 1;
                        }
                        if (item.tracker == 'support') {
                            supportTotal += 1;
                        }
                    })

                    res.render('projects/overview', {
                        users: req.session.users,
                        title: 'Darsboard Overview',
                        url: 'projects',
                        url2: 'overview',
                        result: getData.rows[0],
                        result2: dataUser.rows,
                        result3: dataIssues.rows,
                        bugOpen,
                        bugTotal,
                        supportOpen,
                        supportTotal,
                        featureOpen,
                        featureTotal,
                        projectid
                    })
                })
            })
        })
    })


    //get page project/ actoivity
    router.get('/activity/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let sql = `SELECT activityid, (time AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'asia/jakarta')::DATE dateactivity, (time AT TIME ZONE 'Asia/Jakarta' AT time zone 'asia/jakarta')::time timeactivity, title, description, CONCAT(users.firstname,' ',users.lastname) AS nama FROM activity 
                    INNER JOIN users ON activity.author = users.userid
                    WHERE projectid = ${projectid} ORDER BY activityid DESC`
        let sql2 = `SELECT DISTINCT members.projectid, projects.name projectname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid) WHERE projectid=${projectid}`;

        function convertDateTerm(date) {
            date = moment(date).format('YYYY-MM-DD')
            const today = moment().format('YYYY-MM-DD')
            const yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");
            if (date == today) {
                return "Today";
            } else if (date == yesterday) {
                return "Yesterday"
            }
            return moment(date).format("MMMM Do, YYYY")
        }
        db.query(sql, (err, dataActivity) => {
            if (err) res.status(500).json(err)
            db.query(sql2, (err, getData) => {
                if (err) res.status(500).json(err)
                let result2 = getData.rows;
                let result3 = dataActivity.rows;

                result3 = result3.map(data => {
                    data.dateactivity = moment(data.dateactivity).format('YYYY-MM-DD')
                    data.timeactivity = moment(data.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss')
                    return data
                })

                let dateonly = result3.map(data => data.dateactivity)
                dateunix = dateonly.filter((date, index, arr) => {
                    return arr.indexOf(date) == index
                })

                let activitydate = dateunix.map(date => {
                    let dataindate = result3.filter(item => item.dateactivity == date);
                    return {
                        date: convertDateTerm(date),
                        data: dataindate
                    }
                })

                projectname = result2.map(data => data.projectname)

                let sql2 = `SELECT * FROM projects WHERE projectid = ${projectid}`;
                db.query(sql2, (err, data) => {
                    if (err) res.status(500).json(err)
                    res.render('projects/activity', {
                        user: req.session.user,
                        title: 'Darsboard Activity',
                        url: 'projects',
                        url2: 'activity',
                        result: data.rows[0],
                        activitydate,
                        result3,
                        moment
                    })
                })
            })
        })
    })


    // *** member page *** //

    // to landing member page
    router.get('/members/:projectid', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        const { cid, cnama, cposition, id, nama, position } = req.query;
        let sql = `SELECT COUNT(member) as total  FROM (SELECT members.userid FROM members JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid} `;
        // start filter logic
        result = [];

        if (cid && id) {
            result.push(`members.id=${id}`)
        }
        if (cnama && nama) {
            result.push(`CONCAT(users.firstname,' ',users.lastname) LIKE '%${nama}%'`)
        }
        if (cposition && position) {
            result.push(`members.role = '${position}'`)
        }
        if (result.length > 0) {
            sql += ` AND ${result.join(' AND ')}`
        }
        sql += `) AS member`;
        // end filter logic
        db.query(sql, (err, totalData) => {
            if (err) res.status(500).json(err)

            // start pagenation members logic
            const link = (req.url == `/members/${projectid}`) ? `/members/${projectid}/?page=1` : req.url;
            const page = req.query.page || 1;
            const limit = 3;
            const offset = (page - 1) * limit;
            const total = totalData.rows[0].total
            const pages = Math.ceil(total / limit);
            let sqlMember = `SELECT users.userid, projects.name , projects.projectid, members.id, members.role, CONCAT(users.firstname,' ',users.lastname) AS nama FROM members 
            LEFT JOIN projects ON projects.projectid = members.projectid 
            LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid}`

            if (result.length > 0) {
                sqlMember += ` AND ${result.join(' AND ')}`
            }
            sqlMember += ` ORDER BY members.id ASC`
            sqlMember += ` LIMIT ${limit} OFFSET ${offset}`;
            // end pagenation members logic

            db.query(sqlMember, (err, dataMember) => {
                if (err) res.status(500).json(err)
                let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`;
                db.query(sqlProject, (err, dataProject) => {
                    if (err) res.status(500).json(err)
                    let user = req.session.users
                    console.log('cek bang', user)
                    if (err) res.status(500).json(err);
                    res.render('projects/members/listMembers', {
                        projectid,
                        users: req.session.users,
                        title: '𝓓𝓪𝓼𝓫𝓸𝓪𝓻𝓭 𝓜𝓮𝓶𝓫𝓮𝓻𝓼',
                        url: 'projects',
                        url2: 'members',
                        pages,
                        page,
                        link,
                        result: dataProject.rows[0],
                        result2: dataMember.rows,
                        option: optionMember,
                        memberMessage: req.flash('memberMessage')
                    })

                })
            })
        })
    })


    //for columns options
    router.post('/members/:projectid/option', helpers.isLoggedIn, (req, res) => {
        const projectid = req.params.projectid;

        optionMember.id = req.body.checkid;
        optionMember.name = req.body.checkname;
        optionMember.position = req.body.checkposition;
        res.redirect(`/projects/members/${projectid}`)
    })


    // landing to add member page at member page
    router.get('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params;
        let sqlProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
        let sqlMember = `SELECT userid, email, CONCAT(firstname,' ',lastname) AS nama FROM users WHERE userid NOT IN (SELECT userid FROM members WHERE projectid=${projectid})`
        db.query(sqlProject, (err, dataProject) => {
            if (err) res.status(500).json(err)
            db.query(sqlMember, (err, dataMember) => {
                if (err) res.status(500).json(err)
                res.render('projects/members/add', {
                    title: '𝓓𝓪𝓼𝓫𝓸𝓪𝓻𝓭 𝓜𝓮𝓶𝓫𝓮𝓻𝓼 𝓐𝓭𝓭',
                    url: 'projects',
                    url2: 'members',
                    result: dataProject.rows[0],
                    result2: dataMember.rows,
                    memberMessage: req.flash('memberMessage'),
                    users: req.session.users
                })
            })
        })
    })


    // to post add member at member page
    router.post('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
        const { projectid } = req.params
        const { inputmember, inputposition } = req.body
        let sql = `INSERT INTO members(userid, role, projectid) VALUES(${inputmember}, '${inputposition}', ${projectid})`
        db.query(sql, (err) => {
            if (err) res.status(500).json(err);
            res.redirect(`/projects/members/${projectid}`)
        })
    })

    // landing to edit page at member page
    router.get('/members/:projectid/edit/:memberid', helpers.isLoggedIn, (req, res) => {
        const { projectid, memberid } = req.params
        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
        db.query(sqlProject, (err, dataProject) => {
            if (err) res.status(500).json(err)
            let sqlMember = `SELECT projects.projectid, users.userid , users.firstname, users.lastname, members.role, members.id FROM members
            LEFT JOIN projects ON members.projectid = projects.projectid 
            LEFT JOIN users ON members.userid = users.userid 
            WHERE projects.projectid=${projectid} AND id=${memberid}`;
            db.query(sqlMember, (err, dataMember) => {
                if (err) res.status(500).json(err)
                res.render('projects/members/edit', {
                    users: req.session.users,
                    title: 'Dasrboard Edit Members',
                    url: 'projects',
                    url2: 'members',
                    result: dataProject.rows[0],
                    result2: dataMember.rows[0]
                })
            })
        })
    })

    // to post edit member page
    router.post('/members/:projectid/edit/:memberid', helpers.isLoggedIn, (req, res) => {
        const { projectid, memberid } = req.params
        const { inputposition } = req.body
        let sql = `UPDATE members SET role='${inputposition}' WHERE id=${memberid}`;
        db.query(sql, (err) => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/members/${projectid}`)
        })
    })



    // to post delete member page
    router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, (req, res) => {
        const { projectid, memberid } = req.params
        let sql = `DELETE FROM members WHERE projectid=${projectid} AND id=${memberid}`;
        db.query(sql, (err) => {
            if (err) res.status(500).json(err)
            res.redirect(`/projects/members/${projectid}`)
        })
    })


    return router;

}    