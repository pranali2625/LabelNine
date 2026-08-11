// Razorpay Magic Checkout — create order, shipping/promotions callbacks, verify, webhook
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { pool } = require('../config/db');
const { protect } = require('../middleware/auth');
const { generateOrderId } = require('../utils/helpers');
const { deductOrderStock } = require('../utils/orderStock');
const {
  buildLineItems,
  lineItemsTotalPaise,
  fromPaise,
  mapRazorpayAddress,
  shippingMethodsForOrder,
  normalizePhone
} = require('../utils/magicCheckout');
const {
  isEligibleForNewCustomerDiscount,
  calculateNewCustomerDiscount
} = require('../utils/newCustomerDiscount');
const {
  resolveInviteCoupon,
  calculateInviteCouponDiscount,
  resolveOrderDiscount,
  markInviteCouponUsedForUser
} = require('../utils/inviteCoupon');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

function razorpayConfigError() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return 'Razorpay API keys are not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env)';
  }
  if (keyId.includes('xxxx') || keySecret === 'your_razorpay_secret') {
    return 'Razorpay API keys are still placeholders — add your test keys from https://dashboard.razorpay.com/app/keys to server/.env';
  }
  return null;
}

function verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === razorpay_signature;
}

async function fetchRazorpayOrder(razorpayOrderId) {
  return razorpay.orders.fetch(razorpayOrderId);
}

function applyRazorpayCustomerDetails(order, rzpOrder) {
  const details = rzpOrder.customer_details || {};
  const shipping = mapRazorpayAddress(
    details.shipping_address || {},
    details.contact || order.shippingAddress?.phone
  );
  order.shippingAddress = shipping;

  // Shipping fee disabled for now — always FREE (ignore Razorpay shipping_fee)
  // const shippingFee = fromPaise(rzpOrder.shipping_fee);
  const shippingFee = 0;
  const codFee = fromPaise(rzpOrder.cod_fee);
  order.shippingPrice = shippingFee + codFee;
  order.taxPrice = fromPaise(rzpOrder.tax_details?.total_tax) || 0;
  // Prefer Razorpay final amount (includes shipping / COD fee / promotions)
  if (rzpOrder.amount != null) {
    order.totalAmount = fromPaise(rzpOrder.amount);
  } else {
    order.totalAmount = Number(order.itemsPrice) + Number(order.shippingPrice) + Number(order.taxPrice);
  }
}

async function finalizeMagicOrder(order, { rzpOrder, razorpay_payment_id, razorpay_signature, isCod }) {
  applyRazorpayCustomerDetails(order, rzpOrder);
  order.paymentInfo = order.paymentInfo || {};
  order.paymentInfo.razorpayOrderId = rzpOrder.id;

  if (isCod) {
    order.paymentInfo.method = 'COD';
    order.paymentInfo.status = 'pending';
    order.orderStatus = 'confirmed';
    order.trackingHistory = order.trackingHistory || [];
    if (!order.trackingHistory.some((t) => t.status === 'confirmed')) {
      order.trackingHistory.push({
        status: 'confirmed',
        message: 'Order confirmed via Magic Checkout (Cash on Delivery).',
        timestamp: new Date()
      });
    }
  } else {
    order.paymentInfo.method = 'RAZORPAY';
    order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
    order.paymentInfo.razorpaySignature = razorpay_signature;
    order.paymentInfo.status = 'paid';
    order.paymentInfo.paidAt = new Date();
    order.orderStatus = 'confirmed';
    order.trackingHistory = order.trackingHistory || [];
    if (!order.trackingHistory.some((t) => t.status === 'confirmed')) {
      order.trackingHistory.push({
        status: 'confirmed',
        message: 'Payment received via Magic Checkout. Order confirmed.',
        timestamp: new Date()
      });
    }
  }

  await order.save();

  if (order.discountCode && order.discountCode !== 'WELCOME10') {
    try {
      const User = require('../models/User');
      const buyerId = order.user?._id || order.user;
      const user = await User.findById(buyerId);
      if (user) {
        await markInviteCouponUsedForUser(user, order.discountCode, order.orderId);
      }
    } catch (err) {
      console.warn('Invite coupon mark-used failed:', err.message);
    }
  }

  const { notifyOrderConfirmed } = require('../utils/orderNotifications');
  const { maybeCreateShiprocketOrder } = require('../utils/shiprocketOrders');
  const userId = order.user?._id || order.user;
  notifyOrderConfirmed(order, userId);
  if (!isCod) {
    maybeCreateShiprocketOrder(order).catch((err) => {
      console.error('Shiprocket auto-create:', err.message);
    });
  }

  return Order.findOne({ orderId: order.orderId });
}

