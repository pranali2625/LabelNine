// Online payments (Razorpay) — routes kept for when prepaid checkout is enabled
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @route POST /api/payments/create-order
// @desc  Create Razorpay order before payment
router.post('/create-order', protect, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentInfo.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // paise
      currency: 'INR',
      receipt: order.orderId,
      notes: {
        orderId: order.orderId,
        userId: req.user._id.toString()
      }
    });

    order.paymentInfo.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay order create error:', err);
    res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
});

// @route POST /api/payments/verify
// @desc  Verify Razorpay payment signature
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
    }

    // Update order
    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
    order.paymentInfo.razorpaySignature = razorpay_signature;
    order.paymentInfo.status = 'paid';
    order.paymentInfo.paidAt = new Date();
    order.orderStatus = 'confirmed';

    order.trackingHistory.push({
      status: 'confirmed',
      message: 'Payment received. Order confirmed.',
      timestamp: new Date()
    });

    await order.save();

    const { notifyOrderConfirmed } = require('../utils/orderNotifications');
    notifyOrderConfirmed(order, req.user._id);

    res.json({ success: true, message: 'Payment verified', order });
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/payments/webhook
// @desc  Razorpay webhook (for async payment events)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex');

      if (expectedSig !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.orderId;

      if (orderId) {
        const order = await Order.findOneAndUpdate(
          { orderId },
          {
            'paymentInfo.status': 'paid',
            'paymentInfo.razorpayPaymentId': payment.id,
            'paymentInfo.paidAt': new Date(),
            orderStatus: 'confirmed',
            $push: {
              trackingHistory: {
                status: 'confirmed',
                message: 'Payment captured via webhook',
                timestamp: new Date()
              }
            }
          }
        );

        if (order) {
          const { notifyOrderConfirmed } = require('../utils/orderNotifications');
          notifyOrderConfirmed(order, order.user?._id || order.user);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
