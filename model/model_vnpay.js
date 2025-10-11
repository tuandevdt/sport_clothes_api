const mongoose = require('mongoose');

const vnpaySchema = new mongoose.Schema({
    // Thông tin giao dịch
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    orderInfo: {
        type: String,
        required: true
    },
    
    // Thông tin VNPAY
    vnpTxnRef: {
        type: String,
        required: true
    },
    vnpTransactionNo: {
        type: String,
        default: null
    },
    vnpResponseCode: {
        type: String,
        default: null
    },
    vnpMessage: {
        type: String,
        default: null
    },
    
    // Trạng thái giao dịch
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'cancelled'],
        default: 'pending'
    },
    
    // Thông tin thanh toán
    bankCode: {
        type: String,
        default: null
    },
    paymentMethod: {
        type: String,
        default: 'VNPAY'
    },
    
    // Thông tin người dùng (nếu có)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    
    // Thông tin callback
    returnUrl: {
        type: String,
        required: true
    },
    ipnUrl: {
        type: String,
        default: null
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    paidAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index để tìm kiếm nhanh
vnpaySchema.index({ vnpTxnRef: 1 });
vnpaySchema.index({ status: 1 });
vnpaySchema.index({ userId: 1 });
vnpaySchema.index({ createdAt: -1 });

// Virtual field để tính tổng tiền
vnpaySchema.virtual('amountVND').get(function() {
    return this.amount / 100; // VNPAY lưu số tiền * 100
});

// Method để cập nhật trạng thái
vnpaySchema.methods.updateStatus = function(status, responseCode = null, message = null) {
    this.status = status;
    if (responseCode) this.vnpResponseCode = responseCode;
    if (message) this.vnpMessage = message;
    if (status === 'success') this.paidAt = new Date();
    this.updatedAt = new Date();
    return this.save();
};

// Static method để tìm giao dịch theo orderId
vnpaySchema.statics.findByOrderId = function(orderId) {
    return this.findOne({ orderId: orderId });
};

// Static method để tìm giao dịch theo vnpTxnRef
vnpaySchema.statics.findByTxnRef = function(txnRef) {
    return this.findOne({ vnpTxnRef: txnRef });
};

// Static method để lấy giao dịch thành công
vnpaySchema.statics.findSuccessful = function() {
    return this.find({ status: 'success' });
};

// Static method để lấy thống kê
vnpaySchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
};

module.exports = mongoose.model('VNPayTransaction', vnpaySchema); 