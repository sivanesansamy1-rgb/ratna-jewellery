const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

const {
  createProduct,
  adminGetProducts,
  updateProduct,
  deleteProduct,
  toggleProductFlags,
  updateInventory,
} = require('../controllers/adminProductController');

const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/adminCategoryController');

const {
  adminGetOrders,
  adminGetOrderById,
  updateOrderStatus,
  adminCancelOrder,
} = require('../controllers/adminOrderController');

const {
  adminGetUsers,
  adminGetUserById,
  setUserBlockedStatus,
} = require('../controllers/adminUserController');

const {
  adminGetReviews,
  moderateReview,
  adminDeleteReview,
} = require('../controllers/adminReviewController');

const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/adminCouponController');

const { adminGetReturns, updateReturnStatus } = require('../controllers/adminReturnController');
const { getDashboardStats } = require('../controllers/adminAnalyticsController');

// EVERY route in this file requires a valid JWT (protect) AND the admin
// role re-verified against the database (requireAdmin). This is enforced
// here on the backend router, not left to the frontend to hide menu items.
router.use(protect, requireAdmin);

// Dashboard / analytics
router.get('/dashboard', getDashboardStats);

// Products
router.get('/products', adminGetProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.put('/products/:id/status', toggleProductFlags);
router.put('/products/:id/inventory', updateInventory);

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Orders
router.get('/orders', adminGetOrders);
router.get('/orders/:id', adminGetOrderById);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/cancel', adminCancelOrder);

// Users
router.get('/users', adminGetUsers);
router.get('/users/:id', adminGetUserById);
router.put('/users/:id/block', setUserBlockedStatus);

// Reviews
router.get('/reviews', adminGetReviews);
router.put('/reviews/:id/moderate', moderateReview);
router.delete('/reviews/:id', adminDeleteReview);

// Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Returns
router.get('/returns', adminGetReturns);
router.put('/returns/:id/status', updateReturnStatus);

module.exports = router;
