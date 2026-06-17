/**
 * Pull products from live site API (no remote MySQL needed).
 *
 * Uses admin login if PROD_ADMIN_PASSWORD is set in server/.env.production,
 * otherwise falls back to the public product list (active products only).
 *
 * Then: npm run db:pull && restart npm run dev
 */
require('../config/env');
const path = require('path');
const dotenv = require('dotenv');
const { pullFromApi } = require('../utils/pullProdApi');
const { saveSnapshot, countSnapshotRows } = require('../utils/dbSnapshot');

dotenv.config({ path: path.join(__dirname, '../.env.production') });

async function main() {
  const apiUrl = process.env.PROD_API_URL || 'https://labelnine.in';
  const email = process.env.PROD_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@labelnine.in';
  const password = process.env.PROD_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  console.log(`Pulling products from ${apiUrl} ...`);
  const snapshot = await pullFromApi({ apiUrl, email, password });
  const filePath = saveSnapshot(snapshot);

  const products = snapshot.tables.products?.length || 0;
  const via = snapshot.source === 'api-public' ? 'public API (active products)' : 'admin API (all products)';
  console.log(`Saved ${countSnapshotRows(snapshot)} rows (${products} products via ${via})`);
  console.log(`→ ${filePath}`);
  console.log('\nRestart local dev (npm run dev) to load production products locally.');
}

main().catch((err) => {
  console.error('API pull failed:', err.message);
  process.exit(1);
});
