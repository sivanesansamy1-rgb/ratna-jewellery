const asyncHandler = require('../middleware/asyncHandler');
const Coupon = require('../models/Coupon');

const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
  res.status(201).json({ coupon });
});

const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
  Object.assign(coupon, req.body);
  if (req.body.code) coupon.code = req.body.code.toUpperCase();
  await coupon.save();
  res.json({ coupon });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
  await coupon.deleteOne();
  res.json({ message: 'Coupon deleted.' });
});

module.exports = { createCoupon, getCoupons, updateCoupon, deleteCoupon };
