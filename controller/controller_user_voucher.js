const UserVoucher = require('../model/model_user_voucher');
const Voucher = require('../model/model_voucher');
const User = require('../model/model_user');

// Assign voucher to user
const assignVoucherToUser = async (req, res) => {
    try {
        const { userId, voucherId, source, note } = req.body;

        // Validate required fields
        if (!userId || !voucherId || !source) {
            return res.status(400).json({
                success: false,
                message: 'userId, voucherId, and source are required'
            });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if voucher exists and is active
        const voucher = await Voucher.findById(voucherId);
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        if (voucher.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Voucher is not active'
            });
        }

        // Check if voucher is still valid
        const currentDate = new Date();
        if (currentDate < voucher.startDate || currentDate > voucher.expireDate) {
            return res.status(400).json({
                success: false,
                message: 'Voucher is not valid at this time'
            });
        }

        // Check if user already has this voucher (only for non-global vouchers)
        if (!voucher.isGlobal) {
            const existingUserVoucher = await UserVoucher.findOne({
                userId: userId,
                voucherId: voucherId,
                used: false
            });

            if (existingUserVoucher) {
                return res.status(400).json({
                    success: false,
                    message: 'User already has this voucher'
                });
            }
        }

        // Check if user has reached the usage limit for this voucher
        const userVoucherCount = await UserVoucher.countDocuments({
            userId: userId,
            voucherId: voucherId,
            used: true
        });

        if (userVoucherCount >= voucher.usageLimitPerUser) {
            return res.status(400).json({
                success: false,
                message: 'User has reached the usage limit for this voucher'
            });
        }

        // Create user voucher
        const userVoucher = new UserVoucher({
            userId: userId,
            voucherId: voucherId,
            source: source,
            note: note || ''
        });

        await userVoucher.save();

        // Populate voucher details
        await userVoucher.populate('voucherId');

        res.status(201).json({
            success: true,
            data: userVoucher
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user vouchers
const getUserVouchers = async (req, res) => {
    try {
        const { userId } = req.params;
        const { used, active } = req.query;

        let query = { userId: userId };

        // Filter by used status
        if (used !== undefined) {
            query.used = used === 'true';
        }

        // Filter by active vouchers only
        if (active === 'true') {
            const currentDate = new Date();
            const userVouchers = await UserVoucher.find(query)
                .populate({
                    path: 'voucherId',
                    match: {
                        status: 'active',
                        startDate: { $lte: currentDate },
                        expireDate: { $gte: currentDate }
                    }
                });

            // Filter out vouchers where voucherId is null (inactive vouchers)
            const activeVouchers = userVouchers.filter(uv => uv.voucherId !== null);

            return res.json({
                success: true,
                data: activeVouchers
            });
        }

        const userVouchers = await UserVoucher.find(query)
            .populate('voucherId')
            .sort({ assignedAt: -1 });

        res.json({
            success: true,
            data: userVouchers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Mark voucher as used
const markVoucherAsUsed = async (req, res) => {
    try {
        const { userVoucherId } = req.params;

        const userVoucher = await UserVoucher.findById(userVoucherId)
            .populate('voucherId');

        if (!userVoucher) {
            return res.status(404).json({
                success: false,
                message: 'User voucher not found'
            });
        }

        if (userVoucher.used) {
            return res.status(400).json({
                success: false,
                message: 'Voucher is already used'
            });
        }

        // Check if voucher is still valid
        const currentDate = new Date();
        if (currentDate < userVoucher.voucherId.startDate || currentDate > userVoucher.voucherId.expireDate) {
            return res.status(400).json({
                success: false,
                message: 'Voucher is expired or not yet active'
            });
        }

        // Update user voucher
        userVoucher.used = true;
        userVoucher.usedAt = currentDate;
        await userVoucher.save();

        // Update voucher usage count
        await Voucher.findByIdAndUpdate(
            userVoucher.voucherId._id,
            { $inc: { usedCount: 1 } }
        );

        res.json({
            success: true,
            data: userVoucher
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Validate user voucher
const validateUserVoucher = async (req, res) => {
    try {
        const { userVoucherId, orderValue } = req.body;

        if (!userVoucherId || !orderValue) {
            return res.status(400).json({
                success: false,
                message: 'userVoucherId and orderValue are required'
            });
        }

        const userVoucher = await UserVoucher.findById(userVoucherId)
            .populate('voucherId');

        if (!userVoucher) {
            return res.status(404).json({
                success: false,
                message: 'User voucher not found'
            });
        }

        if (userVoucher.used) {
            return res.status(400).json({
                success: false,
                message: 'Voucher is already used'
            });
        }

        const voucher = userVoucher.voucherId;

        // Check if voucher is still valid
        const currentDate = new Date();
        const isValidDate = currentDate >= voucher.startDate && currentDate <= voucher.expireDate;
        const isValidOrderValue = orderValue >= voucher.minOrderAmount;
        const isValidStatus = voucher.status === 'active';

        const isValid = isValidDate && isValidOrderValue && isValidStatus;

        if (!isValid) {
            return res.json({
                success: false,
                message: 'Voucher is not valid',
                details: {
                    isValidDate,
                    isValidOrderValue,
                    isValidStatus
                }
            });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (voucher.type === 'percentage') {
            discountAmount = orderValue * voucher.discount;
            if (discountAmount > voucher.maxDiscount) {
                discountAmount = voucher.maxDiscount;
            }
        } else if (voucher.type === 'fixed') {
            discountAmount = voucher.discount;
        } else if (voucher.type === 'shipping') {
            discountAmount = orderValue * voucher.discount;
            if (discountAmount > voucher.maxDiscount) {
                discountAmount = voucher.maxDiscount;
            }
        }

        res.json({
            success: true,
            message: 'Voucher is valid',
            data: {
                userVoucher,
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

// Get available vouchers for user
const getAvailableVouchersForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { orderValue } = req.query;

        const currentDate = new Date();

        // Get user's unused vouchers
        const userVouchers = await UserVoucher.find({
            userId: userId,
            used: false
        }).populate({
            path: 'voucherId',
            match: {
                status: 'active',
                startDate: { $lte: currentDate },
                expireDate: { $gte: currentDate }
            }
        });

        // Filter valid vouchers
        const validVouchers = userVouchers.filter(uv => uv.voucherId !== null);

        // If orderValue is provided, filter by minimum order amount
        let availableVouchers = validVouchers;
        if (orderValue) {
            availableVouchers = validVouchers.filter(uv => 
                uv.voucherId.minOrderAmount <= Number(orderValue)
            );
        }

        res.json({
            success: true,
            data: availableVouchers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Remove user voucher
const removeUserVoucher = async (req, res) => {
    try {
        const { userVoucherId } = req.params;

        const userVoucher = await UserVoucher.findById(userVoucherId);

        if (!userVoucher) {
            return res.status(404).json({
                success: false,
                message: 'User voucher not found'
            });
        }

        if (userVoucher.used) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove used voucher'
            });
        }

        await UserVoucher.findByIdAndDelete(userVoucherId);

        res.json({
            success: true,
            message: 'User voucher removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    assignVoucherToUser,
    getUserVouchers,
    markVoucherAsUsed,
    validateUserVoucher,
    getAvailableVouchersForUser,
    removeUserVoucher
};
