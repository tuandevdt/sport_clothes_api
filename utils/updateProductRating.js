const Comment = require('../model/model_comment');
const Product = require('../model/model_product');

async function updateProductRating(productId) {
  const comments = await Comment.find({ productId });
  const totalReviews = comments.length;
  const averageRating =
    totalReviews > 0
      ? comments.reduce((sum, c) => sum + c.rating, 0) / totalReviews
      : 0;

  await Product.findByIdAndUpdate(productId, {
    averageRating: averageRating.toFixed(1),
    totalReviews
  });
}

module.exports = updateProductRating;