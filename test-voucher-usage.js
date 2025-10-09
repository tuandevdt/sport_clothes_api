const Voucher = require('./model/model_voucher');
const UserVoucher = require('./model/model_user_voucher');
const mongoose = require('mongoose');

// Test voucher usage logic
async function testVoucherUsage() {
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/your_database');
        
        // Find a voucher
        const voucher = await Voucher.findOne({ code: 'FREESHIP' });
        if (!voucher) {
            console.log('Voucher not found');
            return;
        }
        
        console.log('Voucher found:', {
            code: voucher.code,
            usedCount: voucher.usedCount,
            totalUsageLimit: voucher.totalUsageLimit,
            usageLimitPerUser: voucher.usageLimitPerUser,
            isGlobal: voucher.isGlobal
        });
        
        // Check user voucher usage
        const userId = '507f1f77bcf86cd799439011'; // Replace with actual user ID
        const userVoucherCount = await UserVoucher.countDocuments({
            userId: userId,
            voucherId: voucher._id,
            used: true
        });
        
        console.log('User voucher usage count:', userVoucherCount);
        
        // Check if user can use voucher
        const canUse = userVoucherCount < voucher.usageLimitPerUser;
        console.log('Can user use voucher:', canUse);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testVoucherUsage();
