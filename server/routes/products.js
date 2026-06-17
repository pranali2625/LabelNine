const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

const normalizeImageUrl = (url, req) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `${req.protocol}:${url}`;
  if (url.startsWith('/')) return `${req.protocol}://${req.get('host')}${url}`;
  return `${req.protocol}://${req.get('host')}/${url}`;
};

const formatProduct = (product, req) => {
  const p = product.toObject ? product.toObject() : { ...product };
  p.images = Array.isArray(p.images)
    ? p.images.map((img) => ({
        ...img,
        url: normalizeImageUrl(img.url, req)
      }))
    : [];
  return p;
};

const noStore = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
};

// @route GET /api/products
// @desc  Get all active products with filters
router.get('/', async (req, res) => {
  try {
    noStore(res);
    const { variety, minPrice, maxPrice, size, sort, page = 1, limit = 12, search, featured } = req.query;
    const query = { isActive: true };

    if (variety) query.variety = variety;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (featured === 'true') query.isFeatured = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (size) {
      query['sizes'] = { $elemMatch: { size, stock: { $gt: 0 } } };
    }

    const sortOptions = {
      'price_asc': { price: 1 },
      'price_desc': { price: -1 },
      'newest': { createdAt: -1 },
      'popular': { ratings: -1 }
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query, { sort: sortBy, skip, limit: Number(limit) });

    res.json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      products: products.map((product) => formatProduct(product, req))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/products/:id
// @desc  Get single product
router.get('/:id', async (req, res) => {
  try {
    noStore(res);
    const product = await Product.findOne({
      $or: [
        ...(req.params.id.match(/^\d+$/) ? [{ _id: req.params.id }] : []),
        { slug: req.params.id }
      ],
      isActive: true
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product: formatProduct(product, req) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/products
// @desc  Create product (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/products/:id
// @desc  Update product (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/products/:id
// @desc  Soft-delete product (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PATCH /api/products/:id/stock
// @desc  Update stock for a product (admin only)
router.patch('/:id/stock', protect, adminOnly, async (req, res) => {
  try {
    const { sizes } = req.body; // [{ size, stock }]
    if (!Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({ success: false, message: 'sizes array is required' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    sizes.forEach(({ size, stock }) => {
      const existing = product.sizes.find(s => s.size === size);
      if (existing) {
        existing.stock = stock;
      } else {
        product.sizes.push({ size, stock });
      }
    });
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
