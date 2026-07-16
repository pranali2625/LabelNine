const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken = null;
let tokenExpiresAt = 0;

function isConfigured() {
  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD?.trim();
  return !!(email && password);
}

function configError() {
  if (!isConfigured()) {
    return 'Shiprocket API credentials are not configured (set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in server/.env)';
  }
  if (!process.env.SHIPROCKET_PICKUP_LOCATION?.trim()) {
    return 'Shiprocket pickup location is not configured (set SHIPROCKET_PICKUP_LOCATION in server/.env — must match a location in your Shiprocket panel)';
  }
  return null;
}

async function request(method, path, body) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || JSON.stringify(data) || res.statusText;
    throw new Error(`Shiprocket API error (${res.status}): ${msg}`);
  }
  return data;
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD?.trim();

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data?.message || 'Shiprocket authentication failed — check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD');
  }

  cachedToken = data.token;
  // Token valid ~10 days; refresh after 8 days
  tokenExpiresAt = Date.now() + 8 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

function splitName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: parts[0] || 'Customer', lastName: '.' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function formatOrderDate(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildAdhocPayload(order) {
  const addr = order.shippingAddress;
  const { firstName, lastName } = splitName(addr.name);
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const weightPerItem = Number(process.env.SHIPROCKET_WEIGHT_PER_ITEM_KG) || 0.25;
  const weight = Math.max(0.3, itemCount * weightPerItem);
  const isPrepaid = order.paymentInfo?.method !== 'COD' && order.paymentInfo?.status === 'paid';

  return {
    order_id: order.orderId,
    order_date: formatOrderDate(order.createdAt),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION.trim(),
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: addr.line1,
    billing_address_2: addr.line2 || '',
    billing_city: addr.city,
    billing_pincode: addr.pincode,
    billing_state: addr.state,
    billing_country: 'India',
    billing_email: process.env.FROM_EMAIL || process.env.ADMIN_EMAIL || 'orders@labelnine.in',
    billing_phone: addr.phone,
    shipping_is_billing: true,
    order_items: order.items.map((item, idx) => ({
      name: item.name,
      sku: `${order.orderId}-${idx + 1}-${item.size}`,
      units: item.quantity,
      selling_price: item.price,
      discount: 0,
      tax: 0,
      hsn: Number(process.env.SHIPROCKET_HSN_CODE) || 6205
    })),
    payment_method: isPrepaid ? 'Prepaid' : 'COD',
    shipping_charges: order.shippingPrice || 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: order.discountAmount || 0,
    sub_total: order.itemsPrice,
    length: Number(process.env.SHIPROCKET_PACKAGE_LENGTH_CM) || 30,
    breadth: Number(process.env.SHIPROCKET_PACKAGE_BREADTH_CM) || 25,
    height: Number(process.env.SHIPROCKET_PACKAGE_HEIGHT_CM) || 5,
    weight
  };
}

function formatCreateOrderError(data) {
  const locations = data?.data?.data;
  const hint = Array.isArray(locations) && locations.length
    ? ` Valid pickup locations: ${locations.map((l) => l.pickup_location).join(', ')}`
    : '';
  return `${data?.message || 'Shiprocket order creation failed'}${hint}`;
}

async function createAdhocOrder(order) {
  const err = configError();
  if (err) throw new Error(err);
  const data = await request('POST', '/orders/create/adhoc', buildAdhocPayload(order));
  if (!data.order_id || !data.shipment_id) {
    throw new Error(formatCreateOrderError(data));
  }
  return data;
}

async function assignAwb(shipmentId, courierId) {
  const err = configError();
  if (err) throw new Error(err);
  const body = { shipment_id: shipmentId };
  if (courierId) body.courier_id = courierId;
  return request('POST', '/courier/assign/awb', body);
}

async function generatePickup(shipmentId) {
  return request('POST', '/courier/generate/pickup', { shipment_id: [shipmentId] });
}

async function generateLabel(shipmentId) {
  return request('POST', '/courier/generate/label', { shipment_ids: [shipmentId] });
}

async function trackAwb(awb) {
  return request('GET', `/courier/track/awb/${encodeURIComponent(awb)}`);
}

async function cancelOrder(shiprocketOrderIds) {
  const ids = Array.isArray(shiprocketOrderIds) ? shiprocketOrderIds : [shiprocketOrderIds];
  return request('POST', '/orders/cancel', { ids });
}

module.exports = {
  isConfigured,
  configError,
  createAdhocOrder,
  assignAwb,
  generatePickup,
  generateLabel,
  trackAwb,
  cancelOrder
};
