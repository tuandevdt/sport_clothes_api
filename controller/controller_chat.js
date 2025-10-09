const modelChat = require('../model/model_chat');
const modelUser = require('../model/model_user');
const mongoose = require('mongoose');

module.exports = {
    // Tạo cuộc trò chuyện mới
    createChat: async (req, res) => {
        try {
            const { participants } = req.body;

            // Kiểm tra xem cuộc trò chuyện đã tồn tại chưa
            const existingChat = await modelChat.findOne({
                participants: { $all: participants }
            });

            if (existingChat) {
                return res.json({
                    status: 200,
                    message: "Cuộc trò chuyện đã tồn tại",
                    data: existingChat
                });
            }

            const newChat = new modelChat({
                participants,
                messages: []
            });

            const result = await newChat.save();
            res.json({
                status: 200,
                message: "Tạo cuộc trò chuyện thành công",
                data: result
            });
        } catch (error) {
            console.error("Error creating chat:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo cuộc trò chuyện",
                error: error.message
            });
        }
    },

    // Gửi tin nhắn
    sendMessage: async (req, res) => {
        try {
            console.log("Yêu cầu gửi tin nhắn:", req.body); // Log để debug

            const { chatId, senderId, content, message, type = 'text' } = req.body;

            // Ưu tiên content, nếu không có thì lấy message
            const messageContent = content || message;

            if (!messageContent || !senderId || !chatId) {
                return res.status(400).json({
                    status: 400,
                    message: "Thiếu dữ liệu: content/message, senderId hoặc chatId"
                });
            }

            const chat = await modelChat.findById(chatId);
            if (!chat) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy cuộc trò chuyện"
                });
            }

            const newMessage = {
                sender: senderId,
                content: messageContent,
                type,
                timestamp: new Date(),
                isRead: false
            };

            chat.messages.push(newMessage);
            chat.lastMessage = newMessage;
            chat.updatedAt = new Date();

            const result = await chat.save();

            res.json({
                status: 200,
                message: "Gửi tin nhắn thành công",
                data: result
            });
        } catch (error) {
            console.error("Lỗi khi gửi tin nhắn:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi gửi tin nhắn",
                error: error.message
            });
        }
    },


    // Lấy danh sách tin nhắn của một cuộc trò chuyện
    getMessages: async (req, res) => {
        try {
            const chatId = req.params.chatId;
            const chat = await modelChat.findById(chatId)
                .populate('participants', 'name avatar')
                .populate('messages.sender', 'name avatar');

            if (!chat) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy cuộc trò chuyện"
                });
            }

            res.json({
                status: 200,
                message: "Lấy tin nhắn thành công",
                data: chat
            });
        } catch (error) {
            console.error("Error getting messages:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy tin nhắn",
                error: error.message
            });
        }
    },

    // Lấy danh sách cuộc trò chuyện của một người dùng
    getUserChats: async (req, res) => {
        try {
            const userId = req.params.userId;
            // Kiểm tra userId có hợp lệ không
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    status: 400,
                    message: "userId không hợp lệ"
                });
            }
            const chats = await modelChat.find({
                participants: new mongoose.Types.ObjectId(userId)
            })
                .populate('participants', 'name avatar')
                .populate('lastMessage.sender', 'name avatar')
                .sort({ updatedAt: -1 });

            res.json({
                status: 200,
                message: "Lấy danh sách cuộc trò chuyện thành công",
                data: chats
            });
        } catch (error) {
            console.error("Error getting user chats:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách cuộc trò chuyện",
                error: error.message
            });
        }
    },

    // Đánh dấu tin nhắn đã đọc
    markAsRead: async (req, res) => {
        try {
            const { chatId, userId } = req.body;

            const chat = await modelChat.findById(chatId);
            if (!chat) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy cuộc trò chuyện"
                });
            }

            chat.messages.forEach(message => {
                if (message.sender.toString() !== userId) {
                    message.isRead = true;
                }
            });

            const result = await chat.save();
            res.json({
                status: 200,
                message: "Đánh dấu đã đọc thành công",
                data: result
            });
        } catch (error) {
            console.error("Error marking messages as read:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi đánh dấu đã đọc",
                error: error.message
            });
        }
    },

    // Lấy toàn bộ danh sách chat
    getAllChats: async (req, res) => {
        try {
            const chats = await modelChat.find()
                .populate('participants', 'name avatar')
                .populate('lastMessage.sender', 'name avatar')
                .sort({ updatedAt: -1 });

            res.json({
                status: 200,
                message: "Lấy toàn bộ danh sách cuộc trò chuyện thành công",
                data: chats
            });
        } catch (error) {
            console.error("Error getting all chats:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy toàn bộ danh sách cuộc trò chuyện",
                error: error.message
            });
        }
    },

    // POST /api/chats/message/reaction
    reactionToMessage: async (req, res) => {
        try {
            const { chatId, messageId, userId, emoji } = req.body;

            if (!chatId || !messageId || !userId || !emoji) {
                return res.status(400).json({ status: 400, message: 'Thiếu dữ liệu' });
            }

            const chat = await modelChat.findById(chatId);
            if (!chat) {
                return res.status(404).json({ status: 404, message: 'Không tìm thấy cuộc trò chuyện' });
            }

            const message = chat.messages.id(messageId);
            if (!message) {
                return res.status(404).json({ status: 404, message: 'Không tìm thấy tin nhắn' });
            }

            // Kiểm tra nếu user đã thả reaction trước đó
            const existing = message.reactions?.find(r => r.user.toString() === userId);
            if (existing) {
                existing.emoji = emoji; // Cập nhật
            } else {
                message.reactions = message.reactions || [];
                message.reactions.push({ user: userId, emoji });
            }

            await chat.save();

            res.json({
                status: 200,
                message: 'Cập nhật reaction thành công',
                data: message
            });
        } catch (err) {
            console.error('Lỗi khi thêm reaction:', err);
            res.status(500).json({ status: 500, message: 'Lỗi server', error: err.message });
        }
    },

    // DELETE /api/chats/message/:chatId/:messageId
    deleteMessage: async (req, res) => {
        try {
            const { chatId, messageId } = req.params;

            const chat = await modelChat.findById(chatId);
            if (!chat) {
                return res.status(404).json({ status: 404, message: 'Không tìm thấy cuộc trò chuyện' });
            }

            const message = chat.messages.id(messageId);
            if (!message) {
                return res.status(404).json({ status: 404, message: 'Không tìm thấy tin nhắn' });
            }

            message.remove(); // Xóa message khỏi subdocument
            await chat.save();

            res.json({
                status: 200,
                message: 'Xóa tin nhắn thành công'
            });
        } catch (err) {
            console.error('Lỗi khi xóa tin nhắn:', err);
            res.status(500).json({ status: 500, message: 'Lỗi server', error: err.message });
        }
    },


    // DELETE /api/chats/:chatId
    deleteChat: async (req, res) => {
        try {
            const { chatId } = req.params;

            const chat = await modelChat.findById(chatId);
            if (!chat) {
                return res.status(404).json({ status: 404, message: 'Không tìm thấy cuộc trò chuyện' });
            }

            // await modelChat.findByIdAndDelete(chatId);

            chat.messages = [];
            chat.lastMessage = null;
            await chat.save();  
            // ✅ Emit cho tất cả các client đang join đoạn chat đó biết
            req.app.get('io').to(chatId).emit('chat deleted', { chatId });

            res.json({
                status: 200,
                message: 'Đã xoá đoạn chat thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xoá đoạn chat:', error);
            res.status(500).json({ status: 500, message: 'Lỗi server', error: error.message });
        }
    }
};