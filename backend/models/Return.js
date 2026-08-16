const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
      },
    ],
    type: { type: String, enum: ['return', 'exchange'], default: 'return' },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected', 'Returned', 'Quality Check', 'Refunded'],
      default: 'Requested',
    },
    refundAmount: { type: Number, default: 0 },
    adminNote: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Return', returnSchema);
