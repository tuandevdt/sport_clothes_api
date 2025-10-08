const Comment = require('../model/model_comment');
const SaleProduct = require('../model/model_sale_product');

module.exports = async function updateSaleProductRating(productId) {
  try {
    const comments = await Comment.find({ productId, type: 'sale' });
    const totalReviews = comments.length;
    const averageRating =
      totalReviews > 0
        ? (comments.reduce((sum, c) => sum + c.rating, 0) / totalReviews).toFixed(1)
        : 0;

    await SaleProduct.findByIdAndUpdate(productId, {
      averageRating: Number(averageRating),
      totalReviews,
    });
  } catch (err) {
    console.error('❌ Error updateSaleProductRating:', err);
  }
};