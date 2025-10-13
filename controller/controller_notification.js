const modelNotification = require('../model/model_notification');
const modelUser = require('../model/model_user'); // Change from model_users to model_user

module.exports = {
    // Add notification
    add: async (req, res) => {
        try {
            const { userId, title, message, type, data } = req.body;

            // Validate required fields
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: "userId is required",
                    error: "Missing userId"
                });
            }

            const notification = new modelNotification({
                userId, // Use userId from request
                title,
                message,
                type: type || 'order',
                isRead: false,
                data: data || {}
            });

            const result = await notification.save();

            if (!result) {
                throw new Error('Không thể lưu thông báo');
            }

            res.json({
                status: 200,
                message: "Thêm thông báo thành công",
                data: result
            });
        } catch (error) {
            console.error("Error creating notification:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi thêm thông báo",
                error: error.message
            });
        }
    },

    // Get notifications by userId
    getByUserId: async (req, res) => {
        try {
            const notifications = await modelNotification
                .find({ userId: req.params.userId })
                .sort({ createdAt: -1 });
            res.json({
                status: 200,
                message: "Lấy thông báo thành công",
                data: notifications
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi lấy thông báo",
                error: error.message
            });
        }
    },

    // Mark notification as read
    markAsRead: async (req, res) => {
        try {
            const notification = await modelNotification.findByIdAndUpdate(
                req.params.id,
                { isRead: true },
                { new: true }
            );
            res.json({
                status: 200,
                message: "Đánh dấu đã đọc thành công",
                data: notification
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi đánh dấu đã đọc",
                error: error.message
            });
        }
    },
    getUnreadCount: async (req, res) => {
        try {
            const { userId } = req.params;
            const count = await modelNotification.countDocuments({ userId, isRead: false });

            res.json({
                status: 200,
                message: "Lấy số lượng thông báo chưa đọc thành công",
                data: count,
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi lấy số lượng thông báo chưa đọc",
                error: error.message,
            });
        }
    }
};