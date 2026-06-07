const toBool = (v) => Boolean(v);

const formatAddress = (row) => ({
  _id: String(row.id),
  name: row.name,
  phone: row.phone,
  line1: row.line1,
  line2: row.line2 || undefined,
  city: row.city,
  state: row.state,
  pincode: row.pincode,
  isDefault: toBool(row.is_default)
});

const formatUser = (row, addresses = []) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    password: row.password,
    role: row.role,
    isPhoneVerified: toBool(row.is_phone_verified),
    isEmailVerified: toBool(row.is_email_verified),
    isActive: toBool(row.is_active),
    otp: row.otp,
    otpExpire: row.otp_expire ? new Date(row.otp_expire) : undefined,
    profilePicture: row.profile_picture || undefined,
    addresses: addresses.map(formatAddress),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const formatProduct = (row, images = [], sizes = []) => {
  if (!row) return null;
  const care = row.care ? (typeof row.care === 'string' ? JSON.parse(row.care) : row.care) : [];
  const tags = row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [];
  const sizeList = sizes.map((s) => ({ size: s.size, stock: s.stock }));
  return {
    _id: String(row.id),
    id: row.id,
    name: row.name,
    slug: row.slug,
    variety: row.variety,
    description: row.description,
    price: Number(row.price),
    discountedPrice: row.discounted_price != null ? Number(row.discounted_price) : null,
    images: images.map((img) => ({ url: img.url, publicId: img.public_id || undefined })),
    sizes: sizeList,
    fabric: row.fabric || undefined,
    fit: row.fit || undefined,
    color: row.color || undefined,
    care,
    isActive: toBool(row.is_active),
    isFeatured: toBool(row.is_featured),
    ratings: Number(row.ratings),
    numReviews: row.num_reviews,
    tags,
    totalStock: sizeList.reduce((sum, s) => sum + s.stock, 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    toObject() {
      return { ...this };
    }
  };
};

const formatOrderItem = (item, product = null) => ({
  _id: String(item.id),
  product: product
    ? {
        _id: String(product.id),
        name: product.name,
        variety: product.variety,
        slug: product.slug,
        images: product.images || []
      }
    : String(item.product_id),
  name: item.name,
  image: item.image || '',
  size: item.size,
  quantity: item.quantity,
  price: Number(item.price)
});

const formatOrder = (row, items = [], tracking = [], user = null) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: row.id,
    orderId: row.order_id,
    user: user
      ? { _id: String(user.id), name: user.name, email: user.email, phone: user.phone }
      : String(row.user_id),
    items: items.map((item) => formatOrderItem(item, item.product)),
    shippingAddress: {
      name: row.shipping_name,
      phone: row.shipping_phone,
      line1: row.shipping_line1,
      line2: row.shipping_line2 || undefined,
      city: row.shipping_city,
      state: row.shipping_state,
      pincode: row.shipping_pincode
    },
    itemsPrice: Number(row.items_price),
    shippingPrice: Number(row.shipping_price),
    taxPrice: Number(row.tax_price),
    totalAmount: Number(row.total_amount),
    paymentInfo: {
      method: row.payment_method,
      razorpayOrderId: row.razorpay_order_id || undefined,
      razorpayPaymentId: row.razorpay_payment_id || undefined,
      razorpaySignature: row.razorpay_signature || undefined,
      status: row.payment_status,
      paidAt: row.paid_at || undefined
    },
    orderStatus: row.order_status,
    trackingHistory: tracking.map((t) => ({
      _id: String(t.id),
      status: t.status,
      message: t.message,
      timestamp: t.tracked_at,
      location: t.location || undefined
    })),
    deliveredAt: row.delivered_at || undefined,
    estimatedDelivery: row.estimated_delivery || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

module.exports = { formatUser, formatProduct, formatOrder, formatAddress };
