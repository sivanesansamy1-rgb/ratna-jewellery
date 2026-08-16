const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const order = await Order.findOne({ orderId: 'JEW19986' });
  console.log('Order orderStatus:', order.orderStatus);
  process.exit(0);
}
check();
