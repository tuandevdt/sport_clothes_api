const Comment = require('../model/model_comment');
const Product = require('../model/model_product');
const Order = require('../model/model_order');
const SaleProduct = require('../model/model_sale_product');
const mongoose = require("mongoose");
const { Types } = mongoose;

// HÀM PHỤ: cập nhật rating trung bình vào Product hoặc SaleProduct
async function updateProductRating(productId, type = "normal") {

  //Truy vấn tất cả comment của một sản phẩm theo productId và type
  const comments = await Comment.find({
    productId: new Types.ObjectId(productId),
    type
  });

  //Tính tổng số review.
  const totalReviews = comments.length;

  //Tính averageRating
  const averageRating = totalReviews > 0
    ? (comments.reduce((sum, c) => sum + (c.rating || 0), 0) / totalReviews).toFixed(1)
    : 0;

  //Ghi averageRating & totalReviews về document của SaleProduct hoặc Product tuỳ theo type
  let updated;
  if (type === "sale") {
    updated = await SaleProduct.findByIdAndUpdate(
      productId,
      { averageRating, totalReviews },
      { new: true }
    );
  } else {
    updated = await Product.findByIdAndUpdate(
      productId,
      { averageRating, totalReviews },
      { new: true }
    );
  }
  return updated;
}

// LẤY CHI TIẾT SẢN PHẨM KÈM COMMENT (tự detect type)
exports.getProductDetailWithComments = async (req, res) => {
  try {

    //Lấy id từ URL, convert sang ObjectId
    const { id } = req.params;
    const objId = new Types.ObjectId(id);

    //Thử tìm trong Product trước. Nếu không có, thử trong SaleProduct. Tự xác định type
    let product = await Product.findById(objId);
    let type = "normal";
    if (!product) {
      product = await SaleProduct.findById(objId);
      type = "sale";
    }

    console.log("📌 Query detail product:", { id, foundType: type, product: !!product });

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    //Lấy toàn bộ comment của sản phẩm theo type
    const comments = await Comment.find({ productId: objId,  // hoặc saleProductId nếu type === 'sale'
      type: type   })
      .populate({ path: "userId", select: "name avatar" })
      .sort({ createdAt: -1 });

    console.log("📌 Comments found:", comments.length);

    //Tính lại averageRating từ tập comment vừa query
    const totalReviews = comments.length;
    const averageRating = totalReviews > 0
      ? (comments.reduce((sum, c) => sum + (c.rating || 0), 0) / totalReviews).toFixed(1)
      : 0;

    //Trả về JSON: product, comments (đã populate), averageRating ép về Number (ở đây đã xử lý string→number), totalReviews và type
    res.json({
      product,
      comments,
      averageRating: Number(averageRating),
      totalReviews: comments.length,
      type
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// THÊM 1 COMMENT (có kèm orderId)
exports.createComment = async (req, res) => {
  try {
    //Lấy các dữ liệu từ body request
    const { orderId, productId, userId, type, rating, content } = req.body;

    if (!orderId) return res.status(400).json({ message: "orderId không được để trống" });

    //Đảm bảo đơn hàng tồn tại
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Kiểm tra sản phẩm có trong đơn hàng không
    const item = order.items.find(i => {
      const prodId = i.id_product?._id || i.id_product;
      return prodId?.toString() === productId;
    });
    if (!item) return res.status(400).json({ message: "Sản phẩm không tồn tại trong đơn hàng" });

    // Kiểm tra sản phẩm này đã được review chưa
    if (item.isReviewed) return res.status(400).json({ message: "Sản phẩm này đã được đánh giá rồi" });

    // Tạo comment link tới product, user, order
    const newComment = new Comment({
      productId: new Types.ObjectId(productId),
      userId: new Types.ObjectId(userId),
      type,
      rating,
      content,
      order: orderId,
    });
    await newComment.save();

    // Cập nhật đơn hàng: gắn isReviewed = true cho item đã review
    await Order.updateOne(
      { _id: orderId, "items.id_product": productId },
      { $set: { "items.$.isReviewed": true } }
    );

    // Cập nhật rating trung bình
    await updateProductRating(productId, type);

    res.status(201).json({ message: "Đánh giá thành công", comment: newComment });

  } catch (error) {
    console.error("Lỗi khi tạo comment:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


// THÊM NHIỀU COMMENT (có kèm orderId)
exports.createMultipleComments = async (req, res) => {
  console.log("📌 createMultipleComments", req.body);
  try {
    const { orderId, userId, reviews } = req.body;



    if (!orderId) return res.status(400).json({ message: "orderId không được để trống" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ message: "Không có đánh giá nào được gửi" });
    }

    const savedComments = [];

    for (const review of reviews) {
      const { productId, type = "normal", rating, content } = review;

      // Kiểm tra sản phẩm có trong đơn hàng không
      const item = order.items.find(i => {
        const prodId = i.id_product?._id || i.id_product;
        return prodId?.toString() === productId;
      });
      if (!item) continue;

      // Nếu sản phẩm đã review rồi thì bỏ qua
      if (item.isReviewed) continue;

      // Tạo comment
      const newComment = new Comment({
        productId: new Types.ObjectId(productId),
        userId: new Types.ObjectId(userId),
        type,
        rating,
        content,
        order: orderId,
      });
      await newComment.save();
      savedComments.push(newComment);

      // Đánh dấu sản phẩm đã review
      const objProductId = new Types.ObjectId(productId);
      await Order.updateOne(
        { _id: orderId, "items.id_product": objProductId },
        { $set: { "items.$.isReviewed": true } }
      );

      // Cập nhật rating trung bình
      await updateProductRating(productId, type);
    }

    if (savedComments.length === 0) {
      return res.status(400).json({ message: "Không có sản phẩm nào được đánh giá (có thể đã đánh giá trước đó)" });
    }

    res.status(201).json({ message: "Đánh giá thành công", comments: savedComments });
  } catch (error) {
    console.error("Lỗi khi tạo nhiều comment:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
