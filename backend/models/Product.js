const mongoose = require('mongoose');

// Each product can have multiple purchasable variants (metal type + purity
// + size), each with its own SKU, price adjustment and stock count. This is
// what lets "18K Gold / Size 14" and "22K Gold / Size 16" be tracked and
// sold as distinct, stock-checked options within a single product listing.
const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    metalType: { type: String, required: true }, // e.g. "18K Gold", "22K Gold", "Platinum"
    size: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: null },
    images: [{ type: String }],
    videos: [{ type: String }],
    metalType: { type: String }, // default/base metal type shown on the card
    metalPurity: { type: String }, // e.g. "18K", "22K", "24K"
    weight: { type: Number }, // grams
    stoneType: { type: String },
    stoneWeight: { type: Number },
    color: { type: String },
    availableSizes: [{ type: String }],
    variants: [variantSchema],
    stock: { type: Number, required: true, min: 0, default: 0 }, // total across variants, kept in sync
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', sku: 'text' });

module.exports = mongoose.model('Product', productSchema);
