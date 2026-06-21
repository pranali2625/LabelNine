/**
 * Local dev against production/live MySQL (skips embedded database).
 *
 * Setup:
 *   1. Copy server/.env.production.example → server/.env.production
 *   2. Fill PROD_DB_* from Hostinger hPanel → Databases → Remote MySQL
 *      (enable remote access and whitelist your IP)
 *   3. From project root: npm run dev:live
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

require('./config/env');

const prodEnvPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(prodEnvPath)) {
  console.error(
    'Missing server/.env.production\n' +
    'Copy server/.env.production.example → server/.env.production and set PROD_DB_* credentials.'
  );
  process.exit(1);
}

dotenv.config({ path: prodEnvPath, override: true });

const map = {
  DB_HOST: process.env.PROD_DB_HOST,
  DB_PORT: process.env.PROD_DB_PORT || '3306',
  DB_USER: process.env.PROD_DB_USER,
  DB_PASSWORD: process.env.PROD_DB_PASSWORD,
  DB_NAME: process.env.PROD_DB_NAME
};

const missing = Object.entries(map)
  .filter(([, value]) => !value)
  .map(([key]) => key.replace('DB_', 'PROD_DB_'));

if (missing.length) {
  console.error(`Missing in server/.env.production: ${missing.join(', ')}`);
  process.exit(1);
}

Object.assign(process.env, map);
process.env.DB_SOCKET = '';
delete process.env.DATABASE_URL;
delete process.env.EMBEDDED_MYSQL;

if (map.DB_HOST === 'localhost' || map.DB_HOST === '127.0.0.1') {
  console.warn(
    'Warning: PROD_DB_HOST is localhost — that only works on the Hostinger server.\n' +
    'From your PC use the remote hostname from hPanel (e.g. srv123.hstgr.io).'
  );
}

console.log(`Live DB mode → ${map.DB_HOST}/${map.DB_NAME} (user ${map.DB_USER})`);

require('./index.js');
