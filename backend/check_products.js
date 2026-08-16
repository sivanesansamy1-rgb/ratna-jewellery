const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const count = await Product.countDocuments({ status: 'active' });
  console.log('Active Products:', count);
  process.exit(0);
}
check();
