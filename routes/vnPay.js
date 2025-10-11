const { Router } = require("express");
const qs = require("querystring");
const crypto = require("crypto");
const moment = require("moment");
const Order = require('../model/model_order');
const Product = require('../model/model_product');
const SaleProduct = require('../model/model_sale_product');

const router = Router();

function sortObject(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

// ✅ Tạo link thanh toán VNPAY từ orderCode
// http://localhost:3002/vnpay/create_payment?orderCode=1234567899&amount=100000
router.get("/create_payment", async (req, res) => {
  const { orderCode, amount } = req.query;
  const tmnCode = "6P2DR0XB"; // Lấy từ VNPay .env
  const secretKey = "GET28K94GCVBQOGQO95ANEG9FF6PR4YL"; // Lấy từ VNPay

  const returnUrl = `${process.env.API_URL_CONFIG}:${process.env.PORT}/vnpay/payment-result`; // Trang kết quả
  const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

  let ipAddr = req.ip;
  let orderId = orderCode || moment().format("YYYYMMDDHHmmss");
  let bankCode = req.query.bankCode || "NCB";

  let createDate = moment().format("YYYYMMDDHHmmss");
  let orderInfo = `Thanh_toan_don_hang_${orderCode}`;
  let locale = req.query.language || "vn";
  let currCode = "VND";

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: currCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "billpayment",
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode !== "") {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  let signData = qs.stringify(vnp_Params);
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(new Buffer.from(signData, "utf-8")).digest("hex");
  vnp_Params["vnp_SecureHash"] = signed;

  let paymentUrl = vnp_Url + "?" + qs.stringify(vnp_Params);
  res.json({ paymentUrl });
});

// ✅ Tạo đơn hàng và link thanh toán VNPay (tích hợp với order controller)
router.post("/create_order_and_payment", async (req, res) => {
  try {
    const {
      userId,
      items,
      shippingFee = 0,
      voucher,
      paymentMethod,
      shippingAddress,
      order_code
    } = req.body;

    if (!userId || !items || !paymentMethod || !shippingAddress) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    console.log("🔄 Bắt đầu tạo đơn hàng với order_code:", order_code);

    // ✅ Tạo đơn hàng trước
    const orderController = require('../controller/controller_order');
    const orderReq = { body: req.body };
    let orderData = null;
    let orderCreated = false;

    const orderRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 201) {
            orderData = data.data;
            orderCreated = true;
            console.log("✅ Đơn hàng đã được tạo thành công:", orderData.order_code);
          } else {
            console.error("❌ Lỗi tạo đơn hàng:", data);
            res.status(code).json(data);
          }
        }
      })
    };

    await orderController.createOrder(orderReq, orderRes);

    // ✅ Kiểm tra xem đơn hàng có được tạo thành công không
    if (!orderCreated || !orderData) {
      return res.status(500).json({ 
        success: false,
        message: "Không thể tạo đơn hàng" 
      });
    }

    // ✅ Đảm bảo đơn hàng đã được lưu vào DB trước khi tạo link thanh toán
    const savedOrder = await Order.findOne({ order_code: orderData.order_code });
    if (!savedOrder) {
      console.error("❌ Đơn hàng chưa được lưu vào DB:", orderData.order_code);
      return res.status(500).json({ 
        success: false,
        message: "Đơn hàng chưa được lưu vào database" 
      });
    }

    console.log("✅ Đơn hàng đã được lưu vào DB:", savedOrder.order_code);
    
    // ✅ Tạo link thanh toán
    const finalTotal = orderData.finalTotal;
    const tmnCode = "6P2DR0XB";
    const secretKey = "GET28K94GCVBQOGQO95ANEG9FF6PR4YL";
    const returnUrl = `${process.env.API_URL_CONFIG}:${process.env.PORT}/vnpay/payment-result`;
    const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    let ipAddr = req.ip;
    let orderId = order_code || orderData.order_code;
    let bankCode = req.body.bankCode || "NCB";

    let createDate = moment().format("YYYYMMDDHHmmss");
    let orderInfo = `Thanh_toan_don_hang_${orderId}`;
    let locale = req.body.language || "vn";
    let currCode = "VND";

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "billpayment",
      vnp_Amount: finalTotal * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode !== "") {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    let signData = qs.stringify(vnp_Params);
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(new Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    let paymentUrl = vnp_Url + "?" + qs.stringify(vnp_Params);
    
    console.log("✅ Tạo link thanh toán thành công cho đơn hàng:", orderId);
    
    res.json({ 
      success: true,
      message: "Tạo đơn hàng và link thanh toán thành công",
      order: orderData,
      paymentUrl: paymentUrl
    });

  } catch (error) {
    console.error("❌ create_order_and_payment error:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi khi tạo đơn hàng và link thanh toán", 
      error: error.message 
    });
  }
});

