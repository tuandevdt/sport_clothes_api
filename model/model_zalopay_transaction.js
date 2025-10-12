const mongoose = require('mongoose');

const zaloPayTransactionSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  paymentMethod: {
    type: String,
    default: 'ZaloPay'
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  appId: {
    type: String,
    required: true
  },
  pmcId: {
    type: String
  },
  bankCode: {
    type: String
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  checksum: {
    type: String
  },
  transactionTime: {
    type: String
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed
  },
  userId: {
    type: String
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh
zaloPayTransactionSchema.index({ userId: 1 });
zaloPayTransactionSchema.index({ status: 1 });
zaloPayTransactionSchema.index({ createdAt: -1 });

const ZaloPayTransaction = mongoose.model('ZaloPayTransaction', zaloPayTransactionSchema);

module.exports = ZaloPayTransaction; 