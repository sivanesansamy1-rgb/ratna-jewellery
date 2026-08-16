require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const Return = require('./models/Return');
const Review = require('./models/Review');
const Cart = require('./models/Cart');

async function resetData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Delete all non-admin users
    const usersResult = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`Deleted ${usersResult.deletedCount} user accounts.`);

    // 2. Delete all orders
    const ordersResult = await Order.deleteMany({});
    console.log(`Deleted ${ordersResult.deletedCount} orders.`);

    // 3. Delete all returns
    const returnsResult = await Return.deleteMany({});
    console.log(`Deleted ${returnsResult.deletedCount} return requests.`);

    // 4. Delete all reviews (optional but recommended when users are deleted)
    const reviewsResult = await Review.deleteMany({});
    console.log(`Deleted ${reviewsResult.deletedCount} reviews.`);

    // 5. Delete all carts (optional but recommended)
    const cartsResult = await Cart.deleteMany({});
    console.log(`Deleted ${cartsResult.deletedCount} carts.`);

    console.log('Database successfully reset. Ready for a new start.');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  }
}

resetData();
