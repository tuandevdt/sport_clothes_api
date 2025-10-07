const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  id_product: {
    type: Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  purchaseQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // ✅ Hỗ trợ ảnh cho sản phẩm trong order
  images: {
    type: [String],
    default: []
  },
  // ✅ Thêm thông tin size và color nếu cần
  size: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: null
  },
  isReviewed: { 
    type: Boolean, 
    default: false 
  }
}, { _id: false });

const voucherSchema = new Schema({
  voucherId: {
    type: Schema.Types.ObjectId,
    ref: 'voucher',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const orderSchema = new Schema({
  order_code: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: [orderItemSchema],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  voucher: {
    type: voucherSchema,
    default: null
  },
  finalTotal: {
    type: Number,
    required: true,
    min: 0
  },
  // ✅ SỬA: Thêm payment methods cho VNPay
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cod', 'online', 'vnpay', 'momo', 'zalopay']
  },
  shippingAddress: {
    type: String,
    required: true
  },
  // ✅ SỬA: Thêm status cho thanh toán VNPay
  status: {
    type: String,
    enum: ['waiting', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'paid', 'payment_failed'],
    default: 'waiting'
  },
  // ✅ SỬA: Thêm payment status cho VNPay
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  // ✅ SỬA: Cải thiện paymentDetails structure
  paymentDetails: {
    transactionId: String,
    bankCode: String,
    paymentTime: String,
    amount: Number,
    errorCode: String,
    errorMessage: String
  },
  returnDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

orderSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// ✅ THÊM: Virtual field để tính tổng số lượng sản phẩm
orderSchema.virtual('totalItems').get(function() {
  if (!this.items || !Array.isArray(this.items)) {
    return 0;
  }
  return this.items.reduce((total, item) => total + (item.purchaseQuantity || 0), 0);
});

// Tự tạo mã đơn hàng nếu chưa có
orderSchema.pre('save', function (next) {
  if (!this.order_code) {
    const date = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.order_code = `ORD-${ymd}-${random}`;
  }
  next();
});

// ✅ THÊM: Method để cập nhật trạng thái thanh toán
orderSchema.methods.updatePaymentStatus = function(status, details = {}) {
  this.paymentStatus = status;
  this.updatedAt = new Date();
  
  if (details) {
    this.paymentDetails = { ...this.paymentDetails, ...details };
  }
  
  if (status === 'completed') {
    this.status = 'waiting';
  } else if (status === 'failed') {
    this.status = 'payment_failed';
  }
  
  return this.save();
};

// ✅ THÊM: Static method để tìm đơn hàng theo order_code
orderSchema.statics.findByOrderCode = function(orderCode) {
  return this.findOne({ order_code: orderCode });
};

const Order = mongoose.model('order', orderSchema);
module.exports = Order;