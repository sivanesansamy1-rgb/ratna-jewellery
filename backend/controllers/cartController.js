const asyncHandler = require('../middleware/asyncHandler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

const TAX_RATE = 0.03; // 3% GST on jewellery (illustrative default)
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 150;

// Recomputes totals server-side. The frontend displays these numbers but
// never decides them — the backend is always the source of truth for money.
const computeTotals = async (cart) => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discount = 0;
  if (cart.coupon && cart.coupon.code) {
    const coupon = await Coupon.findOne({ code: cart.coupon.code, isActive: true });
    const now = new Date();
    if (coupon && coupon.startDate <= now && coupon.expiryDate >= now && subtotal >= coupon.minOrderValue) {
      discount =
        coupon.discountType === 'percentage'
          ? (subtotal * coupon.discountValue) / 100
          : coupon.discountValue;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      cart.coupon = undefined; // coupon no longer valid, drop it silently
    }
  }

  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = Math.round(taxableAmount * TAX_RATE);
  const shippingFee = subtotal === 0 || taxableAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = Math.round(taxableAmount + tax + shippingFee);

  return { subtotal: Math.round(subtotal), discount: Math.round(discount), tax, shippingFee, total };
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

// @route GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const totals = await computeTotals(cart);
  res.json({ cart, totals });
});

// @route POST /api/cart
const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantSku, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || product.status !== 'active') {
    return res.status(404).json({ message: 'Product not available.' });
  }

  const variant = product.variants.find((v) => v.sku === variantSku) || {
    sku: product.sku,
    metalType: product.metalType,
    size: '',
    price: product.discountPrice || product.price,
    stock: product.stock,
  };

  if (variant.stock < quantity) {
    return res.status(400).json({ message: `Only ${variant.stock} unit(s) left in stock for this option.` });
  }

  const cart = await getOrCreateCart(req.user._id);
  const existingItem = cart.items.find((i) => i.variantSku === variant.sku);

  if (existingItem) {
    if (variant.stock < existingItem.quantity + Number(quantity)) {
      return res.status(400).json({ message: 'Not enough stock available for the requested quantity.' });
    }
    existingItem.quantity += Number(quantity);
  } else {
    cart.items.push({
      product: product._id,
      variantSku: variant.sku,
      name: product.name,
      image: product.images[0] || '',
      metalType: variant.metalType,
      size: variant.size,
      price: variant.price,
      quantity: Number(quantity),
    });
  }

  await cart.save();
  const totals = await computeTotals(cart);
  res.status(201).json({ cart, totals });
});

// @route PUT /api/cart/:itemId
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Cart item not found.' });

  const product = await Product.findById(item.product);
  const variant = product?.variants.find((v) => v.sku === item.variantSku);
  const availableStock = variant ? variant.stock : product?.stock ?? 0;

  if (quantity > availableStock) {
    return res.status(400).json({ message: `Only ${availableStock} unit(s) available.` });
  }
  if (quantity <= 0) {
    cart.items.pull(item._id);
  } else {
    item.quantity = quantity;
  }

  await cart.save();
  const totals = await computeTotals(cart);
  res.json({ cart, totals });
});

// @route DELETE /api/cart/:itemId
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items.pull(req.params.itemId);
  await cart.save();
  const totals = await computeTotals(cart);
  res.json({ cart, totals });
});

// @route POST /api/cart/coupon
const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const coupon = await Coupon.findOne({ code: (code || '').toUpperCase(), isActive: true });
  const now = new Date();

  if (!coupon) return res.status(404).json({ message: 'Invalid coupon code.' });
  if (coupon.startDate > now || coupon.expiryDate < now) {
    return res.status(400).json({ message: 'This coupon has expired or is not yet active.' });
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
  }
  if (subtotal < coupon.minOrderValue) {
    return res.status(400).json({ message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon.` });
  }

  cart.coupon = { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue };
  await cart.save();
  const totals = await computeTotals(cart);
  res.json({ cart, totals });
});

// @route DELETE /api/cart/coupon
const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.coupon = undefined;
  await cart.save();
  const totals = await computeTotals(cart);
  res.json({ cart, totals });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  applyCoupon,
  removeCoupon,
  computeTotals, // exported for reuse during checkout
  getOrCreateCart,
};
