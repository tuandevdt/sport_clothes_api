const Voucher = require('../model/model_voucher');
const UserVoucher = require('../model/model_user_voucher');

// Get all vouchers
const getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find();
        res.json({
            success: true,
            data: vouchers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get voucher by code
const getVoucherByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const voucher = await Voucher.findOne({ code: code.toUpperCase() });
        
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        res.json({
            success: true,
            data: voucher
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new voucher
const createVoucher = async (req, res) => {
    try {
        const {
            code,
            label,
            description,
            discount,
            maxDiscount,
            type,
            minOrderAmount,
            startDate,
            expireDate,
            usageLimitPerUser,
            totalUsageLimit,
            createdBy,
            isGlobal
        } = req.body;

        // Convert string values to appropriate types
        const voucherData = {
            code: code ? code.toUpperCase() : null,
            label,
            description,
            discount: Number(discount),
            maxDiscount: Number(maxDiscount),
            type,
            minOrderAmount: Number(minOrderAmount),
            startDate: new Date(startDate),
            expireDate: new Date(expireDate),
            usageLimitPerUser: Number(usageLimitPerUser),
            totalUsageLimit: Number(totalUsageLimit),
            createdBy,
            isGlobal: Boolean(isGlobal),
            usedCount: 0,
            status: 'active'
        };

        // Validate required fields
        if (!voucherData.code || !voucherData.label || !voucherData.description || 
            !voucherData.discount || !voucherData.maxDiscount || !voucherData.type || 
            !voucherData.minOrderAmount || !voucherData.startDate || !voucherData.expireDate || 
            !voucherData.usageLimitPerUser || !voucherData.totalUsageLimit || !voucherData.createdBy) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if voucher code already exists
        const existingVoucher = await Voucher.findOne({ code: voucherData.code });
        if (existingVoucher) {
            return res.status(400).json({
                success: false,
                message: 'Voucher code already exists'
            });
        }

        const voucher = new Voucher(voucherData);
        await voucher.save();

        res.status(201).json({
            success: true,
            data: voucher
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update voucher
const updateVoucher = async (req, res) => {
    try {
        const { code } = req.params;
        const updateData = req.body;

        // Don't allow updating code
        delete updateData.code;

        const voucher = await Voucher.findOneAndUpdate(
            { code: code.toUpperCase() },
            updateData,
            { new: true, runValidators: true }
        );

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        res.json({
            success: true,
            data: voucher
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete voucher
const deleteVoucher = async (req, res) => {
    try {
        const { code } = req.params;
        const voucher = await Voucher.findOneAndDelete({ code: code.toUpperCase() });

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        res.json({
            success: true,
            message: 'Voucher deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Validate voucher
const validateVoucher = async (req, res) => {
    try {
        const { code, order_value, userId } = req.body;

        if (!code || !order_value) {
            return res.status(400).json({
                success: false,
                message: 'Voucher code and order value are required'
            });
        }

        const voucher = await Voucher.findOne({ code: code.toUpperCase() });

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        const currentDate = new Date();
        const isValidDate = currentDate >= voucher.startDate && currentDate <= voucher.expireDate;
        const isValidUsage = voucher.usedCount < voucher.totalUsageLimit;
        const isValidOrderValue = order_value >= voucher.minOrderAmount;
        const isValidStatus = voucher.status === 'active';

        const isValid = isValidDate && isValidUsage && isValidOrderValue && isValidStatus;

        if (!isValid) {
            return res.json({
                success: false,
                message: 'Voucher is not valid',
                details: {
                    isValidDate,
                    isValidUsage,
                    isValidOrderValue,
                    isValidStatus
                }
            });
        }

        // Check if user has permission to use this voucher
        if (userId) {
            if (!voucher.isGlobal) {
                // For non-global vouchers, check if user has this voucher assigned
                const userVoucher = await UserVoucher.findOne({
                    userId: userId,
                    voucherId: voucher._id,
                    used: false
                });

                if (!userVoucher) {
                    return res.json({
                        success: false,
                        message: 'You do not have permission to use this voucher'
                    });
                }
            } else {
                // For global vouchers, check if user has reached the usage limit
                const userVoucherCount = await UserVoucher.countDocuments({
                    userId: userId,
                    voucherId: voucher._id,
                    used: true
                });

                if (userVoucherCount >= voucher.usageLimitPerUser) {
                    return res.json({
                        success: false,
                        message: 'You have reached the usage limit for this voucher'
                    });
                }
            }
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (voucher.type === 'percentage') {
            discountAmount = order_value * voucher.discount;
            if (discountAmount > voucher.maxDiscount) {
                discountAmount = voucher.maxDiscount;
            }
        } else if (voucher.type === 'fixed') {
            discountAmount = voucher.discount;
        } else if (voucher.type === 'shipping') {
            discountAmount = order_value * voucher.discount;
            if (discountAmount > voucher.maxDiscount) {
                discountAmount = voucher.maxDiscount;
            }
        }

        // Increment usedCount for the voucher
        await Voucher.findByIdAndUpdate(
            voucher._id,
            { $inc: { usedCount: 1 } }
        );

        // Mark voucher as used for the user
        if (userId) {
            if (!voucher.isGlobal) {
                // For non-global vouchers, mark the specific user voucher as used
                await UserVoucher.findOneAndUpdate(
                    { userId: userId, voucherId: voucher._id, used: false },
                    { used: true, usedAt: currentDate }
                );
            } else {
                // For global vouchers, create a new user voucher record to track usage
                const userVoucher = new UserVoucher({
                    userId: userId,
                    voucherId: voucher._id,
                    used: true,
                    usedAt: currentDate,
                    source: 'global_usage',
                    note: 'Used from global voucher'
                });
                await userVoucher.save();
            }
        }

        res.json({
            success: true,
            message: 'Voucher is valid',
            data: {
                voucher,
                discount_amount: discountAmount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get active vouchers
const getActiveVouchers = async (req, res) => {
    try {
        const currentDate = new Date();
        const vouchers = await Voucher.find({
            status: 'active',
            startDate: { $lte: currentDate },
            expireDate: { $gte: currentDate },
            $expr: { $lt: ["$usedCount", "$totalUsageLimit"] }
        });

        res.json({
            success: true,
            data: vouchers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get global vouchers
const getGlobalVouchers = async (req, res) => {
    try {
        const currentDate = new Date();
        const vouchers = await Voucher.find({
            isGlobal: true,
            status: 'active',
            startDate: { $lte: currentDate },
            expireDate: { $gte: currentDate },
            $expr: { $lt: ["$usedCount", "$totalUsageLimit"] }
        });

        res.json({
            success: true,
            data: vouchers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllVouchers,
    getVoucherByCode,
    createVoucher,
    updateVoucher,
    deleteVoucher,
    validateVoucher,
    getActiveVouchers,
    getGlobalVouchers
};
