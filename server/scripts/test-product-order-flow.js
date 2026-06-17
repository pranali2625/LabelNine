/**
 * Full product/order flow test via HTTP (dev server must be running).
 */
const BASE = process.env.API_URL || 'http://localhost:5000/api';

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const issues = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) issues.push({ name, detail });
};

async function main() {
  const login = await req('POST', '/auth/login', {
    identifier: 'admin@labelnine.in',
    password: process.env.ADMIN_PASSWORD || 'Admin@123'
  });
  check('Admin login', login.status === 200, JSON.stringify(login.data));
  const token = login.data.token;
  if (!token) process.exit(1);

  const list = await req('GET', '/products?limit=1');
  const product = list.data.products?.[0];
  check('List products', list.status === 200 && product);
  if (!product) process.exit(1);

  const sizeEntry = product.sizes.find((s) => s.stock > 0) || product.sizes[0];
  const size = sizeEntry.size;
  const stockBefore = sizeEntry.stock;

  const place = await req('POST', '/orders', {
    items: [{ productId: product._id, size, quantity: 1 }],
    shippingAddress: {
      name: 'Test Buyer', phone: '9876543210', line1: '123 Test St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001'
    },
    paymentMethod: 'COD'
  }, token);
  check('Place COD order', place.status === 201, place.data.message || JSON.stringify(place.data));
  const order = place.data.order;
  if (!order) process.exit(1);

  const afterPlace = await req('GET', `/products/${product._id}`);
  const stockAfterOrder = afterPlace.data.product?.sizes.find((s) => s.size === size)?.stock;
  check('Stock deducted after order', stockAfterOrder === stockBefore - 1, `before=${stockBefore} after=${stockAfterOrder}`);

  const myOrders = await req('GET', '/orders/my', null, token);
  check('My orders', myOrders.status === 200 && myOrders.data.orders?.some((o) => o.orderId === order.orderId));

  const detail = await req('GET', `/orders/${order.orderId}`, null, token);
  check('Order detail by orderId', detail.status === 200);
  check('Order has shipping address', !!detail.data.order?.shippingAddress?.line1);
  check('Order items populated', detail.data.order?.items?.length > 0);

  const track = await req('GET', `/orders/track/${order.orderId}`);
  check('Public track', track.status === 200 && track.data.order?.orderId === order.orderId);

  const cancel = await req('PATCH', `/orders/${order.orderId}/cancel`, { reason: 'test' }, token);
  check('Cancel order', cancel.status === 200, cancel.data.message || JSON.stringify(cancel.data));

  const afterCancel = await req('GET', `/products/${product._id}`);
  const stockAfterCancel = afterCancel.data.product?.sizes.find((s) => s.size === size)?.stock;
  check('Stock restored after cancel', stockAfterCancel === stockBefore, `expected=${stockBefore} got=${stockAfterCancel}`);

  // Admin flows
  const adminProducts = await req('GET', '/admin/products', null, token);
  check('Admin products', adminProducts.status === 200);

  const adminOrders = await req('GET', '/admin/orders', null, token);
  check('Admin orders', adminOrders.status === 200);

  const dashboard = await req('GET', '/admin/dashboard', null, token);
  check('Admin dashboard', dashboard.status === 200);

  // Place another order for admin status test
  const place2 = await req('POST', '/orders', {
    items: [{ productId: product._id, size, quantity: 1 }],
    shippingAddress: {
      name: 'Test Buyer', phone: '9876543210', line1: '123 Test St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001'
    },
    paymentMethod: 'COD'
  }, token);
  const order2 = place2.data.order;

  const statusUp = await req('PATCH', `/admin/orders/${order2.orderId}/status`, {
    status: 'processing', message: 'Packing your order'
  }, token);
  check('Admin update status', statusUp.status === 200);

  const adminCancel = await req('PATCH', `/admin/orders/${order2.orderId}/status`, {
    status: 'cancelled', message: 'Cancelled by admin'
  }, token);
  check('Admin cancel status', adminCancel.status === 200);

  const stockAfterAdminCancel = (await req('GET', `/products/${product._id}`)).data.product?.sizes.find((s) => s.size === size)?.stock;
  check('Stock restored on admin cancel', stockAfterAdminCancel === stockBefore, `expected=${stockBefore} got=${stockAfterAdminCancel}`);

  // Block cancel paid order test - simulate by checking logic via placed RAZORPAY order status
  const place3 = await req('POST', '/orders', {
    items: [{ productId: product._id, size, quantity: 1 }],
    shippingAddress: {
      name: 'Test Buyer', phone: '9876543210', line1: '123 Test St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001'
    },
    paymentMethod: 'RAZORPAY'
  }, token);
  const order3 = place3.data.order;
  check('Place RAZORPAY order (placed status)', place3.status === 201 && order3?.orderStatus === 'placed');

  const cancelUnpaid = await req('PATCH', `/orders/${order3.orderId}/cancel`, { reason: 'test' }, token);
  check('Cancel unpaid RAZORPAY order', cancelUnpaid.status === 200);

  // Product admin CRUD smoke
  const create = await req('POST', '/products', {
    name: 'Test Shirt', variety: 'Classic White Formal', description: 'Test', price: 999,
    images: [{ url: 'https://placehold.co/400x500' }],
    sizes: [{ size: 'M', stock: 5 }],
    isActive: true
  }, token);
  check('Create product', create.status === 201, create.data.message);
  const newId = create.data.product?._id;

  if (newId) {
    const upd = await req('PUT', `/products/${newId}`, {
      name: 'Test Shirt Updated', variety: 'Classic White Formal', description: 'Test', price: 1099,
      images: [{ url: 'https://placehold.co/400x500' }],
      sizes: [{ size: 'M', stock: 8 }],
      isActive: true
    }, token);
    check('Update product', upd.status === 200);

    const stockPatch = await req('PATCH', `/products/${newId}/stock`, { sizes: [{ size: 'M', stock: 10 }] }, token);
    check('Patch stock', stockPatch.status === 200);

    const del = await req('DELETE', `/products/${newId}`, null, token);
    check('Soft delete product', del.status === 200);
  }

  console.log('\n--- Summary ---');
  if (issues.length) {
    console.log(`${issues.length} failure(s):`);
    issues.forEach((i) => console.log(`  - ${i.name}: ${i.detail}`));
    process.exit(1);
  }
  console.log('All tests passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
