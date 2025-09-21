const User = require('../model/model_user');
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

// Logout
exports.logout = (req, res) => {
    // Chỉ trả về thông báo, client sẽ tự xóa token
    res.json({ message: 'Đăng xuất thành công' });
};