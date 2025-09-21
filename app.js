// app.js

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var http = require('http');
require('./model/db'); // Kết nối MongoDB

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');
var app = express();

// 🔌 Tạo HTTP Server
const server = http.createServer(app);


// Middleware
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Không cache API
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Routes
app.use('/', indexRouter);
app.use('/api', apiRouter);


// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// 🔄 Export cả app và server để dùng ở bin/www
module.exports = { app, server };
