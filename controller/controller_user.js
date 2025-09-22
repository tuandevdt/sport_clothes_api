const User = require('../model/model_user');
const UserVoucher = require('../model/model_user_voucher');
const Voucher = require('../model/model_voucher');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Đăng ký tài khoản mới
exports.register = async (req, res) => {
    try {
        const { name, email, password, avatar, phone, address, sex } = req.body;

        // Kiểm tra email đã tồn tại chưa
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email đã tồn tại' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user mới
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'user',
            avatar: avatar || 'https://i.pinimg.com/736x/bc/43/98/bc439871417621836a0eeea768d60944.jpg',
            phone: phone || '',
            address: address || 'Chưa cập nhật',
            sex: sex || 'Nam'
        });

        await user.save();
        res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
        }

        // Tìm user theo email
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('No user found with email:', email);
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        // Kiểm tra mật khẩu
        console.log('Comparing passwords...');
        console.log('Stored password hash:', user.password);
        console.log('Attempting to compare with:', password);
        
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            console.log('Password match:', isMatch);
            
            if (!isMatch) {
                console.log('Password does not match for user:', email);
                return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            }

            // Tạo JWT token
            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            console.log('Login successful for user:', email);
            
            // Tự động tặng voucher cho user mới đăng nhập
            try {
                await assignWelcomeVoucher(user._id);
            } catch (voucherError) {
                console.log('Error assigning welcome voucher:', voucherError.message);
            }
            
            res.json({
                message: 'Đăng nhập thành công',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    phone: user.phone,
                    role: user.role,
                    address: user.address,
                    sex: user.sex
                }
            });
        } catch (compareError) {
            console.error('Password comparison error:', compareError);
            res.status(500).json({ message: 'Lỗi xác thực mật khẩu', error: compareError.message });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy thông tin user
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật thông tin user
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, avatar, phone, address, sex } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        // Kiểm tra email mới có bị trùng không
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }
        }

        // Validate email format
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Email không hợp lệ' });
        }

        // Validate phone format (optional)
        if (phone && !/^[0-9]{10,11}$/.test(phone)) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
        }

        // Cập nhật thông tin
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (avatar) updateData.avatar = avatar;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (sex) updateData.sex = sex;

        // Cập nhật user với dữ liệu mới
        Object.assign(user, updateData);
        await user.save();

        // Trả về thông tin user đã cập nhật (không bao gồm password)
        const updatedUser = await User.findById(user._id).select('-password');
        
        res.json({ 
            message: 'Cập nhật thông tin thành công', 
            user: updatedUser,
            updatedFields: Object.keys(updateData)
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật từng trường thông tin riêng lẻ
exports.updateField = async (req, res) => {
    try {
        const { field, value } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        // Danh sách các trường được phép cập nhật
        const allowedFields = ['name', 'email', 'avatar', 'phone', 'address', 'sex'];
        
        if (!allowedFields.includes(field)) {
            return res.status(400).json({ 
                message: 'Trường không hợp lệ', 
                allowedFields 
            });
        }

        // Validation cho từng trường
        if (field === 'email') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return res.status(400).json({ message: 'Email không hợp lệ' });
            }
            
            // Kiểm tra email đã tồn tại chưa
            const existingUser = await User.findOne({ email: value });
            if (existingUser && existingUser._id.toString() !== user._id.toString()) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }
        }

        if (field === 'phone' && value && !/^[0-9]{10,11}$/.test(value)) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
        }

        if (field === 'sex' && !['Nam', 'Nữ', 'Khác'].includes(value)) {
            return res.status(400).json({ message: 'Giới tính không hợp lệ' });
        }

        // Cập nhật trường
        user[field] = value;
        await user.save();

        // Trả về thông tin user đã cập nhật
        const updatedUser = await User.findById(user._id).select('-password');
        
        res.json({ 
            message: `Cập nhật ${field} thành công`, 
            user: updatedUser,
            updatedField: field,
            newValue: value
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy thông tin user theo ID (cho admin)
exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật thông tin user theo ID (cho admin)
exports.updateUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, avatar, phone, address, sex, role } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        // Kiểm tra email mới có bị trùng không
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }
        }

        // Validate email format
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Email không hợp lệ' });
        }

        // Validate phone format
        if (phone && !/^[0-9]{10,11}$/.test(phone)) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
        }

        // Validate role
        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Role không hợp lệ' });
        }

        // Cập nhật thông tin
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (avatar) updateData.avatar = avatar;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (sex) updateData.sex = sex;
        if (role) updateData.role = role;

        Object.assign(user, updateData);
        await user.save();

        const updatedUser = await User.findById(userId).select('-password');
        
        res.json({ 
            message: 'Cập nhật thông tin user thành công', 
            user: updatedUser,
            updatedFields: Object.keys(updateData)
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Đổi mật khẩu
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        // Kiểm tra mật khẩu hiện tại
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
        }

        // Mã hóa và cập nhật mật khẩu mới
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách user
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Reset password (for development only)
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        console.log('Reset password attempt for:', email);
        
        if (!email || !newPassword) {
            console.log('Missing email or password');
            return res.status(400).json({ message: 'Email và mật khẩu mới là bắt buộc' });
        }

        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('No user found with email:', email);
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        try {
            // Hash new password
            console.log('Hashing new password...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            console.log('Password hashed successfully');
            
            user.password = hashedPassword;
            await user.save();
            console.log('Password updated successfully for user:', email);
            
            res.json({ 
                message: 'Đặt lại mật khẩu thành công',
                hashedPassword: hashedPassword // For debugging only
            });
        } catch (hashError) {
            console.error('Error hashing password:', hashError);
            res.status(500).json({ message: 'Lỗi khi mã hóa mật khẩu', error: hashError.message });
        }
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa user
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Kiểm tra user có tồn tại không
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        // Xóa user
        await User.findByIdAndDelete(userId);
        res.json({ message: 'Xóa user thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Logout
exports.logout = (req, res) => {
    // Chỉ trả về thông báo, client sẽ tự xóa token
    res.json({ message: 'Đăng xuất thành công' });
};

// Function tự động tặng voucher chào mừng khi đăng nhập
const assignWelcomeVoucher = async (userId) => {
    try {
        // Tìm voucher FREESHIP
        const voucher = await Voucher.findOne({ code: 'FREESHIP' });
        
        if (!voucher) {
            console.log('FREESHIP voucher not found');
            return;
        }

        // Kiểm tra voucher có active và còn hiệu lực không
        const currentDate = new Date();
        if (voucher.status !== 'active' || 
            currentDate < voucher.startDate || 
            currentDate > voucher.expireDate) {
            console.log('FREESHIP voucher is not valid');
            return;
        }

        // Kiểm tra user đã có voucher này chưa
        const existingUserVoucher = await UserVoucher.findOne({
            userId: userId,
            voucherId: voucher._id
        });

        if (existingUserVoucher) {
            console.log('User already has FREESHIP voucher');
            return;
        }

        // Kiểm tra user có đạt giới hạn sử dụng chưa
        const userVoucherCount = await UserVoucher.countDocuments({
            userId: userId,
            voucherId: voucher._id,
            used: true
        });

        if (userVoucherCount >= voucher.usageLimitPerUser) {
            console.log('User has reached usage limit for FREESHIP voucher');
            return;
        }

        // Tạo user voucher mới
        const userVoucher = new UserVoucher({
            userId: userId,
            voucherId: voucher._id,
            source: 'system',
            note: 'Tặng khi đăng nhập lần đầu'
        });

        await userVoucher.save();
        console.log('Welcome voucher assigned successfully to user:', userId);
        
    } catch (error) {
        console.error('Error assigning welcome voucher:', error);
    }
};

// Admin tặng voucher cho user
exports.giftVoucherToUser = async (req, res) => {
    try {
        const { userId, voucherCode, source, note } = req.body;

        // Validate required fields
        if (!userId || !voucherCode || !source) {
            return res.status(400).json({
                success: false,
                message: 'userId, voucherCode, and source are required'
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

        // Find voucher by code
        const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        // Check if voucher is active and valid
        const currentDate = new Date();
        if (voucher.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Voucher is not active'
            });
        }

        if (currentDate < voucher.startDate || currentDate > voucher.expireDate) {
            return res.status(400).json({
                success: false,
                message: 'Voucher is not valid at this time'
            });
        }

        // Check if user already has this voucher
        const existingUserVoucher = await UserVoucher.findOne({
            userId: userId,
            voucherId: voucher._id
        });

        if (existingUserVoucher) {
            return res.status(400).json({
                success: false,
                message: 'User already has this voucher'
            });
        }

        // Check if user has reached the usage limit
        const userVoucherCount = await UserVoucher.countDocuments({
            userId: userId,
            voucherId: voucher._id
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
            voucherId: voucher._id,
            source: source,
            note: note || ''
        });

        await userVoucher.save();
        await userVoucher.populate('voucherId');

        res.status(201).json({
            success: true,
            message: 'Voucher gifted successfully',
            data: userVoucher
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Admin tặng voucher cho nhiều user
exports.giftVoucherToMultipleUsers = async (req, res) => {
    try {
        const { userIds, voucherCode, source, note } = req.body;

        // Validate required fields
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !voucherCode || !source) {
            return res.status(400).json({
                success: false,
                message: 'userIds (array), voucherCode, and source are required'
            });
        }

        // Find voucher by code
        const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }

        // Check if voucher is active and valid
        const currentDate = new Date();
        if (voucher.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Voucher is not active'
            });
        }

        if (currentDate < voucher.startDate || currentDate > voucher.expireDate) {
            return res.status(400).json({
                success: false,
                message: 'Voucher is not valid at this time'
            });
        }

        const results = {
            success: [],
            failed: []
        };

        // Process each user
        for (const userId of userIds) {
            try {
                // Check if user exists
                const user = await User.findById(userId);
                if (!user) {
                    results.failed.push({
                        userId,
                        reason: 'User not found'
                    });
                    continue;
                }

                // Check if user already has this voucher
                const existingUserVoucher = await UserVoucher.findOne({
                    userId: userId,
                    voucherId: voucher._id
                });

                if (existingUserVoucher) {
                    results.failed.push({
                        userId,
                        reason: 'User already has this voucher'
                    });
                    continue;
                }

                // Check if user has reached the usage limit
                const userVoucherCount = await UserVoucher.countDocuments({
                    userId: userId,
                    voucherId: voucher._id
                });

                if (userVoucherCount >= voucher.usageLimitPerUser) {
                    results.failed.push({
                        userId,
                        reason: 'User has reached the usage limit'
                    });
                    continue;
                }

                // Create user voucher
                const userVoucher = new UserVoucher({
                    userId: userId,
                    voucherId: voucher._id,
                    source: source,
                    note: note || ''
                });

                await userVoucher.save();
                results.success.push({
                    userId,
                    userVoucherId: userVoucher._id
                });

            } catch (error) {
                results.failed.push({
                    userId,
                    reason: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Processed ${userIds.length} users`,
            data: results
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
