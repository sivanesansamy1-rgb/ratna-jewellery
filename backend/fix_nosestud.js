const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.updateOne(
    { name: 'Kavya Kundan NoseStunds' },
    { $set: { description: 'A beautiful traditional kundan NoseStund with intricate detailing.' } }
  );
  console.log('Fixed NoseStunds description in DB');
  process.exit(0);
}
fix();
