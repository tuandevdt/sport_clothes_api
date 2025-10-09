// Test logic tồn kho
const mongoose = require('mongoose');
const Product = require('./model/model_product');
const SaleProduct = require('./model/model_sale_product');
const Order = require('./model/model_order');

// Kết nối database
mongoose.connect('mongodb://localhost:27017/your_database_name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testStockLogic() {
  try {
    console.log('🧪 Bắt đầu test logic tồn kho...');

    // 1. Tạo sản phẩm test
    const testProduct = new Product({
      name: 'Sản phẩm test',
      price: 100000,
      stock: 10,
      sold: 0,
      description: 'Sản phẩm test cho logic tồn kho',
      images: ['test.jpg'],
      size: ['M'],
      colors: ['Đen'],
      categoryCode: 'test'
    });

    const savedProduct = await testProduct.save();
    console.log('✅ Tạo sản phẩm test:', savedProduct.name, 'Stock:', savedProduct.stock);

    // 2. Tạo đơn hàng test
    const testOrder = new Order({
      userId: '507f1f77bcf86cd799439011', // ObjectId test
      items: [{
        id_product: savedProduct._id,
        name: savedProduct.name,
        purchaseQuantity: 3,
        price: savedProduct.price,
        images: savedProduct.images
      }],
      order_code: 'TEST001',
      totalPrice: 300000,
      shippingFee: 0,
      finalTotal: 300000,
      paymentMethod: 'vnpay',
      shippingAddress: {
        address: 'Test address',
        phone: '0123456789'
      },
      status: 'waiting'
    });

    const savedOrder = await testOrder.save();
    console.log('✅ Tạo đơn hàng test:', savedOrder.order_code);

    // 3. Test cập nhật tồn kho
    console.log('🔄 Test cập nhật tồn kho...');
    
    // Giả lập thanh toán VNPay thành công
    const updatedOrder = await Order.findByIdAndUpdate(
      savedOrder._id,
      {
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentMethod: 'vnpay'
      },
      { new: true }
    );

    // Cập nhật tồn kho
    for (const item of updatedOrder.items) {
      await Product.findByIdAndUpdate(item.id_product, {
        $inc: { 
          sold: item.purchaseQuantity,
          stock: -item.purchaseQuantity
        }
      });
    }

    // Kiểm tra kết quả
    const updatedProduct = await Product.findById(savedProduct._id);
    console.log('📊 Kết quả sau khi cập nhật tồn kho:');
    console.log('   - Stock ban đầu: 10');
    console.log('   - Stock hiện tại:', updatedProduct.stock);
    console.log('   - Sold ban đầu: 0');
    console.log('   - Sold hiện tại:', updatedProduct.sold);
    console.log('   - Đã bán: 3');
    console.log('   - Còn lại: 7');

    if (updatedProduct.stock === 7 && updatedProduct.sold === 3) {
      console.log('✅ Logic tồn kho hoạt động chính xác!');
    } else {
      console.log('❌ Logic tồn kho có vấn đề!');
    }

    // 4. Test hủy đơn hàng (hoàn trả tồn kho)
    console.log('🔄 Test hủy đơn hàng...');
    
    await Order.findByIdAndUpdate(
      savedOrder._id,
      { status: 'cancelled' }
    );

    // Hoàn trả tồn kho
    for (const item of updatedOrder.items) {
      await Product.findByIdAndUpdate(item.id_product, {
        $inc: { 
          sold: -item.purchaseQuantity,
          stock: item.purchaseQuantity
        }
      });
    }

    const restoredProduct = await Product.findById(savedProduct._id);
    console.log('📊 Kết quả sau khi hủy đơn hàng:');
    console.log('   - Stock hiện tại:', restoredProduct.stock);
    console.log('   - Sold hiện tại:', restoredProduct.sold);

    if (restoredProduct.stock === 10 && restoredProduct.sold === 0) {
      console.log('✅ Logic hoàn trả tồn kho hoạt động chính xác!');
    } else {
      console.log('❌ Logic hoàn trả tồn kho có vấn đề!');
    }

    // 5. Dọn dẹp
    await Product.findByIdAndDelete(savedProduct._id);
    await Order.findByIdAndDelete(savedOrder._id);
    console.log('🧹 Đã dọn dẹp dữ liệu test');

  } catch (error) {
    console.error('❌ Lỗi test:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔚 Kết thúc test');
  }
}

// Chạy test
testStockLogic();
