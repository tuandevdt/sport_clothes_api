const Order = require('../model/model_order');
const modelNotification = require('../model/model_notification');

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;


  try {
    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true }).populate('userId');
    console.log('🧪 updatedOrder:', updatedOrder);
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const io = req.app.get('io');
    const userId = updatedOrder.userId?._id?.toString();

    console.log('🧪 Check IO:', io ? 'OK' : '❌ MISSING');
    console.log('🧪 updatedOrder.userId:', updatedOrder.userId);
    console.log('🧪 userId:', userId);
    if (io && userId) {
      const orderRoom = `order_${userId}`;
      const notificationRoom = `notification_${userId}`;
      const message = `Đơn hàng #${updatedOrder.order_code || updatedOrder._id} đã được cập nhật sang trạng thái: ${status}.`;

      // Lưu notification vào DB
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

      // Emit socket tới phòng đơn hàng nếu cần
      io.to(orderRoom).emit('orderStatusUpdated', {
        orderId: updatedOrder._id,
        status,
        message,
      });
      console.log('📤 Gửi notification đến phòng:', notificationRoom);
      console.log('📨 Nội dung:', noti.toObject());

      console.log('✅ Notification emitted & saved:', message);
    }

    res.json({ success: true, updatedOrder });
  } catch (err) {
    console.error('❌ Lỗi updateOrderStatus:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = updateOrderStatus;
