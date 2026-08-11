const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { pool } = require('../config/db');
const { protect } = require('../middleware/auth');
const { generateOrderId, calculatePrices } = require('../utils/helpers');
const { resolveOrderDiscount } = require('../utils/inviteCoupon');
const { restoreOrderStock, deductOrderStock } = require('../utils/orderStock');
const { notifyOrderConfirmed, notifyOrderCancelled } = require('../utils/orderNotifications');
const { validateShippingAddress } = require('../../shared/maharashtra');

const findUserOrder = (id, userId) =>
  Order.findOne({
    $or: [
      ...(id.match(/^\d+$/) ? [{ _id: id }] : []),
      { orderId: id }
    ],
    user: userId
  });

// @route POST /api/orders
// @desc  Place a new order
router.post('/', protect, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { items, shippingAddress, paymentMethod = 'RAZORPAY', couponCode } = req.body;

    if (paymentMethod === 'COD') {
      return res.status(400).json({
        success: false,
        message: 'Cash on Delivery is temporarily unavailable. Please pay online.'
      });
    }

    if (!['RAZORPAY'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' });
    }

    const addressCheck = validateShippingAddress(shippingAddress);
    if (!addressCheck.valid) {
      return res.status(400).json({ success: false, message: addressCheck.message });
    }

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
        price: product.discountedPrice || product.price,
        hasProductDiscount: product.discountedPrice != null && product.discountedPrice !== ''
      });
    }

    const itemsPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const resolved = await resolveOrderDiscount(req.user, itemsPrice, couponCode, orderItems);
    if (!resolved.ok) {
      return res.status(400).json({ success: false, message: resolved.message });
    }
    const { itemsPrice: _ip, discountAmount, discountCode, shippingPrice, taxPrice, totalAmount } =
      calculatePrices(orderItems, {
        discountAmount: resolved.discount.discountAmount,
        discountCode: resolved.discount.discountAmount > 0 ? resolved.discount.discountCode : null
      });
    const isCOD = paymentMethod === 'COD';

    await conn.beginTransaction();

    const order = await Order.create({
      orderId: generateOrderId(),
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      itemsPrice,
      discountAmount,
      discountCode,
      shippingPrice,
      taxPrice,
      totalAmount,
      paymentInfo: { method: paymentMethod, status: 'pending' },
      ...(isCOD && { orderStatus: 'confirmed' })
    }, conn);

    if (isCOD) {
      order.trackingHistory.push({
        status: 'confirmed',
        message: 'Order confirmed. Pay cash on delivery.',
        timestamp: new Date()
      });
      await order.save(conn);
    }

    await deductOrderStock(orderItems, conn);
    await conn.commit();

    const savedOrder = await Order.findOne({ orderId: order.orderId });

    if (isCOD) {
      notifyOrderConfirmed(savedOrder, req.user._id);
    }

    res.status(201).json({ success: true, order: savedOrder });
  } catch (err) {
    await conn.rollback();
    const status = err.message?.includes('Insufficient stock') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message || 'Failed to place order' });
  } finally {
    conn.release();
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
    const order = await findUserOrder(req.params.id, req.user._id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    if (order.paymentInfo?.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Paid orders cannot be cancelled online. Please contact support for a refund.'
      });
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

    await restoreOrderStock(order.items);
    await order.save();

    // Silent cancel when user closes Razorpay without paying (order was never completed)
    const abandonedPayment =
      req.body.abandonedPayment === true &&
      order.paymentInfo?.status !== 'paid' &&
      ['RAZORPAY', 'COD'].includes(order.paymentInfo?.method);
    if (!abandonedPayment) {
      notifyOrderCancelled(order, req.user._id);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
