const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const order = await Order.findOne({ orderId: 'JEW19986' });
  order.orderStatus = 'Refunded';
  await order.save();
  console.log('Fixed JEW19986 orderStatus to Refunded');
  process.exit(0);
}
fix();
