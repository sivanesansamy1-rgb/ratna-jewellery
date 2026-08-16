const asyncHandler = require('../middleware/asyncHandler');
const Return = require('../models/Return');
const Product = require('../models/Product');
const Order = require('../models/Order');

const adminGetReturns = asyncHandler(async (req, res) => {
  const returns = await Return.find()
    .populate('user', 'name email')
    .populate('order', 'orderId total')
    .sort({ createdAt: -1 });
  res.json({ returns });
});

const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

// Moves a return through: Requested -> Approved/Rejected -> Returned ->
// Quality Check -> Refunded. Restocks items and marks the order refunded
// once a refund is actually issued.
const updateReturnStatus = asyncHandler(async (req, res) => {
  const { status, adminNote, refundAmount } = req.body;
  const ret = await Return.findById(req.params.id).populate('user', 'name email phone').populate('order', 'orderId contactInfo');
  if (!ret) return res.status(404).json({ message: 'Return request not found.' });

  ret.status = status;
  if (adminNote) ret.adminNote = adminNote;
  if (refundAmount !== undefined) ret.refundAmount = refundAmount;

  if (status === 'Returned') {
    for (const item of ret.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }
  }

  const orderUpdate = { orderStatus: status };
  if (status === 'Refunded') {
    orderUpdate.paymentStatus = 'Refunded';
  }
  await Order.findByIdAndUpdate(ret.order._id || ret.order, orderUpdate);

  await ret.save();

  try {
    if (ret.user && ret.user.email) {
      await sendEmail({
        email: ret.user.email,
        subject: `Return Request Update: ${status}`,
        html: `<p>Hi ${ret.user.name},</p>
               <p>The status of your return request for order <strong>${ret.order ? ret.order.orderId : 'Unknown'}</strong> has been updated to: <strong>${status}</strong>.</p>
               ${adminNote ? `<p>Note from our team: ${adminNote}</p>` : ''}
               ${refundAmount ? `<p>Refund Amount: ₹${refundAmount}</p>` : ''}
               <p><a href="http://localhost:5500/user/account.html">View My Orders</a></p>`
      });
    }
    const phone = (ret.order && ret.order.contactInfo && ret.order.contactInfo.phone) || (ret.user && ret.user.phone);
    if (phone) {
      await sendSMS({
        phone: phone,
        message: `Hi ${ret.user.name}, your return request for order ${ret.order ? ret.order.orderId : 'Unknown'} is now: ${status}.${adminNote ? ` Note: ${adminNote}` : ''} View details: http://localhost:5500/user/account.html`
      });
    }
  } catch (err) {
    console.error('Failed to send return status notification', err);
  }

  res.json({ return: ret });
});

module.exports = { adminGetReturns, updateReturnStatus };
