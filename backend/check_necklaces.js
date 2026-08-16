const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find({}).populate('category');
  const necklaces = products.filter(p => p.category && p.category.name === 'Necklaces');
  console.log('Necklaces in DB:', necklaces.map(p => ({ name: p.name, desc: p.description })));
  process.exit(0);
}
check();
