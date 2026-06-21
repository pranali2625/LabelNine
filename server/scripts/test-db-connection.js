/**
 * Test MySQL connection using server/.env.production (PROD_DB_*).
 * Usage: npm run db:test
 */
require('../config/env');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const dns = require('dns').promises;

const prodEnvPath = path.join(__dirname, '../.env.production');
if (!fs.existsSync(prodEnvPath)) {
  console.error('Create server/.env.production from .env.production.example first.');
  process.exit(1);
}

dotenv.config({ path: prodEnvPath, override: true });

const config = {
  host: process.env.PROD_DB_HOST,
  port: Number(process.env.PROD_DB_PORT) || 3306,
  user: process.env.PROD_DB_USER,
  password: process.env.PROD_DB_PASSWORD,
  database: process.env.PROD_DB_NAME,
  connectTimeout: 30000
};

const missing = ['PROD_DB_HOST', 'PROD_DB_USER', 'PROD_DB_PASSWORD', 'PROD_DB_NAME']
  .filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing: ${missing.join(', ')}`);
  process.exit(1);
}

async function resolveIpv4(host) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  const { address } = await dns.lookup(host, { family: 4 });
  return address;
}

async function main() {
  const host = await resolveIpv4(config.host);
  console.log(`Connecting to ${config.host} (${host}):${config.port}/${config.database} ...`);
  const conn = await mysql.createConnection({ ...config, host });
  try {
    const [users] = await conn.query('SELECT COUNT(*) AS count FROM users');
    const [products] = await conn.query('SELECT COUNT(*) AS count FROM products');
    const [orders] = await conn.query('SELECT COUNT(*) AS count FROM orders');
    console.log('Connected successfully.');
    console.log(`  Users: ${users[0].count}  Products: ${products[0].count}  Orders: ${orders[0].count}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Connection failed:', err.message);
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    console.error('\nEnable Remote MySQL in Hostinger hPanel and whitelist your IP.');
  }
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('\nCheck PROD_DB_USER / PROD_DB_PASSWORD in server/.env.production');
  }
  process.exit(1);
});
