const mongoose = require('mongoose');

const userVoucherSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'voucher',
        required: true
    },
    used: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Date,
        default: null
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        required: true,
        enum: ['system', 'admin', 'promotion', 'referral', 'global_usage']
    },
    note: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Add indexes for faster queries
userVoucherSchema.index({ userId: 1 });
userVoucherSchema.index({ voucherId: 1 });
userVoucherSchema.index({ userId: 1, used: 1 });
// Remove unique constraint for global vouchers - users can use them multiple times
userVoucherSchema.index({ userId: 1, voucherId: 1 });

// Create model using the db connection
const UserVoucher = mongoose.model('user_voucher', userVoucherSchema);

module.exports = UserVoucher;
