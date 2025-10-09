// socket.js
module.exports = (io) => {
    io.on('connection', (socket) => {
      console.log('🔌 New client connected:', socket.id);
  
      socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`🟢 Client ${socket.id} joined room ${roomId}`);
      });
  
      socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`🔴 Client ${socket.id} left room ${roomId}`);
      });
  
      socket.on('sendMessage', (msg) => {
        console.log('📨 Message received:', msg);
        io.to(msg.chatId).emit('receiveMessage', msg); // gửi lại đúng phòng
      });
  
      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });
    });
  };
  