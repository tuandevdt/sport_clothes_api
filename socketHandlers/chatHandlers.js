const modelChat = require('../model/model_chat');

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join chat', (chatId) => {
      socket.join(chatId);
      console.log('User joined chat:', chatId);
    });

    socket.on('send message', async (messageData) => {
      try {
        console.log('Received message data:', messageData);
        const { chatId, senderId, content } = messageData;

        const chat = await modelChat.findById(chatId)
          .populate('participants', 'name avatar');

        if (chat) {
          const newMessage = {
            sender: senderId,
            content,
            timestamp: new Date(),
            isRead: false
          };

          chat.messages.push(newMessage);
          chat.lastMessage = newMessage;
          chat.updatedAt = new Date();
          await chat.save();

          // Broadcast to all users in the chat room
          io.to(chatId).emit('new message', {
            chatId,
            message: {
              ...newMessage,
              sender: { _id: senderId }
            }
          });

          console.log('Message broadcast to room:', chatId);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    socket.on('typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('user typing', { userId });
    });

    socket.on('stop typing', ({ chatId }) => {
      socket.to(chatId).emit('user stop typing');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

    socket.on('reaction message', async ({ chatId, messageId, userId, emoji }) => {
      try {
        const chat = await modelChat.findById(chatId);
        if (!chat) return;

        const message = chat.messages.id(messageId);
        if (!message) return;

        // Cập nhật reaction
        const existing = message.reactions?.find(r => r.user.toString() === userId);
        if (existing) {
          existing.emoji = emoji;
        } else {
          message.reactions = message.reactions || [];
          message.reactions.push({ user: userId, emoji });
        }

        await chat.save();

        // Gửi event đến các user trong chat
        io.to(chatId).emit('reaction updated', {
          chatId,
          messageId,
          userId,
          emoji
        });

        console.log(`💬 Reaction gửi đến phòng ${chatId}:`, emoji);
      } catch (err) {
        console.error('❌ Lỗi reaction:', err);
      }
    });

    socket.on('delete message', async ({ chatId, messageId }) => {
      try {
        const chat = await modelChat.findById(chatId);
        if (!chat) return;

        chat.messages = chat.messages.filter(msg => msg._id.toString() !== messageId);

        await chat.save();

        io.to(chatId).emit('message deleted', {
          chatId,
          messageId
        });

        console.log(`🗑️ Tin nhắn ${messageId} đã bị xóa trong chat ${chatId}`);
      } catch (err) {
        console.error('❌ Lỗi khi xóa message realtime:', err);
      }
    });

    socket.on('delete chat messages', async ({ chatId }) => {
      try {
        const chat = await modelChat.findById(chatId);
        if (!chat) return;

        chat.messages = [];
        chat.lastMessage = null;
        await chat.save();

        io.to(chatId).emit('chat messages cleared', { chatId });

        console.log(`🗑️ Đã xoá toàn bộ tin nhắn trong chat ${chatId}`);
      } catch (err) {
        console.error('❌ Lỗi khi xoá đoạn chat:', err);
      }
    });

  });
};

module.exports = initializeSocket;