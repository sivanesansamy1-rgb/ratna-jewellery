require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const order = await Order.findOne({}).populate('user', 'name email phone');
    if (!order) {
      console.log('No orders found');
      return;
    }
    const customerEmail = (order.contactInfo && order.contactInfo.email) || (order.user && order.user.email);
    console.log('Customer Email resolved to:', customerEmail);
    console.log('User object:', order.user);
    console.log('Contact info:', order.contactInfo);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
})();
