const asyncHandler = require('../middleware/asyncHandler');
const Review = require('../models/Review');
const { refreshProductRating } = require('./reviewController');

const adminGetReviews = asyncHandler(async (req, res) => {
  const { status } = req.query; // 'pending' | 'approved'
  const query = {};
  if (status === 'pending') query.isApproved = false;
  if (status === 'approved') query.isApproved = true;

  const reviews = await Review.find(query).populate('user', 'name').populate('product', 'name images').sort({ createdAt: -1 });
  res.json({ reviews });
});

const moderateReview = asyncHandler(async (req, res) => {
  const { isApproved } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found.' });

  review.isApproved = isApproved;
  await review.save();
  await refreshProductRating(review.product);
  res.json({ review });
});

const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  const productId = review.product;
  await review.deleteOne();
  await refreshProductRating(productId);
  res.json({ message: 'Review removed.' });
});

module.exports = { adminGetReviews, moderateReview, adminDeleteReview };
