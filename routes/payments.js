const express = require('express');
const router = express.Router();
const paymentsController = require('../controller/payments.controller');
const auth = require('../middleware/auth');

// Route tạo thanh toán
// link: http://localhost:3002/api/payments/create
router.post('/create', paymentsController.paymentCod);

// Route callback VNPAY
// link: http://localhost:3002/api/payments/check-payment-vnpay
router.get('/check-payment-vnpay', paymentsController.checkPaymentVnpay);

// Route lấy thông tin thanh toán
// link: http://localhost:3002/api/payments/get
router.get('/get', auth, paymentsController.getPayment);

// Route lấy thống kê thanh toán
// link: http://localhost:3002/api/payments/stats
router.get('/stats', auth, paymentsController.getPaymentStats);

module.exports = router; 