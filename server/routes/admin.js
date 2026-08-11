const express = require('express');
const multer = require('multer');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const { notifyOrderStatus } = require('../utils/orderNotifications');
const { restoreOrderStock } = require('../utils/orderStock');
const {
  createShiprocketShipment,
  assignShiprocketAwb,
  getShiprocketLabel,
  syncTrackingFromAwb
} = require('../utils/shiprocketOrders');
const shiprocket = require('../utils/shiprocket');
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

router.post('/orders/:orderId/shiprocket/create', async (req, res) => {
  try {
    const configError = shiprocket.configError();
    if (configError) {
      return res.status(503).json({ success: false, message: configError });
    }

    const order = await Order.findOne({ orderId: req.params.orderId }, { populate: 'user' });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const updated = await createShiprocketShipment(order);
    res.json({ success: true, order: updated, message: 'Order created in Shiprocket' });
  } catch (err) {
    console.error('Shiprocket create error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/orders/:orderId/shiprocket/assign-awb', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const updated = await assignShiprocketAwb(order, req.body.courierId);
    res.json({ success: true, order: updated, message: 'AWB assigned' });
  } catch (err) {
    console.error('Shiprocket AWB error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/orders/:orderId/shiprocket/label', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const { labelUrl } = await getShiprocketLabel(order);
    if (!labelUrl) {
      return res.status(404).json({ success: false, message: 'Label not available yet' });
    }
    res.json({ success: true, labelUrl });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/orders/:orderId/shiprocket/sync-tracking', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const result = await syncTrackingFromAwb(order);
    res.json({ success: true, order: result.order, tracking: result.tracking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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

// ──────────────────────────────────────────────────
// INVITE COUPONS (first-order, allowlisted customers)
// ──────────────────────────────────────────────────
router.get('/coupons', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const [coupons] = await pool.query(
      `SELECT c.id, c.code, c.discount_percent, c.first_order_only, c.is_active,
              c.is_public, c.created_at,
              COUNT(DISTINCT cc.id) AS customer_count,
              SUM(CASE WHEN cc.used_at IS NOT NULL THEN 1 ELSE 0 END) AS used_count,
              (SELECT COUNT(*) FROM invite_coupon_products cp WHERE cp.coupon_id = c.id) AS product_count
       FROM invite_coupons c
       LEFT JOIN invite_coupon_customers cc ON cc.coupon_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json({
      success: true,
      coupons: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountPercent: Number(c.discount_percent),
        firstOrderOnly: Boolean(c.first_order_only),
        isPublic: Boolean(c.is_public),
        isActive: Boolean(c.is_active),
        customerCount: Number(c.customer_count || 0),
        usedCount: Number(c.used_count || 0),
        productCount: Number(c.product_count || 0),
        createdAt: c.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { normalizeCouponCode } = require('../utils/inviteCoupon');
    const code = normalizeCouponCode(req.body?.code);
    const discountPercent = Number(req.body?.discountPercent ?? 10);
    const isPublic = Boolean(req.body?.isPublic);
    const firstOrderOnly = isPublic
      ? Boolean(req.body?.firstOrderOnly)
      : req.body?.firstOrderOnly !== false;
    const productIds = Array.isArray(req.body?.productIds)
      ? [...new Set(req.body.productIds.map((id) => Number(id)).filter(Boolean))]
      : [];

    if (!code || code.length < 3) {
      return res.status(400).json({ success: false, message: 'Coupon code must be at least 3 characters' });
    }
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return res.status(400).json({ success: false, message: 'Discount must be between 1 and 100' });
    }

    const [result] = await pool.query(
      `INSERT INTO invite_coupons
        (code, discount_percent, first_order_only, is_active, is_public, exclude_discounted_products)
       VALUES (?, ?, ?, 1, ?, 0)`,
      [code, discountPercent, firstOrderOnly ? 1 : 0, isPublic ? 1 : 0]
    );

    if (productIds.length) {
      for (const productId of productIds) {
        await pool.query(
          `INSERT IGNORE INTO invite_coupon_products (coupon_id, product_id) VALUES (?, ?)`,
          [result.insertId, productId]
        );
      }
    }

    res.status(201).json({
      success: true,
      coupon: {
        id: result.insertId,
        code,
        discountPercent,
        firstOrderOnly,
        isPublic,
        isActive: true,
        customerCount: 0,
        usedCount: 0,
        productCount: productIds.length
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/coupons/:code', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { normalizeCouponCode } = require('../utils/inviteCoupon');
    const code = normalizeCouponCode(req.params.code);
    const [coupons] = await pool.query(
      `SELECT id, code, is_active FROM invite_coupons WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const updates = [];
    const values = [];
    if (typeof req.body?.isActive === 'boolean') {
      updates.push('is_active = ?');
      values.push(req.body.isActive ? 1 : 0);
    }
    if (req.body?.discountPercent != null) {
      const percent = Number(req.body.discountPercent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return res.status(400).json({ success: false, message: 'Discount must be between 1 and 100' });
      }
      updates.push('discount_percent = ?');
      values.push(percent);
    }
    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    values.push(coupons[0].id);
    await pool.query(`UPDATE invite_coupons SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query(
      `SELECT id, code, discount_percent, first_order_only, is_active, is_public
       FROM invite_coupons WHERE id = ?`,
      [coupons[0].id]
    );
    const c = updated[0];
    res.json({
      success: true,
      coupon: {
        id: c.id,
        code: c.code,
        discountPercent: Number(c.discount_percent),
        firstOrderOnly: Boolean(c.first_order_only),
        isPublic: Boolean(c.is_public),
        isActive: Boolean(c.is_active)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/coupons/:code/products', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { normalizeCouponCode, loadCouponProductIds } = require('../utils/inviteCoupon');
    const code = normalizeCouponCode(req.params.code);
    const [coupons] = await pool.query(
      `SELECT id, code FROM invite_coupons WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    const productIds = await loadCouponProductIds(coupons[0].id);
    res.json({
      success: true,
      code: coupons[0].code,
      productIds,
      appliesToAll: productIds.length === 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/coupons/:code/products', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { normalizeCouponCode } = require('../utils/inviteCoupon');
    const code = normalizeCouponCode(req.params.code);
    const [coupons] = await pool.query(
      `SELECT id, code FROM invite_coupons WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const productIds = Array.isArray(req.body?.productIds)
      ? [...new Set(req.body.productIds.map((id) => Number(id)).filter(Boolean))]
      : [];

    await pool.query(`DELETE FROM invite_coupon_products WHERE coupon_id = ?`, [coupons[0].id]);
    for (const productId of productIds) {
      await pool.query(
        `INSERT INTO invite_coupon_products (coupon_id, product_id) VALUES (?, ?)`,
        [coupons[0].id, productId]
      );
    }

    res.json({
      success: true,
      code: coupons[0].code,
      productIds,
      appliesToAll: productIds.length === 0,
      productCount: productIds.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/coupons/:code/customers', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { normalizeCouponCode } = require('../utils/inviteCoupon');
    const code = normalizeCouponCode(req.params.code);
    const [coupons] = await pool.query(
      `SELECT id, code FROM invite_coupons WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    const [customers] = await pool.query(
      `SELECT id, email, phone, used_at, used_order_id, created_at
       FROM invite_coupon_customers
       WHERE coupon_id = ?
       ORDER BY id ASC`,
      [coupons[0].id]
    );
    res.json({
      success: true,
      code: coupons[0].code,
      customers: customers.map((row) => ({
        id: row.id,
        email: row.email,
        phone: row.phone,
        usedAt: row.used_at,
        usedOrderId: row.used_order_id,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/coupons/:code/customers', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { normalizeCouponCode } = require('../utils/inviteCoupon');
    const { normalizeEmail, normalizePhone } = require('../utils/authNormalize');
    const code = normalizeCouponCode(req.params.code);
    const [coupons] = await pool.query(
      `SELECT id, code FROM invite_coupons WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const raw = Array.isArray(req.body?.customers)
      ? req.body.customers
      : [{ email: req.body?.email, phone: req.body?.phone }];

    const inserted = [];
    for (const row of raw) {
      const email = normalizeEmail(row.email);
      const phone = normalizePhone(row.phone);
      if (!email && !phone) continue;
      const [result] = await pool.query(
        `INSERT INTO invite_coupon_customers (coupon_id, email, phone)
         VALUES (?, ?, ?)`,
        [coupons[0].id, email || null, phone || null]
      );
      inserted.push({ id: result.insertId, email: email || null, phone: phone || null });
    }

    if (!inserted.length) {
      return res.status(400).json({ success: false, message: 'Provide at least one email or phone' });
    }

    res.status(201).json({
      success: true,
      code: coupons[0].code,
      added: inserted.length,
      customers: inserted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/coupons/:code/customers/:customerId', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { normalizeCouponCode } = require('../utils/inviteCoupon');
    const code = normalizeCouponCode(req.params.code);
    const customerId = Number(req.params.customerId);
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Invalid customer id' });
    }

    const [coupons] = await pool.query(
      `SELECT id FROM invite_coupons WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const [result] = await pool.query(
      `DELETE FROM invite_coupon_customers
       WHERE id = ? AND coupon_id = ? AND used_at IS NULL`,
      [customerId, coupons[0].id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found or coupon already used (cannot remove)'
      });
    }

    res.json({ success: true, message: 'Customer removed from allowlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
