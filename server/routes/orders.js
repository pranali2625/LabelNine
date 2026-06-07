const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { generateOrderId, calculatePrices } = require('../utils/helpers');

// @route POST /api/orders
// @desc  Place a new order
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod = 'UPI' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    // Validate stock and build order items
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      const sizeEntry = product.sizes.find(s => s.size === item.size);
      if (!sizeEntry || sizeEntry.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} (${item.size})`
        });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        size: item.size,
        quantity: item.quantity,
        price: product.discountedPrice || product.price
      });
    }

    const { itemsPrice, shippingPrice, taxPrice, totalAmount } = calculatePrices(orderItems);

    const order = await Order.create({
      orderId: generateOrderId(),
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalAmount,
      paymentInfo: { method: paymentMethod }
    });

    // Deduct stock
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': -item.quantity } }
      );
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/orders/my
// @desc  Get logged-in user's orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find(
      { user: req.user._id },
      { populate: 'items.product', sort: { createdAt: -1 } }
    );
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/orders/track/:orderId
// @desc  Public order tracking by orderId
router.get('/track/:orderId', async (req, res) => {
  try {
    const order = await Order.findForTracking(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found. Check your order ID.' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/orders/:id
// @desc  Get order details (owner only)
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [
        ...(req.params.id.match(/^\d+$/) ? [{ _id: req.params.id }] : []),
        { orderId: req.params.id }
      ],
      user: req.user._id
    }, { populate: 'items.product' });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PATCH /api/orders/:id/cancel
// @desc  Cancel order (user)
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const cancellableStatuses = ['placed', 'confirmed'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    order.orderStatus = 'cancelled';
    order.cancellationReason = req.body.reason || 'Cancelled by customer';
    order.trackingHistory.push({
      status: 'cancelled',
      message: `Order cancelled: ${order.cancellationReason}`,
      timestamp: new Date()
    });

    // Restore stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'sizes.size': item.size },
        { $inc: { 'sizes.$.stock': item.quantity } }
      );
    }

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
