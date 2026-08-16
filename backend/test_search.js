const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const search = 'necklaces';
  const query = { status: 'active' };

  if (search) {
    const matchingCategories = await Category.find({ name: { $regex: search, $options: 'i' } });
    const categoryIds = matchingCategories.map(c => c._id);
    
    const textMatches = await Product.find({ status: 'active', $text: { $search: search } }, { _id: 1 });
    const catMatches = await Product.find({ status: 'active', category: { $in: categoryIds } }, { _id: 1 });
    
    const productIds = [...textMatches, ...catMatches].map(p => p._id);
    query._id = { $in: productIds };
  }
  
  try {
    const products = await Product.find(query);
    console.log('Results:', products.map(p => p.name));
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}
check();