// ✅ Nhận kết quả từ VNPAY (redirect)
// http://localhost:3002/vnpay/payment-result
router.get("/payment-result", async (req, res) => {
  const query = req.query;
  
  // ✅ Kiểm tra nếu không có dữ liệu callback (fallback từ deeplink)
  if (!query.vnp_ResponseCode || Object.keys(query).length === 0) {
    console.log("⚠️ Không có dữ liệu callback, có thể là fallback từ deeplink");
    // Trả về JSON thay vì redirect để FE có thể xử lý
    return res.json({
      success: false,
      status: "no_data",
      message: "Không có thông tin thanh toán",
      data: null
    });
  }

  const secretKey = "GET28K94GCVBQOGQO95ANEG9FF6PR4YL";
  const vnp_SecureHash = query.vnp_SecureHash;

  delete query.vnp_SecureHash;
  const signData = qs.stringify(query);

  const hmac = crypto.createHmac("sha512", secretKey);
  const checkSum = hmac.update(signData).digest("hex");
  console.log("VNPay callback data:", query);

  if (vnp_SecureHash === checkSum) {
     const orderCode = query.vnp_OrderInfo.replace("Thanh_toan_don_hang_", "");
     console.log("🔍 Tìm kiếm đơn hàng với order_code:", orderCode);
     
     // ✅ Kiểm tra đơn hàng có tồn tại không trước khi cập nhật
     const existingOrder = await Order.findOne({ order_code: orderCode });
     if (!existingOrder) {
       console.error("❌ Không tìm thấy đơn hàng với order_code:", orderCode);
       console.log("📋 Danh sách đơn hàng trong DB:");
       const allOrders = await Order.find({}, { order_code: 1, createdAt: 1 }).limit(10);
       console.log(allOrders);
       
       return res.redirect(`f7shop://payment-result?status=failed&message=OrderNotFound&orderId=${orderCode}`);
     }
     
     console.log("✅ Tìm thấy đơn hàng:", existingOrder.order_code, "Status:", existingOrder.status);
     
     if (query.vnp_ResponseCode === "00") {
       try {
         // ✅ Cập nhật đơn hàng từ order_code
         const updatedOrder = await Order.findOneAndUpdate(
           { order_code: orderCode }, 
           { 
             status: 'confirmed', 
             updated_at: new Date(),
             paymentStatus: 'completed',
             paymentMethod: 'vnpay',
             paymentDetails: {
               transactionId: query.vnp_TransactionNo,
               bankCode: query.vnp_BankCode,
               paymentTime: query.vnp_PayDate,
               amount: query.vnp_Amount / 100
             }
           },
           { new: true }
         );

         console.log("✅ Cập nhật đơn hàng thành công:", orderCode);

         // ✅ CẬP NHẬT TỒN KHO NGAY KHI THANH TOÁN THÀNH CÔNG
         console.log(`🔄 Cập nhật tồn kho cho đơn hàng VNPay: ${orderCode}`);
         
         // Import helper function từ controller_order
         const orderController = require('../controller/controller_order');
         
         for (const item of updatedOrder.items) {
           // Sử dụng helper function để cập nhật tồn kho
           const success = await orderController.updateProductStock(item, 'decrease', 'VNPay');
           if (!success) {
             console.error(`❌ Không thể cập nhật tồn kho cho sản phẩm ID: ${item.id_product}`);
           }
         }

         // ✅ Gửi socket notification nếu có
         try {
           const io = req.app.get('io');
           if (io) {
             io.to(updatedOrder.userId.toString()).emit('orderStatusUpdated', {
               orderId: updatedOrder._id,
               status: 'confirmed',
               message: 'Thanh toán thành công'
             });
           }
         } catch (socketError) {
           console.log("Socket notification error:", socketError.message);
         }

         // ✅ Lưu kết quả thanh toán vào session/cache để FE có thể truy cập
         const amount = query.vnp_Amount / 100;
         const paymentResult = {
           status: 'success',
           orderId: orderCode,
           amount: amount,
           transactionId: query.vnp_TransactionNo,
           timestamp: new Date().toISOString()
         };
         
         // Lưu vào global cache (có thể thay bằng Redis trong production)
         if (!global.paymentResults) global.paymentResults = {};
         global.paymentResults[orderCode] = paymentResult;

         const deeplink = `f7shop://payment-result?status=success&orderId=${orderCode}&amount=${amount}&transactionId=${query.vnp_TransactionNo}`;
         
         // Redirect về deeplink với thông tin thành công
         return res.send(`
          <html><body style="font-family:sans-serif;text-align:center;margin-top:50px">
            <h1 style="color:#16a34a; font-size: 36px;">✅ Thanh toán thành công!</h1>
            <p style="font-size: 24px;">Đơn hàng #${orderCode} - Số tiền: ${amount.toLocaleString()} VND</p>
            <p"
               style="display:inline-block;margin-top:20px;padding:12px 24px;background:#0f766e;color:white;border-radius:8px;text-decoration:none;font-weight:bold">
              Vui lòng quay lại ứng dụng
            </p>
            </body></html>
        `);
        //  return res.redirect(`f7shop://payment-result?status=success&orderId=${orderCode}&amount=${amount}&transactionId=${query.vnp_TransactionNo}`);
       } catch (updateError) {
         console.error("❌ Lỗi cập nhật đơn hàng:", updateError);
         return res.redirect(`f7shop://payment-result?status=failed&message=UpdateError&orderId=${orderCode}`);
       }
     } else {
       // ✅ Cập nhật trạng thái thất bại
       try {
         await Order.findOneAndUpdate(
           { order_code: orderCode }, 
           { 
             status: 'Thanh toán thất bại', 
             updated_at: new Date(),
             paymentStatus: 'failed',
             paymentDetails: {
               errorCode: query.vnp_ResponseCode,
               errorMessage: query.vnp_Message || 'Thanh toán thất bại'
             }
           }
         );
       } catch (updateError) {
         console.error("❌ Lỗi cập nhật trạng thái thất bại:", updateError);
       }

       // ✅ Lưu kết quả thất bại vào cache
       const paymentResult = {
         status: 'failed',
         orderId: orderCode,
         errorCode: query.vnp_ResponseCode,
         errorMessage: query.vnp_Message || 'Thanh toán thất bại',
         timestamp: new Date().toISOString()
       };
       
       if (!global.paymentResults) global.paymentResults = {};
       global.paymentResults[orderCode] = paymentResult;
       
       // ✅ Redirect về deeplink với thông tin thất bại
       return res.redirect(`f7shop://payment-result?status=failed&orderId=${orderCode}&errorCode=${query.vnp_ResponseCode}&errorMessage=${query.vnp_Message || 'Thanh toán thất bại'}`);
     }
   } else {
     // ✅ Redirect về deeplink khi hash không hợp lệ
     return res.redirect(`f7shop://payment-result?status=failed&message=InvalidHash`);
   }
});

