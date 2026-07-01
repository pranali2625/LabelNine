const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

function getProdDbConfig() {
  const host = process.env.PROD_DB_HOST;
  const user = process.env.PROD_DB_USER;
  const password = process.env.PROD_DB_PASSWORD;
  const database = process.env.PROD_DB_NAME;

  if (!host || !user || !password || !database) return null;

  return {
    host,
    port: Number(process.env.PROD_DB_PORT) || 3306,
    user,
    password,
    database,
    connectTimeout: 30000
  };
}

function apiUserToRow(user, passwordHash, index) {
  return {
    id: Number(user._id || user.id || index + 1),
    name: user.name,
    email: user.email ? String(user.email).toLowerCase() : null,
    phone: user.phone || null,
    password: passwordHash,
    role: user.role || 'user',
    is_phone_verified: user.isPhoneVerified ? 1 : 0,
    is_email_verified: user.isEmailVerified ? 1 : 0,
    is_active: user.isActive !== false ? 1 : 0,
    otp: null,
    otp_expire: null,
    reset_password_token: null,
    reset_password_expire: null,
    profile_picture: user.profilePicture || null
  };
}

async function hashLocalDevPassword() {
  const plain = process.env.DEV_SYNC_USER_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!plain) {
    throw new Error(
      'Set DEV_SYNC_USER_PASSWORD or ADMIN_PASSWORD in server/.env for local customer login after API user sync'
    );
  }
  return bcrypt.hash(plain, 12);
}

async function mergeUsersFromProdDb(snapshot) {
  const config = getProdDbConfig();
  if (!config) return snapshot;

  const connection = await mysql.createConnection(config);
  try {
    const [users] = await connection.query('SELECT * FROM users');
    const [addresses] = await connection.query('SELECT * FROM user_addresses');

    snapshot.tables = snapshot.tables || {};
    snapshot.tables.users = users;
    snapshot.tables.user_addresses = addresses;
    snapshot.userSource = 'mysql';
    return snapshot;
  } finally {
    await connection.end();
  }
}

async function mergeOrdersFromProdDb(snapshot) {
  const config = getProdDbConfig();
  if (!config) return snapshot;

  const connection = await mysql.createConnection(config);
  try {
    const [orders] = await connection.query('SELECT * FROM orders ORDER BY id DESC LIMIT 100');
    if (!orders.length) return snapshot;

    const orderIds = orders.map((o) => o.id);
    const placeholders = orderIds.map(() => '?').join(', ');
    const [items] = await connection.query(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
      orderIds
    );
    const [tracking] = await connection.query(
      `SELECT * FROM order_tracking WHERE order_id IN (${placeholders})`,
      orderIds
    );

    snapshot.tables = snapshot.tables || {};
    snapshot.tables.orders = orders;
    snapshot.tables.order_items = items;
    snapshot.tables.order_tracking = tracking;
    snapshot.orderSource = 'mysql';
    return snapshot;
  } finally {
    await connection.end();
  }
}

async function mergeUsersFromAdminApi(snapshot, { apiUrl, token }) {
  if (!token) return snapshot;

  const base = apiUrl.replace(/\/$/, '');
  const passwordHash = await hashLocalDevPassword();
  const users = [];
  const limit = 100;
  let page = 1;
  let total = Infinity;

  while (users.length < total) {
    const res = await fetch(`${base}/api/admin/users?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Failed to fetch users (page ${page})`);
    }

    total = Number(data.total) || 0;
    const batch = data.users || [];
    if (!batch.length) break;

    users.push(...batch);
    page += 1;
    if (batch.length < limit) break;
  }

  if (!users.length) return snapshot;

  snapshot.tables = snapshot.tables || {};
  snapshot.tables.users = users.map((user, index) => apiUserToRow(user, passwordHash, index));
  snapshot.tables.user_addresses = snapshot.tables.user_addresses || [];
  snapshot.userSource = 'api';
  return snapshot;
}

module.exports = {
  getProdDbConfig,
  mergeUsersFromProdDb,
  mergeUsersFromAdminApi,
  mergeOrdersFromProdDb
};
