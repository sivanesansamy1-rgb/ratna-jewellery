const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');

const adminGetOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.orderStatus = status;

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(100, Number(limit));

  const [items, total] = await Promise.all([
    Order.find(query).populate('user', 'name email').sort({ createdAt: -1 }).skip((pageNum - 1) * perPage).limit(perPage),
    Order.countDocuments(query),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / perPage) });
});

const adminGetOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  res.json({ order });
});

const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

// Enforces the fixed status flow defined in the Order model rather than
// allowing arbitrary status jumps.
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (!Order.STATUS_FLOW.includes(status)) {
    return res.status(400).json({ message: 'Invalid order status.' });
  }

  order.orderStatus = status;
  order.statusHistory.push({ status, note });
  if (status === 'Payment Confirmed') order.paymentStatus = 'Paid';
  if (status === 'Delivered' && order.paymentMethod === 'COD') order.paymentStatus = 'Paid';
  if (status === 'Cancelled') order.cancelledAt = new Date();
  await order.save();
  
  const customerEmail = (order.user && order.user.email);
  const customerPhone = (order.user && order.user.phone);
  const customerName = (order.user && order.user.name) || 'Customer';

  try {
    if (customerEmail) {
      await sendEmail({
        email: customerEmail,
        subject: `Order Status Update: ${status}`,
        html: `<p>Hi ${customerName},</p>
               <p>The status of your order (<strong>${order.orderId}</strong>) has been updated to: <strong>${status}</strong>.</p>
               ${note ? `<p>Note: ${note}</p>` : ''}
               <p><a href="http://localhost:5500/user/account.html">View My Orders</a></p>`
      });
    }
    if (customerPhone) {
      await sendSMS({
        phone: customerPhone,
        message: `Hi ${customerName}, your RATNA order (${order.orderId}) is now: ${status}.${note ? ` Note: ${note}` : ''} View details: http://localhost:5500/user/account.html`
      });
    }
  } catch (err) {
    console.error('Failed to send order status notification', err);
  }

  res.json({ order, emailSentTo: customerEmail, smsSentTo: customerPhone });
});

const adminCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) return res.status(404).json({ message: 'Order not found.' });

  order.orderStatus = 'Cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled by admin';
  order.statusHistory.push({ status: 'Cancelled', note: order.cancelReason });
  await order.save();

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (variant) variant.stock += item.quantity;
    else product.stock += item.quantity;
    if (product.variants.length > 0) product.stock = product.variants.reduce((s, v) => s + v.stock, 0);
    await product.save();
  }
  
  const customerEmail = (order.user && order.user.email);
  const customerPhone = (order.user && order.user.phone);
  const customerName = (order.user && order.user.name) || 'Customer';

  try {
    if (customerEmail) {
      await sendEmail({
        email: customerEmail,
        subject: `Order Cancelled`,
        html: `<p>Hi ${customerName},</p>
               <p>Your order (<strong>${order.orderId}</strong>) has been cancelled.</p>
               <p>Reason: ${order.cancelReason}</p>
               <p><a href="http://localhost:5500/user/account.html">View My Orders</a></p>`
      });
    }
    if (customerPhone) {
      await sendSMS({
        phone: customerPhone,
        message: `Hi ${customerName}, your RATNA order (${order.orderId}) has been cancelled. Reason: ${order.cancelReason}. View details: http://localhost:5500/user/account.html`
      });
    }
  } catch (err) {
    console.error('Failed to send order cancellation notification', err);
  }

  res.json({ order });
});

module.exports = { adminGetOrders, adminGetOrderById, updateOrderStatus, adminCancelOrder };
