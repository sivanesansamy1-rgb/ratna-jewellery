const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
    metalType: { type: String },
    size: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: true }
);

const STATUS_FLOW = [
  'Order Placed',
  'Payment Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Return Requested',
  'Approved',
  'Rejected',
  'Returned',
  'Refunded',
  'Cancelled',
];

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    contactInfo: {
      name: String,
      email: String,
      phone: String,
    },
    shippingAddress: {
      line1: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: {
      code: String,
      discountType: String,
      discountValue: Number,
    },
    paymentMethod: { type: String, enum: ['Card', 'UPI', 'NetBanking', 'Wallet', 'COD'], required: true },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
    paymentInfo: {
      provider: { type: String, default: 'Razorpay' },
      orderId: String, // provider-side order id
      paymentId: String, // provider-side payment id
      signature: String,
    },
    orderStatus: { type: String, enum: STATUS_FLOW, default: 'Order Placed' },
    statusHistory: [
      {
        status: { type: String },
        note: { type: String },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

orderSchema.statics.STATUS_FLOW = STATUS_FLOW;

module.exports = mongoose.model('Order', orderSchema);
