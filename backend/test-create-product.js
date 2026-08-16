const mongoose = require('mongoose');
const Product = require('./models/Product');

async function run() {
  try {
    const payload = {
      name: "Test Bangle",
      sku: "TEST-" + Date.now(),
      category: new mongoose.Types.ObjectId(), // fake but valid objectid
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
    const product = new Product(payload);
    await product.validate();
    console.log("Validation passed!");
  } catch (err) {
    console.log("Validation error:");
    console.log(err.message);
  }
}
run();
