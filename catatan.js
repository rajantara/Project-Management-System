//get page project/ Issuess
router.get('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const user = req.session.user;
    const { cissues, csubject, ctracker, issues, subject, tracker } = req.query
    let sql = `SELECT COUNT(*) AS total FROM issues WHERE projectid=${projectid}`;
    // start filter logic
    let result = []

    if (cissues && issues) {
        result.push(`issues.issueid = ${issues}`)
    }
    if (csubject && subject) {
        result.push(`issues.subject ILIKE '%${subject}%'`)
    }
    if (ctracker && tracker) {
        result.push(`issues.tracker = '${tracker}'`)
    }
    if (result.length > 0) {
        sql += ` AND ${result.join(' AND ')}`
    }

    // end filter logic
    db.query(sql, (err, totalData) => {
        if (err) res.status(500).json(err)

        // start pagenation members logic
        const link = (req.url == `/issues/${projectid}`) ? `/issues/${projectid}/?page=1` : req.url;
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        const total = totalData.rows[0].total
        const pages = Math.ceil(total / limit);
        let getIssues = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) fullname, issues.issueid, issues.projectid, issues.tracker, issues.subject, 
        issues.description, issues.status, issues.priority, issues.assignee, issues.startdate, issues.duedate, issues.estimatedate, issues.done, issues.files, 
        issues.spentime, issues.targetversion, issues.author, CONCAT(u2.firstname, ' ', u2.lastname) author, issues.createdate, issues.updatedate, issues.closedate, issues.parentask, i2.subject issuename 
        FROM issues LEFT JOIN users ON issues.assignee=users.userid 
        LEFT JOIN users u2 ON issues.author=u2.userid 
        LEFT JOIN issues i2 ON issues.parentask = i2.issueid WHERE issues.projectid = ${projectid}`

        if (result.length > 0) {
            getIssues += ` AND ${result.join(' AND ')}`
        }

        getIssues += ` ORDER BY issueid ASC`
        getIssues += ` LIMIT ${limit} OFFSET ${offset}`
        // end pagenation members logic
        db.query(getIssues, (err, dataIssues) => {
            if (err) res.status(500).json(err)
            let result2 = dataIssues.rows.map(item => {
                item.startdate = moment(item.startdate).format('LL')
                item.duedate = moment(item.duedate).format('LL')
                item.createdate = moment(item.createdate).format('LL')
                return item;
            });
            let getProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
            db.query(getProject, (err, data) => {
                if (err) res.status(500).json(err)
                let issues = `SELECT * FROM issues WHERE projectid = ${projectid} ORDER BY issueid ASC`;
                db.query(issues, (err, issuesData) => {
                    if (err) res.status(500).json(err)
                    let result3 = issuesData.rows[0]
                    let sqlOption = `SELECT optionissues FROM users WHERE userid=${user.userid}`;
                    db.query(sqlOption, (err, optionissue) => {
                        if (err) res.status(500).json(err);
                        let option = optionissue.rows[0].optionissues;

                        res.render('projects/issues/listIssues', {
                            user,
                            title: 'Darsboard Issues',
                            url: 'projects',
                            url2: 'issues',
                            result: data.rows[0],
                            result2,
                            moment,
                            link,
                            pages,
                            page,
                            memberMessage: req.flash('memberMessage'),
                            result3,
                            option
                        })
                    })
                })
            })
        })
    })
})

// for option column issues page
router.post('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params
    const user = req.session.user

    let sqlOption = `UPDATE users SET optionissues='${JSON.stringify(req.body)}' WHERE userid=${user.userid}`
    db.query(sqlOption, err => {
        if (err) res.status(500).json(err)
        res.redirect(`/projects/issues/${projectid}`)
    })
})

//get page project/ Issuess / add
router.get('/issues/:projectid/add', helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    let getProject = `SELECT * FROM projects WHERE projectid=${projectid}`;
    let getUser = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) as nama , projects.projectid FROM members 
    LEFT JOIN users ON members.userid = users.userid
    LEFT JOIN projects ON members.projectid = projects.projectid WHERE members.projectid = ${projectid}`;
    db.query(getUser, (err, dataUser) => {
        if (err) res.status(500).json(err)
        db.query(getProject, (err, getData) => {
            if (err) res.status(500).json(err)
            res.render('projects/issues/add', {
                user: req.session.user,
                title: 'Darsboard Issues Add',
                title2: 'New Issues',
                url: 'projects',
                url2: 'issues',
                result: getData.rows[0],
                result2: dataUser.rows
            })
        })
    })
})

