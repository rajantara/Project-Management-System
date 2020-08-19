var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var flash = require('connect-flash');
var session = require('express-session')
const { Pool } = require('pg')



//conect to database
// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'pmsr',
//   password: '12345',
//   port: 5432,
// })

const pool = new Pool({
  user: 'ppzuptozolqjvyc',
  host: 'ec2-35-175-155-248.compute-1.amazonaws.com',
  database: 'd63k53oo43iaup',
  password: 'fd5837ddf1ae8b90c435df7ba750b0946cae7a4ce8bc253a07b08edfb4e6e82b',
  port: 5432,
})
console.log('sukses database')

 
//router page
var indexRouter = require('./routes/index')(pool);
var profileRouter = require('./routes/profile')(pool);
var projectRouter = require('./routes/project')(pool);
var usersRouter = require('./routes/users')(pool);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'login')));
app.use(session({
  secret: 'pasarmalam'
}))
app.use(flash());


//app use
app.use('/', indexRouter);
app.use('/profile', profileRouter);
app.use('/users', usersRouter);
app.use('/projects', projectRouter);



// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
