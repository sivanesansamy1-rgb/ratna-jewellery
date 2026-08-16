
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ override: true });
const User = require('./models/User');
const connectDB = require('./config/db');

async function run() {
  await connectDB();
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.log("No admin found");
    process.exit();
  }
  
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  const payload = {
    name: "Test Bangle",
    sku: "TEST-" + Date.now(),
    category: "60f7e4f9b8c8d3e1a0d8e9d1",
    description: "The world's precious bangles",
    price: 999,
    discountPrice: 799,
    weight: 7,
    images: ["https://manubhai.in/wp-content/uploads/2025/09/DJBD20163-5.jpg"],
    metalType: "18K",
    metalPurity: "18k",
    color: "yellow gold",
    stoneType: "no",
    stoneWeight: 0,
    availableSizes: ["12", "13", "16"],
    variants: [],
    stock: 0
  };

  const res = await fetch('http://localhost:5000/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  console.log(await res.json());
  process.exit();
}
run();
