const express = require('express');
const router = express.Router();

// Test route để kiểm tra request
router.get('/test', (req, res) => {
    res.json({ 
        message: 'MoMo route is working',
        timestamp: new Date().toISOString()
    });
});

// Route để tạo payment với dữ liệu động từ request body
//link: http://localhost:3001/api/momo/create-payment
router.post('/create-payment', async (req, res) => {
    try {
        console.log('=== MOMO CREATE PAYMENT REQUEST ===');
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
        console.log('Request body type:', typeof req.body);
        console.log('Request body keys:', Object.keys(req.body || {}));
        
        const { amount, orderInfo, orderId } = req.body;
        
        console.log('Extracted fields:', { amount, orderInfo, orderId });
        
        // Validate required fields
        if (!amount || !orderInfo || !orderId) {
            console.log('❌ Missing fields:', { 
                amount: amount || 'MISSING', 
                orderInfo: orderInfo || 'MISSING', 
                orderId: orderId || 'MISSING' 
            });
            return res.status(400).json({
                success: false,
                message: 'amount, orderInfo, and orderId are required',
                received: { amount, orderInfo, orderId }
            });
        }

        // MoMo parameters
        var accessKey = 'F8BBA842ECF85';
        var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
        var partnerCode = 'MOMO';
        var redirectUrl = 'http://localhost:3001/api/momo/callback';
        var ipnUrl = 'http://localhost:3001/api/momo/ipn';
        var requestType = "payWithMethod";
        var requestId = orderId;
        var extraData = '';
        var orderGroupId = '';
        var autoCapture = true;
        var lang = 'vi';

        // Create raw signature
        var rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
        
        console.log("--------------------RAW SIGNATURE----------------");
        console.log(rawSignature);
        
        // Create signature
        const crypto = require('crypto');
        var signature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');
            
        console.log("--------------------SIGNATURE----------------");
        console.log(signature);

        // Request body for MoMo
        const requestBody = JSON.stringify({
            partnerCode: partnerCode,
            partnerName: "Test",
            storeId: "MomoTestStore",
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            lang: lang,
            requestType: requestType,
            autoCapture: autoCapture,
            extraData: extraData,
            orderGroupId: orderGroupId,
            signature: signature
        });

        // Create HTTPS request
        const https = require('https');
        const options = {
            hostname: 'test-payment.momo.vn',
            port: 443,
            path: '/v2/gateway/api/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        // Send request to MoMo
        const req2 = https.request(options, res2 => {
            console.log(`Status: ${res2.statusCode}`);
            console.log(`Headers: ${JSON.stringify(res2.headers)}`);
            res2.setEncoding('utf8');
            
            let responseData = '';
            
            res2.on('data', (body) => {
                responseData += body;
                console.log('Body: ', body);
            });
            
            res2.on('end', () => {
                console.log('No more data in response.');
                try {
                    const momoResponse = JSON.parse(responseData);
                    console.log('resultCode: ', momoResponse.resultCode);
                    
                    // Send response back to client
                    res.json({
                        success: true,
                        data: momoResponse
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        message: 'Error parsing MoMo response',
                        error: error.message
                    });
                }
            });
        });

        req2.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
            res.status(500).json({
                success: false,
                message: 'Error connecting to MoMo',
                error: e.message
            });
        });

        console.log("Sending request to MoMo...");
        req2.write(requestBody);
        req2.end();

    } catch (error) {
        console.error('Error in create-payment:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Route test payment với dữ liệu động từ cart
//link: http://localhost:3001/api/momo/
router.post('/', async (req, res) => {
    try {
        const { cartId, userId, amount } = req.body;
        
        console.log('=== MOMO PAYMENT FROM CART ===');
        console.log('Request body:', req.body);
        
        // Validate required fields
        if (!cartId || !userId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'cartId, userId, and amount are required'
            });
        }

        //https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
        //parameters
        var accessKey = 'F8BBA842ECF85';
        var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
        var orderInfo = '684c439168cca0f5f81c74ca';       //Thanh toán giỏ hàng ${cartId}
        var partnerCode = 'MOMO';
        var redirectUrl = 'http://localhost:3001/api/momo/callback';
        var ipnUrl = 'http://localhost:3001/api/momo/ipn';
        var requestType = "payWithMethod";
        var orderId = `CART-${cartId}-${Date.now()}`;
        var requestId = orderId;
        var extraData = '';
        var orderGroupId = '';
        var autoCapture = true;
        var lang = 'vi';

        //before sign HMAC SHA256 with format
        //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
        var rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
        //puts raw signature
        console.log("--------------------RAW SIGNATURE----------------")
        console.log(rawSignature)
        //signature
        const crypto = require('crypto');
        var signature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');
        console.log("--------------------SIGNATURE----------------")
        console.log(signature)

        //json object send to MoMo endpoint
        const requestBody = JSON.stringify({
            partnerCode: partnerCode,
            partnerName: "Test",
            storeId: "MomoTestStore",
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            lang: lang,
            requestType: requestType,
            autoCapture: autoCapture,
            extraData: extraData,
            orderGroupId: orderGroupId,
            signature: signature
        });
        //Create the HTTPS objects
        const https = require('https');
        const options = {
            hostname: 'test-payment.momo.vn',
            port: 443,
            path: '/v2/gateway/api/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        }
        //Send the request and get the response
        const req2 = https.request(options, res2 => {
            console.log(`Status: ${res2.statusCode}`);
            console.log(`Headers: ${JSON.stringify(res2.headers)}`);
            res2.setEncoding('utf8');
            res.on('data', (body) => {
                const res = JSON.parse(body);
                res.status(200).json({
                    success: true,
                    message: 'Thanh toán thành công!',
                    data: res
                });
            });
            res2.on('end', () => {
                console.log('No more data in response.');
            });
        })

        req2.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
            res.status(500).json({ error: e.message });
        });
        // write data to request body
        console.log("Sending....")
        req2.write(requestBody);
        req2.end();
        
    } catch (error) {
        console.error('Error in momo payment:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Callback URL - User được redirect về sau khi thanh toán
router.get('/callback', (req, res) => {
    console.log('=== MOMO CALLBACK ===');
    console.log('Query params:', req.query);
    
    const { resultCode, message, orderId, amount, transId } = req.query;
    
    if (resultCode === '0') {
        // Thanh toán thành công
        res.json({
            success: true,
            message: 'Thanh toán thành công!',
            data: {
                resultCode,
                message,
                orderId,
                amount,
                transId
            }
        });
    } else {
        // Thanh toán thất bại
        res.json({
            success: false,
            message: 'Thanh toán thất bại!',
            data: {
                resultCode,
                message,
                orderId,
                amount
            }
        });
    }
});

// IPN URL - MoMo gửi thông báo kết quả thanh toán
router.post('/ipn', (req, res) => {
    console.log('=== MOMO IPN ===');
    console.log('IPN Body:', req.body);
    
    const { resultCode, message, orderId, amount, transId, responseTime } = req.body;
    
    // Xử lý cập nhật trạng thái đơn hàng trong database
    if (resultCode === 0) {
        console.log('✅ Payment successful for order:', orderId);
        // TODO: Cập nhật trạng thái đơn hàng thành "paid"
        // TODO: Gửi thông báo cho user
    } else {
        console.log('❌ Payment failed for order:', orderId);
        // TODO: Cập nhật trạng thái đơn hàng thành "payment_failed"
    }
    
    // Trả về success cho MoMo
    res.json({
        resultCode: 0,
        message: 'Success'
    });
});

module.exports = router;