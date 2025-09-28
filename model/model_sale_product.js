const mongoose = require('mongoose');

// Schema sản phẩm khuyến mãi
const saleProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    discount_percent: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    discount_price: {
        type: Number,
        required: true,
        min: 0
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
    },
    isDiscount: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Middleware để tự động tính discount_price trước khi lưu
saleProductSchema.pre('save', function(next) {
    if (this.discount_percent && this.price) {
        this.discount_price = Math.round(this.price * (1 - this.discount_percent / 100));
    }
    next();
});

// Middleware để tự động tính discount_price trước khi update
saleProductSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.discount_percent && update.price) {
        update.discount_price = Math.round(update.price * (1 - update.discount_percent / 100));
    }
    next();
});

const SaleProduct = mongoose.model('sale_product', saleProductSchema);

module.exports = SaleProduct;