// posting data to issues
router.post('/issues/:projectid/add', (req, res) => {
    const { projectid } = req.params;
    const user = req.session.user;
    const { tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file } = req.body;
    const addIssues = `INSERT INTO issues (projectid, userid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedate, done, files, author, createdate) 
                        VALUES($1,${user.userid},$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,${user.userid},NOW())`;
    const issuesData = [projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file]
    if (req.files) {
        let file = req.files.file;
        let fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-');
        file.mv(path.join(__dirname, "..", 'public', "images", fileName), function (err) {
            if (err) res.status(500).json(err);
            issuesData[11] = `/images/${fileName}`;
            db.query(addIssues, issuesData, (err) => {
                if (err) res.status(500).json(err);
                res.redirect(`/projects/issues/${projectid}`);
            })
        })
    } else {
        db.query(addIssues, issuesData, (err) => {
            if (err) res.status(500).json(err);
            res.redirect(`/projects/issues/${projectid}`);
        })
    }
});

//landing to page project/ Issuess / edit
router.get('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, (req, res) => {
    const { projectid, issueid } = req.params;
    let getProject = `SELECT i1.*, projects.name, i1.subject issuename FROM issues i1 
        LEFT JOIN projects ON i1.projectid = projects.projectid
        LEFT JOIN issues ON i1.parentask = i1.issueid
        WHERE i1.issueid = ${issueid}
        AND projects.projectid = ${projectid}`;
    db.query(getProject, (err, getData) => {
        if (err) res.status(500).json(err)
        let getUser = `SELECT userid, email, CONCAT(firstname, ' ', lastname) AS nama FROM users WHERE userid IN (SELECT userid FROM members WHERE projectid = ${projectid})`;
        db.query(getUser, (err, dataUser) => {
            if (err) res.status(500).json(err)
            const subquery = `SELECT issues.issueid FROM issues WHERE projectid=${projectid} AND issueid=${issueid}`;
            let getIssues = `SELECT issues.issueid, subject FROM issues WHERE issueid NOT IN (${subquery})`
            db.query(getIssues, (err, dataIssues) => {
                if (err) res.status(500).json(err)
                res.render('projects/issues/edit', {
                    user: req.session.user,
                    title: 'Darsboard Issues Edit',
                    title2: 'Edit Issues',
                    url: 'projects',
                    url2: 'issues',
                    result: getData.rows[0],
                    result2: dataUser.rows,
                    result3: dataIssues.rows,
                    moment
                })
            })
        })
    })
})

router.post('/issues/:projectid/edit/:issueid', (req, res) => {
    const { projectid, issueid } = req.params;
    const user = req.session.user.userid;
    const { tracker, subject, description, status, priority, assignee, duedate, done, file, spentime, targetversion, parentask } = req.body;
    let updateIssues = `UPDATE issues SET tracker= $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, duedate = $7, done = $8, files = $9, spentime = $10, targetversion = $11, parentask = $12, author = $13, updatedate = NOW(), closedate = NOW() WHERE issueid = $14`;
    let issuesData = [tracker, subject, description, status, priority, assignee, duedate, done, file, spentime, targetversion, parentask, user, issueid]
    if (req.files) {
        let file = req.files.file;
        let fileName = file.name.toLowerCase().replace("", Date.now()).split(' ').join('-');
        file.mv(path.join(__dirname, "..", 'public', "images", fileName), (err) => {
            if (err) res.status(500).json(err);
            issuesData[8] = `/images/${fileName}`;
            db.query(updateIssues, issuesData, (err) => {
                if (err) res.status(500).json(err)
                const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${description}] - Done: ${done}%', $3)`
                const activityData = [projectid, subject, user];
                db.query(addActivity, activityData, (err) => {
                    if (err) res.status(500).json(err);
                    res.redirect(`/projects/issues/${projectid}`)
                })
            })
        })
    } else {
        db.query(updateIssues, issuesData, (err) => {
            if (err) res.status(500).json(err)
            const addActivity = `INSERT INTO activity (projectid, time, title, description, author) VALUES ($1, NOW(), $2,'[${status}] [${tracker}] [${description}] - Done: ${done}%', $3)`
            const activityData = [projectid, subject, user];
            db.query(addActivity, activityData, (err) => {
                if (err) res.status(500).json(err)
                res.redirect(`/projects/issues/${projectid}`)
            })
        })
    }
})

router.get('/issues/:projectid/delete/:issueid', (req, res) => {
    const { projectid, issueid } = req.params
    let deleteIssues = `DELETE FROM issues WHERE issueid = ${issueid}`;
    db.query(deleteIssues, (err) => {
        if (err) res.status(500).json(err)
        res.redirect(`/projects/issues/${projectid}`)
    })
})
