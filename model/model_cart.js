const db = require('./db');

const cartItemSchema = new db.mongoose.Schema({
  product_id: {
    type: db.mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['normal', 'sale'],
    default: 'normal'
  },
  size: {
    type: String,
    required: true
  },
  color: {   
    type: String,
    required: true
  }
}, { _id: false });

const cartSchema = new db.mongoose.Schema({
  user_id: {
    type: db.mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    unique: true
  },
  items: {
    type: [cartItemSchema],
    default: [] // ✅ Giúp tránh lỗi khi giỏ hàng chưa có gì
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

const Cart = db.mongoose.model('Cart', cartSchema);
module.exports = Cart;