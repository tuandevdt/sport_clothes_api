const mongoose = require('mongoose');

// Schema sản phẩm
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    sold: {
        type: Number,
        default: 0,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    images: {
        type: [String],
        required: true,
        validate: {
            validator: function(v) {
                return v.length > 0;
            },
            message: 'Sản phẩm phải có ít nhất một hình ảnh'
        }
    },
    size: {
        type: [String],
        enum: ['S', 'M', 'L', 'XL'],
        default: ['M']
    },
    colors: {
        type: [String],
        enum: ['Đen', 'Trắng', 'Xanh'],
        default: []
    },
    categoryCode: {
        type: String,
        required: true
    },
    averageRating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

const Product = mongoose.model('product', productSchema);

module.exports = Product;