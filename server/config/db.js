require('./env');

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { env, requireEnv } = require('./env');

let pool;

const DEFAULT_SOCKET = '/var/lib/mysql/mysql.sock';

function getDbConfig() {
  if (process.env.EMBEDDED_MYSQL === '1' && env('DATABASE_URL')) {
    return env('DATABASE_URL');
  }

  if (env('DATABASE_URL')) {
    return env('DATABASE_URL');
  }

  requireEnv(['DB_USER', 'DB_PASSWORD', 'DB_NAME']);

  const base = {
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    database: env('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
  };

  const host = env('DB_HOST') || 'localhost';
  const socketPath = env('DB_SOCKET');
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  // Explicit socket path (Hostinger app server). For remote MySQL from your PC,
  // live-start.js clears DB_SOCKET before loading index.js.
  if (socketPath) {
    return { ...base, socketPath };
  }

  // mysql2 uses a unix socket for host 'localhost' on Linux. Hostinger grants DB
  // users for 'localhost' only — connecting as 127.0.0.1 (TCP) causes access denied.
  if (isLocalHost) {
    if (process.platform !== 'win32' && fs.existsSync(DEFAULT_SOCKET)) {
      return { ...base, socketPath: DEFAULT_SOCKET };
    }
    return { ...base, host: 'localhost' };
  }

  return {
    ...base,
    host,
    port: Number(env('DB_PORT')) || 3306
  };
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }
  return pool;
}

async function ensureSchema() {
  const db = getPool();
  const [tables] = await db.query("SHOW TABLES LIKE 'users'");
  if (tables.length === 0) {
    const schemaPath = path.join(__dirname, '../migrations/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await db.query(statement);
    }
    console.log('Database schema created');
  }

  await applyMigrations();
}

async function applyMigrations() {
  const db = getPool();
  const [tables] = await db.query("SHOW TABLES LIKE 'orders'");
  if (!tables.length) return;

  const [columns] = await db.query(
    "SHOW COLUMNS FROM orders LIKE 'payment_method'"
  );
  const columnType = columns[0]?.Type || '';
  if (!columnType.includes("'RAZORPAY'")) {
    await db.query(`
      ALTER TABLE orders
      MODIFY COLUMN payment_method
      ENUM('UPI', 'Card', 'NetBanking', 'Wallet', 'COD', 'RAZORPAY')
      NOT NULL DEFAULT 'UPI'
    `);
    console.log('Migration applied: added RAZORPAY to orders.payment_method');
  }

  const [sizeCol] = await db.query("SHOW COLUMNS FROM product_sizes LIKE 'size'");
  const sizeType = sizeCol[0]?.Type || '';
  if (!sizeType.includes("'XS'") || !sizeType.includes("'S'")) {
    await db.query(`
      ALTER TABLE product_sizes
      MODIFY COLUMN size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL') NOT NULL
    `);
    console.log('Migration applied: added XS and S to product sizes');
  }

  const [varietyCol] = await db.query("SHOW COLUMNS FROM products LIKE 'variety'");
  const varietyType = varietyCol[0]?.Type || '';
  if (varietyType && !varietyType.includes("'Cotton Linen'")) {
    await db.query(`
      ALTER TABLE products
      MODIFY COLUMN variety ENUM(
        'Classic White Formal',
        'Oxford Button-Down',
        'Slim Fit Solid',
        'Casual Linen',
        'Cotton Linen',
        'Printed Heritage'
      ) NOT NULL
    `);
    console.log('Migration applied: added Cotton Linen product variety');
  }

  const [srCol] = await db.query("SHOW COLUMNS FROM orders LIKE 'shiprocket_order_id'");
  if (!srCol.length) {
    await db.query(`
      ALTER TABLE orders
      ADD COLUMN shiprocket_order_id BIGINT NULL AFTER notes,
      ADD COLUMN shiprocket_shipment_id BIGINT NULL AFTER shiprocket_order_id,
      ADD COLUMN shiprocket_awb VARCHAR(50) NULL AFTER shiprocket_shipment_id,
      ADD COLUMN shiprocket_courier VARCHAR(100) NULL AFTER shiprocket_awb,
      ADD COLUMN shiprocket_status VARCHAR(50) NULL AFTER shiprocket_courier,
      ADD COLUMN shiprocket_label_url VARCHAR(500) NULL AFTER shiprocket_status,
      ADD COLUMN shiprocket_synced_at DATETIME NULL AFTER shiprocket_label_url
    `);
    console.log('Migration applied: added Shiprocket columns to orders');
  }

  const [sizeChartCol] = await db.query("SHOW COLUMNS FROM products LIKE 'size_chart'");
  if (!sizeChartCol.length) {
    await db.query(`
      ALTER TABLE products
      ADD COLUMN size_chart JSON NULL AFTER care
    `);
    console.log('Migration applied: added size_chart to products');
  }

  const [discountCol] = await db.query("SHOW COLUMNS FROM orders LIKE 'discount_amount'");
  if (!discountCol.length) {
    await db.query(`
      ALTER TABLE orders
      ADD COLUMN discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER items_price,
      ADD COLUMN discount_code VARCHAR(50) NULL AFTER discount_amount
    `);
    console.log('Migration applied: added discount columns to orders');
  }
}

module.exports = {
  getPool,
  ensureSchema,
  applyMigrations,
  get pool() {
    return getPool();
  }
};
