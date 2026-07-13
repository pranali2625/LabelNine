const { env } = require('../config/env');
const { calculateShipping } = require('../../shared/pricing');
const { isMaharashtraPincode } = require('../../shared/maharashtra');

function publicBaseUrl() {
  return (env('CLIENT_URL') || 'https://labelnine.in').replace(/\/$/, '');
}

function absoluteImageUrl(url) {
  if (!url) return `${publicBaseUrl()}/images/how-to-measure.png`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${publicBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}

function toPaise(amount) {
  return Math.round(Number(amount) * 100);
}

function fromPaise(paise) {
  return Number(paise || 0) / 100;
}

/** Build Razorpay Magic Checkout line_items from local order items */
function buildLineItems(orderItems) {
  return orderItems.map((item) => {
    const unitPaise = toPaise(item.price);
    return {
      sku: String(item.product || item.productId || item._id),
      variant_id: `${item.product || item.productId}-${item.size}`,
      price: unitPaise,
      offer_price: unitPaise,
      quantity: item.quantity,
      name: item.name,
      description: `${item.name} — Size ${item.size}`,
      image_url: absoluteImageUrl(item.image)
    };
  });
}

function lineItemsTotalPaise(orderItems) {
  return orderItems.reduce((sum, item) => sum + toPaise(item.price) * item.quantity, 0);
}

function normalizePhone(contact) {
  if (!contact) return '';
  const digits = String(contact).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function mapRazorpayAddress(addr = {}, fallbackContact = '') {
  const phone = normalizePhone(addr.contact || fallbackContact);
  return {
    name: (addr.name || '').trim() || 'Customer',
    phone: phone || '0000000000',
    line1: (addr.line1 || '').trim() || 'Address not provided',
    line2: (addr.line2 || '').trim() || undefined,
    city: (addr.city || '').trim() || 'Pending',
    state: (addr.state || 'Maharashtra').trim(),
    pincode: String(addr.zipcode || addr.pincode || '').replace(/\D/g, '').slice(0, 6) || '000000'
  };
}

function shippingMethodsForOrder(order, addresses = []) {
  const itemsPrice = Number(order?.itemsPrice || 0);
  const shippingFeePaise = toPaise(calculateShipping(itemsPrice));

  return addresses.map((addr) => {
    const zip = String(addr.zipcode || '').trim();
    const serviceable = isMaharashtraPincode(zip);
    return {
      id: String(addr.id),
      zipcode: zip,
      state_code: addr.state_code || 'MH',
      country: addr.country || 'IN',
      shipping_methods: [
        {
          id: 'standard',
          name: shippingFeePaise === 0 ? 'Standard Delivery (Free)' : 'Standard Delivery',
          description: 'Delivered in 4–6 business days across Maharashtra',
          serviceable,
          shipping_fee: serviceable ? shippingFeePaise : 0,
          // COD disabled for now — prepaid only
          cod: false,
          cod_fee: 0
        }
      ]
    };
  });
}

module.exports = {
  absoluteImageUrl,
  toPaise,
  fromPaise,
  buildLineItems,
  lineItemsTotalPaise,
  normalizePhone,
  mapRazorpayAddress,
  shippingMethodsForOrder
};
