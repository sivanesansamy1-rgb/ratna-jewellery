require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const sendEmail = require('./utils/sendEmail');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const order = await Order.findOne({ 'contactInfo.email': 'sivanesansamy1@gmail.com' }).populate('user', 'name email phone');
    if (!order) {
      console.log('No orders found for sivanesansamy1@gmail.com');
      return;
    }
    
    const customerEmail = (order.contactInfo && order.contactInfo.email) || (order.user && order.user.email);
    console.log('Resolved customer email:', customerEmail);
    
    console.log('Attempting to send email...');
    await sendEmail({
      email: customerEmail,
      subject: `Order Status Update: Shipped`,
      html: `<p>Testing order update email</p>`
    });
    console.log('Successfully sent email for order status update');
    
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    mongoose.disconnect();
  }
})();
