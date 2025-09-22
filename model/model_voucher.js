const db = require('./db');
const mongoose = require('mongoose');

const voucherSchema = new db.mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    label: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true,
        min: 0
    },
    maxDiscount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        required: true,
        enum: ['fixed', 'shipping', 'percentage']
    },
    minOrderAmount: {
        type: Number,
        required: true,
        min: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    expireDate: {
        type: Date,
        required: true
    },
    usageLimitPerUser: {
        type: Number,
        required: true,
        min: 1
    },
    totalUsageLimit: {
        type: Number,
        required: true,
        min: 0
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    createdBy: {
        type: String,
        required: true
    },
    isGlobal: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Add index for faster queries
// Note: code field already has unique: true which creates an index automatically
voucherSchema.index({ status: 1 });
voucherSchema.index({ startDate: 1, expireDate: 1 });
voucherSchema.index({ isGlobal: 1 });

// Create model using the db connection
const Voucher = db.model('voucher', voucherSchema);

module.exports = Voucher;