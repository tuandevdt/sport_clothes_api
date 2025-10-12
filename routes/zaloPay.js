const express = require("express");
const axios = require("axios");
const moment = require("moment");
const CryptoJS = require("crypto-js");
const ZaloPayTransaction = require("../model/model_zalopay_transaction");

const paymentZaloRouter = express.Router();

const config = {
  app_id: "2554",
  key1: "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
  key2: "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

// ✅ Tạo đơn hàng App-to-App & QR
// http://localhost:3002/zalo/create-order?amount=100000&userId=1234567890
paymentZaloRouter.post("/create-order", async (req, res) => {
  const { amount, userId } = req.body;

  const transID = Math.floor(Math.random() * 1000000);
  const items = [
    {
      itemid: "item123",
      itemname: "Zalo Item Test",
      itemprice: amount,
      itemquantity: 1
    }
  ];

  const embed_data = {
    redirecturl: "http://localhost:3002/zalo/payment-result?paymentMethod=zalopay",
    app_to_app: true, // 👈 dùng cho App-to-App
  };

  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
    app_user: userId || "Nguyễn Văn Hoàng", // 👈 thông tin người dùng
    app_time: Date.now(),
    amount,
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    description: `Thanh toán đơn hàng cho ${userId || "khách"}`,
    callback_url: "https://d769-123-16-125-218.ngrok-free.app/zalo/callback",
    bank_code: "", // nếu muốn chỉ định bank
  };

  const data =
    config.app_id +
    "|" +
    order.app_trans_id +
    "|" +
    order.app_user +
    "|" +
    order.amount +
    "|" +
    order.app_time +
    "|" +
    order.embed_data +
    "|" +
    order.item;

  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    const response = await axios.post(config.endpoint, null, {
      params: order,
    });

    const result = response.data;

    return res.status(200).json({
      zp_trans_token: result.zp_trans_token,
      order_url: result.order_url,         // dùng để redirect hoặc app-to-app
      qr_code: result.qr_code,             // dùng để tạo mã QR cho thanh toán
      deep_link: result.deep_link,         // dùng để mở ZaloPay app (App-to-App)
      order_id: order.app_trans_id,
    });
  } catch (error) {
    console.error("ZaloPay error:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Tạo đơn hàng thất bại",
    });
  }
});

// ✅ Callback từ ZaloPay
paymentZaloRouter.post("/callback", (req, res) => {
  const result = {};

  try {
    const dataStr = req.body.data;
    const reqMac = req.body.mac;

    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "MAC không khớp";
    } else {
      const dataJson = JSON.parse(dataStr);
      console.log("✅ Thanh toán thành công:", dataJson);

      // TODO: Update đơn hàng theo dataJson["app_trans_id"]
      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
  }

  return res.json(result);
});

// ✅ Route xử lý redirect từ ZaloPay
paymentZaloRouter.get("/payment-result", async (req, res) => {
  const { 
    paymentMethod, 
    amount, 
    appid, 
    apptransid, 
    bankcode, 
    checksum, 
    discountamount, 
    pmcid, 
    status 
  } = req.query;

  console.log("🔍 ZaloPay Payment Result:", req.query);

  // Kiểm tra nếu đây là redirect từ ZaloPay
  if (paymentMethod === 'zalopay' && appid && apptransid) {
    // Xác thực checksum nếu cần
    // TODO: Implement checksum verification

    if (status === '1') {
      // Thanh toán thành công
      const transactionData = {
        paymentMethod: 'ZaloPay',
        amount: amount,
        orderId: apptransid,
        bankCode: bankcode,
        status: status,
        appId: appid,
        pmcId: pmcid,
        discountAmount: discountamount,
        checksum: checksum,
        transactionTime: new Date().toLocaleString('vi-VN'),
        rawData: req.query // Lưu toàn bộ dữ liệu gốc
      };

      // Lưu thông tin giao dịch vào database
      try {
        const newTransaction = new ZaloPayTransaction({
          orderId: apptransid,
          amount: parseInt(amount),
          status: 'success',
          appId: appid,
          pmcId: pmcid,
          bankCode: bankcode,
          discountAmount: parseInt(discountamount) || 0,
          checksum: checksum,
          transactionTime: new Date().toLocaleString('vi-VN'),
          rawData: req.query
        });
        
        await newTransaction.save();
        console.log("💾 Đã lưu giao dịch:", apptransid);
      } catch (error) {
        console.error("❌ Lỗi lưu giao dịch:", error.message);
      }

      res.render('success', {
        message: 'Thanh toán ZaloPay thành công!',
        data: transactionData,
        amount: parseInt(amount),
        orderId: apptransid
      });
    } else {
      // Thanh toán thất bại
      res.render('error', {
        message: 'Thanh toán ZaloPay thất bại!',
        error: {
          paymentMethod: 'ZaloPay',
          orderId: apptransid,
          status: status,
          amount: amount
        }
      });
    }
  } else {
    // Không phải redirect từ ZaloPay hoặc thiếu thông tin
    res.render('error', {
      message: 'Thông tin thanh toán không hợp lệ!',
      error: req.query
    });
  }
});

// ✅ API lấy chi tiết giao dịch theo orderId
paymentZaloRouter.get("/transaction/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const transaction = await ZaloPayTransaction.findOne({ orderId });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('❌ Lỗi lấy giao dịch:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// ✅ API lấy danh sách giao dịch
paymentZaloRouter.get("/transactions", async (req, res) => {
  try {
    const { limit = 10, page = 1, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Tạo filter
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    // Lấy danh sách từ database
    const transactions = await ZaloPayTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-rawData'); // Không trả về rawData để giảm dung lượng
    
    const total = await ZaloPayTransaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách giao dịch:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

module.exports = paymentZaloRouter;
