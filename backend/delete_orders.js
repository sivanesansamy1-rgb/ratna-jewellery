require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Return = require('./models/Return');

async function deleteOrdersAndReturns() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const orderResult = await Order.deleteMany({});
    console.log(`Successfully deleted ${orderResult.deletedCount} orders.`);

    const returnResult = await Return.deleteMany({});
    console.log(`Successfully deleted ${returnResult.deletedCount} return requests.`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

deleteOrdersAndReturns();
