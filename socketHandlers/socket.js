const handleNotificationSocket = require('./handleNotificationSocket');
const handleOrderStatus = require('./updateOrderStatus');

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 Socket connected:', socket.id);

    handleNotificationSocket(io, socket);
    handleOrderStatus(io, socket);

  });
  
};
module.exports = initializeSocket;