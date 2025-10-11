const axios = require('axios');

// Test tạo đơn hàng và thanh toán
async function testCreateOrderAndPayment() {
  try {
    console.log('🔄 Testing create order and payment...');
    
    const orderData = {
      userId: "507f1f77bcf86cd799439011", // Thay bằng user ID thực tế
      items: [
        {
          id_product: "507f1f77bcf86cd799439012", // Thay bằng product ID thực tế
          name: "Sản phẩm test",
          purchaseQuantity: 1,
          price: 100000
        }
      ],
      shippingFee: 0,
      paymentMethod: "online",
      shippingAddress: "123 Test Street, Test City",
      order_code: "TEST123456789"
    };

    const response = await axios.post('http://localhost:3002/vnpay/create_order_and_payment', orderData);
    
    console.log('✅ Response:', response.data);
    
    if (response.data.success) {
      console.log('✅ Order created successfully');
      console.log('📋 Order code:', response.data.order.order_code);
      console.log('🔗 Payment URL:', response.data.paymentUrl);
      
      // Test kiểm tra đơn hàng trong DB
      await testCheckOrder(response.data.order.order_code);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Test kiểm tra đơn hàng trong database
async function testCheckOrder(orderCode) {
  try {
    console.log(`🔍 Checking order: ${orderCode}`);
    
    const response = await axios.get(`http://localhost:3002/vnpay/debug/orders?order_code=${orderCode}`);
    
    console.log('📋 Order check result:', response.data);
    
  } catch (error) {
    console.error('❌ Error checking order:', error.response?.data || error.message);
  }
}

// Test lấy danh sách đơn hàng
async function testListOrders() {
  try {
    console.log('📋 Getting recent orders...');
    
    const response = await axios.get('http://localhost:3002/vnpay/debug/orders');
    
    console.log('📋 Recent orders:', response.data);
    
  } catch (error) {
    console.error('❌ Error listing orders:', error.response?.data || error.message);
  }
}

// Chạy tests
async function runTests() {
  console.log('🚀 Starting VNPay tests...\n');
  
  await testListOrders();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testCreateOrderAndPayment();
}

// Chạy nếu file được execute trực tiếp
if (require.main === module) {
  runTests();
}

module.exports = {
  testCreateOrderAndPayment,
  testCheckOrder,
  testListOrders
}; 