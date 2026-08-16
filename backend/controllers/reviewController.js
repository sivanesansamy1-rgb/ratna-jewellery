const asyncHandler = require('../middleware/asyncHandler');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Recalculates the product's aggregate rating from its approved reviews.
const refreshProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId, isApproved: true } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    rating: stats[0]?.avgRating || 0,
    numReviews: stats[0]?.count || 0,
  });
};

// @route GET /api/products/:productId/reviews
const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, isApproved: true })
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json({ reviews });
});

// @route POST /api/products/:productId/reviews
// Only customers who have actually received an order containing this
// product may review it — this keeps reviews genuine.
const createReview = asyncHandler(async (req, res) => {
  const { rating, comment, images = [] } = req.body;
  const productId = req.params.productId;

  const purchased = await Order.exists({
    user: req.user._id,
    orderStatus: 'Delivered',
    'items.product': productId,
  });
  if (!purchased) {
    return res.status(403).json({ message: 'You can review a product only after it has been delivered to you.' });
  }

  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) return res.status(400).json({ message: 'You have already reviewed this product.' });

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    rating,
    comment,
    images,
  });

  await refreshProductRating(productId);
  res.status(201).json({ review });
});

// @route PUT /api/reviews/:id
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only edit your own reviews.' });
  }

  review.rating = req.body.rating ?? review.rating;
  review.comment = req.body.comment ?? review.comment;
  review.isApproved = false; // edited reviews go back through moderation
  await review.save();
  await refreshProductRating(review.product);
  res.json({ review });
});

// @route DELETE /api/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You can only delete your own reviews.' });
  }
  const productId = review.product;
  await review.deleteOne();
  await refreshProductRating(productId);
  res.json({ message: 'Review deleted.' });
});

module.exports = { getProductReviews, createReview, updateReview, deleteReview, refreshProductRating };