function readMagicBody(req) {
  // Razorpay may GET or POST; accept JSON body or query
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body);
    } catch {
      /* ignore */
    }
  }
  if (req.query?.payload) {
    try {
      return JSON.parse(req.query.payload);
    } catch {
      /* ignore */
    }
  }
  return { ...req.query };
}

// ─── Public Magic Checkout callbacks (configure these URLs in Razorpay Dashboard) ───

// @route POST|GET /api/payments/magic/shipping-info
router.all('/magic/shipping-info', async (req, res) => {
  try {
    const payload = readMagicBody(req);
    const receiptId = payload.order_id;
    const addresses = payload.addresses || [];
    const rzpOrderKey = payload.razorpay_order_id
      ? (String(payload.razorpay_order_id).startsWith('order_')
          ? String(payload.razorpay_order_id)
          : `order_${payload.razorpay_order_id}`)
      : null;

    if (!receiptId && !rzpOrderKey) {
      return res.status(400).json({ error: 'order_id (receipt) is required' });
    }

    let order = receiptId ? await Order.findOne({ orderId: receiptId }) : null;
    if (!order && rzpOrderKey) {
      order = await Order.findOne({ 'paymentInfo.razorpayOrderId': rzpOrderKey });
    }

    // Fallback: read preferredMethod from Razorpay order notes (same Hostinger DB / live keys)
    if (!order && rzpOrderKey) {
      try {
        const rzpOrder = await razorpay.orders.fetch(rzpOrderKey);
        if (rzpOrder?.receipt) {
          order = await Order.findOne({ orderId: rzpOrder.receipt });
        }
        if (order && rzpOrder?.notes?.preferredMethod === 'COD') {
          order.paymentInfo = { ...(order.paymentInfo || {}), method: 'COD' };
        }
      } catch (fetchErr) {
        console.warn('Magic shipping-info: razorpay fetch failed', fetchErr.message);
      }
    }

    if (!order) {
      console.warn('Magic shipping-info: order not found', { receiptId, rzpOrderKey });
      return res.json({
        addresses: shippingMethodsForOrder({ itemsPrice: 0 }, addresses)
      });
    }

    const addressesOut = shippingMethodsForOrder(order, addresses);
    console.log(
      'Magic shipping-info',
      order.orderId,
      'method=',
      order.paymentInfo?.method,
      'cod=',
      addressesOut.map((a) => a.shipping_methods?.[0]?.cod)
    );
    res.json({ addresses: addressesOut });
  } catch (err) {
    console.error('Magic shipping-info error:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route POST|GET /api/payments/magic/promotions
router.all('/magic/promotions', async (req, res) => {
  try {
    // Coupons are auto-applied for eligible first orders — no manual list needed
    res.json({ promotions: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route GET /api/payments/new-customer-discount
// @desc  Check if logged-in user gets 10% off their first order
router.get('/new-customer-discount', protect, async (req, res) => {
  try {
    const eligible = await isEligibleForNewCustomerDiscount(req.user);
    const preview = calculateNewCustomerDiscount(0, eligible);
    res.json({
      success: true,
      eligible,
      discountPercent: preview.discountPercent,
      discountCode: preview.discountCode,
      requiresUniqueEmailAndPhone: true,
      hasContact: Boolean(req.user?.email && req.user?.phone)
    });
  } catch (err) {
    console.error('New customer discount check error:', err);
    res.status(500).json({ success: false, message: 'Failed to check discount eligibility' });
  }
});

// @route POST /api/payments/validate-coupon
// @desc  Validate an invite coupon for the logged-in user
router.post('/validate-coupon', protect, async (req, res) => {
  try {
    const { code, itemsPrice = 0, items = [] } = req.body || {};
    const resolved = await resolveInviteCoupon(req.user, code);
    if (!resolved.ok) {
      return res.status(400).json({ success: false, message: resolved.message });
    }

    let pricedItems = Array.isArray(items) ? items : [];
    if (pricedItems.length) {
      const lookedUp = [];
      for (const item of pricedItems) {
        if (!item?.productId) continue;
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) continue;
        lookedUp.push({
          productId: product._id,
          quantity: Number(item.quantity) || 1,
          price: product.discountedPrice || product.price
        });
      }
      pricedItems = lookedUp;
    }

    const subtotal =
      pricedItems.length > 0
        ? pricedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        : Number(itemsPrice) || 0;

    const discount = calculateInviteCouponDiscount(subtotal, resolved.coupon, pricedItems);
    const productScoped =
      Array.isArray(resolved.coupon.productIds) && resolved.coupon.productIds.length > 0;
    const publicNeedsProducts = resolved.coupon.isPublic && !productScoped;

    if ((productScoped || publicNeedsProducts) && discount.eligibleSubtotal <= 0 && subtotal > 0) {
      return res.status(400).json({
        success: false,
        message: publicNeedsProducts
          ? 'This coupon is not set up for any products yet'
          : 'This coupon does not apply to items in your cart'
      });
    }

    res.json({
      success: true,
      code: discount.discountCode,
      discountPercent: discount.discountPercent,
      discountAmount: discount.discountAmount,
      eligibleSubtotal: discount.eligibleSubtotal,
      productScoped,
      isPublic: Boolean(resolved.coupon.isPublic),
      firstOrderOnly: Boolean(resolved.coupon.firstOrderOnly)
    });
  } catch (err) {
    console.error('Validate coupon error:', err);
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
});

// @route POST|GET /api/payments/magic/apply-promotion
router.all('/magic/apply-promotion', async (req, res) => {
  try {
    const payload = readMagicBody(req);
    const code = payload.code;
    return res.status(400).json({
      error: {
        code: 'INVALID_COUPON',
        description: code
          ? `Promotion code "${code}" is not valid. Apply your invite code on the cart before checkout.`
          : 'No promotion code provided',
        source: 'business'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Authenticated Magic Checkout ───

// @route POST /api/payments/magic/create
// @desc  Create local order + Razorpay Magic Checkout order from cart items
router.post('/magic/create', protect, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const configError = razorpayConfigError();
    if (configError) {
      return res.status(503).json({ success: false, message: configError });
    }

    const { items, contact, paymentMethod = 'RAZORPAY', couponCode } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in cart' });
    }

    const preferredMethod = paymentMethod === 'COD' ? 'COD' : 'RAZORPAY';

    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      }
      const sizeEntry = product.sizes.find((s) => s.size === item.size);
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
    const discount = resolved.discount;
    // Shipping is applied inside Magic Checkout via shipping-info callback
    const shippingPrice = 0;
    const taxPrice = 0;
    const totalAmount = discount.discountedItemsPrice;
    const orderId = generateOrderId();
    const phone = normalizePhone(contact?.phone || req.user.phone) || '0000000000';

    await conn.beginTransaction();

    const order = await Order.create(
      {
        orderId,
        user: req.user._id,
        items: orderItems,
        shippingAddress: {
          name: (contact?.name || req.user.name || 'Customer').trim(),
          phone,
          line1: 'Address will be collected at checkout',
          line2: '',
          city: 'Pending',
          state: 'Maharashtra',
          pincode: '400001'
        },
        itemsPrice,
        discountAmount: discount.discountAmount,
        discountCode: discount.discountAmount > 0 ? discount.discountCode : null,
        shippingPrice,
        taxPrice,
        totalAmount,
        paymentInfo: { method: preferredMethod, status: 'pending' },
        orderStatus: 'placed'
      },
      conn
    );

    await deductOrderStock(orderItems, conn);

    const lineItems = buildLineItems(orderItems, discount.discountAmount);
    const lineTotal = lineItemsTotalPaise(orderItems, discount.discountAmount);

    const razorpayOrder = await razorpay.orders.create({
      amount: lineTotal,
      currency: 'INR',
      receipt: orderId,
      line_items_total: lineTotal,
      line_items: lineItems,
      notes: {
        orderId,
        userId: req.user._id.toString(),
        preferredMethod,
        ...(discount.discountAmount > 0
          ? {
              discountCode: discount.discountCode,
              discountAmount: String(discount.discountAmount)
            }
          : {})
      }
    });

    order.paymentInfo.razorpayOrderId = razorpayOrder.id;
    await order.save(conn);
    await conn.commit();

    const savedOrder = await Order.findOne({ orderId });

    res.status(201).json({
      success: true,
      order: savedOrder,
      discount: {
        eligible: discount.eligible,
        percent: discount.discountPercent,
        amount: discount.discountAmount,
        code: discount.discountAmount > 0 ? discount.discountCode : null,
        source: resolved.source
      },
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || 'INR',
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    await conn.rollback();
    console.error('Magic create error:', err);
    const razorpayMsg = err?.error?.description || err?.error?.reason;
    const message =
      razorpayMsg === 'Authentication failed'
        ? 'Razorpay authentication failed — check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env'
        : process.env.NODE_ENV === 'development' && razorpayMsg
          ? `Payment initiation failed: ${razorpayMsg}`
          : err.message?.includes('Insufficient stock')
            ? err.message
            : 'Failed to start Magic Checkout';
    const status = err.message?.includes('Insufficient stock') ? 400 : 500;
    res.status(status).json({ success: false, message });
  } finally {
    conn.release();
  }
});

// @route POST /api/payments/magic/complete
// @desc  Finalize Magic Checkout (prepaid signature verify or COD placed order)
router.post('/magic/complete', protect, async (req, res) => {
  try {
    const configError = razorpayConfigError();
    if (configError) {
      return res.status(503).json({ success: false, message: configError });
    }

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!orderId || !razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'orderId and razorpay_order_id are required' });
    }

    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order was cancelled' });
    }

    // Already finalized
    if (
      order.orderStatus === 'confirmed' &&
      (order.paymentInfo?.status === 'paid' || order.paymentInfo?.method === 'COD')
    ) {
      const shippingPending = order.shippingAddress?.city === 'Pending';
      if (!shippingPending) {
        return res.json({ success: true, message: 'Order already confirmed', order });
      }
    }

    const rzpOrder = await fetchRazorpayOrder(razorpay_order_id);
    if (rzpOrder.receipt && rzpOrder.receipt !== orderId) {
      return res.status(400).json({ success: false, message: 'Order mismatch' });
    }

    const rzpStatus = String(rzpOrder.status || '').toLowerCase();
    const isCod = rzpStatus === 'placed' || (!razorpay_payment_id && rzpStatus !== 'paid');
    const isPaid = rzpStatus === 'paid' || Boolean(razorpay_payment_id && razorpay_signature);

    if (!isCod && !isPaid) {
      return res.status(400).json({
        success: false,
        message: `Unexpected Razorpay order status: ${rzpOrder.status}`
      });
    }

    if (!isCod) {
      if (!razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment signature' });
      }
      if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
      }
    }

    if (order.paymentInfo?.status === 'paid' && !isCod) {
      return res.json({ success: true, message: 'Payment already verified', order });
    }

    const saved = await finalizeMagicOrder(order, {
      rzpOrder,
      razorpay_payment_id,
      razorpay_signature,
      isCod
    });

    res.json({
      success: true,
      message: isCod ? 'COD order confirmed' : 'Payment verified',
      order: saved
    });
  } catch (err) {
    console.error('Magic complete error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to complete checkout' });
  }
});

// @route POST /api/payments/create-order
// @desc  Create Razorpay order for prepaid payment (checkout or retry pay)
router.post('/create-order', protect, async (req, res) => {
  try {
    const configError = razorpayConfigError();
    if (configError) {
      return res.status(503).json({ success: false, message: configError });
    }

    const { orderId } = req.body;

    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentInfo.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order was cancelled' });
    }

    // Standard Checkout (address + COD/prepaid already chosen on our site)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(Number(order.totalAmount) * 100),
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
      keyId: process.env.RAZORPAY_KEY_ID,
      order
    });
  } catch (err) {
    console.error('Razorpay order create error:', err);
    const razorpayMsg = err?.error?.description || err?.error?.reason;
    const message =
      razorpayMsg === 'Authentication failed'
        ? 'Razorpay authentication failed — check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env'
        : process.env.NODE_ENV === 'development' && razorpayMsg
          ? `Payment initiation failed: ${razorpayMsg}`
          : 'Payment initiation failed';
    res.status(500).json({ success: false, message });
  }
});

// @route POST /api/payments/verify
// @desc  Verify prepaid Razorpay payment (legacy + Magic prepaid)
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
    }

    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentInfo.status === 'paid') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        order
      });
    }

    let rzpOrder = null;
    try {
      rzpOrder = await fetchRazorpayOrder(razorpay_order_id);
      applyRazorpayCustomerDetails(order, rzpOrder);
    } catch (fetchErr) {
      console.warn('Could not fetch Razorpay order for address sync:', fetchErr.message);
    }

    order.paymentInfo.razorpayOrderId = razorpay_order_id;
    order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
    order.paymentInfo.razorpaySignature = razorpay_signature;
    order.paymentInfo.method = 'RAZORPAY';
    order.paymentInfo.status = 'paid';
    order.paymentInfo.paidAt = new Date();
    order.orderStatus = 'confirmed';

    order.trackingHistory.push({
      status: 'confirmed',
      message: 'Payment received. Order confirmed.',
      timestamp: new Date()
    });

    await order.save();

    if (order.discountCode && order.discountCode !== 'WELCOME10') {
      try {
        await markInviteCouponUsedForUser(req.user, order.discountCode, order.orderId);
      } catch (err) {
        console.warn('Invite coupon mark-used failed:', err.message);
      }
    }

    const { notifyOrderConfirmed } = require('../utils/orderNotifications');
    const { maybeCreateShiprocketOrder } = require('../utils/shiprocketOrders');
    notifyOrderConfirmed(order, req.user._id);
    maybeCreateShiprocketOrder(order).catch((err) => {
      console.error('Shiprocket auto-create:', err.message);
    });

    const saved = await Order.findOne({ orderId });
    res.json({ success: true, message: 'Payment verified', order: saved });
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/payments/webhook
// @desc  Razorpay webhook (payment.captured + payment.pending for COD)
async function webhookHandler(req, res) {
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
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const event = JSON.parse(req.body);
    const payment = event.payload?.payment?.entity;
    const orderIdFromNotes = payment?.notes?.orderId;

    let orderId = orderIdFromNotes;
    let rzpOrderId = payment?.order_id;

    // Resolve local order via Razorpay order receipt when notes missing
    if (!orderId && rzpOrderId) {
      try {
        const rzpOrder = await fetchRazorpayOrder(rzpOrderId);
        orderId = rzpOrder.receipt;
      } catch (err) {
        console.warn('Webhook: could not fetch Razorpay order', err.message);
      }
    }

    if (event.event === 'payment.captured' && orderId) {
      const existing = await Order.findOne({ orderId });
      if (existing?.paymentInfo?.status === 'paid') {
        return res.json({ received: true });
      }

      let rzpOrder = null;
      try {
        rzpOrder = await fetchRazorpayOrder(rzpOrderId || existing?.paymentInfo?.razorpayOrderId);
      } catch {
        /* optional */
      }

      if (existing && rzpOrder) {
        await finalizeMagicOrder(existing, {
          rzpOrder,
          razorpay_payment_id: payment.id,
          razorpay_signature: null,
          isCod: false
        });
      } else if (existing) {
        await Order.findOneAndUpdate(
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
        const order = await Order.findOne({ orderId });
        if (order) {
          const { notifyOrderConfirmed } = require('../utils/orderNotifications');
          const { maybeCreateShiprocketOrder } = require('../utils/shiprocketOrders');
          notifyOrderConfirmed(order, order.user?._id || order.user);
          maybeCreateShiprocketOrder(order).catch((err) => {
            console.error('Shiprocket auto-create:', err.message);
          });
        }
      }
    }

    // COD Magic Checkout — payment.pending
    if (event.event === 'payment.pending' && orderId) {
      const existing = await Order.findOne({ orderId });
      if (existing && existing.orderStatus !== 'confirmed' && existing.orderStatus !== 'cancelled') {
        let rzpOrder = null;
        try {
          rzpOrder = await fetchRazorpayOrder(rzpOrderId || existing.paymentInfo?.razorpayOrderId);
        } catch (err) {
          console.warn('Webhook COD: fetch order failed', err.message);
        }
        if (rzpOrder) {
          await finalizeMagicOrder(existing, { rzpOrder, isCod: true });
        } else {
          existing.paymentInfo.method = 'COD';
          existing.orderStatus = 'confirmed';
          existing.trackingHistory.push({
            status: 'confirmed',
            message: 'COD order confirmed via webhook',
            timestamp: new Date()
          });
          await existing.save();
          const { notifyOrderConfirmed } = require('../utils/orderNotifications');
          notifyOrderConfirmed(existing, existing.user?._id || existing.user);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = router;
module.exports.webhookHandler = webhookHandler;
