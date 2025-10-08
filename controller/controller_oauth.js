const User = require('../model/model_user');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const oauthConfig = require('../config/oauth');

// Google OAuth
exports.googleAuth = async (req, res) => {
    try {
        const { accessToken } = req.body;
        
        if (!accessToken) {
            return res.status(400).json({ message: 'Access token là bắt buộc' });
        }

        // Lấy thông tin user từ Google
        const googleUserInfo = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        const { id, email, name, picture } = googleUserInfo.data;

        if (!email) {
            return res.status(400).json({ message: 'Không thể lấy email từ Google' });
        }

        // Tìm user theo email hoặc googleId
        let user = await User.findOne({
            $or: [
                { email: email },
                { googleId: id }
            ]
        });

        if (user) {
            // User đã tồn tại, cập nhật thông tin Google nếu cần
            if (!user.googleId) {
                user.googleId = id;
                user.provider = 'google';
                user.isEmailVerified = true;
                await user.save();
            }
        } else {
            // Tạo user mới
            user = new User({
                name: name,
                email: email,
                password: 'google_oauth_' + Math.random().toString(36).substr(2, 9), // Tạo password ngẫu nhiên
                googleId: id,
                provider: 'google',
                avatar: picture,
                isEmailVerified: true
            });
            await user.save();
        }

        // Tạo JWT token
        const token = jwt.sign(
            { userId: user._id },
            oauthConfig.jwt.secret,
            { expiresIn: oauthConfig.jwt.expiresIn }
        );

        res.json({
            message: 'Đăng nhập Google thành công',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                phone: user.phone,
                role: user.role,
                address: user.address,
                sex: user.sex,
                provider: user.provider
            }
        });

    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({ message: 'Lỗi đăng nhập Google', error: error.message });
    }
};

// Facebook OAuth
exports.facebookFirebaseLogin = async (req, res) => {
    try {
      const { uid, email, name } = req.body;

      console.log('📥 Nhận từ client:', req.body); 
  
      if (!uid || !email) {
        return res.status(400).json({ message: 'Thiếu uid hoặc email' });
      }
  
      // Tìm user theo uid hoặc email
      let user = await User.findOne({ $or: [{ uid }, { email }] });
  
      if (user) {
        if (!user.uid) {
          user.uid = uid;
          user.provider = 'facebook';
          await user.save();
        }
      } else {
        user = new User({
          uid,
          name,
          email,
          password: 'firebase_facebook_' + Math.random().toString(36).substring(2, 10),
          provider: 'facebook',
          isEmailVerified: true,
          avatar: 'https://i.pinimg.com/736x/bc/43/98/bc439871417621836a0eeea768d60944.jpg',
        });
  
        await user.save();
      }
  
      const token = jwt.sign(
        { userId: user._id },
        oauthConfig.jwt.secret,
        { expiresIn: oauthConfig.jwt.expiresIn }
      );
  
      res.json({
        message: 'Đăng nhập Firebase Facebook thành công',
        token,
        user: {
          id: user._id,
          uid: user.uid,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          provider: user.provider,
        },
      });
  
    } catch (error) {
      console.error('Firebase Facebook login error:', error);
      res.status(500).json({ message: 'Lỗi đăng nhập Facebook Firebase', error: error.message });
    }
  };

// Link tài khoản với Google
exports.linkGoogleAccount = async (req, res) => {
    try {
        const { accessToken } = req.body;
        const userId = req.user.userId;

        if (!accessToken) {
            return res.status(400).json({ message: 'Access token là bắt buộc' });
        }

        // Lấy thông tin user từ Google
        const googleUserInfo = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        const { id, email } = googleUserInfo.data;

        // Kiểm tra user hiện tại
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        // Kiểm tra email có khớp không
        if (email !== user.email) {
            return res.status(400).json({ message: 'Email Google không khớp với email tài khoản' });
        }

        // Kiểm tra googleId đã tồn tại chưa
        const existingGoogleUser = await User.findOne({ googleId: id });
        if (existingGoogleUser && existingGoogleUser._id.toString() !== userId) {
            return res.status(400).json({ message: 'Tài khoản Google này đã được liên kết với tài khoản khác' });
        }

        // Cập nhật googleId
        user.googleId = id;
        await user.save();

        res.json({
            message: 'Liên kết tài khoản Google thành công',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                googleId: user.googleId,
                facebookId: user.facebookId,
                provider: user.provider
            }
        });

    } catch (error) {
        console.error('Link Google account error:', error);
        res.status(500).json({ message: 'Lỗi liên kết tài khoản Google', error: error.message });
    }
};

// Link tài khoản với Facebook
exports.linkFacebookAccount = async (req, res) => {
    try {
        const { accessToken } = req.body;
        const userId = req.user.userId;

        if (!accessToken) {
            return res.status(400).json({ message: 'Access token là bắt buộc' });
        }

        // Lấy thông tin user từ Facebook
        const facebookUserInfo = await axios.get(
            `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
        );

        const { id, email } = facebookUserInfo.data;

        // Kiểm tra user hiện tại
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }

        // Kiểm tra email có khớp không
        if (email !== user.email) {
            return res.status(400).json({ message: 'Email Facebook không khớp với email tài khoản' });
        }

        // Kiểm tra facebookId đã tồn tại chưa
        const existingFacebookUser = await User.findOne({ facebookId: id });
        if (existingFacebookUser && existingFacebookUser._id.toString() !== userId) {
            return res.status(400).json({ message: 'Tài khoản Facebook này đã được liên kết với tài khoản khác' });
        }

        // Cập nhật facebookId
        user.facebookId = id;
        await user.save();

        res.json({
            message: 'Liên kết tài khoản Facebook thành công',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                googleId: user.googleId,
                facebookId: user.facebookId,
                provider: user.provider
            }
        });

    } catch (error) {
        console.error('Link Facebook account error:', error);
        res.status(500).json({ message: 'Lỗi liên kết tài khoản Facebook', error: error.message });
    }
}; 