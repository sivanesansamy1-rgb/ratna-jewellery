require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const sendEmail = require('./utils/sendEmail');
const User = require('./models/User'); // Required for populate

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const order = await Order.findOne({'contactInfo.email': 'sivanesansamy1@gmail.com'}).populate('user', 'name email phone');
    if (!order) {
      console.log('No orders found');
      return;
    }
    
    const customerEmail = (order.contactInfo && order.contactInfo.email) || (order.user && order.user.email);
    const customerName = (order.contactInfo && order.contactInfo.name) || (order.user && order.user.name) || 'Customer';
    const status = 'Shipped';
    const note = '';

    console.log('Attempting to send email to:', customerEmail);
    await sendEmail({
      email: customerEmail,
      subject: `Order Status Update: ${status}`,
      html: `<p>Hi ${customerName},</p>
             <p>The status of your order (<strong>${order.orderId}</strong>) has been updated to: <strong>${status}</strong>.</p>
             ${note ? `<p>Note: ${note}</p>` : ''}
             <p><a href="http://localhost:5500/user/account.html">View My Orders</a></p>`
    });
    console.log('Successfully sent email');
    
  } catch (err) {
    console.error('Failed to send email:', err);
  } finally {
    mongoose.disconnect();
  }
})();
