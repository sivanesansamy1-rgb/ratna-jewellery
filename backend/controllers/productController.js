const asyncHandler = require('../middleware/asyncHandler');
const Product = require('../models/Product');
const Category = require('../models/Category');

// @route GET /api/products
// Supports search, filtering, sorting and pagination entirely on the backend
// so results can never be spoofed or bypassed from the client.
const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    metalType,
    metalPurity,
    stoneType,
    color,
    size,
    minPrice,
    maxPrice,
    rating,
    availability,
    sort,
    page = 1,
    limit = 12,
  } = req.query;

  const query = { status: 'active' };

  if (search) {
    // Check if search term matches any category names
    const matchingCategories = await Category.find({ name: { $regex: search, $options: 'i' } });
    const categoryIds = matchingCategories.map(c => c._id);

    // Find products matching either the product name OR the matched categories (ignoring descriptions)
    const textMatches = await Product.find({ status: 'active', name: { $regex: search, $options: 'i' } }, { _id: 1 });
    const catMatches = await Product.find({ status: 'active', category: { $in: categoryIds } }, { _id: 1 });

    const productIds = [...textMatches, ...catMatches].map(p => p._id);
    query._id = { $in: productIds };
  }
  if (category) query.category = category;
  if (metalType) query.metalType = metalType;
  if (metalPurity) query.metalPurity = metalPurity;
  if (stoneType) query.stoneType = stoneType;
  if (color) query.color = color;
  if (size) query.availableSizes = size;
  if (rating) query.rating = { $gte: Number(rating) };
  if (availability === 'in-stock') query.stock = { $gt: 0 };
  if (availability === 'out-of-stock') query.stock = { $lte: 0 };

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const sortMap = {
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    newest: { createdAt: -1 },
    'best-selling': { numReviews: -1 },
    'top-rated': { rating: -1 },
    featured: { isFeatured: -1, createdAt: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.featured;

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(48, Number(limit));

  const [items, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .sort(sortBy)
      .skip((pageNum - 1) * perPage)
      .limit(perPage),
    Product.countDocuments(query),
  ]);

  res.json({
    items,
    total,
    page: pageNum,
    pages: Math.ceil(total / perPage),
  });
});

// @route GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ product });
});

// @route GET /api/products/meta/facets
// Returns the distinct values available for building filter UI (metal
// types, stone types, colours, sizes) so the frontend filter panel always
// reflects real catalogue data instead of a hardcoded list.
const getFacets = asyncHandler(async (req, res) => {
  const [metalTypes, stoneTypes, colors, sizes, categories] = await Promise.all([
    Product.distinct('metalType', { status: 'active' }),
    Product.distinct('stoneType', { status: 'active' }),
    Product.distinct('color', { status: 'active' }),
    Product.distinct('availableSizes', { status: 'active' }),
    Category.find({ isActive: true }).select('name slug'),
  ]);
  res.json({ metalTypes, stoneTypes, colors, sizes, categories });
});

module.exports = { getProducts, getProductById, getFacets };
