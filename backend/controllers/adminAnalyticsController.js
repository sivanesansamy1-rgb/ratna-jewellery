const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Return = require('../models/Return');

// @route GET /api/admin/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalRevenueAgg,
    totalOrders,
    totalCustomers,
    totalProducts,
    stockAgg,
    lowStockProducts,
    pendingOrders,
    pendingReturns,
    revenueByMonth,
    ordersByMonth,
    topProducts,
  ] = await Promise.all([
    Order.aggregate([{ $match: { paymentStatus: 'Paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments(),
    User.countDocuments({ role: 'user' }),
    Product.countDocuments(),
    Product.aggregate([{ $group: { _id: null, total: { $sum: '$stock' } } }]),
    Product.find({ stock: { $lte: 5, $gt: 0 }, status: 'active' }).select('name sku stock').limit(10),
    Order.countDocuments({ orderStatus: { $in: ['Order Placed', 'Payment Confirmed', 'Processing'] } }),
    Return.countDocuments({ status: 'Requested' }),
    Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    Order.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, unitsSold: { $sum: '$items.quantity' } } },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]),
  ]);

  res.json({
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    totalOrders,
    totalCustomers,
    totalProducts,
    totalStock: stockAgg[0]?.total || 0,
    lowStockProducts,
    pendingOrders,
    pendingReturns,
    revenueByMonth,
    ordersByMonth,
    topProducts,
  });
});

module.exports = { getDashboardStats };
