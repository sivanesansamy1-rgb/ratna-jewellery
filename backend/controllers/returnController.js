const asyncHandler = require('../middleware/asyncHandler');
const Return = require('../models/Return');
const Order = require('../models/Order');

// @route POST /api/returns
const requestReturn = asyncHandler(async (req, res) => {
  const { orderId, items, reason, type = 'return' } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only request returns for your own orders.' });
  }
  if (order.orderStatus !== 'Delivered') {
    return res.status(400).json({ message: 'Returns can only be requested for delivered orders.' });
  }
  const deliveredDaysAgo = (Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (deliveredDaysAgo > 15) {
    return res.status(400).json({ message: 'The return window (15 days from delivery) has passed.' });
  }

  if (order.orderStatus === 'Return Requested' || order.orderStatus === 'Refunded' || order.orderStatus === 'Returned') {
    return res.status(400).json({ message: 'A return has already been requested or processed for this order.' });
  }

  const existingReturn = await Return.findOne({ order: order._id });
  if (existingReturn) {
    return res.status(400).json({ message: 'A return request already exists for this order.' });
  }

  const ret = await Return.create({
    order: order._id,
    user: req.user._id,
    items,
    type,
    reason,
  });

  order.orderStatus = 'Return Requested';
  order.statusHistory.push({ status: 'Return Requested', note: 'Customer requested a return.' });
  await order.save();

  res.status(201).json({ return: ret });
});

// @route GET /api/returns
const getMyReturns = asyncHandler(async (req, res) => {
  const returns = await Return.find({ user: req.user._id }).populate('order', 'orderId total').sort({ createdAt: -1 });
  res.json({ returns });
});

module.exports = { requestReturn, getMyReturns };
