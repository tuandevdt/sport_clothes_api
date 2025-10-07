const modelOrder = require('../model/model_order');
const Product = require('../model/model_product');
const SaleProduct = require('../model/model_sale_product');
const User = require('../model/model_user');
const Voucher = require('../model/model_voucher');
const modelNotification = require('../model/model_notification');

// ✅ THÊM: Helper function để cập nhật tồn kho một cách nhất quán
const updateProductStock = async (item, operation = 'decrease', source = 'unknown') => {
  try {
    // Kiểm tra xem item có phải là sản phẩm giảm giá không
    let product = await SaleProduct.findById(item.id_product);
    let isSaleProduct = false;
    
    if (product) {
      isSaleProduct = true;
    } else {
      product = await Product.findById(item.id_product);
    }

    if (!product) {
      console.error(`❌ Không tìm thấy sản phẩm ID: ${item.id_product}`);
      return false;
    }

    // Kiểm tra tồn kho nếu là thao tác giảm
    if (operation === 'decrease' && product.stock < item.purchaseQuantity) {
      console.error(`❌ Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho, không đủ cho ${item.purchaseQuantity} sản phẩm`);
      return false;
    }

    // Tính toán số lượng cần cập nhật
    const quantityChange = operation === 'decrease' ? -item.purchaseQuantity : item.purchaseQuantity;
    const soldChange = operation === 'decrease' ? item.purchaseQuantity : -item.purchaseQuantity;

    // Cập nhật tồn kho và số lượng đã bán
    if (isSaleProduct) {
      await SaleProduct.findByIdAndUpdate(item.id_product, {
        $inc: { 
          sold: soldChange,
          stock: quantityChange
        }
      });
      console.log(`✅ Đã ${operation === 'decrease' ? 'giảm' : 'tăng'} tồn kho sản phẩm giảm giá: ${product.name} (${source})`);
    } else {
      await Product.findByIdAndUpdate(item.id_product, {
        $inc: { 
          sold: soldChange,
          stock: quantityChange
        }
      });
      console.log(`✅ Đã ${operation === 'decrease' ? 'giảm' : 'tăng'} tồn kho sản phẩm thường: ${product.name} (${source})`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Lỗi cập nhật tồn kho cho sản phẩm ${item.id_product}:`, error);
    return false;
  }
};

// Helper function để populate sản phẩm từ cả Product và SaleProduct collections
const populateProductDetails = async (order) => {
  try {
    const populatedItems = await Promise.all(
      order.items.map(async (item) => {
        // Thử tìm trong Product collection trước
        let product = await Product.findById(item.id_product).select('name images price size colors');

        // Nếu không tìm thấy, tìm trong SaleProduct collection
        if (!product) {
          product = await SaleProduct.findById(item.id_product).select('name images price discount_price discount_percent size colors');
          if (product) {
            // Thêm flag để đánh dấu đây là sản phẩm giảm giá
            product = product.toObject();
            product.isSaleProduct = true;
          }
        }

        return {
          ...item.toObject(),
          productDetails: product,
          // ✅ Đảm bảo ảnh được hiển thị trong order
          images: item.images || product?.images || []
        };
      })
    );

    return {
      ...order.toObject(),
      items: populatedItems
    };
  } catch (error) {
    console.error('Error populating product details:', error);
    return order;
  }
};

const orderController = {
  // [POST] /api/orders
  createOrder: async (req, res) => {
    try {
      const {
        userId,
        items,
        shippingFee = 0,
        voucher,
        paymentMethod,
        shippingAddress,
        order_code
      } = req.body;

      if (!userId || !items || !paymentMethod || !shippingAddress) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Người dùng không tồn tại" });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Giỏ hàng không được rỗng" });
      }

      // ✅ Validate từng sản phẩm và kiểm tra tồn kho
      for (const item of items) {
        if (!item.id_product || !item.name || !item.purchaseQuantity || !item.price) {
          return res.status(400).json({ message: "Mỗi sản phẩm cần đủ thông tin id_product, name, purchaseQuantity, price" });
        }

        // Kiểm tra sản phẩm thường
        let productExists = await Product.findById(item.id_product);
        let isSaleProduct = false;

        // Nếu không tìm thấy sản phẩm thường, kiểm tra sản phẩm giảm giá
        if (!productExists) {
          productExists = await SaleProduct.findById(item.id_product);
          isSaleProduct = true;
        }

        if (!productExists) {
          return res.status(404).json({ message: `Không tìm thấy sản phẩm ID ${item.id_product}` });
        }

        // ✅ Kiểm tra tồn kho chi tiết hơn
        if (productExists.stock < item.purchaseQuantity) {
          return res.status(400).json({
            message: `Sản phẩm "${productExists.name}" chỉ còn ${productExists.stock} trong kho, không đủ cho ${item.purchaseQuantity} sản phẩm`,
            productId: item.id_product,
            productName: productExists.name,
            availableStock: productExists.stock,
            requestedQuantity: item.purchaseQuantity,
            isSaleProduct: isSaleProduct
          });
        }

        // ✅ Thêm thông tin về loại sản phẩm vào item
        item.isSaleProduct = isSaleProduct;
      }

      // Tính tổng giá với giá giảm cho sản phẩm khuyến mãi
      let totalPrice = 0;
      const updatedItems = [];

      for (const item of items) {
        // Kiểm tra sản phẩm thường trước
        let product = await Product.findById(item.id_product);
        let isSaleProduct = false;

        // Nếu không tìm thấy sản phẩm thường, tìm sản phẩm giảm giá
        if (!product) {
          product = await SaleProduct.findById(item.id_product);
          isSaleProduct = true;
        }

        if (!product) {
          return res.status(404).json({ message: `Không tìm thấy sản phẩm ID ${item.id_product}` });
        }

        // Sử dụng giá giảm nếu là sản phẩm khuyến mãi
        const finalPrice = isSaleProduct ? product.discount_price : product.price;

        // Cập nhật item với giá cuối cùng và thêm ảnh từ product
        const updatedItem = {
          ...item,
          price: finalPrice,
          originalPrice: product.price,
          isSaleProduct,
          discount_percent: isSaleProduct ? product.discount_percent : 0,
          // ✅ Tự động thêm ảnh từ product vào order
          images: product.images || [],
          // ✅ Thêm thông tin size và color nếu có
          size: item.size || null,
          color: item.color || null
        };

        updatedItems.push(updatedItem);
        totalPrice += finalPrice * item.purchaseQuantity;
      }

      // Xử lý voucher nếu có
      let discountAmount = 0;
      let voucherData = null;

      if (voucher?.voucherId) {
        const voucherDoc = await Voucher.findById(voucher.voucherId);
        const now = new Date();

        if (voucherDoc && voucherDoc.status === 'active' && now >= voucherDoc.startDate && now <= voucherDoc.expireDate) {
          if (voucherDoc.type === 'percentage') {
            discountAmount = totalPrice * (voucherDoc.discount / 100);
            discountAmount = Math.min(discountAmount, voucherDoc.maxDiscount);
          } else if (voucherDoc.type === 'fixed') {
            discountAmount = voucherDoc.discount;
          } else if (voucherDoc.type === 'shipping') {
            discountAmount = shippingFee;
          }

          voucherData = {
            voucherId: voucherDoc._id,
            code: voucher.code || voucherDoc.code,
            discountAmount
          };
        }
      }

      const finalTotal = totalPrice + shippingFee - discountAmount;

      const newOrder = new modelOrder({
        userId,
        items: updatedItems, // Sử dụng items đã được cập nhật
        order_code,
        totalPrice,
        shippingFee,
        voucher: voucherData,
        finalTotal,
        paymentMethod,
        shippingAddress,
        status: 'waiting',
      });

      const savedOrder = await newOrder.save();

      // ✅ SỬA: Kiểm tra req.app trước khi lấy io
      let io = null;
      if (req && req.app && typeof req.app.get === 'function') {
        io = req.app.get('io');
      }

      const orderCode = savedOrder.order_code || savedOrder._id;
      const message = `Bạn đã đặt đơn hàng thành công với mã đơn hàng: #${orderCode}.`;

      // Emit socket tới user
      if (io) {
        io.to(`notification_${userId}`).emit('notification received', {
          title: 'Đơn hàng mới',
          message,
          type: 'order',
          data: { orderId: savedOrder._id },
        });
      }

      // Lưu vào DB
      try {
        await modelNotification.create({
          userId,
          title: 'Đơn hàng mới',
          message,
          type: 'order',
          isRead: false,
          data: { orderId: savedOrder._id },
        });
      } catch (notificationError) {
        console.error("❌ Lỗi tạo notification:", notificationError);
        // Không throw error vì đơn hàng đã tạo thành công
      }

      // ✅ Lưu ý: Không cập nhật tồn kho ở đây vì đơn hàng chưa thanh toán
      // Tồn kho sẽ được cập nhật khi thanh toán thành công

      // ✅ SỬA: Thêm return trước response
      if (res && typeof res.status === 'function') {
        return res.status(201).json({ message: "Tạo đơn hàng thành công", data: savedOrder });
      }
    } catch (error) {
      console.error("❌ createOrder error:", error);
      // ✅ SỬA: Thêm return trước response
      if (res && typeof res.status === 'function') {
        return res.status(500).json({ message: "Lỗi server khi tạo đơn hàng", error: error.message });
      } else {
        throw error; // Re-throw để xử lý ở caller
      }
    }
  },

  // [GET] /api/orders
  getAllOrders: async (req, res) => {
    try {
      console.log("🔍 Fetching all orders...");

      // Lấy orders và populate userId
      const orders = await modelOrder.find().sort({ createdAt: -1 }).populate('userId', 'name email');
      console.log(`📦 Found ${orders.length} orders`);

      // Populate sản phẩm chi tiết cho từng order
      const populatedOrders = await Promise.all(
        orders.map(async (order) => {
          try {
            return await populateProductDetails(order);
          } catch (populateError) {
            console.error(`❌ Error populating order ${order._id}:`, populateError.message);
            // Trả về order không populate nếu có lỗi
            return order;
          }
        })
      );

      // ✅ SỬA: Thêm return
      return res.status(200).json({ data: populatedOrders });
    } catch (error) {
      console.error("❌ getAllOrders error:", error);
      // ✅ SỬA: Thêm return
      return res.status(500).json({
        message: "Lỗi khi lấy danh sách đơn hàng",
        error: error.message
      });
    }
  },

  // [GET] /api/orders/:id
  getOrderById: async (req, res) => {
    try {
      const order = await modelOrder.findById(req.params.id)
        .populate('userId', 'name email');

      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Populate sản phẩm chi tiết
      const populatedOrder = await populateProductDetails(order);

      // ✅ SỬA: Thêm return
      return res.status(200).json({ data: populatedOrder });
    } catch (error) {
      // ✅ SỬA: Thêm return
      return res.status(500).json({ message: "Lỗi khi lấy đơn hàng", error: error.message });
    }
  },

  // [GET] /api/orders/user/:userId
  getOrdersByUserId: async (req, res) => {
    try {
      const orders = await modelOrder.find({ userId: req.params.userId })
        .sort({ createdAt: -1 });

      if (!orders || orders.length === 0) {
        return;
      }

      // Populate sản phẩm chi tiết cho từng order
      const populatedOrders = await Promise.all(
        orders.map(async (order) => {
          try {
            return await populateProductDetails(order);
          } catch (populateError) {
            console.error(`❌ Error populating order ${order._id}:`, populateError.message);
            return order;
          }
        })
      );

      // ✅ SỬA: Thêm return
      return res.status(200).json({ data: populatedOrders });
    } catch (error) {
      // ✅ SỬA: Thêm return
      return res.status(500).json({ message: "Lỗi khi lấy đơn theo user", error: error.message });
    }
  },

  // [PUT] /api/orders/:id/status
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, returnDate } = req.body;

      const order = await modelOrder.findById(id);
      if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

      const oldStatus = order.status;

      // ✅ SỬA: Chỉ cập nhật tồn kho cho đơn hàng COD chưa thanh toán
      if (status === 'confirmed' && oldStatus === 'waiting') {
        // Kiểm tra xem đơn hàng đã được thanh toán chưa
        const isPaid = order.paymentStatus === 'completed' || order.paymentMethod === 'vnpay';
        
        if (!isPaid && order.paymentMethod === 'cod') {
          console.log(`🔄 Cập nhật tồn kho cho đơn hàng COD chưa thanh toán: ${order.order_code}`);
          
          for (const item of order.items) {
            const success = await updateProductStock(item, 'decrease', 'COD-confirm');
            if (!success) {
              return res.status(400).json({
                message: `Không thể cập nhật tồn kho cho sản phẩm ID: ${item.id_product}`
              });
            }
          }
        } else if (isPaid) {
          console.log(`ℹ️ Đơn hàng ${order.order_code} đã được thanh toán (${order.paymentMethod}), bỏ qua cập nhật tồn kho`);
        } else {
          console.log(`ℹ️ Đơn hàng ${order.order_code} không phải COD, bỏ qua cập nhật tồn kho`);
        }
      }

      const updatedOrder = await modelOrder.findByIdAndUpdate(
        id,
        {
          status,
          returnDate: returnDate || (status === 'returned' ? new Date() : undefined)
        },
        { new: true }
      );

      if (status === "shipped") {
        setTimeout(async () => {
          const checkOrder = await modelOrder.findById(id);
          if (checkOrder && checkOrder.status === "shipped") {
            checkOrder.status = "delivered";
            await checkOrder.save();

            // emit socket luôn
            const io = req.app.get("io");
            if (io) {
              io.to(`order_${checkOrder.userId}`).emit("orderStatusUpdated", {
                orderId: checkOrder._id,
                status: "delivered",
                fullOrder: checkOrder
              });
            }

            console.log(`✅ Auto cập nhật Order ${id} sang delivered sau 10 giây`);
          }
        }, 10 * 1000);
      }

      // ✅ Tăng/Giảm lại số lượng sản phẩm đã bán và tồn kho khi hủy/hoàn trả
      // Chỉ xử lý khi chuyển từ trạng thái đã xác nhận sang hủy/hoàn trả hoặc ngược lại
      if (['cancelled', 'returned'].includes(status) && ['confirmed', 'shipped', 'pending'].includes(oldStatus)) {
        // Khi hủy đơn hàng: tăng lại tồn kho, giảm số đã bán
        console.log(`🔄 Hoàn trả tồn kho cho đơn hàng bị hủy: ${order.order_code}`);
        for (const item of order.items) {
          await updateProductStock(item, 'increase', 'cancel/return');
        }
      }

      if (['confirmed', 'shipped', 'pending'].includes(status) && ['cancelled', 'returned'].includes(oldStatus)) {
        // Khi xác nhận lại đơn hàng: giảm tồn kho, tăng số đã bán
        console.log(`🔄 Cập nhật lại tồn kho cho đơn hàng được xác nhận lại: ${order.order_code}`);
        for (const item of order.items) {
          const success = await updateProductStock(item, 'decrease', 'reconfirm');
          if (!success) {
            return res.status(400).json({
              message: `Không thể cập nhật tồn kho cho sản phẩm ID: ${item.id_product}`
            });
          }
        }
      }

      // ✅ Lấy io và gửi socket + tạo notification
      const io = req.app.get('io');
      const populatedOrder = await modelOrder.findById(updatedOrder._id)
        .populate('userId')
        .lean();

      // Populate sản phẩm chi tiết
      const orderWithProductDetails = await populateProductDetails(populatedOrder);

      const userId = orderWithProductDetails.userId?._id?.toString();
      const orderRoom = `order_${userId}`;
      const notificationRoom = `notification_${userId}`;
      const translateOrderStatus = (status) => {
        const statusMap = {
          pending: "Đang chờ xử lý",
          confirmed: "Đã xác nhận",
          shipped: "Đang giao hàng",
          delivered: "Đã giao hàng",
          cancelled: "Đã hủy",
          returned: "Đã hoàn trả",
        };

        return statusMap[status] || status;
      };
      const message = `Đơn hàng #${orderWithProductDetails.order_code || orderWithProductDetails._id} đã được cập nhật sang trạng thái: ${translateOrderStatus(status)}.`;

      // Emit socket tới phòng đơn hàng
      if (io && userId) {
        io.to(orderRoom).emit('orderStatusUpdated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          fullOrder: orderWithProductDetails
        });

        // ✅ Lưu notification vào DB
        const noti = await modelNotification.create({
          userId,
          title: 'Cập nhật đơn hàng',
          message,
          type: 'order',
          isRead: false,
          data: { orderId: updatedOrder._id, status },
        });

        // Emit socket tới phòng notification
        io.to(notificationRoom).emit('notification received', noti.toObject());

        console.log('📤 Gửi notification đến phòng:', notificationRoom);
        console.log('📨 Nội dung:', noti.toObject());
      }

      // ✅ SỬA: Thêm return
      return res.status(200).json({
        message: "Cập nhật trạng thái đơn hàng thành công",
        data: updatedOrder
      });

    } catch (error) {
      console.error("❌ updateStatus error:", error);
      // ✅ SỬA: Thêm return
      return res.status(500).json({ message: "Lỗi khi cập nhật trạng thái", error: error.message });
    }
  },

  // ✅ THÊM: Xử lý thanh toán khi nhận hàng (COD)
  confirmCODPayment: async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentAmount } = req.body;

      const order = await modelOrder.findById(id);
      if (!order) {
        return res.status(404).json({ message: "Đơn hàng không tồn tại" });
      }

      // Kiểm tra xem đơn hàng có phải là COD không
      if (order.paymentMethod !== 'cod') {
        return res.status(400).json({ message: "Đơn hàng này không phải thanh toán khi nhận hàng" });
      }

      // Kiểm tra trạng thái đơn hàng
      if (order.status !== 'delivered') {
        return res.status(400).json({ message: "Chỉ có thể thanh toán khi đơn hàng đã được giao thành công" });
      }

      // Kiểm tra số tiền thanh toán
      if (paymentAmount < order.finalTotal) {
        return res.status(400).json({ 
          message: "Số tiền thanh toán không đủ", 
          required: order.finalTotal,
          provided: paymentAmount 
        });
      }

      // ✅ CẬP NHẬT TỒN KHO KHI THANH TOÁN COD THÀNH CÔNG (chỉ khi chưa được cập nhật)
      if (order.paymentStatus !== 'completed') {
        console.log(`🔄 Cập nhật tồn kho cho đơn hàng COD thanh toán: ${order.order_code}`);
        
        for (const item of order.items) {
          const success = await updateProductStock(item, 'decrease', 'COD-payment');
          if (!success) {
            return res.status(400).json({
              message: `Không thể cập nhật tồn kho cho sản phẩm ID: ${item.id_product}`
            });
          }
        }
      } else {
        console.log(`ℹ️ Đơn hàng ${order.order_code} đã được thanh toán, bỏ qua cập nhật tồn kho`);
      }

      // Cập nhật trạng thái thanh toán
      order.paymentStatus = 'completed';
      order.paymentDetails = {
        ...order.paymentDetails,
        transactionId: `COD-${Date.now()}`,
        paymentTime: new Date().toISOString(),
        amount: paymentAmount
      };

      const updatedOrder = await order.save();

      // ✅ Lấy io và gửi socket + tạo notification
      const io = req.app.get('io');
      const populatedOrder = await modelOrder.findById(updatedOrder._id)
        .populate('userId')
        .lean();

      // Populate sản phẩm chi tiết
      const orderWithProductDetails = await populateProductDetails(populatedOrder);

      const userId = orderWithProductDetails.userId?._id?.toString();
      const orderRoom = `order_${userId}`;
      const notificationRoom = `notification_${userId}`;
      
      const message = `Đơn hàng #${orderWithProductDetails.order_code || orderWithProductDetails._id} đã được thanh toán thành công với số tiền: ${paymentAmount.toLocaleString('vi-VN')} VNĐ.`;

      // Emit socket tới phòng đơn hàng
      if (io && userId) {
        io.to(orderRoom).emit('orderStatusUpdated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          fullOrder: orderWithProductDetails
        });

        // ✅ Lưu notification vào DB
        const noti = await modelNotification.create({
          userId,
          title: 'Thanh toán thành công',
          message,
          type: 'payment',
          isRead: false,
          data: { orderId: updatedOrder._id, paymentStatus: 'completed' },
        });

        // Emit socket tới phòng notification
        io.to(notificationRoom).emit('notification received', noti.toObject());

        console.log('📤 Gửi notification thanh toán thành công đến phòng:', notificationRoom);
        console.log('📨 Nội dung:', noti.toObject());
      }

      return res.status(200).json({
        message: "Thanh toán khi nhận hàng thành công",
        data: updatedOrder
      });

    } catch (error) {
      console.error("❌ confirmCODPayment error:", error);
      return res.status(500).json({ message: "Lỗi khi xác nhận thanh toán", error: error.message });
    }
  },

  // ✅ THÊM: Kiểm tra tồn kho real-time
  checkStockAvailability: async (req, res) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Danh sách sản phẩm không hợp lệ" });
      }

      const stockCheckResults = [];

      for (const item of items) {
        if (!item.id_product || !item.purchaseQuantity) {
          stockCheckResults.push({
            productId: item.id_product,
            available: false,
            message: "Thiếu thông tin sản phẩm hoặc số lượng"
          });
          continue;
        }

        // Kiểm tra sản phẩm thường
        let product = await Product.findById(item.id_product);
        let isSaleProduct = false;

        // Nếu không tìm thấy sản phẩm thường, kiểm tra sản phẩm giảm giá
        if (!product) {
          product = await SaleProduct.findById(item.id_product);
          isSaleProduct = true;
        }

        if (!product) {
          stockCheckResults.push({
            productId: item.id_product,
            available: false,
            message: "Không tìm thấy sản phẩm"
          });
          continue;
        }

        const isAvailable = product.stock >= item.purchaseQuantity;
        const availableStock = product.stock;

        stockCheckResults.push({
          productId: item.id_product,
          productName: product.name,
          requestedQuantity: item.purchaseQuantity,
          availableStock: availableStock,
          available: isAvailable,
          isSaleProduct: isSaleProduct,
          message: isAvailable 
            ? "Có đủ hàng trong kho" 
            : `Chỉ còn ${availableStock} trong kho, không đủ cho ${item.purchaseQuantity} sản phẩm`
        });
      }

      const allAvailable = stockCheckResults.every(result => result.available);

      return res.status(200).json({
        message: allAvailable ? "Tất cả sản phẩm đều có đủ hàng" : "Một số sản phẩm không đủ hàng",
        allAvailable: allAvailable,
        results: stockCheckResults
      });

    } catch (error) {
      console.error("❌ checkStockAvailability error:", error);
      return res.status(500).json({ message: "Lỗi khi kiểm tra tồn kho", error: error.message });
    }
  }
};

exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).populate('products.productId');
    res.status(200).json(orders);  // trả về cả isReviewed
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng', error });
  }
};


exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('products.productId');
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json(order); // trả về cả isReviewed
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy chi tiết đơn hàng', error });
  }
};

module.exports = orderController;

// ✅ EXPORT: Helper function để sử dụng từ file khác
module.exports.updateProductStock = updateProductStock;