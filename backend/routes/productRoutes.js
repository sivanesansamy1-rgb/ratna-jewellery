const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { getProducts, getProductById, getFacets } = require('../controllers/productController');
const { getProductReviews, createReview } = require('../controllers/reviewController');

router.get('/', getProducts);
router.get('/meta/facets', getFacets);
router.get('/:id', getProductById);
router.get('/:productId/reviews', getProductReviews);
router.post('/:productId/reviews', protect, createReview);

module.exports = router;
