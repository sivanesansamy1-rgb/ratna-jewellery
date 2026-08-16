const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const {
  createRazorpayOrder,
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} = require('../controllers/orderController');

router.use(protect);
router.post('/razorpay-order', createRazorpayOrder);
router.post('/', placeOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