// ✅ Kiểm tra kết quả thanh toán (API endpoint)
router.get("/check_payment", (req, res) => {
  const query = req.query;
  const secretKey = "GET28K94GCVBQOGQO95ANEG9FF6PR4YL";
  const vnp_SecureHash = query.vnp_SecureHash;

  delete query.vnp_SecureHash;
  const signData = qs.stringify(query);

  const hmac = crypto.createHmac("sha512", secretKey);
  const checkSum = hmac.update(signData).digest("hex");
  console.log(query);

  if (vnp_SecureHash === checkSum) {
    if (query.vnp_ResponseCode === "00") {
      res.json({ message: "Thanh toán thành công", data: query });
    } else {
      res.json({ message: "Thanh toán thất bại", data: query });
    }
  } else {
    res.status(400).json({ message: "Dữ liệu không hợp lệ" });
  }
});

// ✅ API kiểm tra trạng thái đơn hàng (cho FE sử dụng)
router.get("/check_order_status", async (req, res) => {
  try {
    const { order_code } = req.query;
    
    if (!order_code) {
      return res.status(400).json({
        success: false,
        message: "Thiếu order_code"
      });
    }

    const order = await Order.findOne({ order_code });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
        order_code: order_code
      });
    }

    res.json({
      success: true,
      order: {
        order_code: order.order_code,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        finalTotal: order.finalTotal,
        createdAt: order.createdAt,
        updated_at: order.updated_at,
        paymentDetails: order.paymentDetails
      }
    });

  } catch (error) {
    console.error("❌ check_order_status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra trạng thái đơn hàng",
      error: error.message
    });
  }
});

