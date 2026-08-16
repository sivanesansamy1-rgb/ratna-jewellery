const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Order = require('../models/Order');

// Passwords are never selected/returned here — User.find() excludes the
// `password` field by default (select: false on the schema), so plain-text
// or hashed passwords are never exposed to the admin UI.
const adminGetUsers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const query = { role: 'user' };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(100, Number(limit));

  const [items, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * perPage).limit(perPage),
    User.countDocuments(query),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / perPage) });
});

const adminGetUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
  res.json({ user, orders });
});

const setUserBlockedStatus = asyncHandler(async (req, res) => {
  const { isBlocked } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.role === 'admin') return res.status(400).json({ message: 'Admin accounts cannot be blocked.' });

  user.isBlocked = isBlocked;
  await user.save();
  res.json({ user });
});

module.exports = { adminGetUsers, adminGetUserById, setUserBlockedStatus };
