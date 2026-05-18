const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  image: { type: String },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }
});

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true }
});

const trackingEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  location: { type: String }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: { type: addressSchema, required: true },
  itemsPrice: { type: Number, required: true },
  shippingPrice: { type: Number, required: true, default: 0 },
  taxPrice: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true },

  paymentInfo: {
    method: { type: String, enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'COD'], default: 'UPI' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    paidAt: { type: Date }
  },

  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'returned'],
    default: 'placed'
  },

  trackingHistory: [trackingEventSchema],

  deliveredAt: { type: Date },
  estimatedDelivery: { type: Date },

  cancellationReason: { type: String },
  notes: { type: String }
}, { timestamps: true });

// Pre-save: add initial tracking event
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.trackingHistory.push({
      status: 'placed',
      message: 'Your order has been placed successfully',
      timestamp: new Date()
    });
    // Estimated delivery: 5-7 business days
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + 6);
    this.estimatedDelivery = delivery;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