// ✅ API lấy kết quả thanh toán từ cache (cho FE sử dụng khi không có params)
router.get("/get_payment_result", async (req, res) => {
  try {
    const { order_code } = req.query;
    
    if (!order_code) {
      return res.status(400).json({
        success: false,
        message: "Thiếu order_code"
      });
    }

    // Kiểm tra trong cache trước
    if (global.paymentResults && global.paymentResults[order_code]) {
      const cachedResult = global.paymentResults[order_code];
      console.log("✅ Tìm thấy kết quả trong cache:", cachedResult);
      
      // Xóa khỏi cache sau khi trả về (để tránh memory leak)
      delete global.paymentResults[order_code];
      
      return res.json({
        success: true,
        data: cachedResult,
        source: "cache"
      });
    }

    // Nếu không có trong cache, kiểm tra database
    const order = await Order.findOne({ order_code });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
        order_code: order_code
      });
    }

    // Tạo kết quả từ database
    const result = {
      status: order.status === 'Đã thanh toán' ? 'success' : 'failed',
      orderId: order.order_code,
      amount: order.finalTotal,
      transactionId: order.paymentDetails?.transactionId,
      timestamp: order.updated_at?.toISOString()
    };

    if (order.status !== 'Đã thanh toán') {
      result.errorCode = order.paymentDetails?.errorCode;
      result.errorMessage = order.paymentDetails?.errorMessage;
    }

    res.json({
      success: true,
      data: result,
      source: "database"
    });

  } catch (error) {
    console.error("❌ get_payment_result error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy kết quả thanh toán",
      error: error.message
    });
  }
});

// ✅ Kiểm tra đơn hàng trong database (debug endpoint)
router.get("/debug/orders", async (req, res) => {
  try {
    const { order_code } = req.query;
    
    if (order_code) {
      // Tìm đơn hàng cụ thể
      const order = await Order.findOne({ order_code });
      if (order) {
        res.json({ 
          success: true, 
          order: {
            order_code: order.order_code,
            status: order.status,
            createdAt: order.createdAt,
            finalTotal: order.finalTotal
          }
        });
      } else {
        res.json({ 
          success: false, 
          message: `Không tìm thấy đơn hàng với order_code: ${order_code}` 
        });
      }
    } else {
      // Lấy danh sách 10 đơn hàng gần nhất
      const orders = await Order.find({}, { 
        order_code: 1, 
        status: 1, 
        createdAt: 1, 
        finalTotal: 1 
      })
      .sort({ createdAt: -1 })
      .limit(10);
      
      res.json({ 
        success: true, 
        orders: orders,
        total: orders.length
      });
    }
  } catch (error) {
    console.error("❌ Debug orders error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi kiểm tra đơn hàng", 
      error: error.message 
    });
  }
});

module.exports = router;