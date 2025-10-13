// app.js

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var http = require('http');
require('./model/db'); // Kết nối MongoDB

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');
const momoRoutes = require('./routes/momo');
const vnpayRoutes = require('./routes/vnPay');
const paymentsRoutes = require('./routes/payments');
const zaloPayRoutes = require('./routes/zaloPay');

var app = express();

// 🔌 Tạo HTTP Server
const server = http.createServer(app);

// 🔌 Khởi tạo Socket.IO
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['*'],
    credentials: true,
  },
  transports: ['websocket', 'polling']
});
app.set('io', io);

// 🧠 Nạp socket handlers (nếu không dùng notification thì bỏ dòng đó)
const initializeChatSocket = require('./socketHandlers/chatHandlers');
const initializeNotificationSocket = require('./socketHandlers/notificationHandlers');
const initializeOrderSocket = require('./socketHandlers/orderStatus'); // ✅ Đúng file socket
initializeOrderSocket(io);
initializeChatSocket(io);
initializeNotificationSocket(io);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

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
app.use('/users', usersRouter);
app.use('/api', apiRouter);
app.use('/api/momo', momoRoutes);
app.use('/vnpay', vnpayRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/zalo', zaloPayRoutes);

// 404 handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// 🔄 Export cả app và server để dùng ở bin/www
module.exports = { app, server };
