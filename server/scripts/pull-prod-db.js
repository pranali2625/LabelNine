/**
 * Pull production MySQL data into server/data/prod-snapshot.json
 *
 * Setup:
 *   1. Copy server/.env.production.example → server/.env.production
 *   2. Fill PROD_DB_* from Hostinger hPanel → Databases → Remote MySQL
 *      (enable remote access + whitelist your IP)
 *   3. npm run db:pull
 *   4. Restart dev server — local will load the snapshot automatically
 */
require('../config/env');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const {
  exportDatabase,
  saveSnapshot,
  countSnapshotRows
} = require('../utils/dbSnapshot');

dotenv.config({ path: path.join(__dirname, '../.env.production') });

function getProdConfig() {
  const host = process.env.PROD_DB_HOST;
  const user = process.env.PROD_DB_USER;
  const password = process.env.PROD_DB_PASSWORD;
  const database = process.env.PROD_DB_NAME;

  const missing = ['PROD_DB_HOST', 'PROD_DB_USER', 'PROD_DB_PASSWORD', 'PROD_DB_NAME']
    .filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(', ')}.\n` +
      'Create server/.env.production from .env.production.example\n' +
      'Get values from Hostinger hPanel → Databases → MySQL (enable Remote MySQL for your IP).'
    );
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    console.warn(
      'Warning: PROD_DB_HOST is localhost — that only works on the Hostinger server itself.\n' +
      'From your PC, use the remote MySQL hostname from hPanel (e.g. srv123.hstgr.io).'
    );
  }

  return {
    host,
    port: Number(process.env.PROD_DB_PORT) || 3306,
    user,
    password,
    database,
    connectTimeout: 30000
  };
}

async function main() {
  console.log('Connecting to production database...');
  const config = getProdConfig();
  const connection = await mysql.createConnection(config);

  try {
    console.log(`Connected to ${config.host}/${config.database}`);
    const snapshot = await exportDatabase(connection);
    const filePath = saveSnapshot(snapshot);

    const products = snapshot.tables.products?.length || 0;
    const orders = snapshot.tables.orders?.length || 0;
    const users = snapshot.tables.users?.length || 0;
    const total = countSnapshotRows(snapshot);

    console.log(`Saved ${total} rows to ${filePath}`);
    console.log(`  Products: ${products}  Orders: ${orders}  Users: ${users}`);
    console.log('\nRestart local dev (npm run dev) to load this data locally.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Pull failed:', err.message);
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    console.error('\nTip: Enable Remote MySQL in Hostinger hPanel and whitelist your current IP.');
  }
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('\nTip: Check PROD_DB_USER / PROD_DB_PASSWORD in server/.env.production');
  }
  process.exit(1);
});
