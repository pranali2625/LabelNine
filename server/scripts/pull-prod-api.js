/**
 * Pull products + customers from live site.
 *
 * Products: admin API (or public fallback).
 * Users: production MySQL when PROD_DB_* is set, else admin API with local dev password
 *       (DEV_SYNC_USER_PASSWORD or ADMIN_PASSWORD from server/.env).
 *
 * Then: npm run db:pull && restart npm run dev
 */
require('../config/env');
const path = require('path');
const dotenv = require('dotenv');
const { pullFromApi } = require('../utils/pullProdApi');
const { mergeUsersFromProdDb, mergeUsersFromAdminApi, mergeOrdersFromProdDb } = require('../utils/pullProdUsers');
const { saveSnapshot, countSnapshotRows } = require('../utils/dbSnapshot');

dotenv.config({ path: path.join(__dirname, '../.env.production') });

async function main() {
  const apiUrl = process.env.PROD_API_URL || 'https://labelnine.in';
  const email = process.env.PROD_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@labelnine.in';
  const password = process.env.PROD_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  console.log(`Pulling products from ${apiUrl} ...`);
  let snapshot = await pullFromApi({ apiUrl, email, password });

  try {
    snapshot = await mergeUsersFromProdDb(snapshot);
    const users = snapshot.tables?.users?.length || 0;
    if (users) {
      console.log(`Synced ${users} users from production MySQL (real passwords preserved).`);
    }
  } catch (err) {
    console.warn('Production MySQL user sync skipped:', err.message);
  }

  try {
    snapshot = await mergeOrdersFromProdDb(snapshot);
    const orders = snapshot.tables?.orders?.length || 0;
    if (orders) {
      console.log(`Synced ${orders} orders from production MySQL.`);
    }
  } catch (err) {
    console.warn('Production MySQL order sync skipped:', err.message);
  }

  if (!snapshot.tables?.users?.length && snapshot.adminToken) {
    try {
      snapshot = await mergeUsersFromAdminApi(snapshot, { apiUrl, token: snapshot.adminToken });
      const users = snapshot.tables?.users?.length || 0;
      if (users) {
        console.log(
          `Synced ${users} users from admin API (local login uses DEV_SYNC_USER_PASSWORD or ADMIN_PASSWORD).`
        );
      }
    } catch (err) {
      console.warn('Admin API user sync skipped:', err.message);
    }
  }

  delete snapshot.adminToken;
  const filePath = saveSnapshot(snapshot);

  const products = snapshot.tables.products?.length || 0;
  const users = snapshot.tables.users?.length || 0;
  const orders = snapshot.tables.orders?.length || 0;
  const via = snapshot.source === 'api-public' ? 'public API (active products)' : 'admin API (all products)';
  console.log(`Saved ${countSnapshotRows(snapshot)} rows (${products} products via ${via}, ${users} users, ${orders} orders)`);
  console.log(`→ ${filePath}`);
  console.log('\nRestart local dev (npm run dev) to load this data locally.');
}

main().catch((err) => {
  console.error('API pull failed:', err.message);
  process.exit(1);
});
