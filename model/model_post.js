const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    author: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Tạo indexes cho các trường thường xuyên tìm kiếm
postSchema.index({ title: 'text', content: 'text' });
postSchema.index({ productId: 1 });
postSchema.index({ tags: 1 });

// Thêm các phương thức tĩnh
postSchema.statics.findByProductId = function(productId) {
    return this.find({ productId }).sort({ createdAt: -1 });
};

postSchema.statics.findByTag = function(tag) {
    return this.find({ tags: tag }).sort({ createdAt: -1 });
};

postSchema.statics.searchPosts = function(searchText) {
    return this.find(
        { $text: { $search: searchText } },
        { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } });
};

// Sử dụng mongoose để tạo model
const Post = mongoose.model('post', postSchema);

module.exports = Post;
