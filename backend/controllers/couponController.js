const asyncHandler = require('../middleware/asyncHandler');
const Coupon = require('../models/Coupon');

// @route POST /api/coupons/validate (customer-facing check, no side effects)
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal = 0 } = req.body;
  const coupon = await Coupon.findOne({ code: (code || '').toUpperCase(), isActive: true });
  const now = new Date();

  if (!coupon || coupon.startDate > now || coupon.expiryDate < now) {
    return res.status(404).json({ valid: false, message: 'Invalid or expired coupon.' });
  }
  if (subtotal < coupon.minOrderValue) {
    return res.status(400).json({ valid: false, message: `Minimum order value ₹${coupon.minOrderValue} required.` });
  }
  res.json({ valid: true, coupon });
});

module.exports = { validateCoupon };
