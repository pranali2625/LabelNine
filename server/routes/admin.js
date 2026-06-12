const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const { notifyOrderStatus } = require('../utils/orderNotifications');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// ──────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalProducts, revenueResult, pendingOrders, lowStockProducts] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([
        { $match: { 'paymentInfo.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ orderStatus: { $in: ['placed', 'confirmed'] } }),
      Product.findLowStock(10)
    ]);

    const recentOrders = await Order.find({}, { populate: 'user', sort: { createdAt: -1 }, limit: 10 });

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalProducts,
        totalRevenue: revenueResult[0]?.total || 0,
        pendingOrders
      },
      lowStockProducts,
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ──────────────────────────────────────────────────
// ORDER MANAGEMENT
// ──────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (status) query.orderStatus = status;
    if (search) query.orderId = { $regex: search, $options: 'i' };

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query, {
      populate: 'user',
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit: Number(limit)
    });

    res.json({ success: true, total, pages: Math.ceil(total / limit), orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }, { populate: 'user' });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const { status, message, location } = req.body;
    const validStatuses = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'returned'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = status;
    order.trackingHistory.push({
      status,
      message: message || `Order status updated to ${status.replace(/_/g, ' ')}`,
      timestamp: new Date(),
      location: location || ''
    });

    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();
    notifyOrderStatus(order, status, order.user?._id || order.user);
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ──────────────────────────────────────────────────
// USER MANAGEMENT
// ──────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];

    const total = await User.countDocuments(query);
    const users = await User.find(query, {
      sort: { createdAt: -1 },
      skip: (Number(page) - 1) * Number(limit),
      limit: Number(limit)
    });

    res.json({ success: true, total, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ──────────────────────────────────────────────────
// PRODUCT MANAGEMENT (mirrors products route for admin)
// ──────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({}, { sort: { createdAt: -1 } });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
