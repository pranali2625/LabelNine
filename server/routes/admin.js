const express = require('express');
const multer = require('multer');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const { notifyOrderStatus } = require('../utils/orderNotifications');
const { restoreOrderStock } = require('../utils/orderStock');
const { storeProductImage, getStorageInfo } = require('../utils/imageUpload');
const { formatProductImages } = require('../utils/formatImageUrls');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
});

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

    const previousStatus = order.orderStatus;
    order.orderStatus = status;
    order.trackingHistory.push({
      status,
      message: message || `Order status updated to ${status.replace(/_/g, ' ')}`,
      timestamp: new Date(),
      location: location || ''
    });

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      if (order.paymentInfo?.method === 'COD' && order.paymentInfo.status === 'pending') {
        order.paymentInfo.status = 'paid';
        order.paymentInfo.paidAt = new Date();
      }
    }

    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      await restoreOrderStock(order.items);
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
    res.json({
      success: true,
      products: products.map((product) => {
        const p = product.toObject ? product.toObject() : { ...product };
        p.images = formatProductImages(p.images, req);
        return p;
      })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/upload-image', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    try {
      const result = await storeProductImage(req.file, req);
      res.json({ success: true, url: result.url, storage: result.storage });
    } catch (uploadErr) {
      res.status(uploadErr.message === 'No image file provided' ? 400 : 500).json({
        success: false,
        message: uploadErr.message
      });
    }
  });
});

router.get('/storage-info', (_req, res) => {
  const info = getStorageInfo();
  res.json({
    success: true,
    ...info,
    hint: 'Images are stored on disk outside public_html and survive Hostinger redeploys.'
  });
});

module.exports = router;
