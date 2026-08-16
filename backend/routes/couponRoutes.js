const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { validateCoupon } = require('../controllers/couponController');

router.post('/validate', protect, validateCoupon);

module.exports = router;
