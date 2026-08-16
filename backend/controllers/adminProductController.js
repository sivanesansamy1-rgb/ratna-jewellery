const asyncHandler = require('../middleware/asyncHandler');
const Product = require('../models/Product');

// @route POST /api/admin/products
const createProduct = asyncHandler(async (req, res) => {
  const body = req.body;
  if (body.variants && body.variants.length > 0) {
    body.stock = body.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
  }
  const product = await Product.create(body);
  res.status(201).json({ product });
});

// @route GET /api/admin/products
const adminGetProducts = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) query.$text = { $search: search };

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(100, Number(limit));

  const [items, total] = await Promise.all([
    Product.find(query).populate('category', 'name').sort({ createdAt: -1 }).skip((pageNum - 1) * perPage).limit(perPage),
    Product.countDocuments(query),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / perPage) });
});

// @route PUT /api/admin/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  Object.assign(product, req.body);
  if (product.variants && product.variants.length > 0) {
    product.stock = product.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
  }
  await product.save();
  res.json({ product });
});

// @route DELETE /api/admin/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  await product.deleteOne();
  res.json({ message: 'Product deleted.' });
});

// @route PUT /api/admin/products/:id/status
// Handles activate/deactivate, featured/bestseller/new-arrival toggles.
const toggleProductFlags = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  const allowed = ['status', 'isFeatured', 'isBestseller', 'isNewArrival'];
  allowed.forEach((key) => {
    if (key in req.body) product[key] = req.body[key];
  });
  await product.save();
  res.json({ product });
});

// @route PUT /api/admin/products/:id/inventory
const updateInventory = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  const { variantSku, stock } = req.body;
  if (variantSku) {
    const variant = product.variants.find((v) => v.sku === variantSku);
    if (!variant) return res.status(404).json({ message: 'Variant not found.' });
    variant.stock = stock;
    product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  } else {
    product.stock = stock;
  }
  await product.save();
  res.json({ product });
});

module.exports = {
  createProduct,
  adminGetProducts,
  updateProduct,
  deleteProduct,
  toggleProductFlags,
  updateInventory,
};
