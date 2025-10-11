const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    total: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: false
    },
    typePayments: {
        type: String,
        enum: ['COD', 'VNPAY', 'MOMO'],
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    // Thông tin VNPAY (nếu có)
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
    }
}, {
    timestamps: true
});

// Index để tìm kiếm nhanh
paymentSchema.index({ userId: 1 });
paymentSchema.index({ typePayments: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual để tính tổng tiền
paymentSchema.virtual('totalAmount').get(function() {
    return this.products.reduce((total, product) => {
        return total + (product.price * product.quantity);
    }, 0);
});

// Method để cập nhật trạng thái
paymentSchema.methods.updateStatus = function(status, vnpData = null) {
    this.status = status;
    if (vnpData) {
        this.vnpTransactionNo = vnpData.vnpTransactionNo;
        this.vnpResponseCode = vnpData.vnpResponseCode;
        this.vnpMessage = vnpData.vnpMessage;
    }
    this.paymentDate = new Date();
    return this.save();
};

// Static method để tìm thanh toán theo user
paymentSchema.statics.findByUserId = function(userId) {
    return this.find({ userId: userId }).populate('products.productId');
};

// Static method để tìm thanh toán thành công
paymentSchema.statics.findSuccessful = function() {
    return this.find({ status: true });
};

// Static method để lấy thống kê
paymentSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$typePayments',
                count: { $sum: 1 },
                totalAmount: { $sum: '$total' }
            }
        }
    ]);
};

module.exports = mongoose.model('Payment', paymentSchema); 