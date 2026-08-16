const asyncHandler = require('../middleware/asyncHandler');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId }).populate('products');
  if (!wishlist) wishlist = await (await Wishlist.create({ user: userId, products: [] })).populate('products');
  return wishlist;
};

// @route GET /api/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  res.json({ wishlist });
});

// @route POST /api/wishlist
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [] });

  if (!wishlist.products.includes(productId)) {
    wishlist.products.push(productId);
    await wishlist.save();
  }
  await wishlist.populate('products');
  res.status(201).json({ wishlist });
});

// @route DELETE /api/wishlist/:productId
const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (wishlist) {
    wishlist.products = wishlist.products.filter((p) => p.toString() !== req.params.productId);
    await wishlist.save();
  }
  await wishlist.populate('products');
  res.json({ wishlist });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
