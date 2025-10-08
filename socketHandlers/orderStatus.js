const initializeOrderSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('🟢 [Socket] Client connected for order status');

        socket.on('join order room', (userId) => {
            const room = `${userId}`;
            socket.join(room);
            console.log(`📦 User joined ORDER room: ${room}`);
        });
    });
};

module.exports = initializeOrderSocket;