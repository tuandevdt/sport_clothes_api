const modelCart = require('../model/model_cart');
const modelPayments = require('../model/model_payments');
const modelProducts = require('../model/model_product');
const axios = require('axios');
const crypto = require('crypto');
const { VnPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay');

class controllerPayments {
    async paymentCod(req, res) {
        try {
            // Lấy userId từ body thay vì từ token (vì đã bỏ auth)
            const { userId, address, phone, typePayments, fullName } = req.body;

            // Debug: Log the request body
            console.log('Request body:', req.body);

            // Validate input
            if (!userId || !address || !phone || !typePayments) {
                console.log('Missing fields:', { userId, address, phone, typePayments });
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin (userId, address, phone, typePayments)',
                    received: { userId, address, phone, typePayments, fullName }
                });
            }

            // Tìm giỏ hàng
            console.log('Looking for cart with userId:', userId);
            const findCart = await modelCart.findOne({ user_id: userId });
            console.log('Found cart:', findCart);
            
            if (!findCart) {
                return res.status(400).json({
                    success: false,
                    message: 'Giỏ hàng khóa',
                    userId: userId
                });
            }

            // Xử lý theo loại thanh toán
            if (typePayments === 'COD') {
                // Thanh toán khi nhận hàng
                const newPayment = new modelPayments({
                    userId: findCart.user_id,
                    products: findCart.items.map(item => ({
                        productId: item.product_id,
                        quantity: item.quantity,
                        price: 0 // Cần lấy giá từ product model
                    })),
                    total: 0, // Cần tính tổng từ products
                    address: address,
                    phone: phone,
                    fullName: fullName,
                    status: true,
                    typePayments: 'COD'
                });

                await newPayment.save();
                await findCart.deleteOne();

                return res.json({
                    success: true,
                    message: 'Đặt hàng thành công',
                    data: newPayment
                });
            }

            if (typePayments === 'MOMO') {
                // Xử lý thanh toán MOMO
                // Code MOMO sẽ được thêm ở đây
                return res.status(400).json({
                    success: false,
                    message: 'Chức năng MOMO đang phát triển'
                });
            }

            if (typePayments === 'VNPAY') {
                // Cấu hình VNPAY
                const vnpay = new VnPay({
                    tmnCode: 'DH2F13SW',
                    secureSecret: 'NXZM3DWFR0LC4R5VBK850JZS1UE9KI6F',
                    vnpayHost: 'https://sandbox.vnpayment.vn',
                    testMode: true, // tùy chọn
                    hashAlgorithm: 'SHA512', // tùy chọn
                    loggerFn: ignoreLogger // tùy chọn
                });

                // Tính ngày mai
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Tạo URL thanh toán VNPAY
                const vnpayResponse = await vnpay.buildPaymentUrl({
                    vnp_Amount: 100000, // Tạm thời set giá trị cố định, cần tính từ cart
                    vnp_IpAddr: '127.0.0.1',
                    vnp_TxnRef: findCart._id,
                    vnp_OrderInfo: `Thanh toan cho ma GD:${findCart._id}`,
                    vnp_OrderType: ProductCode.Other,
                    vnp_ReturnUrl: `${process.env.API_URL_CONFIG}:${process.env.PORT}/api/check-payment-vnpay`,
                    vnp_Locale: VnpLocale.VN, // 'vn' hoặc 'en'
                    vnp_CreateDate: dateFormat(new Date(), 'yyyyMMddHHmmss'), // tùy chọn, mặc định là hiện tại
                });

                return res.json({
                    success: true,
                    message: 'Tạo URL thanh toán VNPAY thành công',
                    data: {
                        paymentUrl: vnpayResponse,
                        orderId: findCart._id,
                        amount: 100000
                    }
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Phương thức thanh toán không hợp lệ'
            });

        } catch (error) {
            console.error('Error in paymentCod:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi xử lý thanh toán',
                error: error.message
            });
        }
    }

    async checkPaymentVnpay(req, res) {
        try {
            const { vnp_ResponseCode, vnp_OrderInfo } = req.query;

            if (vnp_ResponseCode === '00') {
                const idCart = vnp_OrderInfo;
                const findCart = await modelCart.findOne({ _id: idCart });

                if (!findCart) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy giỏ hàng'
                    });
                }

                const newPayment = new modelPayments({
                    userId: findCart.user_id,
                    products: findCart.items.map(item => ({
                        productId: item.product_id,
                        quantity: item.quantity,
                        price: 0 // Cần lấy giá từ product model
                    })),
                    total: 0, // Cần tính tổng từ products
                    address: address || 'Default address',
                    phone: phone || 'Default phone',
                    fullName: fullName || 'Default name',
                    status: true,
                    typePayments: 'VNPAY',
                });

                await newPayment.save();
                await findCart.deleteOne();
                
                return res.redirect(`${process.env.DOMAIN_URL || `${process.env.API_URL_CONFIG}:${process.env.PORT}`}/checkout/${newPayment._id}`);
            } else {
                return res.json({
                    success: false,
                    message: 'Thanh toán thất bại',
                    responseCode: vnp_ResponseCode
                });
            }
        } catch (error) {
            console.error('Error in checkPaymentVnpay:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi xử lý callback VNPAY',
                error: error.message
            });
        }
    }

    async getPayment(req, res) {
        try {
            const { id } = req.decodedToken;
            const { idOrder } = req.query;

            if (!id) {
                return res.status(403).json({
                    success: false,
                    message: 'Vui lòng đăng nhập'
                });
            }

            let query = { userId: id };
            if (idOrder) {
                query._id = idOrder;
            }

            const payments = await modelPayments.find(query).populate('products.productId');

            return res.json({
                success: true,
                data: payments
            });

        } catch (error) {
            console.error('Error in getPayment:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin thanh toán',
                error: error.message
            });
        }
    }

    async getPaymentStats(req, res) {
        try {
            const { id } = req.decodedToken;

            if (!id) {
                return res.status(403).json({
                    success: false,
                    message: 'Vui lòng đăng nhập'
                });
            }

            const stats = await modelPayments.aggregate([
                { $match: { userId: id } },
                {
                    $group: {
                        _id: '$typePayments',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$total' }
                    }
                }
            ]);

            return res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error in getPaymentStats:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy thống kê thanh toán',
                error: error.message
            });
        }
    }
}

module.exports = new controllerPayments(); 