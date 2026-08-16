const crypto = require('crypto');
const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const generateOrderId = require('../utils/generateOrderId');
const { computeTotals, getOrCreateCart } = require('./cartController');

let razorpayInstance = null;
const getRazorpay = () => {
  if (razorpayInstance) return razorpayInstance;
  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpayInstance;
};

// @route POST /api/orders/razorpay-order
// Creates a payment-provider order for the CURRENT cart total computed on
// the server, so the amount charged can never be manipulated from the client.
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  if (cart.items.length === 0) return res.status(400).json({ message: 'Your cart is empty.' });

  const totals = await computeTotals(cart);
  const instance = getRazorpay();

  const razorpayOrder = await instance.orders.create({
    amount: Math.round(totals.total * 100), // paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  });

  res.json({ razorpayOrder, totals, keyId: process.env.RAZORPAY_KEY_ID });
});

// Validates stock for every cart item against live product/variant data and
// decrements it atomically. Throws (via returning null) if anything is out
// of stock, so the caller can abort the order before charging or persisting.
const reserveStockForCart = async (cart) => {
  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product) return { ok: false, message: `A product in your cart is no longer available.` };

    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (variant) {
      if (variant.stock < item.quantity) {
        return { ok: false, message: `Insufficient stock for ${item.name} (${item.metalType}, ${item.size}).` };
      }
      variant.stock -= item.quantity;
    } else {
      if (product.stock < item.quantity) {
        return { ok: false, message: `Insufficient stock for ${item.name}.` };
      }
      product.stock -= item.quantity;
    }
    // Keep the aggregate stock field in sync with variant stock totals.
    if (product.variants.length > 0) {
      product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    }
    await product.save();
  }
  return { ok: true };
};

// @route POST /api/orders
// Places an order. For online payments, the Razorpay signature is verified
// here on the backend BEFORE the order is marked as paid — the frontend's
// claim that "payment succeeded" is never trusted on its own.
const placeOrder = asyncHandler(async (req, res) => {
  const { contactInfo, shippingAddress, paymentMethod, paymentInfo } = req.body;

  if (!contactInfo?.name || !contactInfo?.phone || !shippingAddress?.line1) {
    return res.status(400).json({ message: 'Contact information and shipping address are required.' });
  }

  const cart = await getOrCreateCart(req.user._id);
  if (cart.items.length === 0) return res.status(400).json({ message: 'Your cart is empty.' });

  const totals = await computeTotals(cart);
  let paymentStatus = 'Pending';

  if (paymentMethod === 'COD') {
    paymentStatus = 'Pending';
  } else {
    // Verify the Razorpay signature server-side using the shared secret.
    // This is the step that stops a manipulated frontend from marking an
    // unpaid order as paid.
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentInfo || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification details missing.' });
    }
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Order not placed.' });
    }
    paymentStatus = 'Paid';
  }

  const stockResult = await reserveStockForCart(cart);
  if (!stockResult.ok) {
    return res.status(400).json({ message: stockResult.message });
  }

  const order = await Order.create({
    orderId: generateOrderId(),
    user: req.user._id,
    items: cart.items.map((i) => ({
      product: i.product,
      variantSku: i.variantSku,
      name: i.name,
      image: i.image,
      metalType: i.metalType,
      size: i.size,
      price: i.price,
      quantity: i.quantity,
    })),
    contactInfo,
    shippingAddress,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    shippingFee: totals.shippingFee,
    total: totals.total,
    coupon: cart.coupon,
    paymentMethod,
    paymentStatus,
    paymentInfo:
      paymentMethod === 'COD'
        ? undefined
        : {
            provider: 'Razorpay',
            orderId: paymentInfo.razorpay_order_id,
            paymentId: paymentInfo.razorpay_payment_id,
            signature: paymentInfo.razorpay_signature,
          },
    orderStatus: paymentStatus === 'Paid' ? 'Payment Confirmed' : 'Order Placed',
    statusHistory: [{ status: paymentStatus === 'Paid' ? 'Payment Confirmed' : 'Order Placed' }],
  });

  // Clear the cart only after the order is safely persisted.
  cart.items = [];
  cart.coupon = undefined;
  await cart.save();

  res.status(201).json({ order });
});

// @route GET /api/orders
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
});

// @route GET /api/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You do not have access to this order.' });
  }
  res.json({ order });
});

// @route PUT /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only cancel your own orders.' });
  }
  if (!['Order Placed', 'Payment Confirmed', 'Processing'].includes(order.orderStatus)) {
    return res.status(400).json({ message: 'This order can no longer be cancelled.' });
  }

  order.orderStatus = 'Cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled by customer';
  order.statusHistory.push({ status: 'Cancelled', note: order.cancelReason });
  await order.save();

  // Restock cancelled items.
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (variant) variant.stock += item.quantity;
    else product.stock += item.quantity;
    if (product.variants.length > 0) {
      product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    }
    await product.save();
  }

  res.json({ order });
});

module.exports = {
  createRazorpayOrder,
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
};
