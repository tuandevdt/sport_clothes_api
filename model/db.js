require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection URL from environment variable
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
})
.then(() => {
    console.log('kết nối database thành công');
})
.catch((error) => {
    console.error('Không thể kết nối MongoDB:', error);
});

// Export mongoose connection
module.exports = mongoose;